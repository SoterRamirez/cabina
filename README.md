# Cabina

**La navaja suiza del operador de camiones.** Herramientas gratis para el autotransporte en México: normas, trámites, cuentas del viaje y bitácora. Sin cuentas, sin anuncios y funciona sin señal.

👉 Úsala en **[soterramirez.dev/herramientas](https://soterramirez.dev/herramientas/)** y agrégala a la pantalla de inicio de tu celular.

## Qué trae

| En el camino | Normas y trámites | Cuentas y bitácora |
|---|---|---|
| Números de emergencia (911, 088, 074, 078, 089) | Físico-mecánica según tu placa (NOM-068) | Gastos del viaje y liquidación |
| Horas de manejo con aviso de pausa (NOM-087) | Límite de humo por año-modelo (NOM-045) | Bitácora personal exportable |
| Revisión antes de salir (NOM-068) | Doble cobro IAVE: correo de aclaración | Diésel: rendimiento y costo del viaje |
| Velocidades y alcohol (Reglamento de Tránsito) | Constancia y licencia: cuánto te queda | Ganancia por km y por hora |
| | Sedes del Mes del Apto Médico 2026 | Convertidor (mm↔pulg, kg↔lb, psi↔bar…) |
| | ¿Es real el mensaje de la SICT? | |

## Reglas de la casa

- **Solo fuentes oficiales.** Todo dato de normas sale del DOF o de sitios gob.mx, con la cita en la misma pantalla. Si un dato no está verificado, no entra.
- **Tus datos son tuyos.** Todo se guarda en el celular (`localStorage`); nada se manda a un servidor. Hay respaldo y restauración en un archivo.
- **Funciona sin señal.** Un service worker guarda la app la primera vez que se abre.

## Cómo está hecha

HTML, CSS y JavaScript sin dependencias ni paso de construcción.

```
index.html            app y rutas (#/horas, #/gastos…)
js/app.js             inicio, rutas, respaldo e instalación
js/normas.js          NOM-087, NOM-068, NOM-045 y Reglamento
js/tramites.js        emergencias, IAVE, constancia, sedes, mensajes SICT
js/cuentas.js         diésel, convertidor, gastos, ganancia y bitácora
js/ui.js              ayudantes compartidos
datos/                sedes del Mes del Apto Médico (DOF 13/11/2026)
tests/                pruebas automáticas (node --test)
fuentes/              Barlow, Barlow Condensed e IBM Plex Mono (SIL OFL 1.1)
sw.js                 modo sin señal
```

Pruebas automáticas (Node 20 o más nuevo, sin instalar nada):

```bash
npm test
```

Cubren la lógica de **Horas de manejo** (NOM-087): pausas de 30 min que se pueden repartir, tope de 14 h, avisos y formato de la hora. GitHub las corre solas en cada cambio (pestaña *Actions*). Si cambias `js/normas.js`, corre las pruebas antes de publicar.

Para probarla en tu compu:

```bash
python3 -m http.server 8000
```

y abre `http://localhost:8000`.

Al cambiar cualquier archivo, sube `VERSION` en `sw.js` para que los celulares descarguen la versión nueva.

## Contribuir

¿Encontraste un error o falta una herramienta? Abre un *issue* con la fuente oficial (enlace al DOF o a gob.mx). Sin fuente no se publica.

## Aviso

Cabina es orientativa y resume la norma vigente a la fecha indicada en cada herramienta. Ante cualquier duda, manda el texto oficial.

---

Hecha por **Soter Ramírez** · [soterramirez.dev](https://soterramirez.dev) · Licencia MIT
