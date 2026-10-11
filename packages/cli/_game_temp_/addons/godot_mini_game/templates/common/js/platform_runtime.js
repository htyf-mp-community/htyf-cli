/**
 * Single source of truth for mini-game platform detection.
 *
 * All common runtime modules consume this provider instead of probing `wx` or
 * `tt` independently. Keeping the selected API and platform name together
 * prevents mixed-provider behaviour and makes a missing host fail with a clear
 * error instead of an undeclared-global ReferenceError.
 */

const BRIDGE_ABI_VERSION = 1;
const RUNTIME_SCHEMA_VERSION = 1;
const RUNTIME_BRAND = "godot-mini-game-platform-runtime";
const RUNTIME_KEY = "__godotMiniGamePlatformRuntime";
const EMPTY_API = Object.freeze({});

function _safeSet(target, key, value) {
  if (!target) return;
  try {
    Object.defineProperty(target, key, {
      value,
      configurable: true,
      writable: true,
    });
  } catch (_) {
    try { target[key] = value; } catch (_2) {}
  }
}

function _objectOrNull(value) {
  return value && (typeof value === "object" || typeof value === "function")
    ? value
    : null;
}

function _normalisePlatform(value) {
  const name = String(value || "").toLowerCase();
  if (name === "wechat" || name === "weixin" || name === "wx") return "wechat";
  if (name === "douyin" || name === "tiktok" || name === "tt") return "douyin";
  return "unknown";
}

function _callObject(api, methodName) {
  if (!api || typeof api[methodName] !== "function") return null;
  try {
    return _objectOrNull(api[methodName].call(api));
  } catch (_) {
    return null;
  }
}

class PlatformProvider {
  constructor(scope) {
    this.brand = RUNTIME_BRAND;
    this.schemaVersion = RUNTIME_SCHEMA_VERSION;
    this.abiVersion = BRIDGE_ABI_VERSION;
    this.scope = scope;
    this.global = _objectOrNull(scope.GameGlobal) || scope;

    const explicitPlatform = _normalisePlatform(this.global.__platform);
    const wxApi = _objectOrNull(scope.wx);
    const ttApi = _objectOrNull(scope.tt);

    if (explicitPlatform === "wechat") {
      this.platform = "wechat";
      this.apiPrefix = "wx";
      this.api = wxApi || EMPTY_API;
    } else if (explicitPlatform === "douyin") {
      this.platform = "douyin";
      this.apiPrefix = "tt";
      this.api = ttApi || EMPTY_API;
    } else if (wxApi) {
      // Preserve the historical wx-first behaviour when both globals exist,
      // while keeping that choice isolated to this one module.
      this.platform = "wechat";
      this.apiPrefix = "wx";
      this.api = wxApi;
    } else if (ttApi) {
      this.platform = "douyin";
      this.apiPrefix = "tt";
      this.api = ttApi;
    } else {
      this.platform = explicitPlatform;
      this.apiPrefix = "platform";
      this.api = EMPTY_API;
    }

    this.available = this.api !== EMPTY_API;
    this.capabilities = Object.freeze(this._detectCapabilities());
    this.bridgeInfo = Object.freeze({
      brand: RUNTIME_BRAND,
      runtimeSchemaVersion: RUNTIME_SCHEMA_VERSION,
      abiVersion: BRIDGE_ABI_VERSION,
      platform: this.platform,
      capabilities: this.capabilities,
    });
  }

  has(apiName) {
    return typeof this.api[apiName] === "function";
  }

  hasAll(apiNames) {
    return apiNames.every((name) => this.has(name));
  }

  requireApi(consumer = "mini-game runtime") {
    if (this.available) return this.api;
    throw new Error(
      `[PlatformRuntime] ${consumer} requires a WeChat (wx) or Douyin (tt) mini-game API`,
    );
  }

  requirePlatform(expectedPlatform, consumer = "mini-game runtime") {
    const expected = _normalisePlatform(expectedPlatform);
    if (expected === "unknown") {
      throw new Error(`[PlatformRuntime] ${consumer} declared an invalid platform: ${expectedPlatform}`);
    }
    this.requireApi(consumer);
    if (this.platform !== expected) {
      throw new Error(
        `[PlatformRuntime] ${consumer} requires ${expected}, but detected ${this.platform}`,
      );
    }
    return this.api;
  }

  requireCapabilities(capabilityNames, consumer = "mini-game runtime") {
    this.requireApi(consumer);
    const requested = Array.isArray(capabilityNames) ? capabilityNames : [capabilityNames];
    const missing = requested.filter((name) => this.capabilities[name] !== true);
    if (missing.length > 0) {
      throw new Error(
        `[PlatformRuntime] ${consumer} is missing required capabilities: ${missing.join(", ")}`,
      );
    }
    return this.api;
  }

  getSystemInfo() {
    const legacy = _callObject(this.api, "getSystemInfoSync") || {};
    const modern = _callObject(this.api, "getWindowInfo") || {};
    return Object.assign({}, legacy, modern);
  }

  getBridgeInfo() {
    return this.bridgeInfo;
  }

  getNativeWebAssemblyApis() {
    const native = this.platform === "wechat"
      ? _objectOrNull(this.scope.WXWebAssembly)
      : this.platform === "douyin"
        ? _objectOrNull(this.scope.TTWebAssembly)
        : null;
    return native ? [native] : [];
  }

  getStandardWebAssembly() {
    return _objectOrNull(this.scope.WebAssembly);
  }

  _detectCapabilities() {
    return {
      canvas: this.has("createCanvas"),
      image: this.has("createImage"),
      request: this.has("request"),
      fileSystem: this.has("getFileSystemManager"),
      storage: this.hasAll(["getStorageSync", "setStorageSync"]),
      touch: this.hasAll(["onTouchStart", "onTouchMove", "onTouchEnd"]),
      touchCancel: this.has("onTouchCancel"),
      windowInfo: this.has("getWindowInfo") || this.has("getSystemInfoSync"),
      windowResize: this.has("onWindowResize"),
      subpackage: this.has("loadSubpackage"),
      updateManager: this.has("getUpdateManager"),
      lifecycle: this.hasAll(["onShow", "onHide", "onError"]),
      webAudio: this.has("createWebAudioContext") || this.has("getAudioContext"),
      innerAudio: this.has("createInnerAudioContext"),
      webAssembly: this.getNativeWebAssemblyApis().length > 0
        || this.getStandardWebAssembly() !== null,
    };
  }
}

function _isCompatibleRuntime(candidate, scope, runtimeGlobal) {
  return !!candidate
    && candidate.brand === RUNTIME_BRAND
    && candidate.schemaVersion === RUNTIME_SCHEMA_VERSION
    && candidate.abiVersion === BRIDGE_ABI_VERSION
    && candidate.scope === scope
    && candidate.global === runtimeGlobal
    && typeof candidate.requireApi === "function"
    && typeof candidate.requirePlatform === "function"
    && typeof candidate.requireCapabilities === "function"
    && typeof candidate.getSystemInfo === "function"
    && typeof candidate.getBridgeInfo === "function";
}

const _scope = typeof globalThis === "object" && globalThis
  ? globalThis
  : {};
const _runtimeGlobal = _objectOrNull(_scope.GameGlobal) || _scope;
let PlatformRuntime = _objectOrNull(_runtimeGlobal[RUNTIME_KEY])
  || _objectOrNull(_scope[RUNTIME_KEY]);

if (!_isCompatibleRuntime(PlatformRuntime, _scope, _runtimeGlobal)) {
  PlatformRuntime = new PlatformProvider(_scope);
}

_safeSet(_scope, RUNTIME_KEY, PlatformRuntime);
_safeSet(_runtimeGlobal, RUNTIME_KEY, PlatformRuntime);
_safeSet(_runtimeGlobal, "PlatformRuntime", PlatformRuntime);

export {
  BRIDGE_ABI_VERSION,
  PlatformProvider,
  PlatformRuntime,
  RUNTIME_BRAND,
  RUNTIME_SCHEMA_VERSION,
};
