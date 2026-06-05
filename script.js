// ===== Utils =====
function norm(s) {
  return (s || "")
    .toString().trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}
function paint(el, isOk) {
  el.classList.remove("ok", "bad");
  el.classList.add(isOk ? "ok" : "bad");
}

// ===== CRUCIGRAMA =====
// Render crossword: word data en data-cw-words como JSON: [{n, clue, answer}]
function buildCrossword(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;
  const raw = root.getAttribute("data-cw-words");
  if (!raw) return;
  const words = JSON.parse(raw);

  words.forEach(w => {
    const ansClean = norm(w.answer).replace(/\s+/g, "").toUpperCase();
    const wordDiv = document.createElement("div");
    wordDiv.className = "cw-word";
    const cellsHtml = [...ansClean]
      .map(() => `<input class="cw-cell" maxlength="1" inputmode="text">`)
      .join("");
    wordDiv.innerHTML = `
      <div class="cw-num">${w.n}</div>
      <div class="cw-clue">${w.clue}</div>
      <div class="cw-cells" data-answer="${ansClean}">${cellsHtml}</div>
    `;
    root.appendChild(wordDiv);
  });

  // auto-advance / backspace
  root.querySelectorAll(".cw-cell").forEach(cell => {
    cell.addEventListener("input", e => {
      e.target.value = e.target.value.toUpperCase();
      if (e.target.value && e.target.nextElementSibling) {
        e.target.nextElementSibling.focus();
      }
    });
    cell.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !cell.value && cell.previousElementSibling) {
        cell.previousElementSibling.focus();
        e.preventDefault();
      } else if (e.key === "ArrowLeft" && cell.previousElementSibling) {
        cell.previousElementSibling.focus();
      } else if (e.key === "ArrowRight" && cell.nextElementSibling) {
        cell.nextElementSibling.focus();
      }
    });
  });
}

function verifyCrossword(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return { total: 0, correct: 0 };
  let total = 0, correctWords = 0;
  root.querySelectorAll(".cw-cells").forEach(group => {
    const answer = group.getAttribute("data-answer");
    const cells = [...group.querySelectorAll(".cw-cell")];
    let allOk = true;
    cells.forEach((cell, i) => {
      const v = norm(cell.value).replace(/\s+/g, "").toUpperCase();
      const expected = answer[i];
      if (v === expected) {
        cell.classList.remove("bad"); cell.classList.add("ok");
      } else {
        cell.classList.remove("ok"); cell.classList.add("bad");
        allOk = false;
      }
    });
    total++;
    if (allOk) correctWords++;
  });
  return { total, correct: correctWords };
}

function resetCrossword(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;
  root.querySelectorAll(".cw-cell").forEach(c => {
    c.value = "";
    c.classList.remove("ok", "bad");
  });
}

// ===== UNIR CON FLECHAS (SVG) =====
const matchStates = {};

function initMatching(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;
  const svg = root.querySelector("svg.arrow-layer");
  const leftItems = [...root.querySelectorAll(".match-col.left .match-item")];
  const rightItems = [...root.querySelectorAll(".match-col.right .match-item")];
  const connections = new Map(); // leftId -> rightId
  let selectedLeft = null;
  let verified = false;

  function draw() {
    svg.innerHTML = "";
    const rect = svg.getBoundingClientRect();
    connections.forEach((rightId, leftId) => {
      const lEl = root.querySelector(`[data-mid="${leftId}"]`);
      const rEl = root.querySelector(`[data-mid="${rightId}"]`);
      if (!lEl || !rEl) return;
      const lr = lEl.getBoundingClientRect();
      const rr = rEl.getBoundingClientRect();
      const x1 = lr.right - rect.left;
      const y1 = lr.top + lr.height / 2 - rect.top;
      const x2 = rr.left - rect.left;
      const y2 = rr.top + rr.height / 2 - rect.top;
      const dx = Math.max(40, (x2 - x1) * 0.45);
      const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      let color = "#4f9eff";
      if (verified) {
        const expected = lEl.getAttribute("data-answer");
        color = (rightId === expected) ? "#6ee7b7" : "#f87171";
      }
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      arrow.setAttribute("d", path);
      arrow.setAttribute("stroke", color);
      arrow.setAttribute("stroke-width", "2.5");
      arrow.setAttribute("fill", "none");
      arrow.setAttribute("stroke-linecap", "round");
      svg.appendChild(arrow);
    });
  }

  function clearVisualState() {
    [...leftItems, ...rightItems].forEach(el => el.classList.remove("ok", "bad"));
    verified = false;
  }

  leftItems.forEach(item => {
    item.addEventListener("click", () => {
      clearVisualState();
      leftItems.forEach(i => i.classList.remove("selected"));
      if (selectedLeft === item.getAttribute("data-mid")) {
        selectedLeft = null;
      } else {
        item.classList.add("selected");
        selectedLeft = item.getAttribute("data-mid");
      }
      draw();
    });
  });

  rightItems.forEach(item => {
    item.addEventListener("click", () => {
      clearVisualState();
      const rid = item.getAttribute("data-mid");
      if (!selectedLeft) {
        // permitir click derecho para desconectar
        [...connections.entries()].forEach(([l, r]) => {
          if (r === rid) {
            connections.delete(l);
            root.querySelector(`[data-mid="${l}"]`).classList.remove("connected");
          }
        });
        draw();
        return;
      }
      // remover conexión previa de este izquierdo y de este derecho
      [...connections.entries()].forEach(([l, r]) => {
        if (l === selectedLeft || r === rid) {
          connections.delete(l);
          root.querySelector(`[data-mid="${l}"]`).classList.remove("connected");
        }
      });
      connections.set(selectedLeft, rid);
      root.querySelector(`[data-mid="${selectedLeft}"]`).classList.add("connected");
      root.querySelector(`[data-mid="${selectedLeft}"]`).classList.remove("selected");
      selectedLeft = null;
      draw();
    });
  });

  // redibujar en resize
  const onResize = () => draw();
  window.addEventListener("resize", onResize);

  matchStates[rootId] = {
    draw,
    verify() {
      verified = true;
      let total = 0, correct = 0;
      leftItems.forEach(el => {
        total++;
        const expected = el.getAttribute("data-answer");
        const actual = connections.get(el.getAttribute("data-mid"));
        el.classList.remove("ok", "bad");
        if (actual && actual === expected) {
          correct++;
          el.classList.add("ok");
        } else {
          el.classList.add("bad");
        }
      });
      draw();
      return { total, correct };
    },
    reset() {
      connections.clear();
      selectedLeft = null;
      verified = false;
      [...leftItems, ...rightItems].forEach(el => el.classList.remove("ok", "bad", "selected", "connected"));
      draw();
    }
  };

  // primer dibujado (vacío) + tras carga de fuentes
  setTimeout(draw, 50);
  setTimeout(draw, 300);
}

// ===== Cronologico / Texto =====
function verifyTextInputs(rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return { total: 0, correct: 0 };
  const inputs = root.querySelectorAll("[data-answer]:not(.cw-cells)");
  let total = 0, correct = 0;
  inputs.forEach(inp => {
    if (inp.tagName !== "INPUT" && inp.tagName !== "SELECT") return;
    total++;
    const valid = JSON.parse(inp.getAttribute("data-answer"));
    const v = norm(inp.value);
    const okList = (Array.isArray(valid) ? valid : [valid]).map(norm);
    const ok = okList.includes(v);
    paint(inp, ok);
    if (ok) correct++;
  });
  return { total, correct };
}

function resetTextInputs(rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.querySelectorAll("[data-answer]:not(.cw-cells)").forEach(inp => {
    if (inp.tagName !== "INPUT" && inp.tagName !== "SELECT") return;
    inp.value = "";
    inp.classList.remove("ok", "bad");
  });
}

// ===== Verificar TODO el parcial =====
function verifyExam(opts) {
  // opts = { crosswordIds: [...], matchingIds: [...], textRoot: '#exam' }
  let total = 0, correct = 0;
  (opts.crosswordIds || []).forEach(id => {
    const r = verifyCrossword(id);
    total += r.total; correct += r.correct;
  });
  (opts.matchingIds || []).forEach(id => {
    const r = matchStates[id]?.verify() || { total: 0, correct: 0 };
    total += r.total; correct += r.correct;
  });
  if (opts.textRoot) {
    const r = verifyTextInputs(opts.textRoot);
    total += r.total; correct += r.correct;
  }
  // mostrar respuestas
  if (opts.textRoot) {
    document.querySelector(opts.textRoot).querySelectorAll(".answer-box")
      .forEach(b => b.classList.add("show"));
  }
  const scoreEl = document.querySelector(opts.textRoot + " .score");
  if (scoreEl) {
    scoreEl.textContent = `${correct} / ${total} correctas`;
    scoreEl.style.color = correct === total
      ? "var(--accent-2)"
      : (correct >= total * 0.6 ? "var(--warn)" : "var(--bad)");
  }
  window.scrollTo({ top: scoreEl?.offsetTop - 200, behavior: "smooth" });
}

function resetExam(opts) {
  (opts.crosswordIds || []).forEach(id => resetCrossword(id));
  (opts.matchingIds || []).forEach(id => matchStates[id]?.reset());
  if (opts.textRoot) {
    resetTextInputs(opts.textRoot);
    document.querySelector(opts.textRoot).querySelectorAll(".answer-box")
      .forEach(b => b.classList.remove("show"));
    const scoreEl = document.querySelector(opts.textRoot + " .score");
    if (scoreEl) scoreEl.textContent = "";
  }
}

function toggleAnswers(rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.querySelectorAll(".answer-box").forEach(b => b.classList.toggle("show"));
}

// ===== nav active =====
document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("header.site nav a").forEach(a => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
});
