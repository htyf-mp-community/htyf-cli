/**
 * Godot engine loader for mini games.
 *
 * Handles: loading screen → engine subpackage → boot Godot → FS restore → auto-sync.
 */

import "./libs/godot";
import { BRIDGE_GLOBAL_NAME, GodotSDK } from "./libs/sdk";
import { waitForImage } from "./image_loader";
import { PlatformRuntime } from "./platform_runtime";

const _api = PlatformRuntime.requireCapabilities(
  ["canvas", "fileSystem", "image", "lifecycle", "subpackage", "windowInfo"],
  "engine loader",
);
const _global = PlatformRuntime.global;

const LoaderConfig = {
  logo: "images/logo.png",
  background: "images/background.png",
  iconWidth: 128,
  iconHeight: 128,
  backgroundColor: "#282c34",
  loadingBarHeight: 20,
  loadingBarColor: "#478CBF",
  loadingBarBgColor: "#444",
};

const fallbackCrypto = {
  // Compatibility fallback only. Preserve a native crypto implementation
  // whenever the host provides one.
  getRandomValues(view) {
    for (let i = 0; i < view.length; i++) view[i] = Math.floor(Math.random() * 256);
    return view;
  },
};

class FakeBlob {
  constructor(data, opts) {
    this.data = data || [];
    this.type = opts?.type || "";
    this.size = this.data.reduce((t, i) => t + (i.length || 0), 0);
  }
}

const godotSdk = new GodotSDK();

function _safeSet(obj, key, value) {
  if (!obj) return false;
  try {
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    if (desc && !desc.writable && !desc.configurable) return obj[key] === value;
    Object.defineProperty(obj, key, { value, configurable: true, writable: true });
  } catch (_) { /* read-only in this runtime — skip */ }
  return obj[key] === value;
}

if (!_global.crypto || typeof _global.crypto.getRandomValues !== "function") {
  _safeSet(_global, "crypto", fallbackCrypto);
}
if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
  _safeSet(globalThis, "crypto", fallbackCrypto);
}
_safeSet(_global, "Blob", FakeBlob);
const _bridgeTargets = [_global, globalThis];
if (_global.__adapter && _global.__adapter.window) {
  _bridgeTargets.push(_global.__adapter.window);
}
for (const target of [...new Set(_bridgeTargets)]) {
  if (!_safeSet(target, BRIDGE_GLOBAL_NAME, godotSdk)) {
    throw new Error(`[Loader] Cannot register versioned bridge ${BRIDGE_GLOBAL_NAME}`);
  }
  // Backward-compatible alias for projects that access the JavaScript object
  // directly. GDScript uses the versioned name and performs an ABI handshake.
  _safeSet(target, "godotSdk", godotSdk);
}

// Use __adapter.canvas which has properly wrapped addEventListener/getContext,
// even when GameGlobal.canvas is a non-configurable native getter that we can't replace.
const _canvas = (_global.__adapter && _global.__adapter.canvas) || _global.canvas || _api.createCanvas();
const _window = (_global.__adapter && _global.__adapter.window) || _global.window || globalThis;
console.log("[Loader] canvas source:", _global.__adapter?.canvas ? "__adapter.canvas" : "GameGlobal.canvas");
console.log("[Loader] canvas.addEventListener:", typeof _canvas.addEventListener);

class Loader {
  constructor(config) {
    this.config = { ...LoaderConfig, ...config };
    const info = PlatformRuntime.getSystemInfo();
    const loadingDpr = Math.max(1, Number(info.pixelRatio) || 1);
    const logicalWidth = Math.max(1, Number(_window.innerWidth) || 1);
    const logicalHeight = Math.max(1, Number(_window.innerHeight) || 1);
    this.progress = 0;
    this.state = "idle";
    this.engine = null;
    this._loadPromise = null;
    this._syncTimer = null;
    this._loadingSurfaceCleaned = false;

    this.screenCtx = _canvas.getContext("webgl2");
    this.loadingCanvas = _api.createCanvas();
    this.loadingCtx = this.loadingCanvas.getContext("2d");
    this.loadingCanvas.width = logicalWidth * loadingDpr;
    this.loadingCanvas.height = logicalHeight * loadingDpr;
    // Preserve the adapter's physical resolution while DOM/touch metrics
    // remain logical. Do not downgrade the main canvas during loader setup.
    const engineDpr = Math.max(1, Number(_window.devicePixelRatio) || 1);
    _canvas.width = Math.max(1, Math.round(logicalWidth * engineDpr));
    _canvas.height = Math.max(1, Math.round(logicalHeight * engineDpr));
    this.loadingCtx.scale(loadingDpr, loadingDpr);

    this.bgImage = _api.createImage();
    this.bgImage.src = this.config.background;
    this.logoImage = _api.createImage();
    this.logoImage.src = this.config.logo;

    const [tex, clean] = this._initWebgl();
    this.screenTexture = tex;
    this.cleanWebgl = clean;
  }

  async loadSubpackages() {
    console.log("[Loader] await loadSubpackage('engine')...");
    await new Promise((resolve, reject) => {
      _api.loadSubpackage({ name: "engine", success: resolve, fail: reject });
    });
    console.log("[Loader] await loadSubpackage('engine') done");
    this._step();
  }

  _step() {
    this.progress = Math.min(this.progress + 1, 3);
    this._drawLoading();
  }

  _drawLoading() {
    const ctx = this.loadingCtx;
    const w = _window.innerWidth, h = _window.innerHeight;

    ctx.fillStyle = this.config.backgroundColor;
    ctx.fillRect(0, 0, w, h);
    if (this.bgImage.complete) ctx.drawImage(this.bgImage, 0, 0, w, h);
    if (this.logoImage.complete) {
      const iw = this.config.iconWidth, ih = this.config.iconHeight;
      ctx.drawImage(this.logoImage, (w - iw) / 2, h / 3 - ih / 3, iw, ih);
    }

    const barW = w - 48, barX = (w - barW) / 2, barY = h - this.config.loadingBarHeight / 2 - 100;
    const pct = this.progress / 3;
    ctx.fillStyle = this.config.loadingBarBgColor;
    ctx.fillRect(barX, barY, barW, this.config.loadingBarHeight);
    ctx.fillStyle = this.config.loadingBarColor;
    ctx.fillRect(barX, barY, pct * barW, this.config.loadingBarHeight);
    ctx.font = "16px sans-serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.fillText(`${(pct * 100).toFixed(1)}%`, w / 2, barY + this.config.loadingBarHeight - 4);

    this._blit();
  }

  _initWebgl() {
    const gl = this.screenCtx;
    const vsSrc = `attribute vec4 a_position; attribute vec2 a_texCoord; varying vec2 v_texCoord;
      void main() { gl_Position = a_position; v_texCoord = a_texCoord; }`;
    const fsSrc = `precision mediump float; varying vec2 v_texCoord; uniform sampler2D u_texture;
      void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }`;
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const vs = compile(gl.VERTEX_SHADER, vsSrc), fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);

    const verts = new Float32Array([-1,1,0,0, -1,-1,0,1, 1,-1,1,1, -1,1,0,0, 1,-1,1,1, 1,1,1,0]);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const posL = gl.getAttribLocation(prog, "a_position"); gl.vertexAttribPointer(posL, 2, gl.FLOAT, false, 16, 0); gl.enableVertexAttribArray(posL);
    const texL = gl.getAttribLocation(prog, "a_texCoord"); gl.vertexAttribPointer(texL, 2, gl.FLOAT, false, 16, 8); gl.enableVertexAttribArray(texL);

    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.viewport(0, 0, this.loadingCanvas.width, this.loadingCanvas.height);

    const clean = () => {
      for (let i = 0; i < gl.getParameter(gl.MAX_VERTEX_ATTRIBS); i++) gl.disableVertexAttribArray(i);
      gl.deleteTexture(tex); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    };
    return [tex, clean];
  }

  _blit() {
    const gl = this.screenCtx;
    gl.bindTexture(gl.TEXTURE_2D, this.screenTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.loadingCanvas);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  load() {
    if (this.state === "disposed") {
      return Promise.reject(new Error("[Loader] Cannot load after dispose()"));
    }
    if (!this._loadPromise) {
      this.state = "loading";
      this._loadPromise = this._loadOnce();
    }
    return this._loadPromise;
  }

  async _loadOnce() {
    try {
      console.log("[Loader] ▶ 开始加载流程");

      console.log("[Loader] 1/6 加载图片资源...");
      await Promise.all([waitForImage(this.bgImage), waitForImage(this.logoImage)]);
      this._assertNotDisposed();

      console.log("[Loader] 2/6 图片加载完成，开始加载引擎子包...");
      this._step();
      await this.loadSubpackages();
      this._assertNotDisposed();

      console.log("[Loader] 3/6 子包加载完成，初始化引擎...");
      this._step();
      const _Engine = _global.Engine || globalThis.Engine || null;
      console.log("[Loader]     Engine 类:", _Engine ? "已找到" : "未找到!");
      if (!_Engine) throw new Error("Engine not found – godot.js may not have loaded correctly");
      const engine = new _Engine();
      _global.engine = engine;
      this.engine = engine;
      godotSdk.set_engine(engine);

      console.log("[Loader] 4/6 调用 engine.startGame()...");
      console.log("[Loader]     canvas:", _canvas ? `${_canvas.width}x${_canvas.height}` : "null");
      const ctx = _canvas.getContext("webgl2");
      console.log("[Loader]     WebGL2 context:", ctx ? "OK" : "FAILED (null)");
      if (ctx) {
        console.log("[Loader]     GL_RENDERER:", ctx.getParameter?.(ctx.RENDERER));
        console.log("[Loader]     GL_VERSION:", ctx.getParameter?.(ctx.VERSION));
      }

      await engine.startGame({
        canvas: _canvas,
        executable: "engine/godot",
        mainPack: "engine/godot.zip",
        args: [],
      });
      this._assertNotDisposed();

      console.log("[Loader] 5/6 engine.startGame() 完成，设置文件同步...");
      if (typeof engine !== "undefined" && engine.config && engine.config.persistentPaths) {
        engine.config.persistentPaths.forEach(p => godotSdk.copyLocalToFS(p));
      }
      this._syncTimer = _window.setInterval(() => {
        godotSdk.syncfs(null, err => { if (err) console.error("[sync]", err); });
      }, 5000);
      this.logoImage = null;
      this._cleanupLoadingSurface();
      this.state = "running";
      console.log("[Loader] 6/6 ✓ 加载完成，游戏已启动");
      return engine;
    } catch (err) {
      if (this.state !== "disposed") this.state = "failed";
      this._cleanupLoadingSurface();
      console.error("[Loader] ✗ 加载失败:", err);
      if (err && err.stack) console.error("[Loader] Stack:", err.stack);
      throw err;
    }
  }

  _assertNotDisposed() {
    if (this.state === "disposed") throw new Error("[Loader] Load was disposed");
  }

  _cleanupLoadingSurface() {
    if (this._loadingSurfaceCleaned) return;
    this._loadingSurfaceCleaned = true;
    try {
      this.loadingCtx.clearRect(0, 0, this.loadingCanvas.width, this.loadingCanvas.height);
    } catch (_) {}
    try { this.cleanWebgl(); } catch (_) {}
  }

  dispose() {
    if (this.state === "disposed") return;
    if (this._syncTimer !== null) {
      _window.clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
    if (this.engine && typeof this.engine.requestQuit === "function") {
      try { this.engine.requestQuit(); } catch (_) {}
    }
    if (_global.engine === this.engine) _safeSet(_global, "engine", null);
    this._cleanupLoadingSurface();
    this.state = "disposed";
  }
}

export default Loader;
