/**
 * Mini game browser-compat adapter.
 *
 * Injects simulated document / window / canvas / navigator / localStorage /
 * XMLHttpRequest / WebSocket / performance / location into the global scope
 * so Emscripten glue code and Godot Engine.js can run unmodified.
 *
 * Works on both WeChat and Douyin through the shared PlatformRuntime provider.
 *
 * No build step required — this is a single self-contained ES module.
 */

import { PlatformRuntime } from "./js/platform_runtime";

const _api = PlatformRuntime.requireCapabilities(
  ["canvas", "windowInfo", "touch"],
  "adapter",
);
const _global = PlatformRuntime.global;
console.log("[Adapter] ▶ 初始化适配层, platform:", PlatformRuntime.platform);
console.log("[Adapter] GameGlobal.canvas 存在:", !!_global.canvas, "类型:", typeof _global.canvas);

// ── Canvas ────────────────────────────────────────────────────────
// Use the runtime's pre-created canvas if available (this is the one the loader
// and Godot engine will actually render to). Only create a new one as fallback.
const _mainCanvas = _global.canvas || _api.createCanvas();
const _winInfo = PlatformRuntime.getSystemInfo();
// Render at physical resolution. DOM metrics and platform touches stay in
// logical pixels; Godot's input bridge scales them by canvas / bounding rect.
const _nativeDpr = Number(_winInfo.pixelRatio);
const _dpr = Number.isFinite(_nativeDpr) && _nativeDpr > 0 ? Math.max(1, _nativeDpr) : 1;
let _viewportWidth = Number(_winInfo.windowWidth || _winInfo.screenWidth || _mainCanvas.width || 1);
let _viewportHeight = Number(_winInfo.windowHeight || _winInfo.screenHeight || _mainCanvas.height || 1);

function _backingSize(value) {
  return Math.max(1, Math.round(value * _dpr));
}

_mainCanvas.width = _backingSize(_viewportWidth);
_mainCanvas.height = _backingSize(_viewportHeight);

// Mini-game canvas may only allow getContext to succeed once per type.
// Cache the context so the loader's WebGL2 ctx is reused by Godot's Emscripten.
// Native canvas .getContext may be non-configurable, so try multiple override methods.
const _ctxCache = {};
const _origGetContext = _mainCanvas.getContext.bind(_mainCanvas);
const _wrappedGetContext = function (type, attrs) {
  if (_ctxCache[type]) {
    console.log("[Adapter] getContext('" + type + "') → 返回缓存");
    return _ctxCache[type];
  }
  const ctx = _origGetContext(type, attrs);
  console.log("[Adapter] getContext('" + type + "') → " + (ctx ? "成功" : "失败(null)"));
  if (ctx) _ctxCache[type] = ctx;
  return ctx;
};
try {
  Object.defineProperty(_mainCanvas, "getContext", {
    value: _wrappedGetContext, configurable: true, writable: true,
  });
} catch (_) {
  try { _mainCanvas.getContext = _wrappedGetContext; } catch (_2) {}
}

// ── Helper: safe property define ──────────────────────────────────
function _safeDefine(obj, key, value) {
  try { Object.defineProperty(obj, key, { value, configurable: true, writable: true }); } catch (_) {
    try { obj[key] = value; } catch (_2) {}
  }
}

function _installCanvasMetrics(canvas) {
  if (!canvas) return;
  if (!canvas.style) _safeDefine(canvas, "style", {});
  if (canvas.style) {
    try {
      canvas.style.width = _viewportWidth + "px";
      canvas.style.height = _viewportHeight + "px";
    } catch (_) {}
  }
  _safeDefine(canvas, "clientWidth", _viewportWidth);
  _safeDefine(canvas, "clientHeight", _viewportHeight);
  _safeDefine(canvas, "offsetWidth", _viewportWidth);
  _safeDefine(canvas, "offsetHeight", _viewportHeight);
  _safeDefine(canvas, "getBoundingClientRect", function () {
    return {
      x: 0, y: 0, top: 0, left: 0,
      right: _viewportWidth, bottom: _viewportHeight,
      width: _viewportWidth, height: _viewportHeight,
    };
  });
}

// ── Event system ──────────────────────────────────────────────────
const _eventListeners = {};
function _addEventListener(type, fn) {
  if (!_eventListeners[type]) _eventListeners[type] = [];
  if (_eventListeners[type].indexOf(fn) === -1) _eventListeners[type].push(fn);
}
function _removeEventListener(type, fn) {
  const list = _eventListeners[type];
  if (!list) return;
  const i = list.indexOf(fn);
  if (i !== -1) list.splice(i, 1);
}
function _dispatchEvent(type, evt) {
  const list = _eventListeners[type];
  if (!list || list.length === 0) return;
  for (let i = 0; i < list.length; i++) {
    try { list[i](evt); } catch (e) { console.error("[Adapter] event handler error:", type, e); }
  }
}

// Bridge canvas event listeners — WeChat canvas has NO native addEventListener,
// so we must provide one that routes into our central _eventListeners system.
// Godot's GodotEventListeners.add(canvas, "mousedown", fn) calls canvas.addEventListener.
const _wrappedAddEL = function (type, fn, capture) { _addEventListener(type, fn); };
const _wrappedRemoveEL = function (type, fn, capture) { _removeEventListener(type, fn); };
const _wrappedDispatchEL = function (evt) { _dispatchEvent(evt && evt.type, evt); };

// Try multiple methods to install addEventListener on the canvas.
function _installCanvasEvents(obj, label) {
  let ok = false;
  try {
    Object.defineProperty(obj, "addEventListener", { value: _wrappedAddEL, configurable: true, writable: true });
    Object.defineProperty(obj, "removeEventListener", { value: _wrappedRemoveEL, configurable: true, writable: true });
    Object.defineProperty(obj, "dispatchEvent", { value: _wrappedDispatchEL, configurable: true, writable: true });
    ok = (obj.addEventListener === _wrappedAddEL);
  } catch (_) {}
  if (!ok) {
    try {
      obj.addEventListener = _wrappedAddEL;
      obj.removeEventListener = _wrappedRemoveEL;
      obj.dispatchEvent = _wrappedDispatchEL;
      ok = (obj.addEventListener === _wrappedAddEL);
    } catch (_) {}
  }
  if (ok) {
    console.log("[Adapter] ✓", label, "addEventListener 安装成功");
  } else {
    console.warn("[Adapter] ✗", label, "addEventListener 安装失败 — 将依赖 Proxy");
  }
  return ok;
}

const _canvasAddELOK = _installCanvasEvents(_mainCanvas, "_mainCanvas");

// ── Proxy fallback ────────────────────────────────────────────────
// If either getContext or addEventListener wrapping failed on the native canvas,
// create a Proxy that intercepts all critical methods.
// NOTE: GameGlobal.canvas is often a non-configurable getter in WeChat, so we
// may not be able to replace it.  Instead we store the "usable" canvas in
// GameGlobal.__adapter.canvas and have the loader read from there.
let _usableCanvas = _mainCanvas;
const _needProxy = (_mainCanvas.getContext !== _wrappedGetContext) || !_canvasAddELOK;
if (_needProxy) {
  console.warn("[Adapter] ⚠ canvas 属性包装不完整，启用 Proxy 方案");
  _usableCanvas = new Proxy(_mainCanvas, {
    get(target, prop, receiver) {
      if (prop === "getContext") return _wrappedGetContext;
      if (prop === "addEventListener") return _wrappedAddEL;
      if (prop === "removeEventListener") return _wrappedRemoveEL;
      if (prop === "dispatchEvent") return _wrappedDispatchEL;
      const val = Reflect.get(target, prop, target);
      if (typeof val === "function") return val.bind(target);
      return val;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  // Try to replace GameGlobal.canvas (may silently fail if it's a native getter)
  try { Object.defineProperty(_global, "canvas", { value: _usableCanvas, configurable: true, writable: true }); } catch (_) {
    try { _global.canvas = _usableCanvas; } catch (_2) {}
  }
  console.log("[Adapter] Proxy canvas 已创建, GameGlobal.canvas 替换:", _global.canvas === _usableCanvas ? "成功" : "失败(将通过 __adapter.canvas 传递)");
} else {
  console.log("[Adapter] ✓ getContext + addEventListener 包装成功");
}

// ── Canvas DOM-like properties (Emscripten / Godot expect these) ─
const _fakeParent = {
  appendChild(c) { return c; }, removeChild(c) { return c; },
  insertBefore(n) { return n; }, children: [_mainCanvas], style: {},
};
_safeDefine(_mainCanvas, "parentElement", _fakeParent);
_safeDefine(_mainCanvas, "parentNode", _fakeParent);
_installCanvasMetrics(_mainCanvas);
_safeDefine(_mainCanvas, "tabIndex", -1);
if (!_mainCanvas.requestPointerLock) _safeDefine(_mainCanvas, "requestPointerLock", () => {});
if (!_mainCanvas.requestFullscreen) _safeDefine(_mainCanvas, "requestFullscreen", () => Promise.resolve());
_safeDefine(_mainCanvas, "mozRequestFullScreen", _mainCanvas.requestFullscreen || (() => Promise.resolve()));
_safeDefine(_mainCanvas, "webkitRequestFullscreen", _mainCanvas.requestFullscreen || (() => Promise.resolve()));
_safeDefine(_mainCanvas, "msRequestFullscreen", _mainCanvas.requestFullscreen || (() => Promise.resolve()));
if (!_mainCanvas.focus) _safeDefine(_mainCanvas, "focus", () => {});
if (!_mainCanvas.blur) _safeDefine(_mainCanvas, "blur", () => {});

// ── document ──────────────────────────────────────────────────────
const _document = {
  readyState: "complete",
  visibilityState: "visible",
  hidden: false,
  activeElement: _mainCanvas,
  fullscreenElement: null,
  fullscreenEnabled: false,
  mozFullScreenEnabled: false,
  webkitFullscreenEnabled: false,
  msFullscreenEnabled: false,
  fullscreen: false,
  mozFullScreen: false,
  webkitIsFullscreen: false,
  pointerLockElement: null,
  documentElement: {
    style: {},
    clientWidth: _viewportWidth,
    clientHeight: _viewportHeight,
  },
  head: { appendChild(c) { return c; }, removeChild(c) { return c; }, insertBefore(n) { return n; } },
  body: {
    style: {},
    appendChild(c) { return c; },
    removeChild(c) { return c; },
    insertBefore(n) { return n; },
    contains() { return true; },
    clientWidth: _viewportWidth,
    clientHeight: _viewportHeight,
  },
  scripts: [],
  styleSheets: [],

  createElement(tag) {
    const t = (tag || "").toLowerCase();
    if (t === "canvas") {
      const c = _api.createCanvas();
      const _origGetCtx = c.getContext?.bind(c);
      if (_origGetCtx) {
        c.getContext = function (type, attrs) {
          try { const ctx = _origGetCtx(type, attrs); if (ctx) return ctx; } catch {}
          if (type === "webgl2" || type === "webgl") return {};
          return null;
        };
      }
      return c;
    }
    if (t === "img" || t === "image") return _api.createImage();
    return {
      tagName: t.toUpperCase(), style: {}, className: "", id: "",
      innerHTML: "", textContent: "", contentEditable: "inherit",
      tabIndex: -1, childNodes: [], children: [],
      setAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; },
      addEventListener() {}, removeEventListener() {},
      appendChild(c) { return c; }, removeChild(c) { return c; },
      insertBefore(n) { return n; }, replaceChild(n) { return n; },
      remove() {}, focus() {}, blur() {}, click() {},
      cloneNode() { return _document.createElement(t); },
      contains() { return false; },
      querySelectorAll() { return []; }, querySelector() { return null; },
      getBoundingClientRect() { return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    };
  },
  createElementNS(_, tag) { return _document.createElement(tag); },
  createTextNode(text) { return { textContent: text }; },
  createDocumentFragment() { return _document.createElement("fragment"); },
  createEvent() { return { initEvent() {}, preventDefault() {}, stopPropagation() {} }; },

  getElementById(id) { return id === "canvas" ? _mainCanvas : null; },
  getElementsByTagName(t) {
    if (t === "canvas") return [_mainCanvas];
    if (t === "head") return [_document.head];
    if (t === "body") return [_document.body];
    return [];
  },
  querySelector(sel) {
    if (!sel) return null;
    if (sel === "canvas" || sel === "#canvas" || sel === "#" || (typeof sel === "string" && sel.startsWith("#"))) {
      console.log("[Adapter] querySelector('" + sel + "') → _mainCanvas");
      return _mainCanvas;
    }
    if (sel === "body") return _document.body;
    if (sel === "head") return _document.head;
    console.log("[Adapter] querySelector('" + sel + "') → null");
    return null;
  },
  querySelectorAll(sel) {
    if (sel === "canvas" || sel === "#canvas") return [_mainCanvas];
    return [];
  },

  addEventListener: _addEventListener,
  removeEventListener: _removeEventListener,
  dispatchEvent(evt) { _dispatchEvent(evt.type, evt); },

  exitPointerLock() {},
  exitFullscreen() {},
  hasFocus() { return true; },
};
Object.defineProperty(_document, "currentScript", { get: () => ({ src: "" }) });

function _syncDomViewportMetrics() {
  _document.documentElement.clientWidth = _viewportWidth;
  _document.documentElement.clientHeight = _viewportHeight;
  _document.body.clientWidth = _viewportWidth;
  _document.body.clientHeight = _viewportHeight;
}

function _setViewportSize(width, height) {
  const nextWidth = Number(width);
  const nextHeight = Number(height);
  if (Number.isFinite(nextWidth) && nextWidth > 0) _viewportWidth = nextWidth;
  if (Number.isFinite(nextHeight) && nextHeight > 0) _viewportHeight = nextHeight;

  _mainCanvas.width = _backingSize(_viewportWidth);
  _mainCanvas.height = _backingSize(_viewportHeight);
  _installCanvasMetrics(_mainCanvas);
  if (typeof _usableCanvas !== "undefined" && _usableCanvas !== _mainCanvas) {
    _installCanvasMetrics(_usableCanvas);
  }
  if (_global.canvas && _global.canvas !== _mainCanvas && _global.canvas !== _usableCanvas) {
    _installCanvasMetrics(_global.canvas);
  }
  _syncDomViewportMetrics();
}

// ── navigator ─────────────────────────────────────────────────────
const _sysInfo = _winInfo;
const _navigator = {
  userAgent: "Mozilla/5.0 MiniGame Godot",
  platform: _sysInfo.platform || "Unknown",
  language: _sysInfo.language || "zh-CN",
  languages: [_sysInfo.language || "zh-CN"],
  onLine: true,
  maxTouchPoints: 10,
  hardwareConcurrency: 4,
  getGamepads: () => [],
  vibrate: () => false,
  permissions: { query: () => Promise.resolve({ state: "granted" }) },
  mediaDevices: {
    getUserMedia: () => Promise.reject(new Error("Not supported")),
    enumerateDevices: () => Promise.resolve([]),
  },
  clipboard: { writeText: () => Promise.resolve(), readText: () => Promise.resolve("") },
  serviceWorker: {
    register: () => Promise.resolve(null),
    ready: Promise.resolve(null),
    controller: null,
    getRegistration: () => Promise.resolve(null),
    getRegistrations: () => Promise.resolve([]),
    addEventListener() {}, removeEventListener() {},
  },
};

// ── localStorage ──────────────────────────────────────────────────
const _localStorage = {
  getItem(k) { try { return _api.getStorageSync(k); } catch { return null; } },
  setItem(k, v) { try { _api.setStorageSync(k, v); } catch {} },
  removeItem(k) { try { _api.removeStorageSync(k); } catch {} },
  clear() { try { _api.clearStorageSync(); } catch {} },
  get length() { try { return _api.getStorageInfoSync().keys.length; } catch { return 0; } },
  key(i) { try { return _api.getStorageInfoSync().keys[i] || null; } catch { return null; } },
};

// ── indexedDB stub ───────────────────────────────────────────────
// Emscripten's IDBFS checks for indexedDB. We provide a minimal stub that
// allows the check to pass but stores nothing (our GodotSDK bridge handles FS).
// Minimal IDBFactory that lets Emscripten's IDBFS assertions pass, then
// responds with a functional-enough fake database so IDBFS sync is a no-op.
// Real persistence is handled by GodotSDK's file system bridge.
// In-memory IDB: Emscripten IDBFS expects FILE_DATA store with a "timestamp"
// index. We pre-create it so onupgradeneeded never fires.
const _idbStores = {};

function _idbReq(valueFn) {
  const r = { readyState: "pending", result: undefined, error: null };
  const _cb = {};
  Object.defineProperty(r, "onsuccess", { set(fn) { _cb.s = fn; }, get() { return _cb.s; } });
  Object.defineProperty(r, "onerror",   { set(fn) { _cb.e = fn; }, get() { return _cb.e; } });
  setTimeout(() => {
    r.readyState = "done";
    try { r.result = valueFn(); } catch (ex) { r.error = ex; if (_cb.e) { _cb.e({ target: r, preventDefault() {} }); return; } }
    if (_cb.s) _cb.s({ target: r });
  }, 0);
  return r;
}

function _idbStore() {
  const _data = new Map();
  const store = {
    indexNames: { contains: () => true, length: 1 },
    createIndex() { return store; },
    index() { return store; },
    put(val, key)  { return _idbReq(() => { _data.set(key, val); return key; }); },
    get(key)       { return _idbReq(() => _data.get(key)); },
    delete(key)    { return _idbReq(() => { _data.delete(key); }); },
    getAll()       { return _idbReq(() => [..._data.values()]); },
    count()        { return _idbReq(() => _data.size); },
    openCursor()   { return _idbReq(() => null); },
    openKeyCursor(){ return _idbReq(() => null); },
  };
  return store;
}

function _idbDatabase(name) {
  if (!_idbStores[name]) _idbStores[name] = { "FILE_DATA": _idbStore() };
  const stores = _idbStores[name];
  const names = Object.keys(stores);
  return {
    name,
    objectStoreNames: { contains: (n) => n in stores, get length() { return Object.keys(stores).length; } },
    createObjectStore(sn) { stores[sn] = _idbStore(); return stores[sn]; },
    deleteObjectStore(sn) { delete stores[sn]; },
    transaction(storeNames) {
      const sn = typeof storeNames === "string" ? storeNames : (storeNames && storeNames[0]) || "FILE_DATA";
      if (!stores[sn]) stores[sn] = _idbStore();
      const tx = { objectStore: () => stores[sn], error: null, abort() {} };
      Object.defineProperty(tx, "oncomplete", { set(fn) { setTimeout(() => fn && fn({ target: tx }), 0); }, get() { return null; } });
      Object.defineProperty(tx, "onerror",    { set() {}, get() { return null; } });
      Object.defineProperty(tx, "onabort",    { set() {}, get() { return null; } });
      return tx;
    },
    close() {},
  };
}

const _indexedDB = {
  open(name, version) {
    const db = _idbDatabase(name);
    // Set result IMMEDIATELY so req.result is available in any callback
    const req = { result: db, error: null, readyState: "done", transaction: null };
    const _cb = {};
    Object.defineProperty(req, "onsuccess",        { set(fn) { _cb.s = fn; }, get() { return _cb.s; } });
    Object.defineProperty(req, "onerror",           { set(fn) { _cb.e = fn; }, get() { return _cb.e; } });
    // FILE_DATA store is pre-created → DB looks "already at latest version" → skip upgrade
    Object.defineProperty(req, "onupgradeneeded",   { set() {}, get() { return null; } });
    setTimeout(() => {
      if (_cb.s) _cb.s({ target: req });
    }, 0);
    return req;
  },
  deleteDatabase(name) {
    delete _idbStores[name];
    return _idbReq(() => undefined);
  },
};

// ── location ──────────────────────────────────────────────────────
const _location = {
  href: "minigame://localhost/", protocol: "minigame:", host: "localhost",
  hostname: "localhost", port: "", pathname: "/", search: "", hash: "",
  origin: "minigame://localhost",
  assign() {}, reload() {}, replace() {},
  toString() { return this.href; },
};

// ── performance ───────────────────────────────────────────────────
const _perfStart = Date.now();
const _performance = {
  now: () => Date.now() - _perfStart,
  timing: { navigationStart: _perfStart },
  mark() {}, measure() {},
  getEntriesByName: () => [], getEntriesByType: () => [],
  clearMarks() {}, clearMeasures() {},
};

// ── XMLHttpRequest ────────────────────────────────────────────────
class _XMLHttpRequest {
  constructor() {
    this.readyState = 0; this.status = 0; this.statusText = "";
    this.response = null; this.responseText = ""; this.responseType = "";
    this._method = "GET"; this._url = ""; this._headers = {};
    this._listeners = {}; this._responseHeaders = {};
  }
  open(m, u) { this._method = m; this._url = u; this.readyState = 1; this._fire("readystatechange"); }
  setRequestHeader(k, v) { this._headers[k] = v; }
  getResponseHeader(k) { return this._responseHeaders[k.toLowerCase()] ?? null; }
  getAllResponseHeaders() {
    return Object.entries(this._responseHeaders).map(([k,v]) => `${k}: ${v}`).join("\r\n");
  }
  send(body) {
    const rt = this.responseType === "arraybuffer" ? "arraybuffer" : "text";
    _api.request({
      url: this._url, method: this._method, data: body || undefined,
      header: this._headers, responseType: rt,
      success: (res) => {
        this._responseHeaders = {};
        if (res.header) for (const [k,v] of Object.entries(res.header)) this._responseHeaders[k.toLowerCase()] = v;
        this.status = res.statusCode; this.statusText = res.errMsg || "OK";
        this.response = rt === "arraybuffer" ? res.data : (typeof res.data === "string" ? res.data : JSON.stringify(res.data));
        if (rt !== "arraybuffer") this.responseText = this.response;
        this.readyState = 4; this._fire("readystatechange"); this._fire("load"); this._fire("loadend");
      },
      fail: (e) => { this.status = 0; this.statusText = e.errMsg || "fail"; this.readyState = 4; this._fire("readystatechange"); this._fire("error"); this._fire("loadend"); },
    });
  }
  abort() { this.readyState = 0; this._fire("abort"); }
  addEventListener(t, fn) { if (!this._listeners[t]) this._listeners[t] = []; this._listeners[t].push(fn); }
  removeEventListener(t, fn) { const l = this._listeners[t]; if (l) { const i = l.indexOf(fn); if (i !== -1) l.splice(i, 1); } }
  _fire(t) {
    const cb = this["on" + t]; if (typeof cb === "function") cb.call(this);
    const l = this._listeners[t]; if (l) l.forEach(fn => fn.call(this));
  }
}

// ── WebSocket ─────────────────────────────────────────────────────
class _WebSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  constructor(url, protocols) {
    this.url = url; this.readyState = 0; this.binaryType = "arraybuffer"; this._listeners = {};
    this._task = _api.connectSocket({ url, protocols: protocols ? (Array.isArray(protocols) ? protocols : [protocols]) : [] });
    this._task.onOpen(() => { this.readyState = 1; this._fire("open"); });
    this._task.onMessage((r) => { this._fire("message", { data: r.data }); });
    this._task.onError((e) => { this._fire("error", e); });
    this._task.onClose((r) => { this.readyState = 3; this._fire("close", { code: r.code, reason: r.reason }); });
  }
  send(data) { if (this.readyState === 1) this._task.send({ data }); }
  close(code, reason) { if (this.readyState !== 3) { this.readyState = 2; this._task.close({ code: code || 1000, reason: reason || "" }); } }
  addEventListener(t, fn) { if (!this._listeners[t]) this._listeners[t] = []; this._listeners[t].push(fn); }
  removeEventListener(t, fn) { const l = this._listeners[t]; if (l) { const i = l.indexOf(fn); if (i !== -1) l.splice(i, 1); } }
  _fire(type, detail) {
    const evt = detail || {}; evt.type = type;
    const cb = this["on" + type]; if (typeof cb === "function") cb(evt);
    const l = this._listeners[type]; if (l) l.forEach(fn => fn(evt));
  }
}

// ── AudioContext ──────────────────────────────────────────────────
// WeChat provides wx.createWebAudioContext() — a real Web Audio API.
// We try to use it; if unavailable we fall back to a no-op stub.

class _AudioNode {
  constructor() { this.numberOfInputs = 1; this.numberOfOutputs = 1; this.channelCount = 2; this.channelCountMode = "max"; this.channelInterpretation = "speakers"; this.context = null; }
  connect(dest) { return dest; }
  disconnect() {}
  addEventListener() {}
  removeEventListener() {}
}

class _AudioParam {
  constructor(v = 1) { this.value = v; this.defaultValue = v; this.minValue = -3.4028235e+38; this.maxValue = 3.4028235e+38; }
  setValueAtTime(v) { this.value = v; return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
  setTargetAtTime() { return this; }
  cancelScheduledValues() { return this; }
  cancelAndHoldAtTime() { return this; }
}

// Try to get a native Web Audio Context from the platform
// WeChat: wx.createWebAudioContext()   Douyin: tt.getAudioContext()
let _nativeWebAudio = null;
try {
  if (typeof _api.createWebAudioContext === "function") {
    _nativeWebAudio = _api.createWebAudioContext();
    console.log("[Adapter] ✓ WebAudioContext (createWebAudioContext), sampleRate:", _nativeWebAudio.sampleRate, "state:", _nativeWebAudio.state);
  } else if (typeof _api.getAudioContext === "function") {
    _nativeWebAudio = _api.getAudioContext();
    console.log("[Adapter] ✓ AudioContext (getAudioContext), sampleRate:", _nativeWebAudio.sampleRate, "state:", _nativeWebAudio.state);
  } else {
    console.warn("[Adapter] 平台无 WebAudio API，音频将使用 InnerAudioContext 回退");
  }
} catch (e) {
  console.warn("[Adapter] WebAudioContext 创建失败:", e.message);
}

// Auto-resume suspended AudioContext on first user touch (autoplay policy).
// Both WeChat and Douyin may start the context in "suspended" state.
let _audioResumed = false;
function _tryResumeAudio() {
  if (_audioResumed || !_nativeWebAudio) return;
  if (_nativeWebAudio.state === "suspended" || _nativeWebAudio.state === "interrupted") {
    console.log("[Adapter] AudioContext state:", _nativeWebAudio.state, "→ resuming on user gesture");
    try {
      _nativeWebAudio.resume().then(function () {
        console.log("[Adapter] ✓ AudioContext resumed, state:", _nativeWebAudio.state);
        _audioResumed = true;
      }).catch(function (e) {
        console.warn("[Adapter] AudioContext resume failed:", e.message);
      });
    } catch (e) {
      console.warn("[Adapter] AudioContext resume error:", e.message);
    }
  } else {
    _audioResumed = true;
  }
}

// ── InnerAudioContext fallback (Douyin and platforms without WebAudio) ──
// When createWebAudioContext is unavailable, use InnerAudioContext to play audio.
// decodeAudioData saves raw audio bytes to a temp file; BufferSourceNode.start()
// creates an InnerAudioContext pointing to that file.
const _fs = typeof _api.getFileSystemManager === "function" ? _api.getFileSystemManager() : null;
const _userDataPath = (_api.env && _api.env.USER_DATA_PATH) || "";
let _audioTempIdx = 0;

function _saveAudioTemp(arrayBuffer) {
  if (!_fs || !_userDataPath) return null;
  const idx = _audioTempIdx++;
  const path = _userDataPath + "/audio_tmp_" + idx + ".bin";
  try {
    _fs.writeFileSync(path, arrayBuffer, "binary");
    return path;
  } catch (e) {
    console.warn("[Audio] failed to write temp audio:", e.message);
    return null;
  }
}

function _createInnerPlayer(filePath, loop, volume) {
  if (!filePath || typeof _api.createInnerAudioContext !== "function") return null;
  try {
    const player = _api.createInnerAudioContext();
    player.src = filePath;
    player.loop = !!loop;
    player.volume = volume != null ? volume : 1;
    return player;
  } catch (e) {
    console.warn("[Audio] InnerAudioContext create failed:", e.message);
    return null;
  }
}

// Patch native AudioNode for mini-game compatibility:
// 1. connect() must return destination (Web Audio spec, WeChat returns undefined)
// 2. addEventListener/removeEventListener may be missing on native WebAudio nodes;
//    Godot's WASM calls node.addEventListener("ended", cb) on BufferSourceNodes.
function _patchAudioNode(node) {
  if (!node) return node;
  if (typeof node.connect === "function") {
    const _origConnect = node.connect.bind(node);
    node.connect = function (dest) {
      _origConnect.apply(null, arguments);
      return dest;
    };
  }
  if (typeof node.addEventListener !== "function") {
    const _nodeListeners = {};
    node.addEventListener = function (type, fn) {
      if (!_nodeListeners[type]) _nodeListeners[type] = [];
      _nodeListeners[type].push(fn);
      // Bridge to on* setter for common events (e.g. "ended" → onended)
      const prop = "on" + type;
      if (prop in node) {
        node[prop] = function (evt) {
          const list = _nodeListeners[type];
          if (list) list.forEach(function (f) { try { f(evt); } catch (_) {} });
        };
      }
    };
    node.removeEventListener = function (type, fn) {
      const list = _nodeListeners[type];
      if (list) { const i = list.indexOf(fn); if (i !== -1) list.splice(i, 1); }
    };
  }
  if (typeof node.disconnect !== "function") {
    node.disconnect = function () {};
  }
  return node;
}

class _AudioContext {
  constructor(opts = {}) {
    // If native Web Audio is available, delegate to it
    if (_nativeWebAudio) {
      const ctx = _nativeWebAudio;
      // Copy native properties
      this.sampleRate = ctx.sampleRate || opts.sampleRate || 44100;
      this.state = ctx.state || "running";
      this.baseLatency = ctx.baseLatency || 0.01;
      this.outputLatency = ctx.outputLatency || 0.01;
      this.destination = _patchAudioNode(ctx.destination);
      this.listener = ctx.listener;
      // Provide a stub audioWorklet so godot.js can call addModule() without crashing.
      // The actual AudioWorkletNode constructor is our global stub that safely no-ops.
      this.audioWorklet = { addModule: () => Promise.resolve() };
      this._native = ctx;
      // Proxy currentTime to the native context (it's a live getter)
      Object.defineProperty(this, "currentTime", { get: () => ctx.currentTime });
      return;
    }
    // Fallback: stub
    this.sampleRate = opts.sampleRate || 44100;
    this.state = "running";
    this.baseLatency = 0.01;
    this.outputLatency = 0.01;
    this.currentTime = 0;
    this.destination = Object.assign(new _AudioNode(), { maxChannelCount: 6, numberOfInputs: 1, numberOfOutputs: 0 });
    this.listener = {
      positionX: new _AudioParam(0), positionY: new _AudioParam(0), positionZ: new _AudioParam(0),
      forwardX: new _AudioParam(0), forwardY: new _AudioParam(-1), forwardZ: new _AudioParam(0),
      upX: new _AudioParam(0), upY: new _AudioParam(0), upZ: new _AudioParam(1),
      setOrientation() {}, setPosition() {},
    };
    this.audioWorklet = { addModule: () => Promise.resolve() };
  }
  createGain()             { return this._native ? _patchAudioNode(this._native.createGain()) : (() => { const n = new _AudioNode(); n.gain = new _AudioParam(1); return n; })(); }
  createChannelSplitter(c) { return this._native ? _patchAudioNode(this._native.createChannelSplitter(c)) : new _AudioNode(); }
  createChannelMerger(c)   { return this._native ? _patchAudioNode(this._native.createChannelMerger(c)) : new _AudioNode(); }
  createBuffer(channels, length, sampleRate) {
    if (this._native) return this._native.createBuffer(channels, length, sampleRate);
    const bufs = []; for (let i = 0; i < channels; i++) bufs.push(new Float32Array(length));
    return {
      numberOfChannels: channels, length, sampleRate, duration: length / sampleRate,
      getChannelData(ch) { return bufs[ch] || new Float32Array(length); },
      copyFromChannel() {}, copyToChannel(src, ch, off) { if (bufs[ch]) bufs[ch].set(src, off || 0); },
    };
  }
  createBufferSource() {
    if (this._native) return _patchAudioNode(this._native.createBufferSource());
    const n = new _AudioNode();
    n.buffer = null; n.loop = false; n.loopStart = 0; n.loopEnd = 0;
    n.playbackRate = new _AudioParam(1); n.detune = new _AudioParam(0);
    n._player = null;
    n.start = function () {
      if (n.buffer && n.buffer._tempPath) {
        const vol = (n._gainNode && n._gainNode.gain) ? n._gainNode.gain.value : 1;
        n._player = _createInnerPlayer(n.buffer._tempPath, n.loop, vol);
        if (n._player) {
          n._player.onEnded(function () { if (n.onended) n.onended(); });
          n._player.onError(function (e) { console.warn("[Audio] playback error:", e.errMsg); });
          n._player.play();
        }
      }
    };
    n.stop = function () {
      if (n._player) { try { n._player.stop(); n._player.destroy(); } catch (_) {} n._player = null; }
      if (n.onended) setTimeout(n.onended, 0);
    };
    n.onended = null;
    const _origConnect = n.connect;
    n.connect = function (dest) {
      if (dest && dest.gain) n._gainNode = dest;
      return _origConnect.call(n, dest);
    };
    return n;
  }
  createOscillator()          { if (this._native) return _patchAudioNode(this._native.createOscillator()); const n = new _AudioNode(); n.frequency = new _AudioParam(440); n.detune = new _AudioParam(0); n.type = "sine"; n.start = () => {}; n.stop = () => {}; return n; }
  createScriptProcessor(a,b,c){ if (this._native) return _patchAudioNode(this._native.createScriptProcessor(a,b,c)); const n = new _AudioNode(); n.onaudioprocess = null; n.bufferSize = 4096; return n; }
  createAnalyser()            { if (this._native) return _patchAudioNode(this._native.createAnalyser()); const n = new _AudioNode(); n.fftSize = 2048; n.frequencyBinCount = 1024; n.getByteFrequencyData = () => {}; n.getFloatFrequencyData = () => {}; n.getByteTimeDomainData = () => {}; n.getFloatTimeDomainData = () => {}; return n; }
  createBiquadFilter()        { if (this._native) return _patchAudioNode(this._native.createBiquadFilter()); const n = new _AudioNode(); n.frequency = new _AudioParam(350); n.Q = new _AudioParam(1); n.gain = new _AudioParam(0); n.detune = new _AudioParam(0); n.type = "lowpass"; return n; }
  createDynamicsCompressor()  { if (this._native) return _patchAudioNode(this._native.createDynamicsCompressor()); const n = new _AudioNode(); n.threshold = new _AudioParam(-24); n.knee = new _AudioParam(30); n.ratio = new _AudioParam(12); n.attack = new _AudioParam(0.003); n.release = new _AudioParam(0.25); n.reduction = 0; return n; }
  createConvolver()           { if (this._native) return _patchAudioNode(this._native.createConvolver()); const n = new _AudioNode(); n.buffer = null; n.normalize = true; return n; }
  createPanner()              { if (this._native) return _patchAudioNode(this._native.createPanner()); return new _AudioNode(); }
  createStereoPanner()        { if (this._native) return _patchAudioNode(this._native.createStereoPanner()); const n = new _AudioNode(); n.pan = new _AudioParam(0); return n; }
  createDelay(max)            { if (this._native) return _patchAudioNode(this._native.createDelay(max)); const n = new _AudioNode(); n.delayTime = new _AudioParam(0); return n; }
  createWaveShaper()          { if (this._native) return _patchAudioNode(this._native.createWaveShaper()); const n = new _AudioNode(); n.curve = null; n.oversample = "none"; return n; }
  decodeAudioData(data, success, error) {
    if (this._native) return this._native.decodeAudioData(data, success, error);
    // Fallback: save raw audio to temp file for InnerAudioContext playback
    const tempPath = _saveAudioTemp(data);
    const sampleRate = this.sampleRate;
    const buf = this.createBuffer(2, 1, sampleRate);
    if (tempPath) {
      buf._tempPath = tempPath;
      console.log("[Audio] decoded to temp:", tempPath, "size:", data.byteLength);
    }
    if (success) { setTimeout(() => success(buf), 0); return; }
    return Promise.resolve(buf);
  }
  resume()  { if (this._native) return this._native.resume();  this.state = "running"; if (this.onstatechange) this.onstatechange(); return Promise.resolve(); }
  suspend() { if (this._native) return this._native.suspend(); this.state = "suspended"; if (this.onstatechange) this.onstatechange(); return Promise.resolve(); }
  close()   { if (this._native) return this._native.close();   this.state = "closed"; if (this.onstatechange) this.onstatechange(); return Promise.resolve(); }
}

// ── Build the window object ───────────────────────────────────────
const _hostCrypto = (
  _global.crypto && typeof _global.crypto.getRandomValues === "function"
    ? _global.crypto
    : globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function"
      ? globalThis.crypto
      : null
);
const _fallbackCrypto = {
  // Compatibility fallback only. This is intentionally not advertised as a
  // secure source and is never allowed to replace a host implementation.
  getRandomValues(view) {
    for (let i = 0; i < view.length; i++) view[i] = Math.floor(Math.random() * 256);
    return view;
  },
};

const _window = {
  document: _document, navigator: _navigator, localStorage: _localStorage,
  location: _location, performance: _performance, canvas: _mainCanvas,

  innerWidth: _viewportWidth, innerHeight: _viewportHeight,
  outerWidth: _viewportWidth, outerHeight: _viewportHeight,
  devicePixelRatio: _dpr,
  screen: {
    width: _winInfo.screenWidth || _viewportWidth,
    height: _winInfo.screenHeight || _viewportHeight,
    availWidth: _viewportWidth, availHeight: _viewportHeight,
    orientation: { type: "portrait-primary", angle: 0 },
  },

  setTimeout:            globalThis.setTimeout.bind(globalThis),
  clearTimeout:          globalThis.clearTimeout.bind(globalThis),
  setInterval:           globalThis.setInterval.bind(globalThis),
  clearInterval:         globalThis.clearInterval.bind(globalThis),
  requestAnimationFrame: globalThis.requestAnimationFrame.bind(globalThis),
  cancelAnimationFrame:  globalThis.cancelAnimationFrame.bind(globalThis),

  XMLHttpRequest: _XMLHttpRequest,
  WebSocket: _WebSocket,
  Image: function Image() { return _api.createImage(); },
  HTMLElement: class HTMLElement {},
  HTMLCanvasElement: _mainCanvas.constructor || class {},
  FileReader: class FileReader { readAsDataURL() {} readAsArrayBuffer() {} readAsText() {} },

  indexedDB: _indexedDB,
  AudioContext: _AudioContext, webkitAudioContext: _AudioContext,
  AudioWorkletNode: class AudioWorkletNode extends _AudioNode {
    constructor(ctx, name, opts) {
      super();
      this.port = { postMessage() {}, onmessage: null, addEventListener() {}, removeEventListener() {} };
      this.parameters = new Proxy(new Map(), {
        get(target, prop) {
          if (prop === "get") return (key) => {
            if (!target.has(key)) target.set(key, new _AudioParam(0));
            return target.get(key);
          };
          const val = Reflect.get(target, prop, target);
          return typeof val === "function" ? val.bind(target) : val;
        },
      });
    }
  },
  isSecureContext: true, crossOriginIsolated: false,
  SharedArrayBuffer: globalThis.SharedArrayBuffer,
  TextEncoder: globalThis.TextEncoder, TextDecoder: globalThis.TextDecoder,
  URL: (() => {
    const _base = globalThis.URL;
    if (!_base) return { createObjectURL: () => "", revokeObjectURL: () => {} };
    const u = function (...a) { return new _base(...a); };
    try { Object.assign(u, _base); } catch {}
    u.prototype = _base.prototype;
    u.createObjectURL = () => "";
    u.revokeObjectURL = () => {};
    return u;
  })(),

  addEventListener: _addEventListener, removeEventListener: _removeEventListener,
  dispatchEvent: (e) => _dispatchEvent(e.type, e),

  alert(msg) { console.warn("[alert]", msg); },
  confirm() { return true; },
  prompt() { return ""; },
  open() { return null; },
  focus() {}, blur() {},
  getComputedStyle: () => ({}),
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),

  crypto: _hostCrypto || _fallbackCrypto,
};
_window.self = _window; _window.top = _window; _window.parent = _window; _window.window = _window;

// ── Touch input forwarding ────────────────────────────────────────
// WeChat/Douyin canvas has NO native addEventListener — all touch input
// comes from platform APIs (wx.onTouchStart etc.).  We convert these to
// mouse, touch, AND pointer events and dispatch through _eventListeners
// which is where Godot's GodotEventListeners.add() has stored its handlers.
const _evtCanvas = _global.canvas || _mainCanvas;

// Wrap individual touches so Emscripten sees every field it reads
function _wrapTouch(t) {
  return {
    identifier: t.identifier ?? 0,
    clientX: t.clientX ?? 0, clientY: t.clientY ?? 0,
    pageX: t.pageX ?? t.clientX ?? 0, pageY: t.pageY ?? t.clientY ?? 0,
    screenX: t.screenX ?? t.clientX ?? 0, screenY: t.screenY ?? t.clientY ?? 0,
    radiusX: t.radiusX ?? 0, radiusY: t.radiusY ?? 0,
    rotationAngle: t.rotationAngle ?? 0, force: t.force ?? 1,
    target: _evtCanvas,
  };
}
function _wrapTouchList(raw) {
  if (!raw) return [];
  const arr = [];
  for (let i = 0; i < raw.length; i++) arr.push(_wrapTouch(raw[i]));
  arr.item = (i) => arr[i] || null;
  return arr;
}

function _toMouseEvt(type, t) {
  return { type, clientX: t.clientX, clientY: t.clientY,
    pageX: t.pageX ?? t.clientX, pageY: t.pageY ?? t.clientY,
    screenX: t.screenX ?? t.clientX, screenY: t.screenY ?? t.clientY,
    offsetX: t.clientX, offsetY: t.clientY,
    movementX: 0, movementY: 0,
    button: 0, buttons: type === "mouseup" ? 0 : 1, detail: 0,
    target: _evtCanvas, currentTarget: _evtCanvas, srcElement: _evtCanvas,
    cancelable: true, bubbles: true, timeStamp: Date.now(),
    preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
}
function _toTouchEvt(type, r) {
  return { type,
    touches: _wrapTouchList(r.touches),
    changedTouches: _wrapTouchList(r.changedTouches),
    target: _evtCanvas, currentTarget: _evtCanvas, srcElement: _evtCanvas,
    cancelable: true, bubbles: true, timeStamp: Date.now(),
    preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} };
}
function _toPointerEvt(type, t) {
  return { type,
    pointerId: t.identifier ?? 0, pointerType: "touch",
    clientX: t.clientX, clientY: t.clientY,
    pageX: t.pageX ?? t.clientX, pageY: t.pageY ?? t.clientY,
    screenX: t.screenX ?? t.clientX, screenY: t.screenY ?? t.clientY,
    offsetX: t.clientX, offsetY: t.clientY,
    movementX: 0, movementY: 0,
    width: 1, height: 1, pressure: type === "pointerup" ? 0 : 0.5,
    tiltX: 0, tiltY: 0, twist: 0, isPrimary: true,
    button: type === "pointermove" ? -1 : 0,
    buttons: type === "pointerup" ? 0 : 1, detail: 0,
    target: _evtCanvas, currentTarget: _evtCanvas, srcElement: _evtCanvas,
    cancelable: true, bubbles: true, timeStamp: Date.now(),
    preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {},
    getCoalescedEvents() { return []; }, getPredictedEvents() { return []; } };
}

let _touchDebugCount = 0;
_api.onTouchStart((r) => {
  const t = r.changedTouches[0]; if (!t) return;
  _tryResumeAudio();
  if (_touchDebugCount < 5) { console.log("[Touch] START", t.clientX?.toFixed(0), t.clientY?.toFixed(0), "audio:", _nativeWebAudio ? _nativeWebAudio.state : "stub", "listeners:", Object.keys(_eventListeners).filter(k => _eventListeners[k]?.length).join(",")); _touchDebugCount++; }
  _dispatchEvent("pointerdown", _toPointerEvt("pointerdown", t));
  _dispatchEvent("mousedown", _toMouseEvt("mousedown", t));
  _dispatchEvent("touchstart", _toTouchEvt("touchstart", r));
});
_api.onTouchMove((r) => {
  const t = r.changedTouches[0]; if (!t) return;
  _dispatchEvent("pointermove", _toPointerEvt("pointermove", t));
  _dispatchEvent("mousemove", _toMouseEvt("mousemove", t));
  _dispatchEvent("touchmove", _toTouchEvt("touchmove", r));
});
_api.onTouchEnd((r) => {
  const t = r.changedTouches[0]; if (!t) return;
  _dispatchEvent("pointerup", _toPointerEvt("pointerup", t));
  _dispatchEvent("mouseup", _toMouseEvt("mouseup", t));
  _dispatchEvent("touchend", _toTouchEvt("touchend", r));
});
if (typeof _api.onTouchCancel === "function") {
  _api.onTouchCancel((r) => {
    if (r.changedTouches[0]) _dispatchEvent("pointercancel", _toPointerEvt("pointercancel", r.changedTouches[0]));
    _dispatchEvent("touchcancel", _toTouchEvt("touchcancel", r));
  });
}

// ── Window resize ─────────────────────────────────────────────────
if (typeof _api.onWindowResize === "function") {
  _api.onWindowResize((r) => {
    const size = (r && r.size) || r || {};
    _setViewportSize(size.windowWidth, size.windowHeight);
    _window.innerWidth = _viewportWidth; _window.innerHeight = _viewportHeight;
    _window.outerWidth = _viewportWidth; _window.outerHeight = _viewportHeight;
    _window.screen.availWidth = _viewportWidth; _window.screen.availHeight = _viewportHeight;
    _dispatchEvent("resize", { type: "resize" });
  });
}

// ── Inject into global scope ──────────────────────────────────────
// `canvas` is pre-created by the mini game runtime as a read-only global.
// We must NOT overwrite it — just make sure our _mainCanvas IS that global.
const _skipKeys = new Set(["canvas"]);

if (_sysInfo.platform === "devtools") {
  for (const key of Object.keys(_window)) {
    if (_skipKeys.has(key)) continue;
    const desc = Object.getOwnPropertyDescriptor(_global, key);
    if (!desc || desc.configurable) {
      try { Object.defineProperty(_global, key, { value: _window[key], configurable: true }); } catch {}
    }
  }
  _window.canvas = _global.canvas || _mainCanvas;
} else {
  for (const key of Object.keys(_window)) {
    if (_skipKeys.has(key)) continue;
    try { _global[key] = _window[key]; } catch {}
  }
  _global.window = _window;
  _window.canvas = _global.canvas || _mainCanvas;
}

// Store polyfills on a private key that's guaranteed writable.
// _usableCanvas is either _mainCanvas (if patching succeeded) or a Proxy around it.
// The loader MUST use __adapter.canvas (not GameGlobal.canvas) to get the properly
// wrapped canvas, since GameGlobal.canvas may be a non-configurable native getter.
_global.__adapter = {
  document: _document,
  window: _window,
  navigator: _navigator,
  canvas: _usableCanvas,
};
console.log("[Adapter] __adapter.canvas addEventListener:", typeof _usableCanvas.addEventListener);
// Set canvas ID so Emscripten's "#canvas" selector works
_safeDefine(_mainCanvas, "id", "canvas");

// If GameGlobal.canvas is a different object (e.g. a Proxy was created), bridge it
if (_global.canvas && _global.canvas !== _mainCanvas) {
  console.log("[Adapter] ⚠ GameGlobal.canvas 与 _mainCanvas 不同，桥接中...");
  const _gc = _global.canvas;

  // Bridge getContext (cache WebGL contexts)
  const _gcGetCtx = _gc.getContext?.bind(_gc);
  if (_gcGetCtx && _gcGetCtx !== _wrappedGetContext) {
    const _gcCache = {};
    _safeDefine(_gc, "getContext", function (type, attrs) {
      if (_gcCache[type]) return _gcCache[type];
      const ctx = _gcGetCtx(type, attrs);
      if (ctx) _gcCache[type] = ctx;
      return ctx;
    });
  }

  // Install event listeners using the same robust method
  _installCanvasEvents(_gc, "GameGlobal.canvas");

  // Copy DOM-like properties
  _safeDefine(_gc, "id", "canvas");
  _safeDefine(_gc, "parentElement", _fakeParent);
  _safeDefine(_gc, "parentNode", _fakeParent);
  _installCanvasMetrics(_gc);
  if (!_gc.focus) _safeDefine(_gc, "focus", () => {});
  if (!_gc.blur) _safeDefine(_gc, "blur", () => {});
  _safeDefine(_gc, "requestPointerLock", () => {});
  _safeDefine(_gc, "requestFullscreen", () => Promise.resolve());
}

console.log("[Adapter] ✓ 适配层初始化完成, canvas:", _mainCanvas.width + "x" + _mainCanvas.height);
console.log("[Adapter] _mainCanvas === GameGlobal.canvas:", _mainCanvas === _global.canvas);
console.log("[Adapter] _mainCanvas.id:", _mainCanvas.id);
// Quick test
try {
  const _testCtx = _mainCanvas.getContext("webgl2");
  console.log("[Adapter] 测试 getContext('webgl2'):", _testCtx ? "OK" : "FAILED");
} catch (e) {
  console.error("[Adapter] 测试 getContext 异常:", e.message);
}

// ── WXWebAssembly / TTWebAssembly shim ───────────────────────────
// Mini-game WebAssembly APIs only accept file path strings, not ArrayBuffers.
// Emscripten glue code does: fetch(wasm) → ArrayBuffer → WebAssembly.instantiate(buf).
// We monkey-patch .instantiate so ArrayBuffer args are replaced with a file path.
(function () {
  const _wasmCandidates = ["engine/godot.wasm.br", "engine/godot.wasm"];
  const _natives = PlatformRuntime.getNativeWebAssemblyApis();

  // Save original instantiate references BEFORE patching
  const _wasmRef = _natives[0];
  const _origInstMap = new Map();
  for (const n of _natives) { if (n && n.instantiate) _origInstMap.set(n, n.instantiate); }

  function _tryLoad(native, candidates, imports, idx) {
    if (idx >= candidates.length) {
      return Promise.reject(new Error(
        "[WASM] all candidates failed: " + candidates.join(", ") +
        ". If you see CompileError, your WASM likely uses wasm-eh which is unsupported on real devices. " +
        "Import a mini-game compatible template via the Godot export dock."
      ));
    }
    var orig = _origInstMap.get(native);
    var path = candidates[idx];
    console.log("[WASM] loading:", path);
    return orig.call(native, path, imports).catch(function (e) {
      console.warn("[WASM] " + path + " failed:", e.name, e.message || String(e));
      return _tryLoad(native, candidates, imports, idx + 1);
    });
  }

  for (const native of _natives) {
    if (!_origInstMap.has(native)) continue;
    const _orig = _origInstMap.get(native);

    native.instantiate = function (source, imports) {
      if (typeof source === "string") {
        return _orig.call(native, source, imports);
      }
      return _tryLoad(native, _wasmCandidates, imports, 0);
    };
  }

  if (_wasmRef) {
    const shim = {};
    for (const key of Object.getOwnPropertyNames(_wasmRef)) {
      try { shim[key] = _wasmRef[key]; } catch (_) {}
    }
    shim.instantiateStreaming = function (_response, imports) {
      return _tryLoad(_wasmRef, _wasmCandidates, imports, 0);
    };
    // Ensure error constructors exist (WXWebAssembly may not provide them)
    const _stdWasm = PlatformRuntime.getStandardWebAssembly();
    for (const errName of ["CompileError", "LinkError", "RuntimeError"]) {
      if (!shim[errName]) {
        if (_stdWasm && _stdWasm[errName]) {
          shim[errName] = _stdWasm[errName];
        } else {
          shim[errName] = class extends Error { constructor(msg) { super(msg); this.name = errName; } };
        }
      }
    }
    if (!shim.Module && _stdWasm) shim.Module = _stdWasm.Module;
    if (!shim.Instance && _stdWasm) shim.Instance = _stdWasm.Instance;
    if (!shim.Memory && _stdWasm) shim.Memory = _stdWasm.Memory;
    if (!shim.Table && _stdWasm) shim.Table = _stdWasm.Table;
    if (!shim.Global && _stdWasm) shim.Global = _stdWasm.Global;
    if (!shim.validate && _stdWasm) shim.validate = _stdWasm.validate?.bind(_stdWasm);
    try {
      Object.defineProperty(_global, "WebAssembly", { value: shim, configurable: true, writable: true });
    } catch (_) {
      try { _global.WebAssembly = shim; } catch (_2) {}
    }
  }
})();
