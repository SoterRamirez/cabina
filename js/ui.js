// Ayudantes compartidos de Cabina: elementos, guardado local, formatos y avisos.

export function el(tag, props, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v; // solo con texto propio, nunca con lo que escribe el usuario
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h.nodeType ? h : String(h));
  return e;
}

// Todo se guarda solo en este celular, con el prefijo «cabina:».
const PREFIJO = "cabina:";
export function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(PREFIJO + clave);
    return v == null ? porDefecto : JSON.parse(v);
  } catch { return porDefecto; }
}
export function guardar(clave, valor) {
  try { localStorage.setItem(PREFIJO + clave, JSON.stringify(valor)); return true; }
  catch { avisar("No se pudo guardar. Revisa el espacio de tu celular."); return false; }
}
export function todasLasClaves() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(PREFIJO)) out[k.slice(PREFIJO.length)] = JSON.parse(localStorage.getItem(k));
    }
  } catch { /* sin almacenamiento */ }
  return out;
}
export function borrarTodo() {
  Object.keys(todasLasClaves()).forEach((k) => localStorage.removeItem(PREFIJO + k));
}

export const pesos = (n) => (isFinite(n) ? n : 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
export const numero = (n, d = 2) => (isFinite(n) ? n : 0).toLocaleString("es-MX", { maximumFractionDigits: d, minimumFractionDigits: 0 });
export function aNumero(texto) {
  const n = parseFloat(String(texto).replace(/[$,\s]/g, ""));
  return isFinite(n) ? n : NaN;
}
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(d) { return d.getDate() + " " + MESES[d.getMonth()] + " " + d.getFullYear(); }
export function horaCorta(d) {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  return (h % 12 || 12) + ":" + m + (h < 12 ? " a. m." : " p. m.");
}
export function diaDesdeISO(iso) { const [a, m, d] = iso.split("-").map(Number); return new Date(a, m - 1, d); }
export function hoyISO() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

// Campo con etiqueta, ayuda y error accesibles.
let contador = 0;
export function campo(etiqueta, attrs = {}, ayuda) {
  const id = attrs.id || "c" + (++contador);
  const tag = attrs.tag || "input";
  delete attrs.tag;
  const control = el(tag, { ...attrs, id, "aria-describedby": ayuda ? id + "-ayuda" : null });
  if (tag === "select") (attrs.opciones || []).forEach(([v, t]) => control.append(el("option", { value: v }, t)));
  control.removeAttribute("opciones");
  const error = el("p", { class: "error", id: id + "-error", hidden: true, role: "alert" });
  const caja = el("div", { class: "campo" }, el("label", { for: id }, etiqueta), control,
    ayuda ? el("span", { class: "ayuda", id: id + "-ayuda" }, ayuda) : null, error);
  caja.control = control;
  caja.marcar = (msg) => {
    error.textContent = msg || ""; error.hidden = !msg;
    control.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg) control.focus();
  };
  control.addEventListener("input", () => caja.marcar(""));
  return caja;
}

export function fuente(texto, enlaces) {
  return el("details", { class: "fuente" }, el("summary", null, "Qué dice la fuente oficial"),
    el("p", null, texto),
    ...enlaces.map(([t, url], i) => [i ? " · " : null, el("a", { href: url, target: "_blank", rel: "noopener" }, t)]));
}

let temporizadorAviso;
export function avisar(texto) {
  let a = document.getElementById("aviso-flotante");
  if (!a) {
    a = el("div", { id: "aviso-flotante", role: "status", style: "position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:9;background:#0E1B2E;color:#E8EEF6;border:2px solid #F2B705;border-radius:12px;padding:12px 14px;font-weight:600;max-width:560px;margin:auto" });
    document.body.append(a);
  }
  a.textContent = texto; a.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { a.hidden = true; }, 3500);
}

export async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); avisar("Copiado."); }
  catch { avisar("No se pudo copiar; selecciona el texto y cópialo a mano."); }
}

export function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = el("a", { href: url, download: nombre });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Comparte un archivo (WhatsApp, correo) si el celular lo permite; si no, lo descarga.
export async function compartirArchivo(nombre, contenido, tipo, titulo) {
  try {
    const archivo = new File([contenido], nombre, { type: tipo });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      await navigator.share({ files: [archivo], title: titulo });
      return;
    }
  } catch (e) { if (e && e.name === "AbortError") return; }
  descargar(nombre, contenido, tipo);
}

export function csv(filas) {
  return "﻿" + filas.map((f) => f.map((c) => '"' + String(c ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
}

export function encabezado(titulo, subtitulo) {
  return [el("a", { class: "volver", href: "#/" }, "← Volver"),
    el("h1", null, titulo), subtitulo ? el("p", { class: "suave" }, subtitulo) : null];
}
