(function () {
  "use strict";

  const MIN_FINGERS = 2;

  const playArea = document.getElementById("play-area");
  const markersLayer = document.getElementById("markers");
  const hint = document.getElementById("hint");
  const statusEl = document.getElementById("status");
  const btnDraw = document.getElementById("btn-draw");
  const btnReset = document.getElementById("btn-reset");

  /** @type {Map<number, { el: HTMLElement, color: string }>} */
  const pointers = new Map();

  let roundLocked = false;
  /** @type {number | null} */
  let winnerPointerId = null;

  const COLORS = [
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#eab308",
    "#a855f7",
    "#f97316",
    "#14b8a6",
    "#ec4899",
  ];

  function colorForId(id) {
    return COLORS[Math.abs(id) % COLORS.length];
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function updateHint() {
    hint.classList.toggle("is-hidden", pointers.size > 0);
  }

  function syncDrawButton() {
    btnDraw.disabled = roundLocked || pointers.size < MIN_FINGERS;
  }

  function placeMarker(el, clientX, clientY) {
    const rect = playArea.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    el.style.left = x + "px";
    el.style.top = y + "px";
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (roundLocked) return;

    e.preventDefault();
    try {
      playArea.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore if not supported */
    }

    const el = document.createElement("div");
    el.className = "marker";
    const color = colorForId(e.pointerId);
    el.style.background = color + "cc";

    markersLayer.appendChild(el);
    placeMarker(el, e.clientX, e.clientY);
    pointers.set(e.pointerId, { el, color });

    setStatus(
      pointers.size < MIN_FINGERS
        ? "Encore " + (MIN_FINGERS - pointers.size) + " doigt(s) minimum."
        : pointers.size + " doigt(s) — vous pouvez tirer au sort."
    );
    updateHint();
    syncDrawButton();
  }

  function onPointerMove(e) {
    const entry = pointers.get(e.pointerId);
    if (!entry || roundLocked) return;
    placeMarker(entry.el, e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    const entry = pointers.get(e.pointerId);
    if (!entry) return;
    try {
      playArea.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (roundLocked) {
      pointers.delete(e.pointerId);
      if (e.pointerId !== winnerPointerId) {
        entry.el.remove();
      }
      return;
    }

    entry.el.remove();
    pointers.delete(e.pointerId);

    if (pointers.size === 0) setStatus("");
    else if (pointers.size < MIN_FINGERS)
      setStatus("Encore " + (MIN_FINGERS - pointers.size) + " doigt(s) minimum.");
    else setStatus(pointers.size + " doigt(s) — vous pouvez tirer au sort.");

    updateHint();
    syncDrawButton();
  }

  function randomIndex(n) {
    if (n <= 0) return 0;
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
  }

  function drawWinner() {
    if (pointers.size < MIN_FINGERS || roundLocked) return;

    roundLocked = true;
    winnerPointerId = null;
    syncDrawButton();

    const ids = Array.from(pointers.keys());
    const winIdx = randomIndex(ids.length);
    const winnerId = ids[winIdx];
    winnerPointerId = winnerId;

    pointers.forEach(function (entry, id) {
      if (id === winnerId) {
        entry.el.classList.add("is-winner");
      } else {
        entry.el.classList.add("is-loser");
      }
    });

    setStatus("Gagnant désigné !");
    if (typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch (_) {}
    }
  }

  function resetRound() {
    roundLocked = false;
    winnerPointerId = null;
    pointers.clear();
    markersLayer.replaceChildren();
    setStatus("");
    updateHint();
    syncDrawButton();
  }

  playArea.addEventListener("pointerdown", onPointerDown, { passive: false });
  playArea.addEventListener("pointermove", onPointerMove);
  playArea.addEventListener("pointerup", onPointerUp);
  playArea.addEventListener("pointercancel", onPointerUp);
  btnDraw.addEventListener("click", drawWinner);
  btnReset.addEventListener("click", resetRound);
})();
