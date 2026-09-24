# System Management Sparepart (SMS) — System Migration Analysis

> **Target Architecture:** ASP.NET Core 8.0 Web Application (MVC / Razor Views)  
> **Source Platform:** Python 3.13 / Flet Desktop Application (SMS v4.27.0 / v8.10.3)  
> **Database:** Existing Microsoft SQL Server (`UPMS_Database`) — NO Database Schema Changes in Phase 1  
> **Date:** August 24, 2026  

---

## 1. Existing Module List

The Python/Flet desktop application consists of 19 operational view components and helper utilities:

1. **System Portal / System Selection** (`system_selection_view.py`) — Initial gateway screen for system entry.
2. **Login & Session Management** (`login_view.py`, `utils/auth_helper.py`) — User authentication against SQL Server, bcrypt validation, session state management.
3. **Main Shell / Layout & Navigation** (`main_view.py`) — Desktop window shell with collapsible sidebar navigation, top bar profile, dynamic route rendering, and server-side RBAC menu filtering.
4. **Dashboard & Executive Analytics** (`dashboard_view.py`) — Real-time inventory overview, 4 KPI cards (Total Items, Low Stock Alert, Outgoing Cost, Pending Approvals), Stock Status donut chart, Cost per Line interactive chart, Top 5 Low Stock list, Recent Activity Feed, 3 Cost Insights cards.
5. **Master Data Sparepart Catalog** (`master_data_view.py`, `master_data_page.py`, `sparepart_detail_view.py`) — Sparepart master registry, atomic `UPF-XXXXX` sequence generator, 50-item pagination, multi-field filtering (Area, Category, Frequency, BIN), auto Safety Stock calculation, multi-line compatibility mapping, Excel export, soft-delete enforcement (`is_deleted=1`).
6. **Barang Masuk / Incoming Goods** (`barang_masuk_view.py`) — Stock increment transactions, auto-fill from BIN/Item lookup, supplier selection, PO tracking, price updates, direct submit vs pending list batch commit.
7. **Barang Keluar / Outgoing Goods** (`barang_keluar_view.py`) — Stock decrement transactions, webcam/hardware barcode scanner integration, manual barcode entry, scan queue, detail form (Line, Machine, Qty, PIC, Maintenance Type, Remarks), default carry-over toggle, approval routing (`require_approval_keluar`).
8. **Riwayat Transaksi / Transaction History** (`history_view.py`) — Dual-tab transaction log (Barang Masuk & Barang Keluar), multi-field search, year dropdown filter, summary KPI cards per tab, Excel export.
9. **Admin Management & Procurement** (`admin_management_view.py`) — 4 administrative tabs:
   - **Tab 1: Inventory & Procurement View** — Total valuation, supplier per sparepart mapping, set primary supplier, add/delete supplier offers.
   - **Tab 2: Bidding View** — Annual tender records, stage tracking, pricing comparison.
   - **Tab 3: Approval Barang Keluar** — Queue for pending user stock deduction requests (Approve/Reject).
   - **Tab 4: Approval Sparepart Mapping** — Review auto-learned sparepart-line compatibility suggestions.
10. **Master Machine** (`master_machine_view.py`) — Production machine registry (Code, Name, Type, Line, Status: Active/Inactive, Area, Manufacturer, Model).
11. **Machine Sparepart Mapping** (`sparepart_machine_view.py`) — Installed parts, consumption history, and reliability analysis per machine.
12. **Cost Intelligence** (`cost_intelligence_view.py`) — Financial analytics: custom date range filter, KPI totals, Cost per Line tab with Top 5 bar chart and line drilldown, Cost per Machine tab with Top 5 chart and machine drilldown, Excel export.
13. **Line Compatibility Center** (`line_mapping_view.py`, `compatibility_center_view.py`) — Self-learning engine for sparepart-to-production-line compatibility (Approved, Pending, Auto-suggested).
14. **Electrical Parts Catalog** (`electrical_parts_view.py`) — Specialized management sub-module for electrical components.
15. **Supplier Master Data** (`supplier_view.py`) — Vendor directory (Name, Address, Email, Phone, PIC).
16. **Bidding & Tender Management** (`bidding_view.py`) — Annual supplier bidding workflow, stage management (1st Stage, Additional), price comparison, budget code assignments.
17. **Settings & User RBAC Management** (`settings_view.py`) — User account CRUD, bcrypt password hashing, role assignment (Admin, User, Supervisor), 11 granular permission flags, approval requirement toggle.
18. **Email Settings & Automation** (`email_settings_view.py`, `utils/email_service.py`, `utils/email_scheduler.py`) — SMTP configuration, recipient management, alert threshold configuration, automated background low-stock email scheduler, cooldown enforcement.
19. **Operator View** (`operator_view.py`) — Simplified kiosk/touch-friendly interface for shop-floor technicians executing outgoing transactions.

---

## 2. Existing Screen / Page List

| Old Screen File | Primary UI Purpose | Key Interactive Elements |
|-----------------|-------------------|--------------------------|
| `system_selection_view.py` | Portal Selection | App launch cards for system portal selection |
| `login_view.py` | User Authentication | Username/Password inputs, login submit, error alert |
| `main_view.py` | Shell / Layout Shell | Sidebar navigation menu, user profile info, header title |
| `dashboard_view.py` | Dashboard Overview | 4 KPI Cards, Donut Chart, Line Chart, Top 5 Table, Activity Feed |
| `master_data_view.py` | Master Sparepart List | Data table with pagination, search, filters, Add/Edit modal, Export button |
| `barang_masuk_view.py` | Incoming Goods Form | Reference search, form input, pending item table, Direct/Batch submit |
| `barang_keluar_view.py` | Outgoing Goods Form | Barcode camera preview/input, scan queue list, detail form, approval trigger |
| `history_view.py` | Transaction History | Dual tabs (Masuk/Keluar), year filter, search bar, summary cards, Export button |
| `admin_management_view.py` | Admin & Procurement | 4 tabs (Procurement View, Bidding View, Approval Keluar, Approval Mapping) |
| `master_machine_view.py` | Machine Management | Machine data table, filter by Line/Status, Add/Edit modal |
| `sparepart_machine_view.py` | Machine Asset Mapping | Line selector, machine list, Installed/Consumption/Analysis tabs |
| `cost_intelligence_view.py` | Cost Analytics | Date pickers, KPI cards, Cost per Line tab + chart, Cost per Machine tab + chart |
| `line_mapping_view.py` | Compatibility Center | Status filters (Approved/Pending/Suggested), Add/Edit/Approve mapping modal |
| `electrical_parts_view.py` | Electrical Parts Catalog | Stock table, search bar, Add/Edit component modal |
| `supplier_view.py` | Master Supplier Directory | Supplier table, Add/Edit supplier modal |
| `bidding_view.py` | Tender Management | Year selector, stage filter, bidding record table, Export button |
| `settings_view.py` | User & RBAC Settings | User table, Add/Edit User modal, 11 permission checkboxes, password reset |
| `email_settings_view.py` | Email & Alert Settings | SMTP configuration form, recipient list, test email button |
| `operator_view.py` | Operator Kiosk Screen | Simplified barcode scan & quick outgoing form |

---

## 3. Existing User Roles & Permission Matrix

### Roles Defined:
1. **Admin (`admin`)**: Unrestricted access. Bypasses all granular permission checks. Can access user settings, approval workflows, procurement valuation, and system configuration.
2. **User (`user`)**: Granular access based on 11 boolean permission flags set on their row in `dbo.Users`.
3. **Supervisor (`supervisor`)**: Sub-role of User with additional operational privileges.
4. **Operator (`operator`)**: Shop-floor technician role routed directly to `OperatorView` for quick outgoing goods processing.

### Permission Flags Matrix in `dbo.Users`:

| Granular Flag Column | Feature Access | Admin | User Default | Operator Default |
|----------------------|----------------|:-----:|:------------:|:----------------:|
| `can_master_data` | Master Data Sparepart Catalog | Yes | 1 | 0 |
| `can_admin_mgmt` | Admin Management & Procurement | Yes | 1 | 0 |
| `can_bidding` | Bidding & Tender Management | Yes | 1 | 0 |
| `can_settings` | Settings & User Management | Yes | 0 | 0 |
| `can_barang_masuk` | Barang Masuk (Incoming Goods) | Yes | 1 | 0 |
| `can_riwayat` | Transaction History | Yes | 1 | 0 |
| `can_restroom` | Facility / Restroom Spareparts | Yes | 0 | 0 |
| `can_supplier_data` | Master Supplier Directory | Yes | 0 | 0 |
| `can_email_settings` | Email & SMTP Configuration | Yes | 0 | 0 |
| `can_barang_keluar` | Barang Keluar (Outgoing Goods) | Yes | 1 | 1 |
| `can_line_mapping` | Line Compatibility Center | Yes | 0 | 0 |
| `require_approval_keluar` | Outgoing Goods Require Approval | No (0) | Configurable | Configurable |

---

## 4. Existing Database Schema & Table Structure

The application connects to SQL Server database `UPMS_Database` containing 17 primary tables and 5 SEQUENCE objects:

```
                  ┌─────────────────────────────────────────┐
                  │               dbo.Users                 │
                  └────────────────────┬────────────────────┘
                                       │ 1:N
                  ┌────────────────────┴────────────────────┐
                  │            dbo.Audit_Log                │
                  └─────────────────────────────────────────┘

┌────────────────────────┐    1:N   ┌────────────────────────┐    1:N   ┌────────────────────────┐
│    dbo.Master_Data     ├──────────┤   dbo.Barang_Masuk     ├──────────┤   dbo.Supplier_Offer   │
└───────────┬────────────┘          └────────────────────────┘          └───────────┬────────────┘
            │                                                                       │ N:1
            │ 1:N                   ┌────────────────────────┐          ┌───────────┴────────────┐
            ├───────────────────────┤   dbo.Barang_Keluar    │          │      dbo.Supplier      │
            │                       └────────────────────────┘          └───────────┴────────────┘
            │ 1:N                   ┌────────────────────────┐
            ├───────────────────────┤dbo.SPAREPART_LINE_MAPP │
            │                       └────────────────────────┘
            │ 1:N                   ┌────────────────────────┐
            ├───────────────────────┤dbo.SPAREPART_PRICE_HIS │
            │                       └────────────────────────┘
            │ 1:N                   ┌────────────────────────┐
            └───────────────────────┤  dbo.Bidding_History   │
                                    └────────────────────────┘
```

---

## 5. Existing Business Rules & Workflows

1. **Safety Stock Formula**:
   $$\text{Safety Stock} = \left(\frac{\text{Qty Need per Year}}{12}\right) \times \text{Lead Time (Months)} \times \text{Safety Factor}$$
   - Where `Safety Factor = 1.0` if `frequency == 'FAST'`, and `0.5` if `frequency == 'SLOW'`.

2. **Atomic Stock Decrement (Barang Keluar)**:
   - When a user submits an outgoing transaction, `current_stock` is updated: `current_stock = current_stock - qty`.
   - If user has `require_approval_keluar = 1`, transaction is created with `approval_status = 'Pending'` and stock is **NOT** decremented until an Admin explicitly approves it in Admin Management.

3. **Atomic Stock Increment (Barang Masuk)**:
   - `current_stock = current_stock + qty`.
   - If unit price is provided in the incoming transaction, `Master_Data.current_unit_price` is updated, and a record is logged in `SPAREPART_PRICE_HISTORY`.

4. **Self-Learning Line Compatibility**:
   - When a sparepart is issued to a line/machine that is not currently recorded in `SPAREPART_LINE_MAPPING`, the system automatically inserts a new mapping record with status `Pending` for Admin review.

5. **Email Alert & Cooldown Logic**:
   - System checks items where `current_stock <= safety_stock` and `alert_selected = 1`.
   - Cooldown period enforcement before re-sending: 14 days for `FAST` frequency items, 30 days for `SLOW` frequency items.

---

## 6. Target ASP.NET Core Web Architecture Mapping

The new web application will use ASP.NET Core 8.0 MVC with Razor Views, Entity Framework Core (SqlServer provider), Bootstrap 5, and JavaScript.

```
/src
    /Web (ASP.NET Core MVC Application)
        Controllers/
            AccountController.cs
            DashboardController.cs
            MasterDataController.cs
            BarangMasukController.cs
            BarangKeluarController.cs
            HistoryController.cs
            AdminManagementController.cs
            MasterMachineController.cs
            CostIntelligenceController.cs
            LineMappingController.cs
            SupplierController.cs
            BiddingController.cs
            SettingsController.cs
            EmailSettingsController.cs
            OperatorController.cs
        Views/
            Shared/_Layout.cshtml (Microsoft Enterprise Corporate Style)
            Dashboard/Index.cshtml
            MasterData/Index.cshtml
            ...
        ViewModels/
        wwwroot/ (css, js, lib, assets)

    /Application (Business Logic & Services)
        Services/
            AuthService.cs
            SparepartService.cs
            InventoryService.cs
            ProcurementService.cs
            CostAnalyticsService.cs
            EmailNotificationService.cs
        Interfaces/
        DTOs/

    /Domain (Entities & Value Objects)
        Entities/ (Matching existing DB tables exactly)
        Enums/

    /Infrastructure (Data Access & Hardware Integrations)
        Data/
            UpmsDbContext.cs (EF Core mapping existing schema)
        Repositories/
```

---

## 7. Migration Risks & Mitigation Strategies

| Risk Factor | Potential Impact | Mitigation Strategy |
|-------------|------------------|---------------------|
| Legacy Password Hashes | Users unable to log in if bcrypt format differs between Python `bcrypt` and .NET `BCrypt.Net` | Maintain exact salt and cost factor compatibility using `BCrypt.Net-Next`. Perform regression test against existing DB user hashes. |
| Non-standard Primary Keys (`UPF-XXXXX`) | EF Core identity generation failure on `Master_Data.id` | Map EF Core entity key value generation to execute SQL Server Sequence (`seq_upf_master`) during entity insertion. |
| Barcode Camera Scanning in Browser | Camera access in web browser differs from desktop OpenCV loop | Implement HTML5 `html5-qrcode` JavaScript scanner library on client side, seamlessly transmitting scanned BIN/Part # into transaction form. |
| High Concurrency Stock Updates | Race conditions causing negative stock or over-decrement | Wrap inventory changes in EF Core Database Transactions with `IsolationLevel.RepeatableRead` or raw SQL atomic updates. |
| Complex SQL Reports & Views | Performance degradation in C# memory LINQ | Implement raw SQL queries / DTO projections with `AsNoTracking()` for analytical dashboards and Excel exports. |
