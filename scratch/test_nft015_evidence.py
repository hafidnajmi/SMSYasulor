"""
test_nft015_evidence.py - NFT-015 Multi-Currency Schema & Exchange Rates Audit Test

Audits:
1. Verification of dbo.EXCHANGE_RATES table creation and seed data (USD, EUR, JPY, SGD, IDR).
2. Currency conversion math: USD -> IDR, EUR -> USD, etc.
3. Multi-currency formatting helper (format_currency) for UI display.
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

from database import Database
from utils.i18n import format_currency

def test_nft015_multi_currency():
    print("====================================================")
    print("   NFT-015 MULTI-CURRENCY SCHEMA & ENGINE AUDIT     ")
    print("====================================================\n")

    db = Database()
    db._migrate_multi_currency_support()

    # Step 1: Migration check
    print("=== [NFT-015 STEP 1] Database Exchange Rates Table Audit ===")
    rates = db.get_exchange_rates()
    print(f"  [*] Total Active Currencies Configured: {len(rates)}")
    for r in rates:
        print(f"      - {r['currency_code']:4s} ({r['symbol']:2s}) : 1 {r['currency_code']} = {float(r['rate_to_idr']):,.2f} IDR")

    assert len(rates) >= 5, "Must have at least 5 default currencies (IDR, USD, EUR, JPY, SGD)"
    print("  ✓ Database EXCHANGE_RATES schema & seed data verified PASSED.\n")

    # Step 2: Currency conversion calculation
    print("=== [NFT-015 STEP 2] Currency Conversion Math Audit ===")
    usd_amount = 100.0
    idr_converted = db.convert_currency(usd_amount, from_curr="USD", to_curr="IDR")
    print(f"  [*] $100.00 USD -> IDR = Rp {idr_converted:,.2f}")
    assert idr_converted == 1580000.0, f"Expected 1,580,000 IDR, got {idr_converted}"

    eur_amount = 100.0
    usd_converted = db.convert_currency(eur_amount, from_curr="EUR", to_curr="USD")
    print(f"  [*] €100.00 EUR -> USD = ${usd_converted:,.2f}")
    assert round(usd_converted, 2) == 108.86, f"Expected 108.86 USD, got {usd_converted}"
    print("  ✓ Currency conversion math & rates engine verified PASSED.\n")

    # Step 3: UI Currency Formatting Helper
    print("=== [NFT-015 STEP 3] UI Currency Formatting Audit ===")
    fmt_idr = format_currency(1580000, "IDR")
    fmt_usd = format_currency(100.00, "USD")
    fmt_eur = format_currency(100.00, "EUR")
    fmt_jpy = format_currency(150000, "JPY")

    print(f"  - Formatted IDR: '{fmt_idr}'")
    print(f"  - Formatted USD: '{fmt_usd}'")
    print(f"  - Formatted EUR: '{fmt_eur}'")
    print(f"  - Formatted JPY: '{fmt_jpy}'")

    assert "Rp" in fmt_idr, "IDR formatting must include Rp"
    assert "$" in fmt_usd, "USD formatting must include $"
    assert "€" in fmt_eur, "EUR formatting must include €"
    assert "¥" in fmt_jpy, "JPY formatting must include ¥"
    print("  ✓ UI Multi-Currency Formatter verified PASSED.\n")

    print("====================================================")
    print("[RESULT] NFT-015 AUDIT STATUS: ALL TESTS PASSED (MULTI-CURRENCY READY)")
    print("====================================================")

if __name__ == "__main__":
    test_nft015_multi_currency()
