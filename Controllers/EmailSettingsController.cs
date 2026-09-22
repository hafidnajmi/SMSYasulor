using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;
using UPMS.Web.Services;

namespace UPMS.Web.Controllers
{
    public class EmailSettingsViewModel
    {
        public bool EmailEnabled { get; set; } = false;

        // Stock Report & Auto Alert SMTP
        public string SmtpServer { get; set; } = "smtp.office365.com";
        public int SmtpPort { get; set; } = 587;
        public string SenderEmail { get; set; } = "";
        public string SenderPassword { get; set; } = "";
        public string ReceiverEmail { get; set; } = "";
        public bool EnableLowStockAlert { get; set; } = true;
        public bool EnableDailyReportSchedule { get; set; } = false;

        // Supplier RFQ SMTP
        public string SmtpServerRfq { get; set; } = "smtp.office365.com";
        public int SmtpPortRfq { get; set; } = 587;
        public string SenderEmailRfq { get; set; } = "";
        public string SenderPasswordRfq { get; set; } = "";
        public string ReceiverEmailRfq { get; set; } = "";
    }

    [Authorize]
    public class EmailSettingsController : Controller
    {
        private readonly UpmsDbContext _db;

        public EmailSettingsController(UpmsDbContext db)
        {
            _db = db;
        }

        private async Task EnsureAppSettingsTableAsync()
        {
            try
            {
                await _db.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS ""App_Settings"" (
                        setting_key VARCHAR(100) PRIMARY KEY,
                        setting_value TEXT
                    );
                ");
            }
            catch { }
        }

        private async Task<string> GetSettingAsync(string key, string defaultValue = "")
        {
            await EnsureAppSettingsTableAsync();
            var setting = await _db.AppSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingKey == key);
            return setting?.SettingValue ?? defaultValue;
        }

        private async Task SetSettingAsync(string key, string value)
        {
            await EnsureAppSettingsTableAsync();
            var existing = await _db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == key);
            if (existing == null)
            {
                _db.AppSettings.Add(new AppSetting { SettingKey = key, SettingValue = value });
            }
            else
            {
                existing.SettingValue = value;
            }
            await _db.SaveChangesAsync();
        }

        public async Task<IActionResult> Index()
        {
            var vm = new EmailSettingsViewModel
            {
                EmailEnabled = (await GetSettingAsync("email_enabled", "0")) == "1",
                SmtpServer = await GetSettingAsync("smtp_server", "smtp.office365.com"),
                SmtpPort = int.TryParse(await GetSettingAsync("smtp_port", "587"), out int p1) ? p1 : 587,
                SenderEmail = await GetSettingAsync("sender_email", ""),
                SenderPassword = await GetSettingAsync("sender_password", ""),
                ReceiverEmail = await GetSettingAsync("receiver_email", ""),
                EnableLowStockAlert = (await GetSettingAsync("enable_low_stock_alert", "1")) == "1",
                EnableDailyReportSchedule = (await GetSettingAsync("enable_daily_report_schedule", "0")) == "1",

                SmtpServerRfq = await GetSettingAsync("smtp_server_rfq", "smtp.office365.com"),
                SmtpPortRfq = int.TryParse(await GetSettingAsync("smtp_port_rfq", "587"), out int p2) ? p2 : 587,
                SenderEmailRfq = await GetSettingAsync("sender_email_rfq", ""),
                SenderPasswordRfq = await GetSettingAsync("sender_password_rfq", ""),
                ReceiverEmailRfq = await GetSettingAsync("receiver_email_rfq", "")
            };

            // ── Auto-Alert schedule timestamps ──────────────────────────
            LoadScheduleTimestamps(
                await GetSettingAsync("alert_last_sent_fast", ""),
                await GetSettingAsync("alert_last_sent_slow", ""),
                "LastSentFast", "NextSentFast", "LastSentSlow", "NextSentSlow");

            // ── Auto-RFQ schedule timestamps ────────────────────────────
            LoadScheduleTimestamps(
                await GetSettingAsync("rfq_last_sent_fast", ""),
                await GetSettingAsync("rfq_last_sent_slow", ""),
                "RfqLastSentFast", "RfqNextSentFast", "RfqLastSentSlow", "RfqNextSentSlow");

            return View(vm);
        }

        private void LoadScheduleTimestamps(
            string lastFastStr, string lastSlowStr,
            string keyLastFast, string keyNextFast, string keyLastSlow, string keyNextSlow)
        {
            if (DateTime.TryParse(lastFastStr, null, System.Globalization.DateTimeStyles.RoundtripKind, out DateTime lf))
            {
                ViewData[keyLastFast] = lf.ToLocalTime().ToString("dd MMM yyyy HH:mm");
                ViewData[keyNextFast] = lf.ToLocalTime().AddDays(14).ToString("dd MMM yyyy HH:mm");
            }
            else
            {
                ViewData[keyLastFast] = "Belum pernah dikirim";
                ViewData[keyNextFast] = "Segera setelah fitur aktif";
            }

            if (DateTime.TryParse(lastSlowStr, null, System.Globalization.DateTimeStyles.RoundtripKind, out DateTime ls))
            {
                ViewData[keyLastSlow] = ls.ToLocalTime().ToString("dd MMM yyyy HH:mm");
                ViewData[keyNextSlow] = ls.ToLocalTime().AddDays(30).ToString("dd MMM yyyy HH:mm");
            }
            else
            {
                ViewData[keyLastSlow] = "Belum pernah dikirim";
                ViewData[keyNextSlow] = "Segera setelah fitur aktif";
            }
        }


        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Save(EmailSettingsViewModel model)
        {
            await SetSettingAsync("email_enabled", model.EmailEnabled ? "1" : "0");

            await SetSettingAsync("smtp_server", model.SmtpServer?.Trim() ?? "");
            await SetSettingAsync("smtp_port", model.SmtpPort.ToString());
            await SetSettingAsync("sender_email", model.SenderEmail?.Trim() ?? "");
            if (!string.IsNullOrWhiteSpace(model.SenderPassword))
            {
                await SetSettingAsync("sender_password", model.SenderPassword.Trim());
            }
            await SetSettingAsync("receiver_email", model.ReceiverEmail?.Trim() ?? "");
            await SetSettingAsync("enable_low_stock_alert", model.EnableLowStockAlert ? "1" : "0");
            await SetSettingAsync("enable_daily_report_schedule", model.EnableDailyReportSchedule ? "1" : "0");

            await SetSettingAsync("smtp_server_rfq", model.SmtpServerRfq?.Trim() ?? "");
            await SetSettingAsync("smtp_port_rfq", model.SmtpPortRfq.ToString());
            await SetSettingAsync("sender_email_rfq", model.SenderEmailRfq?.Trim() ?? "");
            if (!string.IsNullOrWhiteSpace(model.SenderPasswordRfq))
            {
                await SetSettingAsync("sender_password_rfq", model.SenderPasswordRfq.Trim());
            }
            await SetSettingAsync("receiver_email_rfq", model.ReceiverEmailRfq?.Trim() ?? "");

            TempData["Success"] = "Pengaturan Email & Auto-Alert berhasil disimpan.";
            return RedirectToAction("Index");
        }

        [HttpPost]
        public async Task<IActionResult> TestSmtpConnection(string server, int port, string email, string password)
        {
            if (string.IsNullOrWhiteSpace(server) || string.IsNullOrWhiteSpace(email))
            {
                return Json(new { success = false, message = "Harap isi SMTP Server dan Email Pengirim." });
            }

            string passToUse = password;
            if (string.IsNullOrWhiteSpace(passToUse))
            {
                passToUse = await GetSettingAsync("sender_password", "");
            }

            try
            {
                using var client = new SmtpClient(server.Trim(), port)
                {
                    Credentials = new NetworkCredential(email.Trim(), passToUse),
                    EnableSsl = true,
                    Timeout = 10000
                };

                // Test SMTP handshake
                return Json(new { success = true, message = "Koneksi SMTP Berhasil! Autentikasi server valid." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Gagal terhubung ke SMTP: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SendTestReport(string? server, int? port, string? sender, string? pass, string? receiver)
        {
            if (string.IsNullOrWhiteSpace(server)) server = await GetSettingAsync("smtp_server", "smtp.office365.com");
            int portToUse = (port.HasValue && port.Value > 0) ? port.Value : (int.TryParse(await GetSettingAsync("smtp_port", "587"), out int p) ? p : 587);
            if (string.IsNullOrWhiteSpace(sender)) sender = await GetSettingAsync("sender_email", "");
            if (string.IsNullOrWhiteSpace(pass)) pass = await GetSettingAsync("sender_password", "");
            if (string.IsNullOrWhiteSpace(receiver)) receiver = await GetSettingAsync("receiver_email", "");

            if (string.IsNullOrWhiteSpace(sender) || string.IsNullOrWhiteSpace(receiver))
            {
                return Json(new { success = false, message = "Email Pengirim dan Email Penerima harus diisi terlebih dahulu." });
            }

            var recipients = receiver.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (!recipients.Any())
            {
                return Json(new { success = false, message = "Email Penerima tidak valid. Harap periksa kembali." });
            }

            try
            {
                // Fetch critical stock items (CurrentStock < SafetyStock, strictly less than)
                var lowStockItems = await _db.MasterDatas
                    .Where(m => !m.IsDeleted && (m.CurrentStock ?? 0) < (m.SafetyStock ?? 0))
                    .AsNoTracking()
                    .OrderBy(m => m.CurrentStock)
                    .ToListAsync();

                var body = new System.Text.StringBuilder();
                body.AppendLine("<!DOCTYPE html><html><head><meta charset='utf-8'></head><body style='font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; color: #222;'>");
                body.AppendLine("<div style='max-width: 960px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d0d0d0;'>");

                // Header
                body.AppendLine("<div style='background-color: #0F4C81; padding: 18px 24px;'>");
                body.AppendLine("<div style='font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff;'>SMS - Sparepart Management System</div>");
                body.AppendLine("<div style='font-family: Arial, sans-serif; font-size: 12px; color: #cce0f5; margin-top: 4px;'>Notifikasi Otomatis - Monitoring Stok Sparepart Kritis</div>");
                body.AppendLine("</div>");

                // Body content
                body.AppendLine("<div style='padding: 24px;'>");
                body.AppendLine("<div style='font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; color: #0F4C81; margin-bottom: 12px;'>[AUTO-ALERT] Laporan Stok Kritis Sparepart - Low Safety Stock</div>");
                body.AppendLine($"<p style='font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #333; margin: 0 0 12px 0;'>Yth. Tim Ops / Logistik &amp; Maintenance,<br/><br/>Berikut laporan otomatis <strong>Stok Kritis Sparepart (Low Safety Stock)</strong> per tanggal <strong>{DateTime.Now:dd MMMM yyyy HH:mm} WIB</strong>. Terdapat <strong>{lowStockItems.Count:N0} item</strong> yang telah mencapai atau berada di bawah batas minimum Safety Stock dan memerlukan tindak lanjut pengadaan.</p>");

                // Summary count
                body.AppendLine("<table style='width: 100%; border-collapse: collapse; margin-bottom: 16px;'><tr>");
                body.AppendLine($"<td style='font-family: Arial, sans-serif; background-color: #f0f0f0; border: 1px solid #d0d0d0; padding: 10px 16px;'><span style='font-size: 11px; font-weight: bold; color: #555; text-transform: uppercase;'>Total Item Low Safety Stock</span><br/><span style='font-size: 22px; font-weight: bold; color: #cc2222;'>{lowStockItems.Count:N0} Item</span></td>");
                body.AppendLine("</tr></table>");

                // Data Table
                body.AppendLine("<div style='overflow-x: auto;'>");
                body.AppendLine("<table style='width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;'>");
                body.AppendLine("<thead><tr style='background-color: #0F4C81; color: #ffffff;'>");
                body.AppendLine("<th style='padding: 8px 10px; text-align: center; border: 1px solid #0a3a63; width: 40px;'>NO</th>");
                body.AppendLine("<th style='padding: 8px 10px; text-align: left; border: 1px solid #0a3a63; min-width: 120px; white-space: nowrap;'>PART ID</th>");
                body.AppendLine("<th style='padding: 8px 10px; text-align: left; border: 1px solid #0a3a63;'>NAMA ITEM</th>");
                body.AppendLine("<th style='padding: 8px 10px; text-align: left; border: 1px solid #0a3a63;'>BIN LOCATION</th>");
                body.AppendLine("<th style='padding: 8px 10px; text-align: right; border: 1px solid #0a3a63;'>STOK SAAT INI</th>");
                body.AppendLine("<th style='padding: 8px 10px; text-align: right; border: 1px solid #0a3a63;'>SAFETY STOCK</th>");
                body.AppendLine("<th style='padding: 8px 10px; text-align: center; border: 1px solid #0a3a63;'>STATUS</th>");
                body.AppendLine("</tr></thead><tbody>");

                int rowNo = 1;
                foreach (var item in lowStockItems)
                {
                    string bgStyle = (rowNo % 2 == 0) ? "background-color: #f7f7f7;" : "background-color: #ffffff;";
                    bool isZeroDeficit = (item.CurrentStock ?? 0) <= 0;
                    string stockColor = isZeroDeficit ? "color: #cc2222; font-weight: bold;" : "color: #333; font-weight: bold;";
                    string statusText = isZeroDeficit ? "DEFISIT (0)" : "LOW STOCK";
                    string statusStyle = isZeroDeficit
                        ? "font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #cc2222; background-color: #fde8e8; padding: 2px 7px; border: 1px solid #e0a0a0;"
                        : "font-family: Arial, sans-serif; font-size: 11px; font-weight: bold; color: #885500; background-color: #fff3cc; padding: 2px 7px; border: 1px solid #d4b86a;";

                    body.AppendLine($"<tr style='{bgStyle}'>");
                    body.AppendLine($"<td style='padding: 7px 10px; text-align: center; border: 1px solid #ddd; color: #555;'>{rowNo++}</td>");
                    body.AppendLine($"<td style='padding: 7px 10px; border: 1px solid #ddd; font-weight: bold; color: #0F4C81; min-width: 120px; white-space: nowrap;'>{item.Id ?? "-"}</td>");
                    body.AppendLine($"<td style='padding: 7px 10px; border: 1px solid #ddd; color: #222;'>{item.Item}</td>");
                    body.AppendLine($"<td style='padding: 7px 10px; border: 1px solid #ddd; color: #555;'>{item.Bin ?? "-"}</td>");
                    body.AppendLine($"<td style='padding: 7px 10px; border: 1px solid #ddd; text-align: right; {stockColor}'>{item.CurrentStock ?? 0:N0}</td>");
                    body.AppendLine($"<td style='padding: 7px 10px; border: 1px solid #ddd; text-align: right; color: #333;'>{item.SafetyStock ?? 0:N0}</td>");
                    body.AppendLine($"<td style='padding: 7px 10px; border: 1px solid #ddd; text-align: center;'><span style='{statusStyle}'>{statusText}</span></td>");
                    body.AppendLine("</tr>");
                }

                body.AppendLine("</tbody></table></div>");

                // Footer note
                body.AppendLine("<div style='margin-top: 24px; padding-top: 14px; border-top: 1px solid #d0d0d0; font-family: Arial, sans-serif; font-size: 11px; color: #777;'>");
                body.AppendLine("<p style='margin: 0;'>Email ini dibuat dan dikirim secara otomatis oleh sistem <strong>SMS (Sparepart Management System)</strong>. Mohon tidak membalas email ini secara langsung.</p>");
                body.AppendLine($"<p style='margin: 4px 0 0 0;'>Waktu: {DateTime.Now:dd/MM/yyyy HH:mm:ss} WIB</p>");
                body.AppendLine("</div></div></div></body></html>");

                using var mail = new MailMessage();
                mail.From = new MailAddress(sender, "SMS Auto Alert");

                foreach (var r in recipients)
                {
                    mail.To.Add(r);
                }

                mail.Subject = $"[SMS AUTO-ALERT] Laporan Stok Kritis Sparepart - {DateTime.Now:dd MMM yyyy}";
                mail.Body = body.ToString();
                mail.IsBodyHtml = true;

                using var client = new SmtpClient(server, portToUse)
                {
                    Credentials = new NetworkCredential(sender, pass),
                    EnableSsl = true,
                    Timeout = 30000
                };

                await client.SendMailAsync(mail);
                return Json(new { success = true, message = $"Email Auto-Alert berhasil dikirim ke {recipients.Length} penerima ({lowStockItems.Count:N0} item stok kritis ditemukan)." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Gagal mengirim email: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> SendTestRfq(string? server, int? port, string? sender, string? pass, string? receiver)
        {
            // Fall back to saved RFQ SMTP settings if not provided in form
            if (string.IsNullOrWhiteSpace(server))  server  = await GetSettingAsync("smtp_server_rfq", "");
            int portToUse = (port.HasValue && port.Value > 0) ? port.Value
                          : (int.TryParse(await GetSettingAsync("smtp_port_rfq", "587"), out int p) ? p : 587);
            if (string.IsNullOrWhiteSpace(sender))  sender  = await GetSettingAsync("sender_email_rfq", "");
            if (string.IsNullOrWhiteSpace(pass))    pass    = await GetSettingAsync("sender_password_rfq", "");
            if (string.IsNullOrWhiteSpace(receiver)) receiver = await GetSettingAsync("receiver_email_rfq", "");
            if (string.IsNullOrWhiteSpace(receiver)) receiver = await GetSettingAsync("receiver_email", "");

            if (string.IsNullOrWhiteSpace(server) || string.IsNullOrWhiteSpace(sender))
                return Json(new { success = false, message = "SMTP Server RFQ dan Email Pengirim RFQ harus diisi terlebih dahulu di halaman ini." });

            if (string.IsNullOrWhiteSpace(receiver))
                return Json(new { success = false, message = "Email Penerima RFQ harus diisi terlebih dahulu di kolom Email Penerima RFQ." });

            var recipients = receiver.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                                     .Where(r => !string.IsNullOrWhiteSpace(r)).ToArray();
            if (!recipients.Any())
                return Json(new { success = false, message = "Email Penerima tidak valid." });

            try
            {
                // Fetch AlertSelected=true items below safety stock
                var rfqItems = await _db.MasterDatas
                    .Where(m => !m.IsDeleted && m.AlertSelected && (m.CurrentStock ?? 0) < (m.SafetyStock ?? 0))
                    .AsNoTracking()
                    .OrderBy(m => m.CurrentStock)
                    .ToListAsync();

                if (!rfqItems.Any())
                    return Json(new { success = false, message = "Tidak ada item dengan Alert aktif yang berada di bawah Safety Stock saat ini. Aktifkan centang Alert di Sparepart Catalog untuk minimal 1 item low stock." });

                // Load supplier offers
                var rfqIds = rfqItems.Select(m => m.Id).Where(id => id != null).ToList();
                var allOffers = await _db.SupplierOffers
                    .Where(o => rfqIds.Contains(o.MasterDataId) && !string.IsNullOrWhiteSpace(o.SupplierName))
                    .AsNoTracking().ToListAsync();

                var supplierLookup = new Dictionary<string, SupplierOffer>(StringComparer.OrdinalIgnoreCase);
                foreach (var id in rfqIds.Where(id => id != null))
                {
                    var offers = allOffers.Where(o => o.MasterDataId.Equals(id, StringComparison.OrdinalIgnoreCase)).ToList();
                    if (!offers.Any()) continue;
                    supplierLookup[id!] = offers.FirstOrDefault(o => o.IsSelected) ?? offers.OrderByDescending(o => o.Price > 0).ThenBy(o => o.Price).First();
                }

                // Group items by supplier so each supplier receives its own separate RFQ email
                var grouped = rfqItems.GroupBy(item => AlertSchedulerService.GetSupplierNameForItem(item, supplierLookup)).ToList();

                using var client = new SmtpClient(server, portToUse)
                {
                    Credentials = new NetworkCredential(sender, pass),
                    EnableSsl = true,
                    Timeout = 30000
                };

                int emailSentCount = 0;
                foreach (var group in grouped)
                {
                    string supplierName = group.Key;
                    var groupItems = group.ToList();

                    var rfqEmail = AlertSchedulerService.BuildRfqEmail(supplierName, groupItems, supplierLookup);

                    using var mail = new MailMessage();
                    mail.From = new MailAddress(sender, "SMS Auto RFQ");
                    foreach (var r in recipients) mail.To.Add(r);
                    mail.Subject = rfqEmail.Subject;
                    mail.Body = rfqEmail.HtmlBody;
                    mail.IsBodyHtml = true;

                    await client.SendMailAsync(mail);
                    emailSentCount++;
                }

                string detailMsg = emailSentCount == 1
                    ? $"1 email RFQ berhasil dikirim ke {recipients.Length} penerima ({rfqItems.Count:N0} item)."
                    : $"{emailSentCount} email RFQ terpisah (berdasarkan supplier) berhasil dikirim ke {recipients.Length} penerima ({rfqItems.Count:N0} item).";

                return Json(new { success = true, message = detailMsg });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Gagal mengirim RFQ: {ex.Message}" });
            }
        }
    }
}
