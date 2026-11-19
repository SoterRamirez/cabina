// Pruebas del recordatorio de vencimientos (constancia psicofísica y licencia federal).
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { vencimientosProximos, enMesDelApto, textoVencimiento } = await import("../js/tramites.js");

const HOY = new Date(2026, 10, 18, 9, 30); // 18 nov 2026, 9:30 a. m.

describe("Qué documentos avisan", () => {
  test("sin fechas guardadas no avisa nada", () => {
    assert.deepEqual(vencimientosProximos({}, HOY), []);
  });
  test("a más de 30 días no avisa", () => {
    assert.deepEqual(vencimientosProximos({ licencia: "2026-12-19" }, HOY), []);
  });
  test("a 30 días exactos sí avisa", () => {
    const [v] = vencimientosProximos({ licencia: "2026-12-18" }, HOY);
    assert.equal(v.dias, 30);
  });
  test("la hora del día no cambia la cuenta de días", () => {
    const tarde = new Date(2026, 10, 18, 23, 59);
    assert.equal(vencimientosProximos({ constancia: "2026-11-25" }, tarde)[0].dias, 7);
  });
  test("vencido también avisa, con días negativos", () => {
    assert.equal(vencimientosProximos({ constancia: "2026-11-10" }, HOY)[0].dias, -8);
  });
  test("el más urgente va primero", () => {
    const l = vencimientosProximos({ constancia: "2026-12-10", licencia: "2026-11-20" }, HOY);
    assert.deepEqual(l.map((v) => v.clave), ["licencia", "constancia"]);
  });
  test("ignora fechas vacías o mal escritas", () => {
    assert.deepEqual(vencimientosProximos({ constancia: "", licencia: "mañana" }, HOY), []);
  });
});

describe("Texto del aviso", () => {
  const v = (dias, iso = "2026-11-25") => ({ nombre: "Tu licencia federal", iso, dias });
  test("faltan varios días", () => {
    assert.equal(textoVencimiento(v(7)), "Tu licencia federal vence en 7 días (25 nov 2026).");
  });
  test("singular con 1 día", () => {
    assert.match(textoVencimiento(v(1)), /vence en 1 día \(/);
  });
  test("vence hoy", () => {
    assert.equal(textoVencimiento(v(0)), "Tu licencia federal vence hoy.");
  });
  test("ya vencida", () => {
    assert.equal(textoVencimiento(v(-3)), "Tu licencia federal venció hace 3 días. No debes manejar con ella vencida.");
  });
});

describe("Mes del Apto Médico 2026 (17 nov al 17 dic)", () => {
  test("dentro del periodo", () => {
    assert.equal(enMesDelApto(new Date(2026, 10, 17)), true);
    assert.equal(enMesDelApto(new Date(2026, 11, 17, 15, 0)), true);
  });
  test("fuera del periodo", () => {
    assert.equal(enMesDelApto(new Date(2026, 10, 16)), false);
    assert.equal(enMesDelApto(new Date(2026, 11, 18)), false);
  });
});
