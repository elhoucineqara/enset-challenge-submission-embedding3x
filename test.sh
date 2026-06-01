#!/usr/bin/env bash
# =============================================================================
# Agentic TP Platform — Integration Test Script
# Tests all service endpoints after start.sh has been run.
# Usage: ./test.sh [--quick] [--agents-only]
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

PASS=0; FAIL=0; SKIP=0
QUICK_MODE=false
AGENTS_ONLY=false

for arg in "$@"; do
    case "$arg" in
        --quick)       QUICK_MODE=true ;;
        --agents-only) AGENTS_ONLY=true ;;
    esac
done

# Load .env
if [ -f "$ROOT/.env" ]; then
    set -a; source "$ROOT/.env"; set +a
fi

# ── Test helpers ──────────────────────────────────────────────────────────────
pass() { echo -e "  ${GREEN}✓${NC} $*"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${NC} $*"; FAIL=$((FAIL+1)); }
skip() { echo -e "  ${YELLOW}−${NC} $* ${DIM}(skipped)${NC}"; SKIP=$((SKIP+1)); }
section() { echo -e "\n${BOLD}${CYAN}▸ $*${NC}"; }

# Test an endpoint and check for expected content
test_get() {
    local name="$1" url="$2" expect="${3:-}"
    local response http_code
    response=$(curl -sf -w "\n__STATUS__%{http_code}" "$url" 2>/dev/null) || {
        fail "$name — ${RED}connection refused${NC} at $url"
        return
    }
    http_code=$(echo "$response" | grep '__STATUS__' | sed 's/__STATUS__//')
    body=$(echo "$response" | grep -v '__STATUS__')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        if [ -n "$expect" ] && ! echo "$body" | grep -q "$expect"; then
            fail "$name — responded but missing '${expect}' in body"
        else
            pass "$name — HTTP $http_code"
        fi
    else
        fail "$name — HTTP $http_code"
    fi
}

# Test a POST endpoint
test_post() {
    local name="$1" url="$2" payload="$3" expect="${4:-}"
    local response http_code
    response=$(curl -sf -w "\n__STATUS__%{http_code}" \
        -X POST -H "Content-Type: application/json" \
        -d "$payload" "$url" 2>/dev/null) || {
        fail "$name — ${RED}connection refused${NC} at $url"
        return
    }
    http_code=$(echo "$response" | grep '__STATUS__' | sed 's/__STATUS__//')
    body=$(echo "$response" | grep -v '__STATUS__')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        if [ -n "$expect" ] && ! echo "$body" | grep -q "$expect"; then
            fail "$name — HTTP $http_code but missing '${expect}'"
            echo -e "    ${DIM}Response: ${body:0:200}${NC}"
        else
            pass "$name — HTTP $http_code"
        fi
    else
        fail "$name — HTTP $http_code"
        echo -e "    ${DIM}Response: ${body:0:200}${NC}"
    fi
}

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          Agentic TP Platform — Integration Tests          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
[ "$QUICK_MODE" = true ] && echo -e "${YELLOW}  Quick mode: AI inference tests skipped${NC}"
echo ""

# =============================================================================
# 1. Health Checks (all services)
# =============================================================================
section "Health Checks"

test_get "Agent Gateway"     "http://localhost:8000/health"  "ok"
test_get "Explanation Agent" "http://localhost:8001/health"  "ok"
test_get "Hint Agent"        "http://localhost:8002/health"  "ok"
test_get "Evaluation Agent"  "http://localhost:8003/health"  "ok"
test_get "Orchestrator"      "http://localhost:8004/health"  "ok"
if [ "$AGENTS_ONLY" = true ]; then
    skip "Frontend (--agents-only mode)"
else
    test_get "Frontend"      "http://localhost:3000"
fi

if [ "$AGENTS_ONLY" != true ]; then
    # Spring Boot services (may not be running)
    JAVA_UP=false
    curl -sf "http://localhost:8761/actuator/health" >/dev/null 2>&1 && JAVA_UP=true

    if [ "$JAVA_UP" = true ]; then
        test_get "Eureka Server"      "http://localhost:8761/actuator/health" "UP"
        test_get "Auth Service"       "http://localhost:8081/api/auth/health" "ok"
        test_get "TP Service"         "http://localhost:8082/actuator/health"
        test_get "API Gateway"        "http://localhost:8080/actuator/health"
    else
        skip "Spring Boot services (not running)"
    fi
fi

# =============================================================================
# 2. Agent Gateway — agents health aggregation
# =============================================================================
section "Agent Gateway — Agents Health Endpoint"

test_get "All agents status" "http://localhost:8000/agents/health"

# =============================================================================
# 3. Spring Boot Auth API (if available)
# =============================================================================
if [ "$AGENTS_ONLY" != true ]; then
    AUTH_UP=false
    curl -sf "http://localhost:8081/api/auth/health" >/dev/null 2>&1 && AUTH_UP=true

    if [ "$AUTH_UP" = true ]; then
        section "Auth Service API"

        # Register a test user
        REG_PAYLOAD='{
            "name": "Test User",
            "username": "testuser_'$$'",
            "email": "test_'$$'@example.com",
            "password": "password123",
            "role": "STUDENT"
        }'
        test_post "Register new student" \
            "http://localhost:8081/api/auth/register" \
            "$REG_PAYLOAD" \
            "token"

        # Login with wrong password → should fail
        BAD_LOGIN='{"email":"nonexistent@x.com","password":"wrong"}'
        response=$(curl -sf -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$BAD_LOGIN" \
            "http://localhost:8081/api/auth/login" 2>/dev/null) || response="000"
        if echo "$response" | grep -q "^[45]"; then
            pass "Login with wrong credentials → correctly rejected"
            PASS=$((PASS+1))
        fi
    else
        skip "Auth Service API (service not running)"
    fi
fi

# =============================================================================
# 4. AI Agent — Explanation endpoint (LLM inference test)
# =============================================================================
if [ "$QUICK_MODE" != true ]; then
    section "Explanation Agent — Mistral (${EXPLANATION_AGENT_MODEL:-mistral})"

    EXPLAIN_PAYLOAD='{
        "tp_id": "test-tp-1",
        "tp_title": "My First HTML Page",
        "tp_description": "Learn the fundamentals of HTML structure",
        "step_id": "step-1",
        "step_title": "Add a Main Heading",
        "step_instructions": "Add a main heading that says Welcome to My Page",
        "required_tags": ["h1", "p"]
    }'

    echo -e "  ${DIM}Calling explanation agent (LLM inference — may take 10-30s)...${NC}"
    test_post "Explain TP step" \
        "http://localhost:8001/explain" \
        "$EXPLAIN_PAYLOAD" \
        "explanation"

    # Clarification question
    CLARIFY_PAYLOAD='{
        "tp_id": "test-tp-1",
        "tp_title": "My First HTML Page",
        "tp_description": "Learn HTML fundamentals",
        "step_id": "step-1",
        "step_title": "Add a Main Heading",
        "step_instructions": "Add a main heading element",
        "required_tags": ["h1"],
        "question": "What is the difference between a heading and a paragraph in HTML?"
    }'

    echo -e "  ${DIM}Testing clarification question...${NC}"
    test_post "Answer clarification" \
        "http://localhost:8001/explain" \
        "$CLARIFY_PAYLOAD" \
        "explanation"

else
    section "Explanation Agent"
    skip "Explanation Agent LLM inference (--quick mode)"
fi

# =============================================================================
# 5. AI Agent — Hint endpoint
# =============================================================================
if [ "$QUICK_MODE" != true ]; then
    section "Hint Agent — deepseek-coder (${HINT_AGENT_MODEL:-deepseek-coder:6.7b})"

    HINT_PAYLOAD='{
        "step_id": "step-1",
        "step_title": "Add a Main Heading",
        "step_instructions": "Add a main heading that says Welcome to My Page",
        "student_code": "<!DOCTYPE html><html><body></body></html>",
        "required_tags": ["h1", "p"],
        "hints_already_given": 0,
        "previous_hints": []
    }'

    echo -e "  ${DIM}Calling hint agent (LLM inference — may take 10-60s for 6.7b model)...${NC}"
    test_post "Get progressive hint" \
        "http://localhost:8002/hint" \
        "$HINT_PAYLOAD" \
        "hint"

    # Test with partial code (h1 present but p missing)
    HINT_PARTIAL='{
        "step_id": "step-1",
        "step_title": "Add a Main Heading",
        "step_instructions": "Add h1 and p elements",
        "student_code": "<!DOCTYPE html><html><body><h1>Hello</h1></body></html>",
        "required_tags": ["h1", "p"],
        "hints_already_given": 1,
        "previous_hints": ["Think about what kind of content goes in your page."]
    }'

    echo -e "  ${DIM}Testing hint with partial code...${NC}"
    test_post "Hint for partial code" \
        "http://localhost:8002/hint" \
        "$HINT_PARTIAL" \
        "hint"

else
    section "Hint Agent"
    skip "Hint Agent LLM inference (--quick mode)"
fi

# =============================================================================
# 6. AI Agent — Quiz generation
# =============================================================================
if [ "$QUICK_MODE" != true ]; then
    section "Evaluation Agent — Quiz Generation (${EVALUATION_AGENT_MODEL:-gemma4:31b-cloud})"

    QUIZ_PAYLOAD='{
        "tp_id": "test-tp-1",
        "tp_title": "My First HTML Page",
        "tp_description": "Learn HTML fundamentals",
        "step_titles": ["Add a Heading", "Add a Paragraph"],
        "student_code": "<!DOCTYPE html><html><body><h1>Welcome</h1><p>My first page!</p></body></html>",
        "num_questions": 3
    }'

    echo -e "  ${DIM}Generating quiz (LLM inference — may take 20-60s)...${NC}"
    test_post "Generate quiz" \
        "http://localhost:8003/generate-quiz" \
        "$QUIZ_PAYLOAD" \
        "questions"

    # Evaluate static answers (no LLM needed for scoring)
    EVAL_PAYLOAD='{
        "tp_id": "test-tp-1",
        "tp_title": "My First HTML Page",
        "questions": [
            {
                "question": "What is the purpose of the h1 element?",
                "options": ["To make text bold", "To define the main heading", "To create a list", "To add a paragraph"],
                "correctIndex": 1,
                "explanation": "h1 defines the top-level heading of a page."
            }
        ],
        "student_answers": [1],
        "student_code": "<!DOCTYPE html><html><body><h1>Hello</h1></body></html>"
    }'

    echo -e "  ${DIM}Testing quiz evaluation...${NC}"
    test_post "Evaluate quiz answers" \
        "http://localhost:8003/evaluate" \
        "$EVAL_PAYLOAD" \
        "score"

else
    section "Evaluation Agent"
    skip "Evaluation Agent LLM inference (--quick mode)"
fi

# =============================================================================
# 7. Orchestrator
# =============================================================================
if [ "$QUICK_MODE" != true ]; then
    section "Orchestrator — DeepSeek v3.2 (${ORCHESTRATOR_MODEL:-deepseek-v3.2:cloud})"

    ORCH_PAYLOAD='{
        "action": "explain this TP step to the student",
        "context": {
            "tp_id": "test-tp-1",
            "tp_title": "My First HTML Page",
            "tp_description": "Learn HTML",
            "step_id": "step-1",
            "step_title": "Add a Heading",
            "step_instructions": "Add an h1 element",
            "required_tags": ["h1"]
        }
    }'

    echo -e "  ${DIM}Testing orchestrator routing (may take 15-30s)...${NC}"
    test_post "Orchestrate explanation request" \
        "http://localhost:8004/orchestrate" \
        "$ORCH_PAYLOAD" \
        ""

else
    section "Orchestrator"
    skip "Orchestrator LLM inference (--quick mode)"
fi

# =============================================================================
# 8. Agent Gateway routing (passes through to agents)
# =============================================================================
section "Agent Gateway — Request Routing"

GW_EXPLAIN='{
    "tp_id": "gw-test",
    "tp_title": "Gateway Test TP",
    "tp_description": "Testing gateway routing",
    "step_id": "s1",
    "step_title": "Test Step",
    "step_instructions": "Add an h1",
    "required_tags": ["h1"]
}'

if [ "$QUICK_MODE" = true ]; then
    skip "Gateway routing test (--quick mode, would invoke LLM)"
else
    echo -e "  ${DIM}Testing /api/agents/explain route...${NC}"
    test_post "Gateway → explanation-agent" \
        "http://localhost:8000/api/agents/explain" \
        "$GW_EXPLAIN" \
        "explanation"
fi

# =============================================================================
# 9. Summary
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}                    TEST SUMMARY                           ${NC}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
TOTAL=$((PASS + FAIL + SKIP))
echo -e "  Total tests : ${BOLD}${TOTAL}${NC}"
echo -e "  ${GREEN}Passed${NC}      : ${BOLD}${PASS}${NC}"
echo -e "  ${RED}Failed${NC}      : ${BOLD}${FAIL}${NC}"
echo -e "  ${YELLOW}Skipped${NC}     : ${BOLD}${SKIP}${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}✓ All tests passed!${NC}"
    if [ "$SKIP" -gt 0 ]; then
        echo -e "  ${DIM}Run without --quick for full LLM inference tests${NC}"
    fi
    EXIT_CODE=0
else
    echo -e "  ${RED}${BOLD}✗ ${FAIL} test(s) failed${NC}"
    echo ""
    echo -e "  ${DIM}Troubleshooting:${NC}"
    echo -e "  ${DIM}  • Check service logs: tail -f logs/<service>.log${NC}"
    echo -e "  ${DIM}  • Verify Ollama is running: curl http://localhost:11434/api/tags${NC}"
    echo -e "  ${DIM}  • Check model is pulled: ollama list${NC}"
    EXIT_CODE=1
fi

echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
exit $EXIT_CODE
