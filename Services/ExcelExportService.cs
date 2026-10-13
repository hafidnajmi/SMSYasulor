using System.Collections.Generic;
using System.IO;
using ClosedXML.Excel;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    public class ExcelExportService : IExcelExportService
    {
        public byte[] ExportMasterDataToExcel(List<MasterData> data)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Spareparts Catalog");

            // Header - All Columns from Spareparts Catalog
            worksheet.Cell(1, 1).Value = "NO";
            worksheet.Cell(1, 2).Value = "UP AREA";
            worksheet.Cell(1, 3).Value = "BIN";
            worksheet.Cell(1, 4).Value = "PART NUMBER";
            worksheet.Cell(1, 5).Value = "LINE";
            worksheet.Cell(1, 6).Value = "CATEGORY";
            worksheet.Cell(1, 7).Value = "FREQUENCY";
            worksheet.Cell(1, 8).Value = "MACHINE";
            worksheet.Cell(1, 9).Value = "ITEM NAME";
            worksheet.Cell(1, 10).Value = "DETAIL / SPECIFICATION";
            worksheet.Cell(1, 11).Value = "BRAND";
            worksheet.Cell(1, 12).Value = "NEED / YEAR";
            worksheet.Cell(1, 13).Value = "TBM / MONTH";
            worksheet.Cell(1, 14).Value = "LT / MONTH";
            worksheet.Cell(1, 15).Value = "SAFETY STOCK";
            worksheet.Cell(1, 16).Value = "CURRENT STOCK";
            worksheet.Cell(1, 17).Value = "STOCK STATUS";
            worksheet.Cell(1, 18).Value = "CURRENCY";
            worksheet.Cell(1, 19).Value = "UNIT PRICE";
            worksheet.Cell(1, 20).Value = "BUDGET CODE";
            worksheet.Cell(1, 21).Value = "EMAIL ALERT";
            worksheet.Cell(1, 22).Value = "IMAGE PATH";
            worksheet.Cell(1, 23).Value = "LAST PRICE UPDATE";
            worksheet.Cell(1, 24).Value = "LAST UPDATED BY";

            const int totalCols = 24;
            var headerRow = worksheet.Row(1);
            headerRow.Height = 26;
            var headerRange = worksheet.Range(1, 1, 1, totalCols);
            headerRange.Style.Font.Bold = true;
            headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#0F4C81");
            headerRange.Style.Font.FontColor = XLColor.White;
            headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            headerRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

            int row = 2;
            int no = 1;
            foreach (var item in data)
            {
                int curr = item.CurrentStock ?? 0;
                int safe = item.SafetyStock ?? 0;
                string stockStatus = (safe > 0 && curr < safe) ? "Below Safety Stock"
                                   : (safe > 0 && curr == safe) ? "Near Safety Stock"
                                   : "Normal Stock";

                worksheet.Cell(row, 1).Value = no++;
                worksheet.Cell(row, 2).Value = item.UpArea ?? "";
                worksheet.Cell(row, 3).Value = item.Bin ?? "";
                worksheet.Cell(row, 4).Value = item.Id ?? "";
                worksheet.Cell(row, 5).Value = item.Line ?? "";
                worksheet.Cell(row, 6).Value = item.Category ?? "";
                worksheet.Cell(row, 7).Value = item.Frequency ?? "";
                worksheet.Cell(row, 8).Value = item.Machine ?? "";
                worksheet.Cell(row, 9).Value = item.Item ?? "";
                worksheet.Cell(row, 10).Value = item.Detail ?? "";
                worksheet.Cell(row, 11).Value = item.Brand ?? "";

                if (item.QtyNeedYear.HasValue)
                {
                    worksheet.Cell(row, 12).Value = item.QtyNeedYear.Value;
                    worksheet.Cell(row, 12).Style.NumberFormat.Format = "#,##0.##";
                }
                else
                {
                    worksheet.Cell(row, 12).Value = "-";
                }

                if (item.TbmPerMonth.HasValue)
                {
                    worksheet.Cell(row, 13).Value = item.TbmPerMonth.Value;
                    worksheet.Cell(row, 13).Style.NumberFormat.Format = "#,##0.##";
                }
                else
                {
                    worksheet.Cell(row, 13).Value = "-";
                }

                if (item.LtPerMonth.HasValue)
                {
                    worksheet.Cell(row, 14).Value = item.LtPerMonth.Value;
                    worksheet.Cell(row, 14).Style.NumberFormat.Format = "#,##0.##";
                }
                else
                {
                    worksheet.Cell(row, 14).Value = "-";
                }

                worksheet.Cell(row, 15).Value = safe;
                worksheet.Cell(row, 15).Style.NumberFormat.Format = "#,##0";

                worksheet.Cell(row, 16).Value = curr;
                worksheet.Cell(row, 16).Style.NumberFormat.Format = "#,##0";

                worksheet.Cell(row, 17).Value = stockStatus;
                worksheet.Cell(row, 18).Value = string.IsNullOrWhiteSpace(item.Currency) ? "IDR" : item.Currency;

                if (item.CurrentUnitPrice.HasValue)
                {
                    worksheet.Cell(row, 19).Value = item.CurrentUnitPrice.Value;
                    worksheet.Cell(row, 19).Style.NumberFormat.Format = "#,##0";
                }
                else
                {
                    worksheet.Cell(row, 19).Value = 0m;
                    worksheet.Cell(row, 19).Style.NumberFormat.Format = "#,##0";
                }

                worksheet.Cell(row, 20).Value = item.BudgetCode ?? "";
                worksheet.Cell(row, 21).Value = item.AlertSelected ? "Active" : "Inactive";
                worksheet.Cell(row, 22).Value = item.Image ?? "";
                worksheet.Cell(row, 23).Value = item.LastPriceUpdate.HasValue ? item.LastPriceUpdate.Value.ToString("yyyy-MM-dd HH:mm:ss") : "";
                worksheet.Cell(row, 24).Value = item.LastUpdatedBy ?? "";

                row++;
            }

            if (row > 2)
            {
                var dataRange = worksheet.Range(2, 1, row - 1, totalCols);
                dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                dataRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                dataRange.Style.Border.OutsideBorderColor = XLColor.FromHtml("#D0D0D0");
                dataRange.Style.Border.InsideBorderColor = XLColor.FromHtml("#E0E0E0");

                worksheet.Range(2, 1, row - 1, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; // No
                worksheet.Range(2, 2, row - 1, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; // UP Area
                worksheet.Range(2, 3, row - 1, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; // BIN
                worksheet.Range(2, 5, row - 1, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; // Line
                worksheet.Range(2, 7, row - 1, 7).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; // Frequency
                worksheet.Range(2, 17, row - 1, 17).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; // Stock Status
                worksheet.Range(2, 18, row - 1, 18).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; // Currency
                worksheet.Range(2, 21, row - 1, 21).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; // Alert
                worksheet.Range(2, 23, row - 1, 23).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center; // Last Price Update
            }

            worksheet.SheetView.FreezeRows(1);

            try
            {
                worksheet.Columns(1, totalCols).AdjustToContents();
            }
            catch
            {
                for (int c = 1; c <= totalCols; c++)
                {
                    worksheet.Column(c).Width = 18;
                }
            }

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        public byte[] ExportBarangMasukToExcel(List<BarangMasuk> data)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Barang Masuk");

            worksheet.Cell(1, 1).Value = "ID";
            worksheet.Cell(1, 2).Value = "Tanggal";
            worksheet.Cell(1, 3).Value = "Part Number";
            worksheet.Cell(1, 4).Value = "BIN";
            worksheet.Cell(1, 5).Value = "Nama Item";
            worksheet.Cell(1, 6).Value = "QTY";
            worksheet.Cell(1, 7).Value = "PIC";
            worksheet.Cell(1, 8).Value = "Supplier";
            worksheet.Cell(1, 9).Value = "Status";
            worksheet.Cell(1, 10).Value = "Catatan";

            var headerRow = worksheet.Row(1);
            headerRow.Style.Font.Bold = true;
            headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#107C41");
            headerRow.Style.Font.FontColor = XLColor.White;

            int row = 2;
            foreach (var item in data)
            {
                worksheet.Cell(row, 1).Value = item.Id;
                worksheet.Cell(row, 2).Value = item.Tanggal.ToString("yyyy-MM-dd");
                worksheet.Cell(row, 3).Value = item.PartNumber ?? "";
                worksheet.Cell(row, 4).Value = item.Bin ?? "";
                worksheet.Cell(row, 5).Value = item.ItemName;
                worksheet.Cell(row, 6).Value = item.Qty;
                worksheet.Cell(row, 7).Value = item.Pic ?? "";
                worksheet.Cell(row, 8).Value = item.Supplier ?? "";
                worksheet.Cell(row, 9).Value = item.ApprovalStatus ?? "Approved";
                worksheet.Cell(row, 10).Value = item.ActionNote ?? item.Remarks ?? "";
                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        public byte[] ExportBarangKeluarToExcel(List<BarangKeluar> data, Dictionary<int, string>? machineMap = null)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Barang Keluar");

            worksheet.Cell(1, 1).Value = "ID";
            worksheet.Cell(1, 2).Value = "Tanggal";
            worksheet.Cell(1, 3).Value = "Part Number";
            worksheet.Cell(1, 4).Value = "BIN";
            worksheet.Cell(1, 5).Value = "Nama Item";
            worksheet.Cell(1, 6).Value = "QTY";
            worksheet.Cell(1, 7).Value = "Line";
            worksheet.Cell(1, 8).Value = "Machine";
            worksheet.Cell(1, 9).Value = "Maintenance Type";
            worksheet.Cell(1, 10).Value = "PIC";
            worksheet.Cell(1, 11).Value = "Unit Price";
            worksheet.Cell(1, 12).Value = "Total Cost";
            worksheet.Cell(1, 13).Value = "Status";

            var headerRow = worksheet.Row(1);
            headerRow.Style.Font.Bold = true;
            headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#D13438");
            headerRow.Style.Font.FontColor = XLColor.White;

            int row = 2;
            foreach (var item in data)
            {
                string machineVal = (item.MachineId.HasValue && machineMap != null && machineMap.TryGetValue(item.MachineId.Value, out var mName) && !string.IsNullOrWhiteSpace(mName)) ? mName : "";

                worksheet.Cell(row, 1).Value = item.Id;
                worksheet.Cell(row, 2).Value = item.Tanggal.ToString("yyyy-MM-dd");
                worksheet.Cell(row, 3).Value = item.PartNumber ?? item.MasterDataId ?? "";
                worksheet.Cell(row, 4).Value = item.Bin ?? "";
                worksheet.Cell(row, 5).Value = item.ItemName;
                worksheet.Cell(row, 6).Value = item.Qty;
                worksheet.Cell(row, 7).Value = item.Line ?? "";
                worksheet.Cell(row, 8).Value = machineVal;
                worksheet.Cell(row, 9).Value = item.MaintenanceType ?? "";
                worksheet.Cell(row, 10).Value = item.Pic ?? "";
                worksheet.Cell(row, 11).Value = item.UnitPrice ?? 0m;
                worksheet.Cell(row, 12).Value = item.TotalCost ?? 0m;
                worksheet.Cell(row, 13).Value = item.ApprovalStatus ?? "Approved";
                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }
    }
}
