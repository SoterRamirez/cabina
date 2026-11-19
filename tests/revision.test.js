// Pruebas de la revisión antes de salir: vale por un día.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const memoria = new Map();
globalThis.localStorage = { getItem: (k) => (memoria.has(k) ? memoria.get(k) : null), setItem: (k, v) => memoria.set(k, String(v)), removeItem: (k) => memoria.delete(k), key: (i) => [...memoria.keys()][i], get length() { return memoria.size; } };
const { marcasDeHoy, textoRevision } = await import("../js/normas.js");

describe("Qué marcas cuentan hoy", () => {
  test("las de hoy sí", () => {
    assert.deepEqual(marcasDeHoy({ dia: "2026-11-18", marcados: [0, 2] }, "2026-11-18"), [0, 2]);
  });
  // Visto en iPhone (v25): lo palomeado ayer seguía diciendo «Todo revisado».
  test("las de ayer no", () => {
    assert.deepEqual(marcasDeHoy({ dia: "2026-11-17", marcados: [0, 1, 2, 3, 4, 5] }, "2026-11-18"), []);
  });
  test("la lista vieja sin fecha no cuenta", () => {
    assert.deepEqual(marcasDeHoy([0, 1, 2], "2026-11-18"), []);
  });
  test("sin nada guardado, vacío", () => {
    assert.deepEqual(marcasDeHoy(null, "2026-11-18"), []);
  });
});

describe("Texto del contador", () => {
  test("a medias", () => { assert.equal(textoRevision([0, 1, 2], 6, null), "Llevas 3 de 6."); });
  test("completa sin hora", () => { assert.equal(textoRevision([0, 1, 2, 3, 4, 5], 6, null), "Todo revisado hoy. Buen viaje."); });
  test("completa con hora, sin doble punto tras «p. m.»", () => {
    assert.match(textoRevision([0, 1, 2, 3, 4, 5], 6, new Date(2026, 10, 18, 19, 49).getTime()), /^Todo revisado hoy a las 7:49\u202fp\.\u202fm\. Buen viaje\.$/);
  });
});
