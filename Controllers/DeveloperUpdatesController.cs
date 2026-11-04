using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Helpers;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Controllers
{
    [Authorize]
    public class DeveloperUpdatesController : Controller
    {
        private readonly UpmsDbContext _db;

        public DeveloperUpdatesController(UpmsDbContext db)
        {
            _db = db;
        }

        private async Task<bool> IsAdminOrDeveloperAsync()
        {
            var curUser = User.Identity?.Name;
            var user = await RbacHelper.GetUserAsync(_db, curUser);
            return RbacHelper.IsAdmin(user, curUser);
        }

        private async Task<string> GetSettingAsync(string key, string defaultValue = "")
        {
            var setting = await _db.AppSettings.AsNoTracking().FirstOrDefaultAsync(s => s.SettingKey == key);
            return setting?.SettingValue ?? defaultValue;
        }

        // GET: /DeveloperUpdates
        public async Task<IActionResult> Index(string? type, string? status, string? search)
        {
            if (!await IsAdminOrDeveloperAsync())
            {
                TempData["Error"] = "Akses Ditolak: Menu Developer Updates hanya dapat diakses oleh Administrator & Developer.";
                return RedirectToAction("Index", "Dashboard");
            }

            var query = _db.SystemUpdates.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(type) && !string.Equals(type, "all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => u.UpdateType.ToLower() == type.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => u.ReleaseStatus.ToLower() == status.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                query = query.Where(u => 
                    u.Title.ToLower().Contains(s) || 
                    u.Version.ToLower().Contains(s) || 
                    u.Description.ToLower().Contains(s) ||
                    u.CreatedBy.ToLower().Contains(s));
            }

            var allList = await _db.SystemUpdates.AsNoTracking().ToListAsync();

            ViewBag.TotalCount = allList.Count;
            ViewBag.PublishedCount = allList.Count(u => u.ReleaseStatus.Equals("Published", StringComparison.OrdinalIgnoreCase));
            ViewBag.DraftCount = allList.Count(u => u.ReleaseStatus.Equals("Draft", StringComparison.OrdinalIgnoreCase));
            ViewBag.BugFixCount = allList.Count(u => u.UpdateType.Equals("Bug Fix", StringComparison.OrdinalIgnoreCase));
            ViewBag.ImprovementCount = allList.Count(u => u.UpdateType.Equals("Improvement", StringComparison.OrdinalIgnoreCase));
            ViewBag.NewFeatureCount = allList.Count(u => u.UpdateType.Equals("New Feature", StringComparison.OrdinalIgnoreCase));
            ViewBag.ActiveAlertCount = allList.Count(u => u.IsActive && u.ShowPopupAlert);

            ViewBag.SelectedType = type ?? "all";
            ViewBag.SelectedStatus = status ?? "all";
            ViewBag.SearchQuery = search ?? "";
            ViewBag.DefaultReceiverEmail = await GetSettingAsync("receiver_email", "");
            ViewBag.EmailEnabled = (await GetSettingAsync("email_enabled", "0")) == "1";

            var updates = await query.OrderByDescending(u => u.ReleaseDate ?? u.CreatedAt).ToListAsync();
            return View(updates);
        }

        // POST: /DeveloperUpdates/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(SystemUpdate model, string? customRecipients)
        {
            if (!await IsAdminOrDeveloperAsync())
            {
                return Forbid();
            }

            if (string.IsNullOrWhiteSpace(model.Title) || string.IsNullOrWhiteSpace(model.Description))
            {
                TempData["Error"] = "Judul dan rincian update tidak boleh kosong.";
                return RedirectToAction(nameof(Index));
            }

            var now = DateTime.Now;
            model.Version = string.IsNullOrWhiteSpace(model.Version) ? "v1.0.0" : model.Version.Trim();
            model.Title = model.Title.Trim();
            model.UpdateType = string.IsNullOrWhiteSpace(model.UpdateType) ? "Improvement" : model.UpdateType.Trim();
            model.Description = model.Description.Trim();
            model.ActionRequired = string.IsNullOrWhiteSpace(model.ActionRequired) ? null : model.ActionRequired.Trim();
            model.TargetAudience = string.IsNullOrWhiteSpace(model.TargetAudience) ? "All Users" : model.TargetAudience.Trim();
            model.ReleaseStatus = string.IsNullOrWhiteSpace(model.ReleaseStatus) ? "Published" : model.ReleaseStatus.Trim();
            
            if (model.ReleaseStatus.Equals("Published", StringComparison.OrdinalIgnoreCase))
            {
                model.ReleaseDate = model.ReleaseDate ?? now;
            }
            else
            {
                model.ReleaseDate = null;
                model.SendEmail = false; // Do not send email for drafts
            }

            model.CreatedBy = User.Identity?.Name ?? "Developer";
            model.CreatedAt = now;
            model.UpdatedAt = now;
            model.IsActive = true;

            // Resolve email recipients
            string recipients = !string.IsNullOrWhiteSpace(customRecipients) 
                ? customRecipients.Trim() 
                : await GetSettingAsync("receiver_email", "");
            model.RecipientEmails = recipients;

            _db.SystemUpdates.Add(model);
            await _db.SaveChangesAsync();

            // Handle Email Broadcast if enabled
            if (model.SendEmail && !string.IsNullOrWhiteSpace(recipients) && model.ReleaseStatus.Equals("Published", StringComparison.OrdinalIgnoreCase))
            {
                var (success, count, error) = await SendBroadcastEmailAsync(model, recipients);
                if (success)
                {
                    model.EmailSentCount = count;
                    model.EmailSentAt = DateTime.Now;
                    await _db.SaveChangesAsync();
                    TempData["Success"] = $"Update '{model.Title}' ({model.Version}) berhasil dipublish & email broadcast berhasil dikirim ke {count} penerima.";
                }
                else
                {
                    TempData["Warning"] = $"Update '{model.Title}' berhasil disimpan, namun broadcast email gagal: {error}";
                }
            }
            else
            {
                TempData["Success"] = model.ReleaseStatus == "Draft" 
                    ? $"Draft pembaruan '{model.Title}' ({model.Version}) berhasil disimpan."
                    : $"Update '{model.Title}' ({model.Version}) berhasil dipublikasikan ke sistem.";
            }

            return RedirectToAction(nameof(Index));
        }

        // POST: /DeveloperUpdates/Edit
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, string title, string version, string updateType, string description, string? actionRequired, string targetAudience, string? releaseStatus, DateTime? releaseDate, bool showPopupAlert, bool isActive)
        {
            if (!await IsAdminOrDeveloperAsync()) return Forbid();

            var item = await _db.SystemUpdates.FindAsync(id);
            if (item == null)
            {
                TempData["Error"] = "Catatan update tidak ditemukan.";
                return RedirectToAction(nameof(Index));
            }

            item.Title = title?.Trim() ?? item.Title;
            item.Version = string.IsNullOrWhiteSpace(version) ? item.Version : version.Trim();
            item.UpdateType = string.IsNullOrWhiteSpace(updateType) ? item.UpdateType : updateType.Trim();
            item.Description = description?.Trim() ?? item.Description;
            item.ActionRequired = string.IsNullOrWhiteSpace(actionRequired) ? null : actionRequired.Trim();
            item.TargetAudience = string.IsNullOrWhiteSpace(targetAudience) ? "All Users" : targetAudience.Trim();

            var newStatus = string.IsNullOrWhiteSpace(releaseStatus) ? item.ReleaseStatus : releaseStatus.Trim();
            if (newStatus.Equals("Published", StringComparison.OrdinalIgnoreCase) && item.ReleaseStatus.Equals("Draft", StringComparison.OrdinalIgnoreCase))
            {
                item.ReleaseDate = releaseDate ?? DateTime.Now;
            }
            else if (newStatus.Equals("Draft", StringComparison.OrdinalIgnoreCase))
            {
                item.ReleaseDate = null;
            }
            else
            {
                item.ReleaseDate = releaseDate ?? item.ReleaseDate ?? DateTime.Now;
            }
            item.ReleaseStatus = newStatus;

            item.ShowPopupAlert = showPopupAlert;
            item.IsActive = isActive;
            item.UpdatedAt = DateTime.Now;

            await _db.SaveChangesAsync();
            TempData["Success"] = $"Update '{item.Title}' berhasil diperbarui.";
            return RedirectToAction(nameof(Index));
        }

        // POST: /DeveloperUpdates/PublishDraft
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> PublishDraft(int id)
        {
            if (!await IsAdminOrDeveloperAsync()) return Forbid();

            var item = await _db.SystemUpdates.FindAsync(id);
            if (item == null)
            {
                TempData["Error"] = "Catatan update tidak ditemukan.";
                return RedirectToAction(nameof(Index));
            }

            item.ReleaseStatus = "Published";
            item.ReleaseDate = DateTime.Now;
            item.UpdatedAt = DateTime.Now;
            await _db.SaveChangesAsync();

            TempData["Success"] = $"Draft '{item.Title}' ({item.Version}) resmi dipublikasikan ke sistem & aktif di ikon lonceng.";
            return RedirectToAction(nameof(Index));
        }

        // POST: /DeveloperUpdates/Delete
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            if (!await IsAdminOrDeveloperAsync()) return Forbid();

            var item = await _db.SystemUpdates.FindAsync(id);
            if (item == null)
            {
                TempData["Error"] = "Catatan update tidak ditemukan.";
                return RedirectToAction(nameof(Index));
            }

            _db.SystemUpdates.Remove(item);
            await _db.SaveChangesAsync();
            TempData["Success"] = $"Update '{item.Title}' ({item.Version}) berhasil dihapus.";
            return RedirectToAction(nameof(Index));
        }

        // POST: /DeveloperUpdates/ToggleActive
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ToggleActive(int id)
        {
            if (!await IsAdminOrDeveloperAsync()) return Json(new { success = false, message = "Akses ditolak." });

            var item = await _db.SystemUpdates.FindAsync(id);
            if (item == null) return Json(new { success = false, message = "Update tidak ditemukan." });

            item.IsActive = !item.IsActive;
            item.UpdatedAt = DateTime.Now;
            await _db.SaveChangesAsync();

            return Json(new { success = true, isActive = item.IsActive, message = $"Status update berhasil diubah ke {(item.IsActive ? "Aktif" : "Non-aktif")}." });
        }

        // POST: /DeveloperUpdates/ResendEmail
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResendEmail(int id, string? customRecipients)
        {
            if (!await IsAdminOrDeveloperAsync()) return Forbid();

            var item = await _db.SystemUpdates.FindAsync(id);
            if (item == null)
            {
                TempData["Error"] = "Update tidak ditemukan.";
                return RedirectToAction(nameof(Index));
            }

            string recipients = !string.IsNullOrWhiteSpace(customRecipients) 
                ? customRecipients.Trim() 
                : (!string.IsNullOrWhiteSpace(item.RecipientEmails) ? item.RecipientEmails : await GetSettingAsync("receiver_email", ""));

            if (string.IsNullOrWhiteSpace(recipients))
            {
                TempData["Error"] = "Daftar email penerima tidak boleh kosong.";
                return RedirectToAction(nameof(Index));
            }

            var (success, count, error) = await SendBroadcastEmailAsync(item, recipients);
            if (success)
            {
                item.EmailSentCount += count;
                item.EmailSentAt = DateTime.Now;
                item.SendEmail = true;
                item.RecipientEmails = recipients;
                await _db.SaveChangesAsync();
                TempData["Success"] = $"Email broadcast untuk '{item.Title}' berhasil dikirim ulang ke {count} penerima.";
            }
            else
            {
                TempData["Error"] = $"Gagal mengirim ulang email broadcast: {error}";
            }

            return RedirectToAction(nameof(Index));
        }

        // POST: /DeveloperUpdates/SendTestEmail
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SendTestEmail(string title, string version, string updateType, string description, string? actionRequired, string testEmail)
        {
            if (!await IsAdminOrDeveloperAsync()) return Json(new { success = false, message = "Akses ditolak." });

            if (string.IsNullOrWhiteSpace(testEmail))
            {
                return Json(new { success = false, message = "Email tujuan test tidak boleh kosong." });
            }

            var mockUpdate = new SystemUpdate
            {
                Title = string.IsNullOrWhiteSpace(title) ? "Preview Pembaruan Sistem SMS" : title.Trim(),
                Version = string.IsNullOrWhiteSpace(version) ? "v2.5.0" : version.Trim(),
                UpdateType = string.IsNullOrWhiteSpace(updateType) ? "Improvement" : updateType.Trim(),
                Description = string.IsNullOrWhiteSpace(description) ? "Contoh deskripsi pembaruan dan rincian changelog." : description.Trim(),
                ActionRequired = actionRequired,
                CreatedBy = User.Identity?.Name ?? "Developer",
                CreatedAt = DateTime.Now
            };

            var (success, count, error) = await SendBroadcastEmailAsync(mockUpdate, testEmail.Trim(), isTest: true);
            if (success)
            {
                return Json(new { success = true, message = $"Email preview/test berhasil dikirim ke '{testEmail}'." });
            }
            return Json(new { success = false, message = $"Gagal mengirim email test: {error}" });
        }

        // GET: /DeveloperUpdates/GetLatestNotifications (Accessible by all logged-in users for Notification Bell)
        [HttpGet]
        public async Task<IActionResult> GetLatestNotifications()
        {
            try
            {
                var updates = await _db.SystemUpdates
                    .AsNoTracking()
                    .Where(u => u.IsActive && u.ReleaseStatus == "Published")
                    .OrderByDescending(u => u.ReleaseDate ?? u.CreatedAt)
                    .Take(15)
                    .ToListAsync();

                var list = updates.Select(u => new
                {
                    id = u.Id,
                    title = u.Title,
                    version = u.Version,
                    type = u.UpdateType,
                    status = u.ReleaseStatus,
                    description = u.Description,
                    actionRequired = u.ActionRequired ?? "",
                    createdBy = u.CreatedBy,
                    releaseDate = (u.ReleaseDate ?? u.CreatedAt).ToString("dd MMM yyyy HH:mm"),
                    createdAt = (u.ReleaseDate ?? u.CreatedAt).ToString("dd MMM yyyy HH:mm"),
                    timeAgo = GetRelativeTime(u.ReleaseDate ?? u.CreatedAt),
                    showAlert = u.ShowPopupAlert,
                    isRecent = (DateTime.Now - (u.ReleaseDate ?? u.CreatedAt)).TotalHours < 72
                });

                return Json(new { success = true, data = list });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // SMTP Email Sender Helper
        private async Task<(bool success, int count, string? error)> SendBroadcastEmailAsync(SystemUpdate update, string recipientsString, bool isTest = false)
        {
            try
            {
                string server = await GetSettingAsync("smtp_server", "smtp.office365.com");
                int port = int.TryParse(await GetSettingAsync("smtp_port", "587"), out int p) ? p : 587;
                string senderEmail = await GetSettingAsync("sender_email", "");
                string senderPassword = await GetSettingAsync("sender_password", "");

                if (string.IsNullOrWhiteSpace(server) || string.IsNullOrWhiteSpace(senderEmail))
                {
                    return (false, 0, "Konfigurasi SMTP server atau email pengirim belum diatur di menu Email Settings.");
                }

                var recipientList = recipientsString
                    .Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Where(e => !string.IsNullOrWhiteSpace(e) && e.Contains("@"))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                if (!recipientList.Any())
                {
                    return (false, 0, "Tidak ada alamat email penerima yang valid.");
                }

                string testPrefix = isTest ? "[TEST PREVIEW] " : "";
                string subject = $"{testPrefix}[SMS NOTIFICATION] {update.UpdateType.ToUpper()}: {update.Title} ({update.Version})";
                string htmlBody = BuildMonochromeEmailBody(update, isTest);

                using var client = new SmtpClient(server.Trim(), port)
                {
                    Credentials = new NetworkCredential(senderEmail.Trim(), senderPassword.Trim()),
                    EnableSsl = true,
                    Timeout = 15000
                };

                using var message = new MailMessage
                {
                    From = new MailAddress(senderEmail.Trim(), "SMS Developer & System Alert"),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true,
                    BodyEncoding = Encoding.UTF8
                };

                foreach (var r in recipientList)
                {
                    message.To.Add(r);
                }

                await client.SendMailAsync(message);
                return (true, recipientList.Count, null);
            }
            catch (Exception ex)
            {
                return (false, 0, ex.Message);
            }
        }

        // High-standard professional monochrome email template (White & Black strictly)
        private static string BuildMonochromeEmailBody(SystemUpdate update, bool isTest = false)
        {
            string typeBadgeStyle = update.UpdateType.ToLower() switch
            {
                "bug fix" => "background:#000000; color:#ffffff; border:1px solid #000000;",
                "new feature" => "background:#000000; color:#ffffff; border:1px solid #000000;",
                "system alert" => "background:#ffffff; color:#000000; border:2px solid #000000; font-weight:bold;",
                _ => "background:#ffffff; color:#000000; border:1px solid #000000;"
            };

            // Format multiline description into clean paragraphs / list items
            var lines = (update.Description ?? "").Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            var descHtml = new StringBuilder();
            foreach (var line in lines)
            {
                var clean = line.Trim();
                if (clean.StartsWith("-") || clean.StartsWith("*") || clean.StartsWith("•"))
                {
                    descHtml.Append($"<li style=\"margin-bottom:6px; color:#1e293b; font-size:13.5px; line-height:1.5;\">{System.Net.WebUtility.HtmlEncode(clean.TrimStart('-', '*', '•', ' '))}</li>");
                }
                else
                {
                    descHtml.Append($"<p style=\"margin:0 0 10px 0; color:#1e293b; font-size:13.5px; line-height:1.6;\">{System.Net.WebUtility.HtmlEncode(clean)}</p>");
                }
            }

            string actionRequiredSection = !string.IsNullOrWhiteSpace(update.ActionRequired) ? $@"
                <div style=""margin-top:20px; padding:12px 16px; background:#f8fafc; border-left:4px solid #000000; border-top:1px solid #e2e8f0; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0;"">
                    <div style=""font-size:11px; font-weight:bold; text-transform:uppercase; color:#000000; letter-spacing:0.05em; margin-bottom:4px;"">TINDAKAN YANG DIPERLUKAN (ACTION REQUIRED):</div>
                    <div style=""font-size:13px; color:#0f172a; line-height:1.5;"">{System.Net.WebUtility.HtmlEncode(update.ActionRequired)}</div>
                </div>" : "";

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"" />
    <title>System Update Notification</title>
</head>
<body style=""margin:0; padding:25px 0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#000000;"">
    <table align=""center"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""620"" style=""max-width:620px; background:#ffffff; border:1px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,0.05);"">
        <!-- Top Monochrome Header -->
        <tr>
            <td style=""background:#000000; padding:22px 28px; border-bottom:3px solid #334155;"">
                <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                    <tr>
                        <td>
                            <div style=""color:#ffffff; font-size:15px; font-weight:700; letter-spacing:0.02em; text-transform:uppercase;"">SPAREPART MANAGEMENT SYSTEM</div>
                            <div style=""color:#94a3b8; font-size:11px; margin-top:2px; letter-spacing:0.08em; text-transform:uppercase;"">ENTERPRISE MANAGEMENT SUITE &bull; DEVELOPER NOTICE</div>
                        </td>
                        <td align=""right"">
                            <span style=""font-family:monospace; background:#ffffff; color:#000000; font-size:11px; font-weight:bold; padding:4px 8px; border-radius:2px;"">{System.Net.WebUtility.HtmlEncode(update.Version)}</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- Content Area -->
        <tr>
            <td style=""padding:30px 28px;"">
                {(isTest ? @"<div style=""margin-bottom:18px; padding:8px 12px; background:#f8fafc; border:1px dashed #000000; font-size:11.5px; font-weight:bold; text-align:center;"">[PREVIEW TEST EMAIL DARI DEVELOPER PORTAL]</div>" : "")}

                <!-- Category Badge & Date -->
                <div style=""margin-bottom:12px;"">
                    <span style=""display:inline-block; font-size:10px; text-transform:uppercase; letter-spacing:0.06em; padding:3px 9px; {typeBadgeStyle}"">
                        {System.Net.WebUtility.HtmlEncode(update.UpdateType)}
                    </span>
                    <span style=""font-size:12px; color:#64748b; margin-left:10px;"">
                        {update.CreatedAt:dd MMMM yyyy, HH:mm} WIB
                    </span>
                </div>

                <!-- Update Title -->
                <h2 style=""margin:0 0 16px 0; font-size:20px; font-weight:700; color:#000000; line-height:1.35; letter-spacing:-0.01em;"">
                    {System.Net.WebUtility.HtmlEncode(update.Title)}
                </h2>

                <div style=""border-top:1px solid #e2e8f0; margin-bottom:18px;""></div>

                <!-- Release Notes / Description -->
                <div style=""margin-bottom:20px;"">
                    <div style=""font-size:11px; font-weight:bold; text-transform:uppercase; color:#475569; letter-spacing:0.05em; margin-bottom:8px;"">RINCIAN PERUBAHAN &amp; FITUR:</div>
                    <ul style=""margin:0; padding-left:18px;"">
                        {descHtml}
                    </ul>
                </div>

                {actionRequiredSection}

                <!-- CTA Button -->
                <div style=""margin-top:28px; padding-top:20px; border-top:1px solid #e2e8f0; text-align:center;"">
                    <a href=""http://localhost:5005"" target=""_blank"" style=""display:inline-block; background:#000000; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600; padding:11px 26px; border:1px solid #000000; letter-spacing:0.02em;"">
                        BUKA SISTEM SMS &rarr;
                    </a>
                </div>
            </td>
        </tr>

        <!-- Professional Monochrome Footer -->
        <tr>
            <td style=""background:#f8fafc; padding:18px 28px; border-top:1px solid #cbd5e1; font-size:11px; color:#64748b; line-height:1.6;"">
                <table border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                    <tr>
                        <td>
                            <strong>SMS Yasulor Automation</strong> &bull; Dipublikasikan oleh <em>{System.Net.WebUtility.HtmlEncode(update.CreatedBy)}</em><br />
                            Notifikasi resmi pembaruan fitur &amp; perbaikan sistem aplikasi.
                        </td>
                        <td align=""right"" style=""font-size:10px; color:#94a3b8;"">
                            Enterprise TLS 1.3 Active<br />
                            Confidential &bull; Internal
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
        }

        private static string GetRelativeTime(DateTime date)
        {
            var span = DateTime.Now - date;
            if (span.TotalMinutes < 1) return "Baru saja";
            if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes} menit yang lalu";
            if (span.TotalHours < 24) return $"{(int)span.TotalHours} jam yang lalu";
            if (span.TotalDays < 7) return $"{(int)span.TotalDays} hari yang lalu";
            return date.ToString("dd MMM yyyy");
        }
    }
}

