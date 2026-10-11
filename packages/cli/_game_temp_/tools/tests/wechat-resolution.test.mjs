import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const addon = new URL('../../addons/godot_mini_game/', import.meta.url);
const adapterSource = readFileSync(new URL('templates/common/adapter.js', addon), 'utf8').replace(/^import .*;\n/gm, '');
const loaderSource = readFileSync(new URL('templates/common/js/loader.js', addon), 'utf8').replace(/^import .*;\n/gm, '').replace('export default Loader;', 'globalThis.Loader = Loader;');
const engine = readFileSync(new URL('engine/godot.js', addon), 'utf8');
const computePosition = engine.match(/computePosition:(function\(evt,rect\)\{.*?return\[x,y\]\})/)[1];

function boot(pixelRatio) {
  const handlers = {};
  const createCanvas = () => ({ width: 0, height: 0, getContext: () => ({ scale() {} }) });
  const host = { canvas: createCanvas() };
  const api = {
    createCanvas, createImage: () => ({}),
    onTouchStart: callback => { handlers.touch = callback; },
    onTouchMove() {}, onTouchEnd() {},
    onWindowResize: callback => { handlers.resize = callback; },
  };
  const runtime = {
    global: host, platform: 'wechat', requireCapabilities: () => api,
    getSystemInfo: () => ({ platform: 'ios', windowWidth: 428, windowHeight: 926, pixelRatio }),
    getNativeWebAssemblyApis: () => [], getStandardWebAssembly: () => WebAssembly,
  };
  const context = vm.createContext({
    PlatformRuntime: runtime, console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame() {}, cancelAnimationFrame() {},
    BRIDGE_GLOBAL_NAME: 'testSDK', GodotSDK: class {},
  });
  vm.runInContext(adapterSource, context);
  // Separate module scope, as in the exported game.
  vm.runInContext(`(() => { ${loaderSource} })()`, context);
  context.Loader.prototype._initWebgl = () => [{}, () => {}];
  new context.Loader();
  context.GodotConfig = { canvas: host.__adapter.canvas };
  const enginePosition = vm.runInContext(`(${computePosition})`, context);
  return { host, handlers, enginePosition };
}

for (const pixelRatio of [1, 2, 3]) {
  test(`DPR ${pixelRatio}: full resolution after loader, resize and touch stay aligned`, () => {
    const { host, handlers, enginePosition } = boot(pixelRatio);
    const { canvas, window } = host.__adapter;
    assert.equal(window.devicePixelRatio, pixelRatio);
    assert.equal(canvas.width, 428 * pixelRatio);
    assert.equal(canvas.height, 926 * pixelRatio);
    assert.equal(canvas.getBoundingClientRect().width, 428);
    let touch;
    canvas.addEventListener('touchstart', event => { touch = event.changedTouches[0]; });
    handlers.touch({ touches: [], changedTouches: [{ identifier: 0, clientX: 214, clientY: 463 }] });
    const position = enginePosition(touch, canvas.getBoundingClientRect());
    // Godot converts logical touch positions once to its physical framebuffer.
    assert.equal(position[0] / canvas.width, 0.5);
    assert.equal(position[1] / canvas.height, 0.5);
    handlers.resize({ size: { windowWidth: 926, windowHeight: 428 } });
    assert.equal(canvas.width, 926 * pixelRatio);
    assert.equal(canvas.height, 428 * pixelRatio);
    assert.equal(canvas.getBoundingClientRect().height, 428);
  });
}
