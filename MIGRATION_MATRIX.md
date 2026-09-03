# System Management Sparepart (SMS) — Migration Matrix

> **Purpose:** Detailed function-by-function mapping from existing Python/Flet desktop codebase to the target ASP.NET Core web application.

| Old Module | Old Screen / Source File | Old Function / Feature | New Page (Razor View) | New Controller | New Service / Handler | DB Table(s) | Status |
|------------|-------------------------|------------------------|-----------------------|----------------|----------------------|-------------|--------|
| Auth | `login_view.py` | `login_click()` / User authentication | `/Account/Login` | `AccountController` | `IAuthService` | `dbo.Users` | DISCOVERED |
| Auth | `login_view.py` | Session creation & Role routing | `/Account/Login` | `AccountController` | `IAuthService` | `dbo.Users` | DISCOVERED |
| Core | `main_view.py` | Sidebar navigation & RBAC filter | `_Layout.cshtml` | `HomeController` | `IAuthService` | `dbo.Users` | DISCOVERED |
| Dashboard | `dashboard_view.py` | `load_kpi_cards()` | `/Dashboard` | `DashboardController` | `IDashboardService` | `dbo.Master_Data`, `dbo.Barang_Keluar` | DISCOVERED |
| Dashboard | `dashboard_view.py` | Stock status donut chart | `/Dashboard` | `DashboardController` | `IDashboardService` | `dbo.Master_Data` | DISCOVERED |
| Dashboard | `dashboard_view.py` | Cost per Line line chart | `/Dashboard` | `DashboardController` | `ICostAnalyticsService` | `dbo.Barang_Keluar` | DISCOVERED |
| Dashboard | `dashboard_view.py` | Top 5 Low Stock list | `/Dashboard` | `DashboardController` | `ISparepartService` | `dbo.Master_Data` | DISCOVERED |
| Dashboard | `dashboard_view.py` | Recent activity feed | `/Dashboard` | `DashboardController` | `IAuditLogService` | `dbo.Audit_Log` | DISCOVERED |
| Master Data | `master_data_view.py` | `get_master_data()` (Search & Filter) | `/MasterData` | `MasterDataController` | `ISparepartService` | `dbo.Master_Data` | DISCOVERED |
| Master Data | `master_data_view.py` | `create_master_data()` (Add Item) | `/MasterData/Create` | `MasterDataController` | `ISparepartService` | `dbo.Master_Data`, `seq_upf_master` | DISCOVERED |
| Master Data | `master_data_view.py` | `update_master_data()` (Edit Item) | `/MasterData/Edit/{id}` | `MasterDataController` | `ISparepartService` | `dbo.Master_Data` | DISCOVERED |
| Master Data | `master_data_view.py` | `delete_master_data()` (Soft delete) | `/MasterData/Delete/{id}` | `MasterDataController` | `ISparepartService` | `dbo.Master_Data` | DISCOVERED |
| Master Data | `master_data_view.py` | Safety Stock calculation logic | `/MasterData` | Client JS + `ISparepartService` | Domain formula | `dbo.Master_Data` | DISCOVERED |
| Master Data | `excel_export.py` | `export_master_data_excel()` | `/MasterData/Export` | `MasterDataController` | `IExcelExportService` | `dbo.Master_Data` | DISCOVERED |
| Barang Masuk | `barang_masuk_view.py` | Master data reference auto-fill | `/BarangMasuk` | `BarangMasukController` | `ISparepartService` | `dbo.Master_Data` | DISCOVERED |
| Barang Masuk | `barang_masuk_view.py` | `create_barang_masuk_with_stock()` (Direct) | `/BarangMasuk/SubmitDirect` | `BarangMasukController` | `IInventoryService` | `dbo.Barang_Masuk`, `dbo.Master_Data` | DISCOVERED |
| Barang Masuk | `barang_masuk_view.py` | Pending list batch commit | `/BarangMasuk/SubmitBatch` | `BarangMasukController` | `IInventoryService` | `dbo.Barang_Masuk`, `dbo.Master_Data` | DISCOVERED |
| Barang Masuk | `barang_masuk_view.py` | History & correction delete | `/BarangMasuk/Delete/{id}` | `BarangMasukController` | `IInventoryService` | `dbo.Barang_Masuk`, `dbo.Master_Data` | DISCOVERED |
| Barang Keluar | `barang_keluar_view.py` | Barcode camera scanner input | `/BarangKeluar` | Client HTML5 camera JS | JS Scanner | Frontend | DISCOVERED |
| Barang Keluar | `barang_keluar_view.py` | Manual Part # / BIN barcode lookup | `/BarangKeluar/Lookup` | `BarangKeluarController` | `ISparepartService` | `dbo.Master_Data` | DISCOVERED |
| Barang Keluar | `barang_keluar_view.py` | `create_barang_keluar_with_stock()` | `/BarangKeluar/Submit` | `BarangKeluarController` | `IInventoryService` | `dbo.Barang_Keluar`, `dbo.Master_Data` | DISCOVERED |
| Barang Keluar | `barang_keluar_view.py` | Approval routing (`require_approval`) | `/BarangKeluar/Submit` | `BarangKeluarController` | `IInventoryService` | `dbo.Barang_Keluar` | DISCOVERED |
| History | `history_view.py` | `get_barang_masuk()` history search | `/History/Masuk` | `HistoryController` | `IInventoryService` | `dbo.Barang_Masuk` | DISCOVERED |
| History | `history_view.py` | `get_barang_keluar()` history search | `/History/Keluar` | `HistoryController` | `IInventoryService` | `dbo.Barang_Keluar` | DISCOVERED |
| History | `history_view.py` | Export history tab to Excel | `/History/Export` | `HistoryController` | `IExcelExportService` | `dbo.Barang_Masuk`, `dbo.Barang_Keluar` | DISCOVERED |
| Admin Mgmt | `admin_management_view.py` | Tab 1: Procurement valuation | `/AdminManagement/Procurement` | `AdminManagementController` | `IProcurementService` | `dbo.Master_Data`, `dbo.Supplier_Offer` | DISCOVERED |
| Admin Mgmt | `admin_management_view.py` | Tab 1: Manage item supplier offers | `/AdminManagement/SupplierOffers` | `AdminManagementController` | `IProcurementService` | `dbo.Supplier_Offer` | DISCOVERED |
| Admin Mgmt | `admin_management_view.py` | Tab 2: Bidding record view | `/AdminManagement/Bidding` | `AdminManagementController` | `IProcurementService` | `dbo.Bidding_History` | DISCOVERED |
| Admin Mgmt | `admin_management_view.py` | Tab 3: Approve/Reject Barang Keluar | `/AdminManagement/Approvals` | `AdminManagementController` | `IInventoryService` | `dbo.Barang_Keluar`, `dbo.Master_Data` | DISCOVERED |
| Admin Mgmt | `admin_management_view.py` | Tab 4: Approve/Reject Line Mapping | `/AdminManagement/MappingApprovals` | `AdminManagementController` | `ILineMappingService` | `dbo.SPAREPART_LINE_MAPPING` | DISCOVERED |
| Master Machine | `master_machine_view.py` | Machine Master CRUD & line filter | `/MasterMachine` | `MasterMachineController` | `IMachineService` | `dbo.Machine_Master` | DISCOVERED |
| Machine Mapping | `sparepart_machine_view.py` | Per-machine Installed/Consumption | `/MachineMapping` | `MachineMappingController` | `IMachineService` | `dbo.Machine_Master`, `dbo.Barang_Keluar` | DISCOVERED |
| Cost Intelligence | `cost_intelligence_view.py` | Cost per Line Analytics & Chart | `/CostIntelligence/Line` | `CostIntelligenceController` | `ICostAnalyticsService` | `dbo.Barang_Keluar` | DISCOVERED |
| Cost Intelligence | `cost_intelligence_view.py` | Cost per Machine Analytics & Chart | `/CostIntelligence/Machine` | `CostIntelligenceController` | `ICostAnalyticsService` | `dbo.Barang_Keluar`, `dbo.Machine_Master` | DISCOVERED |
| Line Mapping | `line_mapping_view.py` | Compatibility Center CRUD | `/LineMapping` | `LineMappingController` | `ILineMappingService` | `dbo.SPAREPART_LINE_MAPPING` | DISCOVERED |
| Electrical | `electrical_parts_view.py` | Electrical parts catalog CRUD | `/ElectricalParts` | `ElectricalPartsController` | `IElectricalPartsService` | `dbo.Master_Data` | DISCOVERED |
| Supplier | `supplier_view.py` | Master Supplier directory CRUD | `/Supplier` | `SupplierController` | `ISupplierService` | `dbo.Supplier` | DISCOVERED |
| Bidding | `bidding_view.py` | Annual tender bidding CRUD | `/Bidding` | `BiddingController` | `IBiddingService` | `dbo.Bidding_History` | DISCOVERED |
| Settings | `settings_view.py` | User management & RBAC flags | `/Settings/Users` | `SettingsController` | `IUserService` | `dbo.Users` | DISCOVERED |
| Email Settings | `email_settings_view.py` | SMTP settings & alert triggers | `/EmailSettings` | `EmailSettingsController` | `IEmailService` | `dbo.App_Settings` | DISCOVERED |
| Scheduler | `utils/email_scheduler.py` | Background low-stock alert runner | Hosted Background Service | Background Task | `IEmailNotificationService` | `dbo.Master_Data`, `dbo.Email_Supplier_Log` | DISCOVERED |
| Operator View | `operator_view.py` | Technician simplified outgoing form | `/Operator` | `OperatorController` | `IInventoryService` | `dbo.Barang_Keluar`, `dbo.Master_Data` | DISCOVERED |
