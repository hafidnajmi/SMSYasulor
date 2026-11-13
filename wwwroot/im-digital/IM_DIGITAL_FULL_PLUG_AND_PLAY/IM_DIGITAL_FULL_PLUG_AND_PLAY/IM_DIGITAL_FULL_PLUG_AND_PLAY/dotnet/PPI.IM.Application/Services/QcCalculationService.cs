using System;
using PPI.IM.Domain.Models;

namespace PPI.IM.Application.Services
{
    public static class ExcelMath
    {
        /// <summary>
        /// Replicates Excel's ROUND function (round half up) instead of C#/Python round to even.
        /// </summary>
        public static double ExcelRound(double val, int ndigits = 1)
        {
            double multiplier = Math.Pow(10, ndigits);
            return Math.Floor(val * multiplier + 0.5) / multiplier;
        }

        public static double DoubleRound(double val)
        {
            double v2 = Math.Floor(val * 100.0 + 0.5) / 100.0;
            return Math.Floor(v2 * 10.0 + 0.5) / 10.0;
        }
    }

    public class QcCalculationService
    {
        public static double GetStatisticalError(double volume)
        {
            (double Thresh, double Err)[] statTable = new[]
            {
                (0.0, 0.379),
                (50.0, 0.379),
                (60.0, 0.344),
                (70.0, 0.317),
                (80.0, 0.295),
                (90.0, 0.277),
                (100.0, 0.262),
                (110.0, 0.249),
                (120.0, 0.238),
                (130.0, 0.229),
                (140.0, 0.220),
                (150.0, 0.213)
            };

            double res = 0.379;
            foreach (var (thresh, err) in statTable)
            {
                if (volume >= thresh)
                    res = err;
                else
                    break;
            }
            return res;
        }

        public static (double L_ml, double L_g) GetLegalTolerances(double volume, double nominal_g)
        {
            if (volume <= 50)
                return (volume * 0.09, nominal_g * 0.09);
            else if (volume <= 100)
                return (4.5, 4.5);
            else if (volume <= 200)
                return (volume * 0.045, nominal_g * 0.045);
            else if (volume <= 300)
                return (9.0, 9.0);
            else if (volume <= 500)
                return (volume * 0.03, nominal_g * 0.03);
            else if (volume < 1000)
                return (15.0, 15.0);
            else
                return (volume * 0.015, nominal_g * 0.015);
        }

        public QcCalculationSummary CalculateImLimits(double volume, double density)
        {
            double pct = 0.045;
            if (volume <= 50) pct = 0.09;
            else if (volume <= 100) pct = 4.5;
            else if (volume <= 200) pct = 0.045;
            else if (volume <= 300) pct = 9.0;
            else if (volume <= 500) pct = 0.03;
            else if (volume < 1000) pct = 15.0;
            else pct = 0.015;

            double s_ml = GetStatisticalError(volume);
            double n_g = volume * density;
            double n_ml = volume;

            var (l_ml, l_g) = GetLegalTolerances(volume, n_g);

            double link_bom_ml_exact = n_ml + s_ml;
            double link_bom_g_exact = link_bom_ml_exact * density;

            var limitsG = new QcLimitResult
            {
                StopMin = ExcelMath.ExcelRound(n_g - l_g, 1),
                AdjMin = ExcelMath.ExcelRound(n_g - (2.0 / 3.0 * l_g), 1),
                Nominal = ExcelMath.ExcelRound(n_g, 1),
                LinkBom = ExcelMath.ExcelRound(link_bom_g_exact, 1),
                RunMax = ExcelMath.ExcelRound(n_g + (1.0 / 3.0 * l_g), 1),
                AdjMax = ExcelMath.ExcelRound(n_g + (2.0 / 3.0 * l_g), 1),
                StopMax = ExcelMath.ExcelRound(n_g + l_g, 1),
                StatError = s_ml,
                SyaratLegal = pct
            };

            double link_bom_ml_from_g = ExcelMath.ExcelRound(limitsG.LinkBom / Math.Round(density, 3), 1);

            var limitsMl = new QcLimitResult
            {
                StopMin = ExcelMath.ExcelRound(n_ml - l_ml, 1),
                AdjMin = ExcelMath.ExcelRound(n_ml - (2.0 / 3.0 * l_ml), 1),
                Nominal = ExcelMath.ExcelRound(n_ml, 1),
                LinkBom = link_bom_ml_from_g,
                RunMax = ExcelMath.ExcelRound(n_ml + (1.0 / 3.0 * l_ml), 1),
                AdjMax = ExcelMath.ExcelRound(n_ml + (2.0 / 3.0 * l_ml), 1),
                StopMax = ExcelMath.ExcelRound(n_ml + l_ml, 1),
                StatError = s_ml,
                SyaratLegal = pct
            };

            return new QcCalculationSummary
            {
                LimitsGram = limitsG,
                LimitsMl = limitsMl
            };
        }

        public QcCalculationSummary CalculateSachetLimits(double volume, double density)
        {
            double pct = 0.045;
            if (volume <= 50) pct = 0.09;
            else if (volume <= 500) pct = 0.03;

            double s_ml = GetStatisticalError(volume);
            double n_g = volume * density;
            double n_ml = volume;
            double l_ml = s_ml;

            var limitsMl = new QcLimitResult
            {
                StopMin = ExcelMath.ExcelRound(n_ml - l_ml, 1),
                AdjMin = ExcelMath.ExcelRound(n_ml - (2.0 / 3.0 * l_ml), 1),
                RunMin = ExcelMath.ExcelRound(n_ml - (1.0 / 3.0 * l_ml), 1),
                Nominal = ExcelMath.ExcelRound(n_ml, 1),
                LinkBom = ExcelMath.ExcelRound(n_ml + s_ml, 1),
                RunMax = ExcelMath.ExcelRound(n_ml + (1.0 / 3.0 * l_ml), 1),
                AdjMax = ExcelMath.ExcelRound(n_ml + (2.0 / 3.0 * l_ml), 1),
                StopMax = ExcelMath.ExcelRound(ExcelMath.ExcelRound(n_ml + s_ml, 1) + 0.1, 1),
                StatError = ExcelMath.ExcelRound(s_ml, 3),
                SyaratLegal = pct
            };

            var limitsG = new QcLimitResult
            {
                StopMin = ExcelMath.DoubleRound(limitsMl.StopMin * density),
                AdjMin = ExcelMath.DoubleRound(limitsMl.AdjMin * density),
                RunMin = ExcelMath.DoubleRound(limitsMl.RunMin * density),
                Nominal = ExcelMath.DoubleRound(limitsMl.Nominal * density),
                LinkBom = ExcelMath.DoubleRound(limitsMl.LinkBom * density),
                RunMax = ExcelMath.DoubleRound(limitsMl.RunMax * density),
                AdjMax = ExcelMath.DoubleRound(limitsMl.AdjMax * density),
                StopMax = ExcelMath.DoubleRound(ExcelMath.DoubleRound(limitsMl.LinkBom * density) + 0.1),
                StatError = ExcelMath.ExcelRound(s_ml * density, 3),
                SyaratLegal = pct
            };

            return new QcCalculationSummary
            {
                LimitsGram = limitsG,
                LimitsMl = limitsMl
            };
        }

        public DuoQcCalculationSummary CalculateDuoLimits(double vol1, double den1, double vol2, double den2, bool isSachet = false, bool isBiphase = false)
        {
            if (isSachet)
            {
                var s1 = CalculateSachetLimits(vol1, den1);
                var s2 = CalculateSachetLimits(vol2, den2);

                double volTot = vol1 + vol2;
                double pctTot = volTot <= 50 ? 0.09 : 0.045;

                var totalG = new QcLimitResult
                {
                    StopMin = Math.Round(s1.LimitsGram.StopMin + s2.LimitsGram.StopMin, 1),
                    AdjMin = Math.Round(s1.LimitsGram.AdjMin + s2.LimitsGram.AdjMin, 1),
                    RunMin = Math.Round(s1.LimitsGram.RunMin + s2.LimitsGram.RunMin, 1),
                    Nominal = Math.Round(s1.LimitsGram.Nominal + s2.LimitsGram.Nominal, 1),
                    LinkBom = Math.Round(s1.LimitsGram.LinkBom + s2.LimitsGram.LinkBom, 1),
                    RunMax = Math.Round(s1.LimitsGram.RunMax + s2.LimitsGram.RunMax, 1),
                    AdjMax = Math.Round(s1.LimitsGram.AdjMax + s2.LimitsGram.AdjMax, 1),
                    StopMax = Math.Round(s1.LimitsGram.StopMax + s2.LimitsGram.StopMax, 1),
                    StatError = Math.Round(s1.LimitsGram.StatError + s2.LimitsGram.StatError, 3),
                    SyaratLegal = pctTot
                };

                var totalMl = new QcLimitResult
                {
                    StopMin = Math.Round(s1.LimitsMl.StopMin + s2.LimitsMl.StopMin, 1),
                    AdjMin = Math.Round(s1.LimitsMl.AdjMin + s2.LimitsMl.AdjMin, 1),
                    RunMin = Math.Round(s1.LimitsMl.RunMin + s2.LimitsMl.RunMin, 1),
                    Nominal = Math.Round(s1.LimitsMl.Nominal + s2.LimitsMl.Nominal, 1),
                    LinkBom = Math.Round(s1.LimitsMl.LinkBom + s2.LimitsMl.LinkBom, 1),
                    RunMax = Math.Round(s1.LimitsMl.RunMax + s2.LimitsMl.RunMax, 1),
                    AdjMax = Math.Round(s1.LimitsMl.AdjMax + s2.LimitsMl.AdjMax, 1),
                    StopMax = Math.Round(s1.LimitsMl.StopMax + s2.LimitsMl.StopMax, 1),
                    StatError = s1.LimitsMl.StatError,
                    SyaratLegal = pctTot
                };

                return new DuoQcCalculationSummary
                {
                    Phase1 = s1,
                    Phase2 = s2,
                    Total = new QcCalculationSummary { LimitsGram = totalG, LimitsMl = totalMl }
                };
            }
            else if (isBiphase)
            {
                var s1 = CalculateImLimits(vol1, den1);
                var s2 = CalculateImLimits(vol2, den2);

                double volTot = vol1 + vol2;
                double denTot = volTot > 0 ? ((vol1 * den1 + vol2 * den2) / volTot) : 1.0;
                var totalSummary = CalculateImLimits(volTot, denTot);

                return new DuoQcCalculationSummary
                {
                    Phase1 = s1,
                    Phase2 = s2,
                    Total = totalSummary
                };
            }
            else
            {
                var s1 = CalculateImLimits(vol1, den1);
                var s2 = CalculateImLimits(vol2, den2);

                // For Duo Phase, Syarat Legal is standard 0.090 and Link BOM uses Statistical Error table
                s1.LimitsGram.SyaratLegal = 0.090;
                s1.LimitsMl.SyaratLegal = 0.090;
                s2.LimitsGram.SyaratLegal = 0.090;
                s2.LimitsMl.SyaratLegal = 0.090;

                var totalG = new QcLimitResult
                {
                    StopMin = Math.Round(s1.LimitsGram.StopMin + s2.LimitsGram.StopMin, 1),
                    AdjMin = Math.Round(s1.LimitsGram.AdjMin + s2.LimitsGram.AdjMin, 1),
                    RunMin = Math.Round(s1.LimitsGram.RunMin + s2.LimitsGram.RunMin, 1),
                    Nominal = Math.Round(s1.LimitsGram.Nominal + s2.LimitsGram.Nominal, 1),
                    LinkBom = Math.Round(s1.LimitsGram.LinkBom + s2.LimitsGram.LinkBom, 1),
                    RunMax = Math.Round(s1.LimitsGram.RunMax + s2.LimitsGram.RunMax, 1),
                    AdjMax = Math.Round(s1.LimitsGram.AdjMax + s2.LimitsGram.AdjMax, 1),
                    StopMax = Math.Round(s1.LimitsGram.StopMax + s2.LimitsGram.StopMax, 1),
                    StatError = Math.Round(s1.LimitsGram.StatError + s2.LimitsGram.StatError, 3),
                    SyaratLegal = 0.090
                };

                var totalMl = new QcLimitResult
                {
                    StopMin = Math.Round(s1.LimitsMl.StopMin + s2.LimitsMl.StopMin, 1),
                    AdjMin = Math.Round(s1.LimitsMl.AdjMin + s2.LimitsMl.AdjMin, 1),
                    RunMin = Math.Round(s1.LimitsMl.RunMin + s2.LimitsMl.RunMin, 1),
                    Nominal = Math.Round(s1.LimitsMl.Nominal + s2.LimitsMl.Nominal, 1),
                    LinkBom = Math.Round(s1.LimitsMl.LinkBom + s2.LimitsMl.LinkBom, 1),
                    RunMax = Math.Round(s1.LimitsMl.RunMax + s2.LimitsMl.RunMax, 1),
                    AdjMax = Math.Round(s1.LimitsMl.AdjMax + s2.LimitsMl.AdjMax, 1),
                    StopMax = Math.Round(s1.LimitsMl.StopMax + s2.LimitsMl.StopMax, 1),
                    StatError = s1.LimitsMl.StatError,
                    SyaratLegal = 0.090
                };

                return new DuoQcCalculationSummary
                {
                    Phase1 = s1,
                    Phase2 = s2,
                    Total = new QcCalculationSummary { LimitsGram = totalG, LimitsMl = totalMl }
                };
            }
        }
    }
}
