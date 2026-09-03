# System Management Sparepart (SMS) — Target ASP.NET Core Architecture

> **Target Platform:** ASP.NET Core 8.0 / .NET 8 Web Application  
> **Architecture Pattern:** Clean Layered Monolith (Web / Application / Domain / Infrastructure)  
> **UI Design Direction:** Microsoft Enterprise Corporate Web Application (Inspired by `emsneotrust.com`)  

---

## 1. High-Level System Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │          Client Browser (Desktop / Tablet)   │
                       │  HTML5 + Bootstrap 5 + Vanilla JS / Chart.js │
                       └──────────────────────┬───────────────────────┘
                                              │ HTTP / HTTPS
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ASP.NET CORE WEB LAYER                                  │
│                                                                                           │
│  Controllers/                     Views/                          ViewModels/             │
│  ├── AccountController.cs         ├── Account/Login.cshtml        ├── LoginViewModel.cs   │
│  ├── DashboardController.cs       ├── Shared/_Layout.cshtml       ├── DashboardViewModel  │
│  ├── MasterDataController.cs      ├── MasterData/Index.cshtml     ├── MasterDataVM.cs     │
│  ├── BarangMasukController.cs     ├── BarangMasuk/Index.cshtml    ├── BarangMasukVM.cs    │
│  ├── BarangKeluarController.cs    ├── BarangKeluar/Index.cshtml   ├── BarangKeluarVM.cs   │
│  └── AdminManagementController.cs └── AdminManagement/...         └── ...                 │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ Injected Services
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                   APPLICATION SERVICE LAYER                               │
│                                                                                           │
│  Services/                                Interfaces/                                     │
│  ├── AuthService.cs                      ├── IAuthService.cs                             │
│  ├── SparepartService.cs                 ├── ISparepartService.cs                         │
│  ├── InventoryService.cs                 ├── IInventoryService.cs                         │
│  ├── ProcurementService.cs               ├── IProcurementService.cs                       │
│  ├── CostAnalyticsService.cs             ├── ICostAnalyticsService.cs                     │
│  └── EmailNotificationService.cs         └── IEmailNotificationService.cs                 │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ DbContext & EF Core
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                INFRASTRUCTURE & DOMAIN LAYER                              │
│                                                                                           │
│  Data/                                  Entities/                                         │
│  ├── UpmsDbContext.cs                    ├── User.cs                                       │
│  └── DbInitializer.cs                    ├── MasterData.cs                                 │
│                                          ├── BarangMasuk.cs                                │
│                                          ├── BarangKeluar.cs                               │
│                                          └── MachineMaster.cs                              │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │ EF Core SQL Server Provider
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │          Microsoft SQL Server Database       │
                       │            Database Name: UPMS_Database      │
                       └──────────────────────────────────────────────┘
```

---

## 2. Directory Structure Blueprint

```
UPMS.Web/
├── Controllers/
│   ├── AccountController.cs
│   ├── AdminManagementController.cs
│   ├── BarangKeluarController.cs
│   ├── BarangMasukController.cs
│   ├── BiddingController.cs
│   ├── CostIntelligenceController.cs
│   ├── DashboardController.cs
│   ├── ElectricalPartsController.cs
│   ├── HistoryController.cs
│   ├── HomeController.cs
│   ├── LineMappingController.cs
│   ├── MasterDataController.cs
│   ├── MasterMachineController.cs
│   ├── MachineMappingController.cs
│   ├── OperatorController.cs
│   ├── SettingsController.cs
│   └── SupplierController.cs
├── Services/
│   ├── AuthService.cs
│   ├── AuditLogService.cs
│   ├── CostAnalyticsService.cs
│   ├── EmailNotificationService.cs
│   ├── ExcelExportService.cs
│   ├── InventoryService.cs
│   ├── MachineService.cs
│   ├── ProcurementService.cs
│   └── SparepartService.cs
├── Data/
│   └── UpmsDbContext.cs
├── Models/
│   ├── AccountViewModels.cs
│   ├── AdminManagementViewModels.cs
│   ├── BarangKeluarViewModels.cs
│   ├── BarangMasukViewModels.cs
│   ├── CostIntelligenceViewModels.cs
│   ├── DashboardViewModels.cs
│   └── MasterDataViewModels.cs
├── Views/
│   ├── Account/
│   │   ├── AccessDenied.cshtml
│   │   └── Login.cshtml
│   ├── AdminManagement/
│   ├── BarangKeluar/
│   ├── BarangMasuk/
│   ├── CostIntelligence/
│   ├── Dashboard/
│   │   └── Index.cshtml
│   ├── History/
│   ├── MasterData/
│   ├── Settings/
│   └── Shared/
│       ├── _Layout.cshtml
│       ├── _NavSidebar.cshtml
│       └── _TopHeader.cshtml
├── wwwroot/
│   ├── css/
│   │   ├── site.css
│   │   └── enterprise-theme.css
│   ├── js/
│   │   ├── site.js
│   │   ├── barcode-scanner.js
│   │   └── dashboard-charts.js
│   └── lib/
│       ├── bootstrap/
│       ├── bootstrap-icons/
│       └── chartjs/
├── Program.cs
└── appsettings.json
```

---

## 3. UI/UX & Layout Design Specification

### Visual Styling Guidelines (Microsoft Corporate Web Style):
- **Primary Header Color**: `#0078D4` (Microsoft Blue) or `#005A9E` (Deep Corporate Blue).
- **Sidebar Background**: `#1F2937` (Dark Slate Gray) / `#111827` with clean active item highlight `#2563EB`.
- **Background Layout**: `#F3F4F6` (Off-white / Neutral Gray light canvas).
- **Typography**: Segoe UI, system-ui, -apple-system, sans-serif.
- **Card Treatment**: Bordered white cards with subtle shadow (`box-shadow: 0 1px 3px rgba(0,0,0,0.1)`), non-rounded modern enterprise edges (`border-radius: 6px`).
- **Data Tables**: Striped, compact hover rows, bold headers, sticky column actions, pagination controls at bottom right.

### Global Page Layout (`_Layout.cshtml` Structure):

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP HEADER                                                             │
│ [≡] Sparepart Management System (SMS)       Search...   [User Profile]  │
├───────────────┬────────────────────────────────────────────────────────┤
│               │ Breadcrumbs: Dashboard / Master Data                   │
│ SIDEBAR       ├────────────────────────────────────────────────────────┤
│               │ PAGE HEADER & MAIN ACTIONS                             │
│ 📊 Dashboard  │                                                        │
│ 📦 Master Data│ [ KPI Card 1 ]  [ KPI Card 2 ]  [ KPI Card 3 ]           │
│ 📥 Masuk      │                                                        │
│ 📤 Keluar     │ ┌────────────────────────────────────────────────────┐ │
│ ⚙️ Admin      │ │ DATA TABLE / MAIN CONTENT                          │ │
│ 📈 Analytics  │ │                                                    │ │
│ 🔒 Settings   │ └────────────────────────────────────────────────────┘ │
└───────────────┴────────────────────────────────────────────────────────┘
```
