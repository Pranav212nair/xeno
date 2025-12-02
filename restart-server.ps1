# Restart Server Script
Write-Host "🔄 Restarting Xeno Backend Server..." -ForegroundColor Cyan

# Kill any existing node processes running server.js
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*server.js*"
} | Stop-Process -Force

Start-Sleep -Seconds 1

# Navigate to backend directory
Set-Location -Path "$PSScriptRoot\backend"

# Start server in new window
Write-Host "🚀 Starting server in new window..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js"

Start-Sleep -Seconds 2

# Test if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
    Write-Host "✅ Server is running!" -ForegroundColor Green
    Write-Host "🌐 Open browser: http://localhost:3000" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Server failed to start. Check the server window for errors." -ForegroundColor Red
}
