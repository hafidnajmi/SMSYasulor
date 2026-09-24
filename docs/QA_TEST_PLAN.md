# 🧪 QA Functional Test Plan
### Sparepart Management System (SMS / UPMS.Web)

**Generated:** 1 September 2026  
**Target Repository:** `SMS-Website`  

---

## 1. Test Scope & Overview
This functional QA test plan validates core user journeys, access controls, business logic enforcement, stock atomic operations, and reporting across the Sparepart Management System.

---

## 2. Comprehensive Test Suite

### Module 1: Authentication & Session Management

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| **AUTH-01** | User Login (Valid Credentials) | Active account exists in database | 1. Navigate to `/Account/Login`<br>2. Enter valid username & password<br>3. Click "SIGN IN" | User logged in successfully, redirected to `/Dashboard` (or `/Operator` if role is `operator`), authentication cookie `UPMS.Auth` issued. | High |
| **AUTH-02** | User Login (Invalid Password) | Account exists | 1. Navigate to `/Account/Login`<br>2. Enter valid username & wrong password<br>3. Click "SIGN IN" | Login rejected with error message "Invalid username or password." Failed attempt logged in `Audit_Log`. | High |
| **AUTH-03** | Brute Force Lockout | User on Login page | 1. Enter wrong password 5 consecutive times | Account/IP locked out for 15 minutes with message "Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit." | High |
| **AUTH-04** | User Logout | User is logged in | 1. Click Logout button in top navigation bar | Session terminated, `UPMS.Auth` cookie cleared, redirected to `/Account/Login`. | High |
| **AUTH-05** | Inactive User Block | User status set to `is_active = false` | 1. Attempt login with valid credentials for inactive user | Login denied with message "Invalid username or password." Active sessions auto-invalidated by Claims Sync Middleware. | High |

---

### Module 2: Authorization & Role Access Controls

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| **ROLES-01**| Admin Role Full Access | Logged in as `admin` | 1. Access `/Settings`<br>2. Access `/AdminManagement`<br>3. Access `/Supplier` | All administrative menus accessible without redirection. | High |
| **ROLES-02**| User Role Permission Gate | Logged in as `user` without `CanSettings` | 1. Navigate directly to `/Settings` URL | Redirected to `/Home/Index` (Access Denied behavior). | High |
| **ROLES-03**| Dynamic Permission Grant | Logged in as `user` without `CanAdminMgmt` | 1. Admin grants `CanAdminMgmt = 1` in Settings<br>2. User refreshes browser | User immediately gains access to `/AdminManagement` on next request without manual re-login. | High |
| **ROLES-04**| Operator Role Portal Redirect | Logged in as `operator` | 1. Log in with `operator` role account | Automatically redirected to `/Operator/Index` shop-floor interface. | Medium |

---

### Module 3: User Management (`/Settings`)

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| **USER-01** | Create New User Account | Logged in as `admin` | 1. Fill username, full name, role, password<br>2. Select granular permissions<br>3. Click Submit | User created in database with BCrypt hashed password. Success banner displayed. | High |
| **USER-02** | Prevent Duplicate Username | Logged in as `admin` | 1. Try to create user with existing username | Form rejected with message "Username '...' sudah digunakan oleh user lain." | Medium |
| **USER-03** | Toggle User Active Status | Logged in as `admin` | 1. Click Toggle Status on user list | User status switches between Active and Inactive. | High |
| **USER-04** | Root Admin Protection | Logged in as `admin` | 1. Attempt to delete or deactivate root `admin` user | System prevents action with error "User root 'admin' tidak dapat dihapus/dinonaktifkan." | High |

---

### Module 4: Master Sparepart Catalog (`/MasterData`)

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| **SPARE-01**| Add Master Sparepart | Logged in user | 1. Click "Add Sparepart"<br>2. Enter Part ID, Item Name, Bin, Category, Safety Stock<br>3. Submit form | Record created in `Master_Data` table. Item appears in catalog list. | High |
| **SPARE-02**| Edit Sparepart Details | Sparepart exists | 1. Click Edit on item<br>2. Update unit price or safety stock<br>3. Save changes | `Master_Data` updated. Price history recorded in `SPAREPART_PRICE_HISTORY`. | High |
| **SPARE-03**| Soft Delete Sparepart | Sparepart exists | 1. Click Delete on item and confirm | `is_deleted` set to `true`. Item hidden from standard catalog view. | Medium |
| **SPARE-04**| Low Stock Alert Filter | Items exist with stock <= safety stock | 1. Filter catalog by "Critical Stock" | Only items with `current_stock <= safety_stock` are displayed. | High |

---

### Module 5: Inbound Stock Management (`/BarangMasuk`)

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| **IN-01**   | Single Item Stock Addition | Valid sparepart exists | 1. Select Sparepart<br>2. Enter Quantity = 10, Unit Price = 50000<br>3. Submit | `Barang_Masuk` record created. `Master_Data.current_stock` increased by 10 atomically. Price updated. | High |
| **IN-02**   | Batch Stock Addition | Multiple spareparts exist | 1. Add multiple items in batch grid<br>2. Click "Submit All" | All items processed in transaction. Stock levels incremented accordingly. | Medium |

---

### Module 6: Outbound Stock & Approval Queue (`/BarangKeluar`)

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| **OUT-01**  | Outbound Request (No Approval Required) | User has `RequireApprovalKeluar = false` | 1. Select Line, Machine, Part ID, Qty = 5<br>2. Submit | `Barang_Keluar` created as Approved. `Master_Data.current_stock` decremented by 5 immediately. | High |
| **OUT-02**  | Outbound Request (Approval Required) | User has `RequireApprovalKeluar = true` | 1. Submit outbound request for 5 units | `Barang_Keluar` created with status `Pending`. Stock level remains unchanged. | High |
| **OUT-03**  | Admin Approves Outbound Request | Pending request exists | 1. Admin navigates to `/AdminManagement?tab=approvals`<br>2. Click "Approve" | Transaction status updated to `Approved`. `Master_Data.current_stock` decremented by requested quantity. | High |
| **OUT-04**  | Admin Rejects Outbound Request | Pending request exists | 1. Click "Reject" on pending item | Status updated to `Rejected`. Stock remains untouched. | Medium |

---

### Module 7: Procurement & Supplier Bidding (`/AdminManagement`)

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| **BID-01**  | Save Supplier Quotation Offer | Master sparepart exists | 1. In Procurement tab, enter Supplier Name and Price<br>2. Click "Save Offer" | Offer saved to `Supplier_Offer`. Master price updated if set as primary supplier. | High |
| **BID-02**  | Create Bidding Record | Part ID exists | 1. Switch to Bidding tab<br>2. Fill Year, Stage, Supplier, Bidding Price<br>3. Submit | Entry created in `Bidding_History`. KPI total bidding value updated. | Medium |

---

### Module 8: Reporting & Excel Exports

| Test ID | Feature | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| **RPT-01**  | Dashboard KPI Calculations | Transactions exist | 1. Open `/Dashboard` | Total Valuation, Critical Low Stock Count, Total Items match database aggregations. | High |
| **RPT-02**  | Cost Intelligence Drilldown | Outbound data exists | 1. Open `/CostIntelligence`<br>2. Select line filter | Monthly cost trend charts, spike flags, and machine cost breakdowns rendered accurately. | Medium |
| **RPT-03**  | Export Master Data to Excel | Items in database | 1. Click "Export Excel" in `/MasterData` | `.xlsx` file downloaded with styled headers and complete catalog data. | High |
| **RPT-04**  | Export History to Excel | Transaction logs exist | 1. Click "Export Excel" in `/History` | `.xlsx` report generated containing complete inbound and outbound logs. | Medium |
