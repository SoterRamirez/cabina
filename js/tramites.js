// Trámites, avisos y emergencias. Fuentes: DOF y sitios gob.mx (revisados el 16 y el 18/11/2026).
import { el, leer, guardar, campo, fuente, encabezado, fechaCorta, diaDesdeISO, copiar } from "./ui.js";

const APTO = ["Acuerdo del Mes del Apto Médico, DOF 13/11/2026", "https://dof.gob.mx/nota_detalle.php?codigo=5803765&fecha=13/11/2026"];
const IAVE = ["Lineamientos IAVE, DOF 29/07/2026", "https://dof.gob.mx/nota_detalle.php?codigo=5794972&fecha=29/07/2026"];

// ───────── Mi constancia y mi licencia ─────────
function diasPara(iso) { const h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((diaDesdeISO(iso) - h) / 864e5); }
function estadoVence(nombre, iso) {
  if (!iso) return null;
  const d = diasPara(iso), fecha = fechaCorta(diaDesdeISO(iso));
  if (d < 0) return el("p", { class: "alerta" }, nombre + " venció el " + fecha + ". No debes manejar con ella vencida.");
  if (d <= 30) return el("p", { class: "alerta" }, nombre + " vence en " + d + " días (" + fecha + "). Tramítala ya.");
  if (d <= 90) return el("p", { class: "aviso" }, nombre + " vence en " + d + " días (" + fecha + "). Ve preparando el trámite.");
  return el("p", { class: "ok" }, nombre + " vigente: faltan " + d + " días (" + fecha + ").");
}
function vistaConstancia(cont) {
  const datos = leer("vencimientos", {});
  const constancia = campo("Vencimiento de tu constancia de aptitud psicofísica", { type: "date", value: datos.constancia || "" }, "Viene impresa en tu constancia.");
  const licencia = campo("Vencimiento de tu licencia federal", { type: "date", value: datos.licencia || "" }, "Viene en tu licencia.");
  const res = el("div", { "aria-live": "polite" });
  function pintar() {
    const d = leer("vencimientos", {});
    res.replaceChildren(estadoVence("Tu constancia", d.constancia) || "", estadoVence("Tu licencia", d.licencia) || "");
  }
  function guardarFechas(e) {
    e.preventDefault();
    if (!constancia.control.value && !licencia.control.value) return constancia.marcar("Escribe al menos una fecha.");
    guardar("vencimientos", { constancia: constancia.control.value, licencia: licencia.control.value });
    pintar();
  }
  cont.append(...encabezado("Mi constancia y mi licencia", "Guarda tus fechas y Cabina te dice cuánto te queda. Se guardan solo en tu celular."),
    el("form", { class: "caja", novalidate: true, onsubmit: guardarFechas }, el("div", { class: "fila" }, constancia, licencia),
      el("button", { class: "principal" }, "Guardar y revisar"), res),
    el("p", { class: "aviso" }, "Mes del Apto Médico 2026: del 17 de noviembre al 17 de diciembre, de lunes a viernes de 8:00 a 16:00, en 46 sedes. Cuesta $2,248 (e5cinco). Con la constancia nueva tienes 90 días naturales para tramitar la licencia federal."),
    el("a", { class: "boton secundario", href: "#/sedes" }, "Ver las 46 sedes"),
    fuente("Acuerdo de la SICT publicado el 13/11/2026: renovación de la constancia en jornada, vigencia de 2 años con vencimiento el 31 de diciembre y 90 días naturales para tramitar la licencia federal. Registro previo en micrs.sct.gob.mx.", [APTO]));
  pintar();
}

// ───────── Sedes del Mes del Apto Médico ─────────
function vistaSedes(cont) {
  const buscar = campo("Busca tu ciudad o estado", { type: "search", placeholder: "Querétaro", autocomplete: "off" });
  const lista = el("ul", { class: "lista", "aria-live": "polite" });
  const cuenta = el("p", { class: "suave" });
  let sedes = [];
  const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  function pintar() {
    const q = sinAcentos(buscar.control.value.trim());
    const f = sedes.filter((s) => !q || sinAcentos(s.nombre + " " + s.direccion).includes(q));
    cuenta.textContent = f.length + " de " + sedes.length + " sedes";
    lista.replaceChildren(...f.map((s) => el("li", null, el("div", { class: "dato" }, el("strong", null, s.nombre), el("br"), el("span", { class: "suave" }, s.direccion)),
      el("a", { class: "boton secundario", href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.direccion), target: "_blank", rel: "noopener", "aria-label": "Abrir " + s.nombre + " en el mapa" }, "Mapa"))));
  }
  buscar.control.addEventListener("input", pintar);
  cont.append(...encabezado("Sedes del Mes del Apto Médico", "Las 46 sedes del acuerdo del DOF, del 17 de noviembre al 17 de diciembre de 2026."),
    el("div", { class: "caja" }, buscar, cuenta, lista),
    fuente("Punto TERCERO del acuerdo de la SICT (DOF 13/11/2026). La lista del DOF trae la numeración con errores; aquí van por nombre. La cita se pide en micrs.sct.gob.mx y llega por correo.", [APTO]));
  fetch("datos/sedes-apto-medico.json").then((r) => r.json()).then((d) => { sedes = d.sedes; pintar(); })
    .catch(() => { cuenta.textContent = "No se pudieron cargar las sedes. Abre Cabina una vez con señal para guardarlas."; });
}

// ───────── ¿Es real el mensaje de la SICT? ─────────
// Dominios conocidos que no son de gobierno: se avisan en azul, sin hacerlos pasar por oficiales.
// Solo cuenta el dominio exacto o lo que termina en «.dominio» (blog.soterramirez.dev sí; soterramirez.dev.pagos.com no).
const CONOCIDOS = [
  ["soterramirez.dev", "el sitio de Soter Ramírez (autor de Cabina)"],
  ["vendotractos.com", "el sitio de Vendotractos, distribuidor de camiones FAW"],
  ["alfatraslados.com", "el sitio de Alfa Traslados, traslado de unidades"],
  ["autotransportescrees.com", "el sitio de Autotransporte CRES"]
];
const conocido = (h) => CONOCIDOS.find(([d]) => h === d || h.endsWith("." + d));
const esGobierno = (h) => h === "gob.mx" || h.endsWith(".gob.mx");
const PALABRAS_FRAUDE = ["suspension de placas", "suspensión de placas", "multa pendiente", "pague hoy", "último aviso", "ultimo aviso", "bloqueo", "cancelacion de licencia", "cancelación de licencia"];
function vistaSict(cont) {
  const texto = campo("Pega aquí el mensaje o el enlace que te llegó", { tag: "textarea", placeholder: "Pega el mensaje de WhatsApp o SMS" });
  const res = el("div", { class: "resultado", "aria-live": "polite" });
  function revisar(e) {
    e.preventDefault();
    const t = texto.control.value.trim();
    if (!t) return texto.marcar("Pega el mensaje para revisarlo.");
    // Se aceptan letras de cualquier alfabeto para detectar imitaciones como «ѕict.gob.mx» con una «ѕ» cirílica.
    const urls = t.match(/(https?:\/\/)?([\p{L}\p{N}-]+\.)+[\p{L}]{2,}(\/[^\s]*)?/giu) || [];
    const hosts = urls.map((u) => { try { return new URL(/^https?:/i.test(u) ? u : "https://" + u).hostname.toLowerCase(); } catch { return u.toLowerCase(); } });
    // Se muestra tal como viene en el mensaje (con la letra falsa), no en su forma técnica «xn--…».
    const tal = urls.map((u) => u.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase());
    const imitaciones = [...new Set(tal.filter((h) => /[^\x00-\x7F]/.test(h) || /(^|\.)xn--/.test(h)))];
    const hostsImitados = new Set(hosts.filter((h, i) => imitaciones.includes(tal[i])));
    const unicos = [...new Set(hosts)].filter((h) => !hostsImitados.has(h));
    const gob = unicos.filter(esGobierno), conocidos = unicos.filter((h) => !esGobierno(h) && conocido(h));
    const malos = unicos.filter((h) => !esGobierno(h) && !conocido(h));
    const presion = PALABRAS_FRAUDE.filter((p) => t.toLowerCase().includes(p));
    const out = [];
    if (imitaciones.length) out.push(el("p", { class: "alerta" }, "Ojo: este enlace usa letras de otro alfabeto para parecer oficial: " + imitaciones.join(", ") + ". Es una trampa común: no lo abras."));
    if (malos.length) out.push(el("p", { class: "alerta" }, "Ojo: este enlace NO es de gobierno: " + malos.join(", ") + ". No lo abras ni pagues nada ahí."));
    conocidos.forEach((h) => out.push(el("p", { class: "info" }, h + " es " + conocido(h)[1] + ", no de gobierno. Ahí no se hacen trámites de la SICT ni se pagan multas o placas.")));
    if (gob.length) out.push(el("p", { class: "ok" }, "Los enlaces terminan en .gob.mx: " + gob.join(", ") + ". Aun así, entra escribiendo tú la dirección."));
    if (!unicos.length && !imitaciones.length) out.push(el("p", null, "No encontré enlaces en el mensaje."));
    if (presion.length) out.push(el("p", { class: "aviso" }, "Usa frases de presión típicas de fraude: «" + presion.join("», «") + "»."));
    out.push(el("p", { class: "suave" }, "Para el Mes del Apto Médico el único registro válido es micrs.sct.gob.mx. La SICT no te va a pedir pagos por WhatsApp."));
    res.replaceChildren(...out);
  }
  // En el celular pegar con el dedo cuesta: un botón trae lo copiado (el iPhone pide permiso la primera vez).
  async function pegar() {
    try {
      const t = await navigator.clipboard.readText();
      if (!t) return texto.marcar("No hay nada copiado. Copia el mensaje en WhatsApp y vuelve.");
      texto.control.value = t; texto.marcar("");
      revisar(new Event("submit"));
    } catch { texto.marcar("Tu celular no dejó pegar desde aquí. Deja presionado el recuadro y elige «Pegar»."); }
  }
  cont.append(...encabezado("¿Es real el mensaje de la SICT?", "Revisa si un aviso de «suspensión de placas» o de multas trae un enlace oficial."),
    el("form", { class: "caja", novalidate: true, onsubmit: revisar }, texto,
      el("div", { class: "botones" },
        navigator.clipboard && navigator.clipboard.readText ? el("button", { type: "button", class: "principal", onclick: pegar }, "Pegar y revisar") : null,
        el("button", { class: navigator.clipboard && navigator.clipboard.readText ? "secundario" : "principal" }, "Revisar mensaje")), res,
      el("p", { class: "suave" }, "Lo que pegas se revisa en tu celular; no se manda a ningún lado.")),
    fuente("Los sitios del gobierno federal terminan en .gob.mx. Para la jornada del apto médico, el registro es micrs.sct.gob.mx (verificado el 14/11/2026).", [APTO]));
}

// ───────── Doble cobro IAVE ─────────
function vistaIave(cont) {
  const d = leer("iave-ultimo", {});
  const plaza = campo("Plaza de cobro (caseta)", { placeholder: "Palmillas", value: d.plaza || "" });
  const carril = campo("Carril", { inputmode: "numeric", placeholder: "4", value: d.carril || "" });
  const fecha = campo("Fecha del cruce", { type: "date", value: d.fecha || "" });
  const hora = campo("Hora del cruce (con minutos)", { type: "time", value: d.hora || "" });
  const tag = campo("Número de tu TAG IAVE", { inputmode: "numeric", placeholder: "Opcional", value: d.tag || "" }, "Ayuda a que ubiquen el cargo.");
  const nombre = campo("Tu nombre", { autocomplete: "name", value: d.nombre || "" });
  const res = el("div", { class: "resultado", "aria-live": "polite" });
  function armar(e) {
    e.preventDefault();
    for (const [c, m] of [[plaza, "Escribe la caseta."], [carril, "Escribe el carril."], [fecha, "Escribe la fecha."], [hora, "Escribe la hora con minutos."]])
      if (!c.control.value.trim()) return c.marcar(m);
    const v = { plaza: plaza.control.value.trim(), carril: carril.control.value.trim(), fecha: fecha.control.value, hora: hora.control.value, tag: tag.control.value.trim(), nombre: nombre.control.value.trim() };
    guardar("iave-ultimo", v);
    const asunto = "Aclaración por cruce duplicado IAVE - " + v.plaza + " " + v.fecha;
    const cuerpo = "Buen día.\n\nSolicito la aclaración de un cruce duplicado en telepeaje IAVE:\n\n" +
      "- Plaza de cobro: " + v.plaza + "\n- Carril: " + v.carril + "\n- Fecha: " + fechaCorta(diaDesdeISO(v.fecha)) + "\n- Hora: " + v.hora + "\n" +
      (v.tag ? "- TAG IAVE: " + v.tag + "\n" : "") + "\nAdjunto el estado de cuenta o la captura donde aparecen los dos cargos.\n\nGracias.\n" + (v.nombre || "");
    const mailto = "mailto:aclaracionesiave@capufe.gob.mx?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
    res.replaceChildren(el("p", null, el("strong", null, "Tu correo está listo.")), el("pre", { style: "white-space:pre-wrap;font:15px/1.5 var(--mono);margin:8px 0" }, cuerpo),
      el("div", { class: "botones" }, el("a", { class: "boton principal", href: mailto }, "Abrir en mi correo"), el("button", { type: "button", class: "secundario", onclick: () => copiar("Para: aclaracionesiave@capufe.gob.mx\nAsunto: " + asunto + "\n\n" + cuerpo) }, "Copiar texto")),
      el("p", { class: "suave" }, "Adjunta tu estado de cuenta o la captura con los dos cargos."));
  }
  cont.append(...encabezado("Doble cobro en IAVE", "Arma el correo de aclaración con los datos que pide CAPUFE."),
    el("form", { class: "caja", novalidate: true, onsubmit: armar }, el("div", { class: "fila" }, plaza, carril, fecha, hora, tag, nombre),
      el("button", { class: "principal" }, "Armar mi correo"), res),
    el("p", { class: "aviso" }, "Si pagaste en efectivo y en menos de 90 segundos también te cobraron por telepeaje, guarda tu comprobante: ese caso también se aclara."),
    el("p", { class: "suave" }, "No te damos un plazo: el lineamiento dice 60 días hábiles en un punto y 1 día hábil en otro. Mándalo cuanto antes."),
    fuente("VII.4.4.I, cruces duplicados: «enviar al correo electrónico aclaracionesiave@capufe.gob.mx, la información de los cruces duplicados que coincidan en fecha, horario (hora y minutos), Plaza de Cobro y carril». VII.4.4.IV: comprobante en efectivo y cargo por telepeaje «dentro de un periodo máximo de 90 segundos».", [IAVE]));
}

// ───────── Números de emergencia ─────────
const NUMEROS = [
  ["911", "Emergencias", "Accidente, herido, incendio o peligro inmediato.", "https://www.gob.mx/sct/articulos/79793"],
  ["088", "Guardia Nacional", "Incidentes en carreteras y casetas, asaltos y denuncias. Gratis, las 24 h.", "https://www.gob.mx/guardianacional/acciones-y-programas/denuncia-por-internet-ante-la-guardia-nacional"],
  ["074", "CAPUFE", "Auxilio en las autopistas que opera CAPUFE: desperfectos y accidentes. Las 24 h.", "https://www.gob.mx/capufe/es/articulos/central-de-atencion-a-usuarios-cau"],
  ["078", "Ángeles Verdes", "Auxilio mecánico gratis en carretera, de 8:00 a 20:00 h.", "https://www.gob.mx/sectur/angelesverdes/articulos/puntos-de-asistencia-carretera?idiom=es"],
  ["089", "Denuncia anónima", "Para denunciar sin dar tu nombre.", "https://www.gob.mx/sict/prensa/recomienda-sict-cinco-medidas-de-seguridad-al-circular-por-carreteras-este-periodo-vacacional"]
];
function vistaEmergencia(cont) {
  cont.append(...encabezado("Números de emergencia", "Toca para llamar. Son gratis."),
    ...NUMEROS.map(([n, quien, que, src]) => el("div", { class: "caja telefono" },
      el("div", null, el("p", { style: "margin:0" }, el("span", { class: "numero" }, n), " · ", el("strong", null, quien)), el("p", { class: "suave", style: "margin:4px 0 0" }, que),
        el("a", { href: src, target: "_blank", rel: "noopener", style: "font-size:13px" }, "Fuente: gob.mx")),
      el("a", { class: "boton principal", href: "tel:" + n, "aria-label": "Llamar al " + n + ", " + quien }, "Llamar"))),
    el("p", { class: "suave" }, "Para los números cortos (074, 078) tu compañía telefónica debe tener activada la marcación corta. Revisado en sitios gob.mx el 18/11/2026."));
}

export const HERRAMIENTAS_TRAMITES = [
  { id: "emergencia", titulo: "Emergencias", icono: "telefono", grupo: "Camino", vista: vistaEmergencia, urgente: true },
  { id: "iave", titulo: "Doble cobro IAVE", icono: "recibo", grupo: "Trámites", vista: vistaIave },
  { id: "constancia", titulo: "Constancia y licencia", icono: "credencial", grupo: "Trámites", vista: vistaConstancia },
  { id: "sedes", titulo: "Sedes apto médico", icono: "ubicacion", grupo: "Trámites", vista: vistaSedes },
  { id: "sict", titulo: "¿Mensaje SICT real?", icono: "escudo", grupo: "Trámites", vista: vistaSict }
];
