@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Python 3 was not found. Install Python 3 from python.org, then run this file again.
  pause
  exit /b 1
)
py -3 -c "import sys; raise SystemExit(sys.version_info < (3, 10))" >nul 2>nul
if errorlevel 1 (
  echo Python 3.10 or later is required. Update Python, then run this file again.
  pause
  exit /b 1
)
py -3 server.py
if errorlevel 1 pause
