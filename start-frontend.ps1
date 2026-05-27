Write-Host "Starting SHIVOFFSET VMS Frontend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}
npm run dev
