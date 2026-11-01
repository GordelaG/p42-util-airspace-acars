# Build script for standalone Airspace-ACARS-Setup.exe
param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRootDir = Split-Path -Parent $ScriptDir
$DistDir = Join-Path $RepoRootDir "dist"
$PkgDir = Join-Path $DistDir "p42-util-airspace-acars"
$InstallerSrc = Join-Path $RepoRootDir "installer\src\Program.cs"
$TermsFile = Join-Path $RepoRootDir "installer\TERMOS-DE-USO.txt"

if (-not $Version) {
    $pkgJson = Get-Content (Join-Path $RepoRootDir "package.json") -Raw | ConvertFrom-Json
    $Version = $pkgJson.version
}

Write-Host "[exe-builder] Compilando instalador nativo Airspace-ACARS-Setup.exe (v$Version)..."

if (-not (Test-Path (Join-Path $PkgDir "Flow\templates\p42-util-airspace-acars.json"))) {
    Write-Host "[exe-builder] Pacote dist/p42-util-airspace-acars nao encontrado. Executando npm run build..."
    $nodeExe = (Get-Command node).Source
    & $nodeExe (Join-Path $RepoRootDir "scripts\build.mjs")
}

# 1. Cria o zip temporario do pacote
$tempZip = Join-Path $DistDir "temp_embedded_pkg.zip"
if (Test-Path $tempZip) { Remove-Item $tempZip -Force }

Write-Host "[exe-builder] Criando pacote embutido compactado..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($PkgDir, $tempZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# 2. Localiza csc.exe
$cscExe = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscExe)) {
    $cscExe = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $cscExe)) {
    throw "Compilador C# csc.exe nao encontrado em C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
}

$outputExe = Join-Path $DistDir "Airspace-ACARS-Setup.exe"
$outputVerExe = Join-Path $DistDir "Airspace-ACARS-Setup-v$Version.exe"

$cscArgs = @(
    "/nologo",
    "/target:winexe",
    "/optimize+",
    "/platform:anycpu",
    "/out:`"$outputExe`"",
    "/reference:System.dll,System.Windows.Forms.dll,System.Drawing.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll",
    "/resource:`"$tempZip`",package.zip",
    "/resource:`"$TermsFile`",TERMOS-DE-USO.txt",
    "`"$InstallerSrc`""
)

Write-Host "[exe-builder] Executando csc.exe..."
$proc = Start-Process -FilePath $cscExe -ArgumentList $cscArgs -NoNewWindow -Wait -PassThru

if ($proc.ExitCode -ne 0) {
    throw "Falha na compilacao com csc.exe (Codigo: $($proc.ExitCode))"
}

# Copia versao versionada
Copy-Item -Path $outputExe -Destination $outputVerExe -Force

# Limpa zip temporario
if (Test-Path $tempZip) { Remove-Item $tempZip -Force }

$size = (Get-Item $outputExe).Length
Write-Host "[exe-builder] SUCESSO! Executavel gerado:"
Write-Host "  - $outputExe ($size bytes)"
Write-Host "  - $outputVerExe ($size bytes)"
