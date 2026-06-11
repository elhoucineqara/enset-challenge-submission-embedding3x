#!/usr/bin/env bash
# =============================================================================
# Agentic TP Platform — Docker Compose Wrapper
# Always loads the root .env and runs compose with the right paths.
#
# Usage (from infra/docker/ OR project root):
#   ./docker-up.sh              — start all services (detached)
#   ./docker-up.sh --build      — rebuild all images first
#   ./docker-up.sh agents       — start AI agents only (no Spring Boot)
#   ./docker-up.sh down         — stop and remove containers
#   ./docker-up.sh logs         — follow all container logs
#   ./docker-up.sh ps           — show running containers
#   ./docker-up.sh restart NAME — restart one service
# =============================================================================
set -euo pipefail

# Resolve paths regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="$ROOT/.env"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info() { echo -e "${CYAN}[docker-up]${NC} $*"; }
ok()   { echo -e "${GREEN}[docker-up]${NC} $*"; }
warn() { echo -e "${YELLOW}[docker-up]${NC} $*"; }
fail() { echo -e "${RED}[docker-up]${NC} $*"; }

# ── Check Docker daemon ───────────────────────────────────────────────────────
check_docker() {
    if docker info >/dev/null 2>&1; then
        return 0
    fi

    fail "Docker daemon is not running."
    echo ""
    echo -e "${BOLD}To start Docker on macOS:${NC}"
    echo "  Option 1 — Docker Desktop (GUI):"
    echo "    open -a Docker"
    echo "    # Wait ~20 seconds for the whale icon to appear in the menu bar"
    echo ""
    echo "  Option 2 — OrbStack (lightweight alternative):"
    echo "    open -a OrbStack   # if installed"
    echo ""
    echo "  Option 3 — Colima (CLI-only, no GUI):"
    echo "    brew install colima docker docker-compose"
    echo "    colima start"
    echo ""
    echo -e "${YELLOW}After Docker starts, re-run:  ./docker-up.sh${NC}"
    exit 1
}

# ── Check .env exists ─────────────────────────────────────────────────────────
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        fail ".env not found at: $ENV_FILE"
        echo "  Copy the template and fill in your values:"
        echo "  cp $ROOT/.env.example $ROOT/.env"
        exit 1
    fi

    # Warn if JWT_SECRET is still the placeholder
    JWT_VAL=$(grep '^JWT_SECRET=' "$ENV_FILE" | cut -d= -f2 | tr -d ' ')
    if [ -z "$JWT_VAL" ] || [[ "$JWT_VAL" == *"change-in-production"* ]] || [[ "$JWT_VAL" == "your_"* ]]; then
        warn "JWT_SECRET looks like a placeholder — Spring Boot services may reject tokens"
        warn "Edit $ENV_FILE and set a real 32+ character secret"
    fi
}

# ── Base compose command ──────────────────────────────────────────────────────
COMPOSE_CMD="docker compose --env-file $ENV_FILE -f $COMPOSE_FILE"

# ── Subcommand dispatch ───────────────────────────────────────────────────────
CMD="${1:-up}"

case "$CMD" in

    up|"")
        check_docker
        check_env
        EXTRA_FLAGS="${2:-}"
        info "Starting all services (this may take a few minutes on first run to build images)..."
        info "Project root : $ROOT"
        info "Env file     : $ENV_FILE"
        info "Compose file : $COMPOSE_FILE"
        echo ""
        $COMPOSE_CMD up -d $EXTRA_FLAGS
        echo ""
        ok "All services started."
        echo ""
        print_urls
        ;;

    --build)
        check_docker
        check_env
        info "Rebuilding images and starting all services..."
        $COMPOSE_CMD up -d --build
        echo ""
        ok "Done."
        print_urls
        ;;

    agents)
        check_docker
        check_env
        info "Starting AI agent services only (no Spring Boot, no Kafka)..."
        $COMPOSE_CMD up -d \
            explanation-agent \
            hint-agent \
            evaluation-agent \
            orchestrator \
            agent-gateway
        echo ""
        ok "Agent services started."
        print_agent_urls
        ;;

    down)
        check_docker
        info "Stopping and removing all containers..."
        $COMPOSE_CMD down
        ok "All containers stopped."
        ;;

    down-v|clean)
        check_docker
        warn "This will also DELETE all volumes (database data)."
        read -rp "Are you sure? [y/N] " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            $COMPOSE_CMD down -v
            ok "Containers and volumes removed."
        else
            info "Cancelled."
        fi
        ;;

    logs)
        check_docker
        SERVICE="${2:-}"
        if [ -n "$SERVICE" ]; then
            info "Following logs for: $SERVICE"
            $COMPOSE_CMD logs -f "$SERVICE"
        else
            info "Following all service logs (Ctrl+C to stop)..."
            $COMPOSE_CMD logs -f
        fi
        ;;

    ps|status)
        check_docker
        $COMPOSE_CMD ps
        echo ""
        print_urls
        ;;

    restart)
        check_docker
        SERVICE="${2:-}"
        if [ -z "$SERVICE" ]; then
            fail "Usage: ./docker-up.sh restart <service-name>"
            exit 1
        fi
        info "Restarting $SERVICE..."
        $COMPOSE_CMD restart "$SERVICE"
        ok "$SERVICE restarted."
        ;;

    build)
        check_docker
        SERVICE="${2:-}"
        if [ -n "$SERVICE" ]; then
            info "Building image for: $SERVICE"
            $COMPOSE_CMD build "$SERVICE"
        else
            info "Building all images..."
            $COMPOSE_CMD build
        fi
        ok "Build complete."
        ;;

    pull)
        check_docker
        info "Pulling latest base images..."
        $COMPOSE_CMD pull postgres zookeeper kafka
        ok "Images pulled."
        ;;

    *)
        # Pass through any unknown command directly to docker compose
        check_docker
        $COMPOSE_CMD "$@"
        ;;
esac

# ── URL helpers ───────────────────────────────────────────────────────────────
print_urls() {
    echo -e "${BOLD}${CYAN}Service URLs:${NC}"
    echo -e "  Frontend      →  ${GREEN}http://localhost:3000${NC}"
    echo -e "  Agent Gateway →  ${CYAN}http://localhost:8000${NC}  (agents health: /agents/health)"
    echo -e "  API Gateway   →  ${CYAN}http://localhost:8080${NC}"
    echo -e "  Eureka        →  ${CYAN}http://localhost:8761${NC}"
    echo -e "  Auth Service  →  ${CYAN}http://localhost:8081/api/auth/health${NC}"
    echo ""
    echo -e "  AI Agents:"
    echo -e "    explanation-agent  →  http://localhost:8001/health"
    echo -e "    hint-agent         →  http://localhost:8002/health"
    echo -e "    evaluation-agent   →  http://localhost:8003/health"
    echo -e "    orchestrator       →  http://localhost:8004/health"
    echo ""
    echo -e "${YELLOW}  Logs: docker compose logs -f <service-name>${NC}"
    echo -e "${YELLOW}  Stop: ./docker-up.sh down${NC}"
}

print_agent_urls() {
    echo -e "${BOLD}${CYAN}Agent Service URLs:${NC}"
    echo -e "  Agent Gateway →  ${GREEN}http://localhost:8000${NC}"
    echo -e "  explanation   →  http://localhost:8001/health"
    echo -e "  hint          →  http://localhost:8002/health"
    echo -e "  evaluation    →  http://localhost:8003/health"
    echo -e "  orchestrator  →  http://localhost:8004/health"
    echo ""
    echo -e "${YELLOW}  Stop: ./docker-up.sh down${NC}"
}
