# 📋 Endpoint Inventory Documentation
### Sparepart Management System (SMS / UPMS.Web)

**Generated:** 1 September 2026  
**Target Repository:** `SMS-Website`  
**Total Controllers:** 15  
**Total Endpoints Documented:** 56  

---

## 1. Account Controller (`AccountController`)
*Base Route:* `/Account`  
*Class Level Auth:* None (Individual Actions annotated)

### `GET /Account/Login`
- **HTTP Method:** `GET`
- **Route:** `/Account/Login`
- **Action:** `Login(string? returnUrl = null)`
- **Parameters:** `returnUrl` (string, optional query)
- **Request Model:** N/A
- **Response:** `ViewResult` (Login Page)
- **Authentication:** Anonymous (`[AllowAnonymous]`)
- **Authorization Attributes:** `[AllowAnonymous]`
- **Services Called:** N/A
- **Database Entities:** None
- **External Services:** None

### `POST /Account/Login`
- **HTTP Method:** `POST`
- **Route:** `/Account/Login`
- **Action:** `Login(string username, string password, string? returnUrl = null)`
- **Parameters:** `username` (string), `password` (string), `returnUrl` (string, optional)
- **Request Model:** Form Data (`username`, `password`, `returnUrl`)
- **Response:** `RedirectToActionResult` (`/Dashboard/Index` or `/Operator/Index` or local `returnUrl`), `ViewResult` (on failure)
- **Authentication:** Anonymous (`[AllowAnonymous]`)
- **Authorization Attributes:** `[AllowAnonymous]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `IAuthService.ValidateUserAsync()`, `IAuthService.CreateClaimsPrincipal()`, `IAuthService.UpdateLastLoginAsync()`, `IAuthService.LogFailedLoginAsync()`
- **Database Entities:** `Users`, `Audit_Log`
- **External Services:** None

### `POST /Account/Logout`
- **HTTP Method:** `POST`
- **Route:** `/Account/Logout`
- **Action:** `Logout()`
- **Parameters:** None
- **Request Model:** N/A
- **Response:** `RedirectToActionResult` (`/Account/Login`)
- **Authentication:** Required (`[Authorize]`)
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `HttpContext.SignOutAsync()`
- **Database Entities:** None
- **External Services:** None

### `GET /Account/AccessDenied`
- **HTTP Method:** `GET`
- **Route:** `/Account/AccessDenied`
- **Action:** `AccessDenied()`
- **Parameters:** None
- **Request Model:** N/A
- **Response:** `ViewResult`
- **Authentication:** None
- **Authorization Attributes:** None
- **Services Called:** None
- **Database Entities:** None
- **External Services:** None

---

## 2. Dashboard Controller (`DashboardController`)
*Base Route:* `/Dashboard`  
*Class Level Auth:* `[Authorize]`

### `GET /Dashboard` / `GET /Dashboard/Index`
- **HTTP Method:** `GET`
- **Route:** `/Dashboard/Index`
- **Action:** `Index(int? year = null, int? month = null)`
- **Parameters:** `year` (int, optional), `month` (int, optional)
- **Request Model:** N/A
- **Response:** `ViewResult` (`DashboardViewModel`)
- **Authentication:** Required (`[Authorize]`)
- **Authorization Attributes:** `[Authorize]`
- **Services Called:** `IDashboardService.GetDashboardDataAsync()`
- **Database Entities:** `Master_Data`, `Barang_Masuk`, `Barang_Keluar`, `Bidding_History`
- **External Services:** None

### `GET /Dashboard/GetCostPerLineChartData`
- **HTTP Method:** `GET`
- **Route:** `/Dashboard/GetCostPerLineChartData`
- **Action:** `GetCostPerLineChartData(int? year, int? month)`
- **Parameters:** `year` (int, optional), `month` (int, optional)
- **Request Model:** N/A
- **Response:** `JsonResult` (`{ labels, values, totalCost, totalItems }`)
- **Authentication:** Required (`[Authorize]`)
- **Authorization Attributes:** `[Authorize]`
- **Services Called:** `IDashboardService.GetCostPerLineChartAsync()`
- **Database Entities:** `Barang_Keluar`
- **External Services:** None

---

## 3. Settings Controller (`SettingsController`)
*Base Route:* `/Settings`  
*Class Level Auth:* `[Authorize]`

### `GET /Settings` / `GET /Settings/Index`
- **HTTP Method:** `GET`
- **Route:** `/Settings/Index`
- **Action:** `Index()`
- **Parameters:** None
- **Request Model:** N/A
- **Response:** `ViewResult` (`List<User>`)
- **Authentication:** Required (`[Authorize]`)
- **Authorization Attributes:** `[Authorize]`
- **Services Called:** `UpmsDbContext`
- **Database Entities:** `Users`, `App_Settings`
- **External Services:** None

### `POST /Settings/CreateUser`
- **HTTP Method:** `POST`
- **Route:** `/Settings/CreateUser`
- **Action:** `CreateUser(User model, string rawPassword)`
- **Parameters:** `model` (`User`), `rawPassword` (string)
- **Request Model:** Form Data (`User`, `rawPassword`)
- **Response:** `RedirectToActionResult` (`/Settings/Index`)
- **Authentication:** Required (`[Authorize(Roles = "admin")]`)
- **Authorization Attributes:** `[Authorize(Roles = "admin")]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `BCrypt.Net.BCrypt.HashPassword()`
- **Database Entities:** `Users`
- **External Services:** None

### `POST /Settings/EditUser`
- **HTTP Method:** `POST`
- **Route:** `/Settings/EditUser`
- **Action:** `EditUser(User model, string? rawPassword, string? newPassword)`
- **Parameters:** `model` (`User`), `rawPassword` (string, optional), `newPassword` (string, optional)
- **Request Model:** Form Data (`User`)
- **Response:** `RedirectToActionResult` (`/Settings/Index`)
- **Authentication:** Required (`[Authorize(Roles = "admin")]`)
- **Authorization Attributes:** `[Authorize(Roles = "admin")]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `BCrypt.Net.BCrypt.HashPassword()`
- **Database Entities:** `Users`
- **External Services:** None

### `POST /Settings/ToggleStatus`
- **HTTP Method:** `POST`
- **Route:** `/Settings/ToggleStatus`
- **Action:** `ToggleStatus(int userId)`
- **Parameters:** `userId` (int)
- **Request Model:** Form Data (`userId`)
- **Response:** `RedirectToActionResult` (`/Settings/Index`)
- **Authentication:** Required (`[Authorize(Roles = "admin")]`)
- **Authorization Attributes:** `[Authorize(Roles = "admin")]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `UpmsDbContext`
- **Database Entities:** `Users`
- **External Services:** None

### `POST /Settings/DeleteUser`
- **HTTP Method:** `POST`
- **Route:** `/Settings/DeleteUser`
- **Action:** `DeleteUser(int userId)`
- **Parameters:** `userId` (int)
- **Request Model:** Form Data (`userId`)
- **Response:** `RedirectToActionResult` (`/Settings/Index`)
- **Authentication:** Required (`[Authorize(Roles = "admin")]`)
- **Authorization Attributes:** `[Authorize(Roles = "admin")]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `UpmsDbContext`
- **Database Entities:** `Users`
- **External Services:** None

### `POST /Settings/SaveDeletePassword`
- **HTTP Method:** `POST`
- **Route:** `/Settings/SaveDeletePassword`
- **Action:** `SaveDeletePassword(string deletePassword)`
- **Parameters:** `deletePassword` (string)
- **Request Model:** Form Data (`deletePassword`)
- **Response:** `RedirectToActionResult` (`/Settings/Index`)
- **Authentication:** Required (`[Authorize(Roles = "admin")]`)
- **Authorization Attributes:** `[Authorize(Roles = "admin")]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `BCrypt.Net.BCrypt.HashPassword()`
- **Database Entities:** `App_Settings`
- **External Services:** None

### `POST /Settings/VerifyDeletePassword`
- **HTTP Method:** `POST`
- **Route:** `/Settings/VerifyDeletePassword`
- **Action:** `VerifyDeletePassword([FromBody] DeleteVerifyRequest req)`
- **Parameters:** `req` (`DeleteVerifyRequest`)
- **Request Model:** JSON Body (`{ password: "..." }`)
- **Response:** `JsonResult` (`{ success: bool, message?: string }`)
- **Authentication:** Required (`[Authorize]`)
- **Authorization Attributes:** `[Authorize]`
- **Services Called:** `BCrypt.Net.BCrypt.Verify()`
- **Database Entities:** `App_Settings`, `Users`
- **External Services:** None

---

## 4. Admin Management Controller (`AdminManagementController`)
*Base Route:* `/AdminManagement`  
*Class Level Auth:* `[Authorize]`

### `GET /AdminManagement` / `GET /AdminManagement/Index`
- **HTTP Method:** `GET`
- **Route:** `/AdminManagement/Index`
- **Action:** `Index(string tab = "procurement", string subtab = "keluar", int page = 1, int pageSize = 50, string? search = null, string? category = null, string? stock = null, int? year = null)`
- **Response:** `ViewResult` (`AdminManagementViewModel`)
- **Authentication:** Required (`[Authorize]`)
- **Services Called:** `UpmsDbContext`
- **Database Entities:** `Master_Data`, `Supplier`, `Supplier_Offer`, `Bidding_History`, `Barang_Keluar`, `sparepart_line_mapping`

### `POST /AdminManagement/UpdatePriceAndSupplier`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/UpdatePriceAndSupplier`
- **Action:** `UpdatePriceAndSupplier(string masterDataId, decimal newPrice, string? supplierName)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `UpmsDbContext`
- **Database Entities:** `Master_Data`, `Supplier`, `Supplier_Offer`, `SPAREPART_PRICE_HISTORY`

### `GET /AdminManagement/GetPriceHistory`
- **HTTP Method:** `GET`
- **Route:** `/AdminManagement/GetPriceHistory`
- **Action:** `GetPriceHistory(string masterDataId)`
- **Authorization Attributes:** `[Authorize]`
- **Response:** `JsonResult` (History DTO)
- **Database Entities:** `Master_Data`, `SPAREPART_PRICE_HISTORY`, `Supplier_Offer`

### `GET /AdminManagement/GetSupplierOffersJson`
- **HTTP Method:** `GET`
- **Route:** `/AdminManagement/GetSupplierOffersJson`
- **Action:** `GetSupplierOffersJson(string masterDataId)`
- **Response:** `JsonResult` (Supplier Offers DTO List)
- **Database Entities:** `Supplier_Offer`, `Master_Data`

### `POST /AdminManagement/SaveSupplierOfferAjax`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/SaveSupplierOfferAjax`
- **Action:** `SaveSupplierOfferAjax(string masterDataId, string supplierName, decimal price, bool setAsPrimary = true)`
- **Authorization Attributes:** `[Authorize]`
- **Response:** `JsonResult` (`{ success: bool, message: string }`)
- **Database Entities:** `Supplier`, `Master_Data`, `Supplier_Offer`, `SPAREPART_PRICE_HISTORY`

### `POST /AdminManagement/SetPrimarySupplierOfferAjax`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/SetPrimarySupplierOfferAjax`
- **Action:** `SetPrimarySupplierOfferAjax(int offerId)`
- **Authorization Attributes:** `[Authorize]`
- **Response:** `JsonResult`
- **Database Entities:** `Supplier_Offer`, `Master_Data`, `SPAREPART_PRICE_HISTORY`

### `POST /AdminManagement/DeleteSupplierOfferAjax`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/DeleteSupplierOfferAjax`
- **Action:** `DeleteSupplierOfferAjax(int offerId)`
- **Authorization Attributes:** `[Authorize]`
- **Response:** `JsonResult`
- **Database Entities:** `Supplier_Offer`

### `POST /AdminManagement/ApproveKeluar`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/ApproveKeluar`
- **Action:** `ApproveKeluar(int id)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `IInventoryService.ApproveBarangKeluarAsync()`
- **Database Entities:** `Barang_Keluar`, `Master_Data`

### `POST /AdminManagement/RejectKeluar`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/RejectKeluar`
- **Action:** `RejectKeluar(int id)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `IInventoryService.RejectBarangKeluarAsync()`
- **Database Entities:** `Barang_Keluar`

### `POST /AdminManagement/CreateBidding`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/CreateBidding`
- **Action:** `CreateBidding(BiddingHistory model, string? itemName, string? bin)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Bidding_History`, `Supplier`, `Master_Data`

### `POST /AdminManagement/EditBidding`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/EditBidding`
- **Action:** `EditBidding(BiddingHistory model, ...)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Bidding_History`, `Supplier`, `Master_Data`

### `POST /AdminManagement/DeleteBidding`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/DeleteBidding`
- **Action:** `DeleteBidding(int id)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Bidding_History`

### `POST /AdminManagement/CopyBiddingYear`
- **HTTP Method:** `POST`
- **Route:** `/AdminManagement/CopyBiddingYear`
- **Action:** `CopyBiddingYear(int fromYear, int toYear, bool overwrite = false)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Bidding_History`

---

## 5. Master Data Controller (`MasterDataController`)
*Base Route:* `/MasterData`  
*Class Level Auth:* `[Authorize]`

### `GET /MasterData` / `GET /MasterData/Index`
- **HTTP Method:** `GET`
- **Route:** `/MasterData/Index`
- **Action:** `Index(string? search, string? upArea, string? category, string? frequency, string? line, string? stockStatus, int page = 1)`
- **Response:** `ViewResult` (`MasterDataViewModel`)
- **Services Called:** `ISparepartService.GetMasterDatasAsync()`
- **Database Entities:** `Master_Data`

### `GET /MasterData/Details/{id}`
- **HTTP Method:** `GET`
- **Route:** `/MasterData/Details/{id}`
- **Action:** `Details(string id)`
- **Response:** `ViewResult` (`MasterData`)
- **Database Entities:** `Master_Data`

### `GET /MasterData/DetailsJson/{id}`
- **HTTP Method:** `GET`
- **Route:** `/MasterData/DetailsJson/{id}`
- **Action:** `DetailsJson(string id)`
- **Response:** `JsonResult` (`MasterData`)
- **Database Entities:** `Master_Data`

### `POST /MasterData/Create`
- **HTTP Method:** `POST`
- **Route:** `/MasterData/Create`
- **Action:** `Create(MasterData model, IFormFile? imageFile, ...)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `ISparepartService.CreateMasterDataAsync()`
- **Database Entities:** `Master_Data`

### `POST /MasterData/Edit`
- **HTTP Method:** `POST`
- **Route:** `/MasterData/Edit`
- **Action:** `Edit(MasterData model, IFormFile? imageFile, ...)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `ISparepartService.UpdateMasterDataAsync()`
- **Database Entities:** `Master_Data`

### `POST /MasterData/Delete`
- **HTTP Method:** `POST`
- **Route:** `/MasterData/Delete`
- **Action:** `Delete(string id, ...)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `ISparepartService.SoftDeleteMasterDataAsync()`
- **Database Entities:** `Master_Data`

### `GET /MasterData/ExportExcel`
- **HTTP Method:** `GET`
- **Route:** `/MasterData/ExportExcel`
- **Action:** `ExportExcel(...)`
- **Services Called:** `IExcelExportService.ExportMasterDataToExcel()`
- **Response:** `FileResult` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

---

## 6. Barang Masuk Controller (`BarangMasukController`)
*Base Route:* `/BarangMasuk`  
*Class Level Auth:* `[Authorize]`

### `GET /BarangMasuk` / `GET /BarangMasuk/Index`
- **HTTP Method:** `GET`
- **Action:** `Index(int? year, string? search, int page = 1)`
- **Response:** `ViewResult`
- **Database Entities:** `Barang_Masuk`, `Master_Data`

### `GET /BarangMasuk/LookupBin`
- **HTTP Method:** `GET`
- **Action:** `LookupBin(string query)`
- **Response:** `JsonResult`
- **Database Entities:** `Master_Data`

### `GET /BarangMasuk/SearchMasterData`
- **HTTP Method:** `GET`
- **Action:** `SearchMasterData(string query)`
- **Response:** `JsonResult`
- **Database Entities:** `Master_Data`

### `POST /BarangMasuk/SubmitDirect`
- **HTTP Method:** `POST`
- **Action:** `SubmitDirect(BarangMasuk model)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `IInventoryService.AddBarangMasukAsync()`
- **Database Entities:** `Barang_Masuk`, `Master_Data`

### `POST /BarangMasuk/SubmitBatch`
- **HTTP Method:** `POST`
- **Action:** `SubmitBatch([FromBody] List<BarangMasuk> items)`
- **Authorization Attributes:** `[Authorize]`
- **Services Called:** `IInventoryService.AddBarangMasukAsync()`
- **Database Entities:** `Barang_Masuk`, `Master_Data`

### `POST /BarangMasuk/Delete`
- **HTTP Method:** `POST`
- **Action:** `Delete(int id)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `IInventoryService.DeleteBarangMasukAsync()`
- **Database Entities:** `Barang_Masuk`, `Master_Data`

---

## 7. Barang Keluar Controller (`BarangKeluarController`)
*Base Route:* `/BarangKeluar`  
*Class Level Auth:* `[Authorize]`

### `GET /BarangKeluar` / `GET /BarangKeluar/Index`
- **HTTP Method:** `GET`
- **Action:** `Index(int? year, string? search, int page = 1)`
- **Response:** `ViewResult`
- **Database Entities:** `Barang_Keluar`, `Master_Data`, `Machine_Master`

### `GET /BarangKeluar/GetMachinesByLine`
- **HTTP Method:** `GET`
- **Action:** `GetMachinesByLine(string line)`
- **Response:** `JsonResult`
- **Database Entities:** `Machine_Master`

### `GET /BarangKeluar/SearchMasterData`
- **HTTP Method:** `GET`
- **Action:** `SearchMasterData(string query)`
- **Response:** `JsonResult`
- **Database Entities:** `Master_Data`

### `GET /BarangKeluar/LookupBarcode`
- **HTTP Method:** `GET`
- **Action:** `LookupBarcode(string query)`
- **Response:** `JsonResult`
- **Database Entities:** `Master_Data`

### `POST /BarangKeluar/Submit`
- **HTTP Method:** `POST`
- **Action:** `Submit(BarangKeluar model)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Services Called:** `IInventoryService.AddBarangKeluarAsync()`
- **Database Entities:** `Barang_Keluar`, `Master_Data`

### `POST /BarangKeluar/SubmitBatch`
- **HTTP Method:** `POST`
- **Action:** `SubmitBatch([FromBody] List<BarangKeluar> items)`
- **Authorization Attributes:** `[Authorize]`
- **Services Called:** `IInventoryService.AddBarangKeluarAsync()`
- **Database Entities:** `Barang_Keluar`, `Master_Data`

---

## 8. Line Compatibility Controller (`LineCompatibilityController`)
*Base Route:* `/LineCompatibility`  
*Class Level Auth:* `[Authorize]`

### `GET /LineCompatibility` / `GET /LineCompatibility/Index`
- **HTTP Method:** `GET`
- **Action:** `Index(...)`
- **Response:** `ViewResult` (`LineCompatibilityViewModel`)
- **Database Entities:** `sparepart_line_mapping`, `Master_Data`, `Machine_Master`

### `POST /LineCompatibility/AddLineMapping`
- **HTTP Method:** `POST`
- **Action:** `AddLineMapping(string sparepartId, string lineName)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `sparepart_line_mapping`

### `POST /LineCompatibility/DeactivateLineMapping`
- **HTTP Method:** `POST`
- **Action:** `DeactivateLineMapping(int id, string returnLine = "")`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `sparepart_line_mapping`

### `POST /LineCompatibility/ApprovePending`
- **HTTP Method:** `POST`
- **Action:** `ApprovePending(int id)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `sparepart_line_mapping`

### `POST /LineCompatibility/RejectPending`
- **HTTP Method:** `POST`
- **Action:** `RejectPending(int id)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `sparepart_line_mapping`

---

## 9. Master Machine Controller (`MasterMachineController`)
*Base Route:* `/MasterMachine`  
*Class Level Auth:* `[Authorize]`

### `GET /MasterMachine` / `GET /MasterMachine/Index`
- **HTTP Method:** `GET`
- **Action:** `Index(string? selectedLine, string? lineSearch, string? search, string statusFilter = "all")`
- **Response:** `ViewResult` (`MasterMachineViewModel`)
- **Database Entities:** `Machine_Master`

### `POST /MasterMachine/Create`
- **HTTP Method:** `POST`
- **Action:** `Create(MachineMaster machine)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Machine_Master`

### `POST /MasterMachine/Edit`
- **HTTP Method:** `POST`
- **Action:** `Edit(MachineMaster machine)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Machine_Master`

### `POST /MasterMachine/ToggleStatus`
- **HTTP Method:** `POST`
- **Action:** `ToggleStatus(int id, string? selectedLine)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Machine_Master`

### `POST /MasterMachine/Delete`
- **HTTP Method:** `POST`
- **Action:** `Delete(int id, string? selectedLine)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Machine_Master`

---

## 10. Cost Intelligence Controller (`CostIntelligenceController`)
*Base Route:* `/CostIntelligence`  
*Class Level Auth:* `[Authorize]`

### `GET /CostIntelligence` / `GET /CostIntelligence/Index`
- **HTTP Method:** `GET`
- **Action:** `Index(string? startDate, string? endDate, string? line, string tab = "line")`
- **Response:** `ViewResult` (`CostIntelligenceViewModel`)
- **Database Entities:** `Barang_Keluar`, `Master_Data`, `Machine_Master`

### `GET /CostIntelligence/GetLineDrilldownJson`
- **HTTP Method:** `GET`
- **Action:** `GetLineDrilldownJson(string lineName, string? startDate, string? endDate)`
- **Response:** `JsonResult`
- **Database Entities:** `Barang_Keluar`, `Master_Data`

### `GET /CostIntelligence/GetMachineDrilldownJson`
- **HTTP Method:** `GET`
- **Action:** `GetMachineDrilldownJson(int machineId, string? startDate, string? endDate)`
- **Response:** `JsonResult`
- **Database Entities:** `Barang_Keluar`, `Master_Data`, `Machine_Master`

### `GET /CostIntelligence/ExportToExcel`
- **HTTP Method:** `GET`
- **Action:** `ExportToExcel(string? startDate, string? endDate, string? line, string tab = "line")`
- **Services Called:** `IExcelExportService`
- **Response:** `FileResult` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

---

## 11. Supplier Controller (`SupplierController`)
*Base Route:* `/Supplier`  
*Class Level Auth:* `[Authorize]`

### `GET /Supplier` / `GET /Supplier/Index`
- **HTTP Method:** `GET`
- **Action:** `Index(string? search, int page = 1, int pageSize = 50)`
- **Response:** `ViewResult`
- **Database Entities:** `Supplier`

### `GET /Supplier/DetailsJson/{id}`
- **HTTP Method:** `GET`
- **Action:** `DetailsJson(int id)`
- **Response:** `JsonResult` (`Supplier`)
- **Database Entities:** `Supplier`

### `POST /Supplier/Create`
- **HTTP Method:** `POST`
- **Action:** `Create(Supplier model, string? search)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Supplier`

### `POST /Supplier/Edit`
- **HTTP Method:** `POST`
- **Action:** `Edit(Supplier model, string? search)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Supplier`

### `POST /Supplier/Delete`
- **HTTP Method:** `POST`
- **Action:** `Delete(int id, string? search)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Supplier`

---

## 12. History Controller (`HistoryController`)
*Base Route:* `/History`  
*Class Level Auth:* `[Authorize]`

### `GET /History` / `GET /History/Index`
- **HTTP Method:** `GET`
- **Action:** `Index(string tab = "masuk", int? year = null, string? search = null, int page = 1)`
- **Response:** `ViewResult`
- **Database Entities:** `Barang_Masuk`, `Barang_Keluar`

### `GET /History/ExportExcel`
- **HTTP Method:** `GET`
- **Action:** `ExportExcel(string tab = "masuk", int? year = null, string? search = null)`
- **Services Called:** `IExcelExportService`
- **Response:** `FileResult`

---

## 13. Email Settings Controller (`EmailSettingsController`)
*Base Route:* `/EmailSettings`  
*Class Level Auth:* `[Authorize]`

### `GET /EmailSettings` / `GET /EmailSettings/Index`
- **HTTP Method:** `GET`
- **Action:** `Index()`
- **Response:** `ViewResult` (`EmailSettingsViewModel`)
- **Database Entities:** `App_Settings`

### `POST /EmailSettings/Save`
- **HTTP Method:** `POST`
- **Action:** `Save(EmailSettingsViewModel model)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `App_Settings`

### `POST /EmailSettings/TestSmtpConnection`
- **HTTP Method:** `POST`
- **Action:** `TestSmtpConnection(string server, int port, string email, string password)`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **External Services:** SMTP Protocol (`System.Net.Mail.SmtpClient`)

### `POST /EmailSettings/SendTestReport`
- **HTTP Method:** `POST`
- **Action:** `SendTestReport()`
- **Authorization Attributes:** `[Authorize]`, `[ValidateAntiForgeryToken]`
- **Database Entities:** `Email_Supplier_Log`, `App_Settings`
- **External Services:** SMTP Email Server

---

## 14. Operator Controller (`OperatorController`)
*Base Route:* `/Operator`  
*Class Level Auth:* `[Authorize]`

### `GET /Operator` / `GET /Operator/Index`
- **HTTP Method:** `GET`
- **Action:** `Index()`
- **Response:** `ViewResult` (Shop-floor barcode & quick transaction interface)
- **Database Entities:** `Master_Data`

---

## 15. Home Controller (`HomeController`)
*Base Route:* `/Home`  
*Class Level Auth:* None

### `GET /Home/Index`
- **HTTP Method:** `GET`
- **Action:** `Index()`
- **Response:** `RedirectToActionResult` (`/Dashboard/Index`)

### `GET /Home/Error`
- **HTTP Method:** `GET`
- **Action:** `Error()`
- **Response:** `ViewResult` (`ErrorViewModel`)
