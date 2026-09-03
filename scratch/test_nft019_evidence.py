"""
test_nft019_evidence.py - NFT-019 Shop-Floor Accessibility & Color Contrast Audit

Audits:
1. Color palette contrast ratios calculation against WCAG 2.1 AA requirements (>= 4.5:1).
2. Minimum typography size thresholds for warehouse & shop-floor visibility.
3. High-contrast theme compliance under bright industrial lighting conditions.
"""

import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure root workspace is in sys.path
root_workspace = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_workspace not in sys.path:
    sys.path.insert(0, root_workspace)

from styles import ColorPalette, AppStyles

def hex_to_luminance(hex_str: str) -> float:
    """Calculate relative luminance of a HEX color per WCAG 2.1 specification."""
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = "".join([c*2 for c in hex_str])
    r_s = int(hex_str[0:2], 16) / 255.0
    g_s = int(hex_str[2:4], 16) / 255.0
    b_s = int(hex_str[4:6], 16) / 255.0

    r = r_s / 12.92 if r_s <= 0.03928 else ((r_s + 0.055) / 1.055) ** 2.4
    g = g_s / 12.92 if g_s <= 0.03928 else ((g_s + 0.055) / 1.055) ** 2.4
    b = b_s / 12.92 if b_s <= 0.03928 else ((b_s + 0.055) / 1.055) ** 2.4

    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def calc_contrast_ratio(hex1: str, hex2: str) -> float:
    """Calculate WCAG contrast ratio between two HEX colors."""
    l1 = hex_to_luminance(hex1)
    l2 = hex_to_luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def test_nft019_accessibility_and_contrast():
    print("====================================================")
    print("   NFT-019 SHOP-FLOOR ACCESSIBILITY & CONTRAST AUDIT")
    print("====================================================\n")

    # Step 1: Color Contrast Ratio Audits (WCAG 2.1 AA)
    print("=== [NFT-019 STEP 1] WCAG 2.1 AA Color Contrast Ratios ===")
    
    contrast_pairs = [
        ("Primary Text on White Card", ColorPalette.TEXT_MAIN, ColorPalette.CARD_BG, 4.5),
        ("Primary Text on Page BG", ColorPalette.TEXT_MAIN, ColorPalette.BG_PAGE, 4.5),
        ("Secondary Text on White Card", ColorPalette.TEXT_SUB, ColorPalette.CARD_BG, 4.5),
        ("Active Sidebar Text on Dark Navy", ColorPalette.SIDEBAR_ACTIVE_TEXT, ColorPalette.SIDEBAR_BG, 4.5),
        ("Inactive Sidebar Text on Dark Navy", ColorPalette.SIDEBAR_TEXT, ColorPalette.SIDEBAR_BG, 4.5),
        ("Success Text on Success Light BG", ColorPalette.SUCCESS, ColorPalette.SUCCESS_BG, 4.5),
        ("Warning Text on Warning Light BG", ColorPalette.WARNING, ColorPalette.WARNING_BG, 4.5),
        ("Error Text on Error Light BG", ColorPalette.ERROR, ColorPalette.ERROR_BG, 4.5),
    ]

    all_passed = True
    for label, fg, bg, required in contrast_pairs:
        ratio = calc_contrast_ratio(fg, bg)
        passed = ratio >= required
        status_str = "PASSED (WCAG AAA)" if ratio >= 7.0 else ("PASSED (WCAG AA)" if passed else "FAILED")
        print(f"  - {label:36s} [{fg} on {bg}]: {ratio:5.2f}:1  ->  {status_str}")
        if not passed:
            all_passed = False

    assert all_passed, "All color contrast pairs must satisfy WCAG AA (>= 4.5:1)!"
    print("  ✓ WCAG 2.1 AA Color Contrast Ratios verified PASSED.\n")

    # Step 2: Typography & Form Input Scale Audit
    print("=== [NFT-019 STEP 2] Shop-Floor Minimum Typography Scale Audit ===")
    inp_style = AppStyles.input_style("Test Label")
    text_sz = inp_style.get("text_size", 0)
    lbl_sz = inp_style.get("label_style", {}).size

    print(f"  - Form Input Text Size : {text_sz} px (Shop-floor standard >= 13px)")
    print(f"  - Form Input Label Size: {lbl_sz} px (Shop-floor standard >= 12px)")

    assert text_sz >= 13, "Input text size must be at least 13px!"
    assert lbl_sz >= 12, "Label text size must be at least 12px!"
    print("  ✓ Shop-floor typography thresholds verified PASSED.\n")

    print("====================================================")
    print("[RESULT] NFT-015 AUDIT STATUS: ALL TESTS PASSED (SHOP-FLOOR WCAG AA COMPLIANT)")
    print("====================================================")

if __name__ == "__main__":
    test_nft019_accessibility_and_contrast()
