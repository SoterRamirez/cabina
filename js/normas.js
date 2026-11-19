// Herramientas de normas. Datos verificados en el DOF al 16/11/2026 (SoterRamirez/verificacion-normas).
import { el, leer, guardar, campo, fuente, encabezado, horaCorta, avisar } from "./ui.js";

const NOM087 = ["NOM-087-SCT-2-2017, DOF 28/06/2018", "https://dof.gob.mx/nota_detalle.php?codigo=5529381&fecha=28/06/2018"];
const NOM068 = ["NOM-068-SCT-2-2014, DOF 19/01/2015", "https://dof.gob.mx/nota_detalle.php?codigo=5378850&fecha=19/01/2015"];
const NOM045 = ["NOM-045-SEMARNAT-2017, DOF 08/03/2018", "https://dof.gob.mx/nota_detalle.php?codigo=5515481&fecha=08/03/2018"];
const AVISO_VERIF = ["Aviso SICT, DOF 03/04/2026", "https://dof.gob.mx/nota_detalle.php?codigo=5784029&fecha=03/04/2026"];
const REGLAMENTO = ["Reglamento de Tránsito en Carreteras Federales (reforma DOF 13/08/2026)", "https://dof.gob.mx/nota_detalle.php?codigo=5796297&fecha=13/08/2026"];

const H = 3600e3, M = 60e3;

// ───────── Horas de manejo, en vivo y con aviso ─────────
function estadoTurno() { return leer("turno", null); }
function manejado(t, ahora = Date.now()) {
  if (!t) return 0;
  const fin = t.terminado || ahora;
  const pausas = t.pausas.reduce((s, p) => s + ((p.fin || fin) - p.ini), 0);
  return Math.max(0, fin - t.inicio - pausas);
}
// NOM-087, 4.1: 30 min de pausa a más tardar a las 5 h de manejo; la pausa se puede repartir.
// Una pausa corta NO reinicia el conteo: el tramo de 5 h empieza de nuevo solo cuando se juntan 30 min de pausa.
function tramo(t, ahora = Date.now()) {
  let desde = t.inicio, acumulada = 0;
  for (const p of t.pausas) {
    acumulada += (p.fin || ahora) - p.ini;
    if (p.fin && acumulada >= 30 * M) { desde = p.fin; acumulada = 0; }
  }
  return { desde, acumulada };
}
function siguientePausa(t) { return tramo(t).desde + 5 * H; }
function faltaPausa(t, ahora = Date.now()) { return Math.max(0, 30 * M - tramo(t, ahora).acumulada); }
function minutos(ms) { return Math.ceil(ms / M); }
function enPausa(t) { const p = t && t.pausas[t.pausas.length - 1]; return !!(p && !p.fin); }
function duracion(ms) { const h = Math.floor(ms / H), m = Math.floor((ms % H) / M); return h + " h " + String(m).padStart(2, "0") + " min"; }

let alarmaInterval = null;
function sonar() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
  } catch { /* sin audio */ }
  if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);
}
function notificar(texto) {
  sonar();
  avisar(texto);
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker?.ready.then((r) => r.showNotification("Cabina", { body: texto, icon: "img/icono-192.png", tag: "cabina-turno" }))
        .catch(() => new Notification("Cabina", { body: texto }));
    }
  } catch { /* sin notificaciones */ }
}
// Decide qué avisos tocan en este momento. Separada del sonido para poder probarla (tests/horas.test.js).
// «dados» guarda los avisos ya mostrados para no repetirlos.
export function avisosPendientes(t, ahora, dados = {}) {
  const mensajes = [];
  if (!t || t.terminado || enPausa(t)) return { mensajes, dados };
  const sp = siguientePausa(t), clave = String(sp);
  if (ahora >= sp - 10 * M && ahora < sp && !dados["pre" + clave]) { dados["pre" + clave] = 1; mensajes.push("En 10 minutos te toca tu pausa de 30 min."); }
  if (ahora >= sp && !dados["ya" + clave]) { dados["ya" + clave] = 1; dados["pre" + clave] = 1; mensajes.push("Ya llevas 5 h manejando: toca pausa de 30 minutos."); }
  if (manejado(t, ahora) >= 14 * H && !dados["tope" + t.inicio]) { dados["tope" + t.inicio] = 1; mensajes.push("Llegaste a 14 h de manejo. Ya no puedes seguir hoy."); }
  return { mensajes, dados };
}

export function vigilarTurno() {
  clearInterval(alarmaInterval);
  alarmaInterval = setInterval(() => {
    const { mensajes, dados } = avisosPendientes(estadoTurno(), Date.now(), leer("avisos-turno", {}));
    if (!mensajes.length) return;
    guardar("avisos-turno", dados);
    mensajes.forEach(notificar);
  }, 15e3);
}

function vistaHoras(cont) {
  const tablero = el("div", { class: "caja", "aria-live": "polite" });
  const plan = el("ol", { class: "linea-tiempo" });
  let reloj;

  let firma = "";
  function pintar() {
    const t = estadoTurno(), ahora = Date.now();
    // Si nada cambió desde la última vez no se toca la pantalla (evita parpadeo y toques perdidos).
    const nueva = JSON.stringify(t) + "|" + Math.floor(ahora / M);
    if (nueva === firma) return;
    firma = nueva;
    tablero.replaceChildren();
    if (!t) {
      tablero.append(el("p", null, "Toca «Empecé a manejar» cuando arranques. Cabina cuenta tu tiempo y te avisa de la pausa."),
        el("div", { class: "botones" }, el("button", { class: "principal", onclick: empezar }, "Empecé a manejar")));
      return;
    }
    const man = manejado(t, ahora);
    if (t.terminado) {
      const libre = t.terminado + 8 * H;
      tablero.append(el("p", { class: "suave" }, "Descanso de 8 h corridas"),
        el("p", { class: "reloj" }, ahora >= libre ? "Listo" : duracion(libre - ahora)),
        el("p", null, ahora >= libre ? "Ya cumpliste tus 8 h de descanso." : "Puedes volver a arrancar a las " + horaCorta(new Date(libre))),
        el("p", { class: "suave" }, "Manejaste " + duracion(man) + " en este turno."),
        el("div", { class: "botones" }, el("button", { class: "principal", onclick: () => {
          if (ahora < libre && !confirm("Todavía no cumples 8 h corridas de descanso (te faltan " + duracion(libre - Date.now()) + "). La NOM-087 las pide. ¿Empezar de todos modos?")) return;
          guardar("turno", null); empezar(); } }, "Empezar un turno nuevo")));
      return;
    }
    const pausa = enPausa(t);
    const sp = siguientePausa(t);
    tablero.append(
      el("p", { class: "suave" }, pausa ? "En pausa desde " + horaCorta(new Date(t.pausas[t.pausas.length - 1].ini)) : "Manejando desde " + horaCorta(new Date(t.inicio))),
      el("p", { class: "reloj" }, duracion(man)),
      el("p", null, "De 14 h de manejo te quedan " + duracion(Math.max(0, 14 * H - man)) + "."),
      pausa ? el("p", null, faltaPausa(t, ahora) > 0
          ? "Para completar 30 min de pausa te faltan " + minutos(faltaPausa(t, ahora)) + " min: hasta las " + horaCorta(new Date(ahora + faltaPausa(t, ahora)))
          : "Ya completaste tus 30 min de pausa. Puedes seguir.")
        : el("p", { class: ahora >= sp ? "alerta" : "" }, ahora >= sp ? "Ya te toca la pausa de 30 min." : (faltaPausa(t, ahora) < 30 * M
          ? "Llevas " + (30 - minutos(faltaPausa(t, ahora))) + " min de pausa; te faltan " + minutos(faltaPausa(t, ahora)) + " min a más tardar a las " + horaCorta(new Date(sp))
          : "Pausa de 30 min a más tardar a las " + horaCorta(new Date(sp)))),
      el("div", { class: "botones" },
        pausa ? el("button", { class: "principal", onclick: terminarPausa }, "Terminé mi pausa")
          : el("button", { class: "principal", onclick: iniciarPausa }, "Empiezo mi pausa"),
        el("button", { class: "secundario", onclick: terminarDia }, "Terminé de manejar hoy")),
      el("p", { class: "suave" }, "El aviso suena y vibra mientras Cabina esté abierta. Con la app cerrada el celular no garantiza la alarma.")
    );
  }
  function empezar() {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    guardar("turno", { inicio: Date.now(), pausas: [] }); pintar(); vigilarTurno();
  }
  function iniciarPausa() { const t = estadoTurno(); t.pausas.push({ ini: Date.now() }); guardar("turno", t); pintar(); }
  function terminarPausa() { const aviso = alternarPausa(); if (aviso) avisar(aviso); pintar(); }
  function terminarDia() {
    if (!confirm("¿Terminaste de manejar por hoy? Empieza a contar tu descanso de 8 h.")) return;
    const t = estadoTurno(); const p = t.pausas[t.pausas.length - 1];
    if (p && !p.fin) p.fin = Date.now();
    t.terminado = Date.now(); guardar("turno", t); pintar();
  }

  // Planeador: con la hora de arranque arma el día completo.
  const inicio = campo("¿A qué hora vas a arrancar?", { type: "time", value: "06:00" });
  function planear(e) {
    e.preventDefault();
    const v = inicio.control.value;
    if (!/^\d{2}:\d{2}$/.test(v)) return inicio.marcar("Escribe la hora en que arrancas.");
    const base = new Date(); base.setHours(+v.slice(0, 2), +v.slice(3), 0, 0);
    const t0 = base.getTime(), dia = (ms) => horaCorta(new Date(ms)) + (new Date(ms).getDate() !== base.getDate() ? " (día siguiente)" : "");
    const pasos = [
      [t0, "Arrancas", ""], [t0 + 5 * H, "Pausa de 30 min", "A más tardar aquí; puede repartirse dentro de 5 h 30 min. Las pausas no se juntan."],
      [t0 + 5.5 * H, "Sigues manejando", "Llevas 5 h de manejo."], [t0 + 10.5 * H, "Pausa de 30 min", "Llevas 10 h de manejo."],
      [t0 + 11 * H, "Últimas 4 h", ""], [t0 + 15 * H, "Se acabó el manejo del día", "14 h al volante."],
      [t0 + 23 * H, "Puedes volver a arrancar", "Después de 8 h corridas de descanso."]];
    plan.replaceChildren(...pasos.map(([ms, t, d]) => el("li", null, el("span", { class: "hora" }, dia(ms)), el("strong", null, t), d ? el("span", { class: "suave" }, d) : null)));
  }

  cont.append(...encabezado("Horas de manejo", "NOM-087: pausas, tope de 14 h y descanso de 8 h."),
    tablero,
    el("h2", null, "Planea tu día"),
    el("form", { class: "caja", novalidate: true, onsubmit: planear }, inicio, el("button", { class: "principal" }, "Armar mi día"), plan),
    fuente("«Todo conductor debe realizar una pausa de 30 minutos cuando: a) Ha conducido hasta cinco horas continuas… b) Esta pausa podrá distribuirse durante un lapso de cinco horas y media» (num. 4.1). «Los periodos de pausa, en ningún caso podrán ser acumulables» (4.2). «El tiempo máximo de conducción en 24 horas nunca podrá exceder las 14 horas» (4.7). En rutas de hasta 14 h de conducción, pausa «no menor a 8 horas continuas» (4.6 a). La bitácora de horas de servicio la da el permisionario y se porta siempre (4.3).", [NOM087]));
  pintar();
  reloj = setInterval(pintar, 30e3);
  return () => clearInterval(reloj);
}

// Acciones del turno para el tablero de inicio.
export { manejado, siguientePausa, enPausa, duracion, faltaPausa, tramo, minutos };
export function turnoActual() { return estadoTurno(); }
export function arrancarTurno() {
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  guardar("turno", { inicio: Date.now(), pausas: [] }); vigilarTurno();
}
// Devuelve un aviso si la pausa terminó antes de juntar 30 min.
export function alternarPausa() {
  const t = estadoTurno(); if (!t || t.terminado) return null;
  let aviso = null;
  if (enPausa(t)) {
    const falta = faltaPausa(t);
    t.pausas[t.pausas.length - 1].fin = Date.now();
    if (falta > 0) aviso = "Tu pausa no completó 30 min: te faltan " + minutos(falta) + " min antes de las " + horaCorta(new Date(siguientePausa(t)));
  } else t.pausas.push({ ini: Date.now() });
  guardar("turno", t);
  return aviso;
}

// ───────── Físico-mecánica por placa ─────────
const VENTANAS = { 5: "enero a abril", 6: "enero a abril", 7: "marzo a junio", 8: "marzo a junio", 3: "mayo a agosto", 4: "mayo a agosto",
  1: "julio a octubre", 2: "julio a octubre", 9: "septiembre a diciembre", 0: "septiembre a diciembre" };
function vistaFisico(cont) {
  const placa = campo("Último número de tu placa", { inputmode: "numeric", maxlength: "1", placeholder: "7", autocomplete: "off", value: leer("placa", "") });
  const res = el("div", { class: "resultado", "aria-live": "polite" });
  function calcular(e) {
    e && e.preventDefault();
    const d = placa.control.value.trim();
    if (!/^[0-9]$/.test(d)) return e && placa.marcar("Escribe un solo número, del 0 al 9.");
    guardar("placa", d);
    const v = VENTANAS[d];
    res.replaceChildren(el("p", { class: "cifra" }, v[0].toUpperCase() + v.slice(1)),
      el("p", null, "Con placa terminada en " + d + " te toca la físico-mecánica de " + v + ", una vez al año, en una Unidad de Verificación aprobada por la SICT."),
      el("p", { class: "suave" }, "Si tu unidad es nueva, tiene 2 años de gracia desde su fabricación."));
  }
  cont.append(...encabezado("¿Cuándo me toca la físico-mecánica?", "NOM-068, según el último número de la placa."),
    el("form", { class: "caja", novalidate: true, onsubmit: calcular }, placa, el("button", { class: "principal" }, "Ver mis meses"), res),
    fuente("«Las verificaciones obligatorias referidas deberán realizarse una vez al año» (num. 5.3.4, fr. I). Vehículos nuevos exentos 2 años desde su fabricación (fr. II). Meses del calendario de verificación de 2016 en adelante (aviso DOF 15/05/2015). Para 2026 no hay prórroga publicada al 16/11/2026.", [NOM068]));
  if (placa.control.value) calcular();
}

// ───────── Humo por año-modelo ─────────
function vistaHumo(cont) {
  const anio = campo("Año-modelo de tu unidad", { inputmode: "numeric", maxlength: "4", placeholder: "2015", autocomplete: "off", value: leer("anio-modelo", "") });
  const res = el("div", { class: "resultado", "aria-live": "polite" });
  function calcular(e) {
    e && e.preventDefault();
    const t = anio.control.value.trim(), a = +t;
    if (!/^\d{4}$/.test(t) || a < 1950 || a > new Date().getFullYear() + 1) return e && anio.marcar("Escribe el año con cuatro números, por ejemplo 2015.");
    guardar("anio-modelo", t);
    const nuevo = a >= 1998;
    res.replaceChildren(el("p", { class: "cifra" }, nuevo ? "1.50 m⁻¹ · 47.5 %" : "2.25 m⁻¹ · 62 %"),
      el("p", null, "Tu unidad modelo " + a + " no puede pasar de " + (nuevo ? "1.50 m⁻¹ (47.53 % de opacidad)." : "2.25 m⁻¹ (61.99 % de opacidad).")),
      el("p", { class: "suave" }, "La verificación de humo es cada semestre. El segundo periodo de 2026 vence el 31 de diciembre."));
  }
  cont.append(...encabezado("¿Cuánto humo puede echar mi tracto?", "NOM-045, unidades de más de 3,856 kg."),
    el("form", { class: "caja", novalidate: true, onsubmit: calcular }, anio, el("button", { class: "principal" }, "Ver mi límite"), res),
    fuente("Tabla 2: «1997 y anteriores 2.25 [m⁻¹] 61.99 [%] · 1998 y posteriores 1.50 [m⁻¹] 47.53 [%]». Se pasa la prueba cuando la opacidad es igual o menor al máximo de tu año-modelo. Verificación semestral 2026: el segundo periodo vence el 31/12/2026.", [NOM045, AVISO_VERIF]));
  if (anio.control.value) calcular();
}

// ───────── Revisión antes de salir ─────────
const PUNTOS = [
  "Llantas de la dirección sin renovar.",
  "Llantas de los demás ejes con 1.6 mm (1/16\") o más de dibujo. Con menos de 0.8 mm o con las lonas a la vista es falla crítica.",
  "Balata remachada de 3.2 mm (1/8\") o más; adherida de 1.6 mm (1/16\") o más.",
  "Quinta rueda con juego horizontal de 9.6 mm (3/8\") o menos. Más de 12.5 mm (½\") o el perno rey mal trabado es falla crítica.",
  "Placa de la quinta rueda sin grietas ni soldaduras y tornillos de grado 8 o más.",
  "Bitácora de horas de servicio contigo (impresa o electrónica)."
];
function vistaPreviaje(cont) {
  const marcados = leer("previaje", []);
  const cuenta = el("p", { class: "resultado", "aria-live": "polite" });
  const lista = el("ul", { class: "lista check" }, ...PUNTOS.map((p, i) => el("li", null, el("label", null,
    el("input", { type: "checkbox", checked: marcados.includes(i), onchange: (e) => {
      const s = new Set(leer("previaje", [])); e.target.checked ? s.add(i) : s.delete(i); guardar("previaje", [...s]); contar(); } }),
    el("span", null, p)))));
  function contar() { const n = leer("previaje", []).length; cuenta.textContent = n === PUNTOS.length ? "Todo revisado. Buen viaje." : "Llevas " + n + " de " + PUNTOS.length + "."; }
  cont.append(...encabezado("Revisión antes de salir", "Aunque traigas la calcomanía vigente, en un retén te pueden revisar y, con una falla crítica, no sigues (NOM-068, 5.2.1.1)."),
    el("div", { class: "caja" }, lista, cuenta,
      el("div", { class: "botones" }, el("button", { class: "secundario", onclick: () => { guardar("previaje", []); lista.querySelectorAll("input").forEach((c) => { c.checked = false; }); contar(); } }, "Empezar de nuevo"))),
    fuente("Tablas de llantas y ruedas (LXXVII), frenos y quinta rueda (LXXIX). Es un recordatorio de lo que más rechazan; no sustituye la verificación en una Unidad de Verificación aprobada.", [NOM068]));
  contar();
}

// ───────── Velocidades y alcohol ─────────
function vistaVelocidades(cont) {
  cont.append(...encabezado("Velocidades y alcohol", "Lo que marca el Reglamento si no hay señal que diga otra cosa."),
    el("div", { class: "caja" },
      el("p", { class: "cifra" }, "80 km/h de día"), el("p", { class: "cifra" }, "70 km/h de noche"), el("p", null, "Camión y tractocamión en carretera. En tramo urbano, 50 km/h (art. 134)."),
      el("p", { class: "aviso" }, "Desde agosto de 2026 la multa por exceso puede llegar por radar o fotomulta (art. 136 Bis)."),
      el("p", null, el("strong", null, "Alcohol: 0.0 mg/L en aire espirado "), "para el autotransporte. Negarte a la prueba se sanciona igual (art. 93)."),
      el("p", null, "Con niebla, granizo, hielo, nieve o lluvia intensa, el full y el tractocamión articulado no deben circular, y nunca en convoy (art. 102).")),
    fuente("Art. 134: «III. Camión y Tractocamión 50 50 Carretera Urbana 80 70 Carretera». Art. 93: prohibido conducir con «alcohol en aire expirado superior a 0.0 miligramos por litro». Reformas DOF 25/05/2026 y 13/08/2026.", [REGLAMENTO]));
}

export const HERRAMIENTAS_NORMAS = [
  { id: "horas", titulo: "Horas de manejo", icono: "reloj", grupo: "Camino", vista: vistaHoras },
  { id: "previaje", titulo: "Revisión antes de salir", icono: "palomita", grupo: "Camino", vista: vistaPreviaje },
  { id: "velocidades", titulo: "Velocidades y alcohol", icono: "velocimetro", grupo: "Camino", vista: vistaVelocidades },
  { id: "fisico", titulo: "Físico-mecánica", icono: "llave", grupo: "Trámites", vista: vistaFisico },
  { id: "humo", titulo: "Límite de humo", icono: "humo", grupo: "Trámites", vista: vistaHumo }
];
