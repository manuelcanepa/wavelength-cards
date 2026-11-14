(() => {
  "use strict";

  const STORAGE_KEY = "wavelength-deck";

  const el = {
    card: document.getElementById("card"),
    left: document.getElementById("left"),
    right: document.getElementById("right"),
    counter: document.getElementById("counter"),
    draw: document.getElementById("draw"),
    flip: document.getElementById("flip"),
    shuffle: document.getElementById("shuffle"),
  };

  let cards = [];
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
    if (remaining() <= 0) return;
    state.position += 1;
    state.flipped = false;
    save();
    render(true);
  }

  function reshuffle() {
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
    const card = currentCard();
    const total = cards.length;
    const left = remaining();

    el.card.classList.remove("flip-in", "empty", "done");

    if (!card) {
      el.card.classList.add("empty");
      el.left.textContent = "Tocá para sacar una carta";
      el.right.textContent = "";
    } else {
      const [a, b] = state.flipped ? [card.right, card.left] : [card.left, card.right];
      el.left.textContent = a;
      el.right.textContent = b;
      el.card.setAttribute("aria-label", `${a} contra ${b}. Tocá para sacar otra carta`);
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

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
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
      cards = data.filter((c) => c && c.left && c.right);
      if (cards.length === 0) throw new Error("cards.json no tiene cartas válidas");
      state = load(hashCards(cards));
      if (!state) newDeck();
      render(false);
    })
    .catch((err) => {
      el.counter.textContent = `No se pudieron cargar las cartas: ${err.message}`;
      el.draw.disabled = el.shuffle.disabled = el.flip.disabled = true;
    });
})();
