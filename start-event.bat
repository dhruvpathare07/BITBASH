@echo off
REM ============================================================
REM   BIT BASH BONANZA - Offline launcher (for the event PC)
REM   Double-click this file. No internet needed.
REM   Run setup.bat once (with internet) before the event.
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo   BIT BASH BONANZA - starting (offline)
echo ============================================
echo.

REM --- Make sure the frontend has been built ---
if not exist "frontend\bit-bash-New_frontend\dist\index.html" (
  echo [*] No build found - building the frontend now...
  pushd "frontend\bit-bash-New_frontend"
  call npm run build
  popd
  if not exist "frontend\bit-bash-New_frontend\dist\index.html" (
    echo [!] Build failed. Run setup.bat first ^(needs internet^).
    pause
    exit /b 1
  )
)

REM --- Start the backend (Flask) in its own window ---
echo [*] Backend  -^> http://localhost:5000
start "BitBash Backend" /D "%~dp0backend" cmd /k python app.py

REM --- Start the frontend (built site) in its own window ---
echo [*] Frontend -^> http://localhost:5173
start "BitBash Frontend" /D "%~dp0frontend\bit-bash-New_frontend" cmd /k npm run preview -- --port 5173 --strictPort

REM --- Give the servers a moment, then open the browser ---
timeout /t 4 /nobreak >nul
start "" http://localhost:5173

echo.
echo [*] Launched. Two server windows are now open.
echo       Game   : http://localhost:5173
echo       Admin  : http://localhost:5173/admin
echo.
echo     Close the two server windows to stop the event app.
echo     (This window can be closed.)
echo.
endlocal
