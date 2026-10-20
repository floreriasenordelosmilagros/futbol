// ====== CONFIGURACIÓN (cambia estos datos) ======
const CONFIG = {
  whatsapp: "51945917112", // número con código de país, sin + ni espacios
  nombre: "Tu Complejo",
  // Pega aquí la URL de tu Apps Script (termina en /exec)
api: "https://script.google.com/macros/s/AKfycbwjYY3khJ08dIjWFT8iiRoOQQeOg_uBC2bD85rivcr9PiAuHxZQlfjgltgx6j82VEFY/exec"};

// ====== Navbar: cambia de estilo al hacer scroll ======
const navbar = document.getElementById("navbar");
const onScroll = () => navbar.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ====== Menú móvil ======
const menuBtn = document.getElementById("menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
menuBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
mobileMenu.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => mobileMenu.classList.add("hidden"))
);

// ====== Botón flotante de WhatsApp ======
document.getElementById("wa-float").href =
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent("Hola, quisiera información sobre las canchas.")}`;

// ====== Preseleccionar cancha desde las tarjetas ======
document.querySelectorAll(".reservar-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const sel = document.getElementById("cancha");
    sel.value = btn.dataset.cancha;
    sel.dispatchEvent(new Event("change"));
  });
});

// ====== Horarios disponibles (formato 24h: 6 = 6 am, 24 = 12 am) ======
const HORA_APERTURA = 6;   // primer turno 6:00 am
const HORA_CIERRE = 25;    // cierra a la 1:00 am (25 = 1 am del día siguiente)

// ====== Tarifas por hora (cambia aquí los precios) ======
// "hasta" es la hora en que termina esa tarifa (formato 24h)
const TARIFAS = [
  { nombre: "Mañana", hasta: 12, precio: 40 }, // turnos de 6:00 am a 11:00 am
  { nombre: "Tarde",  hasta: 18, precio: 55 }, // turnos de 12:00 pm a 5:00 pm
  { nombre: "Noche",  hasta: 25, precio: 70 }  // turnos de 6:00 pm a 12:00 am
];
const tarifaDe = h => TARIFAS.find(t => h < t.hasta);

// Convierte 20 -> "8:00 pm"  24 -> "12:00 am"  25 -> "1:00 am"
const formatoHora = h => {
  const h24 = h % 24;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:00 ${h24 < 12 ? "am" : "pm"}`;
};

const contHorarios = document.getElementById("horarios");
const resumen = document.getElementById("resumen-horas");
const seleccionadas = new Set();

// Crea un grupo por tarifa (Mañana / Tarde / Noche) con su título y sus botones
let desde = HORA_APERTURA;
TARIFAS.forEach(t => {
  const grupo = document.createElement("div");
  grupo.innerHTML =
    `<p class="grupo-titulo"><span>${t.nombre}</span><span>S/ ${t.precio} por hora</span></p>`;
  const grilla = document.createElement("div");
  grilla.className = "grilla-horas";

  for (let h = Math.max(desde, HORA_APERTURA); h < Math.min(t.hasta, HORA_CIERRE); h++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "slot";
    b.dataset.hora = h;
    b.innerHTML = `${formatoHora(h)}<span class="slot-precio">S/ ${t.precio}</span>`;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      seleccionadas.has(h) ? seleccionadas.delete(h) : seleccionadas.add(h);
      b.setAttribute("aria-pressed", seleccionadas.has(h));
      actualizarResumen();
    });
    grilla.appendChild(b);
  }
  desde = t.hasta;
  grupo.appendChild(grilla);
  contHorarios.appendChild(grupo);
});

// Agrupa horas seguidas: [20,21,22] -> "8:00 pm a 11:00 pm"
const rangos = () => {
  const horas = [...seleccionadas].sort((a, b) => a - b);
  const grupos = [];
  horas.forEach(h => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.fin === h) ultimo.fin = h + 1;
    else grupos.push({ inicio: h, fin: h + 1 });
  });
  return grupos.map(g => `${formatoHora(g.inicio)} a ${formatoHora(g.fin)}`);
};

// Cuenta horas y suma precio por cada tarifa
const calcularPrecio = () => {
  const detalle = TARIFAS.map(t => ({ ...t, horas: 0 }));
  seleccionadas.forEach(h => detalle.find(t => h < t.hasta).horas++);
  const usadas = detalle.filter(t => t.horas > 0);
  const total = usadas.reduce((s, t) => s + t.horas * t.precio, 0);
  return { usadas, total };
};

function actualizarResumen() {
  resumen.classList.remove("error");
  if (seleccionadas.size === 0) {
    resumen.textContent = "Toca uno o más horarios";
    return;
  }
  const { usadas, total } = calcularPrecio();
  const lineas = usadas.map(t =>
    `<div class="flex justify-between"><span>${t.nombre}: ${t.horas} h × S/ ${t.precio}</span><span>S/ ${t.horas * t.precio}</span></div>`
  ).join("");
  resumen.innerHTML =
    `<p class="mb-2 text-slate-500">${rangos().join(", ")}</p>` +
    lineas +
    `<div class="mt-2 pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">` +
    `<span>Total (${seleccionadas.size} h)</span><span>S/ ${total}</span></div>`;
}

// ====== Fecha mínima = hoy ======
const fecha = document.getElementById("fecha");
const selCancha = document.getElementById("cancha");
const btnEnviar = document.querySelector('#form-reserva button[type="submit"]');
const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
fecha.min = hoyLocal();

// ====== Horas ya reservadas (vienen de la hoja de Google) ======
let ocupadas = new Set();   // confirmadas por el dueño
let pendientes = new Set(); // separadas esperando confirmación
let minutosPendiente = 30;
let cargando = false;

function mostrarAviso(texto, error = false) {
  resumen.textContent = texto;
  resumen.classList.toggle("error", error);
}

// Pinta cada botón según esté libre, pasado o reservado
function pintarHorarios() {
  const sinFecha = !fecha.value;
  const esHoy = fecha.value === hoyLocal();
  const ahora = new Date().getHours();

  contHorarios.querySelectorAll(".slot").forEach(b => {
    const h = Number(b.dataset.hora);
    const reservado = ocupadas.has(h);
    const pendiente = !reservado && pendientes.has(h);
    const pasada = esHoy && h <= ahora;
    b.disabled = sinFecha || cargando || reservado || pendiente || pasada;
    b.classList.toggle("ocupado", reservado);
    b.classList.toggle("pendiente", pendiente);
    b.classList.toggle("pasada", pasada && !reservado && !pendiente);
    b.querySelector(".slot-precio").textContent =
      reservado ? "Reservado" : pendiente ? "Por confirmar" : `S/ ${tarifaDe(h).precio}`;
    if (b.disabled && seleccionadas.has(h)) {
      seleccionadas.delete(h);
      b.setAttribute("aria-pressed", "false");
    }
  });

  if (sinFecha) mostrarAviso("Primero elige la fecha para ver los horarios libres");
  else if (cargando) mostrarAviso("Revisando horarios libres...");
  else actualizarResumen();
}

async function cargarOcupadas() {
  if (!fecha.value) { pintarHorarios(); return; }
  cargando = true;
  pintarHorarios();
  try {
    const url = `${CONFIG.api}?fecha=${encodeURIComponent(fecha.value)}&cancha=${encodeURIComponent(selCancha.value)}`;
    const res = await fetch(url);
    const data = await res.json();
    ocupadas = new Set((data.ocupadas || []).map(Number));
    pendientes = new Set((data.pendientes || []).map(Number));
    if (data.minutos) minutosPendiente = data.minutos;
    cargando = false;
    pintarHorarios();
  } catch (err) {
    console.error(err);
    ocupadas = new Set();
    pendientes = new Set();
    cargando = false;
    pintarHorarios();
    mostrarAviso("No se pudo revisar la disponibilidad. Revisa tu internet y vuelve a elegir la fecha", true);
  }
}

fecha.addEventListener("change", cargarOcupadas);
selCancha.addEventListener("change", cargarOcupadas);
// Se actualiza solo cada 30 segundos y al volver a la página
setInterval(() => { if (fecha.value && !document.hidden) cargarOcupadas(); }, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) cargarOcupadas(); });
// Al recargar el navegador recuerda la fecha elegida así que revisamos de una vez
cargarOcupadas();
window.addEventListener("pageshow", e => { if (e.persisted) cargarOcupadas(); });

// ====== Guardar la reserva y enviar por WhatsApp ======
document.getElementById("form-reserva").addEventListener("submit", async e => {
  e.preventDefault();
  if (seleccionadas.size === 0) {
    mostrarAviso("Elige al menos un horario para reservar", true);
    contHorarios.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const nombre = document.getElementById("nombre").value.trim();
  const cancha = selCancha.value;
  const dia = fecha.value;
  const horas = [...seleccionadas].sort((a, b) => a - b);
  const textoHorario = rangos().join(", ");
  const { usadas, total } = calcularPrecio();

  // Se abre la pestaña antes para que el celular no la bloquee
  const ventana = window.open("", "_blank");
  btnEnviar.disabled = true;
  btnEnviar.textContent = "Guardando reserva...";

  try {
    const res = await fetch(CONFIG.api, {
      method: "POST",
      body: JSON.stringify({ fecha: dia, cancha, horas, nombre, horario: textoHorario, total })
    });
    const data = await res.json();

    if (!data.ok) {
      if (ventana) ventana.close();
      const tomadas = (data.ocupadas || []).map(h => formatoHora(Number(h))).join(", ");
      await cargarOcupadas();
      mostrarAviso(
        tomadas
          ? `Alguien acaba de reservar ${tomadas}. Elige otro horario`
          : (data.mensaje || "No se pudo guardar la reserva. Intenta de nuevo"),
        true
      );
      return;
    }

    const [y, m, d] = dia.split("-");
    const mensaje =
      `Hola ${CONFIG.nombre}, quiero reservar:\n` +
      `👤 Nombre: ${nombre}\n` +
      `⚽ Cancha: ${cancha}\n` +
      `📅 Fecha: ${d}/${m}/${y}\n` +
      `🕒 Horario: ${textoHorario}\n` +
      `⏱️ Horas: ${horas.length}\n` +
      usadas.map(t => `   • ${t.nombre}: ${t.horas} h × S/ ${t.precio} = S/ ${t.horas * t.precio}\n`).join("") +
      `💰 Total: S/ ${total}\n` +
      `(Horario separado por ${minutosPendiente} min hasta que me confirmen)`;
    const waUrl = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensaje)}`;

    if (ventana) ventana.location.href = waUrl;
    else window.location.href = waUrl;

    seleccionadas.clear();
    contHorarios.querySelectorAll(".slot").forEach(b => b.setAttribute("aria-pressed", "false"));
    await cargarOcupadas();
    mostrarAviso(`Tu horario queda separado por ${minutosPendiente} minutos. Envía el mensaje de WhatsApp para confirmarlo`);
  } catch (err) {
    console.error(err);
    if (ventana) ventana.close();
    mostrarAviso("No se pudo guardar la reserva. Revisa tu internet e intenta de nuevo", true);
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = "Reservar por WhatsApp";
  }
});

// ====== Animaciones al hacer scroll ======
document.querySelectorAll("section > div, article").forEach(el => el.classList.add("reveal"));
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));