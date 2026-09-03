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
            var worksheet = workbook.Worksheets.Add("Master Data");

            // Header
            worksheet.Cell(1, 1).Value = "Part Number (ID)";
            worksheet.Cell(1, 2).Value = "Item Name";
            worksheet.Cell(1, 3).Value = "BIN";
            worksheet.Cell(1, 4).Value = "Category";
            worksheet.Cell(1, 5).Value = "Machine";
            worksheet.Cell(1, 6).Value = "UP Area";
            worksheet.Cell(1, 7).Value = "Current Stock";
            worksheet.Cell(1, 8).Value = "Safety Stock";
            worksheet.Cell(1, 9).Value = "Frequency";
            worksheet.Cell(1, 10).Value = "Unit Price (IDR)";
            worksheet.Cell(1, 11).Value = "Budget Code";

            var headerRow = worksheet.Row(1);
            headerRow.Style.Font.Bold = true;
            headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#0078D4");
            headerRow.Style.Font.FontColor = XLColor.White;

            int row = 2;
            foreach (var item in data)
            {
                worksheet.Cell(row, 1).Value = item.Id;
                worksheet.Cell(row, 2).Value = item.Item;
                worksheet.Cell(row, 3).Value = item.Bin ?? "";
                worksheet.Cell(row, 4).Value = item.Category ?? "";
                worksheet.Cell(row, 5).Value = item.Machine ?? "";
                worksheet.Cell(row, 6).Value = item.UpArea ?? "";
                worksheet.Cell(row, 7).Value = item.CurrentStock;
                worksheet.Cell(row, 8).Value = item.SafetyStock;
                worksheet.Cell(row, 9).Value = item.Frequency ?? "";
                worksheet.Cell(row, 10).Value = item.CurrentUnitPrice ?? 0m;
                worksheet.Cell(row, 11).Value = item.BudgetCode ?? "";
                row++;
            }

            worksheet.Columns().AdjustToContents();

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
            worksheet.Cell(1, 3).Value = "BIN";
            worksheet.Cell(1, 4).Value = "Nama Item";
            worksheet.Cell(1, 5).Value = "QTY";
            worksheet.Cell(1, 6).Value = "PIC";
            worksheet.Cell(1, 7).Value = "Supplier";

            var headerRow = worksheet.Row(1);
            headerRow.Style.Font.Bold = true;
            headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#107C41");
            headerRow.Style.Font.FontColor = XLColor.White;

            int row = 2;
            foreach (var item in data)
            {
                worksheet.Cell(row, 1).Value = item.Id;
                worksheet.Cell(row, 2).Value = item.Tanggal.ToString("yyyy-MM-dd");
                worksheet.Cell(row, 3).Value = item.Bin ?? "";
                worksheet.Cell(row, 4).Value = item.ItemName;
                worksheet.Cell(row, 5).Value = item.Qty;
                worksheet.Cell(row, 6).Value = item.Pic ?? "";
                worksheet.Cell(row, 7).Value = item.Supplier ?? "";
                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        public byte[] ExportBarangKeluarToExcel(List<BarangKeluar> data)
        {
            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Barang Keluar");

            worksheet.Cell(1, 1).Value = "ID";
            worksheet.Cell(1, 2).Value = "Tanggal";
            worksheet.Cell(1, 3).Value = "BIN";
            worksheet.Cell(1, 4).Value = "Nama Item";
            worksheet.Cell(1, 5).Value = "QTY";
            worksheet.Cell(1, 6).Value = "Line";
            worksheet.Cell(1, 7).Value = "Maintenance Type";
            worksheet.Cell(1, 8).Value = "PIC";
            worksheet.Cell(1, 9).Value = "Unit Price";
            worksheet.Cell(1, 10).Value = "Total Cost";
            worksheet.Cell(1, 11).Value = "Status";

            var headerRow = worksheet.Row(1);
            headerRow.Style.Font.Bold = true;
            headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#D13438");
            headerRow.Style.Font.FontColor = XLColor.White;

            int row = 2;
            foreach (var item in data)
            {
                worksheet.Cell(row, 1).Value = item.Id;
                worksheet.Cell(row, 2).Value = item.Tanggal.ToString("yyyy-MM-dd");
                worksheet.Cell(row, 3).Value = item.Bin ?? "";
                worksheet.Cell(row, 4).Value = item.ItemName;
                worksheet.Cell(row, 5).Value = item.Qty;
                worksheet.Cell(row, 6).Value = item.Line ?? "";
                worksheet.Cell(row, 7).Value = item.MaintenanceType ?? "";
                worksheet.Cell(row, 8).Value = item.Pic ?? "";
                worksheet.Cell(row, 9).Value = item.UnitPrice ?? 0m;
                worksheet.Cell(row, 10).Value = item.TotalCost ?? 0m;
                worksheet.Cell(row, 11).Value = item.ApprovalStatus ?? "Approved";
                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }
    }
}
