const viewport = document.querySelector(".hero__slides");
const track = viewport.querySelector(".hero__track");

const originals = [...track.children];
const total = originals.length;

const DELAY = 10000;
let index = 1;
let timer;

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

function setPosition() {
  track.style.transform = `translateX(${-index * 100}%)`;
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
  index = newIndex;
  setPosition();
  activate();
}

function scheduleNext() {
  clearTimeout(timer);
  timer = setTimeout(() => goTo(index + 1), DELAY);
}

track.addEventListener("transitionend", (event) => {
  if (event.target !== track) return;
  if (index === 0) jumpTo(total);
  if (index === total + 1) jumpTo(1);
  deactivateOthers();
  scheduleNext();
});

jumpTo(1);
activate();
scheduleNext();
