/* Gemeinsame Hilfsfunktionen für die Christliche Spielesammlung */

/** Lädt eine JSON-Datei relativ zur aufrufenden Seite. */
async function loadData(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Konnte Daten nicht laden: " + url);
  return res.json();
}

/** Fisher-Yates Shuffle, verändert das Array nicht. */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Wählt n zufällige, unterschiedliche Elemente aus einem Array. */
function pickRandom(arr, n) {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/** Normalisiert Text für tolerante Antwortvergleiche (Groß-/Kleinschreibung,
 *  Umlaute, Satzzeichen, Mehrfach-Leerzeichen). */
function normalize(str) {
  return String(str)
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[„“"'.,!?;:()\-–—]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prüft, ob eine Nutzereingabe zu einer Antwort (+ evtl. Alternativen) passt. */
function answerMatches(input, answer, altAnswers) {
  const n = normalize(input);
  if (!n) return false;
  const candidates = [answer, ...(altAnswers || [])].map(normalize);
  return candidates.some(c => c === n || (c.length > 3 && (c.includes(n) || n.includes(c))));
}

/** Erzeugt eine kleine Ergebnis-Nachricht abhängig von der Quote. */
function scoreMessage(correct, total) {
  const ratio = total ? correct / total : 0;
  if (ratio === 1) return "Großartig! Alles richtig! 🌟";
  if (ratio >= 0.8) return "Sehr stark! Fast alles gewusst! 🙌";
  if (ratio >= 0.5) return "Gut gemacht – weiter so! 📖";
  return "Dranbleiben lohnt sich – übe weiter! 🌱";
}

/** Baut die Fortschrittsanzeige (Kreise/Balken) als HTML-String. */
function progressBarHTML(current, total) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  return `<div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>`;
}
