const app = document.getElementById("app");

let allCards = [];
let deck = [];
let index = 0;
let flipped = false;
let knownCount = 0;
let reviewAgain = [];

function renderStart() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">${allCards.length} Karten im Stapel</p>
      <h2 style="font-family:var(--font-display); margin:14px 0;">Bereit zum Üben?</h2>
      <p>Der Stapel wird gemischt. Klicke jede Karte an, um die Rückseite zu sehen,
      und markiere danach, ob du sie schon konntest.</p>
      <button class="btn primary" id="startBtn">Stapel mischen &amp; starten</button>
    </div>
  `;
  document.getElementById("startBtn").onclick = () => startDeck(allCards);
}

function startDeck(cards) {
  deck = shuffle(cards);
  index = 0;
  flipped = false;
  knownCount = 0;
  reviewAgain = [];
  renderCard();
}

function renderCard() {
  const card = deck[index];
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">Karte ${index + 1} / ${deck.length}</span>
      <span class="pill">✔ ${knownCount} gewusst</span>
      <span class="pill">🔁 ${reviewAgain.length} zum Üben</span>
    </div>
    ${progressBarHTML(index, deck.length)}
    <div id="flashcard" style="
      min-height:180px; display:flex; align-items:center; justify-content:center;
      text-align:center; background:#fffdf8; border:1.5px solid #ddd3ba; border-radius:16px;
      padding:28px; cursor:pointer; font-family:var(--font-display); font-size:22px;">
      ${card.front}
    </div>
    <p style="text-align:center; opacity:.6; margin-top:8px;" id="hintText">Zum Umdrehen antippen</p>
    <div style="display:flex; gap:12px; justify-content:center; margin-top:18px;" id="assessButtons"></div>
  `;
  document.getElementById("flashcard").onclick = flipCard;
}

function flipCard() {
  const card = deck[index];
  flipped = !flipped;
  const el = document.getElementById("flashcard");
  el.innerHTML = flipped ? card.back : card.front;
  el.style.background = flipped ? "rgba(216,171,92,0.18)" : "#fffdf8";
  document.getElementById("hintText").textContent = flipped ? "" : "Zum Umdrehen antippen";

  const buttons = document.getElementById("assessButtons");
  if (flipped) {
    buttons.innerHTML = `
      <button class="btn secondary" id="againBtnCard">🔁 Nochmal üben</button>
      <button class="btn primary" id="knownBtnCard">✔ Kenne ich</button>
    `;
    document.getElementById("againBtnCard").onclick = () => assess(false);
    document.getElementById("knownBtnCard").onclick = () => assess(true);
  } else {
    buttons.innerHTML = "";
  }
}

function assess(known) {
  const card = deck[index];
  if (known) knownCount++;
  else reviewAgain.push(card);

  index++;
  flipped = false;
  if (index < deck.length) {
    renderCard();
  } else {
    renderResult();
  }
}

function renderResult() {
  app.innerHTML = `
    <div class="result">
      <p class="pill">Stapel durch!</p>
      <div class="score">${knownCount} / ${deck.length}</div>
      <p>${scoreMessage(knownCount, deck.length)}</p>
      ${reviewAgain.length ? `<p class="pill">${reviewAgain.length} Karte(n) zum Wiederholen</p>` : ""}
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        ${reviewAgain.length ? `<button class="btn primary" id="reviewBtn">Nur Wiederholungen üben</button>` : ""}
        <button class="btn secondary" id="restartBtn">Ganzen Stapel neu mischen</button>
      </div>
    </div>
  `;
  if (reviewAgain.length) {
    document.getElementById("reviewBtn").onclick = () => startDeck(reviewAgain);
  }
  document.getElementById("restartBtn").onclick = () => startDeck(allCards);
}

loadData("data.json").then(data => {
  allCards = data;
  renderStart();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
