@echo off
setlocal enabledelayedexpansion
title SMS - Deployment Builder
echo ====================================================
echo   Sparepart Management System - Deployment Builder
echo   Auto Naming: SMS v[Bulan].[Tanggal].[UrutanBuild]
echo ====================================================
echo.

REM -- 1. Check Python -----------------------------------
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python tidak ditemukan. Install Python 3.10+ dulu.
    pause
    exit /b 1
)
echo [OK] Python terdeteksi.

python scripts\get_build_version.py --batch > "%TEMP%\sms_build_vars.bat"
call "%TEMP%\sms_build_vars.bat"
del "%TEMP%\sms_build_vars.bat" 2>nul
echo [OK] Versi Build  : %VERSION_TAG%
echo [OK] Nama Executable: %OUTPUT_EXE_LABEL%.exe
echo [OK] Folder Target  : %DEPLOY_FOLDER%\
echo.

REM -- 2. Install dependencies ---------------------------
echo.
echo [STEP 1/7] Menginstall dependencies...
call pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [ERROR] Gagal install dependencies.
    pause
    exit /b 1
)
echo [OK] Dependencies siap.

REM -- 3. Install PyInstaller ----------------------------
echo.
echo [STEP 2/7] Memastikan PyInstaller tersedia...
call pip install pyinstaller --quiet 2>nul

REM -- 4. Bersihkan build sebelumnya ---------------------
echo.
echo [STEP 3/7] Membersihkan build sebelumnya...
if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"
echo [OK] Bersih.

REM -- 5. Generate version info --------------------------
echo.
echo [STEP 4/7] Generate version info (%OUTPUT_EXE_LABEL%)...
python scripts\generate_version.py
if %errorlevel% neq 0 (
    echo [WARN] Gagal generate version info, lanjut tanpa version file.
    del /q "version_info.txt" 2>nul
)

REM -- 6. Compile ke .exe --------------------------------
echo.
echo [STEP 5/7] Compile aplikasi ke .exe via PyInstaller (%OUTPUT_EXE_LABEL%)...
python -m PyInstaller UPMS_App.spec --clean --noconfirm
if %errorlevel% neq 0 (
    echo [ERROR] Compile gagal. Lihat log di atas.
    pause
    exit /b 1
)
echo [OK] Compile selesai.

REM -- 7. Siapkan folder deploy -------------------------
echo.
echo [STEP 6/7] Menyiapkan folder deploy: %DEPLOY_FOLDER%\...
if exist "%DEPLOY_FOLDER%" rmdir /s /q "%DEPLOY_FOLDER%"
mkdir "%DEPLOY_FOLDER%"

REM Copy hasil compile (onedir folder berisi exe + _internal/)
xcopy "dist\UPMS_App" "%DEPLOY_FOLDER%\" /E /I /Q >nul
if not exist "%DEPLOY_FOLDER%\UPMS_App.exe" (
    echo [ERROR] Hasil compile tidak ditemukan di dist\UPMS_App\.
    pause
    exit /b 1
)
echo [OK] Aplikasi + dependencies copied.

REM Rename exe sesuai versi (contoh: SMS v7.27.1.exe)
ren "%DEPLOY_FOLDER%\UPMS_App.exe" "%OUTPUT_EXE_LABEL%.exe"
echo [OK] Renamed to %OUTPUT_EXE_LABEL%.exe

REM Copy config.yaml (template production)
copy "config.yaml" "%DEPLOY_FOLDER%\" >nul
echo [OK] Config copied.

REM Copy config_local.yaml sebagai referensi (opsional)
if exist "config_local.yaml" (
    copy "config_local.yaml" "%DEPLOY_FOLDER%\config_local.example.yaml" >nul
    echo [OK] Config example copied.
)

REM Copy data files jika ada
if exist "data" (
    mkdir "%DEPLOY_FOLDER%\data"
    copy "data\*.csv" "%DEPLOY_FOLDER%\data\" >nul 2>nul
    copy "data\*.xlsx" "%DEPLOY_FOLDER%\data\" >nul 2>nul
    echo [OK] Data files copied.
)

REM Buat folder logs (akan dipakai runtime)
mkdir "%DEPLOY_FOLDER%\logs"
copy nul "%DEPLOY_FOLDER%\logs\.gitkeep" >nul
echo [OK] Logs folder ready.

REM Copy Version History & Catatan Rilis
echo [VERSION HISTORY] Menyiapkan catatan rilis versi...
python scripts\update_version_history.py "%DEPLOY_FOLDER%"
echo [OK] Version history copied to %DEPLOY_FOLDER%\

REM -- 8. Bersihkan temporary build files ----------------
echo.
echo [STEP 7/7] Membersihkan file temporary build...
if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"
del /q "version_info.txt" 2>nul

echo.
echo ====================================================
echo   DEPLOY SIAP! %OUTPUT_EXE_LABEL%
echo ====================================================
echo.
echo Folder %DEPLOY_FOLDER%\ berisi:
echo   - %OUTPUT_EXE_LABEL%.exe  (aplikasi utama)
echo   - _internal\               (dependencies + DLLs)
echo   - config.yaml              (EDIT: isi kredensial SQL Server)
echo   - config_local.example.yaml
echo   - CATATAN_RILIS.txt        (Catatan rilis versi ini)
echo   - VERSION_HISTORY.md       (Riwayat rilis lengkap)
echo   - logs\                    (log runtime)
echo.
echo LANGKAH SELANJUTNYA:
echo   1. Buka %DEPLOY_FOLDER%\config.yaml
echo   2. Ganti host, user, password SQL Server
echo   3. Jalankan %OUTPUT_EXE_LABEL%.exe
echo.
endlocal
pause
