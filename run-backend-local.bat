@echo off
cd /d C:\Users\DELL\OneDrive\Desktop\janvaani\backend
if errorlevel 1 (
  echo Failed to open backend folder.
  exit /b 1
)

if not exist node_modules (
  npm install
)

node server.js
