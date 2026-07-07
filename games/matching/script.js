const SETS = [
  { key: "paare", label: "Personen & Ereignisse", icon: "🪢", file: "data/paare.json", desc: "Wer gehört zu welchem biblischen Ereignis?" },
  { key: "psalmlied", label: "Psalmen & Lieder", icon: "🎶", file: "data/psalmlied.json", desc: "Ordne das Zitat dem passenden Psalm oder Lied zu." }
];

const ROUND_SIZE = 8; // wie viele Paare pro Runde
const app = document.getElementById("app");

let currentSet = null;
let allPairs = [];
let pairs = [];       // aktuelle Runde: [{left, right}]
let leftItems = [];
let rightItems = [];
let selectedLeft = null;
let matchedCount = 0;
let attempts = 0;

function renderSetPicker() {
  app.innerHTML = `
    <div class="game-toolbar"><span class="pill">Themenset wählen</span></div>
    <div class="grid">
      ${SETS.map(s => `
        <button class="window-card" style="cursor:pointer; border:1.5px solid #ddd3ba;" data-key="${s.key}">
          <div class="icon">${s.icon}</div>
          <h3>${s.label}</h3>
          <p>${s.desc}</p>
        </button>
      `).join("")}
    </div>
  `;
  SETS.forEach(s => {
    app.querySelector(`[data-key="${s.key}"]`).onclick = () => selectSet(s);
  });
}

async function selectSet(s) {
  currentSet = s;
  app.innerHTML = `<p>Lade ${s.label}…</p>`;
  try {
    allPairs = await loadData(s.file);
    startRound();
  } catch (err) {
    app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
  }
}

function startRound() {
  const size = Math.min(ROUND_SIZE, allPairs.length);
  pairs = pickRandom(allPairs, size);
  leftItems = shuffle(pairs.map((p, i) => ({ text: p.left, pairIndex: i })));
  rightItems = shuffle(pairs.map((p, i) => ({ text: p.right, pairIndex: i })));
  selectedLeft = null;
  matchedCount = 0;
  attempts = 0;
  renderBoard();
}

function renderBoard() {
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">${currentSet.icon} ${currentSet.label}</span>
      <span class="pill">✔ ${matchedCount} / ${pairs.length} Paare</span>
      <button class="btn secondary" id="switchBtn">Themenset wechseln</button>
    </div>
    ${progressBarHTML(matchedCount, pairs.length)}
    <div class="match-cols">
      <div id="leftCol"></div>
      <div id="rightCol"></div>
    </div>
    <div class="feedback" id="feedback"></div>
  `;
  document.getElementById("switchBtn").onclick = renderSetPicker;
  renderColumn("leftCol", leftItems, "left");
  renderColumn("rightCol", rightItems, "right");
}

function renderColumn(elId, items, side) {
  const col = document.getElementById(elId);
  col.innerHTML = "";
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "match-item";
    div.textContent = item.text;
    div.dataset.pairIndex = item.pairIndex;
    div.dataset.side = side;
    if (item.matched) div.classList.add("matched");
    div.onclick = () => handleClick(item, div, side);
    col.appendChild(div);
  });
}

function handleClick(item, el, side) {
  if (item.matched) return;
  if (side === "left") {
    document.querySelectorAll('[data-side="left"]').forEach(d => d.classList.remove("selected"));
    selectedLeft = { item, el };
    el.classList.add("selected");
    return;
  }
  // side === right
  if (!selectedLeft) return;
  attempts++;
  const feedback = document.getElementById("feedback");
  if (selectedLeft.item.pairIndex === item.pairIndex) {
    selectedLeft.item.matched = true;
    item.matched = true;
    selectedLeft.el.classList.remove("selected");
    selectedLeft.el.classList.add("matched");
    el.classList.add("matched");
    matchedCount++;
    feedback.textContent = "Passt zusammen! 🙌";
    feedback.className = "feedback good";
    selectedLeft = null;
    document.querySelector(".progress-fill").style.width = Math.round((matchedCount / pairs.length) * 100) + "%";
    if (matchedCount === pairs.length) {
      setTimeout(renderResult, 700);
    }
  } else {
    el.classList.add("wrong-flash");
    feedback.textContent = "Das passt noch nicht zusammen.";
    feedback.className = "feedback bad";
    setTimeout(() => el.classList.remove("wrong-flash"), 500);
  }
}

function renderResult() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">${currentSet.label} geschafft!</p>
      <div class="score">${pairs.length} / ${pairs.length}</div>
      <p>Du hast ${attempts} Versuche gebraucht.</p>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <button class="btn primary" id="againBtn">Neue Runde</button>
        <button class="btn secondary" id="switchBtn">Themenset wechseln</button>
      </div>
    </div>
  `;
  document.getElementById("againBtn").onclick = startRound;
  document.getElementById("switchBtn").onclick = renderSetPicker;
}

renderSetPicker();
