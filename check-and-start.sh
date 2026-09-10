#!/usr/bin/env bash
#
# Checks prerequisites (Node.js 18+, npm, project dependencies) and offers
# to install anything missing, then launches start.sh.
#
# Usage:
#   ./check-and-start.sh          # ask before installing anything missing
#   ./check-and-start.sh -y       # auto-confirm installs (no prompts)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REQUIRED_NODE_MAJOR=18
AUTO_YES=false

for arg in "$@"; do
  case "$arg" in
    -y|--yes) AUTO_YES=true ;;
  esac
done

# ---------- helpers ----------

info()  { echo " [i] $*"; }
ok()    { echo " [OK] $*"; }
warn()  { echo " [!] $*"; }
fail()  { echo " [X] $*" >&2; }

confirm() {
  # confirm "question" -> 0 (yes) or 1 (no)
  local prompt="$1"
  if [ "$AUTO_YES" = true ]; then
    return 0
  fi
  read -r -p " $prompt [y/N] " reply
  case "$reply" in
    [yY][eE][sS]|[yY]) return 0 ;;
    *) return 1 ;;
  esac
}

detect_os() {
  case "$(uname -s 2>/dev/null)" in
    Linux*)   echo "linux" ;;
    Darwin*)  echo "macos" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *)        echo "unknown" ;;
  esac
}

OS="$(detect_os)"

node_major_version() {
  node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/'
}

# ---------- Node.js ----------

install_node() {
  case "$OS" in
    linux)
      if command -v apt-get >/dev/null 2>&1; then
        info "Installation de Node.js via apt-get (nécessite sudo)..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
      elif command -v dnf >/dev/null 2>&1; then
        info "Installation de Node.js via dnf (nécessite sudo)..."
        sudo dnf install -y nodejs
      elif command -v yum >/dev/null 2>&1; then
        info "Installation de Node.js via yum (nécessite sudo)..."
        sudo yum install -y nodejs
      elif command -v pacman >/dev/null 2>&1; then
        info "Installation de Node.js via pacman (nécessite sudo)..."
        sudo pacman -Sy --noconfirm nodejs npm
      else
        fail "Aucun gestionnaire de paquets connu (apt/dnf/yum/pacman) trouvé."
        return 1
      fi
      ;;
    macos)
      if command -v brew >/dev/null 2>&1; then
        info "Installation de Node.js via Homebrew..."
        brew install node
      else
        fail "Homebrew n'est pas installé. Installe-le depuis https://brew.sh, ou installe Node.js manuellement depuis https://nodejs.org/en/download"
        return 1
      fi
      ;;
    windows)
      if command -v winget >/dev/null 2>&1; then
        info "Installation de Node.js LTS via winget..."
        winget install --id OpenJS.NodeJS.LTS -e --source winget
      elif command -v choco >/dev/null 2>&1; then
        info "Installation de Node.js LTS via Chocolatey..."
        choco install nodejs-lts -y
      else
        fail "winget/choco introuvables. Installe Node.js manuellement depuis https://nodejs.org/en/download puis relance ce script."
        return 1
      fi
      ;;
    *)
      fail "OS non reconnu. Installe Node.js 18+ manuellement depuis https://nodejs.org/en/download"
      return 1
      ;;
  esac
}

check_node() {
  if ! command -v node >/dev/null 2>&1; then
    warn "Node.js n'est pas installé."
    if confirm "Installer Node.js maintenant ?"; then
      install_node || { fail "Échec de l'installation de Node.js."; exit 1; }
    else
      fail "Node.js est requis pour continuer."
      exit 1
    fi
  fi

  local major
  major="$(node_major_version)"
  if [ -z "$major" ] || [ "$major" -lt "$REQUIRED_NODE_MAJOR" ]; then
    warn "Node.js version détectée: $(node -v 2>/dev/null || echo inconnue) (>= $REQUIRED_NODE_MAJOR requis)."
    if confirm "Mettre à jour Node.js maintenant ?"; then
      install_node || { fail "Échec de la mise à jour de Node.js."; exit 1; }
    else
      fail "Node.js $REQUIRED_NODE_MAJOR+ est requis pour continuer."
      exit 1
    fi
  fi

  # Re-check after a potential install
  if ! command -v node >/dev/null 2>&1; then
    fail "Node.js reste introuvable après installation. Ouvre un nouveau terminal et relance ce script (le PATH doit être rafraîchi)."
    exit 1
  fi

  ok "Node.js $(node -v) détecté."
}

# ---------- npm ----------

check_npm() {
  if ! command -v npm >/dev/null 2>&1; then
    fail "npm est introuvable alors que Node.js est installé. Réinstalle Node.js (npm est normalement inclus) depuis https://nodejs.org/en/download"
    exit 1
  fi
  ok "npm $(npm -v) détecté."
}

# ---------- project dependencies ----------

check_project_deps() {
  if [ ! -f "package.json" ]; then
    fail "package.json introuvable dans $SCRIPT_DIR. Ce script doit être lancé depuis le dossier du projet."
    exit 1
  fi

  local need_install=false

  if [ ! -d "node_modules" ]; then
    warn "Le dossier node_modules est absent."
    need_install=true
  elif [ "package-lock.json" -nt "node_modules" ]; then
    warn "package-lock.json a changé depuis la dernière installation."
    need_install=true
  fi

  if [ "$need_install" = true ]; then
    if confirm "Installer les dépendances du projet avec 'npm install' ?"; then
      info "Installation des dépendances..."
      npm install
      ok "Dépendances installées."
    else
      fail "Les dépendances du projet sont requises pour continuer."
      exit 1
    fi
  else
    ok "Dépendances du projet déjà installées."
  fi
}

# ---------- configuration ----------

# .env is optional: config.js falls back to sane defaults. But someone who wants
# to change the port or force the offline Quiz will not guess the file exists, so
# offer it here rather than in the documentation only.
check_env_file() {
  if [ -f ".env" ]; then
    ok "Fichier .env détecté (voir .env.example pour les réglages disponibles)."
    return
  fi
  if [ ! -f ".env.example" ]; then
    return
  fi
  warn "Aucun fichier .env — les valeurs par défaut seront utilisées (port 4000, mDNS actif)."
  if confirm "Créer un .env à partir de .env.example ?"; then
    cp .env.example .env
    ok "Fichier .env créé. Modifie-le puis relance ce script si besoin."
  fi
}

# ---------- main ----------

echo ""
echo "==========================================="
echo " GAMENIGHT - Vérification des prérequis     "
echo "==========================================="
echo ""

check_node
check_npm
check_project_deps
check_env_file

echo ""
ok "Tous les prérequis sont satisfaits."
echo ""

exec ./start.sh
