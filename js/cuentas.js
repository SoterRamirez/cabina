// Cuentas del viaje: diésel, convertidor, gastos, ganancia y bitácora. Todo se guarda solo en el celular.
import { el, leer, guardar, campo, encabezado, pesos, numero, aNumero, fechaCorta, horaCorta, hoyISO, diaDesdeISO, csv, compartirArchivo, copiar } from "./ui.js";

function validar(pares) {
  for (const [c, msg, min = 0] of pares) {
    const n = aNumero(c.control.value);
    if (!isFinite(n) || n <= min) { c.marcar(msg); return null; }
  }
  return pares.map(([c]) => aNumero(c.control.value));
}

// ───────── Diésel ─────────
function vistaDiesel(cont) {
  const g = leer("diesel", {});
  const km = campo("Kilómetros recorridos", { inputmode: "decimal", placeholder: "850", value: g.km || "" });
  const litros = campo("Litros que cargaste", { inputmode: "decimal", placeholder: "340", value: g.litros || "" });
  const precio = campo("Precio por litro", { inputmode: "decimal", placeholder: "26.50", value: g.precio || "" });
  const res1 = el("div", { class: "resultado", "aria-live": "polite" });
  function rendimiento(e) {
    e.preventDefault();
    const v = validar([[km, "Escribe los kilómetros."], [litros, "Escribe los litros."]]); if (!v) return;
    const p = aNumero(precio.control.value);
    guardar("diesel", { ...leer("diesel", {}), km: km.control.value, litros: litros.control.value, precio: precio.control.value });
    const r = v[0] / v[1];
    res1.replaceChildren(el("p", { class: "cifra" }, numero(r) + " km por litro"),
      isFinite(p) && p > 0 ? el("p", null, "Gastaste " + pesos(v[1] * p) + " en diésel: " + pesos((v[1] * p) / v[0]) + " por kilómetro.") : el("p", { class: "suave" }, "Pon el precio por litro para ver cuánto te costó."));
  }
  const kmViaje = campo("Kilómetros del próximo viaje", { inputmode: "decimal", placeholder: "1200", value: g.kmViaje || "" });
  const rend = campo("Tu rendimiento (km por litro)", { inputmode: "decimal", placeholder: "2.5", value: g.rend || "" });
  const precio2 = campo("Precio por litro", { inputmode: "decimal", placeholder: "26.50", value: g.precio || "" });
  const res2 = el("div", { class: "resultado", "aria-live": "polite" });
  function viaje(e) {
    e.preventDefault();
    const v = validar([[kmViaje, "Escribe los kilómetros del viaje."], [rend, "Escribe tu rendimiento."], [precio2, "Escribe el precio por litro."]]); if (!v) return;
    guardar("diesel", { ...leer("diesel", {}), kmViaje: kmViaje.control.value, rend: rend.control.value, precio: precio2.control.value });
    const l = v[0] / v[1];
    res2.replaceChildren(el("p", { class: "cifra" }, numero(l, 0) + " litros"), el("p", null, "Costo aproximado de diésel: " + pesos(l * v[2]) + "."));
  }
  cont.append(...encabezado("Diésel", "Rendimiento real y costo del viaje."),
    el("h2", null, "¿Cuánto rindió?"), el("form", { class: "caja", novalidate: true, onsubmit: rendimiento }, el("div", { class: "fila" }, km, litros, precio), el("button", { class: "principal" }, "Calcular rendimiento"), res1),
    el("h2", null, "¿Cuánto diésel voy a necesitar?"), el("form", { class: "caja", novalidate: true, onsubmit: viaje }, el("div", { class: "fila" }, kmViaje, rend, precio2), el("button", { class: "principal" }, "Calcular viaje"), res2));
}

// ───────── Convertidor ─────────
const UNIDADES = [
  ["mm", "pulgadas", 1 / 25.4, "Dibujo de llanta, balatas, juego de quinta rueda"],
  ["kg", "libras", 2.20462262, "Peso de la carga"],
  ["toneladas", "libras", 2204.62262, "Peso bruto"],
  ["psi", "bar", 0.0689475729, "Presión de llantas y aire de frenos"],
  ["km", "millas", 0.621371192, "Distancias"],
  ["litros", "galones (EUA)", 0.264172052, "Combustible"],
  ["km/h", "mph", 0.621371192, "Velocidad"]
];
function vistaConvertir(cont) {
  const tipo = campo("¿Qué quieres convertir?", { tag: "select", opciones: UNIDADES.map(([a, b], i) => [i, a + " ↔ " + b]) });
  const valor = campo("Cantidad", { inputmode: "decimal", placeholder: "12.5" });
  const res = el("div", { class: "resultado", "aria-live": "polite" });
  function calcular() {
    const [a, b, f, uso] = UNIDADES[+tipo.control.value];
    const n = aNumero(valor.control.value);
    if (!isFinite(n)) { res.replaceChildren(); return; }
    res.replaceChildren(el("p", { class: "cifra" }, numero(n) + " " + a + " = " + numero(n * f, 3) + " " + b),
      el("p", null, numero(n) + " " + b + " = " + numero(n / f, 3) + " " + a), el("p", { class: "suave" }, uso));
  }
  tipo.control.addEventListener("change", calcular); valor.control.addEventListener("input", calcular);
  cont.append(...encabezado("Convertidor", "Medidas que salen en normas, manuales y básculas."),
    el("form", { class: "caja", novalidate: true, onsubmit: (e) => { e.preventDefault(); if (!isFinite(aNumero(valor.control.value))) return valor.marcar("Escribe una cantidad."); calcular(); } },
      tipo, valor, el("button", { class: "principal" }, "Convertir"), res));
}

// ───────── Gastos del viaje ─────────
const CATEGORIAS = ["Casetas", "Diésel", "Comida", "Hospedaje", "Maniobras", "Reparación", "Pensión", "Otro"];
function vistaGastos(cont) {
  const viaje = () => leer("gastos", { nombre: "", anticipo: "", items: [] });
  const nombre = campo("Viaje", { placeholder: "Texcoco – Monterrey", value: viaje().nombre });
  const anticipo = campo("Anticipo que te dieron", { inputmode: "decimal", placeholder: "8000", value: viaje().anticipo });
  const categoria = campo("Concepto", { tag: "select", opciones: CATEGORIAS.map((c) => [c, c]) });
  const monto = campo("Monto", { inputmode: "decimal", placeholder: "450" });
  const nota = campo("Nota", { placeholder: "Caseta Palmillas", autocomplete: "off" }, "Opcional.");
  const lista = el("ul", { class: "lista" });
  const resumen = el("div", { class: "resultado", "aria-live": "polite" });
  function guardarCabecera() { const v = viaje(); v.nombre = nombre.control.value; v.anticipo = anticipo.control.value; guardar("gastos", v); pintar(); }
  nombre.control.addEventListener("change", guardarCabecera); anticipo.control.addEventListener("change", guardarCabecera);
  function agregar(e) {
    e.preventDefault();
    const n = aNumero(monto.control.value);
    if (!isFinite(n) || n <= 0) return monto.marcar("Escribe el monto.");
    const v = viaje(); v.items.unshift({ cat: categoria.control.value, monto: n, nota: nota.control.value.trim(), fecha: Date.now() });
    guardar("gastos", v); monto.control.value = ""; nota.control.value = ""; monto.control.focus(); pintar();
  }
  function borrar(i) { const v = viaje(); v.items.splice(i, 1); guardar("gastos", v); pintar(); }
  function pintar() {
    const v = viaje(), total = v.items.reduce((s, x) => s + x.monto, 0), ant = aNumero(v.anticipo), saldo = (isFinite(ant) ? ant : 0) - total;
    const porCat = {}; v.items.forEach((x) => { porCat[x.cat] = (porCat[x.cat] || 0) + x.monto; });
    lista.replaceChildren(...v.items.map((x, i) => el("li", null, el("div", { class: "dato" }, el("strong", null, x.cat + " · " + pesos(x.monto)), el("br"),
      el("span", { class: "suave" }, fechaCorta(new Date(x.fecha)) + " " + horaCorta(new Date(x.fecha)) + (x.nota ? " · " + x.nota : ""))),
      el("button", { class: "secundario", onclick: () => borrar(i), "aria-label": "Borrar gasto de " + x.cat + " por " + pesos(x.monto) }, "Borrar"))));
    resumen.replaceChildren(el("table", { class: "tabla" }, el("tbody", null,
      ...Object.entries(porCat).map(([c, m]) => el("tr", null, el("td", null, c), el("td", null, pesos(m)))),
      el("tr", null, el("td", null, el("strong", null, "Total de gastos")), el("td", null, el("strong", null, pesos(total)))),
      el("tr", null, el("td", null, "Anticipo"), el("td", null, pesos(isFinite(ant) ? ant : 0))))),
      el("p", { class: "cifra", style: "margin-top:8px" }, saldo >= 0 ? "Te sobran " + pesos(saldo) : "Te deben " + pesos(-saldo)),
      el("p", { class: "suave" }, saldo >= 0 ? "Lo que regresas al liquidar." : "Lo que pusiste de tu bolsa."));
  }
  function textoResumen() {
    const v = viaje(), total = v.items.reduce((s, x) => s + x.monto, 0), ant = aNumero(v.anticipo) || 0;
    return "Gastos del viaje " + (v.nombre || "") + "\n" + v.items.slice().reverse().map((x) => "- " + fechaCorta(new Date(x.fecha)) + " " + x.cat + ": " + pesos(x.monto) + (x.nota ? " (" + x.nota + ")" : "")).join("\n") +
      "\nTotal: " + pesos(total) + "\nAnticipo: " + pesos(ant) + "\nSaldo: " + pesos(ant - total) + "\n\nHecho con Cabina · soterramirez.dev/herramientas";
  }
  cont.append(...encabezado("Gastos del viaje", "Anota cada gasto y llega a la liquidación con las cuentas claras."),
    el("div", { class: "caja" }, el("div", { class: "fila" }, nombre, anticipo)),
    el("form", { class: "caja", novalidate: true, onsubmit: agregar }, el("div", { class: "fila" }, categoria, monto), nota, el("button", { class: "principal" }, "Agregar gasto")),
    resumen, el("div", { class: "caja" }, lista),
    el("div", { class: "botones" },
      el("button", { class: "secundario", onclick: () => copiar(textoResumen()) }, "Copiar resumen"),
      el("button", { class: "secundario", onclick: () => { const v = viaje(); compartirArchivo("gastos-" + hoyISO() + ".csv", csv([["Fecha", "Concepto", "Monto", "Nota"], ...v.items.slice().reverse().map((x) => [fechaCorta(new Date(x.fecha)), x.cat, x.monto, x.nota])]), "text/csv", "Gastos del viaje"); } }, "Exportar a Excel"),
      el("button", { class: "peligro", onclick: () => { if (confirm("¿Cerrar este viaje y borrar sus gastos? Exporta antes si los necesitas.")) { guardar("gastos", { nombre: "", anticipo: "", items: [] }); nombre.control.value = ""; anticipo.control.value = ""; pintar(); } } }, "Cerrar viaje")));
  pintar();
}

// ───────── ¿Cuánto gano por kilómetro? ─────────
function vistaGanancia(cont) {
  const g = leer("ganancia", {});
  const pago = campo("Lo que te pagan por el viaje", { inputmode: "decimal", placeholder: "6500", value: g.pago || "" });
  const km = campo("Kilómetros del viaje (ida y vuelta)", { inputmode: "decimal", placeholder: "1800", value: g.km || "" });
  const horas = campo("Horas reales (manejo, espera y carga)", { inputmode: "decimal", placeholder: "40", value: g.horas || "" });
  const gastos = campo("Gastos que pones tú y no te reponen", { inputmode: "decimal", placeholder: "0", value: g.gastos || "" }, "Comidas, regaderas, etc. Opcional.");
  const res = el("div", { class: "resultado", "aria-live": "polite" });
  function calcular(e) {
    e.preventDefault();
    const v = validar([[pago, "Escribe lo que te pagan."], [km, "Escribe los kilómetros."], [horas, "Escribe las horas."]]); if (!v) return;
    const gs = aNumero(gastos.control.value); const neto = v[0] - (isFinite(gs) ? gs : 0);
    guardar("ganancia", { pago: pago.control.value, km: km.control.value, horas: horas.control.value, gastos: gastos.control.value });
    res.replaceChildren(el("p", { class: "cifra" }, pesos(neto / v[1]) + " por km"), el("p", { class: "cifra" }, pesos(neto / v[2]) + " por hora"),
      el("p", null, "Te quedan " + pesos(neto) + " limpios del viaje."), el("p", { class: "suave" }, "Compáralo entre viajes y ofertas de trabajo: las horas de espera también cuentan."));
  }
  cont.append(...encabezado("¿Cuánto gano por kilómetro?", "Para comparar viajes y ofertas con números."),
    el("form", { class: "caja", novalidate: true, onsubmit: calcular }, el("div", { class: "fila" }, pago, km, horas, gastos), el("button", { class: "principal" }, "Calcular"), res));
}

// ───────── Bitácora personal ─────────
const TIPOS = ["Salida", "Llegada", "Carga", "Descarga", "Parada", "Pausa", "Descanso", "Revisión / retén", "Falla", "Otro"];
function vistaBitacora(cont) {
  const tipo = campo("¿Qué pasó?", { tag: "select", opciones: TIPOS.map((t) => [t, t]) });
  const lugar = campo("Lugar", { placeholder: "Caseta San Martín / km 120", autocomplete: "off" });
  const km = campo("Odómetro", { inputmode: "numeric", placeholder: "Opcional" });
  const nota = campo("Nota", { tag: "textarea", placeholder: "Opcional" });
  const lista = el("ul", { class: "lista" });
  const registros = () => leer("bitacora", []);
  function agregar(e) {
    e.preventDefault();
    if (!lugar.control.value.trim()) return lugar.marcar("Escribe dónde estás.");
    const r = registros(); r.unshift({ t: Date.now(), tipo: tipo.control.value, lugar: lugar.control.value.trim(), km: km.control.value.trim(), nota: nota.control.value.trim() });
    guardar("bitacora", r.slice(0, 2000)); lugar.control.value = ""; km.control.value = ""; nota.control.value = ""; pintar();
  }
  function pintar() {
    const r = registros();
    lista.replaceChildren(...(r.length ? r.slice(0, 100).map((x, i) => el("li", null, el("div", { class: "dato" },
      el("strong", null, x.tipo + " · " + horaCorta(new Date(x.t))), " ", el("span", { class: "suave" }, fechaCorta(new Date(x.t))), el("br"),
      x.lugar, x.km ? " · " + x.km + " km" : "", x.nota ? el("span", { class: "suave" }, el("br"), x.nota) : ""),
      el("button", { class: "secundario", onclick: () => { if (confirm("¿Borrar este registro?")) { const a = registros(); a.splice(i, 1); guardar("bitacora", a); pintar(); } }, "aria-label": "Borrar " + x.tipo + " de " + horaCorta(new Date(x.t)) }, "Borrar")))
      : [el("li", { class: "suave" }, "Todavía no hay registros.")]));
  }
  cont.append(...encabezado("Bitácora personal", "Tus propios apuntes del viaje, con hora automática."),
    el("p", { class: "aviso" }, "Es para tu control. No sustituye la bitácora de horas de servicio que te da la empresa (NOM-087)."),
    el("form", { class: "caja", novalidate: true, onsubmit: agregar }, el("div", { class: "fila" }, tipo, km), lugar, nota, el("button", { class: "principal" }, "Anotar ahora")),
    el("div", { class: "caja" }, lista),
    el("div", { class: "botones" }, el("button", { class: "secundario", onclick: () => compartirArchivo("bitacora-" + hoyISO() + ".csv",
      csv([["Fecha", "Hora", "Tipo", "Lugar", "Odómetro", "Nota"], ...registros().slice().reverse().map((x) => [fechaCorta(new Date(x.t)), horaCorta(new Date(x.t)), x.tipo, x.lugar, x.km, x.nota])]), "text/csv", "Bitácora") }, "Exportar a Excel")));
  pintar();
}

export const HERRAMIENTAS_CUENTAS = [
  { id: "gastos", titulo: "Gastos del viaje", icono: "💵", grupo: "Cuentas y bitácora", vista: vistaGastos },
  { id: "bitacora", titulo: "Bitácora personal", icono: "📒", grupo: "Cuentas y bitácora", vista: vistaBitacora },
  { id: "diesel", titulo: "Diésel", icono: "⛽", grupo: "Cuentas y bitácora", vista: vistaDiesel },
  { id: "ganancia", titulo: "Ganancia por km", icono: "📈", grupo: "Cuentas y bitácora", vista: vistaGanancia },
  { id: "convertir", titulo: "Convertidor", icono: "📏", grupo: "Cuentas y bitácora", vista: vistaConvertir }
];
