@echo off
echo.
echo ========================================
echo    ELREEM BAG STORE - STARTING SERVER
echo ========================================
echo.
echo Killing any existing processes...
taskkill /f /im node.exe >nul 2>&1

echo Starting Elreem server...
echo.
set PORT=8080
node server.js

echo.
echo Server stopped. Press any key to exit...
pause >nul
