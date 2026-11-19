// Instructivo de uso y aviso de responsabilidad de Cabina.
import { el, encabezado } from "./ui.js";

const FECHA_AVISO = "18 de noviembre de 2026";

function paso(n, titulo, ...texto) {
  return el("li", { class: "paso" }, el("span", { class: "paso-num", "aria-hidden": "true" }, n),
    el("div", null, el("strong", null, titulo), ...texto.map((t) => el("p", null, t))));
}

export function vistaAyuda(cont) {
  cont.append(...encabezado("¿Cómo se usa Cabina?", "Cinco minutos para sacarle provecho."),
    el("ol", { class: "pasos" },
      paso("1", "Instálala en tu celular",
        "Android (Chrome): toca «Instalar Cabina» en el inicio, o el menú ⋮ y luego «Instalar app» o «Agregar a pantalla de inicio».",
        "iPhone (Safari): toca Compartir (el cuadro con flecha) y luego «Agregar a inicio». Instalada, Safari no borra tus datos."),
      paso("2", "Ábrela una vez con señal",
        "La primera vez se guarda en tu celular. Después funciona sin señal en la carretera. El IEPS de la semana sí necesita señal para actualizarse."),
      paso("3", "Lleva tu turno desde el inicio",
        "Toca «Empecé a manejar» al arrancar. El tablero te dice cuándo toca la pausa de 30 min y cuánto te queda de las 14 h.",
        "Usa «Empiezo mi pausa» y «Terminé mi pausa». Al acabar el día, entra a Horas de manejo y toca «Terminé de manejar hoy» para contar tus 8 h de descanso.",
        "El aviso suena y vibra solo con Cabina abierta. No la uses mientras manejas: tócala detenido."),
      paso("4", "Anota gastos y bitácora",
        "«+ Gasto» y «+ Bitácora» te llevan directo a escribir. En Cuentas puedes exportar a Excel o copiar el resumen para tu liquidación."),
      paso("5", "Respalda tus datos",
        "Entra a Mis datos y toca «Respaldar mis datos» cada semana. Se crea un archivo que puedes mandarte por WhatsApp o correo.",
        "Si cambias de celular, instala Cabina en el nuevo y usa «Restaurar un respaldo» con ese archivo.")),
    el("div", { class: "caja" }, el("h2", null, "Los colores"),
      el("ul", { class: "lista-colores" },
        el("li", null, el("span", { class: "muestra senal-rojo" }), "Rojo: emergencias."),
        el("li", null, el("span", { class: "muestra senal-verde" }), "Verde: en el camino (horas, revisión, velocidades)."),
        el("li", null, el("span", { class: "muestra senal-azul" }), "Azul: trámites y normas."),
        el("li", null, el("span", { class: "muestra senal-amarillo" }), "Amarillo: tus cuentas y bitácora."))),
    el("p", null, el("a", { href: "#/aviso" }, "Lee el aviso de responsabilidad")));
}

export function vistaAviso(cont) {
  const seccion = (titulo, ...ps) => el("section", { class: "caja" }, el("h2", null, titulo), ...ps.map((p) => el("p", null, p)));
  cont.append(...encabezado("Aviso de responsabilidad", "Léelo antes de usar Cabina. Última actualización: " + FECHA_AVISO + "."),
    seccion("Es una herramienta orientativa",
      "Cabina resume normas y trámites publicados en el Diario Oficial de la Federación y en sitios gob.mx a la fecha indicada en cada herramienta. Las normas cambian y pueden tener excepciones que aquí no aparecen.",
      "Cabina no es asesoría legal, fiscal ni mecánica, y no sustituye los documentos oficiales, la bitácora de horas de servicio que da tu empresa, ni las indicaciones de la autoridad. Ante cualquier duda, manda el texto oficial."),
    seccion("Tus datos son tu responsabilidad",
      "Todo lo que guardas (turnos, gastos, bitácora, fechas) vive solo en tu celular. Cabina no tiene servidor ni cuentas: nadie más puede verlo, pero tampoco nadie puede recuperarlo.",
      "Tus datos se pueden perder si borras los datos del navegador, desinstalas la app, cambias o pierdes el celular, o si el sistema libera espacio. Haz respaldos seguido desde Mis datos.",
      "El autor de Cabina no se hace responsable por la pérdida, el daño o el mal uso de los datos que guardes en ella."),
    seccion("Úsala detenido",
      "No uses Cabina mientras manejas. Los avisos de pausa son un apoyo: suenan solo con la app abierta y pueden fallar por batería, modo silencio o ahorro de energía. Tú eres responsable de cumplir tus tiempos de conducción y descanso."),
    seccion("Sin garantía",
      "Cabina es gratuita y se ofrece «tal cual», sin garantía de ningún tipo. El autor no se hace responsable por multas, sanciones, accidentes, pérdidas económicas ni decisiones que se tomen con base en la información o los cálculos de la app.",
      "Los enlaces a sitios de terceros (gobierno, Amazon, redes sociales) se rigen por las condiciones de esos sitios."),
    seccion("Privacidad",
      "Cabina no recolecta datos personales, no usa cookies ni muestra anuncios. Lo que guardas (turnos, gastos, bitácora, fechas) y los mensajes que pegas en el detector de la SICT nunca salen de tu celular.",
      "Para saber cuánta gente la usa, contamos visitas de forma anónima con GoatCounter: qué pantalla se abre, de qué página llegaste y si la abriste instalada. No guarda tu nombre, tu número ni tu ubicación exacta, y no usa cookies. Sin señal no se manda nada.",
      "El código es abierto y se puede revisar en github.com/SoterRamirez/cabina."),
    el("p", { class: "suave" }, "Al usar Cabina aceptas este aviso. ¿Dudas? Escríbeme en Facebook: facebook.com/SoterRamirez."));
}

export function tarjetaBienvenida(alAceptar) {
  return el("section", { class: "caja bienvenida", "aria-label": "Bienvenida" },
    el("h2", null, "Bienvenido a Cabina"),
    el("p", null, "Herramientas gratis para el operador. Funciona sin señal y guarda todo solo en tu celular."),
    el("ul", { class: "lista-corta" },
      el("li", null, "Es orientativa: ante la duda manda el texto oficial."),
      el("li", null, "Tus datos son tu responsabilidad: respáldalos desde Mis datos."),
      el("li", null, "Úsala detenido, nunca mientras manejas.")),
    el("div", { class: "botones" },
      el("button", { class: "principal", onclick: alAceptar }, "Entendido"),
      el("a", { class: "boton secundario", href: "#/ayuda" }, "¿Cómo se usa?"),
      el("a", { class: "boton secundario", href: "#/aviso" }, "Aviso completo")));
}
