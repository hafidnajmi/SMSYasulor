using Dapper;
using Microsoft.AspNetCore.Mvc;
using PPI.IM.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PPI.IM.WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SpecCodeController : ControllerBase
    {
        private readonly DbConnectionFactory _dbFactory;

        public SpecCodeController(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public class SpecCodeMasterDto
        {
            public int Id { get; set; }
            public string SpecCode { get; set; } = string.Empty;
            public string? SpecName { get; set; }
            public string? FgCodes { get; set; }
            public string? A6DataJson { get; set; }
            public string? A7DataJson { get; set; }
            public string? PalletPdfName { get; set; }
            public string? PalletPdfData { get; set; }
            public string? FgSpecPdfName { get; set; }
            public string? FgSpecPdfData { get; set; }
            public string? CreatedBy { get; set; }
            public DateTime? CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        public class SaveSpecCodeRequest
        {
            public int? Id { get; set; }
            public string SpecCode { get; set; } = string.Empty;
            public string? SpecName { get; set; }
            public string? FgCodes { get; set; } // Comma separated or json array string
            public string? A6DataJson { get; set; }
            public string? A7DataJson { get; set; }
            public string? PalletPdfName { get; set; }
            public string? PalletPdfData { get; set; }
            public string? FgSpecPdfName { get; set; }
            public string? FgSpecPdfData { get; set; }
            public string? CreatedBy { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
                const string sql = @"
                    SELECT id, spec_code AS SpecCode, spec_name AS SpecName, 
                           fg_codes AS FgCodes, a6_data_json AS A6DataJson, 
                           a7_data_json AS A7DataJson,
                           pallet_pdf_name AS PalletPdfName, pallet_pdf_data AS PalletPdfData,
                           fg_spec_pdf_name AS FgSpecPdfName, fg_spec_pdf_data AS FgSpecPdfData,
                           created_by AS CreatedBy, 
                           created_at AS CreatedAt, updated_at AS UpdatedAt
                    FROM ppi_spec_code_masters
                    ORDER BY updated_at DESC;";

                var list = await conn.QueryAsync<SpecCodeMasterDto>(sql);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Gagal mengambil data spec code master", Error = ex.Message });
            }
        }

        [HttpGet("{specCode}")]
        public async Task<IActionResult> GetBySpecCode(string specCode)
        {
            try
            {
                using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
                const string sql = @"
                    SELECT TOP 1 id, spec_code AS SpecCode, spec_name AS SpecName, 
                           fg_codes AS FgCodes, a6_data_json AS A6DataJson, 
                           a7_data_json AS A7DataJson,
                           pallet_pdf_name AS PalletPdfName, pallet_pdf_data AS PalletPdfData,
                           fg_spec_pdf_name AS FgSpecPdfName, fg_spec_pdf_data AS FgSpecPdfData,
                           created_by AS CreatedBy, 
                           created_at AS CreatedAt, updated_at AS UpdatedAt
                    FROM ppi_spec_code_masters
                    WHERE UPPER(spec_code) = UPPER(@Code) OR CAST(id AS NVARCHAR(50)) = @Code;";

                var item = await conn.QueryFirstOrDefaultAsync<SpecCodeMasterDto>(sql, new { Code = specCode.Trim() });
                if (item == null) return NotFound(new { Message = "Spec code tidak ditemukan" });

                return Ok(item);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Gagal mengambil data spec code", Error = ex.Message });
            }
        }

        [HttpGet("by-fg/{fgCode}")]
        public async Task<IActionResult> GetByFgCode(string fgCode)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(fgCode)) return BadRequest(new { Message = "FG Code tidak boleh kosong" });

                var cleanFg = fgCode.Trim().ToUpper();
                using var conn = await _dbFactory.OpenConnectionWithRetryAsync();

                const string sql = @"
                    SELECT id, spec_code AS SpecCode, spec_name AS SpecName, 
                           fg_codes AS FgCodes, a6_data_json AS A6DataJson, 
                           a7_data_json AS A7DataJson,
                           pallet_pdf_name AS PalletPdfName, pallet_pdf_data AS PalletPdfData,
                           fg_spec_pdf_name AS FgSpecPdfName, fg_spec_pdf_data AS FgSpecPdfData,
                           created_by AS CreatedBy, 
                           created_at AS CreatedAt, updated_at AS UpdatedAt
                    FROM ppi_spec_code_masters
                    ORDER BY updated_at DESC;";

                var list = (await conn.QueryAsync<SpecCodeMasterDto>(sql)).ToList();

                // Check which spec code contains this FG code
                var match = list.FirstOrDefault(s =>
                {
                    if (string.IsNullOrWhiteSpace(s.FgCodes)) return false;
                    var tokens = s.FgCodes.Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                                          .Select(t => t.Trim().ToUpper());
                    return tokens.Contains(cleanFg);
                });

                if (match == null) return NotFound(new { Message = $"Tidak ada Spec Code master untuk FG Code {fgCode}" });

                return Ok(match);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Gagal mencari spec code berdasarkan FG", Error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Upsert([FromBody] SaveSpecCodeRequest req)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.SpecCode))
                {
                    return BadRequest(new { Message = "Spec Code wajib diisi" });
                }

                var cleanSpec = req.SpecCode.Trim().ToUpper();

                using var conn = await _dbFactory.OpenConnectionWithRetryAsync();

                // Check existing by id or spec_code
                const string checkSql = "SELECT id FROM ppi_spec_code_masters WHERE UPPER(spec_code) = UPPER(@SpecCode) OR (id = @Id AND @Id IS NOT NULL);";
                var existingId = await conn.QueryFirstOrDefaultAsync<int?>(checkSql, new { SpecCode = cleanSpec, Id = req.Id });

                if (existingId.HasValue && existingId.Value > 0)
                {
                    // Update
                    const string updateSql = @"
                        UPDATE ppi_spec_code_masters
                        SET spec_code = @SpecCode,
                            spec_name = @SpecName,
                            fg_codes = @FgCodes,
                            a6_data_json = @A6DataJson,
                            a7_data_json = @A7DataJson,
                            pallet_pdf_name = @PalletPdfName,
                            pallet_pdf_data = @PalletPdfData,
                            fg_spec_pdf_name = @FgSpecPdfName,
                            fg_spec_pdf_data = @FgSpecPdfData,
                            created_by = CASE WHEN @CreatedBy IS NOT NULL AND @CreatedBy <> '' THEN @CreatedBy ELSE created_by END,
                            updated_at = GETDATE()
                        WHERE id = @Id;";

                    await conn.ExecuteAsync(updateSql, new
                    {
                        Id = existingId.Value,
                        SpecCode = cleanSpec,
                        SpecName = req.SpecName?.Trim(),
                        FgCodes = req.FgCodes?.Trim(),
                        A6DataJson = req.A6DataJson,
                        A7DataJson = req.A7DataJson,
                        PalletPdfName = req.PalletPdfName,
                        PalletPdfData = req.PalletPdfData,
                        FgSpecPdfName = req.FgSpecPdfName,
                        FgSpecPdfData = req.FgSpecPdfData,
                        CreatedBy = req.CreatedBy?.Trim()
                    });

                    return Ok(new { Success = true, Message = "Spec Code berhasil diperbarui", Id = existingId.Value });
                }
                else
                {
                    // Insert
                    const string insertSql = @"
                        INSERT INTO ppi_spec_code_masters (
                            spec_code, spec_name, fg_codes, a6_data_json, a7_data_json,
                            pallet_pdf_name, pallet_pdf_data, fg_spec_pdf_name, fg_spec_pdf_data,
                            created_by, created_at, updated_at
                        ) VALUES (
                            @SpecCode, @SpecName, @FgCodes, @A6DataJson, @A7DataJson,
                            @PalletPdfName, @PalletPdfData, @FgSpecPdfName, @FgSpecPdfData,
                            @CreatedBy, GETDATE(), GETDATE()
                        )
                        RETURNING id;";

                    var newId = await conn.QuerySingleAsync<int>(insertSql, new
                    {
                        SpecCode = cleanSpec,
                        SpecName = req.SpecName?.Trim(),
                        FgCodes = req.FgCodes?.Trim(),
                        A6DataJson = req.A6DataJson,
                        A7DataJson = req.A7DataJson,
                        PalletPdfName = req.PalletPdfName,
                        PalletPdfData = req.PalletPdfData,
                        FgSpecPdfName = req.FgSpecPdfName,
                        FgSpecPdfData = req.FgSpecPdfData,
                        CreatedBy = req.CreatedBy?.Trim() ?? "System"
                    });

                    return Ok(new { Success = true, Message = "Spec Code berhasil disimpan", Id = newId });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Gagal menyimpan spec code", Error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                using var conn = await _dbFactory.OpenConnectionWithRetryAsync();
                const string sql = "DELETE FROM ppi_spec_code_masters WHERE id = @Id;";
                var affected = await conn.ExecuteAsync(sql, new { Id = id });

                if (affected == 0) return NotFound(new { Message = "Spec Code tidak ditemukan" });

                return Ok(new { Success = true, Message = "Spec Code berhasil dihapus" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Gagal menghapus spec code", Error = ex.Message });
            }
        }
    }
}
