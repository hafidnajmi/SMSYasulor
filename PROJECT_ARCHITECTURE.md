# 🏗️ Technical Architecture Documentation
### Sparepart Management System (SMS / UPMS.Web)

---

## 1. Executive & Technical Overview

The **Sparepart Management System (SMS)** is an enterprise web application designed for industrial inventory tracking, spare part catalog management, machine compatibility mapping, bidding history tracking, procurement pricing, and stock transactions (Barang Masuk / Barang Keluar).

### Target Framework & Runtime
- **Framework:** .NET 10.0 (`net10.0`)
- **App Type:** ASP.NET Core MVC (Model-View-Controller) Monolith
- **ORM:** Entity Framework Core 9.0 (`Npgsql.EntityFrameworkCore.PostgreSQL`)
- **Database Engine:** PostgreSQL (`sms_database`)
- **Password Hashing:** BCrypt (`BCrypt.Net-Next`)
- **Export Utility:** ClosedXML (`ClosedXML` 0.105.1) for Excel generation
- **Security Middleware:** `AspNetCoreRateLimit` 4.0.2

---

## 2. Application Architecture

The system follows a classic **N-Tier Layered MVC Monolith Architecture**:

```
 ┌─────────────────────────────────────────────────────────┐
 │                   Browser (Client)                      │
 └────────────────────────────┬────────────────────────────┘
                              │ HTTP / HTTPS
 ┌────────────────────────────▼────────────────────────────┐
 │               ASP.NET Core Middleware Pipeline          │
 │  (Rate Limit -> Static Files -> Routing -> Custom Claims │
 │              Sync Middleware -> Auth -> Controller)     │
 └────────────────────────────┬────────────────────────────┘
                              │
 ┌────────────────────────────▼────────────────────────────┐
 │                    Controllers (Presentation)            │
 │   AccountController, SettingsController, AdminMgmt...   │
 └────────────────────────────┬────────────────────────────┘
                              │ Inject Interfaces (IAuthService, etc.)
 ┌────────────────────────────▼────────────────────────────┐
 │                      Service Layer                       │
 │  AuthService, InventoryService, DashboardService, etc.  │
 └────────────────────────────┬────────────────────────────┘
                              │ LINQ / Async EF Queries
 ┌────────────────────────────▼────────────────────────────┐
 │            Data Access Layer (DbContext & Entities)     │
 │            UpmsDbContext & EF Core PostreSQL Entities   │
 └────────────────────────────┬────────────────────────────┘
                              │ Npgsql Driver
 ┌────────────────────────────▼────────────────────────────┐
 │                  PostgreSQL Database                    │
 └─────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
SMS-Website/
├── Controllers/                 # Presentation Layer (15 Controllers)
│   ├── AccountController.cs
│   ├── AdminManagementController.cs
│   ├── BarangKeluarController.cs
│   ├── BarangMasukController.cs
│   ├── CostIntelligenceController.cs
│   ├── DashboardController.cs
│   ├── EmailSettingsController.cs
│   ├── HistoryController.cs
│   ├── HomeController.cs
│   ├── LineCompatibilityController.cs
│   ├── MasterDataController.cs
│   ├── MasterMachineController.cs
│   ├── OperatorController.cs
│   ├── SettingsController.cs
│   └── SupplierController.cs
├── Data/                        # Data Layer & Seeding
│   ├── DbSeeder.cs
│   └── UpmsDbContext.cs
├── Models/
│   ├── Entities/                # Database Table Mapping Entities (13 Entities)
│   │   ├── AppSetting.cs
│   │   ├── AuditLog.cs
│   │   ├── BarangKeluar.cs
│   │   ├── BarangMasuk.cs
│   │   ├── BiddingHistory.cs
│   │   ├── EmailSupplierLog.cs
│   │   ├── MachineMaster.cs
│   │   ├── MasterData.cs
│   │   ├── SparepartLineMapping.cs
│   │   ├── SparepartPriceHistory.cs
│   │   ├── Supplier.cs
│   │   ├── SupplierOffer.cs
│   │   └── User.cs
│   └── ViewModels/              # DTOs & Page Presentation Models
│       ├── AdminManagementViewModel.cs
│       ├── LineCompatibilityViewModels.cs
│       └── MasterMachineViewModel.cs
├── Services/                    # Core Business Logic Layer
│   ├── AuthService.cs / IAuthService.cs
│   ├── DashboardService.cs / IDashboardService.cs
│   ├── ExcelExportService.cs / IExcelExportService.cs
│   ├── InventoryService.cs / IInventoryService.cs
│   └── SparepartService.cs / ISparepartService.cs
├── Views/                       # Razor Views (.cshtml templates)
│   ├── Account/
│   ├── AdminManagement/
│   ├── BarangKeluar/
│   ├── BarangMasuk/
│   ├── CostIntelligence/
│   ├── Dashboard/
│   ├── LineCompatibility/
│   ├── MasterData/
│   ├── MasterMachine/
│   ├── Settings/
│   └── Shared/                  # Master Layouts & Partials (_Layout.cshtml)
├── Properties/
│   └── launchSettings.json      # Development server ports (5182)
├── Program.cs                   # Application Entry Point & Dependency Injection
├── appsettings.json             # Global application configuration
├── appsettings.Development.json # Environment specific local configuration
└── UPMS.Web.csproj              # Build properties & NuGet dependencies
```

---

## 4. Component Details & Specifications

### A. Presentation Layer (Controllers)

| Controller | Purpose | Key Actions | Primary Dependencies |
|---|---|---|---|
| **AccountController** | Authentication lifecycle (Login, Logout, AccessDenied) | `Login` [GET/POST], `Logout` [POST], `AccessDenied` [GET] | `IAuthService` |
| **SettingsController** | User management, RBAC grant, delete protection password | `Index`, `CreateUser`, `EditUser`, `ToggleStatus`, `DeleteUser`, `SaveDeletePassword`, `VerifyDeletePassword` | `UpmsDbContext` |
| **AdminManagementController** | Procurement, Bidding, Supplier Offers, Approval Queue | `Index`, `UpdatePriceAndSupplier`, `SaveSupplierOfferAjax`, `ApproveKeluar`, `RejectKeluar`, `CreateBidding` | `UpmsDbContext`, `IInventoryService` |
| **BarangMasukController** | Stock entry transactions (Inbound spareparts) | `Index`, `Create`, `ExportExcel` | `IInventoryService`, `IExcelExportService` |
| **BarangKeluarController** | Stock issuance transactions (Outbound spareparts) | `Index`, `Create`, `Approve`, `ExportExcel` | `IInventoryService`, `IExcelExportService` |
| **DashboardController** | Key Performance Indicators, stock alerts, analytics | `Index` | `IDashboardService` |
| **LineCompatibilityController**| Machine line to sparepart mapping matrix | `Index`, `AddMapping`, `DeleteMapping`, `ExportExcel` | `UpmsDbContext`, `IExcelExportService` |
| **MasterDataController** | Master sparepart catalog Management | `Index`, `Create`, `Edit`, `Delete`, `ExportExcel` | `ISparepartService`, `IExcelExportService` |
| **MasterMachineController** | Industrial Machine Asset Register | `Index`, `Create`, `Edit`, `Delete` | `UpmsDbContext` |
| **CostIntelligenceController** | Price trends, supplier comparisons, cost analytics | `Index`, `GetPriceTrends` | `UpmsDbContext` |
| **SupplierController** | Supplier Directory | `Index`, `Create`, `Edit` | `UpmsDbContext` |

---

### B. Business Logic Layer (Services)

#### 1. AuthService (`IAuthService`)
- **Purpose:** Validates credentials, handles password hashing verification via BCrypt, builds security claims principal, logs failed login attempts into `AuditLog`.
- **Files:** [AuthService.cs](file:///c:/Users/Local%20User/Downloads/SMS-Website/Services/AuthService.cs), [IAuthService.cs](file:///c:/Users/Local%20User/Downloads/SMS-Website/Services/IAuthService.cs)
- **Inputs:** Username, Password, Claims.
- **Outputs:** `User` object, `ClaimsPrincipal`, Audit log entries.

#### 2. InventoryService (`IInventoryService`)
- **Purpose:** Handles inbound stock additions, outbound request creations, approval workflows, stock adjustments, and atomic transaction updates.
- **Files:** [InventoryService.cs](file:///c:/Users/Local%20User/Downloads/SMS-Website/Services/InventoryService.cs), [IInventoryService.cs](file:///c:/Users/Local%20User/Downloads/SMS-Website/Services/IInventoryService.cs)
- **Dependencies:** `UpmsDbContext`

#### 3. DashboardService (`IDashboardService`)
- **Purpose:** Calculates KPI aggregations, critical stock alerts, total valuation, and historical transaction volume charts.
- **Files:** [DashboardService.cs](file:///c:/Users/Local%20User/Downloads/SMS-Website/Services/DashboardService.cs)

#### 4. ExcelExportService (`IExcelExportService`)
- **Purpose:** Generates formatted Excel reports (.xlsx) using ClosedXML library for catalog items, transactions, and compatibility lists.
- **Files:** [ExcelExportService.cs](file:///c:/Users/Local%20User/Downloads/SMS-Website/Services/ExcelExportService.cs)

---

### C. Data Access & Models

#### Database Context
- **Class:** `UpmsDbContext` ([UpmsDbContext.cs](file:///c:/Users/Local%20User/Downloads/SMS-Website/Data/UpmsDbContext.cs))
- **Provider:** Npgsql EF Core PostgreSQL Provider
- **Sequence Generator:** `GenerateNextUpfIdAsync()` for automated string primary key generation (`UPF-10001`).

#### Core Entities & PostgreSQL Tables

| Entity | Table Name | Key Purpose | Primary Key |
|---|---|---|---|
| `User` | `Users` | System Accounts & Role Access Matrix | `id` (int, IDENTITY) |
| `MasterData` | `Master_Data` | Sparepart Catalog & Inventory Levels | `id` (varchar(50)) |
| `BarangMasuk` | `Barang_Masuk` | Inbound Stock Log | `id` (int, IDENTITY) |
| `BarangKeluar` | `Barang_Keluar` | Outbound Stock Log & Approvals | `id` (int, IDENTITY) |
| `Supplier` | `Supplier` | Supplier Master Data | `id` (int, IDENTITY) |
| `SupplierOffer` | `Supplier_Offer` | Price Bids & Offers per Sparepart | `id` (int, IDENTITY) |
| `BiddingHistory` | `Bidding_History` | Historical Annual Bidding Records | `id` (int, IDENTITY) |
| `MachineMaster` | `Machine_Master` | Production Machines Register | `id` (int, IDENTITY) |
| `SparepartLineMapping` | `sparepart_line_mapping` | Machine-Sparepart Line Matrix | `id` (int, IDENTITY) |
| `SparepartPriceHistory` | `SPAREPART_PRICE_HISTORY` | Audit Trail for Unit Price Changes | `id` (int, IDENTITY) |
| `AuditLog` | `Audit_Log` | Action Logging (e.g. Failed Login) | `id` (bigint, IDENTITY) |
| `AppSetting` | `App_Settings` | System Key-Value Configuration | `setting_key` (varchar) |
| `EmailSupplierLog` | `Email_Supplier_Log` | Automated Email Dispatch Audit | `id` (int, IDENTITY) |

---

## 5. Security Architecture

### A. Authentication Flow
- **Mechanism:** ASP.NET Core Cookie Authentication (`CookieAuthenticationDefaults.AuthenticationScheme`)
- **Session Duration:** 4-hour sliding expiration with an absolute maximum lifespan of 8 hours.
- **Cookie Security:** `HttpOnly = true`, `SameSite = Strict`, custom cookie name `UPMS.Auth`.
- **Password Protection:** BCrypt hashing (`workFactor: 12`). Plain text fallback mechanisms are disabled.

### B. Authorization & Permissions (RBAC)
- **Global Gatekeeper:** `[Authorize]` attribute decorated on all operational controllers.
- **Role Hierarchy:**
  - `admin`: Full administrative access to user setup, configuration, pricing, and system parameters.
  - `user`: Standard operational access governed by individual granular flags.
  - `operator`: Restricted shop-floor view for item consumption.
- **Granular Permission Claims:**
  - `CanMasterData`
  - `CanAdminMgmt`
  - `CanSettings`
  - `CanBarangMasuk`
  - `CanBarangKeluar`
  - `CanLineMapping`
  - `CanMasterMachine`
  - `CanCostIntelligence`
- **Real-Time Claims Synchronization Middleware:** Custom middleware in `Program.cs` intercepts requests, fetches user permission flags directly from PostgreSQL, and dynamically updates `ClaimsPrincipal` on every request.

### C. Rate Limiting & Protection
- **IP Rate Limiting:** `AspNetCoreRateLimit` middleware restricts `/Account/Login` to 20 requests per 15-minute window per IP.
- **In-Memory Lockout:** `AccountController` locks specific IP-Username pairs for 15 minutes after 5 consecutive failed attempts.
- **CSRF Protection:** Anti-Forgery tokens enforced across all state-modifying POST requests (`[ValidateAntiForgeryToken]`).

---

## 6. Business Workflows

### Outbound Sparepart Approval Workflow
```
[User Requests Outbound Item] 
         │
         ▼
[BarangKeluar Created (Status: Pending)]
         │
         ▼
[Admin Views AdminManagement/Approvals]
         │
 ┌───────┴────────┐
 ▼                ▼
[Approve]     [Reject]
 │                │
 ▼                ▼
[Deduct Stock   [Mark Rejected
 Atomic Update]  No Stock Change]
```

### Automatic Admin Seeding Workflow
Upon startup, `DbSeeder.SeedDefaultAdminAsync()` checks PostgreSQL for an `admin` account. If missing:
1. Generates a password from `ADMIN_INITIAL_PASSWORD` environment variable (or a secure random 16-character string).
2. Hashes password using BCrypt.
3. Inserts root `admin` user with full permission flags.

---

## 7. Dependencies & External Integrations

| Package | Version | Purpose |
|---|---|---|
| `BCrypt.Net-Next` | 4.2.0 | Password hashing & verification |
| `ClosedXML` | 0.105.1 | High-performance Excel export generation |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | 9.0.3 | PostgreSQL EF Core provider |
| `Microsoft.EntityFrameworkCore.Design` | 9.0.3 | EF Core migration tools |
| `AspNetCoreRateLimit` | 4.0.2 | IP-based request rate limiting |

---

## 8. Configuration Setup

- **`appsettings.json`:** Contains global logging levels and clean placeholder configuration.
- **`appsettings.Development.json`:** Stores local development PostgreSQL connection string (`sms_database`). Excluded from Git tracking via `.gitignore`.
- **Environment Variables:** `ConnectionStrings__DefaultConnection` & `ADMIN_INITIAL_PASSWORD` for production environment injection.
