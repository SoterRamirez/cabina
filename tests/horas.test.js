// Pruebas de Horas de manejo (NOM-087-SCT-2-2017). Se corren con: node --test tests/
// Cada prueba dice qué regla de la norma o qué error ya visto protege.
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Cabina guarda en localStorage; en estas pruebas se usa uno en memoria.
const memoria = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
  key: (i) => [...memoria.keys()][i],
  get length() { return memoria.size; }
};

const { manejado, siguientePausa, enPausa, faltaPausa, tramo, alternarPausa, avisosPendientes, turnoActual, cronometro, hms, faltaDescanso, confirmarSinDescanso, borrarTurno } = await import("../js/normas.js");
const { horaCorta } = await import("../js/ui.js");

const M = 60e3, H = 3600e3;
const T0 = new Date(2026, 10, 18, 6, 0).getTime(); // 18 nov 2026, 6:00 a. m.
const pausa = (iniMin, durMin) => ({ ini: T0 + iniMin * M, fin: durMin == null ? undefined : T0 + (iniMin + durMin) * M });
const turno = (...pausas) => ({ inicio: T0, pausas });
const enMinutos = (ms) => Math.round((ms - T0) / M); // minutos exactos, sin decimales

// Simula el reloj para las funciones que usan Date.now().
function conReloj(ms, fn) {
  const real = Date.now;
  Date.now = () => ms;
  try { return fn(); } finally { Date.now = real; }
}

describe("Tiempo manejado", () => {
  test("sin pausas cuenta todo el tiempo desde que arrancas", () => {
    assert.equal(manejado(turno(), T0 + 3 * H), 3 * H);
  });
  test("las pausas no cuentan como manejo", () => {
    assert.equal(manejado(turno(pausa(120, 30)), T0 + 4 * H), 3.5 * H);
  });
  test("una pausa en curso tampoco cuenta", () => {
    assert.equal(manejado(turno(pausa(120)), T0 + 3 * H), 2 * H);
  });
  test("al terminar el día el tiempo se congela", () => {
    const t = { ...turno(pausa(300, 30)), terminado: T0 + 10 * H };
    assert.equal(manejado(t, T0 + 20 * H), 9.5 * H);
  });
});

describe("Pausa de 30 min a más tardar a las 5 h (NOM-087 4.1)", () => {
  test("sin pausas, la primera toca a las 5 h", () => {
    assert.equal(enMinutos(siguientePausa(turno())), 5 * 60);
  });
  test("una pausa completa de 30 min reinicia el conteo desde que termina", () => {
    assert.equal(enMinutos(siguientePausa(turno(pausa(300, 30)))), 10 * 60 + 30);
  });
  test("ERROR YA VISTO: una pausa corta de 10 min NO reinicia el conteo", () => {
    assert.equal(enMinutos(siguientePausa(turno(pausa(120, 10)))), 5 * 60);
  });
  test("la pausa se puede repartir: 10 + 20 min completan los 30 y reinician", () => {
    const t = turno(pausa(120, 10), pausa(240, 20)); // termina a las 4 h 20 min
    assert.equal(enMinutos(siguientePausa(t)), 4 * 60 + 20 + 5 * 60);
  });
  test("tres pausas de 10 min también completan los 30", () => {
    const t = turno(pausa(60, 10), pausa(120, 10), pausa(180, 10)); // la última termina a las 3 h 10 min
    assert.equal(enMinutos(siguientePausa(t)), 3 * 60 + 10 + 5 * 60);
  });
  test("una pausa en curso no reinicia el conteo hasta que termina", () => {
    assert.equal(enMinutos(siguientePausa(turno(pausa(300)))), 5 * 60);
  });
  test("dos tramos completos encadenan bien", () => {
    const t = turno(pausa(300, 30), pausa(600, 30)); // la segunda termina a las 10 h 30 min
    assert.equal(enMinutos(siguientePausa(t)), 15 * 60 + 30);
  });
  test("lo que sobra de pausa después de completar 30 min no se guarda para el siguiente tramo (4.2: no acumulables)", () => {
    const t = turno(pausa(300, 45));
    assert.equal(tramo(t, T0 + 6 * H).acumulada, 0);
    assert.equal(enMinutos(siguientePausa(t)), 5 * 60 + 45 + 5 * 60);
  });
});

describe("Cuánto falta para completar la pausa", () => {
  test("sin pausas faltan 30 min", () => {
    assert.equal(faltaPausa(turno(), T0 + H), 30 * M);
  });
  test("con 10 min hechos faltan 20", () => {
    assert.equal(faltaPausa(turno(pausa(60, 10)), T0 + 2 * H), 20 * M);
  });
  test("en una pausa en curso cuenta el tiempo que va", () => {
    assert.equal(faltaPausa(turno(pausa(60)), T0 + 60 * M + 12 * M), 18 * M);
  });
  test("al completar 30 min ya no falta nada", () => {
    assert.equal(faltaPausa(turno(pausa(60)), T0 + 95 * M), 0);
  });
});

describe("Avisos del turno", () => {
  test("nada antes de tiempo", () => {
    assert.deepEqual(avisosPendientes(turno(), T0 + 4 * H, {}).mensajes, []);
  });
  test("10 minutos antes de la pausa", () => {
    const { mensajes } = avisosPendientes(turno(), T0 + 4 * H + 50 * M, {});
    assert.deepEqual(mensajes, ["En 10 minutos te toca tu pausa de 30 min."]);
  });
  test("al llegar a las 5 h", () => {
    const { mensajes } = avisosPendientes(turno(), T0 + 5 * H, {});
    assert.deepEqual(mensajes, ["Ya llevas 5 h manejando: toca pausa de 30 minutos."]);
  });
  test("un aviso no se repite", () => {
    const { dados } = avisosPendientes(turno(), T0 + 4 * H + 51 * M, {});
    assert.deepEqual(avisosPendientes(turno(), T0 + 4 * H + 52 * M, dados).mensajes, []);
  });
  test("si abres la app tarde, no salen juntos el aviso previo y el de las 5 h", () => {
    const { mensajes } = avisosPendientes(turno(), T0 + 5 * H + 20 * M, {});
    assert.deepEqual(mensajes, ["Ya llevas 5 h manejando: toca pausa de 30 minutos."]);
  });
  test("ERROR YA VISTO: una pausa corta no apaga el aviso de las 5 h", () => {
    const { mensajes } = avisosPendientes(turno(pausa(120, 10)), T0 + 5 * H, {});
    assert.ok(mensajes.includes("Ya llevas 5 h manejando: toca pausa de 30 minutos."));
  });
  test("en pausa no suena el aviso de las 5 h", () => {
    assert.deepEqual(avisosPendientes(turno(pausa(290)), T0 + 5 * H, {}).mensajes, []);
  });
  const COMPLETA = "Ya completaste tus 30 min de pausa. Cuando quieras, toca «Terminé mi pausa».";
  test("avisa al completar 30 min de pausa", () => {
    assert.deepEqual(avisosPendientes(turno(pausa(290)), T0 + 290 * M + 30 * M, {}).mensajes, [COMPLETA]);
  });
  test("no avisa antes de completar los 30 min", () => {
    assert.deepEqual(avisosPendientes(turno(pausa(290)), T0 + 290 * M + 29 * M, {}).mensajes, []);
  });
  test("con pausa repartida avisa al juntar 30 (10 antes + 20 ahora)", () => {
    const t = turno(pausa(60, 10), pausa(200));
    assert.deepEqual(avisosPendientes(t, T0 + 200 * M + 19 * M, {}).mensajes, []);
    assert.deepEqual(avisosPendientes(t, T0 + 200 * M + 20 * M, {}).mensajes, [COMPLETA]);
  });
  test("el aviso de pausa completa no se repite", () => {
    const { dados } = avisosPendientes(turno(pausa(290)), T0 + 321 * M, {});
    assert.deepEqual(avisosPendientes(turno(pausa(290)), T0 + 330 * M, dados).mensajes, []);
  });
  test("una pausa nueva en otro tramo vuelve a avisar", () => {
    const { dados } = avisosPendientes(turno(pausa(290)), T0 + 321 * M, {});
    const t2 = turno(pausa(290, 30), pausa(600));
    assert.deepEqual(avisosPendientes(t2, T0 + 631 * M, dados).mensajes, [COMPLETA]);
  });
  test("tope de 14 h de manejo en 24 h (NOM-087 4.7)", () => {
    const t = turno(pausa(300, 30), pausa(630, 30)); // 14 h de manejo a las 15 h
    const { mensajes } = avisosPendientes(t, T0 + 15 * H, { ["ya" + siguientePausa(t)]: 1 });
    assert.ok(mensajes.includes("Llegaste a 14 h de manejo. Ya no puedes seguir hoy."));
  });
  test("con el día terminado no hay avisos", () => {
    assert.deepEqual(avisosPendientes({ ...turno(), terminado: T0 + H }, T0 + 5 * H, {}).mensajes, []);
  });
});

describe("Botón de pausa (empezar y terminar)", () => {
  beforeEach(() => memoria.clear());
  const guardarTurno = (t) => localStorage.setItem("cabina:turno", JSON.stringify(t));

  test("empezar una pausa la deja en curso", () => {
    guardarTurno(turno());
    conReloj(T0 + 2 * H, () => alternarPausa());
    assert.equal(enPausa(turnoActual()), true);
  });
  test("terminar antes de 30 min avisa cuánto falta", () => {
    guardarTurno(turno(pausa(120)));
    const aviso = conReloj(T0 + 130 * M, () => alternarPausa());
    assert.match(aviso, /no completó 30 min: te faltan 20 min/);
    assert.equal(enPausa(turnoActual()), false);
  });
  test("terminar con 30 min o más no avisa", () => {
    guardarTurno(turno(pausa(120)));
    assert.equal(conReloj(T0 + 150 * M, () => alternarPausa()), null);
  });
  test("con el día terminado el botón no hace nada", () => {
    guardarTurno({ ...turno(), terminado: T0 + H });
    assert.equal(conReloj(T0 + 2 * H, () => alternarPausa()), null);
    assert.equal(turnoActual().pausas.length, 0);
  });
});

describe("Formato de la hora", () => {
  test("ERROR YA VISTO: «p. m.» no se separa de la hora (espacios que no se cortan)", () => {
    const texto = horaCorta(new Date(2026, 10, 18, 19, 4));
    assert.equal(texto, "7:04 p. m.");
    assert.ok(!texto.includes(" "), "no debe llevar espacios normales");
  });
  test("mediodía y medianoche", () => {
    assert.equal(horaCorta(new Date(2026, 10, 18, 12, 0)), "12:00 p. m.");
    assert.equal(horaCorta(new Date(2026, 10, 18, 0, 5)), "12:05 a. m.");
  });
});

describe("Cronómetro en vivo", () => {
  test("manejando, cuenta el manejo y avanza segundo a segundo", () => {
    const t = turno();
    assert.deepEqual(cronometro(t, T0 + 3 * M + 12e3), { modo: "manejo", ms: 3 * M + 12e3 });
    assert.equal(hms(cronometro(t, T0 + 3 * M + 13e3).ms), "0:03:13");
  });
  test("ERROR YA VISTO: en pausa el reloj cuenta la pausa (antes se veía congelado)", () => {
    const t = turno(pausa(60));
    assert.deepEqual(cronometro(t, T0 + 72 * M), { modo: "pausa", ms: 12 * M });
  });
  test("al terminar la pausa vuelve a contar el manejo sin la pausa", () => {
    const t = turno(pausa(60, 30));
    assert.equal(cronometro(t, T0 + 100 * M).ms, 70 * M);
  });
  test("en descanso cuenta lo que falta de las 8 h", () => {
    const t = { ...turno(), terminado: T0 + 10 * H };
    assert.deepEqual(cronometro(t, T0 + 11 * H), { modo: "descanso", ms: 7 * H });
    assert.equal(cronometro(t, T0 + 20 * H).ms, 0);
  });
  test("formato h:mm:ss", () => {
    assert.equal(hms(0), "0:00:00");
    assert.equal(hms(3723000), "1:02:03");
    assert.equal(hms(-5), "0:00:00");
  });
});

describe("Descanso de 8 h antes de un turno nuevo", () => {
  const H = 3600e3, AHORA = Date.UTC(2026, 10, 18, 20, 0);
  test("sin turno o con turno abierto no hay descanso pendiente", () => {
    assert.equal(faltaDescanso(null, AHORA), 0);
    assert.equal(faltaDescanso({ inicio: AHORA - H, pausas: [] }, AHORA), 0);
  });
  test("a 1 min de terminar faltan 7 h 59 min", () => {
    assert.equal(faltaDescanso({ inicio: AHORA - 5 * H, pausas: [], terminado: AHORA - 60e3 }, AHORA), 8 * H - 60e3);
  });
  test("cumplidas las 8 h ya no falta nada", () => {
    assert.equal(faltaDescanso({ inicio: AHORA - 20 * H, pausas: [], terminado: AHORA - 8 * H }, AHORA), 0);
  });
  // Error visto en iPhone (v22): el botón del inicio arrancaba sin preguntar con 1 min de descanso.
  test("con descanso incompleto pregunta, y si dice que no, no arranca", () => {
    localStorage.setItem("cabina:turno", JSON.stringify({ inicio: AHORA - 5 * H, pausas: [], terminado: AHORA - 60e3 }));
    let preguntas = 0;
    globalThis.confirm = () => { preguntas++; return false; };
    assert.equal(confirmarSinDescanso(AHORA), false);
    assert.equal(preguntas, 1);
  });
  test("con descanso cumplido no pregunta", () => {
    localStorage.setItem("cabina:turno", JSON.stringify({ inicio: AHORA - 20 * H, pausas: [], terminado: AHORA - 9 * H }));
    globalThis.confirm = () => { throw new Error("no debió preguntar"); };
    assert.equal(confirmarSinDescanso(AHORA), true);
  });
});

describe("Borrar este turno (pruebas o arranque por error)", () => {
  const H = 3600e3, AHORA = Date.UTC(2026, 10, 18, 20, 0);
  test("quita el turno y no deja descanso pendiente", () => {
    localStorage.setItem("cabina:turno", JSON.stringify({ inicio: AHORA - H, pausas: [], terminado: AHORA - 60e3 }));
    borrarTurno();
    assert.equal(turnoActual(), null);
    globalThis.confirm = () => { throw new Error("no debió preguntar"); };
    assert.equal(confirmarSinDescanso(AHORA), true);
  });
  test("no toca gastos ni bitácora", () => {
    localStorage.setItem("cabina:gastos", JSON.stringify({ nombre: "Viaje", items: [{ monto: 100 }] }));
    localStorage.setItem("cabina:bitacora", JSON.stringify([{ tipo: "Nota" }]));
    localStorage.setItem("cabina:turno", JSON.stringify({ inicio: AHORA - H, pausas: [] }));
    borrarTurno();
    assert.equal(JSON.parse(localStorage.getItem("cabina:gastos")).items.length, 1);
    assert.equal(JSON.parse(localStorage.getItem("cabina:bitacora")).length, 1);
  });
});
