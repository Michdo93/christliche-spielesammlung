const app = document.getElementById("app");
let all = [];
let order = [];
let index = 0;

function renderDevotion() {
  const d = all[order[index]];
  app.innerHTML = `
    <div class="game-toolbar">
      <span class="pill">${index + 1} / ${all.length}</span>
      <button class="btn secondary" id="randomBtn">🎲 Zufällige Andacht</button>
    </div>
    <h2 class="devotion-title">${d.title}</h2>
    <p class="devotion-text">${d.text.replace(/\n/g, "<br>")}</p>
    <div style="display:flex; gap:12px; margin-top:22px; flex-wrap:wrap;">
      <button class="btn secondary" id="prevBtn">← Vorherige</button>
      <button class="btn primary" id="nextBtn">Nächste →</button>
    </div>
  `;
  document.getElementById("randomBtn").onclick = () => {
    index = Math.floor(Math.random() * all.length);
    renderDevotion();
  };
  document.getElementById("prevBtn").onclick = () => {
    index = (index - 1 + all.length) % all.length;
    renderDevotion();
  };
  document.getElementById("nextBtn").onclick = () => {
    index = (index + 1) % all.length;
    renderDevotion();
  };
}

loadData("data.json").then(data => {
  all = data;
  order = all.map((_, i) => i);
  index = 0;
  renderDevotion();
}).catch(err => {
  app.innerHTML = `<p>Fehler beim Laden: ${err.message}</p>`;
});
