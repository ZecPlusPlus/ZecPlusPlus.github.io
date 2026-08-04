# Benjamin Zec — Portfolio

Persönliche Portfolio-Seite mit interaktivem **digitalem Garten**, live GitHub-Projekten, Paper-Liste, CV und Kontakt.

🌐 **Live:** https://zecplusplus.github.io/

---

## Features

| Sektion | Beschreibung |
|---------|--------------|
| **Hero** | Name, Titel, Kurz-Bio, CTA-Buttons |
| **🌱 Garten** | Interaktive Baum-Simulation: gießen, wachsen lassen, mehrere Bäume pflanzen, Austrocknung über Zeit |
| **📁 Projekte** | Live geladen von GitHub API (Repos, Beschreibung, Sprache, Stars, Forks) |
| **📄 Paper** | arXiv-Links & Forschungsinteressen |
| **📋 CV** | Timeline mit Studium, Forschung, Skills |
| **📬 Kontakt** | GitHub & E-Mail |

---

## Lokale Entwicklung

```bash
cd /home/zecplusplus/Desktop/my_portfolio
python3 -m http.server 8765
# dann http://localhost:8765 öffnen
```

Kein Build-Schritt nötig — reines HTML/CSS/JS.

---

## Anpassungen vornehmen

### Inhalt ändern
- **index.html** — Texte, Struktur, neue Sektionen
- **style.css** — Farben, Layout, Animationen
- **script.js** — Logik (Garten, GitHub-Fetch, Paper-Liste)

### GitHub-Projekte
Wird automatisch via `fetch('https://api.github.com/users/ZecPlusPlus/repos')` geladen.
Neue öffentliche Repos erscheinen nach kurzer Zeit von selbst.

### Paper-Liste
In `script.js` im Array `papers` Einträge hinzufügen:
```js
{ title: 'Titel', sub: 'Beschreibung', link: 'https://arxiv.org/abs/xxxx' }
```

### CV-Inhalt
In `index.html` im `<section id="cv">`-Block die `<div class="tl-item">`-Einträge bearbeiten.

---

## Deploy (GitHub Pages)

Das Repo heißt **`ZecPlusPlus.github.io`** (User-Pages). Jeder Push auf `main` triggert automatisch einen neuen Pages-Build.

```bash
cd /home/zecplusplus/Desktop/my_portfolio
git add -A
git commit -m "Update: ..."
git push
# Build-Status: gh api repos/ZecPlusPlus/ZecPlusPlus.github.io/pages/builds/latest
```

---

## Garten-Logik (script.js)

Der Garten nutzt `localStorage` für Persistenz pro Browser:

| Key | Bedeutung |
|-----|-----------|
| `bz_garden_trees_v2` | Array aller Bäume mit Zustand (Größe, letzte Bewässerung, Art, Position) |
| `bz_garden_settings_v2` | Globale Einstellungen (Tagesgeschwindigkeit, Benachrichtigungen) |

### Hauptfunktionen
- `waterTree(id, amount)` — gießt einen Baum
- `plantTree(type, x)` — pflanzt neuen Baum (Eiche, Kirsche, Bonsai, Palme)
- `tick()` — wird jede Sekunde aufgerufen, simuliert Wachstum & Austrocknung
- `serialize()` / `deserialize()` — Speichern/Laden

### Baum-Typen
| Typ | Max-Höhe | Wasserbedarf | Besondere Eigenschaft |
|-----|----------|--------------|----------------------|
| `oak` | 100% | normal | klassisch, starke Krone |
| `cherry` | 90% | hoch | blüht bei >80% |
| `bonsai` | 60% | niedrig | bleibt klein, detailreich |
| `palm` | 110% | sehr hoch | wächst endlos in die Höhe |

---

## Lizenz

MIT — frei nutzbar, anpassbar, teilbar.

---

*Gebaut mit 🌱, Kaffee & Neugier.*