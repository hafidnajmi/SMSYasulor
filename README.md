# Sparepart Management System (SMS / UPMS) — ASP.NET Core Migration Project

This project contains the migration of the existing **Sparepart Management System (SMS)** from its Python/Flet desktop application to a production-ready **ASP.NET Core Web Application**.

## System Overview

- **Original Platform:** Python 3.13 / Flet Desktop Application (v4.27.0)
- **Target Platform:** ASP.NET Core 8.0 Web Application (MVC / Razor Views)
- **Database:** Microsoft SQL Server (`UPMS_Database`) — *Preserved without schema modification in Phase 1*
- **UI Design Direction:** Microsoft Enterprise Corporate Web Application (Inspired by `emsneotrust.com`)

## Documentation Architecture

- [`MIGRATION_ANALYSIS.md`](file:///c:/Users/Local%20User/Downloads/UP-Management%20Sparepart-python/MIGRATION_ANALYSIS.md): Comprehensive system discovery, module inventory, business rules, and risks.
- [`MIGRATION_MATRIX.md`](file:///c:/Users/Local%20User/Downloads/UP-Management%20Sparepart-python/MIGRATION_MATRIX.md): Detailed function-by-function mapping from Python source to C# ASP.NET Core controllers and services.
- [`DATABASE_MAPPING.md`](file:///c:/Users/Local%20User/Downloads/UP-Management%20Sparepart-python/DATABASE_MAPPING.md): Field-level mapping of existing SQL Server schema to Entity Framework Core models.
- [`ARCHITECTURE.md`](file:///c:/Users/Local%20User/Downloads/UP-Management%20Sparepart-python/ARCHITECTURE.md): Layered system design, directory structure blueprint, and UI styling guidelines.
- [`TEST_PLAN.md`](file:///c:/Users/Local%20User/Downloads/UP-Management%20Sparepart-python/TEST_PLAN.md): Complete test suite and test cases for validating functional parity.
- [`REGRESSION_TEST_MATRIX.md`](file:///c:/Users/Local%20User/Downloads/UP-Management%20Sparepart-python/REGRESSION_TEST_MATRIX.md): Side-by-side verification matrix comparing old vs new system.

## Key Migration Principles

1. **Functional Parity First**: All business rules, formulas, approval workflows, calculations, and RBAC rules are strictly preserved.
2. **Database Preservation**: Existing SQL Server schema, sequence generators, tables, and stored procedures remain untouched during Phase 1.
3. **No Unnecessary Frameworks**: Built using standard ASP.NET Core MVC, Razor Views, EF Core, Bootstrap 5, and vanilla JavaScript.
