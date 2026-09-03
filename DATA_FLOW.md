# 🔄 Data Flow & Business Workflows Documentation
### Sparepart Management System (SMS / UPMS.Web)

**Generated:** 1 September 2026  
**Target Repository:** `SMS-Website`  

---

## 1. Domain Note & Scope
*Note:* The repository contains a **Sparepart Management System (SMS)** for industrial plant sparepart inventory. Domain concepts like "Customer Management", "Invoice Creation", or "Invoice PDF Generation" referenced in generic QA templates are **NOT PRESENT** in this application. The actual core domain workflows analyzed below govern **Sparepart Inventory, Inbound/Outbound Stock, Approvals, Procurement Bidding, Machine Mapping, and Cost Analytics**.

---

## 2. Traced Business Workflows

### Workflow 1: User Authentication (Login)
```
User 
  └─► Controller: AccountController.Login [POST]
        └─► Validation: Check empty inputs & check IP-Username brute-force lockout
              └─► Service: AuthService.ValidateUserAsync()
                    └─► Database: Query Users table (BCrypt password check & IsActive check)
                          └─► Service: AuthService.CreateClaimsPrincipal() & UpdateLastLoginAsync()
                                └─► Response/View: Cookie issued, Redirect to Dashboard or Operator index
```
- **User:** Enters Username & Password into `/Account/Login`.
- **Controller:** `AccountController.Login` [POST].
- **Validation:** Verifies input is non-null. Checks in-memory IP lockout state (locks after 5 failed attempts).
- **Service:** `AuthService.ValidateUserAsync()` verifies BCrypt hash against `Users.password_hash`. If invalid, calls `AuthService.LogFailedLoginAsync()`.
- **Database:** `Users` table queried via EF Core `_db.Users.FirstOrDefaultAsync()`. Failed logins logged to `Audit_Log`.
- **Response:** Signs in via HttpContext Cookie `UPMS.Auth`, updates `last_login` timestamp, redirects to `/Dashboard` (or `/Operator` if role is `operator`).

---

### Workflow 2: User Account Creation & Permission Management
```
Admin User 
  └─► Controller: SettingsController.CreateUser / EditUser [POST]
        └─► Validation: Requires [Authorize(Roles = "admin")]. Validates unique username & non-empty password.
              └─► Processing: Hashes raw password using BCrypt (workFactor: 12). If role == admin, auto-enforces full permission flags.
                    └─► Database: Inserts into Users table via _db.Users.Add() / SaveChangesAsync()
                          └─► Response/View: Redirects to /Settings/Index with TempData["Success"] alert.
```
- **User:** Admin clicks "Create User" or "Edit User" in `/Settings`.
- **Controller:** `SettingsController.CreateUser` or `EditUser` [POST].
- **Validation:** Guarded by `[Authorize(Roles = "admin")]` and Anti-Forgery Token. Validates model fields and username uniqueness.
- **Service/Processing:** Hashes password via `BCrypt.Net.BCrypt.HashPassword()`. Sets granular permission flags (`CanMasterData`, `CanAdminMgmt`, etc.).
- **Database:** Writes changes to PostgreSQL `Users` table.
- **Response:** Redirects to `/Settings/Index`. Real-Time Claims Sync Middleware updates target user's active session permissions on their next HTTP request.

---

### Workflow 3: Inbound Stock Addition (Barang Masuk)
```
Operational Staff
  └─► Controller: BarangMasukController.SubmitDirect / SubmitBatch [POST]
        └─► Validation: Checks valid MasterDataId, quantity > 0, unit price >= 0.
              └─► Service: InventoryService.AddBarangMasukAsync()
                    └─► Database Transaction: 
                          1. Inserts record into Barang_Masuk table
                          2. Updates Master_Data.current_stock (stock = current_stock + qty)
                          3. Updates Master_Data.current_unit_price & brand if price provided
                          4. Appends record to SPAREPART_PRICE_HISTORY
                    └─► Response/View: Json success or Redirect to /BarangMasuk/Index.
```
- **User:** Enters inbound part details or scans barcode on `/BarangMasuk`.
- **Controller:** `BarangMasukController.SubmitDirect` or `SubmitBatch` [POST].
- **Validation:** Controller verifies item selection, bin existence, and positive quantity.
- **Service:** `InventoryService.AddBarangMasukAsync()` manages database write.
- **Database:** Atomic execution updates `Barang_Masuk`, increments `Master_Data.current_stock`, updates price history in `SPAREPART_PRICE_HISTORY`.
- **Response:** Updates UI stock display and redirects/returns JSON response.

---

### Workflow 4: Outbound Stock Issuance & Approval Queue (Barang Keluar)
```
Staff / Technician
  └─► Controller: BarangKeluarController.Submit [POST]
        └─► Validation: Validates line, machine, part ID, and requested quantity.
              └─► Service: InventoryService.AddBarangKeluarAsync()
                    └─► Processing: Checks user.RequireApprovalKeluar flag.
                          ├─► If RequireApprovalKeluar == true:
                          │     Inserts into Barang_Keluar with approval_status = 'Pending' (Stock untouched)
                          └─► If RequireApprovalKeluar == false:
                                Inserts into Barang_Keluar (Approved) & immediately decrements Master_Data.current_stock.
                    └─► Response/View: Redirects to /BarangKeluar/Index.

Admin Approval Step (If Pending):
Admin ──► AdminManagementController.ApproveKeluar [POST]
            └─► InventoryService.ApproveBarangKeluarAsync()
                  └─► Database: Updates status to Approved & decrements Master_Data.current_stock atomically.
```
- **User:** Submits sparepart checkout request for machine maintenance.
- **Controller:** `BarangKeluarController.Submit` [POST].
- **Service:** `InventoryService.AddBarangKeluarAsync()` checks approval requirements.
- **Database:** Inserts into `Barang_Keluar`. If instant approval, decrements `Master_Data.current_stock`.
- **Approval Flow:** Admin reviews pending items under `/AdminManagement?tab=approvals` and calls `ApproveKeluar` or `RejectKeluar`.

---

### Workflow 5: Procurement Bidding & Supplier Offer Selection
```
Procurement Staff
  └─► Controller: AdminManagementController.SaveSupplierOfferAjax [POST]
        └─► Validation: Validates masterDataId, supplierName, price > 0.
              └─► Database:
                    1. Auto-creates Supplier if new
                    2. Inserts/Updates Supplier_Offer
                    3. If setAsPrimary == true, sets offer as IsSelected, updates Master_Data.current_unit_price, and inserts into SPAREPART_PRICE_HISTORY
        └─► Response/View: Returns JSON ({ success: true, message: "..." })
```
- **User:** Enters supplier quotation in Procurement tab.
- **Controller:** `AdminManagementController.SaveSupplierOfferAjax` [POST].
- **Database:** Manages relational updates across `Supplier`, `Supplier_Offer`, `Master_Data`, and `SPAREPART_PRICE_HISTORY`.
- **Response:** Asynchronous JSON response rendered dynamically on the procurement table.

---

### Workflow 6: Machine Line Compatibility Matrix Management
```
Engineer
  └─► Controller: LineCompatibilityController.AddLineMapping [POST]
        └─► Validation: Validates sparepartId and target lineName.
              └─► Database: Inserts record into sparepart_line_mapping table (approved = 1, is_active = 1).
                    └─► Response/View: Redirects to /LineCompatibility/Index.
```
- **User:** Maps a sparepart to a production machine line.
- **Controller:** `LineCompatibilityController.AddLineMapping` [POST].
- **Database:** Writes mapping to `sparepart_line_mapping`.
- **Response:** Refresh line compatibility view.

---

### Workflow 7: Cost Intelligence & Financial Reporting
```
Management User
  └─► Controller: CostIntelligenceController.Index / GetLineDrilldownJson [GET]
        └─► Processing: Aggregates total cost, transaction counts, monthly trend growth %, and cost spikes across Barang_Keluar and Machine_Master.
              └─► Response/View: Renders interactive charts and cost breakdown tables.
```
- **User:** Views `/CostIntelligence`.
- **Controller:** `CostIntelligenceController.Index`.
- **Processing:** Calculates monthly cost trends, growth percentages, cost per line/machine, and flags spending spikes.
- **Response:** Returns view with `CostIntelligenceViewModel` and JSON data for interactive drilldowns.

---

### Workflow 8: Excel Export Generation
```
User 
  └─► Controller: MasterDataController / BarangMasukController / HistoryController.ExportExcel [GET]
        └─► Service: ExcelExportService.ExportMasterDataToExcel()
              └─► Processing: ClosedXML queries EF Core, builds styled workbook in memory (.xlsx)
                    └─► Response/View: FileStreamResult (Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
```
- **User:** Clicks "Export Excel" button on any list page.
- **Service:** `ExcelExportService` builds spreadsheet using ClosedXML.
- **Response:** Browser triggers direct binary file download.
