# 🛡️ Authorization Matrix & Security Policy Documentation
### Sparepart Management System (SMS / UPMS.Web)

**Generated:** 1 September 2026  
**Target Repository:** `SMS-Website`  

---

## 1. Executive Summary of Authorization Model

The application utilizes a **Hybrid Claims-Based & Dynamic Database Permission Model**:
1. **Authentication Scheme:** Cookie Authentication (`UPMS.Auth`)
2. **Roles:** `admin`, `user`, `operator`
3. **Granular Permissions:** 15 integer/boolean flags stored in the PostgreSQL `Users` table mapped to custom claims.
4. **Real-Time Dynamic Claims Synchronization:** Custom middleware in `Program.cs` intercepts every HTTP request, queries the `Users` table in PostgreSQL, and dynamically updates the logged-in user's `ClaimsPrincipal` so that permission changes take effect immediately without requiring re-login.

---

## 2. Roles & Definitions

| Role Name | Scope & Purpose | Administrative Rights | System Assignment |
|---|---|---|---|
| **`admin`** | System Administrator / Superuser | Full CRUD on all modules, user creation/deletion, setting modifications, price overrides | Assigned via `SettingsController` or seeded by `DbSeeder` |
| **`user`** | Standard Operational Staff | Access restricted based on individual granular database permission flags | Default role for new users |
| **`operator`** | Shop-Floor Technician / Barcode User | Quick view access for item issuance on shop floor | Assigned via `SettingsController` |

---

## 3. Claims Matrix

When a user logs in (or on every request via the synchronization middleware), `AuthService.CreateClaimsPrincipal()` constructs the `ClaimsPrincipal` with the following claims:

| Claim Type / Name | Type | Value Source (User Entity) | Description |
|---|---|---|---|
| `ClaimTypes.NameIdentifier` | Standard | `User.Id` | Unique numeric User ID |
| `ClaimTypes.Name` | Standard | `User.Username` | Login username |
| `ClaimTypes.GivenName` | Standard | `User.FullName ?? User.Username` | Display full name |
| `ClaimTypes.Role` | Standard | `User.Role ?? "user"` | Role string (`admin`, `user`, `operator`) |
| `CanMasterData` | Granular Claim | `User.CanMasterData` ("0" or "1") | Access to Master Sparepart Catalog |
| `CanAdminMgmt` | Granular Claim | `User.CanAdminMgmt` ("0" or "1") | Access to Procurement, Bidding, & Approvals |
| `CanBidding` | Granular Claim | `User.CanBidding` ("0" or "1") | Maps directly to `CanAdminMgmt` |
| `CanSettings` | Granular Claim | `User.CanSettings` ("0" or "1") | Access to User Management & System Settings |
| `CanBarangMasuk` | Granular Claim | `User.CanBarangMasuk` ("0" or "1") | Access to Stock Entry (Barang Masuk) |
| `CanRiwayat` | Granular Claim | `User.CanRiwayat` ("0" or "1") | Access to Transaction Logs History |
| `CanElectricalParts` | Granular Claim | `User.CanElectricalParts` ("0" or "1") | Access to Electrical Sparepart Filters |
| `CanSupplierData` | Granular Claim | `User.CanSupplierData` ("0" or "1") | Access to Supplier Master Directory |
| `CanEmailSettings` | Granular Claim | `User.CanEmailSettings` ("0" or "1") | Access to Email & SMTP Configuration |
| `CanBarangKeluar` | Granular Claim | `User.CanBarangKeluar` ("0" or "1") | Access to Stock Issuance (Barang Keluar) |
| `CanLineMapping` | Granular Claim | `User.CanLineMapping` ("0" or "1") | Access to Line Compatibility Matrix |
| `CanMasterMachine` | Granular Claim | `User.CanMasterMachine` ("0" or "1") | Access to Machine Register |
| `CanSparepartMachine` | Granular Claim | `User.CanSparepartMachine` ("0" or "1") | Maps directly to `CanMasterMachine` |
| `CanCostIntelligence` | Granular Claim | `User.CanCostIntelligence` ("0" or "1") | Access to Cost & Price Intelligence |
| `RequireApprovalKeluar` | Granular Claim | `User.RequireApprovalKeluar` ("True"/"False")| Enforces approval requirement for stock issuance |

---

## 4. ASP.NET Core Policies & Middleware Setup

- **ASP.NET Core Policy-Based Authorization (`AddPolicy`):**  
  `UNKNOWN / NOT IMPLEMENTED` — Standard policy registration via `builder.Services.AddAuthorization(options => options.AddPolicy(...))` is not defined in `Program.cs`. Instead, declarative attributes (`[Authorize(Roles = "...")]`) and programmatic database permission checks are used.
- **Resource-Based Authorization:**  
  Implemented programmatically in specific controllers via private helper methods (e.g., `HasSettingsPermissionAsync()`, `HasAdminMgmtPermissionAsync()`, `HasSupplierPermissionAsync()`).
- **Dynamic Claims Middleware:**  
  Configured in `Program.cs` lines 56–81. Intercepts authenticated HTTP requests, checks PostgreSQL, and syncs permissions in real-time.

---

## 5. Controller & Action Authorization Matrix

### Legend:
- `[AllowAnonymous]`: Accessible without authentication.
- `[Authorize]`: Requires any authenticated session.
- `[Authorize(Roles = "admin")]`: Requires user to have role `admin`.
- `DB Permission`: Enforced programmatically via database lookup inside controller action.

| Controller | Action | HTTP Method | Authorization Requirement | Effective Access Constraint |
|---|---|---|---|---|
| **`AccountController`** | `Login` | GET | `[AllowAnonymous]` | Public |
| | `Login` | POST | `[AllowAnonymous]` | Public (Protected by rate limiting & lockout) |
| | `Logout` | POST | `[Authorize]` | Authenticated users |
| | `AccessDenied` | GET | None | Public |
| **`DashboardController`** | `Index` | GET | `[Authorize]` | Authenticated users |
| | `GetCostPerLineChartData` | GET | `[Authorize]` | Authenticated users |
| **`SettingsController`** | `Index` | GET | `[Authorize]` | Admin OR `CanSettings == 1` |
| | `CreateUser` | POST | `[Authorize(Roles = "admin")]` | Role: `admin` |
| | `EditUser` | POST | `[Authorize(Roles = "admin")]` | Role: `admin` |
| | `ToggleStatus` | POST | `[Authorize(Roles = "admin")]` | Role: `admin` |
| | `DeleteUser` | POST | `[Authorize(Roles = "admin")]` | Role: `admin` (Root admin protected) |
| | `SaveDeletePassword` | POST | `[Authorize(Roles = "admin")]` | Role: `admin` |
| | `VerifyDeletePassword` | POST | `[Authorize]` | Authenticated users |
| **`AdminManagementController`** | `Index` | GET | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `UpdatePriceAndSupplier` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `GetPriceHistory` | GET | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `GetSupplierOffersJson` | GET | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `SaveSupplierOfferAjax` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `SetPrimarySupplierOfferAjax` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `DeleteSupplierOfferAjax` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `ApproveKeluar` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `RejectKeluar` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `CreateBidding` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `EditBidding` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `DeleteBidding` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| | `CopyBiddingYear` | POST | `[Authorize]` | Admin OR `CanAdminMgmt == 1` |
| **`MasterDataController`** | All Actions (Index, Create, Edit, Delete, ExportExcel) | GET / POST | `[Authorize]` | Authenticated users |
| **`BarangMasukController`** | All Actions (Index, Lookup, Submit, Delete) | GET / POST | `[Authorize]` | Authenticated users |
| **`BarangKeluarController`** | All Actions (Index, Search, Submit) | GET / POST | `[Authorize]` | Authenticated users |
| **`LineCompatibilityController`**| All Actions (Index, Add, Deactivate, Approve, Reject) | GET / POST | `[Authorize]` | Authenticated users |
| **`MasterMachineController`** | All Actions (Index, Create, Edit, Delete, Toggle) | GET / POST | `[Authorize]` | Authenticated users |
| **`CostIntelligenceController`**| All Actions (Index, Drilldown, Export) | GET | `[Authorize]` | Authenticated users |
| **`SupplierController`** | All Actions (Index, Details, Create, Edit, Delete) | GET / POST | `[Authorize]` | Admin OR `CanSupplierData == 1` |
| **`HistoryController`** | All Actions (Index, ExportExcel) | GET | `[Authorize]` | Authenticated users |
| **`EmailSettingsController`**| All Actions (Index, Save, Test, SendReport) | GET / POST | `[Authorize]` | Authenticated users |
| **`OperatorController`** | `Index` | GET | `[Authorize]` | Authenticated users |
| **`HomeController`** | `Index`, `Error` | GET | None | Public |

---

## 6. Service-Level Authorization Checks

- **`AuthService`:**
  - `ValidateUserAsync()` explicitly checks `user.IsActive == true`. If `IsActive == false`, authentication is denied regardless of valid credentials.
- **`InventoryService`:**
  - `ApproveBarangKeluarAsync()` & `RejectBarangKeluarAsync()` verify transaction existence and approval state before executing inventory adjustments.
