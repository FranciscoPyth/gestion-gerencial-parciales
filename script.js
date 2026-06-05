// Normaliza texto para comparación tolerante (sin tildes, sin mayúsculas, sin espacios extra)
function norm(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

// Verifica una respuesta de texto (input). Acepta array de respuestas válidas.
function checkText(input, valid) {
  const v = norm(input.value);
  const okList = Array.isArray(valid) ? valid.map(norm) : [norm(valid)];
  return okList.includes(v);
}

// Aplica clases ok/bad al elemento
function paint(el, isOk) {
  el.classList.remove("ok", "bad");
  el.classList.add(isOk ? "ok" : "bad");
}

// Verifica todos los inputs con data-answer dentro de un contenedor
function verifyAll(rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  const inputs = root.querySelectorAll("[data-answer]");
  let correct = 0;
  let total = inputs.length;
  inputs.forEach(inp => {
    const valid = JSON.parse(inp.getAttribute("data-answer"));
    const ok = checkText(inp, valid);
    paint(inp, ok);
    if (ok) correct++;
  });
  const scoreEl = root.querySelector(".score");
  if (scoreEl) {
    scoreEl.textContent = `${correct} / ${total} correctas`;
    scoreEl.style.color = correct === total ? "var(--accent-2)" : (correct >= total * 0.6 ? "var(--warn)" : "var(--bad)");
  }
  // mostrar respuestas tras verificar
  root.querySelectorAll(".answer-box").forEach(b => b.classList.add("show"));
}

// Limpia inputs y feedback
function resetAll(rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.querySelectorAll("[data-answer]").forEach(inp => {
    inp.value = "";
    inp.classList.remove("ok", "bad");
  });
  root.querySelectorAll(".answer-box").forEach(b => b.classList.remove("show"));
  const scoreEl = root.querySelector(".score");
  if (scoreEl) scoreEl.textContent = "";
}

// Toggle solo respuestas (sin verificar)
function toggleAnswers(rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;
  root.querySelectorAll(".answer-box").forEach(b => b.classList.toggle("show"));
}

// Marca el link activo en el header
document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("header.site nav a").forEach(a => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
});
