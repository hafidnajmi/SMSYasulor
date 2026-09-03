# System Management Sparepart (SMS) — Regression Test Matrix

> **Purpose:** Side-by-side verification matrix comparing old Python/Flet desktop application against new ASP.NET Core web application.

| Test Feature ID | Feature Name | Old Python/Flet Behavior | New ASP.NET Core Target | Expected Result | Status |
|-----------------|--------------|--------------------------|-------------------------|-----------------|--------|
| REG-01 | User Login | Authenticates against SQL Server `Users` table via bcrypt | Same SQL Server `Users` table via `BCrypt.Net` | Identical session credentials & role assignment | PENDING |
| REG-02 | RBAC Permissions | Hides/shows sidebar buttons based on 11 user flags | Razor layout hides nav items + Controller enforces `[Authorize]` | Unauthorized users blocked at HTTP request level | PENDING |
| REG-03 | Master Data List | 50-item pagination, multi-field dropdown filters | Server-side EF Core pagination & dropdown filters | Identical dataset and filter outcomes | PENDING |
| REG-04 | ID Generation | SQL Server SEQUENCE `seq_upf_master` (`UPF-XXXXX`) | Same SQL Server SEQUENCE calls | Identical ID formatting without race conditions | PENDING |
| REG-05 | Safety Stock | Formula: `(Need/12) * LT * (FAST?1.0:0.5)` | Same domain formula in C# service & JS client | Exact numeric safety stock values | PENDING |
| REG-06 | Barang Masuk | Direct submit & Batch commit increment stock | Same SQL Server transaction & stock increment | Identical stock updates and history logging | PENDING |
| REG-07 | Barang Keluar | Camera OpenCV scan & manual input decrement stock | HTML5 JS camera scanner & manual input decrement | Identical stock deduction and transaction record | PENDING |
| REG-08 | Approval Flow | Pending state if `require_approval_keluar = 1` | Same pending workflow & Admin approval action | Stock decrements only after Admin approval | PENDING |
| REG-09 | History View | Dual-tab (Masuk/Keluar) with year dropdown | Dual-tab MVC view with year dropdown & pagination | Identical historical records and filtering | PENDING |
| REG-10 | Excel Export | `openpyxl` export to Excel spreadsheet | `EPPlus` or `ClosedXML` Excel export | Identical column structure and exported data | PENDING |
| REG-11 | Procurement View | Total inventory valuation & supplier mapping | EF Core query joining Master Data & Supplier Offers | Exact inventory total value calculation | PENDING |
| REG-12 | Cost Intelligence | Cost per Line & Cost per Machine Top 5 charts | Chart.js visual charts with drilldown tables | Identical financial metrics per line/machine | PENDING |
| REG-13 | Email Alerts | Background scheduler sending low-stock emails | Hosted `IHostedService` background email service | Identical alert threshold triggers & cooldown logic | PENDING |
| REG-14 | Machine Master | Active/Inactive machine status filter | Razor view machine data table with status filters | Identical machine registration and dropdown sync | PENDING |
