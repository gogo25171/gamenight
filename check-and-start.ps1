# Verifie les prerequis (Node.js 18+, npm, dependances du projet) et propose
# de les installer si besoin, puis lance start.bat.
#
# Usage:
#   .\check-and-start.ps1          # demande confirmation avant chaque installation
#   .\check-and-start.ps1 -Yes     # confirme automatiquement les installations

param(
    [switch]$Yes
)

$ErrorActionPreference = "Stop"
$RequiredNodeMajor = 18

Set-Location -Path $PSScriptRoot

function Write-Info  { param($m) Write-Host " [i] $m" }
function Write-Ok    { param($m) Write-Host " [OK] $m" -ForegroundColor Green }
function Write-Warn  { param($m) Write-Host " [!] $m" -ForegroundColor Yellow }
function Write-Fail  { param($m) Write-Host " [X] $m" -ForegroundColor Red }

function Confirm-Action {
    param([string]$Prompt)
    if ($Yes) { return $true }
    $reply = Read-Host " $Prompt [o/N]"
    return ($reply -match '^(o|oui|y|yes)$')
}

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-NodeJs {
    if (Test-CommandExists "winget") {
        Write-Info "Installation de Node.js LTS via winget..."
        winget install --id OpenJS.NodeJS.LTS -e --source winget
    }
    elseif (Test-CommandExists "choco") {
        Write-Info "Installation de Node.js LTS via Chocolatey..."
        choco install nodejs-lts -y
    }
    else {
        Write-Fail "winget/choco introuvables. Installe Node.js manuellement depuis https://nodejs.org/en/download puis relance ce script."
        return $false
    }
    return $true
}

function Get-NodeMajorVersion {
    try {
        $v = (node -v) 2>$null
        if ($v -match '^v(\d+)\.') { return [int]$Matches[1] }
    } catch {}
    return $null
}

function Check-Node {
    if (-not (Test-CommandExists "node")) {
        Write-Warn "Node.js n'est pas installe."
        if (Confirm-Action "Installer Node.js maintenant ?") {
            if (-not (Install-NodeJs)) { Write-Fail "Echec de l'installation de Node.js."; exit 1 }
        } else {
            Write-Fail "Node.js est requis pour continuer."
            exit 1
        }
    }

    $major = Get-NodeMajorVersion
    if (-not $major -or $major -lt $RequiredNodeMajor) {
        Write-Warn "Version de Node.js insuffisante (>= $RequiredNodeMajor requis)."
        if (Confirm-Action "Mettre a jour Node.js maintenant ?") {
            if (-not (Install-NodeJs)) { Write-Fail "Echec de la mise a jour de Node.js."; exit 1 }
        } else {
            Write-Fail "Node.js $RequiredNodeMajor+ est requis pour continuer."
            exit 1
        }
    }

    if (-not (Test-CommandExists "node")) {
        Write-Fail "Node.js reste introuvable apres installation. Ouvre un nouveau terminal (PATH rafraichi) et relance ce script."
        exit 1
    }

    Write-Ok "Node.js $(node -v) detecte."
}

function Check-Npm {
    if (-not (Test-CommandExists "npm")) {
        Write-Fail "npm est introuvable alors que Node.js est installe. Reinstalle Node.js depuis https://nodejs.org/en/download"
        exit 1
    }
    Write-Ok "npm $(npm -v) detecte."
}

function Check-ProjectDeps {
    if (-not (Test-Path "package.json")) {
        Write-Fail "package.json introuvable dans $PSScriptRoot. Lance ce script depuis le dossier du projet."
        exit 1
    }

    $needInstall = $false

    if (-not (Test-Path "node_modules")) {
        Write-Warn "Le dossier node_modules est absent."
        $needInstall = $true
    }
    elseif ((Get-Item "package-lock.json").LastWriteTime -gt (Get-Item "node_modules").LastWriteTime) {
        Write-Warn "package-lock.json a change depuis la derniere installation."
        $needInstall = $true
    }

    if ($needInstall) {
        if (Confirm-Action "Installer les dependances du projet avec 'npm install' ?") {
            Write-Info "Installation des dependances..."
            npm install
            if ($LASTEXITCODE -ne 0) { Write-Fail "npm install a echoue."; exit 1 }
            Write-Ok "Dependances installees."
        } else {
            Write-Fail "Les dependances du projet sont requises pour continuer."
            exit 1
        }
    } else {
        Write-Ok "Dependances du projet deja installees."
    }
}

Write-Host ""
Write-Host "==========================================="
Write-Host " GAMENIGHT - Verification des prerequis     "
Write-Host "==========================================="
Write-Host ""

Check-Node
Check-Npm
Check-ProjectDeps

Write-Host ""
Write-Ok "Tous les prerequis sont satisfaits."
Write-Host ""

& "$PSScriptRoot\start.bat"
