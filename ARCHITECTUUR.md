# Signalen - Architectuur Overzicht

> **Versie:** 1.0  
> **Datum:** 11 januari 2026  
> **Gebaseerd op:** Amsterdam Signalen (signals.org)

---

## 📋 Inhoudsopgave

1. [Overzicht](#1-overzicht)
2. [Docker Architectuur](#2-docker-architectuur)
3. [Componenten in Detail](#3-componenten-in-detail)
4. [API Structuur](#4-api-structuur)
5. [Data Flow](#5-data-flow)
6. [Poorten Overzicht](#6-poorten-overzicht)

---

## 1. Overzicht

Signalen is een **meldingenbeheer systeem** ontwikkeld door Gemeente Amsterdam. Het stelt burgers in staat om meldingen te doen over de openbare ruimte (afval, schade, overlast) en biedt gemeenteambtenaren tools om deze meldingen te verwerken.

### High-Level Architectuur

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              🌐 BROWSER / CLIENT                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   👤 Burger/Inwoner          👔 Behandelaar/Coördinator         🔧 Admin        │
│   (React Frontend)           (React Frontend)                   (Django Admin)  │
│   localhost:3001             localhost:3001                     localhost:8000  │
│                                                                                  │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              🔀 API GATEWAY                                      │
│                              (Django REST Framework)                             │
│                              localhost:8000/signals/                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│  PUBLIC API                           │  PRIVATE API                             │
│  /v1/public/signals/                  │  /v1/private/signals/                    │
│  /v1/public/terms/categories/         │  /v1/private/users/                      │
│  /v1/public/areas/                    │  /v1/private/departments/                │
│  (Geen authenticatie nodig)           │  (OIDC/Keycloak authenticatie)           │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          ▼                            ▼                            ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│   🐘 PostgreSQL │          │   🔍 Elastic    │          │   🐰 RabbitMQ   │
│   + PostGIS     │          │   Search        │          │   Message Queue │
│   :5432         │          │   :9200         │          │   :5672         │
│                 │          │                 │          │                 │
│  Meldingen      │          │  Zoekindex      │          │  Async Tasks    │
│  Gebruikers     │          │  Full-text      │          │  Email Queue    │
│  Categorieën    │          │  search         │          │                 │
└─────────────────┘          └─────────────────┘          └────────┬────────┘
                                                                   │
                                                                   ▼
                                                          ┌─────────────────┐
                                                          │   🥬 Celery     │
                                                          │   Workers       │
                                                          │                 │
                                                          │  • Email        │
                                                          │  • Indexing     │
                                                          │  • Routing      │
                                                          │  • Cleanup      │
                                                          └─────────────────┘
```

---

## 2. Docker Architectuur

### Container Overzicht

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DOCKER COMPOSE STACK                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │     api     │  │   celery    │  │ celery_beat │  │   flower    │            │
│  │  (Django)   │  │  (Worker)   │  │ (Scheduler) │  │ (Monitor)   │            │
│  │   :8000     │  │             │  │             │  │   :5566     │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘            │
│         │                │                │                                      │
│         └────────────────┴────────────────┘                                      │
│                          │                                                       │
│         ┌────────────────┼────────────────┬────────────────┐                    │
│         ▼                ▼                ▼                ▼                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  database   │  │elasticsearch│  │   rabbit    │  │   mailpit   │            │
│  │ (PostgreSQL)│  │   (ES 7.x)  │  │ (RabbitMQ)  │  │  (SMTP Dev) │            │
│  │   :5432     │  │   :9200     │  │   :5672     │  │   :8025     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                              │
│  │  keycloak   │  │     dex     │  │    minio    │                              │
│  │   (OIDC)    │  │   (OIDC)    │  │  (S3 Dev)   │                              │
│  │   :8002     │  │   :5556     │  │   :9000     │                              │
│  └─────────────┘  └─────────────┘  └─────────────┘                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Dependencies (Opstartvolgorde)

```
database ─────────────┐
                      │
elasticsearch ────────┼───► celery ───► celery_beat
                      │         │
rabbit ───────────────┤         │
                      │         ▼
mailpit ──────────────┼───► api ◄─── dex
                      │
keycloak ─────────────┘
```

---

## 3. Componenten in Detail

### 3.1 🐍 API (Django/Python)

| Eigenschap | Waarde |
|------------|--------|
| **Image** | Custom (Dockerfile) |
| **Poort** | 8000 |
| **Framework** | Django 4.x + Django REST Framework |

**Functie:**
De API is het **hart van de applicatie**. Het is een Django applicatie die:
- REST API endpoints biedt voor frontend en externe systemen
- Meldingen ontvangt, valideert en opslaat
- Authenticatie/autorisatie afhandelt via OIDC (Keycloak/Dex)
- De Django Admin interface biedt voor beheerders
- Media bestanden (foto's) beheert

**Belangrijke modules:**
```
signals/apps/
├── api/            # REST API views, serializers, filters
├── signals/        # Core melding model en business logic
├── users/          # Gebruikersbeheer
├── email_integrations/  # Email notificaties
├── feedback/       # Burger feedback op afhandeling
├── questionnaires/ # Aanvullende vragen bij meldingen
├── reporting/      # CSV exports voor datawarehouse
├── search/         # Elasticsearch integratie
└── my_signals/     # "Mijn Meldingen" voor burgers
```

---

### 3.2 🐘 Database (PostgreSQL + PostGIS)

| Eigenschap | Waarde |
|------------|--------|
| **Image** | postgis/postgis:13-3.5-alpine |
| **Poort** | 5432 (intern), 5409 (extern) |

**Functie:**
De primaire dataopslag voor alle applicatiegegevens:

- **Meldingen (Signals):** Alle meldingen met status, categorie, locatie
- **Gebruikers:** Accounts, rollen, rechten
- **Categorieën:** Hoofdcategorieën en subcategorieën
- **Afdelingen:** Organisatiestructuur voor routering
- **Bijlagen:** Metadata van geüploade foto's
- **Audit trail:** Geschiedenis van statuswijzigingen

**PostGIS extensie:**
Biedt geografische functionaliteit voor:
- Opslaan van GeoJSON locaties (Point geometrie)
- Zoeken binnen een bepaald gebied
- Afstand berekeningen

**Belangrijkste tabellen:**
```sql
signals_signal          -- Hoofdtabel meldingen
signals_location        -- Locatie gegevens (GIS)
signals_category        -- Categorieën
signals_status          -- Statusgeschiedenis
signals_attachment      -- Bijlagen (foto's)
signals_reporter        -- Melder gegevens
auth_user               -- Gebruikers
```

---

### 3.3 🔍 Elasticsearch

| Eigenschap | Waarde |
|------------|--------|
| **Image** | elasticsearch:7.17.9 |
| **Poort** | 9200, 9300 |

**Functie:**
Zoekengine voor **full-text search** en snelle filtering:

- **Meldingen zoeken:** Zoek op tekst, adres, beschrijving
- **Autocomplete:** Suggesties tijdens typen
- **Aggregaties:** Statistieken en rapportages
- **Snelle filtering:** Efficiënter dan SQL voor complexe queries

**Hoe het werkt:**
1. Bij elke nieuwe/gewijzigde melding stuurt Celery een indexeer-taak
2. Elasticsearch ontvangt het document en indexeert het
3. Zoekopdrachten gaan direct naar Elasticsearch (niet naar PostgreSQL)

**Index structuur:**
```json
{
  "id": 12345,
  "text": "Kapotte lantaarnpaal bij de school",
  "created_at": "2026-01-11T10:30:00Z",
  "status": "gemeld",
  "category": "openbare-verlichting",
  "address": {
    "street": "Schoolstraat",
    "number": "10",
    "city": "Wassenaar"
  },
  "location": {
    "lat": 52.1454,
    "lon": 4.3956
  }
}
```

---

### 3.4 🐰 RabbitMQ

| Eigenschap | Waarde |
|------------|--------|
| **Image** | rabbitmq:3.8-management |
| **Poorten** | 5672 (AMQP), 15672 (Management UI) |

**Functie:**
**Message broker** voor asynchrone communicatie:

- **Task Queue:** Ontvangt taken van Django, levert ze aan Celery workers
- **Betrouwbaarheid:** Taken gaan niet verloren bij crashes
- **Load balancing:** Verdeelt werk over meerdere workers
- **Prioriteit:** Belangrijke taken kunnen voorrang krijgen

**Waarom async?**
Sommige operaties duren te lang voor een HTTP request:
- Email versturen (kan 1-5 seconden duren)
- Elasticsearch indexeren
- Routering berekenen
- CSV exports genereren

**Management UI:** `http://localhost:15672` (signals/insecure)

---

### 3.5 🥬 Celery (Worker + Beat + Flower)

| Component | Functie | Commando |
|-----------|---------|----------|
| **celery** | Worker - voert taken uit | `celery -A signals worker` |
| **celery_beat** | Scheduler - plant periodieke taken | `celery -A signals beat` |
| **flower** | Monitor - dashboard voor taken | `celery -A signals flower` |

**Functie:**
**Distributed task queue** voor achtergrondtaken:

**Taken die Celery uitvoert:**

| Taak | Trigger | Beschrijving |
|------|---------|--------------|
| `send_mail_reporter` | Statuswijziging | Stuurt email naar melder |
| `save_to_elastic` | Nieuwe/gewijzigde melding | Indexeert in Elasticsearch |
| `apply_routing` | Nieuwe melding | Past routeringsregels toe |
| `anonymize_reporters` | Dagelijks (Beat) | Anonimiseert oude meldergegevens |
| `delete_signals_in_state_for_x_days` | Dagelijks (Beat) | Verwijdert oude afgehandelde meldingen |
| `clearsessions` | Dagelijks (Beat) | Ruimt verlopen sessies op |
| `save_csv_files_datawarehouse` | Dagelijks (Beat) | Export naar datawarehouse |

**Flower Dashboard:** `http://localhost:5566`

---

### 3.6 🔐 Keycloak

| Eigenschap | Waarde |
|------------|--------|
| **Image** | Custom (docker-compose/keycloak) |
| **Poort** | 8002 |

**Functie:**
**Identity and Access Management (IAM)** voor Single Sign-On:

- **Authenticatie:** Gebruikers inloggen via OIDC protocol
- **Autorisatie:** Rollen en rechten beheren
- **SSO:** Eén keer inloggen voor alle applicaties
- **Federatie:** Koppeling met externe identity providers (bijv. Azure AD)

**OIDC Flow:**
```
1. Gebruiker klikt "Inloggen"
2. Frontend redirect naar Keycloak
3. Gebruiker logt in bij Keycloak
4. Keycloak redirect terug met authorization code
5. Backend wisselt code voor access token
6. Backend valideert token en logt gebruiker in
```

**Admin Console:** `http://localhost:8002` (admin/admin)

**Rollen:**
- `sia_read` - Meldingen bekijken
- `sia_write` - Meldingen bewerken
- `sia_signal_create` - Interne meldingen aanmaken
- `sia_can_view_all_categories` - Alle categorieën zien

---

### 3.7 📧 Mailpit (Development)

| Eigenschap | Waarde |
|------------|--------|
| **Image** | axllent/mailpit |
| **Poorten** | 1025 (SMTP), 8025 (Web UI) |

**Functie:**
**Fake SMTP server** voor development:

- Vangt alle uitgaande emails op
- Toont emails in een web interface
- Voorkomt dat test-emails naar echte adressen gaan

**Web UI:** `http://localhost:8025`

---

### 3.8 📦 MinIO (Development)

| Eigenschap | Waarde |
|------------|--------|
| **Image** | minio/minio |
| **Poorten** | 9000 (API), 9001 (Console) |

**Functie:**
**S3-compatibele object storage** voor development:

- Simuleert AWS S3 lokaal
- Opslag voor bijlagen/foto's (optioneel)
- Backup locatie voor exports

---

## 4. API Structuur

### 4.1 Public API (Geen authenticatie)

Endpoints voor burgers en externe systemen:

```
POST   /signals/v1/public/signals/                    # Nieuwe melding maken
GET    /signals/v1/public/signals/{uuid}              # Melding ophalen (eigen melding)
POST   /signals/v1/public/signals/{uuid}/attachments  # Foto toevoegen

GET    /signals/v1/public/terms/categories/           # Alle categorieën
GET    /signals/v1/public/terms/categories/{slug}/    # Categorie details
GET    /signals/v1/public/terms/categories/{slug}/sub_categories/

GET    /signals/v1/public/areas/                      # Gebieden/wijken
GET    /signals/v1/public/questions/                  # Aanvullende vragen

GET    /signals/v1/public/map-signals/                # Meldingen op kaart (als enabled)
```

### 4.2 Private API (Authenticatie vereist)

Endpoints voor behandelaars en beheerders:

```
# Meldingen
GET    /signals/v1/private/signals/                   # Lijst meldingen (gefilterd)
GET    /signals/v1/private/signals/{id}               # Melding detail
PATCH  /signals/v1/private/signals/{id}               # Melding updaten (status, categorie, etc.)
GET    /signals/v1/private/signals/{id}/attachments   # Bijlagen bij melding
GET    /signals/v1/private/signals/{id}/history       # Geschiedenis

# Gebruikers & Rollen
GET    /signals/v1/private/users/                     # Alle gebruikers
GET    /signals/v1/private/roles/                     # Alle rollen
GET    /signals/v1/private/permissions/               # Alle rechten
GET    /signals/v1/private/me/                        # Huidige gebruiker

# Organisatie
GET    /signals/v1/private/departments/               # Afdelingen
GET    /signals/v1/private/categories/                # Categorieën (uitgebreid)
GET    /signals/v1/private/sources/                   # Bronnen van meldingen

# Zoeken
GET    /signals/v1/private/search/                    # Full-text zoeken

# Exports
GET    /signals/v1/private/csv/                       # CSV export
```

### 4.3 API Request/Response Voorbeeld

**Nieuwe melding maken:**

```http
POST /signals/v1/public/signals/
Content-Type: application/json

{
  "text": "Kapotte lantaarnpaal op de hoek",
  "location": {
    "geometrie": {
      "type": "Point",
      "coordinates": [4.3956, 52.1454]
    },
    "address": {
      "openbare_ruimte": "Schoolstraat",
      "huisnummer": "10",
      "woonplaats": "Wassenaar"
    }
  },
  "category": {
    "sub_category": "/signals/v1/public/terms/categories/openbare-verlichting/sub_categories/lantaarnpaal-Loss"
  },
  "reporter": {
    "email": "burger@example.com",
    "phone": "0612345678"
  }
}
```

**Response:**
```json
{
  "signal_id": "abc123-def456-...",
  "_links": {
    "self": {
      "href": "/signals/v1/public/signals/abc123-def456-..."
    }
  }
}
```

---

## 5. Data Flow

### 5.1 Melding Maken (Burger)

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │────►│ React   │────►│ Django  │────►│Postgres │     │         │
│         │     │ Frontend│     │   API   │     │         │     │         │
└─────────┘     └─────────┘     └────┬────┘     └─────────┘     │         │
                                     │                          │         │
                                     ▼                          │         │
                               ┌─────────┐     ┌─────────┐      │ Celery  │
                               │RabbitMQ │────►│ Worker  │──────│         │
                               └─────────┘     └────┬────┘      │         │
                                                    │           │         │
                                     ┌──────────────┼───────────┘         │
                                     ▼              ▼                     │
                               ┌─────────┐   ┌─────────┐                  │
                               │ Elastic │   │ Mailpit │                  │
                               │ Search  │   │ (Email) │                  │
                               └─────────┘   └─────────┘                  │
```

**Stappen:**
1. Burger vult formulier in op React frontend
2. Frontend POST naar Django API
3. Django valideert data (adres via PDOK)
4. Django slaat melding op in PostgreSQL
5. Django publiceert taken naar RabbitMQ:
   - Indexeer in Elasticsearch
   - Stuur bevestigingsmail
   - Pas routeringsregels toe
6. Celery workers voeren taken uit

### 5.2 Melding Bekijken (Behandelaar)

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │────►│ React   │────►│ Django  │────►│ Elastic │
│         │◄────│ Frontend│◄────│   API   │◄────│ Search  │
└─────────┘     └─────────┘     └────┬────┘     └─────────┘
                                     │
                                     ▼
                               ┌─────────┐
                               │Postgres │
                               │(details)│
                               └─────────┘
```

**Stappen:**
1. Behandelaar logt in via Keycloak
2. Frontend toont lijst meldingen (query naar Elasticsearch)
3. Behandelaar klikt op melding
4. Frontend haalt details op (PostgreSQL via API)

---

## 6. Poorten Overzicht

| Poort | Service | Beschrijving | URL |
|-------|---------|--------------|-----|
| **3001** | Frontend | React webapp | http://localhost:3001 |
| **8000** | API | Django REST API | http://localhost:8000/signals/ |
| **8000** | Admin | Django Admin | http://localhost:8000/signals/admin/ |
| **8002** | Keycloak | Identity Management | http://localhost:8002 |
| **5409** | PostgreSQL | Database (extern) | localhost:5409 |
| **9200** | Elasticsearch | Search API | http://localhost:9200 |
| **5672** | RabbitMQ | Message Queue | amqp://localhost:5672 |
| **15672** | RabbitMQ | Management UI | http://localhost:15672 |
| **5566** | Flower | Celery Monitor | http://localhost:5566 |
| **8025** | Mailpit | Email UI | http://localhost:8025 |
| **9001** | MinIO | Object Storage UI | http://localhost:9001 |

---

## 📚 Referenties

- **Signalen GitHub:** https://github.com/Amsterdam/signals
- **Signalen Documentatie:** https://signalen.org
- **Django REST Framework:** https://www.django-rest-framework.org
- **Celery:** https://docs.celeryproject.org

---

*Dit document beschrijft de architectuur van Signalen zoals geïnstalleerd voor Gemeente Wassenaar.*
