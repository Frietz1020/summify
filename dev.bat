@echo off
title Summify Dev

echo Starting Summify development servers...
echo.
echo [1] Wrangler proxy  → http://localhost:8787
echo [2] Vite dev server → http://localhost:5173
echo.

:: Start Wrangler in a new terminal window
start "Summify — Wrangler Proxy" cmd /k "cd /d %~dp0 && wrangler dev"

:: Small delay so Wrangler initialises before Vite starts
timeout /t 2 /nobreak >nul

:: Start Vite in a new terminal window
start "Summify — Vite Dev Server" cmd /k "cd /d %~dp0 && npm run dev"

echo Both servers are starting in separate windows.
echo Close those windows to stop the servers.
echo.
pause