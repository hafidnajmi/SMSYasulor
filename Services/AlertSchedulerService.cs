using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    /// <summary>
    /// Background service that runs on a schedule to:
    ///   1. Send Low Stock AUTO-ALERT emails (all items below safety stock, grouped by frequency)
    ///   2. Send AUTO-RFQ draft emails (only AlertSelected=true items below safety stock, with supplier info)
    ///
    /// FAST frequency: every 14 days (2 weeks)
    /// SLOW frequency: every 30 days (1 month)
    /// Check interval: every 1 hour
    /// </summary>
    public class AlertSchedulerService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AlertSchedulerService> _logger;

        private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(1);
        private const int FastAlertDays = 14;
        private const int SlowAlertDays = 30;

        public AlertSchedulerService(IServiceScopeFactory scopeFactory, ILogger<AlertSchedulerService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[AlertScheduler] Started. FAST={F}d, SLOW={S}d, Check every {H}h.",
                FastAlertDays, SlowAlertDays, CheckInterval.TotalHours);

            await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndSendAlertsAsync();
                    await CheckAndSendRfqAsync();
                }
                catch (OperationCanceledException) { break; }
                catch (Exception ex) { _logger.LogError(ex, "[AlertScheduler] Error during scheduled check."); }

                try { await Task.Delay(CheckInterval, stoppingToken); }
                catch (OperationCanceledException) { break; }
            }

            _logger.LogInformation("[AlertScheduler] Stopped.");
        }

        // ─────────────────────────────────────────────────────────────────
        // 1. AUTO-ALERT: Low stock items (all items below safety stock)
        // ─────────────────────────────────────────────────────────────────
        private async Task CheckAndSendAlertsAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<UpmsDbContext>();

            if (await GetSettingAsync(db, "email_enabled", "0") != "1" ||
                await GetSettingAsync(db, "enable_low_stock_alert", "0") != "1")
            {
                _logger.LogDebug("[AlertScheduler] Alert: feature disabled. Skipping.");
                return;
            }

            string smtpServer  = await GetSettingAsync(db, "smtp_server", "");
            int    smtpPort    = int.TryParse(await GetSettingAsync(db, "smtp_port", "587"), out int p) ? p : 587;
            string senderEmail = await GetSettingAsync(db, "sender_email", "");
            string senderPass  = await GetSettingAsync(db, "sender_password", "");
            string receiverRaw = await GetSettingAsync(db, "receiver_email", "");

            if (string.IsNullOrWhiteSpace(smtpServer) || string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(receiverRaw))
            {
                _logger.LogWarning("[AlertScheduler] Alert: SMTP not fully configured. Skipping.");
                return;
            }

            var recipients = ParseEmails(receiverRaw);
            if (recipients.Length == 0) return;

            bool fastDue = IsIntervalDue(await GetSettingAsync(db, "alert_last_sent_fast", ""), FastAlertDays);
            bool slowDue = IsIntervalDue(await GetSettingAsync(db, "alert_last_sent_slow", ""), SlowAlertDays);

            if (!fastDue && !slowDue) return;

            var allLowStock = await db.MasterDatas
                .Where(m => !m.IsDeleted && (m.CurrentStock ?? 0) < (m.SafetyStock ?? 0))
                .AsNoTracking().OrderBy(m => m.CurrentStock).ToListAsync();

            var fastItems = allLowStock.Where(m => IsFreqFast(m.Frequency)).ToList();
            var slowItems = allLowStock.Where(m => !IsFreqFast(m.Frequency)).ToList();

            try
            {
                using var smtp = BuildSmtp(smtpServer, smtpPort, senderEmail, senderPass);

                if (fastDue)
                {
                    if (fastItems.Count > 0)
                    {
                        await SendAlertEmailAsync(smtp, senderEmail, recipients, fastItems, "FAST", FastAlertDays);
                        _logger.LogInformation("[AlertScheduler] Alert FAST sent. Items={N}.", fastItems.Count);
                    }
                    await SetSettingAsync(db, "alert_last_sent_fast", DateTime.UtcNow.ToString("o"));
                }
                if (slowDue)
                {
                    if (slowItems.Count > 0)
                    {
                        await SendAlertEmailAsync(smtp, senderEmail, recipients, slowItems, "SLOW", SlowAlertDays);
                        _logger.LogInformation("[AlertScheduler] Alert SLOW sent. Items={N}.", slowItems.Count);
                    }
                    await SetSettingAsync(db, "alert_last_sent_slow", DateTime.UtcNow.ToString("o"));
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "[AlertScheduler] Alert SMTP failed."); }
        }

        // ─────────────────────────────────────────────────────────────────
        // 2. AUTO-RFQ: AlertSelected=true items below safety stock
        //    Uses RFQ SMTP; includes supplier name from SupplierOffer
        // ─────────────────────────────────────────────────────────────────
        private async Task CheckAndSendRfqAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<UpmsDbContext>();

            if (await GetSettingAsync(db, "email_enabled", "0") != "1" ||
                await GetSettingAsync(db, "enable_low_stock_alert", "0") != "1")
            {
                return;
            }

            // Use RFQ SMTP settings (separate from alert SMTP)
            string smtpServer  = await GetSettingAsync(db, "smtp_server_rfq", "");
            int    smtpPort    = int.TryParse(await GetSettingAsync(db, "smtp_port_rfq", "587"), out int p) ? p : 587;
            string senderEmail = await GetSettingAsync(db, "sender_email_rfq", "");
            string senderPass  = await GetSettingAsync(db, "sender_password_rfq", "");
            // RFQ receiver setting (separate from alert SMTP)
            string receiverRaw = await GetSettingAsync(db, "receiver_email_rfq", "");
            if (string.IsNullOrWhiteSpace(receiverRaw))
            {
                receiverRaw = await GetSettingAsync(db, "receiver_email", "");
            }

            if (string.IsNullOrWhiteSpace(smtpServer) || string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(receiverRaw))
            {
                _logger.LogDebug("[AlertScheduler] RFQ: SMTP not configured. Skipping.");
                return;
            }

            var recipients = ParseEmails(receiverRaw);
            if (recipients.Length == 0) return;

            bool fastDue = IsIntervalDue(await GetSettingAsync(db, "rfq_last_sent_fast", ""), FastAlertDays);
            bool slowDue = IsIntervalDue(await GetSettingAsync(db, "rfq_last_sent_slow", ""), SlowAlertDays);

            if (!fastDue && !slowDue) return;

            // Fetch only AlertSelected=true items that are below safety stock
            var rfqItems = await db.MasterDatas
                .Where(m => !m.IsDeleted && m.AlertSelected && (m.CurrentStock ?? 0) < (m.SafetyStock ?? 0))
                .AsNoTracking().OrderBy(m => m.CurrentStock).ToListAsync();

            if (rfqItems.Count == 0)
            {
                _logger.LogInformation("[AlertScheduler] RFQ: No alert-selected low-stock items found.");
                if (fastDue) await SetSettingAsync(db, "rfq_last_sent_fast", DateTime.UtcNow.ToString("o"));
                if (slowDue) await SetSettingAsync(db, "rfq_last_sent_slow", DateTime.UtcNow.ToString("o"));
                return;
            }

            // Load supplier offers for all RFQ items in one query (including zero price entries for name lookup)
            var rfqIds = rfqItems.Select(m => m.Id).Where(id => id != null).ToList();
            var allOffers = await db.SupplierOffers
                .Where(o => rfqIds.Contains(o.MasterDataId) && !string.IsNullOrWhiteSpace(o.SupplierName))
                .AsNoTracking().ToListAsync();

            // Build a lookup: masterDataId -> preferred supplier offer
            var supplierLookup = new Dictionary<string, SupplierOffer>(StringComparer.OrdinalIgnoreCase);
            foreach (var id in rfqIds.Where(id => id != null))
            {
                var offersForItem = allOffers.Where(o => o.MasterDataId.Equals(id, StringComparison.OrdinalIgnoreCase)).ToList();
                if (!offersForItem.Any()) continue;

                // Prefer pinned (IsSelected=true), otherwise price > 0, otherwise first
                var preferred = offersForItem.FirstOrDefault(o => o.IsSelected)
                    ?? offersForItem.OrderByDescending(o => o.Price > 0).ThenBy(o => o.Price).First();
                supplierLookup[id!] = preferred;
            }

            var fastRfqItems = rfqItems.Where(m => IsFreqFast(m.Frequency)).ToList();
            var slowRfqItems = rfqItems.Where(m => !IsFreqFast(m.Frequency)).ToList();

            try
            {
                using var smtp = BuildSmtp(smtpServer, smtpPort, senderEmail, senderPass);

                if (fastDue)
                {
                    if (fastRfqItems.Count > 0)
                    {
                        await SendRfqEmailAsync(smtp, senderEmail, recipients, fastRfqItems, supplierLookup, "FAST", FastAlertDays);
                        _logger.LogInformation("[AlertScheduler] RFQ FAST sent. Items={N}.", fastRfqItems.Count);
                    }
                    await SetSettingAsync(db, "rfq_last_sent_fast", DateTime.UtcNow.ToString("o"));
                }
                if (slowDue)
                {
                    if (slowRfqItems.Count > 0)
                    {
                        await SendRfqEmailAsync(smtp, senderEmail, recipients, slowRfqItems, supplierLookup, "SLOW", SlowAlertDays);
                        _logger.LogInformation("[AlertScheduler] RFQ SLOW sent. Items={N}.", slowRfqItems.Count);
                    }
                    await SetSettingAsync(db, "rfq_last_sent_slow", DateTime.UtcNow.ToString("o"));
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "[AlertScheduler] RFQ SMTP failed."); }
        }

        // ─────────────────────────────────────────────────────────────────
        // Email builders
        // ─────────────────────────────────────────────────────────────────
        private static async Task SendAlertEmailAsync(
            SmtpClient smtp, string senderEmail, string[] recipients,
            List<MasterData> items, string freqLabel, int intervalDays)
        {
            string intervalText = intervalDays == FastAlertDays ? "setiap 2 minggu" : "setiap 1 bulan";
            string subject = $"[SMS AUTO-ALERT] Stok Kritis {freqLabel} Parts - {DateTime.Now:dd MMM yyyy}";

            var body = new StringBuilder();
            body.Append(HtmlOpen());
            body.Append(HtmlHeader($"Auto-Alert Terjadwal - Stok Kritis [{freqLabel} Parts, {intervalText}]"));
            body.AppendLine("<div style='padding: 24px;'>");
            body.AppendLine($"<div style='font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #0F4C81; margin-bottom: 12px;'>[AUTO-ALERT] Stok Kritis - {freqLabel} Parts (Low Safety Stock)</div>");
            body.AppendLine($"<p style='font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #333; margin: 0 0 12px 0;'>Yth. Tim Ops / Logistik &amp; Maintenance,<br/><br/>Laporan otomatis terjadwal ({intervalText}) untuk <strong>Sparepart Frekuensi {freqLabel}</strong> yang berada di bawah batas Safety Stock per <strong>{DateTime.Now:dd MMMM yyyy HH:mm} WIB</strong>. Terdapat <strong>{items.Count:N0} item</strong> yang memerlukan tindak lanjut pengadaan.</p>");
            body.Append(HtmlSummaryBox($"Total Item {freqLabel} - Low Safety Stock", items.Count));

            body.AppendLine("<div style='overflow-x: auto;'>");
            body.AppendLine("<table style='width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;'>");
            body.AppendLine("<thead><tr style='background-color: #0F4C81; color: #ffffff;'>");
            body.AppendLine(Th("NO", "center", "40px"));
            body.AppendLine(Th("PART ID", "left", "120px"));
            body.AppendLine(Th("NAMA ITEM"));
            body.AppendLine(Th("BIN LOCATION"));
            body.AppendLine(Th("STOK SAAT INI", "right"));
            body.AppendLine(Th("SAFETY STOCK", "right"));
            body.AppendLine(Th("STATUS", "center"));
            body.AppendLine("</tr></thead><tbody>");

            int rowNo = 1;
            foreach (var item in items)
            {
                string bg   = EvenOddBg(rowNo);
                bool isZero = (item.CurrentStock ?? 0) <= 0;
                body.AppendLine($"<tr style='{bg}'>");
                body.AppendLine(Td($"{rowNo++}", "center", "color: #555;"));
                body.AppendLine(Td(item.Id ?? "-", "left", "font-weight: bold; color: #0F4C81; white-space: nowrap;"));
                body.AppendLine(Td(item.Item, "left", "color: #222;"));
                body.AppendLine(Td(item.Bin ?? "-", "left", "color: #555;"));
                body.AppendLine(Td($"{item.CurrentStock ?? 0:N0}", "right", isZero ? "color: #cc2222; font-weight: bold;" : "color: #333; font-weight: bold;"));
                body.AppendLine(Td($"{item.SafetyStock ?? 0:N0}", "right", "color: #333;"));
                body.AppendLine($"<td style='padding: 7px 10px; border: 1px solid #ddd; text-align: center;'>{StatusBadge(isZero)}</td>");
                body.AppendLine("</tr>");
            }

            body.AppendLine("</tbody></table></div>");
            body.Append(HtmlFooter($"jadwal {intervalText} untuk frekuensi {freqLabel}"));
            body.AppendLine("</div></div></div></body></html>");

            await SendMailAsync(smtp, senderEmail, recipients, subject, body.ToString(), "SMS Auto Alert");
        }

        public static string GetSupplierNameForItem(MasterData item, Dictionary<string, SupplierOffer> supplierLookup)
        {
            if (item.Id != null && supplierLookup.TryGetValue(item.Id, out var offer) && !string.IsNullOrWhiteSpace(offer.SupplierName))
            {
                return offer.SupplierName.Trim();
            }
            if (!string.IsNullOrWhiteSpace(item.Brand))
            {
                return item.Brand.Trim();
            }
            return "PT. Supplier Partner";
        }

        public static (string Subject, string HtmlBody) BuildRfqEmail(
            List<MasterData> items,
            Dictionary<string, SupplierOffer> supplierLookup)
        {
            var supplierNames = items.Select(item => GetSupplierNameForItem(item, supplierLookup))
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            string supplierName = supplierNames.Count > 0
                ? string.Join(" / ", supplierNames)
                : "PT. Supplier Partner";

            return BuildRfqEmail(supplierName, items, supplierLookup);
        }

        public static (string Subject, string HtmlBody) BuildRfqEmail(
            string supplierName,
            List<MasterData> items,
            Dictionary<string, SupplierOffer> supplierLookup)
        {
            string subject = $"[DRAFT] Request for Quotation (RFQ) - Spare Part Supply - {supplierName}";
            string refNo = $"Ref. RFQ/UPMS/{DateTime.Now:yyyyMMdd}/{DateTime.Now:HHmm}";

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'></head>");
            sb.AppendLine("<body style='font-family: Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 20px; color: #222;'>");
            sb.AppendLine("<div style='max-width: 750px; margin: 0 auto; background-color: #ffffff; padding: 10px;'>");

            // Header table with Title and Ref Number
            sb.AppendLine("<table style='width: 100%; border-collapse: collapse; margin-bottom: 8px;'><tr>");
            sb.AppendLine("<td style='vertical-align: bottom; text-align: left; padding-left: 10px; border-left: 3px solid #0F4C81;'>");
            sb.AppendLine("<span style='font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; color: #0F4C81;'>Request for Quotation (RFQ)</span>");
            sb.AppendLine("</td>");
            sb.AppendLine($"<td style='vertical-align: bottom; text-align: right; font-family: Arial, sans-serif; font-size: 12px; color: #777777;'>{refNo}</td>");
            sb.AppendLine("</tr></table>");
            sb.AppendLine("<div style='height: 2px; background-color: #0F4C81; margin-bottom: 24px;'></div>");

            // Recipient greeting
            sb.AppendLine("<div style='font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.6; margin-bottom: 20px;'>");
            sb.AppendLine("Kepada Yth. Tim Sales / Account Manager,<br/>");
            sb.AppendLine($"<strong>{supplierName}</strong>");
            sb.AppendLine("</div>");

            // Intro paragraph
            sb.AppendLine("<p style='font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.6; margin-bottom: 20px;'>");
            sb.AppendLine("Melalui surat ini, kami dari bagian Sparepart Management L'Oreal Indonesia bermaksud meminta penawaran harga untuk suku cadang (spare parts) berikut yang sedang kami butuhkan:");
            sb.AppendLine("</p>");

            // Table
            sb.AppendLine("<table style='width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 24px;'>");
            sb.AppendLine("<thead>");
            sb.AppendLine("<tr style='background-color: #f4f6f9; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;'>");
            sb.AppendLine("<th style='padding: 10px 12px; text-align: left; font-weight: bold; color: #333333; font-size: 11px;'>PART NUMBER</th>");
            sb.AppendLine("<th style='padding: 10px 12px; text-align: left; font-weight: bold; color: #333333; font-size: 11px;'>ITEM NAME</th>");
            sb.AppendLine("<th style='padding: 10px 12px; text-align: left; font-weight: bold; color: #333333; font-size: 11px;'>DESCRIPTION</th>");
            sb.AppendLine("<th style='padding: 10px 12px; text-align: left; font-weight: bold; color: #333333; font-size: 11px;'>LOCATION</th>");
            sb.AppendLine("<th style='padding: 10px 12px; text-align: right; font-weight: bold; color: #333333; font-size: 11px;'>QTY NEED</th>");
            sb.AppendLine("</tr></thead><tbody>");

            foreach (var item in items)
            {
                string partNo = item.Id ?? "-";
                string desc = !string.IsNullOrWhiteSpace(item.Detail) ? item.Detail : "-";
                string loc = !string.IsNullOrWhiteSpace(item.Bin) ? item.Bin : "GENERAL";
                int qtyNeed = Math.Max(1, (item.SafetyStock ?? 0) - (item.CurrentStock ?? 0));

                sb.AppendLine("<tr style='border-bottom: 1px solid #eeeeee;'>");
                sb.AppendLine($"<td style='padding: 12px 12px; font-weight: bold; color: #0F4C81; white-space: nowrap;'>{partNo}</td>");
                sb.AppendLine($"<td style='padding: 12px 12px; font-weight: bold; color: #111111;'>{item.Item?.ToUpper() ?? "-"}</td>");
                sb.AppendLine($"<td style='padding: 12px 12px; color: #555555;'>{desc}</td>");
                sb.AppendLine($"<td style='padding: 12px 12px; color: #555555;'>{loc}</td>");
                sb.AppendLine($"<td style='padding: 12px 12px; text-align: right; font-weight: bold; color: #0F4C81;'>{qtyNeed:N0} Unit</td>");
                sb.AppendLine("</tr>");
            }

            sb.AppendLine("</tbody></table>");

            // Bullet points
            sb.AppendLine("<p style='font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.6; margin-bottom: 12px;'>");
            sb.AppendLine("Mohon kiranya dapat mengirimkan penawaran harga resmi (Quotation) yang mencakup:");
            sb.AppendLine("</p>");
            sb.AppendLine("<ul style='font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.8; margin: 0 0 24px 20px; padding: 0;'>");
            sb.AppendLine("<li>Harga per unit (Best Price)</li>");
            sb.AppendLine("<li>Ketersediaan stok / Lead time pengiriman</li>");
            sb.AppendLine("<li>Masa berlaku penawaran</li>");
            sb.AppendLine("<li>Foto item tersebut untuk memastikan kesesuaian spesifikasi</li>");
            sb.AppendLine("<li>Sertakan Part Number Yasulor</li>");
            sb.AppendLine("</ul>");

            // Sign off
            sb.AppendLine("<p style='font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.6; margin-bottom: 24px;'>");
            sb.AppendLine("Terima kasih atas kerja samanya. Kami tunggu penawaran terbaiknya segera.");
            sb.AppendLine("</p>");
            sb.AppendLine("<p style='font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.6; margin-bottom: 16px;'>");
            sb.AppendLine("Hormat kami,");
            sb.AppendLine("</p>");
            sb.AppendLine("<div style='font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #111111;'>SMS Inventory System</div>");
            sb.AppendLine("<div style='font-family: Arial, sans-serif; font-size: 12px; color: #666666; margin-top: 2px;'>L'Oreal Indonesia - Plant Division</div>");

            sb.AppendLine("</div></body></html>");

            return (subject, sb.ToString());
        }

        private static async Task SendRfqEmailAsync(
            SmtpClient smtp, string senderEmail, string[] recipients,
            List<MasterData> items, Dictionary<string, SupplierOffer> supplierLookup,
            string freqLabel, int intervalDays)
        {
            // Group items by supplier so each supplier gets a separate RFQ email
            var grouped = items.GroupBy(item => GetSupplierNameForItem(item, supplierLookup));

            foreach (var group in grouped)
            {
                string supplierName = group.Key;
                var supplierItems = group.ToList();

                var rfqEmail = BuildRfqEmail(supplierName, supplierItems, supplierLookup);
                await SendMailAsync(smtp, senderEmail, recipients, rfqEmail.Subject, rfqEmail.HtmlBody, "SMS Auto RFQ");
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // HTML helpers (shared, static)
        // ─────────────────────────────────────────────────────────────────
        private static string HtmlOpen() =>
            "<!DOCTYPE html><html><head><meta charset='utf-8'></head>" +
            "<body style='font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; color: #222;'>" +
            "<div style='max-width: 960px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d0d0d0;'>";

        private static string HtmlHeader(string subtitle) =>
            "<div style='background-color: #0F4C81; padding: 18px 24px;'>" +
            "<div style='font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff;'>SMS - Sparepart Management System</div>" +
            $"<div style='font-family: Arial, sans-serif; font-size: 12px; color: #cce0f5; margin-top: 4px;'>{subtitle}</div>" +
            "</div>";

        private static string HtmlSummaryBox(string label, int count) =>
            "<table style='width: 100%; border-collapse: collapse; margin-bottom: 16px;'><tr>" +
            $"<td style='font-family: Arial, sans-serif; background-color: #f0f0f0; border: 1px solid #d0d0d0; padding: 10px 16px;'>" +
            $"<span style='font-size: 11px; font-weight: bold; color: #555; text-transform: uppercase;'>{label}</span><br/>" +
            $"<span style='font-size: 22px; font-weight: bold; color: #cc2222;'>{count:N0} Item</span></td>" +
            "</tr></table>";

        private static string HtmlFooter(string context) =>
            "<div style='margin-top: 24px; padding-top: 14px; border-top: 1px solid #d0d0d0; font-family: Arial, sans-serif; font-size: 11px; color: #777;'>" +
            $"<p style='margin: 0;'>Email ini dikirim secara otomatis oleh sistem <strong>SMS (Sparepart Management System)</strong> - {context}. Mohon tidak membalas email ini secara langsung.</p>" +
            $"<p style='margin: 4px 0 0 0;'>Waktu kirim: {DateTime.Now:dd/MM/yyyy HH:mm:ss} WIB</p>" +
            "</div>";

        private static string Th(string text, string align = "left", string? width = null)
        {
            string w = width != null ? $" min-width: {width};" : "";
            return $"<th style='padding: 8px 10px; text-align: {align}; border: 1px solid #0a3a63;{w}'>{text}</th>";
        }

        private static string Td(string text, string align = "left", string extraStyle = "")
        {
            return $"<td style='padding: 7px 10px; border: 1px solid #ddd; text-align: {align}; {extraStyle}'>{text}</td>";
        }

        private static string EvenOddBg(int rowNo) =>
            (rowNo % 2 == 0) ? "background-color: #f7f7f7;" : "background-color: #ffffff;";

        private static string StatusBadge(bool isZero) => isZero
            ? "<span style='font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #cc2222; background-color: #fde8e8; padding: 2px 7px; border: 1px solid #e0a0a0;'>DEFISIT (0)</span>"
            : "<span style='font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #885500; background-color: #fff3cc; padding: 2px 7px; border: 1px solid #d4b86a;'>LOW STOCK</span>";

        private static SmtpClient BuildSmtp(string server, int port, string user, string pass) =>
            new SmtpClient(server, port)
            {
                Credentials = new NetworkCredential(user, pass),
                EnableSsl = true,
                Timeout = 30000
            };

        private static async Task SendMailAsync(SmtpClient smtp, string from, string[] recipients, string subject, string htmlBody, string displayName)
        {
            using var mail = new MailMessage();
            mail.From = new MailAddress(from, displayName);
            foreach (var r in recipients) mail.To.Add(r);
            mail.Subject = subject;
            mail.Body = htmlBody;
            mail.IsBodyHtml = true;
            await smtp.SendMailAsync(mail);
        }

        // ─────────────────────────────────────────────────────────────────
        // Utilities
        // ─────────────────────────────────────────────────────────────────
        private static bool IsFreqFast(string? freq) =>
            string.Equals(freq, "FAST", StringComparison.OrdinalIgnoreCase);

        private static bool IsIntervalDue(string lastSentStr, int intervalDays)
        {
            if (string.IsNullOrWhiteSpace(lastSentStr)) return true;
            if (!DateTime.TryParse(lastSentStr, null, System.Globalization.DateTimeStyles.RoundtripKind, out DateTime last))
                return true;
            return (DateTime.UtcNow - last).TotalDays >= intervalDays;
        }

        private static string[] ParseEmails(string raw) =>
            raw.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
               .Where(r => !string.IsNullOrWhiteSpace(r))
               .ToArray();

        private static async Task<string> GetSettingAsync(UpmsDbContext db, string key, string defaultValue = "")
        {
            try
            {
                var s = await db.AppSettings.AsNoTracking().FirstOrDefaultAsync(x => x.SettingKey == key);
                return s?.SettingValue ?? defaultValue;
            }
            catch { return defaultValue; }
        }

        private static async Task SetSettingAsync(UpmsDbContext db, string key, string value)
        {
            try
            {
                var existing = await db.AppSettings.FirstOrDefaultAsync(x => x.SettingKey == key);
                if (existing == null)
                    db.AppSettings.Add(new AppSetting { SettingKey = key, SettingValue = value });
                else
                    existing.SettingValue = value;
                await db.SaveChangesAsync();
            }
            catch { }
        }
    }
}
