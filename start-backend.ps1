Write-Host "Starting SHIVOFFSET VMS Backend..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}
npm run dev
