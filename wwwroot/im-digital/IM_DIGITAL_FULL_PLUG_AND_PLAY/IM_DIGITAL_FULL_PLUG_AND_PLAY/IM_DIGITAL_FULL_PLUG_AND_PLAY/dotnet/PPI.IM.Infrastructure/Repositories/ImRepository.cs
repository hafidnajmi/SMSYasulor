using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System.Text.Json.Nodes;
using Dapper;
using PPI.IM.Domain.Entities;
using PPI.IM.Infrastructure.Data;

namespace PPI.IM.Infrastructure.Repositories
{
    public class ImRepository
    {
        private readonly DbConnectionFactory _dbFactory;

        public ImRepository(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async Task<IEnumerable<ImDocument>> GetAllActiveDocumentsAsync()
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QueryAsync<ImDocument>(
                "SELECT * FROM ppi_im_documents WHERE deleted_at IS NULL ORDER BY created_at DESC;"
            );
        }

        public async Task<IEnumerable<ImDocument>> GetDocumentsByDivisionAsync(string division)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            // Division specific query logic
            return await conn.QueryAsync<ImDocument>(
                "SELECT * FROM ppi_im_documents WHERE deleted_at IS NULL ORDER BY created_at DESC;"
            );
        }

        public async Task<ImDocument?> GetByImCodeAsync(string imCode)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QuerySingleOrDefaultAsync<ImDocument>(
                "SELECT * FROM ppi_im_documents WHERE im_code = @ImCode AND deleted_at IS NULL;",
                new { ImCode = imCode }
            );
        }

        public async Task<ImDocument?> GetByIdAsync(int id)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QuerySingleOrDefaultAsync<ImDocument>(
                "SELECT * FROM ppi_im_documents WHERE id = @Id AND deleted_at IS NULL;",
                new { Id = id }
            );
        }

        public async Task<int> CreateDocumentAsync(ImDocument doc)
        {
            if (string.IsNullOrWhiteSpace(doc.Uuid))
            {
                doc.Uuid = Guid.NewGuid().ToString();
            }

            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();

            // Clear any lingering soft-deleted document with the same im_code to allow clean recreation
            await conn.ExecuteAsync(@"
                DELETE FROM ppi_im_division_data WHERE im_id IN (SELECT id FROM ppi_im_documents WHERE im_code = @ImCode AND deleted_at IS NOT NULL);
                DELETE FROM ppi_im_documents WHERE im_code = @ImCode AND deleted_at IS NOT NULL;
            ", new { ImCode = doc.ImCode });

            string sql = @"
            INSERT INTO ppi_im_documents (
                im_code, uuid, description, kode_sf, no_fla, tgl_issue, alasan_revisi,
                status, jenis_line, dept_set, created_by, created_at, updated_at, source_type
            ) VALUES (
                @ImCode, @Uuid, @Description, @KodeSf, @NoFla, @TglIssue, @AlasanRevisi,
                @Status, @JenisLine, @DeptSet, @CreatedBy, GETDATE(), GETDATE(), @SourceType
            ) RETURNING id;";

            return await conn.ExecuteScalarAsync<int>(sql, doc);
        }

        public async Task<bool> UpdateDocumentHeaderAsync(ImDocument doc)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            string sql = @"
            UPDATE ppi_im_documents SET
                description = @Description,
                kode_sf = @KodeSf,
                no_fla = @NoFla,
                tgl_issue = @TglIssue,
                alasan_revisi = @AlasanRevisi,
                status = @Status,
                jenis_line = @JenisLine,
                dept_set = @DeptSet,
                created_by = CASE WHEN @CreatedBy IS NOT NULL AND @CreatedBy <> '' THEN @CreatedBy ELSE created_by END,
                updated_at = GETDATE()
            WHERE id = @Id;";

            int rows = await conn.ExecuteAsync(sql, doc);
            return rows > 0;
        }

        public async Task<bool> SaveDivisionDataAsync(int imId, string division, string dataJson, byte[]? imageData, int? submittedBy)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            string sql = @"
            MERGE INTO ppi_im_division_data AS Target
            USING (SELECT @ImId AS im_id, @Division AS division) AS Source
            ON Target.im_id = Source.im_id AND Target.division = Source.division
            WHEN MATCHED THEN
                UPDATE SET 
                    data_json = @DataJson, 
                    image_data = COALESCE(@ImageData, Target.image_data),
                    submitted_by = @SubmittedBy, 
                    submitted_at = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (im_id, division, data_json, image_data, submitted_by, submitted_at)
                VALUES (@ImId, @Division, @DataJson, @ImageData, @SubmittedBy, GETDATE());";

            int rows = await conn.ExecuteAsync(sql, new
            {
                ImId = imId,
                Division = division,
                DataJson = dataJson,
                ImageData = imageData,
                SubmittedBy = submittedBy
            });

            // Also update parent document updated_at
            await conn.ExecuteAsync("UPDATE ppi_im_documents SET updated_at = GETDATE() WHERE id = @ImId;", new { ImId = imId });

            // Invalidate Caches - clear ALL cached entries for this document to prevent stale data
            var keysToRemove = _filledStatusCache.Keys.Where(k => k.Contains($"_{imId}") || k.EndsWith($"_{imId}")).ToList();
            foreach (var key in keysToRemove) _filledStatusCache.TryRemove(key, out _);
            _pendingCountsCache = null;

            return rows > 0;
        }

        public async Task<bool> DeleteDivisionDataAsync(int imId, string division)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            int rows = await conn.ExecuteAsync(
                "DELETE FROM ppi_im_division_data WHERE im_id = @ImId AND division = @Division;",
                new { ImId = imId, Division = division }
            );
            await conn.ExecuteAsync("UPDATE ppi_im_documents SET updated_at = GETDATE() WHERE id = @ImId;", new { ImId = imId });
            // Invalidate ALL cached entries for this document
            var keysToRemove2 = _filledStatusCache.Keys.Where(k => k.Contains($"_{imId}") || k.EndsWith($"_{imId}")).ToList();
            foreach (var key in keysToRemove2) _filledStatusCache.TryRemove(key, out _);
            _pendingCountsCache = null;
            return rows > 0;
        }

        public async Task<IEnumerable<ImDivisionData>> GetAllDivisionDataAsync(IEnumerable<int> imIds)
        {
            if (imIds == null || !imIds.Any()) return Enumerable.Empty<ImDivisionData>();
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QueryAsync<ImDivisionData>(
                $"SELECT id as Id, im_id as ImId, division as Division, data_json as DataJson, image_data as ImageData, submitted_by as SubmittedBy, submitted_at as SubmittedAt FROM ppi_im_division_data WHERE im_id IN ({string.Join(",", imIds)});"
            );
        }

        public async Task<IEnumerable<ImDivisionData>> GetDivisionDataForImAsync(int imId)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QueryAsync<ImDivisionData>(
                "SELECT * FROM ppi_im_division_data WHERE im_id = @ImId;",
                new { ImId = imId }
            );
        }

        public async Task<ImDivisionData?> GetDivisionDataAsync(int imId, string division)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            return await conn.QuerySingleOrDefaultAsync<ImDivisionData>(
                "SELECT * FROM ppi_im_division_data WHERE im_id = @ImId AND division = @Division;",
                new { ImId = imId, Division = division }
            );
        }

        public async Task<bool> UpdateStatusAsync(int imId, string status)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            int rows = await conn.ExecuteAsync(
                "UPDATE ppi_im_documents SET status = @Status, updated_at = GETDATE() WHERE id = @Id;",
                new { Id = imId, Status = status }
            );
            _pendingCountsCache = null;
            return rows > 0;
        }

        public async Task<bool> MarkDivisionNotFilledAsync(int imId, string division)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            var existing = await conn.QuerySingleOrDefaultAsync<ImDivisionData>(
                "SELECT * FROM ppi_im_division_data WHERE im_id = @ImId AND division = @Division;",
                new { ImId = imId, Division = division }
            );

            if (existing != null && !string.IsNullOrWhiteSpace(existing.DataJson))
            {
                try
                {
                    var node = System.Text.Json.Nodes.JsonNode.Parse(existing.DataJson);
                    if (node is System.Text.Json.Nodes.JsonObject obj)
                    {
                        obj["is_filled"] = false;
                        obj["status"] = "Not Filled";
                        string updatedJson = obj.ToJsonString();
                        await conn.ExecuteAsync(
                            "UPDATE ppi_im_division_data SET data_json = @DataJson WHERE id = @Id;",
                            new { DataJson = updatedJson, Id = existing.Id }
                        );
                    }
                }
                catch
                {
                    await conn.ExecuteAsync(
                        "UPDATE ppi_im_division_data SET data_json = '{\"is_filled\":false,\"status\":\"Not Filled\"}' WHERE id = @Id;",
                        new { Id = existing.Id }
                    );
                }
            }

            _filledStatusCache.TryRemove($"UP_{imId}", out _);
            _filledStatusCache.TryRemove($"POLE_{imId}", out _);
            _filledStatusCache.TryRemove($"MSC_{imId}", out _);
            _filledStatusCache.TryRemove($"IQ_{imId}", out _);
            _filledStatusCache.TryRemove($"SIGN_{imId}_{division}", out _);
            _pendingCountsCache = null;

            return true;
        }

        public async Task<bool> RestoreDocumentAsync(int imId, bool restoreAll, List<string>? divisions)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();

            // Always revoke HEAD LAB signature because restoring takes document out of DATA IM
            await DeleteDivisionDataAsync(imId, "HEAD LAB");

            if (restoreAll)
            {
                await MarkDivisionNotFilledAsync(imId, "UP");
                await MarkDivisionNotFilledAsync(imId, "POLE");
                await MarkDivisionNotFilledAsync(imId, "MSC ADM");
                await MarkDivisionNotFilledAsync(imId, "A.3. Appearance Packing (MSC)");
                await MarkDivisionNotFilledAsync(imId, "IQ");

                await DeleteDivisionDataAsync(imId, "UP FILLING SPV");
                await DeleteDivisionDataAsync(imId, "UP FILLING MANAGER");
                await DeleteDivisionDataAsync(imId, "PACKAGING & POLE");
            }
            else if (divisions != null && divisions.Any())
            {
                var divSet = new HashSet<string>(divisions, StringComparer.OrdinalIgnoreCase);

                if (divSet.Contains("UP"))
                {
                    await MarkDivisionNotFilledAsync(imId, "UP");
                    // If UP data is revised, dependent supervisor and manager signatures must be re-signed
                    await DeleteDivisionDataAsync(imId, "UP FILLING SPV");
                    await DeleteDivisionDataAsync(imId, "UP FILLING MANAGER");
                }

                if (divSet.Contains("POLE"))
                {
                    await MarkDivisionNotFilledAsync(imId, "POLE");
                    // If POLE data is revised, dependent packaging & pole signature must be re-signed
                    await DeleteDivisionDataAsync(imId, "PACKAGING & POLE");
                }

                if (divSet.Contains("MSC ADM") || divSet.Contains("A.3. Appearance Packing (MSC)"))
                {
                    await MarkDivisionNotFilledAsync(imId, "MSC ADM");
                    await MarkDivisionNotFilledAsync(imId, "A.3. Appearance Packing (MSC)");
                }

                if (divSet.Contains("IQ"))
                {
                    await MarkDivisionNotFilledAsync(imId, "IQ");
                }

                if (divSet.Contains("UP FILLING SPV"))
                {
                    await DeleteDivisionDataAsync(imId, "UP FILLING SPV");
                    await DeleteDivisionDataAsync(imId, "UP FILLING MANAGER");
                }

                if (divSet.Contains("UP FILLING MANAGER"))
                {
                    await DeleteDivisionDataAsync(imId, "UP FILLING MANAGER");
                }

                if (divSet.Contains("PACKAGING & POLE"))
                {
                    await DeleteDivisionDataAsync(imId, "PACKAGING & POLE");
                }
            }

            await UpdateStatusAsync(imId, "Launched");

            // Invalidate all status caches for this document
            _filledStatusCache.TryRemove($"UP_{imId}", out _);
            _filledStatusCache.TryRemove($"POLE_{imId}", out _);
            _filledStatusCache.TryRemove($"MSC_{imId}", out _);
            _filledStatusCache.TryRemove($"IQ_{imId}", out _);
            _filledStatusCache.TryRemove($"SIGN_{imId}_UP FILLING SPV", out _);
            _filledStatusCache.TryRemove($"SIGN_{imId}_UP FILLING MANAGER", out _);
            _filledStatusCache.TryRemove($"SIGN_{imId}_PACKAGING & POLE", out _);
            _filledStatusCache.TryRemove($"SIGN_{imId}_HEAD LAB", out _);
            _pendingCountsCache = null;

            return true;
        }

        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, bool> _filledStatusCache = new();

        public static bool CheckIsUpFilled(int imId, string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return false;
            string cacheKey = $"UP_{imId}";
            if (_filledStatusCache.TryGetValue(cacheKey, out bool isFilled)) return isFilled;

            try
            {
                using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                var root = jsonDoc.RootElement;

                // Explicit flags check (e.g. when restored for revision)
                if (root.TryGetProperty("is_filled", out var fillProp))
                {
                    if (fillProp.ValueKind == System.Text.Json.JsonValueKind.False) { _filledStatusCache[cacheKey] = false; return false; }
                    if (fillProp.ValueKind == System.Text.Json.JsonValueKind.True) { _filledStatusCache[cacheKey] = true; return true; }
                }
                if (root.TryGetProperty("status", out var statusProp))
                {
                    string? s = statusProp.GetString();
                    if (!string.IsNullOrWhiteSpace(s))
                    {
                        if (s.Equals("Not Filled", StringComparison.OrdinalIgnoreCase)) { _filledStatusCache[cacheKey] = false; return false; }
                        if (s.Equals("Filled", StringComparison.OrdinalIgnoreCase)) { _filledStatusCache[cacheKey] = true; return true; }
                    }
                }

                // 1. Check Line Type & Line selection (Gambar 1)
                bool hasLine = false;
                if (root.TryGetProperty("savedUpFormData", out var savedUpElem) && savedUpElem.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    if (savedUpElem.TryGetProperty("lines", out var linesArr) && linesArr.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        hasLine = linesArr.GetArrayLength() > 0;
                    }
                }

                if (!hasLine)
                {
                    if (root.TryGetProperty("Line", out var lineProp))
                        hasLine = !string.IsNullOrWhiteSpace(lineProp.ToString());
                    else if (root.TryGetProperty("line", out var lineProp2))
                        hasLine = !string.IsNullOrWhiteSpace(lineProp2.ToString());
                    else if (root.TryGetProperty("up_data", out var upDataProp) && upDataProp.ValueKind == System.Text.Json.JsonValueKind.Object)
                    {
                        if (upDataProp.TryGetProperty("line", out var lProp))
                            hasLine = !string.IsNullOrWhiteSpace(lProp.ToString());
                        else if (upDataProp.TryGetProperty("jenis_line", out var jlProp))
                            hasLine = !string.IsNullOrWhiteSpace(jlProp.ToString());
                    }
                    else if (root.TryGetProperty("HasUpData", out var hasUpProp))
                    {
                        hasLine = hasUpProp.ValueKind == System.Text.Json.JsonValueKind.True;
                    }
                }

                // 2. Check A.4/A.5 QC data for Normal, Duo, Biphase, Lip Eye (Gambar 2)
                bool hasA4 = false;

                if (root.TryGetProperty("savedQcFillingData", out var qcFillElem) && qcFillElem.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    bool hasVol = qcFillElem.TryGetProperty("volumeFg", out var vF) && !string.IsNullOrWhiteSpace(vF.ToString()) && vF.ToString() != "0";
                    bool hasPhase1 = qcFillElem.TryGetProperty("volPhase1", out var vP1) && !string.IsNullOrWhiteSpace(vP1.ToString()) && vP1.ToString() != "0";
                    hasA4 = hasVol || hasPhase1;
                }
                
                if (!hasA4 && root.TryGetProperty("Volume", out var vProp) && vProp.TryGetDouble(out double vVal) && vVal > 0)
                {
                    hasA4 = true;
                }
                else if (!hasA4 && root.TryGetProperty("vol_fg", out var vProp2) && vProp2.TryGetDouble(out double vVal2) && vVal2 > 0)
                {
                    hasA4 = true;
                }
                else if (!hasA4 && root.TryGetProperty("VolPhase1", out var vpProp) && vpProp.TryGetDouble(out double vpVal) && vpVal > 0)
                {
                    hasA4 = true;
                }
                else if (!hasA4 && root.TryGetProperty("up_qc_data", out var qcProp2) && qcProp2.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    if (qcProp2.TryGetProperty("vol_fg", out var qv) && qv.TryGetDouble(out double qvVal) && qvVal > 0)
                        hasA4 = true;
                    else if (qcProp2.TryGetProperty("vol_phase1", out var qp1) && qp1.TryGetDouble(out double qp1Val) && qp1Val > 0)
                        hasA4 = true;
                }

                // If still not found, check if savedQcResult has nominal > 0
                if (!hasA4 && root.TryGetProperty("savedQcResult", out var savedQcElem) && savedQcElem.ValueKind == System.Text.Json.JsonValueKind.Object)
                {
                    if (savedQcElem.TryGetProperty("limitsMl", out var lMl) && lMl.TryGetProperty("nominal", out var nom) && nom.TryGetDouble(out double nVal) && nVal > 0)
                        hasA4 = true;
                    else if (savedQcElem.TryGetProperty("phase1", out var p1) && p1.TryGetProperty("limitsMl", out var p1Ml) && p1Ml.TryGetProperty("nominal", out var p1Nom) && p1Nom.TryGetDouble(out double p1nVal) && p1nVal > 0)
                        hasA4 = true;
                }

                bool result = hasLine && hasA4;
                _filledStatusCache[cacheKey] = result;
                return result;
            }
            catch
            {
                return false;
            }
        }

        public static bool CheckIsPoleFilled(int imId, string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return false;
            string cacheKey = $"POLE_{imId}";
            if (_filledStatusCache.TryGetValue(cacheKey, out bool isFilled)) return isFilled;
            
            try
            {
                using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                var root = jsonDoc.RootElement;

                // 1. Web App Save & Close explicit flags
                if (root.TryGetProperty("is_filled", out var fillProp))
                {
                    if (fillProp.ValueKind == System.Text.Json.JsonValueKind.False) { _filledStatusCache[cacheKey] = false; return false; }
                    if (fillProp.ValueKind == System.Text.Json.JsonValueKind.True) { _filledStatusCache[cacheKey] = true; return true; }
                }

                if (root.TryGetProperty("status", out var statusProp))
                {
                    string? s = statusProp.GetString();
                    if (!string.IsNullOrWhiteSpace(s))
                    {
                        if (s.Equals("Not Filled", StringComparison.OrdinalIgnoreCase)) { _filledStatusCache[cacheKey] = false; return false; }
                        if (s.Equals("Filled", StringComparison.OrdinalIgnoreCase)) { _filledStatusCache[cacheKey] = true; return true; }
                    }
                }

                // 2. If it is an intermediate draft from the Web App, it is NOT filled yet until Save & Close
                if (root.TryGetProperty("poleData", out _))
                {
                    return false;
                }

                // 3. Fallback for WPF App (Legacy)
                bool hasA1 = root.TryGetProperty("A1ImageData", out var a1) && !string.IsNullOrWhiteSpace(a1.GetString());
                bool hasA2 = root.TryGetProperty("A2ImageData", out var a2) && !string.IsNullOrWhiteSpace(a2.GetString());
                bool hasA3 = root.TryGetProperty("A3PoleImageData", out var a3) && !string.IsNullOrWhiteSpace(a3.GetString());
                bool hasA6 = root.TryGetProperty("PaletloadImageData", out var a6) && !string.IsNullOrWhiteSpace(a6.GetString())
                             || (root.TryGetProperty("PaletloadOuterBox", out var ob) && !string.IsNullOrWhiteSpace(ob.GetString()));
                bool hasA7 = root.TryGetProperty("a7List", out var a7l) && a7l.ValueKind == System.Text.Json.JsonValueKind.Array && a7l.GetArrayLength() > 0
                             || (root.TryGetProperty("JacomexList", out var jcl) && jcl.ValueKind == System.Text.Json.JsonValueKind.Array && jcl.GetArrayLength() > 0)
                             || (root.TryGetProperty("a7Data", out var a7d) && a7d.ValueKind != System.Text.Json.JsonValueKind.Null);

                return hasA1 && hasA2 && hasA3 && hasA6 && hasA7;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Checks if A.7 division data JSON actually contains data entries (not just an empty array).
        /// </summary>
        public static bool CheckA7HasData(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return false;
            try
            {
                using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                var root = jsonDoc.RootElement;
                if (root.TryGetProperty("data", out var dataProp) && dataProp.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    return dataProp.GetArrayLength() > 0;
                }
                // If no "data" array, consider it has data if JSON has other meaningful content
                return root.EnumerateObject().Any();
            }
            catch
            {
                return false;
            }
        }

        public static bool CheckIsMscFilled(int imId, string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return false;

            try
            {
                using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                var root = jsonDoc.RootElement;

                if (root.TryGetProperty("is_filled", out var fillProp))
                {
                    if (fillProp.ValueKind == System.Text.Json.JsonValueKind.True) return true;
                    if (fillProp.ValueKind == System.Text.Json.JsonValueKind.False) return false;
                }
                if (root.TryGetProperty("status", out var statusProp))
                {
                    string? s = statusProp.GetString();
                    if (!string.IsNullOrWhiteSpace(s))
                    {
                        if (s.Equals("Filled", StringComparison.OrdinalIgnoreCase)) return true;
                        if (s.Equals("Not Filled", StringComparison.OrdinalIgnoreCase)) return false;
                    }
                }

                if (root.TryGetProperty("A3MscImageData", out var msc) && !string.IsNullOrWhiteSpace(msc.GetString()))
                    return true;

                if (root.TryGetProperty("poleData", out var pd) && pd.TryGetProperty("A.3_MSC", out var mscObj) && mscObj.TryGetProperty("imageDataUrl", out var url) && !string.IsNullOrWhiteSpace(url.GetString()))
                {
                    return true;
                }

                if (root.TryGetProperty("images", out var imgs) && imgs.ValueKind == System.Text.Json.JsonValueKind.Array && imgs.GetArrayLength() > 0)
                    return true;

                if (root.TryGetProperty("annotations", out var anns) && anns.ValueKind == System.Text.Json.JsonValueKind.Array && anns.GetArrayLength() > 0)
                    return true;

                if (root.TryGetProperty("note", out var noteProp) && !string.IsNullOrWhiteSpace(noteProp.GetString()))
                    return true;

                return false;
            }
            catch
            {
                return false;
            }
        }

        public static bool CheckIsIqFilled(int imId, string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return false;
            string cacheKey = $"IQ_{imId}";
            if (_filledStatusCache.TryGetValue(cacheKey, out bool isFilled)) return isFilled;

            try
            {
                using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                var root = jsonDoc.RootElement;

                if (root.TryGetProperty("is_filled", out var fillProp))
                {
                    if (fillProp.ValueKind == System.Text.Json.JsonValueKind.True) return true;
                    if (fillProp.ValueKind == System.Text.Json.JsonValueKind.False) return false;
                }
                if (root.TryGetProperty("status", out var statusProp))
                {
                    string? s = statusProp.GetString();
                    if (!string.IsNullOrWhiteSpace(s) && s.Equals("Filled", StringComparison.OrdinalIgnoreCase))
                        return true;
                }

                if (root.TryGetProperty("hasQsData", out var hqProp) && hqProp.ValueKind == System.Text.Json.JsonValueKind.True)
                    return true;

                if (root.TryGetProperty("iqBatchText", out var ibProp) && !string.IsNullOrWhiteSpace(ibProp.GetString()))
                {
                    _filledStatusCache[cacheKey] = true;
                    return true;
                }

                _filledStatusCache[cacheKey] = false;
                return false;
            }
            catch
            {
                return false;
            }
        }

        public static bool CheckIsSigned(int imId, string division, string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return false;
            string cacheKey = $"SIGN_{imId}_{division}";
            if (_filledStatusCache.TryGetValue(cacheKey, out bool isFilled)) return isFilled;

            try
            {
                using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                var root = jsonDoc.RootElement;

                if (root.TryGetProperty("signed", out var signProp))
                {
                    if (signProp.ValueKind == System.Text.Json.JsonValueKind.False) return false;
                    if (signProp.ValueKind == System.Text.Json.JsonValueKind.True) return true;
                }

                if (root.TryGetProperty("status", out var statusProp))
                {
                    string? s = statusProp.GetString();
                    if (!string.IsNullOrWhiteSpace(s))
                    {
                        if (s.Equals("Pending", StringComparison.OrdinalIgnoreCase)) return false;
                        if (s.Equals("Filled", StringComparison.OrdinalIgnoreCase))
                        {
                            bool hasSigner = (root.TryGetProperty("signedBy", out var sb) && !string.IsNullOrWhiteSpace(sb.GetString())) ||
                                             (root.TryGetProperty("signerName", out var sn) && !string.IsNullOrWhiteSpace(sn.GetString()));
                            _filledStatusCache[cacheKey] = hasSigner;
                            return hasSigner;
                        }
                    }
                }

                _filledStatusCache[cacheKey] = false;
                return false;
            }
            catch
            {
                return false;
            }
        }

        private static Dictionary<string, int>? _pendingCountsCache = null;

        public async Task<Dictionary<string, int>> GetDivisionPendingCountsAsync()
        {
            var docs = await GetAllActiveDocumentsAsync();
            var launchedDocIds = docs
                .Where(d => d.Status != null && d.Status.Equals("Launched", StringComparison.OrdinalIgnoreCase))
                .Select(d => d.Id)
                .ToHashSet();

            if (!launchedDocIds.Any())
            {
                return new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
                {
                    { "UP", 0 }, { "POLE", 0 }, { "MSC ADM", 0 }, { "IQ", 0 },
                    { "UP FILLING SPV", 0 }, { "UP FILLING MANAGER", 0 },
                    { "PACKAGING & POLE", 0 }, { "HEAD LAB", 0 }
                };
            }

            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            string sql = $@"
            SELECT im_id, division, data_json FROM ppi_im_division_data WHERE im_id IN ({string.Join(",", launchedDocIds)});
            ";
            var filledEntries = (await conn.QueryAsync<dynamic>(sql)).ToList();

            var filledMap = new Dictionary<int, HashSet<string>>();
            var upDataMap = new Dictionary<int, string>();
            var poleDataMap = new Dictionary<int, string>();
            var mscDataMap = new Dictionary<int, string>();
            var iqDataMap = new Dictionary<int, string>();
            var upSpvDataMap = new Dictionary<int, string>();
            var upMgrDataMap = new Dictionary<int, string>();
            var pkgPoleDataMap = new Dictionary<int, string>();
            var headLabDataMap = new Dictionary<int, string>();

            foreach (var entry in filledEntries)
            {
                int imId = (int)entry.im_id;
                string division = (string)entry.division;
                string? dataJson = entry.data_json != null ? (string)entry.data_json : null;

                if (division.Equals("UP", StringComparison.OrdinalIgnoreCase) && dataJson != null)
                {
                    upDataMap[imId] = dataJson;
                }
                else if (division.Equals("POLE", StringComparison.OrdinalIgnoreCase) && dataJson != null)
                {
                    poleDataMap[imId] = dataJson;
                }
                else if ((division.Equals("MSC ADM", StringComparison.OrdinalIgnoreCase) || division.Equals("A.3. Appearance Packing (MSC)", StringComparison.OrdinalIgnoreCase)) && dataJson != null)
                {
                    // Only set if not already set (prefer MSC ADM over A.3 fallback)
                    if (!mscDataMap.ContainsKey(imId))
                        mscDataMap[imId] = dataJson;
                    else if (division.Equals("MSC ADM", StringComparison.OrdinalIgnoreCase))
                        mscDataMap[imId] = dataJson; // MSC ADM always wins
                }
                else if (division.Equals("IQ", StringComparison.OrdinalIgnoreCase) && dataJson != null)
                {
                    iqDataMap[imId] = dataJson;
                }
                else if (division.Equals("UP FILLING SPV", StringComparison.OrdinalIgnoreCase) && dataJson != null)
                {
                    upSpvDataMap[imId] = dataJson;
                }
                else if (division.Equals("UP FILLING MANAGER", StringComparison.OrdinalIgnoreCase) && dataJson != null)
                {
                    upMgrDataMap[imId] = dataJson;
                }
                else if (division.Equals("PACKAGING & POLE", StringComparison.OrdinalIgnoreCase) && dataJson != null)
                {
                    pkgPoleDataMap[imId] = dataJson;
                }
                else if (division.Equals("HEAD LAB", StringComparison.OrdinalIgnoreCase) && dataJson != null)
                {
                    headLabDataMap[imId] = dataJson;
                }

                if (!filledMap.TryGetValue(imId, out var set))
                {
                    set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    filledMap[imId] = set;
                }
                set.Add(division);
            }

            var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
            {
                { "UP", 0 },
                { "POLE", 0 },
                { "MSC ADM", 0 },
                { "IQ", 0 },
                { "UP FILLING SPV", 0 },
                { "UP FILLING MANAGER", 0 },
                { "PACKAGING & POLE", 0 },
                { "HEAD LAB", 0 }
            };

            foreach (var docId in launchedDocIds)
            {
                filledMap.TryGetValue(docId, out var divSet);
                divSet ??= new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                bool hasUp = upDataMap.TryGetValue(docId, out var upJson) && CheckIsUpFilled(docId, upJson);
                bool hasPole = poleDataMap.TryGetValue(docId, out var poleJson) && CheckIsPoleFilled(docId, poleJson);
                bool hasMscAdm = mscDataMap.TryGetValue(docId, out var mscJson) && CheckIsMscFilled(docId, mscJson);
                bool hasIq = iqDataMap.TryGetValue(docId, out var iqJson) && CheckIsIqFilled(docId, iqJson);
                bool hasUpSpv = upSpvDataMap.TryGetValue(docId, out var upSpvJson) && CheckIsSigned(docId, "UP FILLING SPV", upSpvJson);
                bool hasUpMgr = upMgrDataMap.TryGetValue(docId, out var upMgrJson) && CheckIsSigned(docId, "UP FILLING MANAGER", upMgrJson);
                bool hasPkgPole = pkgPoleDataMap.TryGetValue(docId, out var pkgPoleJson) && CheckIsSigned(docId, "PACKAGING & POLE", pkgPoleJson);
                bool hasHeadLab = headLabDataMap.TryGetValue(docId, out var headLabJson) && CheckIsSigned(docId, "HEAD LAB", headLabJson);

                if (hasHeadLab)
                {
                    // Fully signed by Head Lab -> Completed document, skip all active division pending counts!
                    continue;
                }

                if (!hasUp) counts["UP"]++;
                if (!hasPole) counts["POLE"]++;
                if (!hasMscAdm) counts["MSC ADM"]++;
                if (!hasIq) counts["IQ"]++;

                if (hasUp && !hasUpSpv) counts["UP FILLING SPV"]++;
                if (hasUpSpv && !hasUpMgr) counts["UP FILLING MANAGER"]++;
                if (hasPole && !hasPkgPole) counts["PACKAGING & POLE"]++;

                if (hasUp && hasPole && hasMscAdm && hasIq && hasUpSpv && hasUpMgr && hasPkgPole)
                {
                    counts["HEAD LAB"]++;
                }
            }

            _pendingCountsCache = counts;
            return counts;
        }

        public async Task<bool> SoftDeleteDocumentAsync(int imId)
        {
            using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
            int rows = await conn.ExecuteAsync(
                "UPDATE ppi_im_documents SET deleted_at = GETDATE(), status = 'Deleted' WHERE id = @Id;",
                new { Id = imId }
            );
            return rows > 0;
        }
    }
}
