using System;

namespace UPMS.Web.Helpers
{
    public static class TimeHelper
    {
        private static readonly TimeZoneInfo WibTimeZone = GetWibTimeZoneInfo();

        private static TimeZoneInfo GetWibTimeZoneInfo()
        {
            try
            {
                // Windows timezone ID
                return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            }
            catch
            {
                try
                {
                    // IANA timezone ID (Linux/macOS)
                    return TimeZoneInfo.FindSystemTimeZoneById("Asia/Jakarta");
                }
                catch
                {
                    // Custom UTC+7 fallback
                    return TimeZoneInfo.CreateCustomTimeZone("WIB", TimeSpan.FromHours(7), "WIB", "WIB");
                }
            }
        }

        /// <summary>
        /// Gets the current Date & Time in Asia/Jakarta (WIB, UTC+7).
        /// </summary>
        public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, WibTimeZone);

        /// <summary>
        /// Gets current Date (midnight) in Asia/Jakarta (WIB, UTC+7).
        /// </summary>
        public static DateTime Today => Now.Date;

        /// <summary>
        /// Converts any DateTime to Asia/Jakarta (WIB, UTC+7).
        /// </summary>
        public static DateTime ToJakartaTime(this DateTime dt)
        {
            if (dt == default || dt == DateTime.MinValue)
            {
                return Now;
            }

            if (dt.Kind == DateTimeKind.Utc)
            {
                return TimeZoneInfo.ConvertTimeFromUtc(dt, WibTimeZone);
            }

            if (dt.Kind == DateTimeKind.Unspecified)
            {
                // Treat unspecified as UTC for proper conversion
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(dt, DateTimeKind.Utc), WibTimeZone);
            }

            return TimeZoneInfo.ConvertTime(dt, WibTimeZone);
        }
    }
}
