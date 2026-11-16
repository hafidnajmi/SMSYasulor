using System;
using System.IO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace UPMS.Web.Controllers
{
    [AllowAnonymous]
    public class ImDigitalController : Controller
    {
        private static readonly FileExtensionContentTypeProvider ContentTypeProvider = CreateContentTypeProvider();
        private static string? _resolvedRoot;

        private static FileExtensionContentTypeProvider CreateContentTypeProvider()
        {
            var provider = new FileExtensionContentTypeProvider();
            provider.Mappings[".txt"] = "text/plain; charset=utf-8";
            provider.Mappings[".html"] = "text/html; charset=utf-8";
            provider.Mappings[".js"] = "application/javascript; charset=utf-8";
            provider.Mappings[".mjs"] = "application/javascript; charset=utf-8";
            provider.Mappings[".css"] = "text/css; charset=utf-8";
            provider.Mappings[".json"] = "application/json; charset=utf-8";
            provider.Mappings[".png"] = "image/png";
            provider.Mappings[".jpg"] = "image/jpeg";
            provider.Mappings[".jpeg"] = "image/jpeg";
            provider.Mappings[".webp"] = "image/webp";
            provider.Mappings[".svg"] = "image/svg+xml";
            provider.Mappings[".ico"] = "image/x-icon";
            provider.Mappings[".woff"] = "font/woff";
            provider.Mappings[".woff2"] = "font/woff2";
            return provider;
        }

        public static string? FindImDigitalRoot()
        {
            if (_resolvedRoot != null && Directory.Exists(_resolvedRoot))
            {
                return _resolvedRoot;
            }

            var candidates = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "wwwroot", "im-digital"),
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "im-digital"),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "wwwroot", "im-digital")),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../..", "wwwroot", "im-digital")),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../..", "wwwroot", "im-digital")),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../..", "wwwroot", "im-digital")),
                Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "wwwroot", "im-digital")),
                "/var/www/webroot/ROOT/wwwroot/im-digital",
                "/var/www/webroot/ROOT/bin/Release/net10.0/wwwroot/im-digital",
                "/var/www/webroot/ROOT/bin/Debug/net10.0/wwwroot/im-digital",
                "/app/wwwroot/im-digital"
            };

            foreach (var candidate in candidates)
            {
                if (Directory.Exists(candidate) && System.IO.File.Exists(Path.Combine(candidate, "index.html")))
                {
                    _resolvedRoot = candidate;
                    return candidate;
                }
            }

            // Fallback: check if directory exists even without index.html
            foreach (var candidate in candidates)
            {
                if (Directory.Exists(candidate))
                {
                    _resolvedRoot = candidate;
                    return candidate;
                }
            }

            return null;
        }

        [HttpGet("/im-digital-debug")]
        public IActionResult DebugInfo()
        {
            var candidates = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "wwwroot", "im-digital"),
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "im-digital"),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "wwwroot", "im-digital")),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../..", "wwwroot", "im-digital")),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../..", "wwwroot", "im-digital")),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../..", "wwwroot", "im-digital")),
                "/var/www/webroot/ROOT/wwwroot/im-digital",
                "/var/www/webroot/ROOT/bin/Release/net10.0/wwwroot/im-digital",
                "/var/www/webroot/ROOT/bin/Debug/net10.0/wwwroot/im-digital"
            };

            var list = new System.Collections.Generic.List<object>();
            foreach (var c in candidates)
            {
                list.Add(new
                {
                    path = c,
                    dirExists = Directory.Exists(c),
                    hasIndex = Directory.Exists(c) && System.IO.File.Exists(Path.Combine(c, "index.html"))
                });
            }

            return Json(new
            {
                baseDir = AppContext.BaseDirectory,
                currentDir = Directory.GetCurrentDirectory(),
                resolvedRoot = FindImDigitalRoot(),
                candidates = list
            });
        }

        [HttpGet("/im-digital")]
        [HttpGet("/im-digital/{*subpath}")]
        public IActionResult Serve(string? subpath = null)
        {
            var root = FindImDigitalRoot();
            if (root == null)
            {
                return NotFound("IM Digital files not found on server.");
            }

            subpath = (subpath ?? "").Trim('/');

            // Direct index request
            if (string.IsNullOrEmpty(subpath))
            {
                var mainIndex = Path.Combine(root, "index.html");
                if (System.IO.File.Exists(mainIndex))
                {
                    return PhysicalFile(mainIndex, "text/html; charset=utf-8");
                }
                return NotFound("index.html not found.");
            }

            var safeSubpath = subpath.Replace('/', Path.DirectorySeparatorChar);
            var filePath = Path.Combine(root, safeSubpath);

            // 1. Exact physical file match
            if (System.IO.File.Exists(filePath))
            {
                if (!ContentTypeProvider.TryGetContentType(filePath, out var ct))
                {
                    ct = "application/octet-stream";
                }
                return PhysicalFile(filePath, ct);
            }

            // 2. Directory with index.html
            var dirIndex = Path.Combine(filePath, "index.html");
            if (System.IO.File.Exists(dirIndex))
            {
                if (!Request.Path.Value?.EndsWith("/") == true)
                {
                    return RedirectPermanent($"{Request.Path}/{Request.QueryString}");
                }
                return PhysicalFile(dirIndex, "text/html; charset=utf-8");
            }

            // 3. Static export file with .html appended (e.g. /dashboard -> dashboard.html or dashboard/index.html)
            var htmlVariant = filePath + ".html";
            if (System.IO.File.Exists(htmlVariant))
            {
                return PhysicalFile(htmlVariant, "text/html; charset=utf-8");
            }

            // 4. SPA fallback for frontend routes (e.g., /im-digital/dashboard/divisions/FILLING)
            // If the route doesn't have an extension like .js, .css, .png, fallback to index.html
            var extension = Path.GetExtension(subpath);
            if (string.IsNullOrEmpty(extension))
            {
                var mainIndex = Path.Combine(root, "index.html");
                if (System.IO.File.Exists(mainIndex))
                {
                    return PhysicalFile(mainIndex, "text/html; charset=utf-8");
                }
            }

            return NotFound();
        }
    }
}
