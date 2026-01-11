# Sessie Log - Signalen Wassenaar

Dit bestand houdt bij wat er per sessie is gedaan.

---

## Sessie: 11 januari 2026

### 🎉 MILESTONE: Systeem volledig werkend!

Het hele systeem werkt nu end-to-end:
- ✅ Opstarten verloopt probleemloos
- ✅ Frontend draait met Wassenaar logo
- ✅ Meldingen maken werkt (inclusief foto upload)
- ✅ Meldingen komen binnen in de backend
- ✅ Foto's zichtbaar in Django Admin

### Wat we vandaag hebben opgelost:

1. **Adresvalidatie voor Wassenaar gefixt**
   - Probleem: PDOK zocht alleen in Amsterdam/Amstelveen/Weesp/Ouder-Amstel
   - Oorzaak: `DEFAULT_PDOK_MUNICIPALITIES` stond op Amsterdam-regio
   - Oplossing: `DEFAULT_PDOK_MUNICIPALITIES=Wassenaar` toegevoegd aan `.api`
   - **Let op:** Na wijziging `.api` moet je `docker-compose up -d api` doen (niet `restart`!)

2. **Django Admin verbeterd**
   - Meldingen zijn nu klikbaar (voorheen `list_display_links = None`)
   - AttachmentInline toegevoegd met foto preview thumbnail
   - Locatie en omschrijving zichtbaar op detail pagina
   - Bestand: `app/signals/apps/signals/admin/signal.py`

### Technische details:
- PDOK Locatieserver valideert adressen tegen BAG
- Filter `gemeentenaam` bepaalt welke gemeenten worden doorzocht
- Environment variables worden alleen geladen bij container CREATE, niet bij RESTART

---

## Sessie: 8 januari 2026

### Wat we vandaag hebben gedaan:

1. **Logo probleem definitief opgelost**
   - Oorzaak: `app.base.json` had nog `amsterdam-logo.svg`
   - Oplossing: Beide config bestanden aangepast (`app.json` én `app.base.json`)
   - Frontend moet herstart worden na config wijzigingen!

2. **Beeldherkenning Roadmap toegevoegd** (gisteren laat)
   - Nieuwe tab in opstartgids: "🚀 Beeldherkenning Roadmap"
   - 3 fasen: RAPPORTAGE → QUALITY → SIGNALS
   - `BEELDHERKENNING_ROADMAP.md` document gemaakt

3. **Mockup Dashboard gemaakt** (`mockup-dashboard.html`)
   - 🗺️ Kaart view met meldingen markers (Wassenaar)
   - 📊 Rapportage view met BOR scores (Schoon/Heel/Veilig)
   - 🎯 Quality view met OVL discrepanties kaart
   - Donker thema, interactief, professionele uitstraling

### Technische notities:
- Frontend config: `app.base.json` + `app.json` worden gemerged (lodash merge)
- Logo pad: `/assets/images/wassenaar-logo.svg`
- Webpack kopieert `assets/` folder naar build output

---

## Sessie: 7 januari 2026

### Wat we vandaag hebben gedaan:

1. **Log-knoppen toegevoegd** aan Stap 3 in de opstartgids
   - Keycloak logs knop
   - API logs knop

2. **AppleScript quoting probleem geanalyseerd en gefixt**
   - Probleem: Lange OneDrive pad brak de quoting in AppleScript
   - Oplossing: Tijdelijk `.sh` script schrijven en openen i.p.v. directe AppleScript
   - Gefixt in: `start-gids.js` (zowel `start-frontend` als `mobile-start`)

3. **Git backup gemaakt**
   - Alle wijzigingen gecommit
   - Gepusht naar `benjosb/beeldherkenning` op GitHub
   - Upstream commits gemerged (versie update, urllib3 upgrade)

4. **Project verhuisd van OneDrive naar lokaal**
   - Van: `/Users/dickbraam/Library/CloudStorage/OneDrive-Persoonlijk/_PROGRAMMEREN_OneDrive/_PROGRAMMEREN/Projecten/signalen/signals`
   - Naar: `/Users/dickbraam/Projects/signalen`
   - Reden: Kortere paden, geen sync problemen, betere compatibiliteit

5. **Uitgebreide documentatie gemaakt**
   - `PROJECTDOCUMENTATIE.md` - Alles over het project
   - `SESSIE_LOG.md` - Dit bestand

### Openstaande punten:
- [ ] Logo controleren na verhuizing (herstart frontend nodig)
- [ ] Coördinator view nog te bouwen
- [ ] Kaart met prioriteit-kleuren

---

## Sessie: 6 januari 2026 (en eerder)

### Grote onderdelen gebouwd:

1. **Interactieve Opstartgids** (`signalen-opstartgids.html`)
   - 6-stappen wizard
   - Docker controls
   - Frontend starten
   - API testen
   - Camera-auto simulatie

2. **Node.js Server** (`start-gids.js`)
   - Serveert HTML
   - API endpoints voor alle acties
   - OS-detectie (Mac/WSL)
   - Git save functionaliteit

3. **Start Script** (`start-alles.sh`)
   - One-command startup
   - Git status check
   - Auto-push naar GitHub

4. **Wassenaar Branding**
   - Logo geïntegreerd
   - Favicon werkend
   - Titels aangepast

5. **Django Admin toegang**
   - Lokale login enabled
   - Admin user reset functie
   - Context processor fix

6. **Camera-auto Simulatie**
   - Drie detectie types
   - Random locaties Wassenaar
   - Echte API calls

7. **Categorieën**
   - Default 'Afval' categorie script
   - API endpoint fix (was 404)

### Bekende fixes:
- Logo pad: `/assets/images/wassenaar-logo.svg`
- API categorieën: `/signals/v1/public/terms/categories/`
- Subcategorie nodig voor melding (niet hoofdcategorie)
- Console output Stap 4: `console4` i.p.v. `console3`

---

## Tips voor volgende sessie

1. **Open Cursor in de nieuwe locatie:**
   ```
   /Users/dickbraam/Projects/signalen
   ```

2. **Start het project:**
   ```bash
   ./start-alles.sh
   ```

3. **Of handmatig:**
   ```bash
   node start-gids.js
   # Open http://localhost:3000
   ```

4. **Frontend los starten:**
   ```bash
   cd signals-frontend && npm start
   ```

5. **Check of logo werkt:**
   - Open `http://localhost:3001`
   - Logo moet linksboven zichtbaar zijn

---

## Belangrijke URLs

| Wat | URL |
|-----|-----|
| Opstartgids | http://localhost:3000 |
| Frontend (inwoner) | http://localhost:3001 |
| Django Admin | http://localhost:8000/signals/admin/ |
| Keycloak | http://localhost:8080 |
| API (health) | http://localhost:8000/signals/v1/public/terms/categories/ |
| GitHub repo | https://github.com/benjosb/beeldherkenning |

---

## Git commando's

```bash
# Save checkpoint (vanuit project root)
git add .
git commit -m "Beschrijving van wijziging"
git push origin main

# Of gebruik de "💾 Save Checkpoint" knop in de opstartgids!
```
