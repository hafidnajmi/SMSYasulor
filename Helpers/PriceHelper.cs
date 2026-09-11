using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UPMS.Web.Data;
using UPMS.Web.Models.Entities;

namespace UPMS.Web.Helpers
{
    public static class PriceHelper
    {
        /// <summary>
        /// Recalculates masterItem.CurrentUnitPrice and masterItem.Brand based on SupplierOffers:
        /// Automatically selects the cheapest offer (MIN Price > 0) as IsSelected = true,
        /// unselects all other offers, and updates masterItem.CurrentUnitPrice and masterItem.Brand.
        /// </summary>
        public static async Task RecalculateMasterDataPriceAsync(UpmsDbContext db, MasterData masterItem)
        {
            if (db == null || masterItem == null || string.IsNullOrWhiteSpace(masterItem.Id)) return;

            var offers = await db.SupplierOffers
                .Where(o => o.MasterDataId == masterItem.Id && o.Price > 0)
                .ToListAsync();

            if (offers.Any())
            {
                // Always select the cheapest offer (MIN Price > 0) as primary selection
                var cheapest = offers.OrderBy(o => o.Price).ThenByDescending(o => o.UpdatedAt).First();

                foreach (var o in offers)
                {
                    o.IsSelected = (o.Id == cheapest.Id);
                }

                masterItem.CurrentUnitPrice = cheapest.Price;
                if (!string.IsNullOrWhiteSpace(cheapest.SupplierName))
                {
                    masterItem.Brand = cheapest.SupplierName;
                }
            }
        }

        /// <summary>
        /// Scans all MasterData items and ensures that the cheapest supplier offer is automatically set as IsSelected = true.
        /// </summary>
        public static async Task SyncAllCheapestSupplierOffersAsync(UpmsDbContext db)
        {
            if (db == null) return;

            var masterItems = await db.MasterDatas.Where(m => !m.IsDeleted).ToListAsync();
            foreach (var masterItem in masterItems)
            {
                await RecalculateMasterDataPriceAsync(db, masterItem);
            }
            await db.SaveChangesAsync();
        }
    }
}
