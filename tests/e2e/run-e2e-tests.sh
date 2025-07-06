#!/bin/bash

# Script d'orchestration des tests E2E pour Gayed Signals Dashboard
# Auteur: AI E2E Infrastructure Generator
# Date: $(date +%Y-%m-%d)

set -e  # Arrêter le script en cas d'erreur

echo "🏗️ Infrastructure E2E - Démarrage des tests Gayed Signals Dashboard"
echo "================================================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration des ports
FRONTEND_PORT=3000
BACKEND_PORT=8000
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"

# PID files pour le suivi des processus
FRONTEND_PID_FILE="/tmp/gayed-frontend.pid"
BACKEND_PID_FILE="/tmp/gayed-backend.pid"

# Fonction de nettoyage
cleanup() {
    echo -e "${YELLOW}🧹 Nettoyage des processus...${NC}"
    
    # Tuer les processus via les PID files
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local frontend_pid=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$frontend_pid" 2>/dev/null; then
            echo -e "${BLUE}Arrêt du frontend (PID: $frontend_pid)${NC}"
            kill "$frontend_pid" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        local backend_pid=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$backend_pid" 2>/dev/null; then
            echo -e "${BLUE}Arrêt du backend (PID: $backend_pid)${NC}"
            kill "$backend_pid" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    # Nettoyage des ports avec lsof
    echo -e "${BLUE}Nettoyage des ports ${FRONTEND_PORT} et ${BACKEND_PORT}...${NC}"
    
    # Port 3000 (frontend)
    if lsof -ti :${FRONTEND_PORT} >/dev/null 2>&1; then
        echo -e "${YELLOW}Processus trouvés sur le port ${FRONTEND_PORT}, nettoyage...${NC}"
        lsof -ti :${FRONTEND_PORT} | xargs kill -9 2>/dev/null || true
    fi
    
    # Port 8000 (backend)
    if lsof -ti :${BACKEND_PORT} >/dev/null 2>&1; then
        echo -e "${YELLOW}Processus trouvés sur le port ${BACKEND_PORT}, nettoyage...${NC}"
        lsof -ti :${BACKEND_PORT} | xargs kill -9 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Nettoyage terminé${NC}"
}

# Fonction pour vérifier si un service est prêt
check_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${BLUE}Vérification de ${service_name} sur ${url}...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|404\|403"; then
            echo -e "${GREEN}✅ ${service_name} est prêt!${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -e "${YELLOW}Attente ${service_name} (tentative ${attempt}/${max_attempts})...${NC}"
        sleep 2
    done
    
    echo -e "${RED}❌ ${service_name} n'est pas prêt après ${max_attempts} tentatives${NC}"
    return 1
}

# Fonction pour démarrer le backend
start_backend() {
    echo -e "${BLUE}🚀 Démarrage du backend FastAPI...${NC}"
    
    cd backend
    # Démarrer le backend en arrière-plan
    python main.py &
    local backend_pid=$!
    cd ..
    
    # Sauvegarder le PID
    echo "$backend_pid" > "$BACKEND_PID_FILE"
    echo -e "${GREEN}Backend démarré avec PID: $backend_pid${NC}"
    
    # Vérifier que le backend est prêt
    if ! check_service "$BACKEND_URL/health" "Backend"; then
        echo -e "${RED}❌ Échec du démarrage du backend${NC}"
        cleanup
        exit 1
    fi
}

# Fonction pour démarrer le frontend
start_frontend() {
    echo -e "${BLUE}🚀 Démarrage du frontend Next.js...${NC}"
    
    # Démarrer le frontend en arrière-plan
    npm run dev &
    local frontend_pid=$!
    
    # Sauvegarder le PID
    echo "$frontend_pid" > "$FRONTEND_PID_FILE"
    echo -e "${GREEN}Frontend démarré avec PID: $frontend_pid${NC}"
    
    # Vérifier que le frontend est prêt
    if ! check_service "$FRONTEND_URL" "Frontend"; then
        echo -e "${RED}❌ Échec du démarrage du frontend${NC}"
        cleanup
        exit 1
    fi
}

# Fonction pour exécuter les tests Playwright
run_tests() {
    echo -e "${BLUE}🧪 Exécution des tests E2E...${NC}"
    
    # Définir les variables d'environnement pour les tests
    export FRONTEND_URL="$FRONTEND_URL"
    export BACKEND_URL="$BACKEND_URL"
    
    # Exécuter les tests avec timeout
    if timeout 300 npx playwright test tests/e2e/infrastructure.spec.ts --reporter=html; then
        echo -e "${GREEN}✅ Tests E2E terminés avec succès!${NC}"
        return 0
    else
        echo -e "${RED}❌ Échec des tests E2E${NC}"
        return 1
    fi
}

# Trap pour nettoyer en cas d'interruption
trap cleanup EXIT INT TERM

# Début du script principal
echo -e "${BLUE}Phase 1: Nettoyage initial${NC}"
cleanup

echo -e "${BLUE}Phase 2: Démarrage des services${NC}"
start_backend
start_frontend

echo -e "${BLUE}Phase 3: Exécution des tests${NC}"
if run_tests; then
    echo -e "${GREEN}🎉 Infrastructure E2E validée avec succès!${NC}"
    exit 0
else
    echo -e "${RED}💥 Échec de la validation E2E${NC}"
    exit 1
fi