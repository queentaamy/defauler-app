# Run test suite
Write-Host "Running Backend Tests..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\backend"
& ".\venv\Scripts\python.exe" -m pytest tests/ -v

Write-Host "`nRunning Frontend Typecheck..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend"
npm run typecheck
