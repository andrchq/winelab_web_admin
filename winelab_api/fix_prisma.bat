@echo off
echo ==========================================
echo   WineLab API - Fix Prisma EPERM Lock
echo ==========================================
echo.
echo [1/3] Stopping all Node.js processes to release file locks...
taskkill /F /IM node.exe
echo.
echo [2/3] Waiting for processes to exit...
timeout /t 3 /nobreak > nul
echo.
echo [3/3] Regenerating Prisma Client...
call npx prisma generate
echo.
echo ==========================================
echo   Success! You can now run start-dev.bat
echo ==========================================
pause
