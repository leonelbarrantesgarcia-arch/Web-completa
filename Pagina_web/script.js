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

  let alturaOriginal = 0;
  let posicionOriginal = 0;

  // Mide el navbar sin fijar (alto + margen superior)
  function medirNavbar() {
    navbar.classList.remove("is-fixed");
    espacio.style.height = "0";

    const margenSuperior = parseFloat(getComputedStyle(navbar).marginTop);

    alturaOriginal = navbar.getBoundingClientRect().height + margenSuperior;
    posicionOriginal = navbar.getBoundingClientRect().top + scrollY;
  }

  function actualizarNavbar() {
    const fijar = scrollY >= posicionOriginal;

    navbar.classList.toggle("is-fixed", fijar);

    espacio.style.height = fijar ? `${alturaOriginal / fuenteBase}rem` : "0";
  }

  window.addEventListener("scroll", actualizarNavbar, { passive: true });

  window.addEventListener("resize", () => {
    medirNavbar();
    actualizarNavbar();
  });

  // Al terminar de cargar (logo e íconos) se vuelve a medir
  window.addEventListener("load", () => {
    medirNavbar();
    actualizarNavbar();
  });

  medirNavbar();
  actualizarNavbar();
});

/* -------- EFECTO PARALLAX DEL HERO -------- */

const hero = document.querySelector(".hero");

if (hero) {
  // Medido en ZeroTier: cuánto sube el fondo por cada px de (scroll + alto de ventana)
  const FACTOR = 0.057;
  let pendiente = false;

  function actualizarFondo() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const desplazamiento = -(scrollY + innerHeight) * FACTOR;

    hero.style.setProperty("--hero-parallax", `${desplazamiento / rem}rem`);
    pendiente = false;
  }

  function pedirActualizacion() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(actualizarFondo);
  }

  window.addEventListener("scroll", pedirActualizacion, { passive: true });
  window.addEventListener("resize", pedirActualizacion);
  actualizarFondo();
}

/* -------- LOGOS TRUSTED BY -------- */

document.addEventListener("DOMContentLoaded", () => {
  const tracks = document.querySelectorAll(".trusted__logos-track");

  if (tracks.length !== 2) return;

  const base = "https://www.zerotier.com/wp-content/uploads/2026/09/";

  const logos = [
    ["Thales", "Customer-Logo-Thales-260902v01-DRAFT.png"],
    ["Microsoft", "Customer-Logo-Microsoft-260902v01-DRAFT.png"],
    ["Volvo", "Customer-Logo-Volvo-260902v01-DRAFT.png"],
    ["TD Synnex", "Customer-Logo-TD-SYNNEX-260902v01-DRAFT.png"],
    ["Astrion", "Customer-Logo-Astrion-260902v01-DRAFT.png"],
    ["Leidos", "Customer-Logo-Leidos-260902v01-DRAFT.png"],
    ["Superbet", "Customer-Logo-Superbet-260902v01-DRAFT.png"],
    ["MikroTik", "Customer-Logo-Mikrotik-260902v01-DRAFT.png"],
    ["Advantech", "Customer-Logo-Advantech-260902v01-DRAFT.png"],
    ["Keysight", "Customer-Logo-KEYSIGHT-260902v01-DRAFT.png"],
    ["Metropolis", "Customer-Logo-Metropol-260902v01-DRAFT.png"],
    ["Mateco", "Customer-Logo-Mateco-260902v01-DRAFT.png"],
    ["Forest Rock", "Customer-Logo-ForestRock-260902v01-DRAFT.png"],
    ["NTT Data", "Customer-Logo-NTT-Data-260902v01-DRAFT.png"],
    ["EMCOR Group", "Customer-Logo-EMCOR-Group-260902v01-DRAFT.png"],
    ["CEF", "Customer-Logo-CEF-260902v01-DRAFT.png"],
    ["BTG Pactual", "Customer-Logo-BTG-Pactual-260902v01-DRAFT.png"],
    ["Ahorramas", "Customer-Logo-AhorraMas-260902v01-DRAFT.png"],
    ["Mediapro", "Customer-Logo-Mediapro-260902v01-DRAFT.png"],
    ["Wilson Group", "Customer-Logo-Wilson-Group-260902v01-DRAFT.png"],
    ["Teltonika", "Customer-Logo-TELTONIKA-260902v01-DRAFT.png"],
    ["U.S. Army", "Customer-US-Army-260925v01-DRAFT.png"],
    ["U.S. Air Force", "Customer-US-Air-Force-260925v01-DRAFT.png"],
    ["In-Q-Tel", "Customer-In-Q-Tel-260925v01-DRAFT.png"],
    ["U.S. Navy", "Customer-US-Navy-260925v01-DRAFT.png"],
    [
      "U.S. Department of Homeland Security",
      "Customer-Department-of-Homeland-Security-260925v01-DRAFT.png",
    ],
  ];

  // Separamos los logos en dos filas
  const grupos = [logos.slice(0, 21), logos.slice(21)];

  tracks.forEach((track, indice) => {
    const fragmento = document.createDocumentFragment();

    // Repetimos los logos 4 veces para el carrusel
    for (let copia = 0; copia < 4; copia++) {
      grupos[indice].forEach(([nombre, archivo]) => {
        const holder = document.createElement("div");
        holder.className = "trusted__logo-holder";

        const img = document.createElement("img");
        img.className = "trusted__logo";
        img.src = base + archivo;
        img.alt = copia === 0 ? nombre : "";
        img.decoding = "async";

        if (copia > 0) {
          holder.setAttribute("aria-hidden", "true");
        }

        holder.appendChild(img);
        fragmento.appendChild(holder);
      });
    }

    track.replaceChildren(fragmento);
  });
});

/* -------- MENÚ LATERAL MÓVIL -------- */

document.addEventListener("DOMContentLoaded", () => {
  const botonAbrir = document.querySelector(".header__menu-button");
  const menu = document.querySelector(".mobile-menu");
  const panel = document.querySelector(".mobile-menu__panel");
  const botonCerrar = document.querySelector(".mobile-menu__close");
  const fondoOscuro = document.querySelector(".mobile-menu__overlay");

  if (!botonAbrir || !menu || !panel || !botonCerrar || !fondoOscuro) {
    return;
  }

  const reducirMovimiento = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  let estado = "cerrado";

  function abrirMenu() {
    if (estado !== "cerrado") return;

    estado = "abriendo";
    menu.hidden = false;

    // Preparar la animación de apertura
    void menu.offsetWidth;

    menu.classList.add("is-open");
    botonAbrir.setAttribute("aria-expanded", "true");
    botonCerrar.focus();

    if (reducirMovimiento.matches) {
      estado = "abierto";
    }
  }

  function cerrarMenu() {
    if (estado === "cerrado" || estado === "cerrando") return;

    estado = "cerrando";

    // Activar la animación en reversa
    menu.classList.remove("is-open");
    menu.classList.add("is-closing");

    botonAbrir.setAttribute("aria-expanded", "false");
    botonAbrir.focus();

    if (reducirMovimiento.matches) {
      finalizarCierre();
    }
  }

  function finalizarCierre() {
    menu.hidden = true;
    menu.classList.remove("is-closing");
    estado = "cerrado";
  }

  // Detectar cuando termina la apertura
  panel.addEventListener("animationend", (event) => {
    if (
      event.target === panel &&
      event.animationName === "mobile-slide-in-right" &&
      estado === "abriendo"
    ) {
      estado = "abierto";
    }
  });

  // Detectar cuando termina el cierre
  menu.addEventListener("animationend", (event) => {
    if (
      event.target === menu &&
      event.animationName === "mobile-menu-close" &&
      estado === "cerrando"
    ) {
      finalizarCierre();
    }
  });

  botonAbrir.addEventListener("click", abrirMenu);
  botonCerrar.addEventListener("click", cerrarMenu);
  fondoOscuro.addEventListener("click", cerrarMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      cerrarMenu();
    }
  });
});
/* -------- PARALLAX DEL FONDO DE BENEFITS -------- */

document.addEventListener("DOMContentLoaded", () => {
  const seccion = document.querySelector(".benefits__media");
  const fondo = document.querySelector(".benefits__bg");

  if (!seccion || !fondo) return;

  // Medido en ZeroTier: el fondo se mueve de -100px a +100px
  const RECORRIDO = 100;
  let pendiente = false;

  function actualizarFondo() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const { top, height } = seccion.getBoundingClientRect();

    // 0 = la sección empieza a entrar por abajo; 1 = termina de salir por arriba
    const progreso = Math.min(
      1,
      Math.max(0, (innerHeight - top) / (innerHeight + height)),
    );
    const desplazamiento = -RECORRIDO + progreso * RECORRIDO * 2;

    fondo.style.setProperty(
      "--benefits-parallax",
      `${desplazamiento / rem}rem`,
    );
    pendiente = false;
  }

  function pedirActualizacion() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(actualizarFondo);
  }

  window.addEventListener("scroll", pedirActualizacion, { passive: true });
  window.addEventListener("resize", pedirActualizacion);
  actualizarFondo();
});

/* -------- ACORDEÓN Y CAMBIO DE IMÁGENES DE BENEFITS -------- */

document.addEventListener("DOMContentLoaded", () => {
  const items = [...document.querySelectorAll(".accordion__item")];
  const slides = [...document.querySelectorAll(".benefits__slide")];

  if (!items.length || items.length !== slides.length) return;

  // Medido en ZeroTier: el contenido se desliza en 400 ms con la curva "swing" de jQuery
  const DURACION = 400;
  const CURVA = "cubic-bezier(0.37, 0, 0.63, 1)";

  const animaciones = new WeakMap();

  // Desliza el contenido de un ítem hacia abajo (abrir) o hacia arriba (cerrar)
  function deslizar(contenido, abrir) {
    animaciones.get(contenido)?.cancel();

    // Se muestra primero para poder medir su altura real
    contenido.style.display = "block";
    const { paddingTop, paddingBottom } = getComputedStyle(contenido);
    const abierto = {
      height: `${contenido.offsetHeight}px`,
      paddingTop,
      paddingBottom,
    };
    const cerrado = { height: "0px", paddingTop: "0px", paddingBottom: "0px" };

    const animacion = contenido.animate(
      abrir ? [cerrado, abierto] : [abierto, cerrado],
      { duration: DURACION, easing: CURVA, fill: "forwards" },
    );
    animaciones.set(contenido, animacion);

    animacion.onfinish = () => {
      contenido.style.display = "";
      animacion.cancel();
      animaciones.delete(contenido);
    };
  }

  function cambiarItem(nuevo) {
    const actual = items.find((item) => item.classList.contains("is-active"));

    // Clic en el ítem que ya está abierto: no hace nada (pendiente de confirmar)
    if (nuevo === actual) return;

    if (actual) {
      actual.classList.remove("is-active");
      actual
        .querySelector(".accordion__trigger")
        .setAttribute("aria-expanded", "false");
      deslizar(actual.querySelector(".accordion__content"), false);
    }

    nuevo.classList.add("is-active");
    nuevo
      .querySelector(".accordion__trigger")
      .setAttribute("aria-expanded", "true");
    deslizar(nuevo.querySelector(".accordion__content"), true);

    // La imagen que corresponde al ítem abierto (el fundido lo hace el CSS)
    const posicion = items.indexOf(nuevo);
    slides.forEach((imagen, i) =>
      imagen.classList.toggle("is-active", i === posicion),
    );
  }

  items.forEach((item) => {
    item
      .querySelector(".accordion__trigger")
      .addEventListener("click", () => cambiarItem(item));
  });
});
