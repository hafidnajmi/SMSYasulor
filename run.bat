@echo off
setlocal enabledelayedexpansion
title SMS - Build ^& Deploy

REM ===========================================================================
REM  run.bat  —  SMS / UPMS Build Script
REM  Otomatis compile Python -> .exe, lalu buat folder deploy siap server.
REM  Auto Naming Format: SMS v<Bulan>.<Tanggal>.<UrutanBuild> (contoh: SMS v7.27.1)
REM ===========================================================================

echo.
echo  ============================================================
echo    Sparepart Management System  -  Build ^& Deploy Script
echo  ============================================================
echo.

REM ---------------------------------------------------------------------------
REM  KONFIGURASI DASAR
REM ---------------------------------------------------------------------------
set APP_NAME=SMS
set SPEC_FILE=UPMS_App.spec
set EXE_NAME=UPMS_App

REM ---------------------------------------------------------------------------
REM  STEP 0: Cek Python
REM ---------------------------------------------------------------------------
echo [CHECK] Memeriksa Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Python tidak ditemukan di PATH.
    echo          Pastikan Python 3.10+ sudah terinstall dan ada di PATH.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo  [OK] %PY_VER% terdeteksi.
echo.

REM ---------------------------------------------------------------------------
REM  STEP 0.5: Generate Versi Otomatis (SMS v<Bulan>.<Tanggal>.<UrutanBuild>)
REM ---------------------------------------------------------------------------
echo [VERSION] Menghitung versi compile otomatis...
for /f "tokens=*" %%i in ('python scripts\get_build_version.py --batch') do %%i
echo  [OK] Versi Build  : %VERSION_TAG%
echo  [OK] Nama Executable: %OUTPUT_EXE_LABEL%.exe
echo  [OK] Folder Deploy  : %DEPLOY_FOLDER%\
echo.

REM Generate version_info.txt untuk Windows Resource metadata
python scripts\generate_version.py

REM ---------------------------------------------------------------------------
REM  STEP 1: Install / Update Dependencies
REM ---------------------------------------------------------------------------
echo  [1/6] Menginstall dependencies dari requirements.txt...
call pip install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo  [ERROR] Gagal install dependencies. Cek requirements.txt dan koneksi internet.
    pause
    exit /b 1
)
echo  [OK] Dependencies siap.
echo.

REM ---------------------------------------------------------------------------
REM  STEP 2: Pastikan PyInstaller tersedia
REM ---------------------------------------------------------------------------
echo  [2/6] Memastikan PyInstaller tersedia...
call pip install pyinstaller -q 2>nul
echo  [OK] PyInstaller siap.
echo.

REM ---------------------------------------------------------------------------
REM  STEP 3: Bersihkan build sebelumnya
REM ---------------------------------------------------------------------------
echo  [3/6] Membersihkan hasil build sebelumnya...
if exist "build"  rmdir /s /q "build"
if exist "dist"   rmdir /s /q "dist"
echo  [OK] Direktori build dan dist dibersihkan.
echo.

REM ---------------------------------------------------------------------------
REM  STEP 4: Compile ke .exe via PyInstaller
REM ---------------------------------------------------------------------------
echo  [4/6] Mengkompilasi aplikasi ke .exe (%OUTPUT_EXE_LABEL%)...
echo        (Proses ini bisa memakan waktu 2 - 5 menit, harap tunggu...)
echo.
python -m PyInstaller "%SPEC_FILE%" --clean --noconfirm 2>&1
set COMPILE_ERR=!errorlevel!
if !COMPILE_ERR! neq 0 (
    echo.
    echo  [ERROR] Compile gagal! Periksa error log di atas.
    echo          Pastikan semua dependencies terinstall dengan benar.
    pause
    exit /b 1
)
echo.
echo  [OK] Compile berhasil. Hasil ada di dist\%EXE_NAME%\
echo.

REM ---------------------------------------------------------------------------
REM  STEP 5: Siapkan folder deploy
REM ---------------------------------------------------------------------------
echo  [5/6] Menyiapkan folder deploy: %DEPLOY_FOLDER%\
echo.

REM Hapus folder deploy lama dengan nama yang sama jika ada
if exist "%DEPLOY_FOLDER%" (
    echo  [INFO] Menghapus folder deploy lama: %DEPLOY_FOLDER%\
    rmdir /s /q "%DEPLOY_FOLDER%"
)
mkdir "%DEPLOY_FOLDER%"

REM -- Verifikasi hasil compile ada ----------------------------------------
if not exist "dist\%EXE_NAME%" (
    echo  [ERROR] Folder dist\%EXE_NAME%\ tidak ditemukan setelah compile.
    echo          Cek apakah PyInstaller berhasil membuat folder dist.
    pause
    exit /b 1
)
if not exist "dist\%EXE_NAME%\%EXE_NAME%.exe" (
    echo  [ERROR] File %EXE_NAME%.exe tidak ditemukan di dist\%EXE_NAME%\.
    echo          Pastikan nama 'name' di %SPEC_FILE% sesuai dengan EXE_NAME=%EXE_NAME%
    pause
    exit /b 1
)

REM -- Copy hasil compile (onedir) via robocopy -----------------------------
echo  [COPY] Menyalin file executable dan dependencies...
robocopy "dist\%EXE_NAME%" "%DEPLOY_FOLDER%" /E /NFL /NDL /NJH /NJS /nc /ns /np
set COPY_ERR=!errorlevel!
if !COPY_ERR! geq 8 (
    echo  [ERROR] Gagal menyalin file executable ke folder deploy. Kode: !COPY_ERR!
    pause
    exit /b 1
)
echo  [OK] Executable + internal dependencies disalin.

REM -- Rename exe sesuai label versi (contoh: SMS v7.27.1.exe) ----------------
ren "%DEPLOY_FOLDER%\%EXE_NAME%.exe" "%OUTPUT_EXE_LABEL%.exe"
echo  [OK] Executable di-rename menjadi: %OUTPUT_EXE_LABEL%.exe

REM -- Copy config.yaml (WAJIB untuk koneksi DB) -----------------------------
copy "config.yaml" "%DEPLOY_FOLDER%" >nul
echo  [OK] config.yaml disalin. (PENTING: Edit kredensial SQL Server sebelum deploy!)

REM -- Copy config_local.yaml sebagai contoh/referensi ----------------------
if exist "config_local.yaml" (
    copy "config_local.yaml" "%DEPLOY_FOLDER%\config_local.example.yaml" >nul
    echo  [OK] config_local.example.yaml disalin.
) else (
    echo  [INFO] config_local.yaml tidak ada, dilewati.
)

REM -- Copy migrations (untuk referensi DBA) --------------------------------
if exist "migrations" (
    mkdir "%DEPLOY_FOLDER%\migrations"
    xcopy "migrations\*" "%DEPLOY_FOLDER%\migrations\" /E /I /Q >nul
    echo  [OK] Folder migrations disalin.
)

REM -- Buat folder logs (dibutuhkan saat runtime) ----------------------------
mkdir "%DEPLOY_FOLDER%\logs"
copy nul "%DEPLOY_FOLDER%\logs\.gitkeep" >nul
echo  [OK] Folder logs disiapkan.

REM -- Copy README / docs jika ada -------------------------------------------
if exist "DOCS-SMS.md" (
    copy "DOCS-SMS.md" "%DEPLOY_FOLDER%\DOCS-SMS.md" >nul
    echo  [OK] DOCS-SMS.md disalin sebagai dokumentasi.
)
if exist "Database_Migration_Guide.md" (
    copy "Database_Migration_Guide.md" "%DEPLOY_FOLDER%\Database_Migration_Guide.md" >nul
    echo  [OK] Database_Migration_Guide.md disalin.
)

REM ---------------------------------------------------------------------------
REM  STEP 6: Bersihkan file temporary build
REM ---------------------------------------------------------------------------
echo.
echo  [6/6] Membersihkan file temporary build (build\, dist\, __pycache__)...
if exist "build"        rmdir /s /q "build"
if exist "dist"         rmdir /s /q "dist"
if exist "__pycache__"  rmdir /s /q "__pycache__"
del /q "version_info.txt" 2>nul

REM ---------------------------------------------------------------------------
REM  SELESAI
REM ---------------------------------------------------------------------------
echo.
echo  ============================================================
echo    BUILD BERHASIL!  -  %OUTPUT_EXE_LABEL%
echo  ============================================================
echo.
echo  Folder deploy siap: %DEPLOY_FOLDER%\
echo.
echo  Isi folder:
echo    - %OUTPUT_EXE_LABEL%.exe     ^(executable utama^)
echo    - _internal\                 ^(dependencies, DLLs, Python libs^)
echo    - config.yaml                ^(*** EDIT kredensial SQL Server dulu! ***^)
echo    - logs\                      ^(akan terisi log saat runtime^)
echo    - migrations\                ^(referensi script SQL untuk DBA^)
echo    - DOCS-SMS.md                ^(dokumentasi sistem^)
echo.
echo  LANGKAH DEPLOY KE SERVER:
echo    1. Salin seluruh folder  %DEPLOY_FOLDER%\  ke server target.
echo    2. Buka  config.yaml  dan isi:
echo         host    ^: ^<IP SQL Server^>
echo         user    ^: ^<username SQL Server^>
echo         password^: ^<password SQL Server^>
echo         database^: ^<nama database^>
echo    3. Jalankan:  "%OUTPUT_EXE_LABEL%.exe"
echo.
echo  ============================================================
echo.
endlocal
pause
