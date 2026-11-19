// Conteo anónimo de visitas con GoatCounter: sin cookies ni datos personales.
// Solo cuenta en el sitio publicado; sin señal simplemente no se manda nada y la app sigue igual.
const CONTEO = "https://soterramirez.goatcounter.com/count";
const SITIO = "soterramirez.dev";
let listo = false;
const pendientes = [];

function enviar(datos) {
  try { window.goatcounter.count(datos); } catch { /* sin conteo */ }
}
function mandar(datos) {
  if (location.hostname !== SITIO) return;
  if (listo) enviar(datos); else pendientes.push(datos);
}

export function iniciarMetricas() {
  if (location.hostname !== SITIO) return;
  window.goatcounter = { no_onload: true };
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = CONTEO;
  s.onload = () => { listo = true; pendientes.splice(0).forEach(enviar); };
  document.head.append(s);

  // Instalación (Android/Chrome avisa; iPhone no) y aperturas desde la pantalla de inicio.
  window.addEventListener("appinstalled", () => evento("cabina-instalada", "Cabina instalada"));
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) {
    evento("cabina-abierta-desde-inicio", "Cabina abierta desde la pantalla de inicio");
  }
}

// Una vista por pantalla de Cabina, por ejemplo /herramientas/#/horas.
export function contarVista(ruta, titulo) {
  mandar({ path: "/herramientas/" + (ruta ? "#/" + ruta : ""), title: titulo });
}

export function evento(nombre, titulo) {
  mandar({ path: nombre, title: titulo, event: true });
}
