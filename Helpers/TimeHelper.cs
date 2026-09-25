using System;

namespace UPMS.Web.Helpers
{
    /// <summary>
    /// Centralized time helper that converts UTC to a configurable timezone.
    /// Default timezone is Asia/Jakarta (WIB, UTC+7).
    /// The active timezone can be changed at runtime via <see cref="SetTimezone"/>.
    /// </summary>
    public static class TimeHelper
    {
        // Lock object for thread-safe timezone updates
        private static readonly object _lock = new();

        // Current active timezone (default: Asia/Jakarta / WIB)
        private static TimeZoneInfo _currentTimeZone = ResolveDefaultTimezone();

        // Store the IANA/Windows ID for display purposes
        private static string _currentTimezoneId = "Asia/Jakarta";

        private static TimeZoneInfo ResolveDefaultTimezone()
        {
            // Try Windows ID first, then IANA, then manual UTC+7 fallback
            foreach (var id in new[] { "SE Asia Standard Time", "Asia/Jakarta" })
            {
                try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
                catch { /* try next */ }
            }
            return TimeZoneInfo.CreateCustomTimeZone("WIB", TimeSpan.FromHours(7), "WIB", "WIB");
        }

        /// <summary>
        /// Gets the currently configured timezone ID (IANA or Windows).
        /// </summary>
        public static string CurrentTimezoneId
        {
            get { lock (_lock) { return _currentTimezoneId; } }
        }

        /// <summary>
        /// Gets the current Date &amp; Time in the configured timezone.
        /// </summary>
        public static DateTime Now
        {
            get
            {
                lock (_lock)
                {
                    return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _currentTimeZone);
                }
            }
        }

        /// <summary>
        /// Gets current Date (midnight) in the configured timezone.
        /// </summary>
        public static DateTime Today => Now.Date;

        /// <summary>
        /// Gets the display label for the current timezone (e.g. "WIB (UTC+7)").
        /// </summary>
        public static string TimezoneLabel
        {
            get
            {
                lock (_lock)
                {
                    var offset = _currentTimeZone.BaseUtcOffset;
                    string sign = offset >= TimeSpan.Zero ? "+" : "-";
                    string offsetStr = offset.Minutes == 0
                        ? $"UTC{sign}{Math.Abs(offset.Hours)}"
                        : $"UTC{sign}{Math.Abs(offset.Hours)}:{Math.Abs(offset.Minutes):D2}";
                    return $"{_currentTimeZone.DisplayName} ({offsetStr})";
                }
            }
        }

        /// <summary>
        /// Changes the active timezone at runtime. 
        /// Accepts both IANA IDs (e.g. "Asia/Jakarta") and Windows IDs (e.g. "SE Asia Standard Time").
        /// Call this on application startup after reading from App_Settings.
        /// </summary>
        /// <param name="timezoneId">IANA or Windows timezone identifier.</param>
        /// <returns>True if the timezone was successfully applied; false if ID is invalid.</returns>
        public static bool SetTimezone(string timezoneId)
        {
            if (string.IsNullOrWhiteSpace(timezoneId)) return false;

            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(timezoneId);
                lock (_lock)
                {
                    _currentTimeZone = tz;
                    _currentTimezoneId = timezoneId;
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Converts any DateTime to the currently configured timezone.
        /// </summary>
        public static DateTime ToConfiguredTime(this DateTime dt)
        {
            if (dt == default || dt == DateTime.MinValue) return Now;

            TimeZoneInfo tz;
            lock (_lock) { tz = _currentTimeZone; }

            return dt.Kind switch
            {
                DateTimeKind.Utc => TimeZoneInfo.ConvertTimeFromUtc(dt, tz),
                DateTimeKind.Unspecified => TimeZoneInfo.ConvertTimeFromUtc(
                    DateTime.SpecifyKind(dt, DateTimeKind.Utc), tz),
                _ => TimeZoneInfo.ConvertTime(dt, tz)
            };
        }

        /// <summary>
        /// Backwards-compatible alias — converts to configured timezone (same as ToConfiguredTime).
        /// </summary>
        public static DateTime ToJakartaTime(this DateTime dt) => dt.ToConfiguredTime();
    }
}
