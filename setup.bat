@echo off
REM ============================================================
REM   BIT BASH BONANZA - One-time setup (NEEDS INTERNET)
REM   Run this once on the event PC before the event.
REM   Afterwards, start-event.bat runs fully offline.
REM   Requires Python and Node.js to be installed.
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo   BIT BASH BONANZA - one-time setup
echo ============================================
echo.

REM --- Backend Python dependencies ---
echo [*] Installing backend (Python) dependencies...
pip install -r "backend\requirements.txt"
if errorlevel 1 (
  echo [!] pip install failed. Is Python installed and on PATH?
  pause
  exit /b 1
)

REM --- Admin passkey file (gitignored) ---
if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  echo [!] Created backend\.env - open it and set ADMIN_PASSKEY
  echo     before the event ^(this file is private / gitignored^).
)

REM --- Frontend npm dependencies + production build ---
echo [*] Installing frontend (npm) dependencies...
pushd "frontend\bit-bash-New_frontend"
call npm install
if errorlevel 1 (
  echo [!] npm install failed. Is Node.js installed and on PATH?
  popd
  pause
  exit /b 1
)

echo [*] Building the frontend...
call npm run build
popd

echo.
echo [*] Setup complete.
echo     You can now run start-event.bat - no internet required.
echo.
pause
endlocal
