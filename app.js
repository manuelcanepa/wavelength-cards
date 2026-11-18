(() => {
  "use strict";

  const STORAGE_KEY = "wavelength-deck";
  const CATEGORIES_KEY = "wavelength-categories";

  const el = {
    card: document.getElementById("card"),
    left: document.getElementById("left"),
    right: document.getElementById("right"),
    counter: document.getElementById("counter"),
    draw: document.getElementById("draw"),
    flip: document.getElementById("flip"),
    shuffle: document.getElementById("shuffle"),
    category: document.getElementById("category"),
    chips: document.getElementById("chips"),
    catSummary: document.getElementById("cat-summary"),
    catAll: document.getElementById("cat-all"),
    catNone: document.getElementById("cat-none"),
  };

  let categories = []; // [{ id, name, emoji, default, cards }]
  let selected = new Set();
  let cards = []; // cartas de las categorías elegidas: { left, right, cat }
  // state: { order: number[], position: number, hash: string, flipped: boolean }
  let state = null;

  // --- Utilidades ---------------------------------------------------------

  function hashCards(list) {
    // Hash simple (djb2) del contenido: si cards.json cambia, se rebaraja.
    const str = JSON.stringify(list);
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return `${list.length}-${(h >>> 0).toString(36)}`;
  }

  function randomInt(max) {
    // Entero uniforme en [0, max) usando crypto si está disponible.
    if (window.crypto && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / max) * max;
      do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
      return buf[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function shuffled(n) {
    // Fisher–Yates sobre los índices 0..n-1
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* sin persistencia */ }
  }

  function load(hash) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (
        saved && saved.hash === hash &&
        Array.isArray(saved.order) && saved.order.length === cards.length &&
        Number.isInteger(saved.position) && saved.position >= 0 && saved.position <= cards.length
      ) {
        return saved;
      }
    } catch (_) { /* estado inválido o storage bloqueado */ }
    return null;
  }

  // --- Categorías -----------------------------------------------------------

  function normalize(data) {
    // Compatibilidad: un array plano de cartas es una sola categoría.
    if (Array.isArray(data) && data.length && !Array.isArray(data[0].cards)) {
      data = [{ id: "general", name: "General", emoji: "🃏", cards: data }];
    }
    return data
      .filter((c) => c && c.id && Array.isArray(c.cards))
      .map((c) => ({ ...c, cards: c.cards.filter((x) => x && x.left && x.right) }))
      .filter((c) => c.cards.length > 0);
  }

  function loadSelection() {
    try {
      const saved = JSON.parse(localStorage.getItem(CATEGORIES_KEY));
      if (Array.isArray(saved)) return new Set(saved.filter((id) => categories.some((c) => c.id === id)));
    } catch (_) { /* sin selección guardada */ }
    return new Set(categories.filter((c) => c.default !== false).map((c) => c.id));
  }

  function saveSelection() {
    try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify([...selected])); } catch (_) { /* sin persistencia */ }
  }

  function buildCards() {
    cards = categories
      .filter((c) => selected.has(c.id))
      .flatMap((c) => c.cards.map((x) => ({ left: x.left, right: x.right, cat: `${c.emoji} ${c.name}` })));
  }

  function applySelection() {
    saveSelection();
    buildCards();
    state = cards.length ? load(hashCards(cards)) || null : null;
    if (cards.length && !state) newDeck();
    renderChips();
    render(false);
  }

  function renderChips() {
    el.chips.replaceChildren(...categories.map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("aria-pressed", String(selected.has(c.id)));
      b.textContent = `${c.emoji} ${c.name} (${c.cards.length})`;
      b.addEventListener("click", () => {
        if (selected.has(c.id)) selected.delete(c.id); else selected.add(c.id);
        applySelection();
      });
      return b;
    }));
    el.catSummary.textContent = `Categorías (${selected.size}/${categories.length})`;
  }

  // --- Mazo -----------------------------------------------------------------

  function newDeck() {
    state = { order: shuffled(cards.length), position: 0, hash: hashCards(cards), flipped: false };
    save();
  }

  function currentCard() {
    if (!state || state.position === 0) return null;
    return cards[state.order[state.position - 1]];
  }

  function remaining() {
    return cards.length - state.position;
  }

  function drawCard() {
    if (!state || remaining() <= 0) return;
    state.position += 1;
    state.flipped = false;
    save();
    render(true);
  }

  function reshuffle() {
    if (!state) return;
    const inProgress = state.position > 0 && remaining() > 0;
    if (inProgress && !confirm(`Quedan ${remaining()} cartas. ¿Barajar de nuevo todo el mazo?`)) return;
    newDeck();
    render(false);
  }

  function toggleFlip() {
    if (!currentCard()) return;
    state.flipped = !state.flipped;
    save();
    render(true);
  }

  // --- Render ---------------------------------------------------------------

  function render(animate) {
    el.card.classList.remove("flip-in", "empty", "done");

    if (!state) {
      el.card.classList.add("empty");
      el.left.textContent = "Elegí al menos una categoría";
      el.right.textContent = el.category.textContent = "";
      el.counter.textContent = "Sin categorías elegidas";
      el.draw.disabled = el.flip.disabled = el.shuffle.disabled = true;
      return;
    }
    el.shuffle.disabled = false;

    const card = currentCard();
    const total = cards.length;
    const left = remaining();

    if (!card) {
      el.card.classList.add("empty");
      el.left.textContent = "Tocá para sacar una carta";
      el.right.textContent = el.category.textContent = "";
    } else {
      el.category.textContent = card.cat;
      const [a, b] = state.flipped ? [card.right, card.left] : [card.left, card.right];
      el.left.textContent = a;
      el.right.textContent = b;
      el.card.setAttribute("aria-label", `${card.cat}: ${a} contra ${b}. Tocá para sacar otra carta`);
    }

    if (card && left === 0) {
      el.counter.textContent = `Última carta (${total} de ${total}) — no quedan cartas, barajá de nuevo`;
    } else if (card) {
      el.counter.textContent = `Carta ${state.position} de ${total} · quedan ${left}`;
    } else {
      el.counter.textContent = `Mazo barajado · ${total} cartas`;
    }

    el.draw.disabled = left === 0;
    el.draw.textContent = left === 0 ? "Mazo agotado" : "Sacar carta";
    el.flip.disabled = !card;

    if (animate) {
      void el.card.offsetWidth; // reinicia la animación
      el.card.classList.add("flip-in");
    }
  }

  // --- Eventos --------------------------------------------------------------

  el.draw.addEventListener("click", drawCard);
  el.card.addEventListener("click", drawCard);
  el.flip.addEventListener("click", toggleFlip);
  el.shuffle.addEventListener("click", reshuffle);
  el.catAll.addEventListener("click", () => { selected = new Set(categories.map((c) => c.id)); applySelection(); });
  el.catNone.addEventListener("click", () => { selected = new Set(); applySelection(); });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest(".categories")) return; // no robar teclas a los chips
    if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      drawCard();
    } else if (e.key === "b" || e.key === "B") {
      reshuffle();
    }
  });

  // --- Inicio ---------------------------------------------------------------

  fetch("cards.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      categories = normalize(data);
      if (categories.length === 0) throw new Error("cards.json no tiene cartas válidas");
      selected = loadSelection();
      applySelection();
    })
    .catch((err) => {
      el.counter.textContent = `No se pudieron cargar las cartas: ${err.message}`;
      el.draw.disabled = el.shuffle.disabled = el.flip.disabled = true;
    });
})();
