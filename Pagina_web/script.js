const viewport = document.querySelector(".hero__slides");
const track = viewport.querySelector(".hero__track");

const originals = [...track.children];
const total = originals.length;

const DELAY = 10000;
const THRESHOLD = 20;

let index = 1;
let timer;
let autoplayEnabled = true;
let isMoving = false;
let isDragging = false;
let startX = 0;
let startOffset = 0;
let moved = 0;
let dragPercent = 0;

// Numera cada título para poder reconocer a sus copias
originals.forEach((slide, i) => {
  slide.dataset.slide = i;
});

// Copias de los extremos para el bucle infinito
const firstClone = originals[0].cloneNode(true);
const lastClone = originals[total - 1].cloneNode(true);
firstClone.setAttribute("aria-hidden", "true");
lastClone.setAttribute("aria-hidden", "true");
track.append(firstClone);
track.prepend(lastClone);

// Qué título real corresponde a la posición actual
function currentSlide() {
  return (index - 1 + total) % total;
}

// offset: desplazamiento extra (en %) mientras se arrastra
function setPosition(offset = 0) {
  track.style.transform = `translateX(${-index * 100 + offset}%)`;
}

function activate() {
  track
    .querySelectorAll(`[data-slide="${currentSlide()}"]`)
    .forEach((slide) => slide.classList.add("is-active"));
}

function deactivateOthers() {
  track.querySelectorAll(".is-active").forEach((slide) => {
    if (Number(slide.dataset.slide) !== currentSlide()) {
      slide.classList.remove("is-active");
    }
  });
}

// Salto instantáneo, sin animación
function jumpTo(newIndex) {
  track.classList.add("is-jumping");
  index = newIndex;
  setPosition();
  void track.offsetWidth;
  track.classList.remove("is-jumping");
}

// Movimiento con animación
function goTo(newIndex) {
  isMoving = true;
  index = newIndex;
  setPosition();
  activate();
}

function scheduleNext() {
  clearTimeout(timer);
  if (!autoplayEnabled) return;
  timer = setTimeout(() => goTo(index + 1), DELAY);
}

track.addEventListener("transitionend", (event) => {
  if (event.target !== track) return;
  if (index === 0) jumpTo(total);
  if (index === total + 1) jumpTo(1);
  deactivateOthers();
  isMoving = false;
  scheduleNext();
});

// ---------- Arrastre con el mouse ----------

viewport.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;

  isDragging = true;
  startX = event.clientX;
  startOffset = 0;
  moved = 0;
  clearTimeout(timer);
  viewport.setPointerCapture(event.pointerId);

  // Se agarra el carrusel en pleno movimiento: se congela donde va
  if (isMoving) {
    const width = viewport.getBoundingClientRect().width;
    const currentX = new DOMMatrixReadOnly(getComputedStyle(track).transform)
      .m41;
    const currentPercent = (currentX / width) * 100;
    const nearest = Math.round(-currentPercent / 100);

    startOffset = currentPercent + nearest * 100;
    index = nearest;
    if (index === 0) index = total;
    if (index === total + 1) index = 1;

    isMoving = false;
    track.classList.add("is-dragging");
    setPosition(startOffset);
  }

  dragPercent = startOffset;
});

viewport.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  const width = viewport.getBoundingClientRect().width;
  moved = ((event.clientX - startX) / width) * 100;
  if (moved !== 0) {
    track.classList.add("is-dragging");
  }
  dragPercent = startOffset + moved;
  setPosition(dragPercent);
});

function endDrag() {
  if (!isDragging) return;
  isDragging = false;
  track.classList.remove("is-dragging");

  // Solo fue un clic sobre el carrusel quieto: se reanuda el autoplay
  if (moved === 0 && startOffset === 0) {
    scheduleNext();
    return;
  }

  // Posición actual medida en "títulos" (por ejemplo, 2.25)
  const position = index - dragPercent / 100;
  const ratio = THRESHOLD / 100;
  let target;

  if (moved < 0) {
    target =
      position - Math.floor(position) >= ratio
        ? Math.ceil(position)
        : Math.floor(position);
  } else if (moved > 0) {
    target =
      Math.ceil(position) - position >= ratio
        ? Math.floor(position)
        : Math.ceil(position);
  } else {
    target = Math.round(position);
  }

  goTo(Math.max(0, Math.min(total + 1, target)));
}

viewport.addEventListener("pointerup", endDrag);
viewport.addEventListener("pointercancel", endDrag);

jumpTo(1);
activate();
scheduleNext();

document.addEventListener("DOMContentLoaded", () => {
  if (window.UnicornStudio) {
    UnicornStudio.init();
  }
});

/* -------- NAVBAR FIJO AL HACER SCROLL -------- */

document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".header__main-nav");

  if (!navbar) return;

  // Conserva el espacio del navbar cuando pasa a fixed.
  const espacio = document.createElement("div");
  navbar.after(espacio);

  const fuenteBase = parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );

  let alturaOriginal = navbar.getBoundingClientRect().height;
  let posicionOriginal = navbar.getBoundingClientRect().top + scrollY;

  function actualizarNavbar() {
    const fijar = scrollY >= posicionOriginal;

    navbar.classList.toggle("is-fixed", fijar);

    espacio.style.height = fijar ? `${alturaOriginal / fuenteBase}rem` : "0";
  }

  window.addEventListener("scroll", actualizarNavbar, {
    passive: true,
  });

  window.addEventListener("resize", () => {
    navbar.classList.remove("is-fixed");
    espacio.style.height = "0";

    alturaOriginal = navbar.getBoundingClientRect().height;
    posicionOriginal = navbar.getBoundingClientRect().top + scrollY;

    actualizarNavbar();
  });

  actualizarNavbar();
});
