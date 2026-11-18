// Cabina · la navaja suiza del operador. Sin cuentas, sin servidor: todo vive en tu celular.
import { el, leer, guardar, todasLasClaves, borrarTodo, encabezado, avisar, compartirArchivo, hoyISO, diaDesdeISO, fechaCorta, horaCorta } from "./ui.js";
import { HERRAMIENTAS_NORMAS, vigilarTurno } from "./normas.js";
import { HERRAMIENTAS_TRAMITES } from "./tramites.js";
import { HERRAMIENTAS_CUENTAS } from "./cuentas.js";

const HERRAMIENTAS = [...HERRAMIENTAS_TRAMITES.filter((h) => h.grupo === "En el camino"), ...HERRAMIENTAS_NORMAS, ...HERRAMIENTAS_TRAMITES.filter((h) => h.grupo !== "En el camino"), ...HERRAMIENTAS_CUENTAS];
const GRUPOS = ["En el camino", "Normas y trámites", "Cuentas y bitácora"];
const vista = document.getElementById("vista");
let limpiar = null;
let instalador = null;

// ───────── Inicio ─────────
function tarjetaTurno() {
  const t = leer("turno", null);
  if (!t || t.terminado) return null;
  return el("a", { class: "tablero", href: "#/horas", style: "display:block;text-decoration:none" },
    el("p", { class: "chico" }, "Turno en curso desde " + horaCorta(new Date(t.inicio))),
    el("p", { class: "grande" }, "Ver mis horas →"));
}
function tarjetaIeps() {
  const caja = el("div", { class: "tablero", hidden: true, "aria-live": "polite" });
  // Cuando Cabina vive en soterramirez.dev/herramientas, el IEPS sale de datos/carretera.json del sitio.
  fetch("../datos/carretera.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => {
    const i = (d.ieps || [])[0]; if (!i) return;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const viejo = diaDesdeISO(i.semana_fin) < hoy;
    caja.append(el("p", { class: "chico" }, "IEPS del diésel · " + fechaCorta(diaDesdeISO(i.semana_inicio)) + " al " + fechaCorta(diaDesdeISO(i.semana_fin))),
      el("p", { class: "grande" }, i.estimulo_pct + " % de estímulo"),
      el("p", { class: "chico" }, viejo ? "Esperando el acuerdo de esta semana en el DOF." : "Cuota que se paga: $" + i.cuota.toFixed(4) + " por litro · acuerdo " + i.acuerdo));
    caja.hidden = false;
  }).catch(() => {});
  return caja;
}
function inicio() {
  const instalar = el("div", { class: "caja instalar", hidden: true },
    el("p", null, el("strong", null, "Instala Cabina en tu celular."), " Abre sin señal y tus datos no se borran."),
    el("button", { class: "principal", onclick: async () => { if (!instalador) return; instalador.prompt(); await instalador.userChoice; instalador = null; instalar.hidden = true; } }, "Instalar Cabina"));
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent), instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (instalador && !instalada) instalar.hidden = false;
  const ios = esIOS && !instalada ? el("p", { class: "aviso" }, "En iPhone: toca Compartir y luego «Agregar a inicio». Así Cabina guarda tus datos sin que Safari los borre.") : null;
  vista.append(
    el("h1", { class: "sr-only" }, "Cabina, herramientas para operadores"),
    tarjetaTurno() || "", tarjetaIeps(),
    ...GRUPOS.flatMap((g) => [el("h2", { class: "grupo" }, g), el("div", { class: "rejilla" },
      ...HERRAMIENTAS.filter((h) => h.grupo === g).map((h) => el("a", { class: "boton-herramienta" + (h.urgente ? " urgente" : ""), href: "#/" + h.id },
        el("span", { class: "icono", "aria-hidden": "true" }, h.icono), h.titulo)))]),
    instalar, ios || "");
}

// ───────── Mis datos y respaldo ─────────
function misDatos() {
  const n = Object.keys(todasLasClaves()).length;
  const estado = el("p", { class: "suave" }, "Revisando el almacenamiento…");
  if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then((p) => {
    estado.textContent = p ? "Almacenamiento protegido: el navegador no borrará tus datos por falta de espacio." : "Almacenamiento normal. Instala Cabina o toca «Proteger mis datos».";
  }); else estado.textContent = "";
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
  vista.append(...encabezado("Mis datos y respaldo", "Todo lo que guardas en Cabina vive solo en este celular. Nadie más lo ve."),
    el("div", { class: "caja" },
      el("p", null, "Tienes " + n + " apartados con datos guardados."), estado,
      el("p", { class: "suave" }, ult ? "Último respaldo: " + fechaCorta(new Date(ult)) + "." : "Todavía no haces ningún respaldo."),
      el("div", { class: "botones" },
        el("button", { class: "principal", onclick: respaldar }, "Respaldar mis datos"),
        el("button", { class: "secundario", onclick: () => archivo.click() }, "Restaurar un respaldo"),
        el("button", { class: "secundario", onclick: async () => { const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; avisar(ok ? "Listo: tus datos quedan protegidos." : "Tu navegador no lo permitió. Instala Cabina para protegerlos."); ir(); } }, "Proteger mis datos")),
      archivo),
    el("p", { class: "aviso" }, "Tus datos se pierden si borras los datos del navegador, desinstalas Cabina o cambias de celular. Haz un respaldo y mándatelo por WhatsApp o correo."),
    el("div", { class: "caja" }, el("h2", null, "Borrar todo"), el("p", { class: "suave" }, "Borra turnos, gastos, bitácora y fechas de este celular. No se puede deshacer."),
      el("button", { class: "peligro", onclick: () => { if (confirm("¿Borrar todos tus datos de Cabina en este celular? No se puede deshacer.")) { borrarTodo(); avisar("Datos borrados."); ir(); } } }, "Borrar todos mis datos")));
}

function acerca() {
  vista.append(...encabezado("Acerca de Cabina", "La navaja suiza del operador, hecha por Soter Ramírez."),
    el("div", { class: "caja" },
      el("p", null, "Cabina es gratis, sin cuentas y sin anuncios. Funciona sin señal después de abrirla una vez."),
      el("p", null, "Todo lo que dice sobre normas sale del DOF o de sitios gob.mx, con la cita a la mano. Es orientativa: ante la duda manda el texto oficial."),
      el("p", null, "El código es abierto: ", el("a", { href: "https://github.com/SoterRamirez/cabina", target: "_blank", rel: "noopener" }, "github.com/SoterRamirez/cabina"), "."),
      el("p", null, "¿Viste un error o se te ocurre otra herramienta? Escríbeme en ", el("a", { href: "https://facebook.com/SoterRamirez", target: "_blank", rel: "noopener" }, "Facebook"), " o súmate al ",
        el("a", { href: "https://www.facebook.com/groups/bolsadetrabajoparaoperadores", target: "_blank", rel: "noopener" }, "grupo de la 57"), "."),
      el("p", null, el("a", { href: "../" }, "Volver a soterramirez.dev"))));
}

// ───────── Rutas ─────────
function ir() {
  if (limpiar) { try { limpiar(); } catch { /* nada */ } limpiar = null; }
  vista.replaceChildren();
  const id = (location.hash.replace(/^#\/?/, "") || "").split("?")[0];
  const h = HERRAMIENTAS.find((x) => x.id === id);
  if (h) { document.title = h.titulo + " · Cabina"; limpiar = h.vista(vista) || null; }
  else if (id === "mis-datos") { document.title = "Mis datos · Cabina"; misDatos(); }
  else if (id === "acerca") { document.title = "Acerca de · Cabina"; acerca(); }
  else { document.title = "Cabina · herramientas para operadores"; inicio(); }
  if (id) { vista.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", ir);

// Sin señal
const red = document.getElementById("estado-red");
function revisarRed() { red.hidden = navigator.onLine; }
window.addEventListener("online", revisarRed); window.addEventListener("offline", revisarRed);

window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); instalador = e; if (!location.hash || location.hash === "#/") ir(); });

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
revisarRed();
vigilarTurno();
ir();
