#!/bin/bash

# Kleuren voor mooie output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Hallo! Ik ben je Signalen Opstart Agent.${NC}"
echo -e "${BLUE}Even de boel voor je checken...${NC}\n"

# 1. GIT CHECK
echo -e "${YELLOW}🔍 Stap 1: Git Status controleren...${NC}"
if git status | grep -q "nothing to commit, working tree clean"; then
    echo -e "${GREEN}✓ Alles is netjes gecommit.${NC}"
else
    echo -e "${RED}⚠️  Let op: Je hebt wijzigingen die nog niet zijn opgeslagen.${NC}"
    echo "   Gebruik de 'Save Checkpoint' knop in het dashboard straks."
fi

echo -e "\n${YELLOW}🚀 Stap 2: Proberen te pushen naar GitHub...${NC}"
# We proberen te pushen, maar falen zachtjes als het niet lukt (bv. auth nodig)
if git push origin main 2>/dev/null; then
    echo -e "${GREEN}✓ Alles staat veilig op GitHub!${NC}"
else
    echo -e "${RED}❌ Push niet gelukt (waarschijnlijk inloggen nodig of geen changes).${NC}"
    echo "   Geen paniek. Typ straks in een nieuwe terminal: ${YELLOW}git push${NC} om in te loggen."
fi

# 2. HERINNERING
echo -e "\n${YELLOW}📝 Stap 3: Waar waren we gebleven? (Uit VERVOLGSTAPPEN.md)${NC}"
echo "---------------------------------------------------"
if [ -f VERVOLGSTAPPEN.md ]; then
    grep -v "^#" VERVOLGSTAPPEN.md | head -n 15
else
    echo "Geen VERVOLGSTAPPEN.md gevonden."
fi
echo "---------------------------------------------------"

# 3. START SERVER
echo -e "\n${GREEN}🚀 Stap 4: Starten Dashboard Server...${NC}"
echo "   Ik probeer de browser voor je te openen..."

# Detecteer OS en kies commando voor openen browser
open_url() {
    local url="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$url"
    elif grep -q Microsoft /proc/version 2>/dev/null; then
        # WSL: Probeer wslview (wslu) of cmd.exe
        if command -v wslview &> /dev/null; then
            wslview "$url"
        else
            cmd.exe /c start "$url" 2>/dev/null
        fi
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$url"
    else
        echo "   (Kon browser niet automatisch openen. Ga naar: $url)"
    fi
}

# Open browser na 2 seconden (terwijl node start)
(sleep 2 && open_url "http://localhost:3333") &

# Start de Node server
node start-gids.js
