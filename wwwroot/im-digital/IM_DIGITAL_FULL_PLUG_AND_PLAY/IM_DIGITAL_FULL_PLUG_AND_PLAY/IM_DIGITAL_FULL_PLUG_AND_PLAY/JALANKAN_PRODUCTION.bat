@echo off
title IM DIGITAL - Peluncur Mode Produksi (Hosting Server)
color 0A

echo =========================================================
echo         MEMULAI SISTEM IM DIGITAL WEB (MODE PRODUKSI)
echo             Siap Diakses Seluruh Jaringan Kantor
echo =========================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: 1. Cek .NET & Node.js
where dotnet >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] .NET 8 SDK / Runtime tidak ditemukan!
    echo Unduh dari: https://dotnet.microsoft.com/download/dotnet/8.0
    pause
    exit /b
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js / NPM tidak ditemukan!
    echo Unduh dari: https://nodejs.org
    pause
    exit /b
)

:: 2. Pastikan service SQL Server aktif
sc query MSSQLSERVER 2>nul | find "RUNNING" >nul
if %ERRORLEVEL% neq 0 (
    sc query MSSQL$SQLEXPRESS 2>nul | find "RUNNING" >nul
    if %ERRORLEVEL% neq 0 (
        echo [INFO] Memeriksa dan menyalakan service SQL Server...
        net start MSSQLSERVER >nul 2>&1
        if %ERRORLEVEL% neq 0 net start MSSQL$SQLEXPRESS >nul 2>&1
    )
)

:: 3. Bersihkan port 5268 dan 3001 dari proses sebelumnya agar tidak bentrok
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5268 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

:: 4. Cek apakah node_modules sudah ada
if not exist "%ROOT_DIR%web-frontend\node_modules\" (
    echo [INFO] Menginstall dependencies frontend...
    pushd "%ROOT_DIR%web-frontend"
    call npm install
    popd
)

:: 5. Cek apakah build produksi (.next) sudah ada, jika belum lakukan build
if not exist "%ROOT_DIR%web-frontend\.next\" (
    echo [INFO] Membuat bundle build produksi frontend - pertama kali...
    pushd "%ROOT_DIR%web-frontend"
    call npm run build
    popd
)

:: 6. Jalankan Backend .NET API (Release Mode, bind 0.0.0.0)
echo [1/3] Menjalankan Backend .NET API (Release Mode) di Port 5268...
start "IM DIGITAL - Backend API (Production)" /D "%ROOT_DIR%dotnet\PPI.IM.WebApi" cmd /k "dotnet run -c Release --no-launch-profile --urls http://0.0.0.0:5268"

:: 5. Jalankan Frontend Next.js (Production Server, bind 0.0.0.0)
echo [2/3] Menjalankan Frontend Next.js (Production Server) di Port 3001...
start "IM DIGITAL - Frontend Web (Production)" /D "%ROOT_DIR%web-frontend" cmd /k "npm start -- -H 0.0.0.0 -p 3001"

:: 6. Deteksi IP Komputer Lokal
set "LOCAL_IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Alamat IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do set "LOCAL_IP=%%b"
)

:: 7. Buka browser otomatis
echo [3/3] Membuka browser ke http://localhost:3001...
ping 127.0.0.1 -n 5 >nul
start http://localhost:3001

echo.
echo =========================================================
echo    APLIKASI BERJALAN DALAM MODE PRODUKSI (OPTIMIZED)
echo    - Akses dari PC Server : http://localhost:3001
echo    - Akses dari Komputer Lain : http://%LOCAL_IP%:3001
echo =========================================================
echo.
echo Jendela ini dapat Anda biarkan terbuka atau ditutup.
echo Untuk menghentikan sistem, jalankan file: HENTIKAN_WEB.bat
echo.
pause
