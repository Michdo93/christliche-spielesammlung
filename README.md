# Christliche Spielesammlung

Eine Sammlung spielbarer, browserbasierter Bibel-Quiz- und Rätselspiele
(HTML/CSS/JS, keine Build-Tools nötig) – ideal für **GitHub Pages**.

## Struktur

```
index.html                 ← Hub-Seite mit Links zu allen Spielen
assets/style.css            ← gemeinsames Design
assets/common.js             ← gemeinsame Hilfsfunktionen (Shuffle, Laden, Antwortprüfung …)

games/bibelquiz/             ← Multiple-Choice-Quiz (15 von N Fragen zufällig)
games/wahrfalsch/            ← Wahr-oder-Falsch-Runden
games/ratespiel/              ← "Wer/Was bin ich?" mit Countdown & progressiven Tipps
                                 (Kategorien: Personen, Orte, Symbole, Emoji-Geschichten)
games/luecken/                ← Lückentexte, Bibel-Zahlen, Vers-Ergänzung
games/matching/                ← Zuordnungs-Quiz (Personen/Ereignisse, Psalmen/Lieder)
games/reihenfolge/             ← Chronologie-Rätsel mit Lösungswort
games/anagramme/               ← Bibel-Anagramme
games/wortgitter/               ← Wortgitter (Raster wird bei jeder Runde neu generiert)
games/galgenmaennchen/          ← Galgenmännchen (biblische Begriffe erraten)
games/memory/                   ← Memory mit christlichen Symbolen (Kreuz, Fisch, Taube …)
games/puzzle/                   ← Schiebepuzzle (3×3/4×4) mit selbst gestalteten Motiven
games/verspuzzle/                ← Bibelvers-Puzzle (Wörter zu einem Vers zusammensetzen)
games/karteikarten/              ← Karteikarten zum Lernen (Vorder-/Rückseite, Selbsteinschätzung)
games/sudoku/                    ← Mini-Sudoku mit christlichen Symbolen (4×4 / 6×6)
games/kreuzwortraetsel/          ← Automatisch generiertes Kreuzworträtsel

andachten/                    ← Mini-Andachten zum Lesen/Blättern (kein Quiz)
```

## Inhalte erweitern

Jedes Spiel lädt seine Fragen aus einer eigenen `data.json` (bzw. mehreren
Dateien im `data/`-Unterordner bei Spielen mit Kategorien/Modi). Um neue
Fragen hinzuzufügen, einfach weitere Einträge im gleichen Format ergänzen –
die Spiele wählen automatisch eine zufällige Teilmenge (z. B. 15 von 100)
für jede Runde aus. Es ist kein Code nötig.

Beispiel `games/bibelquiz/data.json`:

```json
[
  { "question": "Wer baute die Arche?", "options": ["Mose", "Noah", "Abraham"], "answer": 1 }
]
```

Die Datenformate der anderen Spiele sind in den jeweiligen `data.json`-
Dateien selbsterklärend (siehe vorhandene Beispiele).

## Lokal testen

Da die Spiele per `fetch()` JSON-Dateien laden, müssen sie über einen
lokalen Webserver (nicht `file://`) geöffnet werden, z. B.:

```bash
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

## Auf GitHub Pages veröffentlichen

1. Repo erstellen (Vorschlag: `christliche-spielesammlung`) und diesen Inhalt pushen.
2. In den Repo-Einstellungen unter **Pages** die Quelle auf den `main`-Branch
   (Root-Verzeichnis) stellen.
3. Die Seite ist danach unter `https://<username>.github.io/<repo>/` erreichbar.

## Quelle

Ursprünglicher Inhalt basiert auf den Markdown-Vorlagen aus
„Christlicher-Social-Media-Stuff“ und wurde hier in spielbare,
erweiterbare Web-Apps umgesetzt.
