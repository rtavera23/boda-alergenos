/* eslint-disable no-console */
const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbw33bFNMWsLcd3fkeHtcBPWk3qoMv1nAtfDHPTWxd0fAp89U5QgvyM1rRrUGNDxsfQ6/exec";

const COURSE_LABELS = {
  primero: "Primero",
  segundo: "Segundo",
  postre: "Postre",
};

const ORIGINAL_IMAGES = {
  primero: "assets/dishes/primero-novios.jpeg",
  segundo: "assets/dishes/segundo-novios.jpeg",
  postre: "assets/dishes/postre-novios.jpeg",
};

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 6 12 6 12s6-8.5 6-12c0-3.5-2.5-6-6-6z"/><circle cx="12" cy="8" r="2.5"/></svg>`;

let menuData = null;
let dishById = {};
let guestAllergies = [];
let selections = { primero: null, segundo: null, postre: null };

const form = document.getElementById("menu-form");
const originalMenuEl = document.getElementById("original-menu");
const courseSelectionEl = document.getElementById("course-selection");
const summaryEl = document.getElementById("summary");
const statusMessage = document.getElementById("status-message");
const allergyInput = document.getElementById("allergyInput");
const allergyChipsEl = document.getElementById("allergyChips");

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDishIndex(data) {
  dishById = {};
  for (const key of ["primero", "segundo", "postre"]) {
    dishById[data.originalMenu[key].id] = data.originalMenu[key];
  }
  for (const list of Object.values(data.alternatives)) {
    for (const dish of list) {
      dishById[dish.id] = dish;
    }
  }
}

function getDishImage(dish, courseKey) {
  if (dish.image) return dish.image;
  if (ORIGINAL_IMAGES[courseKey]) return ORIGINAL_IMAGES[courseKey];
  if (ORIGINAL_IMAGES[dish.category]) return ORIGINAL_IMAGES[dish.category];
  return null;
}

function renderDishMedia(dish, courseKey) {
  const src = getDishImage(dish, courseKey);
  if (src) {
    return `<div class="dish-media"><img src="${escapeHtml(src)}" alt="" loading="lazy"></div>`;
  }
  return `<div class="dish-media dish-media--placeholder" aria-hidden="true">${PLACEHOLDER_SVG}</div>`;
}

function renderChips(allergens, traces) {
  return `
    <div class="dish-meta">
      <div class="dish-meta__group">
        <span class="chip-label">Alérgenos</span>
        <div class="chips">
          ${
            allergens.length
              ? allergens.map((a) => `<span class="chip chip--allergen">${escapeHtml(a)}</span>`).join("")
              : `<span class="chip chip--none">Ninguno declarado</span>`
          }
        </div>
      </div>
      <div class="dish-meta__group">
        <span class="chip-label">Trazas</span>
        <div class="chips">
          ${
            traces.length
              ? traces.map((t) => `<span class="chip chip--trace">${escapeHtml(t)}</span>`).join("")
              : `<span class="chip chip--none">Ninguna declarada</span>`
          }
        </div>
      </div>
    </div>`;
}

function renderIngredientsDetails(dish) {
  const ingredients = dish.ingredients.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
  return `
    <details class="ingredients-details">
      <summary>Ver todos los ingredientes (${dish.ingredients.length})</summary>
      <ul class="ingredients-list">${ingredients}</ul>
    </details>`;
}


function renderOriginalMenu() {
  originalMenuEl.innerHTML = ["primero", "segundo", "postre"]
    .map((key) => {
      const dish = menuData.originalMenu[key];
      return `
        <article class="menu-showcase-card">
          <span class="menu-showcase-card__course">${COURSE_LABELS[key]}</span>
          ${renderDishMedia(dish, key)}
          <div class="menu-showcase-card__body">
            <span class="dish-type-badge dish-type-badge--original">Menú original</span>
            <h3 class="menu-showcase-card__name">${escapeHtml(dish.name)}</h3>
            ${renderChips(dish.allergens, dish.traces)}
            ${renderIngredientsDetails(dish)}
          </div>
        </article>`;
    })
    .join("");
}

function splitAllergyText(text) {
  return text
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function allergyExists(display) {
  const norm = normalize(display);
  return guestAllergies.some((item) => normalize(item) === norm);
}

function renderAllergyChipList() {
  allergyChipsEl.innerHTML = guestAllergies
    .map(
      (allergy, index) => `
      <span class="allergy-chip" role="listitem">
        <span>${escapeHtml(allergy)}</span>
        <button type="button" class="allergy-chip__remove" data-index="${index}" aria-label="Quitar ${escapeHtml(allergy)}">×</button>
      </span>`
    )
    .join("");

  allergyChipsEl.querySelectorAll(".allergy-chip__remove").forEach((btn) => {
    btn.addEventListener("click", () => removeAllergy(Number(btn.dataset.index)));
  });
}

function addAllergiesFromText(text) {
  const parts = splitAllergyText(text);
  let added = false;
  for (const part of parts) {
    if (!allergyExists(part)) {
      guestAllergies.push(part);
      added = true;
    }
  }
  if (added) {
    renderAllergyChipList();
    updateSummary();
  }
}

function addCurrentInputAsChip() {
  const value = allergyInput.value.trim();
  if (!value) return;
  addAllergiesFromText(value);
  allergyInput.value = "";
}

function removeAllergy(index) {
  guestAllergies.splice(index, 1);
  renderAllergyChipList();
  updateSummary();
}

function hasValidAllergyInput() {
  return guestAllergies.length > 0 || allergyInput.value.trim().length > 0;
}

function renderDishCard(dish, courseKey, isSelected) {
  const isOriginal = dish.isOriginal;

  return `
    <div class="dish-card${isSelected ? " is-selected" : ""}"
      data-course="${courseKey}"
      data-dish-id="${escapeHtml(dish.id)}"
      role="radio"
      aria-checked="${isSelected}"
      tabindex="${isSelected ? "0" : "-1"}"
      aria-label="${escapeHtml(dish.name)}">
      <div class="dish-card__select-area">
        <span class="dish-card__check" aria-hidden="true">✓</span>
        ${renderDishMedia(dish, courseKey)}
        <div class="dish-card__body">
          <span class="dish-type-badge dish-type-badge--${isOriginal ? "original" : "alt"}">
            ${isOriginal ? "Menú original" : "Alternativa"}
          </span>
          <h4 class="dish-card__name">${escapeHtml(dish.name)}</h4>
          ${renderChips(dish.allergens, dish.traces)}
        </div>
      </div>
      ${renderIngredientsDetails(dish)}
    </div>`;
}

function validateCourseOptions(courseKey, optionIds) {
  const seen = new Set();
  for (const id of optionIds) {
    if (seen.has(id)) {
      console.warn(`[menu] Duplicate dish ID "${id}" in course "${courseKey}"`);
    }
    seen.add(id);

    const dish = dishById[id];
    if (!dish) {
      console.warn(`[menu] Missing dish ID "${id}" for course "${courseKey}"`);
      continue;
    }
    if (dish.category !== courseKey) {
      console.warn(
        `[menu] Dish "${id}" belongs to "${dish.category}" but is listed under "${courseKey}"`
      );
    }
  }
}

function renderCourseSelection() {
  courseSelectionEl.innerHTML = ["primero", "segundo", "postre"]
    .map((courseKey) => {
      const optionIds = menuData.courses[courseKey].options;
      validateCourseOptions(courseKey, optionIds);

      const uniqueIds = [];
      const seen = new Set();
      for (const id of optionIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        uniqueIds.push(id);
      }

      const cards = uniqueIds
        .map((id) => {
          const dish = dishById[id];
          if (!dish) return "";
          return renderDishCard(dish, courseKey, selections[courseKey] === id);
        })
        .filter(Boolean)
        .join("");

      return `
        <section class="course-section" aria-labelledby="course-heading-${courseKey}">
          <header class="course-section__header">
            <h3 class="course-section__heading" id="course-heading-${courseKey}">${COURSE_LABELS[courseKey]}</h3>
            <p class="course-section__hint">Elige una opción para este plato</p>
          </header>
          <div class="course-section__grid dish-grid" role="radiogroup" aria-labelledby="course-heading-${courseKey}">
            ${cards}
          </div>
        </section>`;
    })
    .join("");

  courseSelectionEl.querySelectorAll(".dish-card").forEach((card) => {
    card.querySelector(".dish-card__select-area")?.addEventListener("click", () => {
      selectDish(card.dataset.course, card.dataset.dishId);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.target.closest(".ingredients-details")) return;
        e.preventDefault();
        selectDish(card.dataset.course, card.dataset.dishId);
      }
    });
    card.querySelector(".ingredients-details")?.addEventListener("click", (e) => e.stopPropagation());
    card.querySelector(".ingredients-details summary")?.addEventListener("click", (e) => e.stopPropagation());
  });
}

function selectDish(courseKey, dishId) {
  selections[courseKey] = dishId;
  renderCourseSelection();
  updateSummary();
}

function renderSummaryAllergyChips() {
  if (!guestAllergies.length) return "—";
  return `<span class="summary-chips">${guestAllergies
    .map((allergy) => `<span class="summary-chip">${escapeHtml(allergy)}</span>`)
    .join("")}</span>`;
}

function updateSummary() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();

  const primero = dishById[selections.primero];
  const segundo = dishById[selections.segundo];
  const postre = dishById[selections.postre];

  summaryEl.innerHTML = `
    <div class="summary-row"><dt>Nombre completo</dt><dd>${escapeHtml(firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || "—")}</dd></div>
    <div class="summary-row summary-row--full"><dt>Alergias / intolerancias</dt><dd>${renderSummaryAllergyChips()}</dd></div>
    <div class="summary-row"><dt>Primero elegido</dt><dd>${escapeHtml(primero?.name || "—")}</dd></div>
    <div class="summary-row"><dt>Segundo elegido</dt><dd>${escapeHtml(segundo?.name || "—")}</dd></div>
    <div class="summary-row"><dt>Postre elegido</dt><dd>${escapeHtml(postre?.name || "—")}</dd></div>
  `;
}

function validateForm() {
  addCurrentInputAsChip();
  const errors = [];
  if (!document.getElementById("firstName").value.trim()) errors.push("El nombre es obligatorio.");
  if (!document.getElementById("lastName").value.trim()) errors.push("Los apellidos son obligatorios.");
  if (!hasValidAllergyInput()) errors.push("Indica al menos una alergia o intolerancia.");
  for (const key of ["primero", "segundo", "postre"]) {
    if (!selections[key]) errors.push(`Selecciona un plato para ${COURSE_LABELS[key].toLowerCase()}.`);
  }
  return errors;
}

function generateGroupId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `grp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildPayload() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const primero = dishById[selections.primero];
  const segundo = dishById[selections.segundo];
  const postre = dishById[selections.postre];

  return {
    submittedAt: new Date().toISOString(),
    groupId: generateGroupId(),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    table: document.getElementById("table").value.trim(),
    allergies: [...guestAllergies],
    selectedFirstId: primero.id,
    selectedFirstName: primero.name,
    selectedSecondId: segundo.id,
    selectedSecondName: segundo.name,
    selectedDessertId: postre.id,
    selectedDessertName: postre.name,
    comments: document.getElementById("comments").value.trim(),
  };
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status-message" + (type ? ` is-${type}` : "");
}

async function submitPayload(payload) {
  if (!FORM_ENDPOINT || FORM_ENDPOINT.includes("PASTE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    console.log("Modo prueba payload:", payload);
    return { ok: true, testMode: true };
  }

  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      const sent = navigator.sendBeacon(FORM_ENDPOINT, blob);

      if (sent) {
        return { ok: true };
      }
    }

    await fetch(FORM_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body,
    });

    return { ok: true };
  } catch (err) {
    console.error("Submit error:", err);
    return {
      ok: false,
      error: "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.",
    };
  }
}

async function submitForm(e) {
  e.preventDefault();

  if (document.getElementById("website").value.trim()) return;

  const errors = validateForm();
  if (errors.length) {
    setStatus(errors[0], "error");
    return;
  }

  const payload = buildPayload();
  const result = await submitPayload(payload);

  if (result.testMode) {
    setStatus("Modo prueba: selección preparada correctamente.", "success");
    return;
  }

  if (result.ok) {
    setStatus("Gracias, hemos recibido tu selección. La revisaremos y la trasladaremos a la Masía.", "success");
    return;
  }

  setStatus(result.error || "No se pudo enviar. Inténtalo de nuevo o contacta con los novios.", "error");
}

function bindEvents() {
  allergyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCurrentInputAsChip();
    }
  });

  allergyInput.addEventListener("blur", () => {
    if (allergyInput.value.includes(",") || allergyInput.value.includes(";")) {
      addCurrentInputAsChip();
    }
  });

  allergyInput.addEventListener("input", () => {
    if (/[,;]/.test(allergyInput.value)) addCurrentInputAsChip();
    updateSummary();
  });

  ["firstName", "lastName"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateSummary);
  });

  form.addEventListener("submit", submitForm);
}

async function init() {
  try {
    const res = await fetch("data/menu.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    menuData = await res.json();
    buildDishIndex(menuData);

    selections = {
      primero: menuData.courses.primero.original,
      segundo: menuData.courses.segundo.original,
      postre: menuData.courses.postre.original,
    };

    renderOriginalMenu();
    renderCourseSelection();
    renderAllergyChipList();
    updateSummary();
    bindEvents();
  } catch (err) {
    console.error(err);
    originalMenuEl.innerHTML = `<p class="loading">No se pudo cargar el menú. Recarga la página.</p>`;
  }
}

init();
