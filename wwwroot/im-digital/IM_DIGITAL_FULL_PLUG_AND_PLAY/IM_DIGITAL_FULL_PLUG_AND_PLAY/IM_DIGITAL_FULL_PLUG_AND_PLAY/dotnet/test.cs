using System;
using System.Text.Json;

public class MyTest
{
    public static void Main()
    {
        string json = "{\"up_data\": {\"jenis_line\": \"TUBE LINE\", \"line\": \"T1\", \"jumlah_nozzel\": \"1\", \"kategori\": \"\"}, \"up_qc_data\": {\"vol_fg\": 50.0, \"density\": 1.03, \"vol_phase1\": 50.0, \"density_phase1\": 1.03, \"vol_phase2\": 50.0, \"density_phase2\": 0.99, \"jenis_produk\": \"Duo\", \"is_sachet\": false}, \"JenisLine\": \"TUBE LINE\", \"Line\": \"T1\", \"JumlahNozzel\": \"1\", \"Kategori\": \"\", \"HasQcData\": true, \"TemplateIm\": \"Normal\", \"Volume\": 50.0, \"Density\": 1.03, \"VolPhase1\": 50.0, \"DenPhase1\": 1.03, \"VolPhase2\": 50.0, \"DenPhase2\": 0.99, \"NamePhase1\": \"PHASE 1\", \"NamePhase2\": \"PHASE 2\"}";
        Console.WriteLine(CheckIsUpFilled(json));
    }

    public static bool CheckIsUpFilled(string json)
    {
            if (string.IsNullOrWhiteSpace(json)) return false;
            try
            {
                using var jsonDoc = System.Text.Json.JsonDocument.Parse(json);
                var root = jsonDoc.RootElement;

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
                        hasLine = !string.IsNullOrWhiteSpace(lineProp.GetString());
                    else if (root.TryGetProperty("line", out var lineProp2))
                        hasLine = !string.IsNullOrWhiteSpace(lineProp2.GetString());
                    else if (root.TryGetProperty("up_data", out var upDataProp) && upDataProp.ValueKind == System.Text.Json.JsonValueKind.Object)
                    {
                        if (upDataProp.TryGetProperty("line", out var lProp))
                            hasLine = !string.IsNullOrWhiteSpace(lProp.GetString());
                        else if (upDataProp.TryGetProperty("jenis_line", out var jlProp))
                            hasLine = !string.IsNullOrWhiteSpace(jlProp.GetString());
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
                    bool hasVol = qcFillElem.TryGetProperty("volumeFg", out var vF) && !string.IsNullOrWhiteSpace(vF.GetString()) && vF.GetString() != "0";
                    bool hasPhase1 = qcFillElem.TryGetProperty("volPhase1", out var vP1) && !string.IsNullOrWhiteSpace(vP1.GetString()) && vP1.GetString() != "0";
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

                return hasLine && hasA4;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
    }
}
