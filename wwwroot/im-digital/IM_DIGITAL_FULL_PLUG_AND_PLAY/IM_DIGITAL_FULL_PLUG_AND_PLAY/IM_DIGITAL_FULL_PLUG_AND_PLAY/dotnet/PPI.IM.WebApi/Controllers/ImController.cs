using Microsoft.AspNetCore.Mvc;
using PPI.IM.Domain.Entities;
using PPI.IM.Infrastructure.Repositories;
using PPI.IM.Infrastructure.Data;
using System.Text.Json;
using Dapper;

namespace PPI.IM.WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImController : ControllerBase
    {
        private readonly ImRepository _imRepository;
        private readonly UserRepository _userRepository;
        private readonly DbConnectionFactory _dbFactory;

        private class SpecMasterHistoryDto
        {
            public int Id { get; set; }
            public string SpecCode { get; set; } = string.Empty;
            public string? FgCodes { get; set; }
            public string? A6DataJson { get; set; }
            public string? A7DataJson { get; set; }
            public string? CreatedBy { get; set; }
            public DateTime UpdatedAt { get; set; }
        }

        public ImController(ImRepository imRepository, UserRepository userRepository, DbConnectionFactory dbFactory)
        {
            _imRepository = imRepository;
            _userRepository = userRepository;
            _dbFactory = dbFactory;
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveDocuments()
        {
            try
            {
                var documents = await _imRepository.GetAllActiveDocumentsAsync();
                return Ok(documents);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        [HttpGet("pending-counts")]
        public async Task<IActionResult> GetPendingCounts()
        {
            try
            {
                var counts = await _imRepository.GetDivisionPendingCountsAsync();
                return Ok(counts);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        [HttpGet("division/{divisionName}")]
        public async Task<IActionResult> GetDivisionDocuments(string divisionName)
        {
            try
            {
                var docs = await _imRepository.GetAllActiveDocumentsAsync();
                var launchedDocs = docs.Where(d => d.Status.Equals("Launched", StringComparison.OrdinalIgnoreCase)).ToList();

                var allDivisionData = await _imRepository.GetAllDivisionDataAsync(launchedDocs.Select(d => d.Id));

                var results = new List<PPI.IM.WebApi.Models.DivisionDisplayItemDto>();

                foreach (var doc in launchedDocs)
                {
                    var allDocDivs = allDivisionData.Where(x => x.ImId == doc.Id).ToList();

                    bool hasUp = allDocDivs.Any(x => x.Division.Equals("UP", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsUpFilled(doc.Id, x.DataJson));
                    bool hasPole = allDocDivs.Any(x => x.Division.Equals("POLE", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsPoleFilled(doc.Id, x.DataJson));
                    bool hasUpSpv = allDocDivs.Any(x => x.Division.Equals("UP FILLING SPV", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsSigned(doc.Id, "UP FILLING SPV", x.DataJson));
                    bool hasUpMgr = allDocDivs.Any(x => x.Division.Equals("UP FILLING MANAGER", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsSigned(doc.Id, "UP FILLING MANAGER", x.DataJson));
                    bool hasPkgPole = allDocDivs.Any(x => x.Division.Equals("PACKAGING & POLE", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsSigned(doc.Id, "PACKAGING & POLE", x.DataJson));
                    bool hasHeadLab = allDocDivs.Any(x => x.Division.Equals("HEAD LAB", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsSigned(doc.Id, "HEAD LAB", x.DataJson));
                    bool hasMscAdm = allDocDivs.Any(x => x.Division.Equals("MSC ADM", StringComparison.OrdinalIgnoreCase) && ((x.ImageData != null && x.ImageData.Length > 0) || ImRepository.CheckIsMscFilled(doc.Id, x.DataJson)))
                                  || allDocDivs.Any(x => x.Division.Equals("A.3. Appearance Packing (MSC)", StringComparison.OrdinalIgnoreCase) && ((x.ImageData != null && x.ImageData.Length > 0) || ImRepository.CheckIsMscFilled(doc.Id, x.DataJson)));
                    bool hasIq = allDocDivs.Any(x => x.Division.Equals("IQ", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsIqFilled(doc.Id, x.DataJson));

                    if (divisionName.Equals("DATA IM", StringComparison.OrdinalIgnoreCase) || divisionName.Equals("LIHAT IM", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!hasHeadLab) continue;
                    }
                    else
                    {
                        if (hasHeadLab) continue;
                    }

                    bool isVisible = true;
                    if (divisionName.Equals("UP FILLING SPV", StringComparison.OrdinalIgnoreCase)) isVisible = hasUp;
                    else if (divisionName.Equals("UP FILLING MANAGER", StringComparison.OrdinalIgnoreCase)) isVisible = hasUpSpv;
                    else if (divisionName.Equals("PACKAGING & POLE", StringComparison.OrdinalIgnoreCase)) isVisible = hasPole;
                    else if (divisionName.Equals("HEAD LAB", StringComparison.OrdinalIgnoreCase)) isVisible = hasUp && hasPole && hasMscAdm && hasIq && hasUpSpv && hasUpMgr && hasPkgPole;

                    if (!isVisible && !divisionName.Equals("DATA IM", StringComparison.OrdinalIgnoreCase) && !divisionName.Equals("LIHAT IM", StringComparison.OrdinalIgnoreCase)) continue;

                    var divData = allDocDivs.FirstOrDefault(x => x.Division.Equals(divisionName, StringComparison.OrdinalIgnoreCase));
                    bool isFilled = divData != null && !string.IsNullOrWhiteSpace(divData.DataJson);

                    if (divisionName.Equals("DATA IM", StringComparison.OrdinalIgnoreCase) || divisionName.Equals("LIHAT IM", StringComparison.OrdinalIgnoreCase))
                    {
                        isFilled = true;
                    }
                    else if (divisionName.Equals("UP", StringComparison.OrdinalIgnoreCase))
                    {
                        isFilled = ImRepository.CheckIsUpFilled(doc.Id, divData?.DataJson);
                    }
                    else if (divisionName.Equals("POLE", StringComparison.OrdinalIgnoreCase))
                    {
                        isFilled = ImRepository.CheckIsPoleFilled(doc.Id, divData?.DataJson);
                    }
                    else if (divisionName.Equals("MSC ADM", StringComparison.OrdinalIgnoreCase))
                    {
                        isFilled = ImRepository.CheckIsMscFilled(doc.Id, divData?.DataJson);
                    }
                    else if (divisionName.Equals("IQ", StringComparison.OrdinalIgnoreCase))
                    {
                        isFilled = ImRepository.CheckIsIqFilled(doc.Id, divData?.DataJson);
                    }
                    else if (divisionName.Equals("UP FILLING SPV", StringComparison.OrdinalIgnoreCase) ||
                             divisionName.Equals("UP FILLING MANAGER", StringComparison.OrdinalIgnoreCase) ||
                             divisionName.Equals("PACKAGING & POLE", StringComparison.OrdinalIgnoreCase) ||
                             divisionName.Equals("HEAD LAB", StringComparison.OrdinalIgnoreCase))
                    {
                        isFilled = ImRepository.CheckIsSigned(doc.Id, divisionName, divData?.DataJson);
                    }

                    string divKey = divisionName.ToLower() switch
                    {
                        "up" => "up",
                        "pole" => "pole",
                        "msc adm" => "msc_adm",
                        "iq" => "iq",
                        "launch co" => "launch_co",
                        "up filling spv" => "up_filling_spv",
                        "up filling manager" => "up_filling_manager",
                        "packaging & pole" => "packaging_pole",
                        "head lab" => "qa_lab",
                        _ => divisionName.ToLower().Replace(" ", "_")
                    };

                    string divComment = "";
                    var sigDivDoc = allDocDivs.FirstOrDefault(x => x.Division.Equals("Signatures", StringComparison.OrdinalIgnoreCase));
                    if (sigDivDoc != null && !string.IsNullOrWhiteSpace(sigDivDoc.DataJson))
                    {
                        try
                        {
                            using var sDoc = JsonDocument.Parse(sigDivDoc.DataJson);
                            if (sDoc.RootElement.TryGetProperty("comments", out var cElem) && cElem.ValueKind == JsonValueKind.Object)
                            {
                                if (cElem.TryGetProperty(divKey, out var cv))
                                    divComment = cv.GetString() ?? "";
                            }
                        }
                        catch { }
                    }
                    if (string.IsNullOrWhiteSpace(divComment) && divData != null && !string.IsNullOrWhiteSpace(divData.DataJson))
                    {
                        try
                        {
                            using var d = JsonDocument.Parse(divData.DataJson);
                            if (d.RootElement.TryGetProperty("comment", out var cp))
                                divComment = cp.GetString() ?? "";
                            else if (d.RootElement.TryGetProperty("Comment", out var cCap))
                                divComment = cCap.GetString() ?? "";
                        }
                        catch { }
                    }

                    results.Add(new PPI.IM.WebApi.Models.DivisionDisplayItemDto
                    {
                        Id = doc.Id,
                        ProductName = doc.Description ?? doc.ImCode,
                        FgCode = doc.ImCode,
                        SfCode = string.IsNullOrWhiteSpace(doc.KodeSf) ? "–" : doc.KodeSf,
                        FlaNo = doc.NoFla ?? "",
                        IssueDate = doc.TglIssue ?? "",
                        IsFilled = isFilled,
                        Comment = divComment,
                        RawDocument = doc
                    });
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateDocument([FromBody] ImDocument doc, [FromHeader(Name = "X-Username")] string? headerUsername = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(doc.CreatedBy))
                {
                    doc.CreatedBy = !string.IsNullOrWhiteSpace(headerUsername) ? headerUsername : "admin";
                }
                if (string.IsNullOrWhiteSpace(doc.Status))
                {
                    doc.Status = "Draft"; // Start as draft if not specified
                }
                int newId = await _imRepository.CreateDocumentAsync(doc);
                return Ok(new { Message = "Document created successfully", Id = newId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDocument(int id, [FromBody] ImDocument doc, [FromHeader(Name = "X-Username")] string? headerUsername = null)
        {
            try
            {
                doc.Id = id;
                if (string.IsNullOrWhiteSpace(doc.CreatedBy) && !string.IsNullOrWhiteSpace(headerUsername))
                {
                    doc.CreatedBy = headerUsername;
                }
                bool success = await _imRepository.UpdateDocumentHeaderAsync(doc);
                if (success) return Ok(new { Message = "Document updated successfully" });
                return BadRequest("Failed to update document.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(
            int id,
            [FromQuery] string? username = null,
            [FromHeader(Name = "X-Username")] string? headerUsername = null,
            [FromHeader(Name = "X-User-Role")] string? headerRole = null)
        {
            try
            {
                // Verifikasi hak akses admin
                string? effectiveUsername = !string.IsNullOrWhiteSpace(username) ? username : headerUsername;
                bool isAdmin = false;

                if (!string.IsNullOrWhiteSpace(effectiveUsername))
                {
                    var user = await _userRepository.GetByUsernameAsync(effectiveUsername.Trim());
                    if (user != null && string.Equals(user.Role, "ADMIN", StringComparison.OrdinalIgnoreCase))
                    {
                        isAdmin = true;
                    }
                }

                // Fallback check role dari header jika username teridentifikasi admin
                if (!isAdmin && string.Equals(headerRole, "ADMIN", StringComparison.OrdinalIgnoreCase))
                {
                    isAdmin = true;
                }

                if (!isAdmin)
                {
                    return StatusCode(403, new { Message = "Akses ditolak: Hanya pengguna dengan role ADMIN yang berhak menghapus Instruksi Mutu (IM)." });
                }

                bool success = await _imRepository.SoftDeleteDocumentAsync(id);
                if (success) return Ok(new { Message = "Dokumen IM berhasil dihapus" });
                return BadRequest(new { Message = "Gagal menghapus dokumen IM" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        [HttpGet("filling-history")]
        public async Task<IActionResult> GetFillingHistory()
        {
            try
            {
                var allDocs = await _imRepository.GetAllActiveDocumentsAsync();
                var launchedDocs = allDocs.Where(d => d.Status != null && !d.Status.Equals("Draft", StringComparison.OrdinalIgnoreCase)).ToList();

                var allDivisionData = await _imRepository.GetAllDivisionDataAsync(launchedDocs.Select(d => d.Id));
                var allUsers = (await _userRepository.GetAllUsersAsync()).ToList();
                var userById = allUsers.Where(u => u.Id > 0).ToDictionary(u => u.Id, u => u);
                var userByUsername = allUsers
                    .Where(u => !string.IsNullOrWhiteSpace(u.Username))
                    .GroupBy(u => u.Username.Trim().ToLowerInvariant())
                    .ToDictionary(g => g.Key, g => g.First());
                var userByFullName = allUsers
                    .Where(u => !string.IsNullOrWhiteSpace(u.FullName))
                    .GroupBy(u => u.FullName.Trim().ToLowerInvariant())
                    .ToDictionary(g => g.Key, g => g.First());

                string ResolveUserName(string? rawName, int? userId)
                {
                    if (!string.IsNullOrWhiteSpace(rawName))
                    {
                        string trimmed = rawName.Trim();
                        if (trimmed.StartsWith("(") && trimmed.EndsWith(")"))
                            trimmed = trimmed.Substring(1, trimmed.Length - 2).Trim();

                        if (!string.IsNullOrWhiteSpace(trimmed) && trimmed != "-")
                        {
                            if (userByUsername.TryGetValue(trimmed.ToLowerInvariant(), out var uByU))
                            {
                                return !string.IsNullOrWhiteSpace(uByU.FullName) ? uByU.FullName : uByU.Username;
                            }

                            if (userByFullName.TryGetValue(trimmed.ToLowerInvariant(), out var uByF))
                            {
                                return !string.IsNullOrWhiteSpace(uByF.FullName) ? uByF.FullName : uByF.Username;
                            }

                            return trimmed;
                        }
                    }

                    if (userId.HasValue && userById.TryGetValue(userId.Value, out var uById))
                    {
                        if (!string.IsNullOrWhiteSpace(uById.FullName))
                            return uById.FullName;
                        if (!string.IsNullOrWhiteSpace(uById.Username))
                            return uById.Username;
                    }

                    return "-";
                }

                var allSpecMasters = new List<SpecMasterHistoryDto>();
                try
                {
                    using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
                    const string specSql = @"
                        SELECT id, spec_code AS SpecCode, fg_codes AS FgCodes, 
                               a6_data_json AS A6DataJson, a7_data_json AS A7DataJson, 
                               created_by AS CreatedBy, updated_at AS UpdatedAt
                        FROM ppi_spec_code_masters;";
                    allSpecMasters = (await conn.QueryAsync<SpecMasterHistoryDto>(specSql)).ToList();
                }
                catch { }

                var results = new List<object>();

                foreach (var doc in launchedDocs)
                {
                    var allDocDivs = allDivisionData.Where(x => x.ImId == doc.Id).ToList();

                    var cleanFg = (doc.ImCode ?? "").Trim().ToUpper();
                    var matchedSpec = allSpecMasters.FirstOrDefault(s =>
                    {
                        if (string.IsNullOrWhiteSpace(s.FgCodes)) return false;
                        var tokens = s.FgCodes.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                                              .Select(t => t.Trim().ToUpper());
                        return tokens.Contains(cleanFg);
                    });

                    // 9 divisions in order
                    bool hasUp       = allDocDivs.Any(x => x.Division.Equals("UP", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsUpFilled(doc.Id, x.DataJson));
                    bool hasPole     = allDocDivs.Any(x => x.Division.Equals("POLE", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsPoleFilled(doc.Id, x.DataJson)) ||
                                       (allDocDivs.Any(x => x.Division.StartsWith("A.1", StringComparison.OrdinalIgnoreCase) && ((x.ImageData != null && x.ImageData.Length > 0) || !string.IsNullOrWhiteSpace(x.DataJson))) &&
                                        allDocDivs.Any(x => x.Division.StartsWith("A.2", StringComparison.OrdinalIgnoreCase) && ((x.ImageData != null && x.ImageData.Length > 0) || !string.IsNullOrWhiteSpace(x.DataJson))));
                    bool hasMscAdm   = allDocDivs.Any(x => (x.Division.Equals("MSC ADM", StringComparison.OrdinalIgnoreCase) || x.Division.Equals("A.3. Appearance Packing (MSC)", StringComparison.OrdinalIgnoreCase)) && ((x.ImageData != null && x.ImageData.Length > 0) || ImRepository.CheckIsMscFilled(doc.Id, x.DataJson)));
                    bool hasIq       = allDocDivs.Any(x => x.Division.Equals("IQ", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsIqFilled(doc.Id, x.DataJson));
                    bool hasUpSpv    = allDocDivs.Any(x => x.Division.Equals("UP FILLING SPV", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsSigned(doc.Id, "UP FILLING SPV", x.DataJson));
                    bool hasUpMgr    = allDocDivs.Any(x => x.Division.Equals("UP FILLING MANAGER", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsSigned(doc.Id, "UP FILLING MANAGER", x.DataJson));
                    bool hasPkgPole  = allDocDivs.Any(x => x.Division.Equals("PACKAGING & POLE", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsSigned(doc.Id, "PACKAGING & POLE", x.DataJson));
                    bool hasHeadLab  = allDocDivs.Any(x => x.Division.Equals("HEAD LAB", StringComparison.OrdinalIgnoreCase) && ImRepository.CheckIsSigned(doc.Id, "HEAD LAB", x.DataJson));

                    // Extract signatures info (comments and timestamps)
                    var sigDiv = allDocDivs.FirstOrDefault(x => x.Division.Equals("Signatures", StringComparison.OrdinalIgnoreCase));
                    var sigComments = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    var sigTimestamps = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    var sigNames = new List<string>();

                    if (sigDiv != null && !string.IsNullOrWhiteSpace(sigDiv.DataJson))
                    {
                        try
                        {
                            using var sDoc = JsonDocument.Parse(sigDiv.DataJson);
                            if (sDoc.RootElement.TryGetProperty("comments", out var cElem) && cElem.ValueKind == JsonValueKind.Object)
                            {
                                foreach (var prop in cElem.EnumerateObject())
                                {
                                    sigComments[prop.Name] = prop.Value.GetString() ?? "";
                                }
                            }
                            if (sDoc.RootElement.TryGetProperty("timestamps", out var tElem) && tElem.ValueKind == JsonValueKind.Object)
                            {
                                foreach (var prop in tElem.EnumerateObject())
                                {
                                    sigTimestamps[prop.Name] = prop.Value.GetString() ?? "";
                                }
                            }
                            if (sDoc.RootElement.TryGetProperty("names", out var nElem) && nElem.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var n in nElem.EnumerateArray())
                                {
                                    sigNames.Add(n.GetString() ?? "");
                                }
                            }
                        }
                        catch { }
                    }

                    string GetComment(string key, params string[] divNames)
                    {
                        if (sigComments.TryGetValue(key, out var sc) && !string.IsNullOrWhiteSpace(sc))
                            return sc;
                        foreach (var dn in divNames)
                        {
                            var target = allDocDivs.FirstOrDefault(x => x.Division.Equals(dn, StringComparison.OrdinalIgnoreCase));
                            if (target != null && !string.IsNullOrWhiteSpace(target.DataJson))
                            {
                                try
                                {
                                    using var d = JsonDocument.Parse(target.DataJson);
                                    if (d.RootElement.TryGetProperty("comment", out var cp) && !string.IsNullOrWhiteSpace(cp.GetString()))
                                        return cp.GetString()!;
                                    if (d.RootElement.TryGetProperty("Comment", out var cCap) && !string.IsNullOrWhiteSpace(cCap.GetString()))
                                        return cCap.GetString()!;
                                    if (d.RootElement.TryGetProperty("comments", out var cps) && cps.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(cps.GetString()))
                                        return cps.GetString()!;
                                }
                                catch { }
                            }
                        }
                        return "-";
                    }

                    string GetTimestamp(bool isFilled, string sigKey, params string[] divNames)
                    {
                        if (!isFilled) return "-";
                        if (!string.IsNullOrEmpty(sigKey) && sigTimestamps.TryGetValue(sigKey, out var st) && !string.IsNullOrWhiteSpace(st))
                            return st;

                        DateTime? maxTime = null;
                        foreach (var dn in divNames)
                        {
                            var matches = allDocDivs.Where(x => x.Division.StartsWith(dn, StringComparison.OrdinalIgnoreCase) || x.Division.Equals(dn, StringComparison.OrdinalIgnoreCase));
                            foreach (var m in matches)
                            {
                                if (maxTime == null || m.SubmittedAt > maxTime.Value)
                                    maxTime = m.SubmittedAt;
                            }
                        }
                        return maxTime.HasValue ? maxTime.Value.ToString("yyyy-MM-dd HH:mm:ss") : "-";
                    }

                    string GetSubmitterOrSigner(bool isFilled, string sigKey, params string[] divNames)
                    {
                        if (!isFilled) return "-";

                        // 1. LAUNCH CO
                        if (sigKey.Equals("launch_co", StringComparison.OrdinalIgnoreCase))
                        {
                            if (!string.IsNullOrWhiteSpace(doc.CreatedBy))
                            {
                                return ResolveUserName(doc.CreatedBy, null);
                            }
                            return "-";
                        }

                        // 2. Check individual division records in allDocDivs
                        foreach (var dn in divNames)
                        {
                            var matches = allDocDivs.Where(x => x.Division.Equals(dn, StringComparison.OrdinalIgnoreCase) || x.Division.StartsWith(dn, StringComparison.OrdinalIgnoreCase)).ToList();
                            foreach (var target in matches)
                            {
                                if (!string.IsNullOrWhiteSpace(target.DataJson))
                                {
                                    try
                                    {
                                        using var d = JsonDocument.Parse(target.DataJson);
                                        var root = d.RootElement;

                                        if (root.TryGetProperty("signerName", out var sn) && !string.IsNullOrWhiteSpace(sn.GetString()))
                                            return ResolveUserName(sn.GetString(), target.SubmittedBy);

                                        if (root.TryGetProperty("signedFullName", out var sfn) && !string.IsNullOrWhiteSpace(sfn.GetString()))
                                            return ResolveUserName(sfn.GetString(), target.SubmittedBy);

                                        if (root.TryGetProperty("filledByName", out var fbn) && !string.IsNullOrWhiteSpace(fbn.GetString()))
                                            return ResolveUserName(fbn.GetString(), target.SubmittedBy);

                                        if (root.TryGetProperty("signedBy", out var sb) && !string.IsNullOrWhiteSpace(sb.GetString()))
                                            return ResolveUserName(sb.GetString(), target.SubmittedBy);

                                        if (root.TryGetProperty("filledBy", out var fb) && !string.IsNullOrWhiteSpace(fb.GetString()))
                                            return ResolveUserName(fb.GetString(), target.SubmittedBy);
                                    }
                                    catch { }
                                }

                                if (target.SubmittedBy.HasValue)
                                {
                                    var resolved = ResolveUserName(null, target.SubmittedBy);
                                    if (resolved != "-") return resolved;
                                }
                            }
                        }

                        // 3. For signatures, check legacy sigNames array from "Signatures" division
                        int sigIndex = sigKey.ToLowerInvariant() switch
                        {
                            "up_filling_spv" => 0,
                            "up_filling_manager" => 1,
                            "packaging_pole" => 2,
                            "qa_lab" => 3,
                            _ => -1
                        };
                        if (sigIndex >= 0 && sigIndex < sigNames.Count && !string.IsNullOrWhiteSpace(sigNames[sigIndex]))
                        {
                            var resolved = ResolveUserName(sigNames[sigIndex], null);
                            if (resolved != "-") return resolved;
                        }

                        // 4. Any matching submitted_by
                        foreach (var dn in divNames)
                        {
                            var matches = allDocDivs.Where(x => x.Division.StartsWith(dn, StringComparison.OrdinalIgnoreCase) || x.Division.Equals(dn, StringComparison.OrdinalIgnoreCase));
                            foreach (var m in matches)
                            {
                                if (m.SubmittedBy.HasValue)
                                {
                                    var resolved = ResolveUserName(null, m.SubmittedBy);
                                    if (resolved != "-") return resolved;
                                }
                            }
                        }

                        // 5. Intelligent Fallback: if isFilled is true but no submitter was specifically recorded:
                        // Use document creator (e.g. System Administrator)
                        if (isFilled && !string.IsNullOrWhiteSpace(doc.CreatedBy))
                        {
                            var resolvedCreator = ResolveUserName(doc.CreatedBy, null);
                            if (resolvedCreator != "-") return resolvedCreator;
                        }

                        return "-";
                    }

                    // Sub-divisions for POLE
                    var poleDefs = new[]
                    {
                        new { Code = "A.1", Name = "A.1. Appearance Filling", Match = "A.1" },
                        new { Code = "A.2", Name = "A.2. Appearance Assembly", Match = "A.2" },
                        new { Code = "A.3", Name = "A.3. Appearance Packing (POLE)", Match = "A.3. Appearance Packing (POLE)" },
                        new { Code = "A.6", Name = "A.6. Paletisasi", Match = "A.6" },
                        new { Code = "A.7", Name = "A.7. VACCUM / JACOMEX", Match = "A.7" }
                    };

                    var poleSubDivs = new List<object>();
                    foreach (var sec in poleDefs)
                    {
                        var secMatch = allDocDivs.FirstOrDefault(x =>
                            x.Division.Equals(sec.Name, StringComparison.OrdinalIgnoreCase) ||
                            x.Division.StartsWith(sec.Match, StringComparison.OrdinalIgnoreCase) ||
                            (sec.Code == "A.7" && x.Division.Contains("VACCUM", StringComparison.OrdinalIgnoreCase))
                        );

                        bool isSecFilled = false;
                        string secFilledBy = "-";
                        string secSubTime = "-";

                        // 1. A.6 and A.7 are Master Spec Code items defined by Spec Code creator (e.g. daniel)
                        if ((sec.Code == "A.6" || sec.Code == "A.7") && matchedSpec != null)
                        {
                            if (sec.Code == "A.6" && !string.IsNullOrWhiteSpace(matchedSpec.A6DataJson))
                            {
                                try
                                {
                                    using var a6Doc = JsonDocument.Parse(matchedSpec.A6DataJson);
                                    var root = a6Doc.RootElement;
                                    bool hasOuter = root.TryGetProperty("outerBox", out var ob) && !string.IsNullOrWhiteSpace(ob.GetString());
                                    bool hasLayers = root.TryGetProperty("layers", out var ly) && !string.IsNullOrWhiteSpace(ly.GetString());
                                    bool hasFg = root.TryGetProperty("fg", out var fg) && !string.IsNullOrWhiteSpace(fg.GetString());
                                    bool hasImg = root.TryGetProperty("imageDataUrl", out var idu) && !string.IsNullOrWhiteSpace(idu.GetString());
                                    if (hasOuter || hasLayers || hasFg || hasImg || matchedSpec.A6DataJson.Length > 20)
                                    {
                                        isSecFilled = true;
                                        secSubTime = matchedSpec.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss");
                                        secFilledBy = ResolveUserName(matchedSpec.CreatedBy, null);
                                    }
                                }
                                catch { }
                            }
                            else if (sec.Code == "A.7" && !string.IsNullOrWhiteSpace(matchedSpec.A7DataJson))
                            {
                                try
                                {
                                    using var a7Doc = JsonDocument.Parse(matchedSpec.A7DataJson);
                                    var root = a7Doc.RootElement;
                                    bool hasData = (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0) ||
                                                   (root.TryGetProperty("data", out var dArr) && dArr.ValueKind == JsonValueKind.Array && dArr.GetArrayLength() > 0) ||
                                                   matchedSpec.A7DataJson.Length > 20;
                                    if (hasData)
                                    {
                                        isSecFilled = true;
                                        secSubTime = matchedSpec.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss");
                                        secFilledBy = ResolveUserName(matchedSpec.CreatedBy, null);
                                    }
                                }
                                catch { }
                            }
                        }

                        // 2. Otherwise check specific division record in allDocDivs
                        if (!isSecFilled && secMatch != null)
                        {
                            isSecFilled = (secMatch.ImageData != null && secMatch.ImageData.Length > 0) ||
                                          (!string.IsNullOrWhiteSpace(secMatch.DataJson) && secMatch.DataJson != "{}" && secMatch.DataJson != "[]");

                            if (isSecFilled)
                            {
                                secSubTime = secMatch.SubmittedAt.ToString("yyyy-MM-dd HH:mm:ss");
                                secFilledBy = GetSubmitterOrSigner(true, "", secMatch.Division);
                            }
                        }

                        // 3. Fallback to main POLE division payload
                        if (!isSecFilled)
                        {
                            var mainPole = allDocDivs.FirstOrDefault(x => x.Division.Equals("POLE", StringComparison.OrdinalIgnoreCase));
                            if (mainPole != null && !string.IsNullOrWhiteSpace(mainPole.DataJson))
                            {
                                try
                                {
                                    using var pdDoc = JsonDocument.Parse(mainPole.DataJson);
                                    if (pdDoc.RootElement.TryGetProperty("poleData", out var pData) && pData.TryGetProperty(sec.Code, out var sObj))
                                    {
                                        if (sObj.TryGetProperty("imageDataUrl", out var idu) && !string.IsNullOrWhiteSpace(idu.GetString()))
                                        {
                                            isSecFilled = true;
                                            secSubTime = mainPole.SubmittedAt.ToString("yyyy-MM-dd HH:mm:ss");
                                            secFilledBy = GetSubmitterOrSigner(true, "", "POLE");
                                        }
                                    }
                                }
                                catch { }
                            }
                        }

                        poleSubDivs.Add(new
                        {
                            Code = sec.Code,
                            Division = sec.Name,
                            IsFilled = isSecFilled,
                            Status = isSecFilled ? "Filled" : "Not Filled",
                            FilledBy = secFilledBy,
                            SubmissionTime = secSubTime,
                            Comments = "-"
                        });
                    }

                    var distinctPoleFillers = poleSubDivs
                        .Where(s => (bool)s.GetType().GetProperty("IsFilled")?.GetValue(s)!)
                        .Select(s => s.GetType().GetProperty("FilledBy")?.GetValue(s)?.ToString())
                        .Where(p => !string.IsNullOrWhiteSpace(p) && p != "-")
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();

                    string poleSubmitter = "-";
                    if (distinctPoleFillers.Count > 0)
                    {
                        poleSubmitter = string.Join(", ", distinctPoleFillers);
                    }
                    else
                    {
                        poleSubmitter = GetSubmitterOrSigner(hasPole, "pole", "POLE", "A.1", "A.2", "A.3. Appearance Packing (POLE)", "A.6");
                    }

                    var poleTimes = poleSubDivs
                        .Where(s => (bool)s.GetType().GetProperty("IsFilled")?.GetValue(s)!)
                        .Select(s => s.GetType().GetProperty("SubmissionTime")?.GetValue(s)?.ToString())
                        .Where(t => !string.IsNullOrWhiteSpace(t) && t != "-")
                        .ToList();
                    string poleTime = poleTimes.OrderByDescending(t => t).FirstOrDefault() ?? GetTimestamp(hasPole, "pole", "POLE", "A.1", "A.2", "A.3. Appearance Packing (POLE)", "A.6");

                    // Step 1 = Launched (always true for launched docs)
                    var stepsCompleted = new[]
                    {
                        true,       // 1. Launched
                        hasUp,      // 2. UP
                        hasPole,    // 3. POLE
                        hasMscAdm,  // 4. MSC ADM
                        hasIq,      // 5. IQ
                        hasUpSpv,   // 6. UP FILLING SPV
                        hasUpMgr,   // 7. UP FILLING MANAGER
                        hasPkgPole, // 8. PACKAGING & POLE
                        hasHeadLab  // 9. HEAD LAB
                    };

                    int filledCount = stepsCompleted.Count(s => s);

                    var timeline = new List<object>
                    {
                        new {
                            Division = "LAUNCH CO",
                            IsFilled = true,
                            Status = "Filled",
                            FilledBy = GetSubmitterOrSigner(true, "launch_co", "LAUNCH CO"),
                            SubmissionTime = doc.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                            Comments = GetComment("launch_co", "LAUNCH CO")
                        },
                        new {
                            Division = "UP",
                            IsFilled = hasUp,
                            Status = hasUp ? "Filled" : "Not Filled",
                            FilledBy = GetSubmitterOrSigner(hasUp, "up", "UP"),
                            SubmissionTime = GetTimestamp(hasUp, "up", "UP"),
                            Comments = GetComment("up", "UP")
                        },
                        new {
                            Division = "POLE",
                            IsFilled = hasPole,
                            Status = hasPole ? "Filled" : "Not Filled",
                            FilledBy = poleSubmitter,
                            SubmissionTime = poleTime,
                            Comments = GetComment("pole", "POLE", "A.3. Appearance Packing (POLE)"),
                            SubDivisions = poleSubDivs
                        },
                        new {
                            Division = "MSC ADM",
                            IsFilled = hasMscAdm,
                            Status = hasMscAdm ? "Filled" : "Not Filled",
                            FilledBy = GetSubmitterOrSigner(hasMscAdm, "msc_adm", "MSC ADM", "A.3. Appearance Packing (MSC)"),
                            SubmissionTime = GetTimestamp(hasMscAdm, "msc_adm", "MSC ADM", "A.3. Appearance Packing (MSC)"),
                            Comments = GetComment("msc_adm", "MSC ADM", "A.3. Appearance Packing (MSC)")
                        },
                        new {
                            Division = "IQ",
                            IsFilled = hasIq,
                            Status = hasIq ? "Filled" : "Not Filled",
                            FilledBy = GetSubmitterOrSigner(hasIq, "iq", "IQ", "A.7", "Batch Format", "Surveillance"),
                            SubmissionTime = GetTimestamp(hasIq, "iq", "IQ", "A.7", "Batch Format", "Surveillance"),
                            Comments = GetComment("iq", "IQ")
                        },
                        new {
                            Division = "UP FILLING SPV",
                            IsFilled = hasUpSpv,
                            Status = hasUpSpv ? "Filled" : "Not Filled",
                            FilledBy = GetSubmitterOrSigner(hasUpSpv, "up_filling_spv", "UP FILLING SPV"),
                            SubmissionTime = GetTimestamp(hasUpSpv, "up_filling_spv", "UP FILLING SPV"),
                            Comments = GetComment("up_filling_spv", "UP FILLING SPV")
                        },
                        new {
                            Division = "UP FILLING MANAGER",
                            IsFilled = hasUpMgr,
                            Status = hasUpMgr ? "Filled" : "Not Filled",
                            FilledBy = GetSubmitterOrSigner(hasUpMgr, "up_filling_manager", "UP FILLING MANAGER"),
                            SubmissionTime = GetTimestamp(hasUpMgr, "up_filling_manager", "UP FILLING MANAGER"),
                            Comments = GetComment("up_filling_manager", "UP FILLING MANAGER")
                        },
                        new {
                            Division = "PACKAGING & POLE",
                            IsFilled = hasPkgPole,
                            Status = hasPkgPole ? "Filled" : "Not Filled",
                            FilledBy = GetSubmitterOrSigner(hasPkgPole, "packaging_pole", "PACKAGING & POLE"),
                            SubmissionTime = GetTimestamp(hasPkgPole, "packaging_pole", "PACKAGING & POLE"),
                            Comments = GetComment("packaging_pole", "PACKAGING & POLE")
                        },
                        new {
                            Division = "HEAD LAB",
                            IsFilled = hasHeadLab,
                            Status = hasHeadLab ? "Filled" : "Not Filled",
                            FilledBy = GetSubmitterOrSigner(hasHeadLab, "qa_lab", "HEAD LAB"),
                            SubmissionTime = GetTimestamp(hasHeadLab, "qa_lab", "HEAD LAB"),
                            Comments = GetComment("qa_lab", "HEAD LAB")
                        }
                    };

                    results.Add(new
                    {
                        Id           = doc.Id,
                        ProductName  = doc.Description ?? doc.ImCode,
                        FgCode       = doc.ImCode,
                        SfCode       = string.IsNullOrWhiteSpace(doc.KodeSf) ? "–" : doc.KodeSf,
                        FlaNo        = doc.NoFla ?? "",
                        IssueDate    = doc.TglIssue ?? "",
                        AlasanRevisi = doc.AlasanRevisi ?? "",
                        Status       = doc.Status,
                        FilledCount  = filledCount,
                        TotalDivisions = 9,
                        Timeline     = timeline,
                        Steps = new
                        {
                            Launched       = true,
                            Up             = hasUp,
                            Pole           = hasPole,
                            MscAdm         = hasMscAdm,
                            Iq             = hasIq,
                            UpFillingSpv   = hasUpSpv,
                            UpFillingMgr   = hasUpMgr,
                            PkgPole        = hasPkgPole,
                            HeadLab        = hasHeadLab
                        }
                    });
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message, StackTrace = ex.StackTrace });
            }
        }

        public class SaveCommentRequest
        {
            public string Comment { get; set; } = "";
        }

        [HttpPost("{id}/division/{divisionName}/comment")]
        public async Task<IActionResult> SaveDivisionComment(int id, string divisionName, [FromBody] SaveCommentRequest request)
        {
            try
            {
                var sigDiv = await _imRepository.GetDivisionDataAsync(id, "Signatures");
                var comments = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                var rootObj = new Dictionary<string, object>();

                if (sigDiv != null && !string.IsNullOrWhiteSpace(sigDiv.DataJson))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(sigDiv.DataJson);
                        foreach (var prop in doc.RootElement.EnumerateObject())
                        {
                            if (prop.Name.Equals("comments", StringComparison.OrdinalIgnoreCase) && prop.Value.ValueKind == JsonValueKind.Object)
                            {
                                foreach (var cProp in prop.Value.EnumerateObject())
                                {
                                    comments[cProp.Name] = cProp.Value.GetString() ?? "";
                                }
                            }
                            else
                            {
                                rootObj[prop.Name] = JsonSerializer.Deserialize<object>(prop.Value.GetRawText())!;
                            }
                        }
                    }
                    catch { }
                }

                string divKey = divisionName.ToLower() switch
                {
                    "up" => "up",
                    "pole" => "pole",
                    "msc adm" => "msc_adm",
                    "iq" => "iq",
                    "launch co" => "launch_co",
                    "up filling spv" => "up_filling_spv",
                    "up filling manager" => "up_filling_manager",
                    "packaging & pole" => "packaging_pole",
                    "head lab" => "qa_lab",
                    _ => divisionName.ToLower().Replace(" ", "_")
                };

                comments[divKey] = request.Comment ?? "";
                rootObj["comments"] = comments;

                string updatedJson = JsonSerializer.Serialize(rootObj);
                await _imRepository.SaveDivisionDataAsync(id, "Signatures", updatedJson, sigDiv?.ImageData, null);

                return Ok(new { Message = "Comment saved successfully", Comment = request.Comment });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        [HttpPost("{id}/restore")]
        public async Task<IActionResult> RestoreDocument(int id, [FromBody] PPI.IM.WebApi.Models.RestoreDocumentRequest? request)
        {
            try
            {
                bool restoreAll = request?.RestoreAll ?? (request?.Divisions == null || request.Divisions.Count == 0);
                await _imRepository.RestoreDocumentAsync(id, restoreAll, request?.Divisions);
                return Ok(new { Message = "Document restored for revision successfully", RestoreAll = restoreAll, Divisions = request?.Divisions });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }
        [HttpGet("{id}/division/{divisionName}")]
        public async Task<IActionResult> GetDivisionData(int id, string divisionName)
        {
            try
            {
                var data = await _imRepository.GetDivisionDataAsync(id, divisionName);
                if (data == null) return NotFound(new { Message = "Data not found" });
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        [HttpGet("{id}/all-divisions")]
        public async Task<IActionResult> GetAllDivisionData(int id)
        {
            try
            {
                var data = await _imRepository.GetDivisionDataForImAsync(id);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        public class SaveDivisionDataRequest
        {
            public string DataJson { get; set; } = "";
            public byte[]? ImageData { get; set; }
            public int? SubmittedBy { get; set; }
        }

        [HttpPost("{id}/division/{divisionName}")]
        public async Task<IActionResult> SaveDivisionData(int id, string divisionName, [FromBody] SaveDivisionDataRequest request)
        {
            try
            {
                var isSigDivision = divisionName.Equals("UP FILLING SPV", StringComparison.OrdinalIgnoreCase) ||
                                    divisionName.Equals("UP FILLING MANAGER", StringComparison.OrdinalIgnoreCase) ||
                                    divisionName.Equals("PACKAGING & POLE", StringComparison.OrdinalIgnoreCase) ||
                                    divisionName.Equals("HEAD LAB", StringComparison.OrdinalIgnoreCase) ||
                                    divisionName.Equals("QA LAB", StringComparison.OrdinalIgnoreCase);

                if (isSigDivision)
                {
                    bool isDeleteOrPending = string.IsNullOrWhiteSpace(request.DataJson) || 
                        request.DataJson.Contains("\"signed\":false", StringComparison.OrdinalIgnoreCase) || 
                        request.DataJson.Contains("\"signed\": false", StringComparison.OrdinalIgnoreCase) || 
                        request.DataJson.Contains("\"status\":\"Pending\"", StringComparison.OrdinalIgnoreCase) ||
                        request.DataJson.Contains("\"status\": \"Pending\"", StringComparison.OrdinalIgnoreCase);

                    if (isDeleteOrPending)
                    {
                        await _imRepository.DeleteDivisionDataAsync(id, divisionName);
                        return Ok(new { Message = "Signature deleted successfully" });
                    }

                    // A signature payload MUST contain either "signed":true or ("status":"Filled" and ("signedBy" or "signerName"))
                    bool isSignaturePayload = request.DataJson.Contains("\"signed\":true", StringComparison.OrdinalIgnoreCase) ||
                                              request.DataJson.Contains("\"signed\": true", StringComparison.OrdinalIgnoreCase) ||
                                              (request.DataJson.Contains("\"status\":\"Filled\"", StringComparison.OrdinalIgnoreCase) && 
                                               (request.DataJson.Contains("\"signedBy\"", StringComparison.OrdinalIgnoreCase) || request.DataJson.Contains("\"signerName\"", StringComparison.OrdinalIgnoreCase)));

                    if (!isSignaturePayload)
                    {
                        // Accidental save of form/canvas payload to a signature division - DO NOT overwrite the signature!
                        return Ok(new { Message = "Ignored non-signature payload for signature division" });
                    }
                }

                if (!request.SubmittedBy.HasValue && !string.IsNullOrWhiteSpace(request.DataJson))
                {
                    try
                    {
                        using var jd = JsonDocument.Parse(request.DataJson);
                        string? uName = null;
                        if (jd.RootElement.TryGetProperty("signedBy", out var sb) && !string.IsNullOrWhiteSpace(sb.GetString()))
                            uName = sb.GetString();
                        else if (jd.RootElement.TryGetProperty("filledBy", out var fb) && !string.IsNullOrWhiteSpace(fb.GetString()))
                            uName = fb.GetString();
                        else if (jd.RootElement.TryGetProperty("signerName", out var sn) && !string.IsNullOrWhiteSpace(sn.GetString()))
                            uName = sn.GetString();

                        if (!string.IsNullOrWhiteSpace(uName))
                        {
                            var uFound = await _userRepository.GetByUsernameAsync(uName.Trim());
                            if (uFound != null)
                            {
                                request.SubmittedBy = uFound.Id;
                            }
                        }
                    }
                    catch { }
                }

                bool success = await _imRepository.SaveDivisionDataAsync(id, divisionName, request.DataJson, request.ImageData, request.SubmittedBy);
                if (success) return Ok(new { Message = "Data saved successfully" });
                return BadRequest("Failed to save data.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

        [HttpDelete("{id}/division/{divisionName}")]
        public async Task<IActionResult> DeleteDivisionData(int id, string divisionName)
        {
            try
            {
                bool success = await _imRepository.DeleteDivisionDataAsync(id, divisionName);
                return Ok(new { Message = "Division data deleted successfully", Success = success });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Terjadi kesalahan pada server", Error = ex.Message });
            }
        }

    }
}
