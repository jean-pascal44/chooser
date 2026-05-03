(function () {
  "use strict";

  const MIN_FINGERS = 2;
  const STABILITY_MS = 5000;

  const playArea = document.getElementById("play-area");
  const markersLayer = document.getElementById("markers");
  const hint = document.getElementById("hint");
  const statusEl = document.getElementById("status");
  const flashOverlay = document.getElementById("flash-overlay");
  const btnReset = document.getElementById("btn-reset");

  /** @type {Map<number, { el: HTMLElement, color: string }>} */
  const pointers = new Map();

  let roundLocked = false;
  /** @type {number | null} */
  let winnerPointerId = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let stabilityTimerId = null;

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

  function clearStabilityTimer() {
    if (stabilityTimerId !== null) {
      clearTimeout(stabilityTimerId);
      stabilityTimerId = null;
    }
  }

  function rescheduleStabilityTimer() {
    clearStabilityTimer();
    if (roundLocked) return;
    const count = pointers.size;
    if (count < MIN_FINGERS) return;
    const snapshot = count;
    stabilityTimerId = setTimeout(function () {
      stabilityTimerId = null;
      if (roundLocked) return;
      if (pointers.size !== snapshot || pointers.size < MIN_FINGERS) return;
      runDrawWithFlash();
    }, STABILITY_MS);
  }

  function runFlash() {
    flashOverlay.classList.remove("is-active");
    void flashOverlay.offsetWidth;
    flashOverlay.classList.add("is-active");
  }

  function onFlashAnimationEnd(e) {
    if (e.animationName !== "screen-flash") return;
    flashOverlay.classList.remove("is-active");
  }

  flashOverlay.addEventListener("animationend", onFlashAnimationEnd);

  function placeMarker(el, clientX, clientY) {
    const rect = playArea.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    el.style.left = x + "px";
    el.style.top = y + "px";
  }

  function statusForCount() {
    const n = pointers.size;
    if (n === 0) return "";
    if (n < MIN_FINGERS)
      return "Encore " + (MIN_FINGERS - n) + " doigt(s) minimum.";
    return (
      n +
      " doigt(s) — gardez ce nombre pendant " +
      STABILITY_MS / 1000 +
      " s pour lancer le tirage."
    );
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

    setStatus(statusForCount());
    updateHint();
    rescheduleStabilityTimer();
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

    setStatus(statusForCount());
    updateHint();
    rescheduleStabilityTimer();
  }

  function randomIndex(n) {
    if (n <= 0) return 0;
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
  }

  function drawWinner() {
    if (pointers.size < MIN_FINGERS || roundLocked) return;

    clearStabilityTimer();
    roundLocked = true;
    winnerPointerId = null;

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

  function runDrawWithFlash() {
    if (pointers.size < MIN_FINGERS || roundLocked) return;
    clearStabilityTimer();
    runFlash();
    drawWinner();
  }

  function resetRound() {
    clearStabilityTimer();
    roundLocked = false;
    winnerPointerId = null;
    pointers.clear();
    markersLayer.replaceChildren();
    flashOverlay.classList.remove("is-active");
    setStatus("");
    updateHint();
  }

  playArea.addEventListener("pointerdown", onPointerDown, { passive: false });
  playArea.addEventListener("pointermove", onPointerMove);
  playArea.addEventListener("pointerup", onPointerUp);
  playArea.addEventListener("pointercancel", onPointerUp);
  btnReset.addEventListener("click", resetRound);
})();
