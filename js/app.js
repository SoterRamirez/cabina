// Cabina · la navaja suiza del operador. Sin cuentas, sin servidor: todo vive en tu celular.
import { el, leer, guardar, todasLasClaves, borrarTodo, encabezado, avisar, compartirArchivo, hoyISO, diaDesdeISO, fechaCorta, horaCorta } from "./ui.js";
import { HERRAMIENTAS_NORMAS, vigilarTurno, revisarAvisos, turnoActual, arrancarTurno, alternarPausa, manejado, siguientePausa, enPausa, duracion, faltaPausa, cronometro, hms } from "./normas.js";
import { HERRAMIENTAS_TRAMITES, vencimientosProximos, enMesDelApto, textoVencimiento } from "./tramites.js";
import { HERRAMIENTAS_CUENTAS } from "./cuentas.js";
import { icono } from "./iconos.js";
import { vistaAyuda, vistaAviso, tarjetaBienvenida } from "./ayuda.js";
import { iniciarMetricas, contarVista } from "./metricas.js";

const HERRAMIENTAS = [...HERRAMIENTAS_TRAMITES, ...HERRAMIENTAS_NORMAS, ...HERRAMIENTAS_CUENTAS];
// Pestañas de la barra inferior. El color es el del señalamiento: verde camino, azul informativo, amarillo cuentas.
const PESTANAS = [
  { ruta: "", grupo: "Camino", titulo: "Camino", icono: "volante", senal: "verde" },
  { ruta: "tramites", grupo: "Trámites", titulo: "Trámites", icono: "documento", senal: "azul" },
  { ruta: "cuentas", grupo: "Cuentas", titulo: "Cuentas", icono: "calculadora", senal: "amarillo" },
  { ruta: "mis-datos", grupo: null, titulo: "Mis datos", icono: "persona", senal: "gris" }
];
const SENAL = { Camino: "verde", "Trámites": "azul", Cuentas: "amarillo" };
// Post de Cabina en el grupo de la 57: ahí se juntan las sugerencias.
const POST_SUGERENCIAS = "https://www.facebook.com/groups/bolsadetrabajoparaoperadores/permalink/2604417443361014/";
const vista = document.getElementById("vista");
const barra = document.getElementById("barra-inferior");
let limpiar = null;
let ultimaVista = null;
let instalador = null;

// ───────── Piezas del tablero ─────────
function medidor(fraccion, texto, etiqueta = "manejo") {
  const r = 30, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, fraccion));
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 76 76"); s.setAttribute("width", "92"); s.setAttribute("height", "92"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = `<circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--linea)" stroke-width="8"/>` +
    (f <= 0 ? "" : `<circle cx="38" cy="38" r="${r}" fill="none" stroke="${f >= 1 ? "var(--rojo-claro)" : "var(--raya)"}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 38 38)"/>`) +
    `<text x="38" y="40" text-anchor="middle" fill="var(--tinta)" style="font:700 17px var(--titulo)">${texto}</text>` +
    `<text x="38" y="53" text-anchor="middle" fill="var(--suave)" style="font:500 9px var(--texto)">${etiqueta}</text>`;
  return s;
}
function mmss(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
function duracionCorta(ms) { const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3); return h + ":" + String(m).padStart(2, "0"); }
function tableroTurno() {
  const t = turnoActual(), ahora = Date.now();
  const caja = el("section", { class: "tablero", "aria-label": "Tu turno" });
  if (!t) {
    caja.append(el("div", { class: "tablero-fila" }, medidor(0, "0:00"),
      el("div", null, el("p", { class: "etiqueta" }, "SIN TURNO"), el("p", { class: "titular" }, "¿Arrancas?"),
        el("p", { class: "chico" }, "Cabina cuenta tus horas y te avisa la pausa."))));
    return caja;
  }
  if (t.terminado) {
    const libre = t.terminado + 8 * 3600e3, listo = ahora >= libre;
    caja.append(el("div", { class: "tablero-fila" }, medidor(listo ? 1 : (ahora - t.terminado) / (8 * 3600e3), listo ? "OK" : duracionCorta(libre - ahora), listo ? "listo" : "faltan"),
      el("div", null, el("p", { class: "etiqueta" }, "DESCANSO"), el("p", { class: "titular" }, listo ? "Ya puedes arrancar" : "Hasta las " + horaCorta(new Date(libre))),
        el("p", { class: "chico" }, "8 h corridas (NOM-087)."))));
    return caja;
  }
  const man = manejado(t, ahora), pausa = enPausa(t), sp = siguientePausa(t);
  const ult = t.pausas[t.pausas.length - 1];
  // Manejando: avance del tramo de 5 h. En pausa: avance hacia los 30 min, y el número es la pausa corriendo.
  const avance = pausa ? 1 - faltaPausa(t, ahora) / (30 * 60e3) : 1 - (sp - ahora) / (5 * 3600e3);
  const fila = el("a", { class: "tablero-fila", href: "#/horas" }, medidor(avance, pausa ? mmss(ahora - ult.ini) : duracionCorta(man), pausa ? "pausa" : "manejo"),
    el("div", null, el("p", { class: "etiqueta" }, pausa ? "EN PAUSA" : "MANEJANDO"),
      el("p", { class: "titular" + (!pausa && ahora >= sp ? " urgente-texto" : "") }, pausa ? (faltaPausa(t, ahora) > 0 ? "Mínimo hasta las " + horaCorta(new Date(ahora + faltaPausa(t, ahora))) : "Pausa completa") : (ahora >= sp ? "¡Toca tu pausa!" : "Pausa a las " + horaCorta(new Date(sp)))),
      el("p", { class: "chico" }, "Quedan " + duracion(Math.max(0, 14 * 3600e3 - man)) + " de 14 h."),
      el("p", { class: "chico cronometro-chico" }, el("span", { class: "punto-vivo", "aria-hidden": "true" }), (pausa ? "Pausa " : "Manejo ") , el("span", { "data-cronometro": "largo" }, hms(cronometro(t, ahora).ms)))));
  caja.append(fila);
  return caja;
}

function accionesRapidas() {
  const t = turnoActual();
  const activo = t && !t.terminado;
  const pausa = activo && enPausa(t);
  const turno = !activo
    ? el("button", { class: "accion senal-verde", onclick: () => { arrancarTurno(); ir(); avisar("Turno iniciado. Te aviso de la pausa."); } }, icono("arrancar", 26), "Empecé a manejar")
    : el("button", { class: "accion senal-verde", onclick: () => { const aviso = alternarPausa(); ir(); if (aviso) avisar(aviso); } }, icono(pausa ? "arrancar" : "pausa", 26), pausa ? "Terminé mi pausa" : "Empiezo mi pausa");
  return el("div", { class: "acciones" },
    el("a", { class: "accion senal-rojo", href: "#/emergencia" }, icono("telefono", 26), "Emergencia"),
    turno,
    el("a", { class: "accion senal-amarillo", href: "#/gastos?nuevo" }, icono("mas", 26), "Gasto"),
    el("a", { class: "accion senal-amarillo", href: "#/bitacora?nuevo" }, icono("mas", 26), "Bitácora"));
}

// El IEPS se guarda en el celular: se pinta al instante (sin brincos) y se actualiza en silencio con señal.
let iepsPedido = false;
function pintarIeps(caja, i) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const viejo = diaDesdeISO(i.semana_fin) < hoy;
  const corta = (iso) => fechaCorta(diaDesdeISO(iso)).replace(/ \d{4}$/, "");
  caja.replaceChildren(el("span", null, "IEPS diésel · " + (viejo ? "esperando acuerdo nuevo" : corta(i.semana_inicio) + " al " + corta(i.semana_fin))),
    el("strong", null, i.estimulo_pct + " %"));
  caja.hidden = false;
}
function tiraIeps() {
  const caja = el("a", { class: "tira", hidden: true, href: "../#km1" });
  const guardado = leer("ieps", null);
  if (guardado) pintarIeps(caja, guardado);
  if (!iepsPedido) {
    iepsPedido = true;
    // Cuando Cabina vive en soterramirez.dev/herramientas, el IEPS sale de datos/carretera.json del sitio.
    fetch("../datos/carretera.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => {
      const i = (d.ieps || [])[0]; if (!i) return;
      guardar("ieps", i);
      document.querySelectorAll(".tira").forEach((c) => pintarIeps(c, i));
    }).catch(() => {});
  }
  return caja;
}

// Aviso de vencimientos en el inicio: aparece a 30 días o menos y se puede posponer hasta mañana.
function avisoVencimientos() {
  const lista = vencimientosProximos(leer("vencimientos", {}));
  const pospuesto = leer("vencimientos-pospuesto", "");
  if (!lista.length || (pospuesto && pospuesto > hoyISO())) return "";
  const caja = el("section", { class: "caja aviso-vence", "aria-label": "Documentos por vencer" },
    el("p", { class: "etiqueta-vence" }, lista[0].dias < 0 ? "DOCUMENTO VENCIDO" : "POR VENCER"),
    ...lista.map((v) => el("p", { class: "texto-vence" }, textoVencimiento(v))),
    lista.some((v) => v.clave === "constancia") && enMesDelApto()
      ? el("p", { class: "suave" }, "Aprovecha el Mes del Apto Médico: renovación el mismo día, hasta el 17 de diciembre.") : "",
    el("div", { class: "botones" },
      el("a", { class: "boton principal", href: "#/" + (lista.some((v) => v.clave === "constancia") && enMesDelApto() ? "sedes" : "constancia") }, lista.some((v) => v.clave === "constancia") && enMesDelApto() ? "Ver sedes" : "Revisar fechas"),
      el("button", { class: "secundario", onclick: () => {
        const m = new Date(); m.setDate(m.getDate() + 1);
        guardar("vencimientos-pospuesto", m.getFullYear() + "-" + String(m.getMonth() + 1).padStart(2, "0") + "-" + String(m.getDate()).padStart(2, "0"));
        caja.remove();
      } }, "Recordar mañana")));
  return caja;
}

function letrero(h) {
  return el("a", { class: "letrero senal-" + (h.urgente ? "rojo" : SENAL[h.grupo]), href: "#/" + h.id },
    icono(h.icono, 26), el("span", null, h.titulo), icono("flecha", 20, "flecha"));
}

// ───────── Pestañas ─────────
function pestanaCamino() {
  const instalar = el("div", { class: "caja instalar", hidden: true },
    el("p", null, el("strong", null, "Instala Cabina en tu celular."), " Abre sin señal y tus datos no se borran."),
    el("button", { class: "principal", onclick: async () => { if (!instalador) return; instalador.prompt(); await instalador.userChoice; instalador = null; instalar.hidden = true; } }, "Instalar Cabina"));
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent), instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (instalador && !instalada) instalar.hidden = false;
  const bienvenida = leer("bienvenida", null) ? "" : tarjetaBienvenida(() => { guardar("bienvenida", new Date().toISOString()); ir(); });
  vista.append(el("h1", { class: "sr-only" }, "Cabina, en el camino"),
    bienvenida, avisoVencimientos(), tableroTurno(), accionesRapidas(), tiraIeps(),
    el("h2", { class: "grupo" }, "En el camino"),
    el("div", { class: "letreros" }, ...HERRAMIENTAS.filter((h) => h.grupo === "Camino" && h.id !== "emergencia").map(letrero)),
    instalar,
    esIOS && !instalada ? el("p", { class: "aviso" }, "En iPhone: toca Compartir y luego «Agregar a inicio». Así Cabina guarda tus datos sin que Safari los borre.") : "");
}
function pestanaGrupo(grupo, titulo, sub) {
  vista.append(el("h1", null, titulo), el("p", { class: "suave" }, sub),
    el("div", { class: "letreros" }, ...HERRAMIENTAS.filter((h) => h.grupo === grupo).map(letrero)));
  // La guía completa vive en el sitio (necesita señal la primera vez).
  if (grupo === "Trámites") vista.append(el("h2", { class: "grupo" }, "Para leer con calma"),
    el("div", { class: "letreros" }, el("a", { class: "letrero senal-azul", href: "../normas/" }, icono("libreta", 26), el("span", null, "Guía: normas que debes conocer"), icono("flecha", 20, "flecha"))));
}

// ───────── Mis datos y respaldo ─────────
function misDatos() {
  const n = Object.keys(todasLasClaves()).length;
  const estado = el("p", { class: "suave" }, "");
  const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then((p) => {
    estado.textContent = p ? "Almacenamiento protegido: el navegador no borrará tus datos por falta de espacio."
      : instalada ? "Cabina está instalada en tu pantalla de inicio: así el celular no borra tus datos por falta de uso. Aun así, respalda de vez en cuando."
      : "Almacenamiento normal. Instala Cabina en tu pantalla de inicio o toca «Proteger mis datos».";
  });
  const archivo = el("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: restaurar });
  async function respaldar() {
    const datos = { app: "cabina", version: 1, fecha: new Date().toISOString(), datos: todasLasClaves() };
    await compartirArchivo("cabina-respaldo-" + hoyISO() + ".json", JSON.stringify(datos, null, 1), "application/json", "Respaldo de Cabina");
    guardar("ultimo-respaldo", Date.now());
  }
  function restaurar(e) {
    const f = e.target.files[0]; if (!f) return;
    f.text().then((t) => {
      const d = JSON.parse(t);
      if (d.app !== "cabina" || typeof d.datos !== "object") throw new Error("formato");
      if (!confirm("Esto reemplaza lo que tienes ahora en Cabina con el respaldo del " + fechaCorta(new Date(d.fecha)) + ". ¿Seguir?")) return;
      borrarTodo(); Object.entries(d.datos).forEach(([k, v]) => guardar(k, v));
      avisar("Respaldo restaurado."); ir();
    }).catch(() => avisar("Ese archivo no es un respaldo de Cabina."));
    e.target.value = "";
  }
  const ult = leer("ultimo-respaldo", null);
  vista.append(el("h1", null, "Mis datos"), el("p", { class: "suave" }, "Todo lo que guardas en Cabina vive solo en este celular. Nadie más lo ve."),
    el("div", { class: "caja" },
      el("p", null, "Tienes " + n + " apartados con datos guardados."), estado,
      el("p", { class: "suave" }, ult ? "Último respaldo: " + fechaCorta(new Date(ult)) + "." : "Todavía no haces ningún respaldo."),
      el("div", { class: "botones" },
        el("button", { class: "principal", onclick: respaldar }, "Respaldar mis datos"),
        el("button", { class: "secundario", onclick: () => archivo.click() }, "Restaurar un respaldo"),
        el("button", { class: "secundario", onclick: async () => { const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; avisar(ok ? "Listo: tus datos quedan protegidos." : "Tu navegador no lo permitió. Instala Cabina para protegerlos."); ir(); } }, "Proteger mis datos")),
      archivo),
    el("p", { class: "aviso" }, "Tus datos se pierden si borras los datos del navegador, desinstalas Cabina o cambias de celular. Haz un respaldo y mándatelo por WhatsApp o correo. Cuidarlos es tu responsabilidad: Cabina no los puede recuperar."),
    el("div", { class: "caja" }, el("h2", null, "Borrar todo"), el("p", { class: "suave" }, "Borra turnos, gastos, bitácora y fechas de este celular. No se puede deshacer."),
      el("button", { class: "peligro", onclick: () => { if (confirm("¿Borrar todos tus datos de Cabina en este celular? No se puede deshacer.")) { borrarTodo(); avisar("Datos borrados."); ir(); } } }, "Borrar todos mis datos")),
    el("div", { class: "letreros" },
      el("a", { class: "letrero senal-amarillo", href: POST_SUGERENCIAS, target: "_blank", rel: "noopener" }, icono("mas", 26), el("span", null, "Sugerir una mejora"), icono("flecha", 20, "flecha")),
      el("a", { class: "letrero senal-azul", href: "#/ayuda" }, icono("documento", 26), el("span", null, "¿Cómo se usa Cabina?"), icono("flecha", 20, "flecha")),
      el("a", { class: "letrero senal-azul", href: "#/aviso" }, icono("escudo", 26), el("span", null, "Aviso de responsabilidad"), icono("flecha", 20, "flecha")),
      el("a", { class: "letrero senal-azul", href: "#/acerca" }, icono("persona", 26), el("span", null, "Acerca de Cabina"), icono("flecha", 20, "flecha"))));
}

function acerca() {
  vista.append(...encabezado("Acerca de Cabina", "La navaja suiza del operador, hecha por Soter Ramírez."),
    el("div", { class: "caja" },
      el("p", null, "Cabina es gratis, sin cuentas y sin anuncios. Funciona sin señal después de abrirla una vez."),
      el("p", null, "Todo lo que dice sobre normas sale del DOF o de sitios gob.mx, con la cita a la mano. Es orientativa: ante la duda manda el texto oficial."),
      el("p", null, "El código es abierto: ", el("a", { href: "https://github.com/SoterRamirez/cabina", target: "_blank", rel: "noopener" }, "github.com/SoterRamirez/cabina"), "."),
      el("p", null, "¿Viste un error o se te ocurre otra herramienta? Déjalo en los comentarios del post de Cabina en el grupo de la 57. Ahí lo leo y lo contesto."),
      el("a", { class: "boton principal", href: POST_SUGERENCIAS, target: "_blank", rel: "noopener" }, "Sugerir una mejora"),
      el("p", null, el("a", { href: "../" }, "Volver a soterramirez.dev"))),
    el("div", { class: "caja" },
      el("h2", null, "Apoya a Cabina"),
      el("p", null, "Cabina es y seguirá siendo gratis. Si te ha servido y quieres echarle la mano, puedes regalarme algo de mi lista de Amazon."),
      el("a", { class: "boton principal", href: "https://www.amazon.com.mx/hz/wishlist/ls/I2WAB3ROFPTZ", target: "_blank", rel: "noopener nofollow" }, "Ver mi lista de Amazon")));
}

// ───────── Barra inferior y rutas ─────────
function pintarBarra(activa) {
  barra.replaceChildren(...PESTANAS.map((p) => el("a", { href: "#/" + p.ruta, class: "pestana" + (p.ruta === activa ? " activa senal-texto-" + p.senal : ""), "aria-current": p.ruta === activa ? "page" : null },
    icono(p.icono, 24), el("span", null, p.titulo))));
}

function ir() {
  if (limpiar) { try { limpiar(); } catch { /* nada */ } limpiar = null; }
  vista.replaceChildren();
  const [id, extra] = location.hash.replace(/^#\/?/, "").split("?");
  const h = HERRAMIENTAS.find((x) => x.id === id);
  let activa = "";
  if (h) {
    document.title = h.titulo + " · Cabina";
    limpiar = h.vista(vista) || null;
    activa = (PESTANAS.find((p) => p.grupo === h.grupo) || PESTANAS[0]).ruta;
    const volver = vista.querySelector(".volver"); if (volver) volver.setAttribute("href", "#/" + activa);
    const titulo = vista.querySelector("h1"); if (titulo) titulo.classList.add("senal-borde-" + (h.urgente ? "rojo" : SENAL[h.grupo]));
    if (extra === "nuevo") setTimeout(() => { const c = vista.querySelector("[data-foco]") || vista.querySelector("form input"); if (c) c.focus(); }, 50);
  } else if (id === "tramites") { activa = id; document.title = "Trámites · Cabina"; pestanaGrupo("Trámites", "Trámites y normas", "Lo que pide la autoridad, con la fuente oficial."); }
  else if (id === "cuentas") { activa = id; document.title = "Cuentas · Cabina"; pestanaGrupo("Cuentas", "Cuentas y bitácora", "Tus números del viaje, guardados solo en tu celular."); }
  else if (id === "mis-datos") { activa = id; document.title = "Mis datos · Cabina"; misDatos(); }
  else if (id === "acerca") { activa = "mis-datos"; document.title = "Acerca de · Cabina"; acerca(); vista.querySelector(".volver")?.setAttribute("href", "#/mis-datos"); }
  else if (id === "ayuda") { activa = "mis-datos"; document.title = "Cómo se usa · Cabina"; vistaAyuda(vista); vista.querySelector(".volver")?.setAttribute("href", "#/mis-datos"); }
  else if (id === "aviso") { activa = "mis-datos"; document.title = "Aviso de responsabilidad · Cabina"; vistaAviso(vista); vista.querySelector(".volver")?.setAttribute("href", "#/mis-datos"); }
  else { document.title = "Cabina · herramientas para operadores"; pestanaCamino(); }
  pintarBarra(activa);
  // Solo cuenta cuando cambias de pantalla, no cuando la misma se redibuja.
  const cambioDePantalla = (id || "") !== ultimaVista;
  if (cambioDePantalla) { ultimaVista = id || ""; contarVista(ultimaVista, document.title); }
  if (id) vista.focus({ preventScroll: true });
  // Solo sube hasta arriba al cambiar de pantalla, no al redibujar la misma (por ejemplo, al pausar).
  if (cambioDePantalla) window.scrollTo(0, 0);
}
window.addEventListener("hashchange", ir);

// Cronómetro en vivo: cada segundo cambia solo los textos marcados, sin redibujar nada.
setInterval(() => {
  const marcas = document.querySelectorAll("[data-cronometro]");
  if (!marcas.length) return;
  const c = cronometro(turnoActual(), Date.now());
  if (!c) return;
  marcas.forEach((m) => { m.textContent = c.modo === "descanso" && c.ms === 0 ? "Listo" : hms(c.ms); });
  const medidorTexto = document.querySelector(".tablero svg text");
  if (medidorTexto && c.modo === "pausa") medidorTexto.textContent = mmss(c.ms);
}, 1000);

// Al volver a Cabina desde otra app el iPhone había pausado los relojes: se pone al día al instante.
// Al volver a la app (iOS la reanuda sin recargar) también se busca versión nueva, máximo cada 30 min.
let ultimaRevisionVersion = Date.now();
function buscarVersion() {
  if (!("serviceWorker" in navigator) || Date.now() - ultimaRevisionVersion < 30 * 60 * 1000) return;
  ultimaRevisionVersion = Date.now();
  navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
}
function alVolver() { if (document.visibilityState !== "visible") return; revisarAvisos(); ir(); buscarVersion(); }
document.addEventListener("visibilitychange", alVolver);
window.addEventListener("pageshow", (e) => { if (e.persisted) alVolver(); });

// El tablero del turno se actualiza cada 30 s sin redibujar la pantalla (antes parpadeaba).
setInterval(() => {
  if (location.hash && location.hash !== "#/") return;
  const viejo = vista.querySelector(".tablero");
  if (!viejo) return;
  const nuevo = tableroTurno();
  if (nuevo.textContent !== viejo.textContent || nuevo.innerHTML !== viejo.innerHTML) viejo.replaceWith(nuevo);
}, 30e3);

const red = document.getElementById("estado-red");
function revisarRed() { red.hidden = navigator.onLine; }
window.addEventListener("online", revisarRed); window.addEventListener("offline", revisarRed);
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); instalador = e;
  const caja = vista.querySelector(".instalar");
  if (caja && !matchMedia("(display-mode: standalone)").matches) caja.hidden = false;
});

if ("serviceWorker" in navigator) {
  // Si ya había una versión y entra una nueva, recarga una vez para que el operador la vea en esta misma apertura.
  const habiaVersion = !!navigator.serviceWorker.controller;
  let recargado = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!habiaVersion || recargado) return;
    recargado = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
revisarRed();
vigilarTurno();
iniciarMetricas();
ir();
