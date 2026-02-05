@echo off
chcp 65001 > nul
echo ========================================
echo    WineLab Admin - Stop Servers
echo ========================================
echo.

:: Убить процесс на порту 3001 (API)
echo [*] Stopping API on port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a > nul 2>&1
    echo     Stopped PID %%a
)

:: Убить процесс на порту 8888 (Frontend)
echo [*] Stopping Frontend on port 8888...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8888 ^| findstr LISTENING') do (
    taskkill /F /PID %%a > nul 2>&1
    echo     Stopped PID %%a
)

echo.
echo [OK] All servers stopped!
echo.
pause
