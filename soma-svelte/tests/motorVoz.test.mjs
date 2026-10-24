// Prueba del motor de dictado con un reconocedor falso que imita los eventos de Chrome en Android.
// Correr con: npm test
import { MotorVoz } from '../src/lib/motorVoz.js';

// Reconocedor falso: cada start() abre una sesión que el test maneja a mano.
let sesiones = [], fallarStart = false;
class FakeSR {
  start() { if (fallarStart) throw new Error('start'); this.continuousAlStart = this.continuous; sesiones.push(this); }
  stop() { this.parado = true; }
  abort() { this.abortado = true; }
  emitir(...textos) { // results acumulados como los manda Chrome (incluye reemisiones y parciales apilados)
    const results = textos.map((t) => Object.assign([{ transcript: t }], { isFinal: true }));
    this.onresult?.({ results, resultIndex: 0 });
  }
  terminar() { this.onend?.(); }
  error(c) { this.onerror?.({ error: c }); }
}
const ultima = () => sesiones.at(-1);

function caso(nombre, fn, esperado) {
  sesiones = []; fallarStart = false;
  const entregas = [], errores = [], vivos = [];
  const m = new MotorVoz(FakeSR, { onTexto: (t) => vivos.push(t), onFin: (t) => entregas.push(t), onError: (c) => errores.push(c) });
  fn(m);
  const r = { entregas, errores, continuous: [...new Set(sesiones.map((s) => s.continuousAlStart))] };
  const ok = JSON.stringify(r.entregas) === JSON.stringify(esperado.entregas) && JSON.stringify(r.errores) === JSON.stringify(esperado.errores ?? []);
  console.log(ok ? 'OK ' : 'MAL', nombre, '→', JSON.stringify(r));
  return ok;
}

const res = [
caso('Parciales apilados en una sesión (Android)', (m) => {
  m.iniciar(); ultima().emitir('gaste'); ultima().emitir('gaste', 'gaste $100'); ultima().emitir('gaste', 'gaste $100', 'gaste $100 cuando fui');
  m.detener(); ultima().terminar();
}, { entregas: ['gaste $100 cuando fui'] }),

caso('Final reemitido (puntuación ajustada)', (m) => {
  m.iniciar(); ultima().emitir('gasté seis mil'); ultima().emitir('gasté seis mil', 'gasté seis mil quinientos');
  ultima().emitir('Gasté seis mil quinientos.'); m.detener(); ultima().terminar();
}, { entregas: ['Gasté seis mil quinientos.'] }),

caso('Pausa: no-speech + onend reabre, sigue otra frase', (m) => {
  m.iniciar(); ultima().emitir('me doblé el tobillo'); ultima().error('no-speech'); ultima().terminar(); // reabre sola
  ultima().emitir('y lo tengo hinchado'); m.detener(); ultima().terminar();
}, { entregas: ['me doblé el tobillo y lo tengo hinchado'] }),

caso('Reapertura que repite el final anterior', (m) => {
  m.iniciar(); ultima().emitir('me doblé el tobillo'); ultima().terminar();
  ultima().emitir('el tobillo y lo tengo hinchado'); m.detener(); ultima().terminar();
}, { entregas: ['me doblé el tobillo y lo tengo hinchado'] }),

caso('Entrega única aunque onend llegue dos veces', (m) => {
  m.iniciar(); ultima().emitir('hola'); m.detener(); ultima().terminar(); ultima().terminar(); m.detener();
}, { entregas: ['hola'] }),

caso('onend de una sesión vieja no duplica', (m) => {
  m.iniciar(); const vieja = ultima(); vieja.emitir('primera'); vieja.terminar(); // reabre
  vieja.terminar(); vieja.emitir('primera'); ultima().emitir('segunda'); m.detener(); ultima().terminar();
}, { entregas: ['primera segunda'] }),

caso('start() falla al reabrir: entrega lo que hay', (m) => {
  m.iniciar(); ultima().emitir('dolor de cabeza'); fallarStart = true; ultima().terminar();
}, { entregas: ['dolor de cabeza'] }),

caso('start() falla al iniciar: error, sin trabar', (m) => { fallarStart = true; m.iniciar(); }, { entregas: [], errores: ['start'] }),

caso('Error real (permiso): avisa una vez y no entrega', (m) => {
  m.iniciar(); ultima().emitir('algo'); ultima().error('not-allowed'); ultima().terminar();
}, { entregas: [], errores: ['not-allowed'] }),

caso('Cancelar (deslizar / salir de la pantalla): no entrega', (m) => {
  m.iniciar(); ultima().emitir('no lo guardes'); m.cancelar(); ultima().terminar();
}, { entregas: [] }),

caso('Sin voz: entrega vacío una sola vez', (m) => {
  m.iniciar(); ultima().error('no-speech'); m.detener(); ultima().terminar();
}, { entregas: [''] }),
];
const ok = res.filter(Boolean).length;
console.log(`\n${ok}/${res.length} casos OK`);
if (ok !== res.length) process.exit(1);
