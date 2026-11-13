@echo off
title IM DIGITAL - Hentikan Aplikasi Web
color 0E

echo =========================================================
echo             MENGHENTIKAN SISTEM IM DIGITAL WEB
echo =========================================================
echo.

echo Menghentikan Backend API...
taskkill /F /IM PPI.IM.WebApi.exe /T 2>nul

echo Menghentikan proses port 5268, 3000, dan 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5268 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

echo.
echo [OK] Seluruh service IM DIGITAL telah dihentikan.
echo.
pause
