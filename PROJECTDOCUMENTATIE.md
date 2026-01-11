# Signalen Wassenaar - Projectdocumentatie

> **Laatst bijgewerkt:** 11 januari 2026  
> **Project locatie:** `/Users/dickbraam/Projects/signalen`  
> **GitHub repo:** https://github.com/benjosb/beeldherkenning

---

## 📋 Inhoudsopgave

1. [Projectoverzicht](#1-projectoverzicht)
2. [Architectuur](#2-architectuur)
3. [Wat we hebben gebouwd](#3-wat-we-hebben-gebouwd)
4. [Opstarten](#4-opstarten)
5. [Belangrijke bestanden](#5-belangrijke-bestanden)
6. [Configuratie & Instellingen](#6-configuratie--instellingen)
7. [Bekende problemen & Oplossingen](#7-bekende-problemen--oplossingen)
8. [API Endpoints](#8-api-endpoints)
9. [Gebruikersbeheer](#9-gebruikersbeheer)
10. [Volgende stappen (TODO)](#10-volgende-stappen-todo)
11. [Technische details](#11-technische-details)

---

## 1. Projectoverzicht

### Wat is dit?
Een lokale installatie van **Signalen** (Amsterdam's meldingensysteem) aangepast voor **Gemeente Wassenaar**, met als doel:
- Inwoners kunnen meldingen doen (afval, schade, etc.)
- Coördinatoren kunnen meldingen beheren
- Toekomstige integratie met **beeldherkenning** (camera-auto die automatisch meldingen maakt)

### Componenten
| Component | Technologie | Poort | Doel |
|-----------|-------------|-------|------|
| Backend API | Django/Python | 8000 | REST API voor meldingen |
| Frontend | React | 3001 | Webapp voor inwoners/beheerders |
| Database | PostgreSQL | 5432 | Opslag meldingen |
| Keycloak | Java | 8080 | Identity & Access Management (SSO) |
| Elasticsearch | Java | 9200 | Zoekfunctionaliteit |
| RabbitMQ | Erlang | 5672 | Message queue |
| Opstartgids | Node.js | 3000 | Interactieve beheerpagina |

---

## 2. Architectuur

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
├─────────────────────────────────────────────────────────────────┤
│  localhost:3000     │  localhost:3001      │  localhost:8000    │
│  Opstartgids        │  Frontend (React)    │  Django Admin      │
│  (start-gids.js)    │  Inwoner/Coördinator │  /signals/admin/   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DOCKER COMPOSE                               │
├─────────────────────────────────────────────────────────────────┤
│  api (Django)  │  database   │  keycloak  │  elasticsearch     │
│  celery_beat   │  (Postgres) │  (IAM)     │  rabbitmq          │
│  celery_worker │             │            │                     │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow - Melding maken
1. Inwoner opent `localhost:3001`
2. Vult formulier in (locatie, categorie, beschrijving, foto)
3. Frontend POST naar `localhost:8000/signals/v1/public/signals/`
4. Django slaat op in PostgreSQL
5. Celery verwerkt async taken (emails, routering)
6. Coördinator ziet melding in beheerinterface

---

## 3. Wat we hebben gebouwd

### 3.1 Interactieve Opstartgids (`signalen-opstartgids.html`)
Een HTML dashboard met knoppen om alles te beheren:

**Features:**
- ✅ Stap-voor-stap wizard (6 stappen)
- ✅ Docker containers starten/stoppen
- ✅ Backend health check
- ✅ Frontend starten in nieuw Terminal venster
- ✅ API testen (categorieën ophalen)
- ✅ Camera-auto simulatie (automatische meldingen)
- ✅ Git backup functie ("Save Checkpoint")
- ✅ Mobiele modus (voor testen op telefoon)
- ✅ Console output per stap
- ✅ Log knoppen voor Keycloak en API

### 3.2 Node.js Server (`start-gids.js`)
Backend voor de opstartgids met API endpoints:

| Endpoint | Functie |
|----------|---------|
| `GET /` | Serveert de HTML |
| `POST /api/start-docker` | Start Docker containers |
| `POST /api/stop-docker` | Stopt Docker containers |
| `POST /api/docker-status` | Check container status |
| `POST /api/start-frontend` | Opent Terminal + npm start |
| `POST /api/test-api` | Test backend connectivity |
| `POST /api/git-save` | Git add, commit, push |
| `POST /api/mobile-start` | Activeert mobiele modus |
| `POST /api/mobile-stop` | Deactiveert mobiele modus |

**Belangrijke fix:** AppleScript quoting probleem opgelost voor lange OneDrive paden. Nu wordt een tijdelijk `.sh` script geschreven en geopend.

### 3.3 Start Script (`start-alles.sh`)
Eén command om alles te starten:
```bash
./start-alles.sh
```

Doet:
1. Check uncommitted changes → vraagt om commit
2. Push naar GitHub
3. Toont instructies
4. Start Node.js server
5. Opent browser naar `localhost:3000`

### 3.4 Wassenaar Branding
- ✅ Favicon: Wassenaar logo (in browser tab)
- ✅ Logo: `/assets/images/wassenaar-logo.svg`
- ✅ Titels aangepast in `app.json`

### 3.5 Camera-auto Simulatie
In Stap 6 van de opstartgids kun je automatische meldingen simuleren:
- Knoppen voor: Zwerfafval, Losliggende tegel, Volle prullenbak
- Maakt echte melding aan via de API
- Gebruikt random locaties rond Wassenaar centrum

### 3.6 Django Admin Toegang
- ✅ Lokale login ingeschakeld (`ADMIN_ENABLE_LOCAL_LOGIN=True`)
- ✅ Admin user: `admin` / `insecure` (of via "Reset Admin" knop)
- ✅ Meldingen zijn klikbaar (detail pagina)
- ✅ Foto's/bijlagen zichtbaar met preview thumbnail
- URL: `http://localhost:8000/signals/admin/`

### 3.7 Adresvalidatie Wassenaar
- ✅ PDOK adresvalidatie geconfigureerd voor gemeente Wassenaar
- ✅ Meldingen met Wassenaarse adressen worden correct gevalideerd
- Instelling: `DEFAULT_PDOK_MUNICIPALITIES=Wassenaar` in `.api` config

---

## 4. Opstarten

### Snelle start
```bash
cd /Users/dickbraam/Projects/signalen
./start-alles.sh
```

### Handmatig opstarten

**Stap 1: Start de Node.js server**
```bash
cd /Users/dickbraam/Projects/signalen
node start-gids.js
```

**Stap 2: Open browser**
```
http://localhost:3000
```

**Stap 3: Volg de wizard**
1. Klik "▶️ Start Docker (App)"
2. Wacht tot containers draaien (check met status knop)
3. Klik "🔍 Controleer Backend"
4. Klik "🖥 Open Terminal & Start" voor frontend
5. Test de API
6. (Optioneel) Simuleer camera-auto

### Frontend handmatig starten
```bash
cd /Users/dickbraam/Projects/signalen/signals-frontend
npm start
```

---

## 5. Belangrijke bestanden

### Project Root
| Bestand | Doel |
|---------|------|
| `start-alles.sh` | Hoofdscript om alles te starten |
| `start-gids.js` | Node.js server voor opstartgids |
| `signalen-opstartgids.html` | Interactieve wizard |
| `docker-compose.yml` | Docker configuratie |
| `VERVOLGSTAPPEN.md` | Notities over volgende stappen |

### Frontend (`signals-frontend/`)
| Bestand | Doel |
|---------|------|
| `app.json` | Configuratie (logo, features, API URLs) |
| `assets/images/wassenaar-logo.svg` | Logo bestand |
| `src/` | React broncode |

### Backend (`app/`)
| Bestand | Doel |
|---------|------|
| `signals/settings.py` | Django instellingen |
| `signals/urls.py` | URL routing |
| `create_category.py` | Script om categorieën aan te maken |

### Docker Configuratie
| Bestand | Doel |
|---------|------|
| `docker-compose/environments/.api` | Environment vars voor Django |
| `docker-compose/keycloak/` | Keycloak configuratie |

---

## 6. Configuratie & Instellingen

### Frontend Configuratie (`signals-frontend/app.json`)

**Logo instelling:**
```json
"logo": {
  "url": "/assets/images/wassenaar-logo.svg",
  "width": "400px",
  "height": "100px"
}
```

**Belangrijke feature flags:**
```json
"showMainCategories": true,
"enableReporter": true,
"fetchDistrictsFromBackend": true,
"enableMapFilter": true,
"enablePublicSignalMap": true
```

### Backend Environment (`docker-compose/environments/.api`)

**Belangrijke instellingen:**
```
ADMIN_ENABLE_LOCAL_LOGIN=True       # Lokale login in Django Admin
CORS_ALLOW_ALL_ORIGINS=True         # Voor mobiele modus
ALLOWED_HOSTS=*                     # Accepteer alle hosts
DEFAULT_PDOK_MUNICIPALITIES=Wassenaar  # Adresvalidatie voor Wassenaar
```

---

## 7. Bekende problemen & Oplossingen

### Probleem: Logo niet zichtbaar
**Oorzaak:** De frontend gebruikt een merge van `app.base.json` + `app.json`. Als alleen `app.json` is aangepast maar `app.base.json` nog het Amsterdam logo heeft, kan de cache de oude waarde vasthouden.

**Oplossing:**  
1. Pas **beide** bestanden aan:
   - `signals-frontend/app.json` → `"url": "/assets/images/wassenaar-logo.svg"`
   - `signals-frontend/app.base.json` → `"url": "/assets/images/wassenaar-logo.svg"`
2. **Herstart de frontend** (Ctrl+C en opnieuw `npm start`)
3. Het logo bestand moet bestaan in: `signals-frontend/assets/images/wassenaar-logo.svg`

**Let op:** Na elke wijziging aan de config bestanden moet de frontend opnieuw worden gestart!

### Probleem: "Open Terminal & Start" werkt niet (macOS)
**Oorzaak:** AppleScript quoting issues met lange paden (OneDrive)  
**Oplossing:** Nu verhuisd naar `/Users/dickbraam/Projects/signalen` + fix in `start-gids.js` die tijdelijk `.sh` script schrijft

### Probleem: Django Admin login loop
**Oorzaak:** Keycloak redirect maar geen lokale user  
**Oplossing:** 
1. `ADMIN_ENABLE_LOCAL_LOGIN=True` in `.api` env
2. Clear cookies of incognito window
3. "Reset Admin" knop in opstartgids

### Probleem: "Geen categorieën gevonden" bij simulatie
**Oorzaak:** Lege database  
**Oplossing:** Run `python app/create_category.py` of maak categorieën in Django Admin

### Probleem: API 404 op `/categories/`
**Oorzaak:** Verkeerde URL  
**Oplossing:** Correcte URL is `/signals/v1/public/terms/categories/`

### Probleem: Git push rejected
**Oorzaak:** Remote heeft commits die je niet hebt  
**Oplossing:** `git pull origin main --rebase` dan `git push`

### Probleem: "Fout - Momenteel zijn er problemen met de website" bij melding maken
**Oorzaak:** Adresvalidatie zoekt in verkeerde gemeente (Amsterdam i.p.v. Wassenaar)  
**Oplossing:** 
1. Voeg `DEFAULT_PDOK_MUNICIPALITIES=Wassenaar` toe aan `docker-compose/environments/.api`
2. **Belangrijk:** Gebruik `docker-compose up -d api` (niet `restart`) om nieuwe env vars te laden
3. Gebruik een echt bestaand adres in Wassenaar

### Probleem: Kan niet klikken op meldingen in Django Admin
**Oorzaak:** `list_display_links = None` in SignalAdmin  
**Oplossing:** Al gefixt - meldingen zijn nu klikbaar op ID

---

## 8. API Endpoints

### Publieke endpoints (geen auth nodig)
| Methode | URL | Doel |
|---------|-----|------|
| GET | `/signals/v1/public/terms/categories/` | Lijst categorieën |
| POST | `/signals/v1/public/signals/` | Nieuwe melding maken |
| GET | `/signals/v1/public/signals/{id}` | Melding ophalen |

### Melding maken (POST body)
```json
{
  "text": "Beschrijving van de melding",
  "location": {
    "geometrie": {
      "type": "Point",
      "coordinates": [4.3971, 52.1453]
    },
    "address": {
      "openbare_ruimte": "Straatnaam",
      "huisnummer": "1",
      "woonplaats": "Wassenaar"
    }
  },
  "category": {
    "sub_category": "/signals/v1/public/terms/categories/afval/sub_categories/asbest-accu/"
  },
  "reporter": {
    "email": "melder@example.com",
    "phone": "0612345678"
  }
}
```

---

## 9. Gebruikersbeheer

### Django Admin (`localhost:8000/signals/admin/`)
**Login:** admin / insecure

**Waar vind je meldingen:**
- Signals → Signals (hoofdlijst)
- Of via zoekfunctie

**Categorieën beheren:**
- Signals → Categories
- Signals → Parent Categories

### Keycloak (`localhost:8080`)
**Login:** admin / admin

**Realm:** signalen  
**Users:** Hier maak je gebruikers voor SSO

### Rollen & Rechten
- **Inwoner:** Kan meldingen maken (geen login nodig)
- **Behandelaar:** Kan meldingen zien en status wijzigen
- **Coördinator:** Kan meldingen toewijzen aan afdelingen
- **Admin:** Volledige toegang

---

## 10. Volgende stappen (TODO)

### Prioriteit 1 - Basis werkend
- [x] Docker omgeving draait
- [x] Frontend werkt
- [x] Logo Wassenaar zichtbaar
- [x] Camera-auto simulatie
- [x] Git backup systeem
- [x] Meldingen maken werkt (adresvalidatie Wassenaar)
- [x] Foto's uploaden bij meldingen
- [x] Django Admin: meldingen bekijken met foto preview
- [ ] Categorieën volledig inrichten

### Prioriteit 2 - Coördinator View
- [ ] Kaart met meldingen als markers
- [ ] Kleurcodes voor prioriteit (rood=hoog, oranje=normaal, groen=laag)
- [ ] Filter op status/categorie
- [ ] Toewijzen aan teams

### Prioriteit 3 - Integraties
- [ ] ZGW/OpenZaak koppeling onderzoeken
- [ ] Echte beeldherkenning integratie
- [ ] Email notificaties configureren

### Prioriteit 4 - Productie
- [ ] HTTPS configureren
- [ ] Keycloak users inrichten
- [ ] Backup strategie database

---

## 11. Technische details

### Docker Containers
```bash
# Status bekijken
docker-compose ps

# Logs bekijken
docker-compose logs -f api
docker-compose logs -f keycloak

# Herstarten
docker-compose restart api

# Alles stoppen
docker-compose down

# Alles starten
docker-compose up -d
```

### Database toegang
```bash
docker-compose exec database psql -U signals -d signals
```

### Django shell
```bash
docker-compose exec api python manage.py shell
```

### Handige Django commands
```bash
# Admin user resetten
docker-compose exec api python manage.py createsuperuser

# Migraties draaien
docker-compose exec api python manage.py migrate

# Categorieën laden
docker-compose exec api python manage.py loaddata categories
```

### Git workflow
```bash
# Status
git status

# Alles committen
git add .
git commit -m "Beschrijving"
git push origin main

# Wijzigingen ophalen
git pull origin main
```

---

## 📞 Hulp nodig?

**GitHub Issues:** https://github.com/benjosb/beeldherkenning/issues

**Oorspronkelijk project:** https://github.com/Amsterdam/signals

---

*Dit document is gegenereerd op basis van de ontwikkelsessies met Cursor AI.*
