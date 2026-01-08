# 🚗 Beeldherkenning Wassenaar - Roadmap & Plan van Aanpak

> **Versie:** 1.0  
> **Datum:** 8 januari 2026  
> **Status:** Actief  

---

## 📋 Inhoudsopgave

1. [Visie](#1-visie)
2. [Strategische Aanpak](#2-strategische-aanpak)
3. [Fase 1: RAPPORTAGE](#3-fase-1-rapportage)
4. [Fase 2: QUALITY](#4-fase-2-quality)
5. [Fase 3: SIGNALS](#5-fase-3-signals)
6. [Technische Architectuur](#6-technische-architectuur)
7. [Kernregistraties](#7-kernregistraties)
8. [Detectie Types](#8-detectie-types)
9. [Implementatie Roadmap](#9-implementatie-roadmap)

---

## 1. Visie

### Het Concept
Camera's op het gemeentelijke wagenpark (beheer buitenruimte) maken **elke 10 meter of 3 seconden** foto's, afhankelijk van de snelheid. Een GoPro of mobiele telefoon registreert continu de openbare ruimte.

### Beeldanalyse
AI analyseert de beelden en signaleert afwijkingen van de norm:
- Losliggende stoeptegels
- Laaghangend groen (snoeiwerk nodig)
- Lachgaspatronen
- Bijplaatsingen van afval bij ORACs
- Zwerfafval
- Defecte straatverlichting

### Het Probleem
> "We kunnen niet zomaar geanalyseerde meldingen in Signalen stoppen, want dan komen de beheerders in opstand. Ze zijn hun eigen werk aan het creëren."

Dit is een **organisatorisch/politiek** probleem, niet een technisch probleem. De oplossing zit in een gefaseerde aanpak waarbij we eerst waarde leveren zonder weerstand te creëren.

---

## 2. Strategische Aanpak

### Waarom gefaseerd?

| ❌ Wat we NIET doen | ✅ Wat we WEL doen |
|---------------------|-------------------|
| Direct meldingen genereren | Eerst waarde bewijzen (rapportage) |
| Werk creëren voor beheerders | Data kwaliteit verbeteren |
| Weerstand opwekken | Draagvlak opbouwen |
| "Big bang" implementatie | Stap voor stap uitrollen |

### De Drie Fases

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FASE 1        │    │   FASE 2        │    │   FASE 3        │
│   RAPPORTAGE    │ → │   QUALITY       │ → │   SIGNALS       │
│                 │    │                 │    │                 │
│   Monitoren     │    │   Kernregistr.  │    │   Automatisch   │
│   BOR normen    │    │   verbeteren    │    │   meldingen     │
│                 │    │                 │    │                 │
│   🟢 Neutraal   │    │   🟢 Neutraal   │    │   ⚠️ Draagvlak  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 3. Fase 1: RAPPORTAGE

### Doel
Monitoren (schouwen) of de beeldkwaliteit van "Schoon, Heel en Veilig" voldoet aan de BOR (Beheer Openbare Ruimte) beleidsafspraken.

### Waarom eerst rapportage?
- **Neutrale waarneming** waar collega's niet tegen in opstand komen
- Geen werk genereren, alleen inzicht geven
- Beleidsmakers krijgen objectieve data
- Bewijst waarde van het systeem

### Output
- **BI Dashboard** (PowerBI / Tableau / Metabase)
- Trendanalyse over tijd
- Vergelijking per wijk/gebied
- Scores per categorie (schoon/heel/veilig)

### Technische Implementatie
- Foto's worden geanalyseerd op detectie types
- Resultaten worden opgeslagen met GPS-coördinaten en timestamp
- Data export naar BI-tool
- GEEN integratie met Signalen (nog)

### Status: 🟢 ACTIEF

---

## 4. Fase 2: QUALITY

### Doel
De scans matchen met bestaande gegevensbestanden (kernregistraties) om de datakwaliteit te verbeteren.

### Het Probleem met Kernregistraties
> "Ik weet dat die gegevens kwalitatief niet goed zijn."

Door foto's te matchen met GIS-data kunnen we discrepanties ontdekken:
- Asset bestaat in registratie maar niet op foto (verwijderd?)
- Asset op foto maar niet in registratie (nooit geregistreerd?)
- Locatie in registratie klopt niet met realiteit
- Attributen (type, hoogte, etc.) kloppen niet

### Startpunt: OVL (Openbare Verlichting)
Lantaarnpalen zijn een goed startpunt omdat:
- Duidelijk herkenbaar op foto's
- Bestaand register aanwezig
- Relatief eenvoudig te matchen (locatie + type)
- Groot maatschappelijk belang (veiligheid)

### World Model (geen LLM!)
We bouwen een **gestructureerd model** dat:
1. Foto-coördinaten matcht met GIS-data
2. Objectherkenning doet op de foto (is dit een lantaarnpaal?)
3. Vergelijkt met verwachte assets op die locatie
4. Discrepanties rapporteert voor verificatie

### Verificatie Workflow
Net als bij meldingen in Signalen:
1. Waarneming komt binnen bij gegevensbeheerder
2. Beheerder bepaalt: false-positive of echte discrepantie?
3. Bij echte discrepantie: kernregistratie bijwerken
4. Feedback loop naar model voor verbetering

### Status: 🔵 GEPLAND

---

## 5. Fase 3: SIGNALS

### Doel
Automatisch meldingen maken in Signalen op basis van de beeldanalyse.

### Voorwaarden
- Fase 1 en 2 succesvol afgerond
- Draagvlak bij beheerders/bestuurders
- Gesprek gevoerd over impact op werkprocessen
- Afspraken over prioritering en filtering

### Implementatie
- Integratie met Signalen API (`POST /signals/v1/public/signals/`)
- Coördinator view voor verificatie
- Prioritering op basis van ernst
- Filtering om "ruis" te voorkomen

### Status: 🟣 TOEKOMST

---

## 6. Technische Architectuur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         📷 CAMERA-AUTO (GoPro/Telefoon)                 │
│                         Elke 10m / 3 sec foto's                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    🧠 BEELDANALYSE ENGINE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Zwerfafval  │  │ Stoeptegels │  │ Groen/Snoei │  │ ORAC/Afval  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│  📊 RAPPORTAGE    │  │  🎯 QUALITY       │  │  📋 SIGNALS       │
│  (BI Dashboard)   │  │  (World Model)    │  │  (Signalen API)   │
│                   │  │                   │  │                   │
│  • BOR Scores     │  │  • Kernregistr.   │  │  • Auto-melding   │
│  • Schoon/Heel    │  │  • OVL/Bomen      │  │  • Coördinator    │
│  • Trendanalyse   │  │  • Data matching  │  │  • Prioritering   │
└───────────────────┘  └───────────────────┘  └───────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    👥 GEBRUIKERS                                         │
│  Beleidsmakers     Gegevensbeheerders      Beheerders/Coördinatoren     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Componenten

| Component | Waar | Technologie |
|-----------|------|-------------|
| Camera capture | Voertuig | GoPro / Smartphone |
| Upload/sync | Cloud | Azure Blob / AWS S3 |
| Beeldanalyse | Cloud | Python + Computer Vision |
| World Model | Cloud | Python + GIS libraries |
| Rapportage | Dashboard | BI Tool (PowerBI/Metabase) |
| Meldingen | Signalen | Django API |

---

## 7. Kernregistraties

### Beschikbare datasets voor Fase 2

| Registratie | Afkorting | Beschrijving | Prioriteit |
|-------------|-----------|--------------|------------|
| Openbare Verlichting | OVL | Lantaarnpalen | 🥇 Startpunt |
| Bomenregister | - | Bomen, snoeidata | 🥈 |
| Kolken | - | Rioolputten, afvoer | 🥉 |
| Verkeersregelinstallaties | VRI | Stoplichten | ⏳ |
| Parkeerplaatsen | - | Locaties, markering | ⏳ |
| Rioleringen | - | Leidingennet | ⏳ |

### Data Quality Issues (verwacht)
- Locaties niet nauwkeurig (meters afwijking)
- Verouderde data (assets verwijderd maar nog in systeem)
- Ontbrekende assets (nooit geregistreerd)
- Incorrecte attributen (type, hoogte, etc.)

---

## 8. Detectie Types

### Primaire detecties

| Type | Icon | Categorie | Ernst |
|------|------|-----------|-------|
| Zwerfafval | 🗑️ | Schoon | Laag-Midden |
| Losliggende tegels | 🧱 | Veilig | Hoog |
| Laaghangend groen | 🌿 | Heel | Midden |
| Lachgaspatronen | 💨 | Schoon/Veilig | Midden |
| Bijplaatsingen ORAC | 📦 | Schoon | Midden |
| Defecte OVL | 💡 | Veilig | Hoog |

### Toekomstige detecties
- Graffiti
- Kapot straatmeubilair
- Gaten in wegdek
- Illegale dumping
- Wateroverlast

---

## 9. Implementatie Roadmap

### Q1 2026: Fase 1 Fundament
- [ ] Camera hardware selecteren (GoPro vs telefoon)
- [ ] Upload/sync systeem opzetten
- [ ] Basis beeldanalyse voor 2-3 detectie types
- [ ] BI Dashboard opzetten
- [ ] Pilot met 1-2 voertuigen

### Q2 2026: Fase 1 Uitrol
- [ ] Uitbreiden naar meer detectie types
- [ ] Meer voertuigen toevoegen
- [ ] Dashboard verfijnen met feedback gebruikers
- [ ] Rapportages voor beleidsmakers

### Q3 2026: Fase 2 Start
- [ ] OVL kernregistratie koppelen
- [ ] World Model ontwikkelen
- [ ] Discrepantie detectie
- [ ] Workflow voor gegevensbeheerders

### Q4 2026: Fase 2 Uitrol + Evaluatie
- [ ] Meer kernregistraties toevoegen
- [ ] Evaluatie datakwaliteit verbetering
- [ ] Business case voor Fase 3
- [ ] Gesprekken met beheerders over automatische meldingen

### 2027: Fase 3 (optioneel)
- [ ] Integratie met Signalen
- [ ] Coördinator view voor camera-meldingen
- [ ] Automatische prioritering
- [ ] Feedback loop

---

## 📞 Contact & Links

- **GitHub repo:** https://github.com/benjosb/beeldherkenning
- **Signalen (Amsterdam):** https://github.com/Amsterdam/signals
- **Opstartgids:** `http://localhost:3333` → Tab "Beeldherkenning Roadmap"

---

*Dit document wordt bijgewerkt naarmate het project vordert.*
