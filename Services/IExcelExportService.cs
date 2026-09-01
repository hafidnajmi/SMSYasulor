using System.Collections.Generic;
using System.IO;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Services
{
    public interface IExcelExportService
    {
        byte[] ExportMasterDataToExcel(List<MasterData> data);
        byte[] ExportBarangMasukToExcel(List<BarangMasuk> data);
        byte[] ExportBarangKeluarToExcel(List<BarangKeluar> data);
    }
}
