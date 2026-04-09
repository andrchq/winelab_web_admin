#!/usr/bin/env bash

set -euo pipefail

DOMAIN="${WL_DOMAIN:-lkwl.prsta.xyz}"
SERVER_IP="${WL_SERVER_IP:-87.242.100.57}"
APP_USER="${WL_APP_USER:-prsta}"
INSTALL_ROOT="${WL_INSTALL_ROOT:-/home/prsta}"
PROJECT_NAME="winelab_web_admin"
PROJECT_DIR="$INSTALL_ROOT/$PROJECT_NAME"
DEPLOY_DIR="$PROJECT_DIR/deploy"
ENV_DIR="$DEPLOY_DIR/env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WL_COMMAND_PATH="/usr/local/bin/wl"
GIT_REPO="${WL_GIT_REPO:-https://github.com/andrchq/winelab_web_admin.git}"
GIT_BRANCH="${WL_GIT_BRANCH:-main}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
else
    SUDO="sudo"
fi

log() {
    echo -e "${GREEN}$1${NC}"
}

warn() {
    echo -e "${YELLOW}$1${NC}"
}

fail() {
    echo -e "${RED}$1${NC}"
    exit 1
}

ensure_package() {
    $SUDO apt-get update -y
    $SUDO apt-get install -y "$@"
}

install_docker() {
    if command -v docker >/dev/null 2>&1; then
        return
    fi

    log "Installing Docker..."
    curl -fsSL https://get.docker.com | $SUDO sh
}

install_compose_plugin() {
    if docker compose version >/dev/null 2>&1; then
        return
    fi

    log "Installing Docker Compose plugin..."
    ensure_package docker-compose-plugin
}

install_caddy() {
    log "Installing Caddy..."
    ensure_package debian-keyring debian-archive-keyring apt-transport-https curl gnupg
    $SUDO rm -f /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    $SUDO rm -f /etc/apt/sources.list.d/caddy-stable.list
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | $SUDO gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | $SUDO tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    $SUDO apt-get update -y
    $SUDO apt-get install -y caddy
}

create_app_user() {
    if id "$APP_USER" >/dev/null 2>&1; then
        return
    fi

    log "Creating user $APP_USER..."
    $SUDO useradd -m -d "$INSTALL_ROOT" -s /bin/bash "$APP_USER"
}

check_wl_command() {
    local existing=""
    existing="$(command -v wl 2>/dev/null || true)"

    if [ -n "$existing" ] && [ "$existing" != "$WL_COMMAND_PATH" ]; then
        fail "Command 'wl' is already installed at $existing. Resolve the conflict before continuing."
    fi
}

verify_domain() {
    local records
    records="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | sort -u | tr '\n' ' ' || true)"

    if [[ "$records" != *"$SERVER_IP"* ]]; then
        warn "Domain $DOMAIN does not currently resolve to $SERVER_IP. Current A records: ${records:-none}"
        warn "Caddy can still be installed, but certificate issuance will wait until DNS points to the server."
    fi
}

resolve_git_source() {
    if [ -z "${WL_GIT_REPO:-}" ]; then
        GIT_REPO="$(git -C "$SOURCE_DIR" config --get remote.origin.url 2>/dev/null || true)"
    fi

    if [ -z "${WL_GIT_BRANCH:-}" ]; then
        GIT_BRANCH="$(git -C "$SOURCE_DIR" branch --show-current 2>/dev/null || true)"
    fi

    [ -n "$GIT_REPO" ] || fail "Unable to detect git remote. Pass WL_GIT_REPO explicitly."
    [ -n "$GIT_BRANCH" ] || GIT_BRANCH="main"
}

sync_project() {
    local env_backup=""

    log "Syncing project from git..."
    $SUDO mkdir -p "$INSTALL_ROOT"

    if [ -d "$ENV_DIR" ]; then
        env_backup="$(mktemp -d)"
        $SUDO cp -a "$ENV_DIR/." "$env_backup/" 2>/dev/null || true
    fi

    if [ -d "$PROJECT_DIR/.git" ]; then
        $SUDO git -C "$PROJECT_DIR" fetch --prune origin
        $SUDO git -C "$PROJECT_DIR" checkout "$GIT_BRANCH"
        $SUDO git -C "$PROJECT_DIR" reset --hard "origin/$GIT_BRANCH"
    else
        $SUDO rm -rf "$PROJECT_DIR"
        $SUDO git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$PROJECT_DIR"
    fi

    $SUDO mkdir -p "$ENV_DIR"

    if [ -n "$env_backup" ] && [ -d "$env_backup" ]; then
        $SUDO cp -a "$env_backup/." "$ENV_DIR/" 2>/dev/null || true
        rm -rf "$env_backup"
    fi

    $SUDO chown -R "$APP_USER:$APP_USER" "$INSTALL_ROOT"
}

random_secret() {
    openssl rand -hex 32
}

write_env_files() {
    local compose_env="$ENV_DIR/compose.env"
    local api_env="$ENV_DIR/api.env"
    local web_env="$ENV_DIR/web.env"
    local db_password jwt_secret refresh_secret maps_key yandex_token

    db_password="${WL_POSTGRES_PASSWORD:-$(random_secret)}"
    jwt_secret="${WL_JWT_SECRET:-$(random_secret)}"
    refresh_secret="${WL_JWT_REFRESH_SECRET:-$(random_secret)}"
    maps_key="${NEXT_PUBLIC_YANDEX_MAPS_KEY:-}"
    yandex_token="${YANDEX_DELIVERY_TOKEN:-}"

    if [ ! -f "$compose_env" ]; then
        log "Creating compose environment file..."
        cat <<EOF | $SUDO tee "$compose_env" >/dev/null
COMPOSE_PROJECT_NAME=winelab
POSTGRES_DB=winelab_db
POSTGRES_USER=winelab
POSTGRES_PASSWORD=$db_password
API_BIND_PORT=3101
WEB_BIND_PORT=3100
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
NEXT_PUBLIC_YANDEX_MAPS_KEY=$maps_key
EOF
    fi

    if [ ! -f "$api_env" ]; then
        log "Creating backend environment file..."
        cat <<EOF | $SUDO tee "$api_env" >/dev/null
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://winelab:$db_password@db:5432/winelab_db?schema=public
JWT_SECRET=$jwt_secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=$refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
YANDEX_DELIVERY_TOKEN=$yandex_token
YANDEX_DELIVERY_BASE_URL=https://b2b.taxi.yandex.net
YANDEX_DELIVERY_CALLBACK_URL=https://$DOMAIN/api/deliveries/provider/yandex/webhook
EOF
    fi

    if [ ! -f "$web_env" ]; then
        log "Creating frontend runtime environment file..."
        cat <<EOF | $SUDO tee "$web_env" >/dev/null
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
NEXT_PUBLIC_YANDEX_MAPS_KEY=$maps_key
EOF
    fi

    $SUDO chmod 600 "$compose_env" "$api_env" "$web_env"
    $SUDO chown "$APP_USER:$APP_USER" "$compose_env" "$api_env" "$web_env"
}

install_wl_command() {
    check_wl_command
    log "Installing wl command..."
    $SUDO install -m 755 "$DEPLOY_DIR/wl" "$WL_COMMAND_PATH"
}

configure_caddy() {
    log "Installing Caddy configuration..."
    $SUDO cp "$DEPLOY_DIR/Caddyfile" /etc/caddy/Caddyfile
    $SUDO systemctl enable caddy
    $SUDO systemctl restart caddy
}

configure_firewall() {
    if ! command -v ufw >/dev/null 2>&1; then
        return
    fi

    if ! $SUDO ufw status | grep -q "Status: active"; then
        return
    fi

    log "Opening HTTP/HTTPS in UFW..."
    $SUDO ufw allow 80/tcp
    $SUDO ufw allow 443/tcp
}

deploy_stack() {
    log "Deploying containers..."
    "$WL_COMMAND_PATH" deploy
}

main() {
    log "Preparing WineLab production deployment..."

    ensure_package ca-certificates curl gnupg lsb-release git rsync openssl
    install_docker
    install_compose_plugin
    install_caddy
    create_app_user

    if getent group docker >/dev/null 2>&1; then
        $SUDO usermod -aG docker "$APP_USER" || true
    fi

    resolve_git_source
    verify_domain
    sync_project
    write_env_files
    install_wl_command
    configure_caddy
    configure_firewall
    deploy_stack

    log "Installation finished."
    echo
    echo -e "${BLUE}Project directory:${NC} $PROJECT_DIR"
    echo -e "${BLUE}Management command:${NC} wl"
    echo -e "${BLUE}Domain:${NC} https://$DOMAIN"
    echo -e "${BLUE}Git source:${NC} $GIT_REPO ($GIT_BRANCH)"
    echo -e "${BLUE}Webhook endpoint:${NC} https://$DOMAIN/api/deliveries/provider/yandex/webhook"
    echo
    warn "If you have not provided Yandex token or Yandex Maps key yet, edit these files and run 'wl deploy':"
    echo "  $ENV_DIR/api.env"
    echo "  $ENV_DIR/web.env"
    echo "  $ENV_DIR/compose.env"
}

main "$@"
