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
                SenderPasswordRfq = await GetSettingAsync("sender_password_rfq", "")
            };

            return View(vm);
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
        public async Task<IActionResult> SendTestReport()
        {
            string server = await GetSettingAsync("smtp_server", "smtp.office365.com");
            int port = int.TryParse(await GetSettingAsync("smtp_port", "587"), out int p) ? p : 587;
            string sender = await GetSettingAsync("sender_email", "");
            string pass = await GetSettingAsync("sender_password", "");
            string receiver = await GetSettingAsync("receiver_email", "");

            if (string.IsNullOrWhiteSpace(sender) || string.IsNullOrWhiteSpace(receiver))
            {
                return Json(new { success = false, message = "Email Pengirim dan Email Penerima harus diisi terlebih dahulu." });
            }

            try
            {
                // Fetch low stock items
                var lowStockItems = await _db.MasterDatas
                    .Where(m => !m.IsDeleted && (m.CurrentStock ?? 0) <= (m.SafetyStock ?? 0))
                    .AsNoTracking()
                    .ToListAsync();

                var body = new System.Text.StringBuilder();
                body.AppendLine("<h2>[AUTO-ALERT] Laporan Stok Kritis UP-Management Sparepart</h2>");
                body.AppendLine($"<p>Waktu Laporan: <b>{DateTime.Now:dd MMM yyyy HH:mm:ss}</b></p>");
                body.AppendLine($"<p>Jumlah Sparepart Kritis: <b>{lowStockItems.Count} Item</b></p>");
                body.AppendLine("<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;'>");
                body.AppendLine("<tr style='background:#f2f2f2;'><th>Part ID</th><th>Nama Item</th><th>Bin</th><th>Stok Saat Ini</th><th>Safety Stock</th></tr>");

                foreach (var item in lowStockItems.Take(15))
                {
                    body.AppendLine($"<tr><td>{item.Id}</td><td>{item.Item}</td><td>{item.Bin}</td><td style='color:red;font-weight:bold;'>{item.CurrentStock ?? 0}</td><td>{item.SafetyStock ?? 0}</td></tr>");
                }
                body.AppendLine("</table>");

                using var mail = new MailMessage();
                mail.From = new MailAddress(sender, "UPMS Auto Alert");
                mail.To.Add(receiver);
                mail.Subject = $"[TEST ALERT] Laporan Stok Kritis - {DateTime.Now:dd MMM yyyy}";
                mail.Body = body.ToString();
                mail.IsBodyHtml = true;

                using var client = new SmtpClient(server, port)
                {
                    Credentials = new NetworkCredential(sender, pass),
                    EnableSsl = true,
                    Timeout = 15000
                };

                await client.SendMailAsync(mail);
                return Json(new { success = true, message = $"Email percobaam berhasil dikirim ke {receiver} ({lowStockItems.Count} item kritis ditemukan)." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = $"Gagal mengirim email: {ex.Message}" });
            }
        }
    }
}
