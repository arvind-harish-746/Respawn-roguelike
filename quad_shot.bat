@echo off
REM Quad Shot — Windows Native Application Launcher
setlocal

cd /d "%~dp0"

if exist "bin\quad_shot-windows.exe" (
    start "" "bin\quad_shot-windows.exe" %*
    exit /b 0
)

REM Self-healing fallback if binary is absent
echo [Self-Heal] Starting Quad Shot fallback runtime...
start "" "msedge.exe" --app="http://127.0.0.1:8080/quad_shot/index.html" --window-size=1280,820
exit /b 0
