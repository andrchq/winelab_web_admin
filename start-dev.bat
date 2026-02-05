@echo off
chcp 65001 > nul
title WineLab Dev Environment
echo ========================================
echo    WineLab Admin - Quick Start
echo ========================================
echo.

:: Убиваем процессы на используемых портах
echo [*] Checking ports...

:: Убить процесс на порту 3001 (API)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    echo [!] Killing process on port 3001 (PID: %%a)
    taskkill /F /PID %%a > nul 2>&1
)

:: Убить процесс на порту 8888 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8888 ^| findstr LISTENING') do (
    echo [!] Killing process on port 8888 (PID: %%a)
    taskkill /F /PID %%a > nul 2>&1
)

:: Проверяем, установлены ли зависимости
if not exist "node_modules" (
    echo [!] Installing frontend dependencies...
    call npm install
)

if not exist "winelab_api\node_modules" (
    echo [!] Installing API dependencies...
    cd winelab_api
    call npm install
    cd ..
)

echo.
echo [1/2] Starting Backend API (NestJS)...
start "WineLab API" cmd /k "chcp 65001 > nul && cd /d %~dp0winelab_api && npm run start:dev"

echo [2/2] Starting Frontend (Next.js)...
timeout /t 3 /nobreak > nul
start "WineLab Frontend" cmd /k "chcp 65001 > nul && cd /d %~dp0 && npm run dev"

echo.
echo ========================================
echo    Servers started!
echo ----------------------------------------
echo    Frontend: http://localhost:8888
echo    API:      http://localhost:3001
echo ========================================
echo.
pause
