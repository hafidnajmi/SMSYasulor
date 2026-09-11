using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Helpers
{
    public static class PicHelper
    {
        private static readonly List<string> DefaultPicsMasuk = new List<string>
        {
            "Raisa", "Priyanto", "Rohmadi", "Yully", "Hussein", "Slamet", "Andra"
        }.OrderBy(p => p).ToList();

        private static readonly List<string> DefaultPicsKeluar = new List<string>
        {
            "Adit", "Agus", "Aji", "Andra", "Aricko", "Bachir", "Bambang", "Bobot",
            "Chandra", "Ferry", "Hafid", "Hussein", "Jayadi", "Madsari", "Marjuki",
            "Priyanto", "Raisa", "Ricky", "Rimba", "Rohmadi", "Slamet", "Sudrajat",
            "Suryanto", "Susilo", "Suyut", "Yully", "Zulfi"
        }.OrderBy(p => p).ToList();

        // 1. Barang Masuk PIC List
        public static async Task<List<string>> GetPicsBarangMasukAsync(UpmsDbContext db)
        {
            var setting = await db.AppSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SettingKey == "pic_list_barang_masuk");

            if (setting != null && !string.IsNullOrWhiteSpace(setting.SettingValue))
            {
                var list = ParseList(setting.SettingValue);
                if (list.Count > 0) return list;
            }

            return DefaultPicsMasuk;
        }

        public static async Task SavePicsBarangMasukAsync(UpmsDbContext db, string rawPicList)
        {
            await SaveSettingAsync(db, "pic_list_barang_masuk", rawPicList);
        }

        // 2. Barang Keluar & Maintenance PIC / Technician List
        public static async Task<List<string>> GetPicsBarangKeluarAsync(UpmsDbContext db)
        {
            var setting = await db.AppSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SettingKey == "pic_list_barang_keluar");

            if (setting != null && !string.IsNullOrWhiteSpace(setting.SettingValue))
            {
                var list = ParseList(setting.SettingValue);
                if (list.Count > 0) return list;
            }

            return DefaultPicsKeluar;
        }

        public static async Task SavePicsBarangKeluarAsync(UpmsDbContext db, string rawPicList)
        {
            await SaveSettingAsync(db, "pic_list_barang_keluar", rawPicList);
        }

        // Backward compatibility
        public static Task<List<string>> GetPicsAsync(UpmsDbContext db) => GetPicsBarangMasukAsync(db);
        public static Task SavePicsAsync(UpmsDbContext db, string rawPicList) => SavePicsBarangMasukAsync(db, rawPicList);

        private static List<string> ParseList(string raw)
        {
            return (raw ?? "")
                .Split(new[] { ',', '\n', '\r', ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Trim())
                .Where(p => !string.IsNullOrEmpty(p))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(p => p)
                .ToList();
        }

        private static async Task SaveSettingAsync(UpmsDbContext db, string key, string raw)
        {
            var items = ParseList(raw);
            string serialized = string.Join(", ", items);

            var setting = await db.AppSettings.FirstOrDefaultAsync(s => s.SettingKey == key);
            if (setting == null)
            {
                db.AppSettings.Add(new AppSetting
                {
                    SettingKey = key,
                    SettingValue = serialized
                });
            }
            else
            {
                setting.SettingValue = serialized;
            }
            await db.SaveChangesAsync();
        }
    }
}
