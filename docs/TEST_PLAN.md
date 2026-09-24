# System Management Sparepart (SMS) — Test Plan Document

> **Objective:** Comprehensive testing strategy to ensure 100% functional parity between Python/Flet desktop application and new ASP.NET Core web application.

---

## 1. Test Suite Categories

1. **Authentication & Access Control (RBAC)**
2. **Master Data Sparepart Management**
3. **Barang Masuk (Incoming Goods Transaction)**
4. **Barang Keluar (Outgoing Goods Transaction & Approval Flow)**
5. **Safety Stock & Inventory Calculation Engine**
6. **Procurement & Bidding Workflow**
7. **Cost Intelligence & Analytics Reports**
8. **Email Alert & Background Scheduler System**

---

## 2. Detailed Test Cases

### Test Case 1: Existing User Login & Password Hash Validation
- **Given**: Existing user in SQL Server `dbo.Users` with bcrypt hashed password.
- **When**: User enters valid username and password on `/Account/Login`.
- **Then**: Authentication succeeds, auth cookie is issued, session user claims match database role, user is redirected to `/Dashboard` or `/Operator`.
- **Verification**: Incorrect password displays error alert without leaking stack traces.

### Test Case 2: Granular RBAC Sidebar Menu Filtering
- **Given**: User with `role = 'user'`, `can_master_data = 1`, and `can_settings = 0`.
- **When**: User logs in and views the web sidebar.
- **Then**: "Master Data" link is visible, but "Settings / User Management" link is strictly hidden.
- **Verification**: Direct HTTP GET attempt to `/Settings` returns 403 Forbidden / Access Denied page.

### Test Case 3: Safety Stock Automated Calculation Formula
- **Given**: Sparepart with `qty_need_year = 120`, `lt_month = 2`, and `frequency = 'FAST'`.
- **When**: User creates or edits the sparepart in `/MasterData`.
- **Then**: Safety stock calculates as $(120 / 12) \times 2 \times 1.0 = 20.00$.
- **Verification**: If `frequency` is changed to `'SLOW'`, Safety stock automatically updates to $(120 / 12) \times 2 \times 0.5 = 10.00$.

### Test Case 4: Atomic Stock Increment on Barang Masuk
- **Given**: Sparepart `UPF-10001` with `current_stock = 15.00`.
- **When**: Operator submits Barang Masuk transaction of `qty = 10.00`.
- **Then**: Database transaction commits `Barang_Masuk` record AND updates `Master_Data.current_stock` to `25.00` in a single atomic transaction block.

### Test Case 5: Outgoing Transaction Approval Workflow (`require_approval_keluar`)
- **Given**: User with `require_approval_keluar = 1` submits Barang Keluar of `qty = 5.00` for item `UPF-10001` (`current_stock = 25.00`).
- **When**: User submits the outgoing form.
- **Then**: Record is created in `dbo.Barang_Keluar` with `approval_status = 'Pending'`, and `Master_Data.current_stock` remains **25.00** (NOT decremented).
- **When**: Admin opens `/AdminManagement/Approvals` and clicks **Approve**.
- **Then**: Record status updates to `'Approved'`, and `Master_Data.current_stock` is decremented to **20.00**.

### Test Case 6: Self-Learning Line Compatibility Tracking
- **Given**: Sparepart `UPF-10001` issued to production line `T5`.
- **When**: System checks `dbo.SPAREPART_LINE_MAPPING` and finds no existing entry for `(UPF-10001, T5)`.
- **Then**: System inserts a new entry in `dbo.SPAREPART_LINE_MAPPING` with status `Pending` for Admin verification.

### Test Case 7: Barcode Lookup & Web Camera Scanner
- **Given**: User opens `/BarangKeluar` and points hardware barcode scanner or webcam at BIN `A-01-02`.
- **When**: Scanned string `A-01-02` is captured.
- **Then**: Client JavaScript sends AJAX lookup to `/BarangKeluar/Lookup?query=A-01-02`, auto-filling Part Number, Item Name, and Current Stock into the active scan item.
