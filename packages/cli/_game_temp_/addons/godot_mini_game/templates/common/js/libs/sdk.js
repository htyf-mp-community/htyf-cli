/**
 * GodotSDK — Mini-game platform bridge.
 *
 * Provides a unified API surface over the selected mini-game provider for
 * GDScript via JavaScriptBridge.
 * Exposed as `GameGlobal.godotSdk`.
 */

import {
  BRIDGE_ABI_VERSION,
  PlatformRuntime,
  RUNTIME_BRAND,
  RUNTIME_SCHEMA_VERSION,
} from "../platform_runtime";

const _api = PlatformRuntime.api;
const BRIDGE_BRAND = "godot-mini-game-bridge";
const BRIDGE_GLOBAL_NAME = "godotMiniGameBridgeV1";

// Best-effort error formatter. Default `console.warn("[SDK] ...", err)` outputs
// "[SDK] ... [object Object]" or "[SDK] ... {}" for proxy-wrapped platform error
// objects (BannerAd.onError, requestMidasPayment.fail, etc.), which is useless
// in DevTools. Pull the human-readable fields out first.
function _fmtErr(err) {
  if (err == null) return "(no error info)";
  if (typeof err === "string") return err;
  const parts = [];
  if (err.errCode !== undefined) parts.push(`code=${err.errCode}`);
  if (err.errMsg) parts.push(err.errMsg);
  else if (err.message) parts.push(err.message);
  if (parts.length === 0) {
    try { return JSON.stringify(err); } catch (_) { return String(err); }
  }
  return parts.join(" ");
}

// Returns a system-info-shaped object, preferring the new (non-deprecated)
// composed APIs introduced in WeChat base library 2.20+. Older versions still
// have getSystemInfoSync but it emits a deprecation notice on every call,
// polluting the console.
function _getSystemInfoModern() {
  if (_api.getDeviceInfo && _api.getWindowInfo && _api.getAppBaseInfo) {
    return Object.assign({},
      _api.getDeviceInfo(),
      _api.getWindowInfo(),
      _api.getAppBaseInfo());
  }
  return _api.getSystemInfoSync();
}

function _jsonSafe(value) {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, (_key, v) => typeof v === "function" ? undefined : v);
  } catch (_) {
    return String(value);
  }
}

function _jsonObject(value, fallback = {}) {
  if (value == null || value === "") return fallback;
  try {
    const parsed = (typeof value === "string") ? JSON.parse(value) : value;
    return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

function _jsonArray(value, fallback = []) {
  if (value == null || value === "") return fallback;
  try {
    const parsed = (typeof value === "string") ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

function _cloudValue(value) {
  if (typeof value === "string") return value;
  return _jsonSafe(value);
}

function _kvDataList(value) {
  if (value == null || value === "") return [];
  let parsed;
  try { parsed = (typeof value === "string") ? JSON.parse(value) : value; }
  catch (_) { return []; }

  if (Array.isArray(parsed)) {
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({ key: String(item.key || ""), value: _cloudValue(item.value) }))
      .filter((item) => item.key);
  }
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed).map(([key, val]) => ({
      key: String(key),
      value: _cloudValue(val),
    }));
  }
  return [];
}

function _platformPrefix() {
  return PlatformRuntime.apiPrefix;
}

function _unsupported(apiName) {
  return `${_platformPrefix()}.${apiName} is not supported`;
}

function _num(value) {
  const n = Number(value);
  return isFinite(n) ? n : 0;
}

function _bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  if (typeof btoa === "function") return btoa(binary);
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  return "";
}

function _arrayBufferBytes(value) {
  if (typeof ArrayBuffer === "undefined") return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView && ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return null;
}

function _arrayBufferToBase64(value) {
  const bytes = _arrayBufferBytes(value);
  return bytes ? _bytesToBase64(bytes) : "";
}

function _normalizeFileSystemResult(res) {
  const data = res && res.data;
  const bytes = _arrayBufferBytes(data);
  if (!bytes) return res || {};
  const normalized = Object.assign({}, res || {});
  delete normalized.data;
  normalized.dataType = "arraybuffer";
  normalized.base64 = _arrayBufferToBase64(data);
  normalized.byteLength = bytes.byteLength;
  return normalized;
}

function _socketMessagePayload(data) {
  if (typeof data === "string") {
    return {
      data,
      dataJson: _jsonSafe({ dataType: "string", data }),
    };
  }
  const bytes = _arrayBufferBytes(data);
  if (bytes) {
    return {
      data: "",
      dataJson: _jsonSafe({
        dataType: "arraybuffer",
        base64: _arrayBufferToBase64(data),
        byteLength: bytes.byteLength,
      }),
    };
  }
  return {
    data: "",
    dataJson: _jsonSafe({ dataType: typeof data, data: _jsonSafe(data) }),
  };
}

function _normalizeCameraFrame(res) {
  const frame = Object.assign({}, res || {});
  const bytes = _arrayBufferBytes(frame.data);
  if (bytes) {
    delete frame.data;
    frame.dataType = "arraybuffer";
    frame.base64 = _arrayBufferToBase64(res.data);
    frame.byteLength = bytes.byteLength;
  }
  return frame;
}

function _normalizeRecorderEvent(eventName, res) {
  const data = Object.assign({}, res || {});
  if (eventName === "frameRecorded") {
    const bytes = _arrayBufferBytes(data.frameBuffer);
    if (bytes) {
      const frameBuffer = data.frameBuffer;
      data.frameBuffer = {
        dataType: "arraybuffer",
        base64: _arrayBufferToBase64(frameBuffer),
        byteLength: bytes.byteLength,
      };
    }
  }
  return data;
}

function _normalizeVideoDecoderFrame(frame) {
  if (!frame) return null;
  const data = Object.assign({}, frame || {});
  const bytes = _arrayBufferBytes(data.data);
  if (bytes) {
    const frameData = data.data;
    delete data.data;
    data.dataType = "arraybuffer";
    data.base64 = _arrayBufferToBase64(frameData);
    data.byteLength = bytes.byteLength;
  }
  return data;
}

function _reasonToString(reason) {
  if (reason == null) return "";
  if (typeof reason === "string") return reason;
  if (reason.message) return String(reason.message);
  return _fmtErr(reason);
}

class GodotSDK {

  constructor() {
    const info = PlatformRuntime.getBridgeInfo();
    this.abiVersion = BRIDGE_ABI_VERSION;
    this.platform = info.platform;
    this.capabilities = info.capabilities;
    this.bridgeInfo = Object.freeze({
      brand: BRIDGE_BRAND,
      globalName: BRIDGE_GLOBAL_NAME,
      abiVersion: BRIDGE_ABI_VERSION,
      runtimeBrand: RUNTIME_BRAND,
      runtimeSchemaVersion: RUNTIME_SCHEMA_VERSION,
      platform: info.platform,
      capabilities: info.capabilities,
    });
  }

  getBridgeInfo() { return _jsonSafe(this.bridgeInfo); }

  validateBridge(expectedAbi, requiredMethodsJson = "[]") {
    let requiredMethods = [];
    try {
      const parsed = JSON.parse(requiredMethodsJson || "[]");
      if (Array.isArray(parsed)) requiredMethods = parsed.map(String);
    } catch (_) {
      return _jsonSafe({ ok: false, error: "required bridge methods must be a JSON array" });
    }
    const missingMethods = requiredMethods.filter((name) => typeof this[name] !== "function");
    const abiMatches = Number(expectedAbi) === BRIDGE_ABI_VERSION;
    return _jsonSafe({
      ok: abiMatches && missingMethods.length === 0,
      error: !abiMatches
        ? `Bridge ABI ${BRIDGE_ABI_VERSION} does not match expected ABI ${expectedAbi}`
        : missingMethods.length > 0
          ? `Bridge is missing required methods: ${missingMethods.join(", ")}`
          : "",
      missingMethods,
      bridgeInfo: this.bridgeInfo,
    });
  }

  // ── Engine binding ──────────────────────────────────────────────

  set_engine(engine) { this.engine = engine; }

  // ── Generic platform API bridge ─────────────────────────────────

  callApi(apiName, paramsJson, callback) {
    if (!/^[A-Za-z_$][\w$]*$/.test(apiName || "")) {
      callback(apiName || "", false, "", "Invalid API name");
      return;
    }
    const fn = _api[apiName];
    if (typeof fn !== "function") {
      callback(apiName, false, "", _unsupported(apiName));
      return;
    }

    let params = {};
    try { params = paramsJson ? JSON.parse(paramsJson) : {}; }
    catch (_) { callback(apiName, false, "", "Invalid JSON params"); return; }

    let settled = false;
    const finish = (ok, data, err) => {
      if (settled) return;
      settled = true;
      callback(apiName, !!ok, ok ? _jsonSafe(data) : "", ok ? "" : _fmtErr(err));
    };

    try {
      const positional = params && Array.isArray(params._args) ? params._args : null;
      let result;
      if (positional) {
        result = fn.apply(_api, positional);
      } else {
        const opts = (params && typeof params === "object" && !Array.isArray(params)) ? { ...params } : {};
        opts.success = (res) => finish(true, res || {});
        opts.fail = (err) => finish(false, null, err);
        opts.complete = (res) => {
          if (!settled && res && typeof res.errMsg === "string" && res.errMsg.includes(":fail")) {
            finish(false, null, res);
          }
        };
        result = fn.call(_api, opts);
      }

      if (result && typeof result.then === "function") {
        result.then((res) => finish(true, res || {})).catch((err) => finish(false, null, err));
      } else if (result !== undefined && !settled) {
        finish(true, result);
      } else if (apiName.endsWith("Sync") && !settled) {
        finish(true, result);
      }
    } catch (e) {
      finish(false, null, e);
    }
  }

  // ── Persistent Storage (sync) ───────────────────────────────────

  storageSet(key, value) {
    try { _api.setStorageSync(key, String(value)); }
    catch (e) { console.error("[SDK] storageSet:", e); }
  }

  storageGet(key, defaultValue) {
    try {
      const v = _api.getStorageSync(key);
      return (v !== undefined && v !== null && v !== "") ? String(v) : (defaultValue || "");
    } catch (e) { return defaultValue || ""; }
  }

  storageRemove(key) {
    try { _api.removeStorageSync(key); }
    catch (e) { console.error("[SDK] storageRemove:", e); }
  }

  storageClear() {
    try { _api.clearStorageSync(); }
    catch (e) { console.error("[SDK] storageClear:", e); }
  }

  storageGetAll() {
    try {
      const res = _api.getStorageInfoSync();
      return JSON.stringify({ keys: res.keys, size: res.currentSize, limit: res.limitSize });
    } catch (e) { return "{}"; }
  }

  // ── Auth / Login ────────────────────────────────────────────────

  login(callback) {
    _api.login({
      success: (res) => callback(res.code || "", ""),
      fail: (err) => callback("", _fmtErr(err)),
    });
  }

  getUserInfo(callback) {
    const handler = {
      desc: "用于完善用户资料",
      success: (res) => callback(JSON.stringify(res.userInfo || {}), ""),
      fail: (err) => callback("", _fmtErr(err)),
    };
    if (_api.getUserProfile) {
      _api.getUserProfile(handler);
    } else {
      _api.getUserInfo(handler);
    }
  }

  checkSession(callback) {
    _api.checkSession({
      success: () => callback(true, ""),
      fail: (err) => callback(false, _fmtErr(err) || "session expired"),
    });
  }

  // ── Privacy Authorization ──────────────────────────────────────

  getPrivacySetting(callback) {
    if (typeof _api.getPrivacySetting !== "function") {
      callback(false, "", "", _unsupported("getPrivacySetting"));
      return;
    }
    try {
      _api.getPrivacySetting({
        success: (res) => {
          const data = res || {};
          callback(!!data.needAuthorization, data.privacyContractName || "", _jsonSafe(data), "");
        },
        fail: (err) => callback(false, "", "", _fmtErr(err)),
      });
    } catch (e) {
      callback(false, "", "", _fmtErr(e));
    }
  }

  requirePrivacyAuthorize(callback) {
    if (typeof _api.requirePrivacyAuthorize !== "function") {
      callback(false, _unsupported("requirePrivacyAuthorize"));
      return;
    }
    try {
      _api.requirePrivacyAuthorize({
        success: () => callback(true, ""),
        fail: (err) => callback(false, _fmtErr(err)),
      });
    } catch (e) {
      callback(false, _fmtErr(e));
    }
  }

  openPrivacyContract(callback) {
    if (typeof _api.openPrivacyContract !== "function") {
      callback(false, _unsupported("openPrivacyContract"));
      return;
    }
    try {
      _api.openPrivacyContract({
        success: () => callback(true, ""),
        fail: (err) => callback(false, _fmtErr(err)),
      });
    } catch (e) {
      callback(false, _fmtErr(e));
    }
  }

  onNeedPrivacyAuthorization(callback) {
    if (typeof _api.onNeedPrivacyAuthorization !== "function") {
      callback("{}", _unsupported("onNeedPrivacyAuthorization"));
      return;
    }
    try {
      _api.onNeedPrivacyAuthorization((resolve, eventInfo) => {
        this._privacyResolve = resolve;
        callback(_jsonSafe(eventInfo || {}), "");
      });
    } catch (e) {
      callback("{}", _fmtErr(e));
    }
  }

  resolvePrivacyAuthorization(event, buttonId) {
    const chosen = event || "agree";
    if (!["exposureAuthorization", "agree", "disagree"].includes(chosen)) return false;
    if (typeof this._privacyResolve !== "function") return false;

    const payload = { event: chosen };
    if (chosen === "agree") {
      if (!buttonId) return false;
      payload.buttonId = buttonId;
    }

    try {
      this._privacyResolve(payload);
      if (chosen === "agree" || chosen === "disagree") this._privacyResolve = null;
      return true;
    } catch (e) {
      console.warn("[SDK] resolvePrivacyAuthorization:", _fmtErr(e));
      return false;
    }
  }

  // ── Settings / Authorization / Native Buttons / Account ────────

  getSetting(withSubscriptions, callback) {
    if (typeof _api.getSetting !== "function") {
      callback("", _unsupported("getSetting"));
      return;
    }
    try {
      _api.getSetting({
        withSubscriptions: !!withSubscriptions,
        success: (res) => callback(_jsonSafe(res || {}), ""),
        fail: (err) => callback("", _fmtErr(err)),
      });
    } catch (e) {
      callback("", _fmtErr(e));
    }
  }

  openSetting(withSubscriptions, callback) {
    if (typeof _api.openSetting !== "function") {
      callback("", _unsupported("openSetting"));
      return;
    }
    try {
      _api.openSetting({
        withSubscriptions: !!withSubscriptions,
        success: (res) => callback(_jsonSafe(res || {}), ""),
        fail: (err) => callback("", _fmtErr(err)),
      });
    } catch (e) {
      callback("", _fmtErr(e));
    }
  }

  authorize(scope, callback) {
    if (typeof _api.authorize !== "function") {
      callback(scope || "", false, _unsupported("authorize"));
      return;
    }
    try {
      _api.authorize({
        scope: scope || "",
        success: () => callback(scope || "", true, ""),
        fail: (err) => callback(scope || "", false, _fmtErr(err)),
      });
    } catch (e) {
      callback(scope || "", false, _fmtErr(e));
    }
  }

  _nativeButtonDef(buttonType) {
    switch (buttonType || "") {
      case "userInfo":
        return { type: "userInfo", createApi: "createUserInfoButton", objectName: "UserInfoButton" };
      case "openSetting":
        return { type: "openSetting", createApi: "createOpenSettingButton", objectName: "OpenSettingButton" };
      case "gameClub":
        return { type: "gameClub", createApi: "createGameClubButton", objectName: "GameClubButton" };
      default:
        return null;
    }
  }

  _nativeButtonActionName(def, action) {
    if (!def) return action || "";
    return `${def.objectName}.${action}`;
  }

  _nativeButtonTapError(res) {
    return (res && typeof res.errMsg === "string" && res.errMsg.includes(":fail")) ? _fmtErr(res) : "";
  }

  _createNativeButton(buttonType, optionsJson, callback, eventCallback) {
    const def = this._nativeButtonDef(buttonType);
    if (!def) {
      callback(buttonType || "", "createNativeButton", false, "", `Unsupported native button type: ${buttonType || ""}`);
      return;
    }
    if (typeof _api[def.createApi] !== "function") {
      callback(def.type, def.createApi, false, "", _unsupported(def.createApi));
      return;
    }

    const options = _jsonObject(optionsJson);
    try {
      this._nativeButtons = this._nativeButtons || {};
      const oldState = this._nativeButtons[def.type];
      if (oldState && oldState.button && typeof oldState.button.destroy === "function") {
        try { oldState.button.destroy(); } catch (_) {}
      }

      const button = _api[def.createApi](options) || null;
      if (!button) {
        callback(def.type, def.createApi, false, "", `${_platformPrefix()}.${def.createApi} returned no ${def.objectName}`);
        return;
      }

      const state = { button, tapListener: null, options };
      if (typeof button.onTap === "function" && typeof eventCallback === "function") {
        state.tapListener = (res) => {
          const data = res || {};
          eventCallback(def.type, _jsonSafe(data), this._nativeButtonTapError(data));
        };
        button.onTap(state.tapListener);
      }
      this._nativeButtons[def.type] = state;
      callback(def.type, def.createApi, true, _jsonSafe(options), "");
    } catch (e) {
      callback(def.type, def.createApi, false, "", _fmtErr(e));
    }
  }

  createUserInfoButton(optionsJson, callback, eventCallback) {
    return this._createNativeButton("userInfo", optionsJson, callback, eventCallback);
  }

  createOpenSettingButton(optionsJson, callback, eventCallback) {
    return this._createNativeButton("openSetting", optionsJson, callback, eventCallback);
  }

  createGameClubButton(optionsJson, callback, eventCallback) {
    return this._createNativeButton("gameClub", optionsJson, callback, eventCallback);
  }

  nativeButtonAction(buttonType, action, callback) {
    const def = this._nativeButtonDef(buttonType);
    if (!def) {
      callback(buttonType || "", action || "", false, "", `Unsupported native button type: ${buttonType || ""}`);
      return;
    }
    if (!["show", "hide", "destroy"].includes(action || "")) {
      callback(def.type, action || "", false, "", `Invalid native button action: ${action || ""}`);
      return;
    }

    const actionName = this._nativeButtonActionName(def, action);
    const state = this._nativeButtons && this._nativeButtons[def.type];
    if (!state || !state.button) {
      callback(def.type, actionName, false, "", `No active ${def.objectName}`);
      return;
    }
    if (typeof state.button[action] !== "function") {
      callback(def.type, actionName, false, "", `${actionName} is not supported`);
      return;
    }

    try {
      state.button[action]();
      if (action === "destroy") delete this._nativeButtons[def.type];
      callback(def.type, actionName, true, "{}", "");
    } catch (e) {
      callback(def.type, actionName, false, "", _fmtErr(e));
    }
  }

  stopNativeButtonTap(buttonType, callback) {
    const def = this._nativeButtonDef(buttonType);
    if (!def) {
      callback(buttonType || "", "offTap", false, "", `Unsupported native button type: ${buttonType || ""}`);
      return;
    }
    const actionName = this._nativeButtonActionName(def, "offTap");
    const state = this._nativeButtons && this._nativeButtons[def.type];
    if (!state || !state.button) {
      callback(def.type, actionName, false, "", `No active ${def.objectName}`);
      return;
    }
    if (typeof state.button.offTap !== "function") {
      callback(def.type, actionName, false, "", `${actionName} is not supported`);
      return;
    }

    try {
      if (!state.tapListener) {
        callback(def.type, actionName, true, "{}", "");
        return;
      }
      state.button.offTap(state.tapListener);
      state.tapListener = null;
      callback(def.type, actionName, true, "{}", "");
    } catch (e) {
      callback(def.type, actionName, false, "", _fmtErr(e));
    }
  }

  // ── Debug Logging ──────────────────────────────────────────────

  _logArgs(argsJson) {
    if (argsJson == null || argsJson === "") return [];
    try {
      const parsed = (typeof argsJson === "string") ? JSON.parse(argsJson) : argsJson;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (_) {
      return [String(argsJson)];
    }
  }

  setEnableDebug(enableDebug, callback) {
    if (typeof _api.setEnableDebug !== "function") {
      callback("setEnableDebug", false, "", _unsupported("setEnableDebug"));
      return;
    }
    let settled = false;
    const finish = (ok, data, err) => {
      if (settled) return;
      settled = true;
      callback("setEnableDebug", !!ok, ok ? _jsonSafe(data || {}) : "", ok ? "" : _fmtErr(err));
    };
    try {
      const result = _api.setEnableDebug({
        enableDebug: !!enableDebug,
        success: (res) => finish(true, res || {}),
        fail: (err) => finish(false, null, err),
      });
      if (result && typeof result.then === "function") {
        result.then((res) => finish(true, res || {})).catch((err) => finish(false, null, err));
      }
    } catch (e) {
      finish(false, null, e);
    }
  }

  getLogManager(level, callback) {
    if (typeof _api.getLogManager !== "function") {
      this._logManager = null;
      callback("getLogManager", false, "", _unsupported("getLogManager"));
      return;
    }
    const numericLevel = Number(level) === 1 ? 1 : 0;
    try {
      this._logManager = _api.getLogManager({ level: numericLevel }) || null;
      if (!this._logManager) {
        callback("getLogManager", false, "", `${_platformPrefix()}.getLogManager returned no LogManager`);
        return;
      }
      callback("getLogManager", true, _jsonSafe({ level: numericLevel }), "");
    } catch (e) {
      this._logManager = null;
      callback("getLogManager", false, "", _fmtErr(e));
    }
  }

  logManagerWrite(level, argsJson, callback) {
    const method = String(level || "");
    const action = `LogManager.${method}`;
    if (!["debug", "info", "log", "warn"].includes(method)) {
      callback(action, false, "", `Invalid LogManager level: ${method}`);
      return;
    }
    if (!this._logManager) {
      callback(action, false, "", "No active LogManager");
      return;
    }
    if (typeof this._logManager[method] !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return;
    }
    const args = this._logArgs(argsJson);
    try {
      this._logManager[method].apply(this._logManager, args);
      callback(action, true, _jsonSafe({ args }), "");
    } catch (e) {
      callback(action, false, "", _fmtErr(e));
    }
  }

  getRealtimeLogManager(callback) {
    if (typeof _api.getRealtimeLogManager !== "function") {
      this._realtimeLogManager = null;
      this._realtimeLogger = null;
      callback("getRealtimeLogManager", false, "", _unsupported("getRealtimeLogManager"));
      return;
    }
    try {
      this._realtimeLogManager = _api.getRealtimeLogManager() || null;
      this._realtimeLogger = this._realtimeLogManager;
      if (!this._realtimeLogManager) {
        this._realtimeLogger = null;
        callback("getRealtimeLogManager", false, "", `${_platformPrefix()}.getRealtimeLogManager returned no RealtimeLogManager`);
        return;
      }
      callback("getRealtimeLogManager", true, "{}", "");
    } catch (e) {
      this._realtimeLogManager = null;
      this._realtimeLogger = null;
      callback("getRealtimeLogManager", false, "", _fmtErr(e));
    }
  }

  realtimeLogManagerWrite(level, argsJson, callback) {
    const method = String(level || "");
    const action = `RealtimeLogManager.${method}`;
    if (!["info", "warn", "error"].includes(method)) {
      callback(action, false, "", `Invalid RealtimeLogManager level: ${method}`);
      return;
    }
    const logger = this._realtimeLogger || this._realtimeLogManager;
    if (!logger) {
      callback(action, false, "", "No active RealtimeLogManager");
      return;
    }
    if (typeof logger[method] !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return;
    }
    const args = this._logArgs(argsJson);
    try {
      logger[method].apply(logger, args);
      callback(action, true, _jsonSafe({ args }), "");
    } catch (e) {
      callback(action, false, "", _fmtErr(e));
    }
  }

  _realtimeLogManagerFilter(actionMethod, msg, callback) {
    const action = `RealtimeLogManager.${actionMethod}`;
    if (!this._realtimeLogManager) {
      callback(action, false, "", "No active RealtimeLogManager");
      return;
    }
    if (typeof this._realtimeLogManager[actionMethod] !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return;
    }
    const text = String(msg || "");
    try {
      this._realtimeLogManager[actionMethod](text);
      callback(action, true, _jsonSafe({ msg: text }), "");
    } catch (e) {
      callback(action, false, "", _fmtErr(e));
    }
  }

  realtimeLogManagerSetFilterMsg(msg, callback) {
    return this._realtimeLogManagerFilter("setFilterMsg", msg, callback);
  }

  realtimeLogManagerAddFilterMsg(msg, callback) {
    return this._realtimeLogManagerFilter("addFilterMsg", msg, callback);
  }

  realtimeLogManagerTag(tag, callback) {
    const action = "RealtimeLogManager.tag";
    if (!this._realtimeLogManager) {
      callback(action, false, "", "No active RealtimeLogManager");
      return;
    }
    if (typeof this._realtimeLogManager.tag !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return;
    }
    const text = String(tag || "");
    try {
      const taggedLogger = this._realtimeLogManager.tag(text);
      if (taggedLogger && typeof taggedLogger === "object") {
        this._realtimeLogger = taggedLogger;
      }
      callback(action, true, _jsonSafe({ tag: text }), "");
    } catch (e) {
      callback(action, false, "", _fmtErr(e));
    }
  }

  getAccountInfo() {
    if (typeof _api.getAccountInfoSync !== "function") return "{}";
    try { return _jsonSafe(_api.getAccountInfoSync() || {}); }
    catch (_) { return "{}"; }
  }

  // ── Runtime capability / system settings ───────────────────────

  canIUse(schema) {
    if (typeof _api.canIUse !== "function") return false;
    try { return !!_api.canIUse(schema || ""); }
    catch (_) { return false; }
  }

  _callSyncObject(apiName) {
    const fn = _api[apiName];
    if (typeof fn !== "function") return "{}";
    try { return _jsonSafe(fn.call(_api) || {}); }
    catch (_) { return "{}"; }
  }

  getDeviceInfo() {
    return this._callSyncObject("getDeviceInfo");
  }

  getAppBaseInfo() {
    return this._callSyncObject("getAppBaseInfo");
  }

  getSystemSetting() {
    return this._callSyncObject("getSystemSetting");
  }

  getAppAuthorizeSetting() {
    return this._callSyncObject("getAppAuthorizeSetting");
  }

  // ── Share ───────────────────────────────────────────────────────

  shareApp(title, imageUrl, query) {
    _api.shareAppMessage({ title: title || "", imageUrl: imageUrl || "", query: query || "" });
  }

  showShareMenu() {
    _api.showShareMenu({
      withShareTicket: false,
      menus: ["shareAppMessage", "shareTimeline"],
    });
  }

  hideShareMenu() {
    _api.hideShareMenu({});
  }

  onShareApp(callback) {
    _api.onShareAppMessage(() => {
      const info = callback("shareAppMessage");
      try { return typeof info === "string" ? JSON.parse(info) : (info || {}); }
      catch (_) { return {}; }
    });
  }

  // ── Rewarded Video Ad ──────────────────────────────────────────

  createRewardedAd(adId, callback) {
    try {
      if (this._rewardedAd) { try { this._rewardedAd.destroy(); } catch (_) {} }
      if (!_api.createRewardedVideoAd) { if (callback) callback(false, "createRewardedVideoAd not supported"); return; }
      this._rewardedAd = _api.createRewardedVideoAd({ adUnitId: adId });
      this._rewardedAd.onError((err) => console.warn("[SDK] RewardedAd error:", _fmtErr(err)));
      if (callback) callback(true, "");
    } catch (e) { console.warn("[SDK] createRewardedAd:", _fmtErr(e)); if (callback) callback(false, _fmtErr(e)); }
  }

  showRewardedAd(callback) {
    if (!this._rewardedAd) { callback(false, "No rewarded ad created. Call createRewardedAd first."); return; }
    try {
      const ad = this._rewardedAd;
      const onClose = (res) => {
        ad.offClose(onClose);
        callback(!!(res && res.isEnded), "");
      };
      ad.onClose(onClose);
      ad.show().catch(() => ad.load().then(() => ad.show()))
        .catch((err) => { ad.offClose(onClose); callback(false, _fmtErr(err)); });
    } catch (e) { callback(false, _fmtErr(e)); }
  }

  // ── Banner Ad ──────────────────────────────────────────────────

  createBannerAd(adId, callback) {
    try {
      if (this._bannerAd) { try { this._bannerAd.destroy(); } catch (_) {} }
      if (!_api.createBannerAd) { if (callback) callback(false, "createBannerAd not supported"); return; }
      const info = _getSystemInfoModern();
      this._bannerAd = _api.createBannerAd({
        adUnitId: adId,
        style: { left: 0, top: (info.windowHeight || info.screenHeight) - 100, width: info.windowWidth || info.screenWidth },
      });
      this._bannerAd.onError((err) => console.warn("[SDK] BannerAd error:", _fmtErr(err)));
      if (callback) callback(true, "");
    } catch (e) { console.warn("[SDK] createBannerAd:", _fmtErr(e)); if (callback) callback(false, _fmtErr(e)); }
  }

  showBannerAd() { try { if (this._bannerAd) this._bannerAd.show(); } catch (e) { console.warn("[SDK] showBannerAd:", _fmtErr(e)); } }
  hideBannerAd() { try { if (this._bannerAd) this._bannerAd.hide(); } catch (e) { console.warn("[SDK] hideBannerAd:", _fmtErr(e)); } }
  destroyBannerAd() { try { if (this._bannerAd) { this._bannerAd.destroy(); this._bannerAd = null; } } catch (e) { console.warn("[SDK] destroyBannerAd:", _fmtErr(e)); } }

  // ── Interstitial Ad ────────────────────────────────────────────

  createInterstitialAd(adId, callback) {
    try {
      if (this._interstitialAd) { try { this._interstitialAd.destroy(); } catch (_) {} }
      if (!_api.createInterstitialAd) { if (callback) callback(false, "createInterstitialAd not supported"); return; }
      this._interstitialAd = _api.createInterstitialAd({ adUnitId: adId });
      this._interstitialAd.onError((err) => console.warn("[SDK] InterstitialAd error:", _fmtErr(err)));
      if (callback) callback(true, "");
    } catch (e) { console.warn("[SDK] createInterstitialAd:", _fmtErr(e)); if (callback) callback(false, _fmtErr(e)); }
  }

  showInterstitialAd(callback) {
    if (!this._interstitialAd) { callback(false, "No interstitial ad created."); return; }
    try {
      this._interstitialAd.show()
        .then(() => callback(true, ""))
        .catch((err) => callback(false, _fmtErr(err)));
    } catch (e) { callback(false, _fmtErr(e)); }
  }

  // ── Payment ────────────────────────────────────────────────────

  requestPayment(paramsJson, callback) {
    let p;
    try { p = JSON.parse(paramsJson); } catch (_) { callback(false, "Invalid JSON params"); return; }
    _api.requestMidasPayment({
      ...p,
      success: () => callback(true, ""),
      fail: (err) => callback(false, _fmtErr(err)),
    });
  }

  // ── Vibration ──────────────────────────────────────────────────

  vibrateShort(type) { _api.vibrateShort({ type: type || "medium" }); }
  vibrateLong() { _api.vibrateLong({}); }

  // ── Keyboard ───────────────────────────────────────────────────

  showKeyboard(defaultValue, maxLength, multiple, callback) {
    _api.offKeyboardInput(); _api.offKeyboardConfirm(); _api.offKeyboardComplete();
    _api.onKeyboardInput((res) => callback("input", res.value));
    _api.onKeyboardConfirm((res) => callback("confirm", res.value));
    _api.onKeyboardComplete((res) => callback("complete", res.value));
    _api.showKeyboard({
      defaultValue: defaultValue || "",
      maxLength: maxLength || 140,
      multiple: !!multiple,
      confirmHold: false,
      confirmType: "done",
    });
  }

  hideKeyboard() {
    _api.hideKeyboard({});
    _api.offKeyboardInput(); _api.offKeyboardConfirm(); _api.offKeyboardComplete();
  }

  // ── Network / HTTP ─────────────────────────────────────────────

  httpRequest(url, method, data, headersJson, callback) {
    let h = {};
    try { h = headersJson ? JSON.parse(headersJson) : {}; } catch (_) {}
    _api.request({
      url,
      method: method || "GET",
      data: data || "",
      header: h,
      success: (res) => {
        const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        callback(res.statusCode, body, "");
      },
      fail: (err) => callback(0, "", _fmtErr(err)),
    });
  }

  _fileTransferAction(apiName, options, callback) {
    const fn = _api[apiName];
    if (typeof fn !== "function") {
      callback(apiName, false, 0, "", _unsupported(apiName));
      return null;
    }

    let settled = false;
    const done = (...args) => {
      if (settled) return;
      settled = true;
      callback(...args);
    };

    try {
      return fn.call(_api, Object.assign({}, options || {}, {
        success: (res) => {
          const data = res || {};
          done(apiName, true, _num(data.statusCode), _jsonSafe(data), "");
        },
        fail: (err) => done(apiName, false, 0, "", _fmtErr(err)),
      }));
    } catch (e) {
      done(apiName, false, 0, "", _fmtErr(e));
      return null;
    }
  }

  downloadFile(url, filePath, headersJson, timeout, enableProfile, enableHttp2, enableQuic, callback) {
    const options = { url: url || "" };
    const headers = _jsonObject(headersJson);
    const timeoutMs = _num(timeout);
    if (filePath) options.filePath = filePath;
    if (Object.keys(headers).length > 0) options.header = headers;
    if (timeoutMs > 0) options.timeout = timeoutMs;
    options.enableProfile = enableProfile !== false;
    if (enableHttp2) options.enableHttp2 = true;
    if (enableQuic) options.enableQuic = true;
    this._fileTransferAction("downloadFile", options, callback);
  }

  uploadFile(url, filePath, name, formDataJson, headersJson, timeout, enableProfile, enableHttp2, enableQuic, callback) {
    const options = {
      url: url || "",
      filePath: filePath || "",
      name: name || "file",
    };
    const formData = _jsonObject(formDataJson);
    const headers = _jsonObject(headersJson);
    const timeoutMs = _num(timeout);
    if (Object.keys(formData).length > 0) options.formData = formData;
    if (Object.keys(headers).length > 0) options.header = headers;
    if (timeoutMs > 0) options.timeout = timeoutMs;
    options.enableProfile = enableProfile !== false;
    if (enableHttp2) options.enableHttp2 = true;
    if (enableQuic) options.enableQuic = true;
    this._fileTransferAction("uploadFile", options, callback);
  }

  connectSocket(url, headersJson, protocolsJson, tcpNoDelay, perMessageDeflate, timeout, forceCellularNetwork, callback, eventCallback) {
    if (typeof _api.connectSocket !== "function") {
      callback("connectSocket", false, "", _unsupported("connectSocket"));
      return false;
    }

    const options = { url: url || "" };
    const headers = _jsonObject(headersJson);
    const protocols = _jsonArray(protocolsJson);
    const timeoutMs = _num(timeout);
    if (Object.keys(headers).length > 0) options.header = headers;
    if (protocols.length > 0) options.protocols = protocols.map((item) => String(item));
    if (tcpNoDelay) options.tcpNoDelay = true;
    if (perMessageDeflate) options.perMessageDeflate = true;
    if (timeoutMs > 0) options.timeout = timeoutMs;
    if (forceCellularNetwork) options.forceCellularNetwork = true;

    try {
      const task = _api.connectSocket(Object.assign({}, options, {
        success: (res) => callback("connectSocket", true, _jsonSafe(res || {}), ""),
        fail: (err) => callback("connectSocket", false, "", _fmtErr(err)),
      }));
      if (!task) {
        this._socketTask = null;
        return false;
      }
      this._socketTask = task;
      if (typeof task.onOpen === "function") {
        task.onOpen((res) => eventCallback("open", "", _jsonSafe(res || {}), ""));
      }
      if (typeof task.onMessage === "function") {
        task.onMessage((res) => {
          const payload = _socketMessagePayload(res && res.data);
          eventCallback("message", payload.data, payload.dataJson, "");
        });
      }
      if (typeof task.onError === "function") {
        task.onError((err) => eventCallback("error", "", _jsonSafe(err || {}), _fmtErr(err)));
      }
      if (typeof task.onClose === "function") {
        task.onClose((res) => {
          this._socketTask = null;
          eventCallback("close", "", _jsonSafe(res || {}), "");
        });
      }
      return true;
    } catch (e) {
      this._socketTask = null;
      callback("connectSocket", false, "", _fmtErr(e));
      return false;
    }
  }

  sendSocketMessage(data, callback) {
    const task = this._socketTask;
    if (!task) {
      callback("sendSocketMessage", false, "", "No active WebSocket connection");
      return;
    }
    if (typeof task.send !== "function") {
      callback("sendSocketMessage", false, "", _unsupported("SocketTask.send"));
      return;
    }
    try {
      task.send({
        data: data || "",
        success: (res) => callback("sendSocketMessage", true, _jsonSafe(res || {}), ""),
        fail: (err) => callback("sendSocketMessage", false, "", _fmtErr(err)),
      });
    } catch (e) {
      callback("sendSocketMessage", false, "", _fmtErr(e));
    }
  }

  closeSocket(code, reason, callback) {
    const task = this._socketTask;
    if (!task) {
      callback("closeSocket", false, "", "No active WebSocket connection");
      return;
    }
    if (typeof task.close !== "function") {
      callback("closeSocket", false, "", _unsupported("SocketTask.close"));
      return;
    }
    const options = {};
    const closeCode = _num(code);
    if (closeCode > 0) options.code = closeCode;
    if (reason) options.reason = reason;
    try {
      task.close(Object.assign({}, options, {
        success: (res) => callback("closeSocket", true, _jsonSafe(res || {}), ""),
        fail: (err) => callback("closeSocket", false, "", _fmtErr(err)),
      }));
    } catch (e) {
      callback("closeSocket", false, "", _fmtErr(e));
    }
  }

  fileSystemCall(method, optionsJson, callback) {
    if (typeof _api.getFileSystemManager !== "function") {
      callback(method || "", false, "", _unsupported("getFileSystemManager"));
      return;
    }
    let fs = null;
    try {
      fs = _api.getFileSystemManager();
    } catch (e) {
      callback(method || "", false, "", _fmtErr(e));
      return;
    }

    const apiName = method || "";
    const fn = fs && fs[apiName];
    if (typeof fn !== "function") {
      callback(apiName, false, "", `FileSystemManager.${apiName} is not supported`);
      return;
    }

    const options = _jsonObject(optionsJson);
    try {
      fn.call(fs, Object.assign({}, options, {
        success: (res) => callback(apiName, true, _jsonSafe(_normalizeFileSystemResult(res || {})), ""),
        fail: (err) => callback(apiName, false, "", _fmtErr(err)),
      }));
    } catch (e) {
      callback(apiName, false, "", _fmtErr(e));
    }
  }

  _subpackageAction(apiName, options, callback, progressCallback) {
    const fn = _api[apiName];
    if (typeof fn !== "function") {
      callback(apiName, false, "", _unsupported(apiName));
      return null;
    }
    try {
      const task = fn.call(_api, Object.assign({}, options || {}, {
        success: (res) => callback(apiName, true, _jsonSafe(res || {}), ""),
        fail: (err) => callback(apiName, false, "", _fmtErr(err)),
      }));
      if (task && typeof task.onProgressUpdate === "function" && progressCallback) {
        task.onProgressUpdate((res) => {
          const data = res || {};
          progressCallback(
            apiName,
            _num(data.progress),
            _num(data.totalBytesWritten),
            _num(data.totalBytesExpectedToWrite),
            _jsonSafe(data));
        });
      }
      return task || null;
    } catch (e) {
      callback(apiName, false, "", _fmtErr(e));
      return null;
    }
  }

  loadSubpackage(name, callback, progressCallback) {
    this._subpackageAction("loadSubpackage", { name: name || "" }, callback, progressCallback);
  }

  preDownloadSubpackage(name, packageType, callback, progressCallback) {
    const options = { packageType: packageType || "normal" };
    if (name) options.name = name;
    this._subpackageAction("preDownloadSubpackage", options, callback, progressCallback);
  }

  createWorker(scriptPath, useExperimentalWorker, callback, eventCallback) {
    if (typeof _api.createWorker !== "function") {
      callback("createWorker", false, "", _unsupported("createWorker"));
      return false;
    }
    try {
      if (this._worker && typeof this._worker.terminate === "function") {
        try { this._worker.terminate(); } catch (_) {}
      }
      const options = {};
      if (useExperimentalWorker) options.useExperimentalWorker = true;
      const worker = _api.createWorker(scriptPath || "", options);
      this._worker = worker || null;
      if (!this._worker) {
        callback("createWorker", false, "", `${_platformPrefix()}.createWorker returned no Worker`);
        return false;
      }
      if (typeof this._worker.onMessage === "function") {
        this._worker.onMessage((res) => eventCallback("message", _jsonSafe((res && res.message) || {}), ""));
      }
      if (typeof this._worker.onError === "function") {
        this._worker.onError((res) => eventCallback("error", _jsonSafe(res || {}), _fmtErr((res && res.error) || res)));
      }
      if (typeof this._worker.onProcessKilled === "function") {
        this._worker.onProcessKilled((res) => eventCallback("processKilled", _jsonSafe(res || {}), ""));
      }
      callback("createWorker", true, _jsonSafe({
        scriptPath: scriptPath || "",
        useExperimentalWorker: !!useExperimentalWorker,
        env: this._worker.env || {},
      }), "");
      return true;
    } catch (e) {
      this._worker = null;
      callback("createWorker", false, "", _fmtErr(e));
      return false;
    }
  }

  workerPostMessage(messageJson, callback) {
    if (!this._worker) {
      callback("Worker.postMessage", false, "", "No active Worker");
      return false;
    }
    if (typeof this._worker.postMessage !== "function") {
      callback("Worker.postMessage", false, "", "Worker.postMessage is not supported");
      return false;
    }
    const message = _jsonObject(messageJson);
    try {
      this._worker.postMessage(message);
      callback("Worker.postMessage", true, _jsonSafe({ message }), "");
      return true;
    } catch (e) {
      callback("Worker.postMessage", false, "", _fmtErr(e));
      return false;
    }
  }

  workerTerminate(callback) {
    if (!this._worker) {
      callback("Worker.terminate", false, "", "No active Worker");
      return false;
    }
    if (typeof this._worker.terminate !== "function") {
      callback("Worker.terminate", false, "", "Worker.terminate is not supported");
      return false;
    }
    try {
      this._worker.terminate();
      this._worker = null;
      callback("Worker.terminate", true, "{}", "");
      return true;
    } catch (e) {
      callback("Worker.terminate", false, "", _fmtErr(e));
      return false;
    }
  }

  // ── Media / Images ─────────────────────────────────────────────

  _mediaAction(apiName, options, callback) {
    const fn = _api[apiName];
    if (typeof fn !== "function") {
      callback(apiName, false, "", _unsupported(apiName));
      return false;
    }
    try {
      fn.call(_api, Object.assign({}, options || {}, {
        success: (res) => callback(apiName, true, _jsonSafe(res || {}), ""),
        fail: (err) => callback(apiName, false, "", _fmtErr(err)),
      }));
      return true;
    } catch (e) {
      callback(apiName, false, "", _fmtErr(e));
      return false;
    }
  }

  chooseMedia(count, mediaTypeJson, sourceTypeJson, maxDuration, sizeTypeJson, camera, callback) {
    return this._mediaAction("chooseMedia", {
      count: Math.max(1, Math.floor(_num(count) || 9)),
      mediaType: _jsonArray(mediaTypeJson, ["image", "video"]),
      sourceType: _jsonArray(sourceTypeJson, ["album", "camera"]),
      maxDuration: Math.max(3, Math.floor(_num(maxDuration) || 10)),
      sizeType: _jsonArray(sizeTypeJson, ["original", "compressed"]),
      camera: camera || "back",
    }, callback);
  }

  chooseImage(count, sizeTypeJson, sourceTypeJson, callback) {
    return this._mediaAction("chooseImage", {
      count: Math.max(1, Math.floor(_num(count) || 9)),
      sizeType: _jsonArray(sizeTypeJson, ["original", "compressed"]),
      sourceType: _jsonArray(sourceTypeJson, ["album", "camera"]),
    }, callback);
  }

  previewImage(urlsJson, current, showmenu, referrerPolicy, callback) {
    return this._mediaAction("previewImage", {
      urls: _jsonArray(urlsJson),
      current: current || "",
      showmenu: showmenu !== false,
      referrerPolicy: referrerPolicy || "no-referrer",
    }, callback);
  }

  saveImageToPhotosAlbum(filePath, callback) {
    return this._mediaAction("saveImageToPhotosAlbum", {
      filePath: filePath || "",
    }, callback);
  }

  compressImage(src, quality, compressedWidth, compressedHeight, callback) {
    const options = {
      src: src || "",
      quality: Math.max(0, Math.min(100, Math.floor(_num(quality) || 80))),
    };
    if (_num(compressedWidth) > 0) options.compressedWidth = Math.floor(_num(compressedWidth));
    if (_num(compressedHeight) > 0) options.compressedHeight = Math.floor(_num(compressedHeight));
    return this._mediaAction("compressImage", options, callback);
  }

  // ── Camera ─────────────────────────────────────────────────────

  _cameraInfo() {
    if (!this._camera) return {};
    return {
      x: _num(this._camera.x),
      y: _num(this._camera.y),
      width: _num(this._camera.width),
      height: _num(this._camera.height),
      devicePosition: this._camera.devicePosition || "",
      flash: this._camera.flash || "",
      size: this._camera.size || "",
    };
  }

  _cameraAction(action, methodName, args, callback) {
    if (!this._camera) {
      callback(action, false, "", "No active Camera");
      return false;
    }
    const fn = this._camera[methodName];
    if (typeof fn !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return false;
    }
    try {
      const result = fn.apply(this._camera, args || []);
      if (result && typeof result.then === "function") {
        return result
          .then((res) => {
            callback(action, true, _jsonSafe(res || {}), "");
            return res;
          })
          .catch((err) => {
            callback(action, false, "", _fmtErr(err));
            return null;
          });
      }
      callback(action, true, "{}", "");
      return result === undefined ? true : result;
    } catch (e) {
      callback(action, false, "", _fmtErr(e));
      return false;
    }
  }

  createCamera(x, y, width, height, devicePosition, flash, size, callback, eventCallback) {
    if (typeof _api.createCamera !== "function") {
      callback("createCamera", false, "", _unsupported("createCamera"));
      return false;
    }
    try {
      if (this._camera && typeof this._camera.destroy === "function") {
        try { this._camera.destroy(); } catch (_) {}
      }
      let pendingSuccess = null;
      let pendingFailure = null;
      let settled = false;
      const finish = (ok, data, err) => {
        if (settled) return;
        settled = true;
        if (ok) {
          callback("createCamera", true, _jsonSafe(Object.assign({}, data || {}, { camera: this._cameraInfo() })), "");
        } else {
          callback("createCamera", false, "", _fmtErr(err));
        }
      };
      const camera = _api.createCamera({
        x: _num(x),
        y: _num(y),
        width: _num(width) || 300,
        height: _num(height) || 150,
        devicePosition: devicePosition || "back",
        flash: flash || "auto",
        size: size || "small",
        success: (res) => {
          if (this._camera) finish(true, res || {}, null);
          else pendingSuccess = res || {};
        },
        fail: (err) => {
          if (this._camera) finish(false, null, err);
          else pendingFailure = err;
        },
      });
      this._camera = camera || null;
      if (!this._camera) {
        finish(false, null, `${_platformPrefix()}.createCamera returned no Camera`);
        return false;
      }
      if (typeof this._camera.onAuthCancel === "function") {
        this._camera.onAuthCancel(() => eventCallback("authCancel", "{}", ""));
      }
      if (typeof this._camera.onStop === "function") {
        this._camera.onStop((res) => eventCallback("stop", _jsonSafe(res || {}), ""));
      }
      if (typeof this._camera.onCameraFrame === "function") {
        this._camera.onCameraFrame((res) => eventCallback("frame", _jsonSafe(_normalizeCameraFrame(res || {})), ""));
      }
      if (pendingFailure) finish(false, null, pendingFailure);
      else if (pendingSuccess) finish(true, pendingSuccess, null);
      return true;
    } catch (e) {
      this._camera = null;
      callback("createCamera", false, "", _fmtErr(e));
      return false;
    }
  }

  cameraTakePhoto(quality, callback) {
    return this._cameraAction("Camera.takePhoto", "takePhoto", [quality || "normal"], callback);
  }

  cameraStartRecord(callback) {
    return this._cameraAction("Camera.startRecord", "startRecord", [], callback);
  }

  cameraStopRecord(compressed, callback) {
    return this._cameraAction("Camera.stopRecord", "stopRecord", [!!compressed], callback);
  }

  cameraSetZoom(zoom, callback) {
    return this._cameraAction("Camera.setZoom", "setZoom", [{ zoom: _num(zoom) }], callback);
  }

  cameraListenFrameChange(useActiveWorker, callback) {
    const args = (useActiveWorker && this._worker) ? [this._worker] : [];
    return this._cameraAction("Camera.listenFrameChange", "listenFrameChange", args, callback);
  }

  cameraCloseFrameChange(callback) {
    return this._cameraAction("Camera.closeFrameChange", "closeFrameChange", [], callback);
  }

  cameraDestroy(callback) {
    if (!this._camera) {
      callback("Camera.destroy", false, "", "No active Camera");
      return false;
    }
    const camera = this._camera;
    if (typeof camera.destroy !== "function") {
      callback("Camera.destroy", false, "", "Camera.destroy is not supported");
      return false;
    }
    try {
      camera.destroy();
      this._camera = null;
      callback("Camera.destroy", true, "{}", "");
      return true;
    } catch (e) {
      callback("Camera.destroy", false, "", _fmtErr(e));
      return false;
    }
  }

  // ── Video ──────────────────────────────────────────────────────

  _videoEventDefs() {
    return [
      ["waiting", "onWaiting", "offWaiting"],
      ["progress", "onProgress", "offProgress"],
      ["play", "onPlay", "offPlay"],
      ["pause", "onPause", "offPause"],
      ["ended", "onEnded", "offEnded"],
      ["timeUpdate", "onTimeUpdate", "offTimeUpdate"],
      ["error", "onError", "offError"],
    ];
  }

  _videoEvents(eventsJson) {
    const all = this._videoEventDefs().map(([event]) => event);
    const requested = _jsonArray(eventsJson, all).map((event) => String(event));
    return requested.length ? requested : all;
  }

  _videoState() {
    const video = this._video;
    if (!video) return {};
    return {
      x: video.x !== undefined ? _num(video.x) : 0,
      y: video.y !== undefined ? _num(video.y) : 0,
      width: video.width !== undefined ? _num(video.width) : 300,
      height: video.height !== undefined ? _num(video.height) : 150,
      src: video.src || "",
      poster: video.poster || "",
      initialTime: video.initialTime !== undefined ? _num(video.initialTime) : 0,
      playbackRate: video.playbackRate !== undefined ? _num(video.playbackRate) : 1,
      live: !!video.live,
      objectFit: video.objectFit || "contain",
      controls: video.controls !== undefined ? !!video.controls : true,
      showProgress: video.showProgress !== undefined ? !!video.showProgress : true,
      showProgressInControlMode: video.showProgressInControlMode !== undefined ? !!video.showProgressInControlMode : true,
      backgroundColor: video.backgroundColor || "#000000",
      autoplay: !!video.autoplay,
      loop: !!video.loop,
      muted: !!video.muted,
      obeyMuteSwitch: !!video.obeyMuteSwitch,
      enableProgressGesture: video.enableProgressGesture !== undefined ? !!video.enableProgressGesture : true,
      enablePlayGesture: !!video.enablePlayGesture,
      showCenterPlayBtn: video.showCenterPlayBtn !== undefined ? !!video.showCenterPlayBtn : true,
      underGameView: !!video.underGameView,
      autoPauseIfNavigate: video.autoPauseIfNavigate !== undefined ? !!video.autoPauseIfNavigate : true,
      autoPauseIfOpenNative: video.autoPauseIfOpenNative !== undefined ? !!video.autoPauseIfOpenNative : true,
    };
  }

  _applyVideoProperties(properties) {
    if (!this._video) return;
    [
      "x",
      "y",
      "width",
      "height",
      "src",
      "poster",
      "initialTime",
      "playbackRate",
      "live",
      "objectFit",
      "controls",
      "showProgress",
      "showProgressInControlMode",
      "backgroundColor",
      "autoplay",
      "loop",
      "muted",
      "obeyMuteSwitch",
      "enableProgressGesture",
      "enablePlayGesture",
      "showCenterPlayBtn",
      "underGameView",
      "autoPauseIfNavigate",
      "autoPauseIfOpenNative",
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        this._video[key] = properties[key];
      }
    });
  }

  _offVideoListeners(events) {
    if (!this._video || !this._videoListeners) return [];
    const wanted = events && events.length ? events : this._videoEventDefs().map(([event]) => event);
    const removed = [];
    this._videoEventDefs().forEach(([event, _onName, offName]) => {
      if (!wanted.includes(event)) return;
      const listener = this._videoListeners[event];
      const off = this._video[offName];
      if (listener && typeof off === "function") {
        off.call(this._video, listener);
        removed.push(event);
      }
      delete this._videoListeners[event];
    });
    return removed;
  }

  createVideo(optionsJson, callback, eventCallback) {
    if (typeof _api.createVideo !== "function") {
      callback("createVideo", false, "", _unsupported("createVideo"));
      return false;
    }
    try {
      if (this._video) {
        try { this._offVideoListeners(); } catch (_) {}
        if (typeof this._video.destroy === "function") {
          try { this._video.destroy(); } catch (_) {}
        }
      }
      this._video = _api.createVideo(_jsonObject(optionsJson)) || null;
      this._videoListeners = {};
      if (!this._video) {
        callback("createVideo", false, "", `${_platformPrefix()}.createVideo returned no Video`);
        return false;
      }
      if (typeof eventCallback === "function") {
        this._videoEventDefs().forEach(([event, onName]) => {
          const on = this._video[onName];
          if (typeof on !== "function") return;
          const listener = (res) => {
            eventCallback(event, _jsonSafe(res || {}), event === "error" ? _fmtErr(res) : "");
          };
          this._videoListeners[event] = listener;
          on.call(this._video, listener);
        });
      }
      callback("createVideo", true, _jsonSafe(this._videoState()), "");
      return true;
    } catch (e) {
      this._video = null;
      this._videoListeners = {};
      callback("createVideo", false, "", _fmtErr(e));
      return false;
    }
  }

  setVideoProperties(propertiesJson, callback) {
    if (!this._video) {
      callback("Video.setProperties", false, "", "No active Video");
      return false;
    }
    try {
      this._applyVideoProperties(_jsonObject(propertiesJson));
      callback("Video.setProperties", true, _jsonSafe(this._videoState()), "");
      return true;
    } catch (e) {
      callback("Video.setProperties", false, "", _fmtErr(e));
      return false;
    }
  }

  getVideoState(callback) {
    if (!this._video) {
      callback("Video.getState", false, "", "No active Video");
      return false;
    }
    callback("Video.getState", true, _jsonSafe(this._videoState()), "");
    return true;
  }

  _videoAction(action, methodName, args, callback) {
    if (!this._video) {
      callback(action, false, "", "No active Video");
      return false;
    }
    const fn = this._video[methodName];
    if (typeof fn !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return false;
    }
    let settled = false;
    const finish = (ok, err) => {
      if (settled) return;
      settled = true;
      callback(action, !!ok, ok ? _jsonSafe(this._videoState()) : "", ok ? "" : _fmtErr(err));
    };
    try {
      const result = fn.apply(this._video, args || []);
      if (result && typeof result.then === "function") {
        return result
          .then((res) => {
            finish(true);
            return res;
          })
          .catch((err) => {
            finish(false, err);
            return null;
          });
      }
      finish(true);
      return result === undefined ? true : result;
    } catch (e) {
      finish(false, e);
      return false;
    }
  }

  videoPlay(callback) {
    return this._videoAction("Video.play", "play", [], callback);
  }

  videoPause(callback) {
    return this._videoAction("Video.pause", "pause", [], callback);
  }

  videoStop(callback) {
    return this._videoAction("Video.stop", "stop", [], callback);
  }

  videoSeek(time, callback) {
    return this._videoAction("Video.seek", "seek", [_num(time)], callback);
  }

  videoRequestFullScreen(direction, callback) {
    return this._videoAction("Video.requestFullScreen", "requestFullScreen", [_num(direction)], callback);
  }

  videoExitFullScreen(callback) {
    return this._videoAction("Video.exitFullScreen", "exitFullScreen", [], callback);
  }

  stopVideoListener(eventsJson, callback) {
    if (!this._video) {
      callback("Video.off", false, "", "No active Video");
      return false;
    }
    try {
      const events = this._videoEvents(eventsJson);
      this._offVideoListeners(events);
      callback("Video.off", true, _jsonSafe({ events }), "");
      return true;
    } catch (e) {
      callback("Video.off", false, "", _fmtErr(e));
      return false;
    }
  }

  videoDestroy(callback) {
    if (!this._video) {
      callback("Video.destroy", false, "", "No active Video");
      return false;
    }
    try {
      this._offVideoListeners();
      if (typeof this._video.destroy === "function") {
        this._video.destroy();
      }
      this._video = null;
      this._videoListeners = {};
      callback("Video.destroy", true, "{}", "");
      return true;
    } catch (e) {
      callback("Video.destroy", false, "", _fmtErr(e));
      return false;
    }
  }

  // ── Recorder Manager ───────────────────────────────────────────

  _recorderEventDefs() {
    return [
      ["start", "onStart"],
      ["resume", "onResume"],
      ["pause", "onPause"],
      ["stop", "onStop"],
      ["frameRecorded", "onFrameRecorded"],
      ["error", "onError"],
      ["interruptionBegin", "onInterruptionBegin"],
      ["interruptionEnd", "onInterruptionEnd"],
    ];
  }

  _registerRecorderManagerListeners() {
    if (!this._recorderManager || this._recorderManagerListenersBoundTo === this._recorderManager) {
      return;
    }
    this._recorderEventDefs().forEach(([eventName, onName]) => {
      const on = this._recorderManager[onName];
      if (typeof on !== "function") return;
      on.call(this._recorderManager, (res) => {
        if (typeof this._recorderEventCallback !== "function") return;
        const data = _normalizeRecorderEvent(eventName, res || {});
        this._recorderEventCallback(
          eventName,
          _jsonSafe(data),
          eventName === "error" ? _fmtErr(data) : "");
      });
    });
    this._recorderManagerListenersBoundTo = this._recorderManager;
  }

  getRecorderManager(callback, eventCallback) {
    if (typeof _api.getRecorderManager !== "function") {
      callback("getRecorderManager", false, "", _unsupported("getRecorderManager"));
      return false;
    }
    try {
      this._recorderManager = _api.getRecorderManager() || null;
      this._recorderEventCallback = eventCallback;
      if (!this._recorderManager) {
        callback("getRecorderManager", false, "", `${_platformPrefix()}.getRecorderManager returned no RecorderManager`);
        return false;
      }
      this._registerRecorderManagerListeners();
      callback("getRecorderManager", true, "{}", "");
      return true;
    } catch (e) {
      this._recorderManager = null;
      this._recorderEventCallback = null;
      this._recorderManagerListenersBoundTo = null;
      callback("getRecorderManager", false, "", _fmtErr(e));
      return false;
    }
  }

  _recorderManagerAction(action, methodName, args, callback) {
    if (!this._recorderManager) {
      callback(action, false, "", "No active RecorderManager");
      return false;
    }
    const fn = this._recorderManager[methodName];
    if (typeof fn !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return false;
    }
    try {
      const result = fn.apply(this._recorderManager, args || []);
      if (result && typeof result.then === "function") {
        return result
          .then((res) => {
            callback(action, true, _jsonSafe(res || {}), "");
            return res;
          })
          .catch((err) => {
            callback(action, false, "", _fmtErr(err));
            return null;
          });
      }
      callback(action, true, "{}", "");
      return result === undefined ? true : result;
    } catch (e) {
      callback(action, false, "", _fmtErr(e));
      return false;
    }
  }

  recorderStart(optionsJson, callback) {
    return this._recorderManagerAction("RecorderManager.start", "start", [_jsonObject(optionsJson)], callback);
  }

  recorderPause(callback) {
    return this._recorderManagerAction("RecorderManager.pause", "pause", [], callback);
  }

  recorderResume(callback) {
    return this._recorderManagerAction("RecorderManager.resume", "resume", [], callback);
  }

  recorderStop(callback) {
    return this._recorderManagerAction("RecorderManager.stop", "stop", [], callback);
  }

  // ── Audio sources / VideoDecoder / MediaAudioPlayer ─────────────

  getAvailableAudioSources(callback) {
    if (typeof _api.getAvailableAudioSources !== "function") {
      callback("[]", "", _unsupported("getAvailableAudioSources"));
      return false;
    }
    try {
      const result = _api.getAvailableAudioSources({
        success: (res) => {
          const data = res || {};
          callback(_jsonSafe(Array.isArray(data.audioSources) ? data.audioSources : []), _jsonSafe(data), "");
        },
        fail: (err) => callback("[]", "", _fmtErr(err)),
      });
      if (result && typeof result.then === "function") {
        return result
          .then((res) => {
            const data = res || {};
            callback(_jsonSafe(Array.isArray(data.audioSources) ? data.audioSources : []), _jsonSafe(data), "");
            return res;
          })
          .catch((err) => {
            callback("[]", "", _fmtErr(err));
            return null;
          });
      }
      return true;
    } catch (e) {
      callback("[]", "", _fmtErr(e));
      return false;
    }
  }

  _videoDecoderEvents(eventsJson) {
    const events = _jsonArray(eventsJson);
    return events.length ? events.map((eventName) => String(eventName)) : ["start", "stop", "seek", "bufferchange", "ended"];
  }

  createVideoDecoder(callback) {
    if (typeof _api.createVideoDecoder !== "function") {
      callback("createVideoDecoder", false, "", _unsupported("createVideoDecoder"));
      return false;
    }
    try {
      if (this._videoDecoder && typeof this._videoDecoder.remove === "function") {
        try { this._videoDecoder.remove(); } catch (_) {}
      }
      this._videoDecoder = _api.createVideoDecoder() || null;
      this._videoDecoderListeners = {};
      if (!this._videoDecoder) {
        callback("createVideoDecoder", false, "", `${_platformPrefix()}.createVideoDecoder returned no VideoDecoder`);
        return false;
      }
      callback("createVideoDecoder", true, "{}", "");
      return true;
    } catch (e) {
      this._videoDecoder = null;
      this._videoDecoderListeners = {};
      callback("createVideoDecoder", false, "", _fmtErr(e));
      return false;
    }
  }

  _videoDecoderAction(action, methodName, args, callback, clearOnSuccess = false) {
    if (!this._videoDecoder) {
      callback(action, false, "", "No active VideoDecoder");
      return false;
    }
    const fn = this._videoDecoder[methodName];
    if (typeof fn !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return false;
    }
    let settled = false;
    const finish = (ok, data, err) => {
      if (settled) return;
      settled = true;
      callback(action, !!ok, ok ? _jsonSafe(data || {}) : "", ok ? "" : _fmtErr(err));
      if (ok && clearOnSuccess) {
        this._videoDecoder = null;
        this._videoDecoderListeners = {};
      }
    };
    try {
      const result = fn.apply(this._videoDecoder, args || []);
      if (result && typeof result.then === "function") {
        return result
          .then((res) => {
            finish(true, res || {});
            return res;
          })
          .catch((err) => {
            finish(false, null, err);
            return null;
          });
      }
      finish(true, result || {});
      return result === undefined ? true : result;
    } catch (e) {
      finish(false, null, e);
      return false;
    }
  }

  videoDecoderStart(optionsJson, callback) {
    return this._videoDecoderAction("VideoDecoder.start", "start", [_jsonObject(optionsJson)], callback);
  }

  videoDecoderSeek(position, callback) {
    return this._videoDecoderAction("VideoDecoder.seek", "seek", [_num(position)], callback);
  }

  videoDecoderStop(callback) {
    return this._videoDecoderAction("VideoDecoder.stop", "stop", [], callback);
  }

  videoDecoderRemove(callback) {
    return this._videoDecoderAction("VideoDecoder.remove", "remove", [], callback, true);
  }

  videoDecoderGetFrameData(callback) {
    if (!this._videoDecoder) {
      callback("VideoDecoder.getFrameData", false, "", "No active VideoDecoder");
      return false;
    }
    if (typeof this._videoDecoder.getFrameData !== "function") {
      callback("VideoDecoder.getFrameData", false, "", "VideoDecoder.getFrameData is not supported");
      return false;
    }
    try {
      callback("VideoDecoder.getFrameData", true, _jsonSafe(_normalizeVideoDecoderFrame(this._videoDecoder.getFrameData())), "");
      return true;
    } catch (e) {
      callback("VideoDecoder.getFrameData", false, "", _fmtErr(e));
      return false;
    }
  }

  startVideoDecoderListener(eventsJson, callback, eventCallback) {
    if (!this._videoDecoder) {
      callback("VideoDecoder.on", false, "", "No active VideoDecoder");
      return false;
    }
    if (typeof this._videoDecoder.on !== "function") {
      callback("VideoDecoder.on", false, "", "VideoDecoder.on is not supported");
      return false;
    }
    this._videoDecoderListeners = this._videoDecoderListeners || {};
    const events = this._videoDecoderEvents(eventsJson);
    try {
      for (const eventName of events) {
        if (this._videoDecoderListeners[eventName] && typeof this._videoDecoder.off === "function") {
          try { this._videoDecoder.off(eventName, this._videoDecoderListeners[eventName]); } catch (_) {}
        }
        const listener = (res) => eventCallback(eventName, _jsonSafe(res || {}), "");
        this._videoDecoderListeners[eventName] = listener;
        this._videoDecoder.on(eventName, listener);
      }
      callback("VideoDecoder.on", true, _jsonSafe({ events }), "");
      return true;
    } catch (e) {
      callback("VideoDecoder.on", false, "", _fmtErr(e));
      return false;
    }
  }

  stopVideoDecoderListener(eventsJson, callback) {
    if (!this._videoDecoder) {
      callback("VideoDecoder.off", false, "", "No active VideoDecoder");
      return false;
    }
    if (typeof this._videoDecoder.off !== "function") {
      callback("VideoDecoder.off", false, "", "VideoDecoder.off is not supported");
      return false;
    }
    this._videoDecoderListeners = this._videoDecoderListeners || {};
    const events = this._videoDecoderEvents(eventsJson);
    try {
      for (const eventName of events) {
        const listener = this._videoDecoderListeners[eventName];
        if (listener) {
          this._videoDecoder.off(eventName, listener);
          delete this._videoDecoderListeners[eventName];
        }
      }
      callback("VideoDecoder.off", true, _jsonSafe({ events }), "");
      return true;
    } catch (e) {
      callback("VideoDecoder.off", false, "", _fmtErr(e));
      return false;
    }
  }

  _mediaAudioState() {
    if (!this._mediaAudioPlayer) return {};
    return {
      volume: this._mediaAudioPlayer.volume !== undefined ? _num(this._mediaAudioPlayer.volume) : 1,
    };
  }

  createMediaAudioPlayer(volume, callback) {
    if (typeof _api.createMediaAudioPlayer !== "function") {
      callback("createMediaAudioPlayer", false, "", _unsupported("createMediaAudioPlayer"));
      return false;
    }
    try {
      if (this._mediaAudioPlayer && typeof this._mediaAudioPlayer.destroy === "function") {
        try { this._mediaAudioPlayer.destroy(); } catch (_) {}
      }
      this._mediaAudioPlayer = _api.createMediaAudioPlayer() || null;
      if (!this._mediaAudioPlayer) {
        callback("createMediaAudioPlayer", false, "", `${_platformPrefix()}.createMediaAudioPlayer returned no MediaAudioPlayer`);
        return false;
      }
      this._mediaAudioPlayer.volume = Math.max(0, Math.min(1, _num(volume)));
      callback("createMediaAudioPlayer", true, _jsonSafe(this._mediaAudioState()), "");
      return true;
    } catch (e) {
      this._mediaAudioPlayer = null;
      callback("createMediaAudioPlayer", false, "", _fmtErr(e));
      return false;
    }
  }

  setMediaAudioVolume(volume, callback) {
    if (!this._mediaAudioPlayer) {
      callback("MediaAudioPlayer.setVolume", false, "", "No active MediaAudioPlayer");
      return false;
    }
    try {
      this._mediaAudioPlayer.volume = Math.max(0, Math.min(1, _num(volume)));
      callback("MediaAudioPlayer.setVolume", true, _jsonSafe(this._mediaAudioState()), "");
      return true;
    } catch (e) {
      callback("MediaAudioPlayer.setVolume", false, "", _fmtErr(e));
      return false;
    }
  }

  _mediaAudioAction(action, methodName, args, callback, clearOnSuccess = false) {
    if (!this._mediaAudioPlayer) {
      callback(action, false, "", "No active MediaAudioPlayer");
      return false;
    }
    const fn = this._mediaAudioPlayer[methodName];
    if (typeof fn !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return false;
    }
    let settled = false;
    const finish = (ok, data, err) => {
      if (settled) return;
      settled = true;
      callback(action, !!ok, ok ? _jsonSafe(data || {}) : "", ok ? "" : _fmtErr(err));
      if (ok && clearOnSuccess) this._mediaAudioPlayer = null;
    };
    try {
      const result = fn.apply(this._mediaAudioPlayer, args || []);
      if (result && typeof result.then === "function") {
        return result
          .then((res) => {
            finish(true, res || {});
            return res;
          })
          .catch((err) => {
            finish(false, null, err);
            return null;
          });
      }
      finish(true, result || {});
      return result === undefined ? true : result;
    } catch (e) {
      finish(false, null, e);
      return false;
    }
  }

  mediaAudioAddVideoDecoderSource(callback) {
    if (!this._mediaAudioPlayer) {
      callback("MediaAudioPlayer.addAudioSource", false, "", "No active MediaAudioPlayer");
      return false;
    }
    if (!this._videoDecoder) {
      callback("MediaAudioPlayer.addAudioSource", false, "", "No active VideoDecoder");
      return false;
    }
    return this._mediaAudioAction("MediaAudioPlayer.addAudioSource", "addAudioSource", [this._videoDecoder], callback);
  }

  mediaAudioRemoveVideoDecoderSource(callback) {
    if (!this._mediaAudioPlayer) {
      callback("MediaAudioPlayer.removeAudioSource", false, "", "No active MediaAudioPlayer");
      return false;
    }
    if (!this._videoDecoder) {
      callback("MediaAudioPlayer.removeAudioSource", false, "", "No active VideoDecoder");
      return false;
    }
    return this._mediaAudioAction("MediaAudioPlayer.removeAudioSource", "removeAudioSource", [this._videoDecoder], callback);
  }

  mediaAudioStart(callback) {
    return this._mediaAudioAction("MediaAudioPlayer.start", "start", [], callback);
  }

  mediaAudioStop(callback) {
    return this._mediaAudioAction("MediaAudioPlayer.stop", "stop", [], callback);
  }

  mediaAudioDestroy(callback) {
    return this._mediaAudioAction("MediaAudioPlayer.destroy", "destroy", [], callback, true);
  }

  // ── Game Recorder ──────────────────────────────────────────────

  _gameRecorderSupport() {
    if (!this._gameRecorder) return {};
    const read = (name) => {
      const fn = this._gameRecorder[name];
      if (typeof fn !== "function") return false;
      try { return !!fn.call(this._gameRecorder); } catch (_) { return false; }
    };
    return {
      frameSupported: read("isFrameSupported"),
      soundSupported: read("isSoundSupported"),
      volumeSupported: read("isVolumeSupported"),
      atempoSupported: read("isAtempoSupported"),
    };
  }

  getGameRecorder(callback) {
    if (typeof _api.getGameRecorder !== "function") {
      callback("getGameRecorder", false, "", _unsupported("getGameRecorder"));
      return false;
    }
    try {
      this._gameRecorder = _api.getGameRecorder() || null;
      this._gameRecorderListeners = this._gameRecorderListeners || {};
      if (!this._gameRecorder) {
        callback("getGameRecorder", false, "", `${_platformPrefix()}.getGameRecorder returned no GameRecorder`);
        return false;
      }
      callback("getGameRecorder", true, _jsonSafe(this._gameRecorderSupport()), "");
      return true;
    } catch (e) {
      this._gameRecorder = null;
      callback("getGameRecorder", false, "", _fmtErr(e));
      return false;
    }
  }

  _gameRecorderAction(action, methodName, args, callback) {
    if (!this._gameRecorder) {
      callback(action, false, "", "No active GameRecorder");
      return false;
    }
    const fn = this._gameRecorder[methodName];
    if (typeof fn !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return false;
    }
    try {
      const result = fn.apply(this._gameRecorder, args || []);
      if (result && typeof result.then === "function") {
        return result
          .then((res) => {
            callback(action, true, _jsonSafe(res || {}), "");
            return res;
          })
          .catch((err) => {
            callback(action, false, "", _fmtErr((err && err.error) || err));
            return null;
          });
      }
      callback(action, true, "{}", "");
      return result === undefined ? true : result;
    } catch (e) {
      callback(action, false, "", _fmtErr((e && e.error) || e));
      return false;
    }
  }

  gameRecorderStart(optionsJson, callback) {
    return this._gameRecorderAction("GameRecorder.start", "start", [_jsonObject(optionsJson)], callback);
  }

  gameRecorderStop(callback) {
    return this._gameRecorderAction("GameRecorder.stop", "stop", [], callback);
  }

  gameRecorderPause(callback) {
    return this._gameRecorderAction("GameRecorder.pause", "pause", [], callback);
  }

  gameRecorderResume(callback) {
    return this._gameRecorderAction("GameRecorder.resume", "resume", [], callback);
  }

  gameRecorderAbort(callback) {
    return this._gameRecorderAction("GameRecorder.abort", "abort", [], callback);
  }

  _gameRecorderEvents(eventsJson) {
    const events = _jsonArray(eventsJson);
    return events.length ? events : ["start", "stop", "pause", "resume", "abort", "timeUpdate", "error"];
  }

  startGameRecorderListener(eventsJson, callback, eventCallback) {
    if (!this._gameRecorder) {
      callback("GameRecorder.on", false, "", "No active GameRecorder");
      return false;
    }
    if (typeof this._gameRecorder.on !== "function") {
      callback("GameRecorder.on", false, "", "GameRecorder.on is not supported");
      return false;
    }
    this._gameRecorderListeners = this._gameRecorderListeners || {};
    const events = this._gameRecorderEvents(eventsJson);
    try {
      for (const eventName of events) {
        if (this._gameRecorderListeners[eventName] && typeof this._gameRecorder.off === "function") {
          try { this._gameRecorder.off(eventName, this._gameRecorderListeners[eventName]); } catch (_) {}
        }
        const listener = (res) => {
          const data = res || {};
          eventCallback(eventName, _jsonSafe(data), eventName === "error" ? _fmtErr((data && data.error) || data) : "");
        };
        this._gameRecorderListeners[eventName] = listener;
        this._gameRecorder.on(eventName, listener);
      }
      callback("GameRecorder.on", true, _jsonSafe({ events }), "");
      return true;
    } catch (e) {
      callback("GameRecorder.on", false, "", _fmtErr(e));
      return false;
    }
  }

  stopGameRecorderListener(eventsJson, callback) {
    if (!this._gameRecorder) {
      callback("GameRecorder.off", false, "", "No active GameRecorder");
      return false;
    }
    if (typeof this._gameRecorder.off !== "function") {
      callback("GameRecorder.off", false, "", "GameRecorder.off is not supported");
      return false;
    }
    this._gameRecorderListeners = this._gameRecorderListeners || {};
    const events = this._gameRecorderEvents(eventsJson);
    try {
      for (const eventName of events) {
        const listener = this._gameRecorderListeners[eventName];
        if (listener) {
          this._gameRecorder.off(eventName, listener);
          delete this._gameRecorderListeners[eventName];
        }
      }
      callback("GameRecorder.off", true, _jsonSafe({ events }), "");
      return true;
    } catch (e) {
      callback("GameRecorder.off", false, "", _fmtErr(e));
      return false;
    }
  }

  operateGameRecorderVideo(paramsJson, callback) {
    if (typeof _api.operateGameRecorderVideo !== "function") {
      callback("operateGameRecorderVideo", false, "", _unsupported("operateGameRecorderVideo"));
      return false;
    }
    try {
      const params = _jsonObject(paramsJson);
      _api.operateGameRecorderVideo(Object.assign({}, params, {
        success: (res) => callback("operateGameRecorderVideo", true, _jsonSafe(res || {}), ""),
        fail: (err) => callback("operateGameRecorderVideo", false, "", _fmtErr(err)),
      }));
      return true;
    } catch (e) {
      callback("operateGameRecorderVideo", false, "", _fmtErr(e));
      return false;
    }
  }

  createGameRecorderShareButton(styleJson, shareJson, callback, eventCallback) {
    if (typeof _api.createGameRecorderShareButton !== "function") {
      callback("createGameRecorderShareButton", false, "", _unsupported("createGameRecorderShareButton"));
      return false;
    }
    const style = _jsonObject(styleJson);
    const share = _jsonObject(shareJson);
    try {
      if (this._gameRecorderShareButton && this._gameRecorderShareButtonTapListener && typeof this._gameRecorderShareButton.offTap === "function") {
        try { this._gameRecorderShareButton.offTap(this._gameRecorderShareButtonTapListener); } catch (_) {}
      }
      this._gameRecorderShareButton = _api.createGameRecorderShareButton({ style, share }) || null;
      if (!this._gameRecorderShareButton) {
        callback("createGameRecorderShareButton", false, "", `${_platformPrefix()}.createGameRecorderShareButton returned no GameRecorderShareButton`);
        return false;
      }
      this._gameRecorderShareButtonTapListener = (res) => {
        const data = res || {};
        eventCallback("shareButtonTap", _jsonSafe(data), _fmtErr((data && data.error) || data));
      };
      if (typeof this._gameRecorderShareButton.onTap === "function") {
        this._gameRecorderShareButton.onTap(this._gameRecorderShareButtonTapListener);
      }
      callback("createGameRecorderShareButton", true, _jsonSafe({ style, share }), "");
      return true;
    } catch (e) {
      this._gameRecorderShareButton = null;
      this._gameRecorderShareButtonTapListener = null;
      callback("createGameRecorderShareButton", false, "", _fmtErr(e));
      return false;
    }
  }

  _gameRecorderShareButtonAction(action, methodName, callback) {
    if (!this._gameRecorderShareButton) {
      callback(action, false, "", "No active GameRecorderShareButton");
      return false;
    }
    const fn = this._gameRecorderShareButton[methodName];
    if (typeof fn !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return false;
    }
    try {
      fn.call(this._gameRecorderShareButton);
      callback(action, true, "{}", "");
      return true;
    } catch (e) {
      callback(action, false, "", _fmtErr(e));
      return false;
    }
  }

  showGameRecorderShareButton(callback) {
    return this._gameRecorderShareButtonAction("GameRecorderShareButton.show", "show", callback);
  }

  hideGameRecorderShareButton(callback) {
    return this._gameRecorderShareButtonAction("GameRecorderShareButton.hide", "hide", callback);
  }

  offGameRecorderShareButtonTap(callback) {
    if (!this._gameRecorderShareButton) {
      callback("GameRecorderShareButton.offTap", false, "", "No active GameRecorderShareButton");
      return false;
    }
    if (typeof this._gameRecorderShareButton.offTap !== "function") {
      callback("GameRecorderShareButton.offTap", false, "", "GameRecorderShareButton.offTap is not supported");
      return false;
    }
    try {
      if (this._gameRecorderShareButtonTapListener) {
        this._gameRecorderShareButton.offTap(this._gameRecorderShareButtonTapListener);
        this._gameRecorderShareButtonTapListener = null;
      }
      callback("GameRecorderShareButton.offTap", true, "{}", "");
      return true;
    } catch (e) {
      callback("GameRecorderShareButton.offTap", false, "", _fmtErr(e));
      return false;
    }
  }

  // ── Inner Audio ────────────────────────────────────────────────

  _innerAudioEventDefs() {
    return [
      ["canplay", "onCanplay", "offCanplay"],
      ["play", "onPlay", "offPlay"],
      ["pause", "onPause", "offPause"],
      ["stop", "onStop", "offStop"],
      ["ended", "onEnded", "offEnded"],
      ["timeUpdate", "onTimeUpdate", "offTimeUpdate"],
      ["error", "onError", "offError"],
      ["waiting", "onWaiting", "offWaiting"],
      ["seeking", "onSeeking", "offSeeking"],
      ["seeked", "onSeeked", "offSeeked"],
    ];
  }

  _innerAudioEvents(eventsJson) {
    const all = this._innerAudioEventDefs().map(([event]) => event);
    const requested = _jsonArray(eventsJson, all).map((event) => String(event));
    return requested.length ? requested : all;
  }

  _innerAudioState() {
    const audio = this._innerAudio;
    if (!audio) return {};
    return {
      src: audio.src || "",
      startTime: audio.startTime !== undefined ? _num(audio.startTime) : 0,
      autoplay: !!audio.autoplay,
      loop: !!audio.loop,
      obeyMuteSwitch: audio.obeyMuteSwitch !== undefined ? !!audio.obeyMuteSwitch : true,
      volume: audio.volume !== undefined ? _num(audio.volume) : 1,
      playbackRate: audio.playbackRate !== undefined ? _num(audio.playbackRate) : 1,
      duration: audio.duration !== undefined ? _num(audio.duration) : 0,
      currentTime: audio.currentTime !== undefined ? _num(audio.currentTime) : 0,
      paused: !!audio.paused,
      buffered: audio.buffered !== undefined ? _num(audio.buffered) : 0,
      referrerPolicy: audio.referrerPolicy || "",
    };
  }

  _applyInnerAudioProperties(properties) {
    if (!this._innerAudio) return;
    [
      "src",
      "startTime",
      "autoplay",
      "loop",
      "obeyMuteSwitch",
      "volume",
      "playbackRate",
      "currentTime",
      "referrerPolicy",
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        this._innerAudio[key] = properties[key];
      }
    });
  }

  _offInnerAudioListeners(events) {
    if (!this._innerAudio || !this._innerAudioListeners) return [];
    const wanted = events && events.length ? events : this._innerAudioEventDefs().map(([event]) => event);
    const removed = [];
    this._innerAudioEventDefs().forEach(([event, _onName, offName]) => {
      if (!wanted.includes(event)) return;
      const listener = this._innerAudioListeners[event];
      const off = this._innerAudio[offName];
      if (listener && typeof off === "function") {
        off.call(this._innerAudio, listener);
        removed.push(event);
      }
      delete this._innerAudioListeners[event];
    });
    return removed;
  }

  setInnerAudioOption(optionsJson, callback) {
    if (typeof _api.setInnerAudioOption !== "function") {
      callback("setInnerAudioOption", false, "", _unsupported("setInnerAudioOption"));
      return;
    }
    const options = _jsonObject(optionsJson);
    let settled = false;
    const finish = (ok, data, err) => {
      if (settled) return;
      settled = true;
      callback("setInnerAudioOption", !!ok, ok ? _jsonSafe(data || {}) : "", ok ? "" : _fmtErr(err));
    };
    try {
      const result = _api.setInnerAudioOption(Object.assign({}, options, {
        success: (res) => finish(true, res || {}),
        fail: (err) => finish(false, null, err),
        complete: (res) => {
          if (!settled && res && typeof res.errMsg === "string" && res.errMsg.includes(":fail")) {
            finish(false, null, res);
          }
        },
      }));
      if (result && typeof result.then === "function") {
        result.then((res) => finish(true, res || {})).catch((err) => finish(false, null, err));
      } else if (result !== undefined && !settled) {
        finish(true, result);
      }
    } catch (e) {
      finish(false, null, e);
    }
  }

  createInnerAudioContext(createOptionsJson, propertiesJson, callback, eventCallback) {
    if (typeof _api.createInnerAudioContext !== "function") {
      callback("createInnerAudioContext", false, "", _unsupported("createInnerAudioContext"));
      return;
    }
    try {
      if (this._innerAudio) {
        try { this._offInnerAudioListeners(); } catch (_) {}
        if (typeof this._innerAudio.destroy === "function") {
          try { this._innerAudio.destroy(); } catch (_) {}
        }
      }
      this._innerAudio = _api.createInnerAudioContext(_jsonObject(createOptionsJson)) || null;
      this._innerAudioListeners = {};
      if (!this._innerAudio) {
        callback("createInnerAudioContext", false, "", `${_platformPrefix()}.createInnerAudioContext returned no InnerAudioContext`);
        return;
      }
      this._applyInnerAudioProperties(_jsonObject(propertiesJson));
      if (typeof eventCallback === "function") {
        this._innerAudioEventDefs().forEach(([event, onName]) => {
          const on = this._innerAudio[onName];
          if (typeof on !== "function") return;
          const listener = (res) => {
            eventCallback(event, _jsonSafe(res || {}), event === "error" ? _fmtErr(res) : "");
          };
          this._innerAudioListeners[event] = listener;
          on.call(this._innerAudio, listener);
        });
      }
      callback("createInnerAudioContext", true, _jsonSafe(this._innerAudioState()), "");
    } catch (e) {
      this._innerAudio = null;
      this._innerAudioListeners = {};
      callback("createInnerAudioContext", false, "", _fmtErr(e));
    }
  }

  setInnerAudioProperties(propertiesJson, callback) {
    if (!this._innerAudio) {
      callback("InnerAudioContext.setProperties", false, "", "No active InnerAudioContext");
      return;
    }
    try {
      this._applyInnerAudioProperties(_jsonObject(propertiesJson));
      callback("InnerAudioContext.setProperties", true, _jsonSafe(this._innerAudioState()), "");
    } catch (e) {
      callback("InnerAudioContext.setProperties", false, "", _fmtErr(e));
    }
  }

  getInnerAudioState(callback) {
    if (!this._innerAudio) {
      callback("InnerAudioContext.getState", false, "", "No active InnerAudioContext");
      return;
    }
    callback("InnerAudioContext.getState", true, _jsonSafe(this._innerAudioState()), "");
  }

  _innerAudioAction(action, methodName, args, callback) {
    if (!this._innerAudio) {
      callback(action, false, "", "No active InnerAudioContext");
      return;
    }
    const fn = this._innerAudio[methodName];
    if (typeof fn !== "function") {
      callback(action, false, "", `${action} is not supported`);
      return;
    }
    let settled = false;
    const finish = (ok, err) => {
      if (settled) return;
      settled = true;
      callback(action, !!ok, ok ? _jsonSafe(this._innerAudioState()) : "", ok ? "" : _fmtErr(err));
    };
    try {
      const result = fn.apply(this._innerAudio, args || []);
      if (result && typeof result.then === "function") {
        result.then(() => finish(true)).catch((err) => finish(false, err));
      } else {
        finish(true);
      }
    } catch (e) {
      finish(false, e);
    }
  }

  innerAudioPlay(callback) {
    return this._innerAudioAction("InnerAudioContext.play", "play", [], callback);
  }

  innerAudioPause(callback) {
    return this._innerAudioAction("InnerAudioContext.pause", "pause", [], callback);
  }

  innerAudioStop(callback) {
    return this._innerAudioAction("InnerAudioContext.stop", "stop", [], callback);
  }

  innerAudioSeek(position, callback) {
    return this._innerAudioAction("InnerAudioContext.seek", "seek", [_num(position)], callback);
  }

  stopInnerAudioListener(eventsJson, callback) {
    if (!this._innerAudio) {
      callback("InnerAudioContext.off", false, "", "No active InnerAudioContext");
      return;
    }
    try {
      const events = this._innerAudioEvents(eventsJson);
      this._offInnerAudioListeners(events);
      callback("InnerAudioContext.off", true, _jsonSafe({ events }), "");
    } catch (e) {
      callback("InnerAudioContext.off", false, "", _fmtErr(e));
    }
  }

  innerAudioDestroy(callback) {
    if (!this._innerAudio) {
      callback("InnerAudioContext.destroy", false, "", "No active InnerAudioContext");
      return;
    }
    try {
      this._offInnerAudioListeners();
      if (typeof this._innerAudio.destroy === "function") {
        this._innerAudio.destroy();
      }
      this._innerAudio = null;
      this._innerAudioListeners = {};
      callback("InnerAudioContext.destroy", true, "{}", "");
    } catch (e) {
      callback("InnerAudioContext.destroy", false, "", _fmtErr(e));
    }
  }

  // ── Network Status ─────────────────────────────────────────────

  getNetworkType(callback) {
    if (typeof _api.getNetworkType !== "function") {
      callback("", "", _unsupported("getNetworkType"));
      return;
    }
    try {
      _api.getNetworkType({
        success: (res) => callback((res && res.networkType) || "", _jsonSafe(res || {}), ""),
        fail: (err) => callback("", "", _fmtErr(err)),
      });
    } catch (e) {
      callback("", "", _fmtErr(e));
    }
  }

  onNetworkStatusChange(callback) {
    if (typeof _api.onNetworkStatusChange !== "function") return false;
    try {
      if (this._networkStatusListener && typeof _api.offNetworkStatusChange === "function") {
        try { _api.offNetworkStatusChange(this._networkStatusListener); } catch (_) {}
      }
      this._networkStatusListener = (res) => {
        const data = res || {};
        callback(!!data.isConnected, data.networkType || "", _jsonSafe(data));
      };
      _api.onNetworkStatusChange(this._networkStatusListener);
      return true;
    } catch (e) {
      console.warn("[SDK] onNetworkStatusChange:", _fmtErr(e));
      this._networkStatusListener = null;
      return false;
    }
  }

  offNetworkStatusChange() {
    if (typeof _api.offNetworkStatusChange !== "function" || !this._networkStatusListener) return false;
    try {
      _api.offNetworkStatusChange(this._networkStatusListener);
      this._networkStatusListener = null;
      return true;
    } catch (e) {
      console.warn("[SDK] offNetworkStatusChange:", _fmtErr(e));
      return false;
    }
  }

  // ── Sensors / Battery ──────────────────────────────────────────

  _startSensor(sensor, startApi, onApi, offApi, listenerProp, options, callback, eventCallback, eventMapper) {
    const startFn = _api[startApi];
    if (typeof startFn !== "function") {
      if (callback) callback(sensor, false, _unsupported(startApi));
      return;
    }
    if (eventCallback && typeof _api[onApi] !== "function") {
      if (callback) callback(sensor, false, _unsupported(onApi));
      return;
    }

    try {
      if (eventCallback) {
        if (this[listenerProp] && typeof _api[offApi] === "function") {
          try { _api[offApi](this[listenerProp]); } catch (_) {}
        }
        this[listenerProp] = (res) => eventMapper(res || {}, eventCallback);
        _api[onApi](this[listenerProp]);
      }

      startFn.call(_api, {
        ...(options || {}),
        success: () => { if (callback) callback(sensor, true, ""); },
        fail: (err) => { if (callback) callback(sensor, false, _fmtErr(err)); },
      });
    } catch (e) {
      if (callback) callback(sensor, false, _fmtErr(e));
    }
  }

  _stopSensor(sensor, stopApi, offApi, listenerProp, callback) {
    const stopFn = _api[stopApi];
    if (typeof stopFn !== "function") {
      if (callback) callback(sensor, false, _unsupported(stopApi));
      return;
    }

    const removeListener = () => {
      if (this[listenerProp] && typeof _api[offApi] === "function") {
        try { _api[offApi](this[listenerProp]); } catch (_) {}
      }
      this[listenerProp] = null;
    };

    try {
      stopFn.call(_api, {
        success: () => {
          removeListener();
          if (callback) callback(sensor, true, "");
        },
        fail: (err) => { if (callback) callback(sensor, false, _fmtErr(err)); },
      });
    } catch (e) {
      if (callback) callback(sensor, false, _fmtErr(e));
    }
  }

  startAccelerometer(interval, callback, eventCallback) {
    this._startSensor(
      "accelerometer",
      "startAccelerometer",
      "onAccelerometerChange",
      "offAccelerometerChange",
      "_accelerometerListener",
      { interval: interval || "normal" },
      callback,
      eventCallback,
      (data, cb) => cb(_num(data.x), _num(data.y), _num(data.z), _jsonSafe(data))
    );
  }

  stopAccelerometer(callback) {
    this._stopSensor("accelerometer", "stopAccelerometer", "offAccelerometerChange", "_accelerometerListener", callback);
  }

  startGyroscope(interval, callback, eventCallback) {
    this._startSensor(
      "gyroscope",
      "startGyroscope",
      "onGyroscopeChange",
      "offGyroscopeChange",
      "_gyroscopeListener",
      { interval: interval || "normal" },
      callback,
      eventCallback,
      (data, cb) => cb(_num(data.x), _num(data.y), _num(data.z), _jsonSafe(data))
    );
  }

  stopGyroscope(callback) {
    this._stopSensor("gyroscope", "stopGyroscope", "offGyroscopeChange", "_gyroscopeListener", callback);
  }

  startCompass(callback, eventCallback) {
    this._startSensor(
      "compass",
      "startCompass",
      "onCompassChange",
      "offCompassChange",
      "_compassListener",
      {},
      callback,
      eventCallback,
      (data, cb) => cb(
        _num(data.direction),
        data.accuracy === undefined ? "" : data.accuracy,
        _jsonSafe(data)
      )
    );
  }

  stopCompass(callback) {
    this._stopSensor("compass", "stopCompass", "offCompassChange", "_compassListener", callback);
  }

  startDeviceMotionListening(interval, callback, eventCallback) {
    this._startSensor(
      "deviceMotion",
      "startDeviceMotionListening",
      "onDeviceMotionChange",
      "offDeviceMotionChange",
      "_deviceMotionListener",
      { interval: interval || "normal" },
      callback,
      eventCallback,
      (data, cb) => cb(_num(data.alpha), _num(data.beta), _num(data.gamma), _jsonSafe(data))
    );
  }

  stopDeviceMotionListening(callback) {
    this._stopSensor("deviceMotion", "stopDeviceMotionListening", "offDeviceMotionChange", "_deviceMotionListener", callback);
  }

  getBatteryInfo(callback) {
    if (typeof _api.getBatteryInfo !== "function") {
      callback(0, false, "", _unsupported("getBatteryInfo"));
      return;
    }
    try {
      _api.getBatteryInfo({
        success: (res) => {
          const data = res || {};
          callback(Math.trunc(_num(data.level)), !!data.isCharging, _jsonSafe(data), "");
        },
        fail: (err) => callback(0, false, "", _fmtErr(err)),
      });
    } catch (e) {
      callback(0, false, "", _fmtErr(e));
    }
  }

  getBatteryInfoSync() {
    if (typeof _api.getBatteryInfoSync !== "function") return "{}";
    try { return _jsonSafe(_api.getBatteryInfoSync() || {}); }
    catch (_) { return "{}"; }
  }

  // ── Audio interruption ─────────────────────────────────────────

  onAudioInterruptionBegin(callback) {
    if (typeof _api.onAudioInterruptionBegin !== "function") return false;
    try {
      if (this._audioInterruptionBeginListener && typeof _api.offAudioInterruptionBegin === "function") {
        try { _api.offAudioInterruptionBegin(this._audioInterruptionBeginListener); } catch (_) {}
      }
      this._audioInterruptionBeginListener = (res) => callback("begin", _jsonSafe(res || {}), "");
      _api.onAudioInterruptionBegin(this._audioInterruptionBeginListener);
      return true;
    } catch (e) {
      console.warn("[SDK] onAudioInterruptionBegin:", _fmtErr(e));
      this._audioInterruptionBeginListener = null;
      return false;
    }
  }

  offAudioInterruptionBegin() {
    if (typeof _api.offAudioInterruptionBegin !== "function" || !this._audioInterruptionBeginListener) return false;
    try {
      _api.offAudioInterruptionBegin(this._audioInterruptionBeginListener);
      this._audioInterruptionBeginListener = null;
      return true;
    } catch (e) {
      console.warn("[SDK] offAudioInterruptionBegin:", _fmtErr(e));
      return false;
    }
  }

  onAudioInterruptionEnd(callback) {
    if (typeof _api.onAudioInterruptionEnd !== "function") return false;
    try {
      if (this._audioInterruptionEndListener && typeof _api.offAudioInterruptionEnd === "function") {
        try { _api.offAudioInterruptionEnd(this._audioInterruptionEndListener); } catch (_) {}
      }
      this._audioInterruptionEndListener = (res) => callback("end", _jsonSafe(res || {}), "");
      _api.onAudioInterruptionEnd(this._audioInterruptionEndListener);
      return true;
    } catch (e) {
      console.warn("[SDK] onAudioInterruptionEnd:", _fmtErr(e));
      this._audioInterruptionEndListener = null;
      return false;
    }
  }

  offAudioInterruptionEnd() {
    if (typeof _api.offAudioInterruptionEnd !== "function" || !this._audioInterruptionEndListener) return false;
    try {
      _api.offAudioInterruptionEnd(this._audioInterruptionEndListener);
      this._audioInterruptionEndListener = null;
      return true;
    } catch (e) {
      console.warn("[SDK] offAudioInterruptionEnd:", _fmtErr(e));
      return false;
    }
  }

  // ── Theme / performance ────────────────────────────────────────

  onThemeChange(callback) {
    if (typeof _api.onThemeChange !== "function") return false;
    try {
      if (this._themeChangeListener && typeof _api.offThemeChange === "function") {
        try { _api.offThemeChange(this._themeChangeListener); } catch (_) {}
      }
      this._themeChangeListener = (res) => {
        const data = res || {};
        callback(data.theme || "", _jsonSafe(data), "");
      };
      _api.onThemeChange(this._themeChangeListener);
      return true;
    } catch (e) {
      console.warn("[SDK] onThemeChange:", _fmtErr(e));
      this._themeChangeListener = null;
      return false;
    }
  }

  offThemeChange() {
    if (typeof _api.offThemeChange !== "function" || !this._themeChangeListener) return false;
    try {
      _api.offThemeChange(this._themeChangeListener);
      this._themeChangeListener = null;
      return true;
    } catch (e) {
      console.warn("[SDK] offThemeChange:", _fmtErr(e));
      return false;
    }
  }

  _getPerformanceObject() {
    if (typeof _api.getPerformance !== "function") return null;
    try { return _api.getPerformance() || null; }
    catch (e) {
      console.warn("[SDK] getPerformance:", _fmtErr(e));
      return null;
    }
  }

  getPerformanceEntries(entryType) {
    const performance = this._getPerformanceObject();
    if (!performance) return "[]";
    try {
      if (entryType && typeof performance.getEntriesByType === "function") {
        return _jsonSafe(performance.getEntriesByType(entryType) || []);
      }
      if (typeof performance.getEntries === "function") {
        return _jsonSafe(performance.getEntries() || []);
      }
      return "[]";
    } catch (e) {
      console.warn("[SDK] getPerformanceEntries:", _fmtErr(e));
      return "[]";
    }
  }

  reportPerformance(id, value, dimensionsJson) {
    if (typeof _api.reportPerformance !== "function") return false;
    let dimensions;
    if (dimensionsJson !== undefined && dimensionsJson !== null && dimensionsJson !== "") {
      try { dimensions = JSON.parse(dimensionsJson); }
      catch (_) { dimensions = String(dimensionsJson); }
    }
    try {
      if (dimensions === undefined) _api.reportPerformance(id, value);
      else _api.reportPerformance(id, value, dimensions);
      return true;
    } catch (e) {
      console.warn("[SDK] reportPerformance:", _fmtErr(e));
      return false;
    }
  }

  // ── Mini Program navigation / app control ──────────────────────

  _miniProgramAction(apiName, options, callback) {
    const fn = _api[apiName];
    if (typeof fn !== "function") {
      callback(apiName, false, "", _unsupported(apiName));
      return;
    }

    try {
      fn.call(_api, {
        ...(options || {}),
        success: (res) => callback(apiName, true, _jsonSafe(res || {}), ""),
        fail: (err) => callback(apiName, false, "", _fmtErr(err)),
      });
    } catch (e) {
      callback(apiName, false, "", _fmtErr(e));
    }
  }

  navigateToMiniProgram(appId, path, extraDataJson, envVersion, shortLink, noRelaunchIfPathUnchanged, callback) {
    const options = {};
    if (appId) options.appId = appId;
    if (path) options.path = path;
    const extraData = _jsonObject(extraDataJson);
    if (Object.keys(extraData).length > 0) options.extraData = extraData;
    if (envVersion) options.envVersion = envVersion;
    if (shortLink) options.shortLink = shortLink;
    if (noRelaunchIfPathUnchanged) options.noRelaunchIfPathUnchanged = true;
    this._miniProgramAction("navigateToMiniProgram", options, callback);
  }

  navigateBackMiniProgram(extraDataJson, callback) {
    this._miniProgramAction("navigateBackMiniProgram", {
      extraData: _jsonObject(extraDataJson),
    }, callback);
  }

  exitMiniProgram(callback) {
    this._miniProgramAction("exitMiniProgram", {}, callback);
  }

  restartMiniProgram(path, callback) {
    this._miniProgramAction("restartMiniProgram", { path: path || "" }, callback);
  }

  // ── User cloud storage / open data context ─────────────────────

  _cloudStorageAction(apiName, options, callback) {
    const fn = _api[apiName];
    if (typeof fn !== "function") {
      callback(apiName, false, "", _unsupported(apiName));
      return;
    }

    let settled = false;
    const finish = (ok, data, err) => {
      if (settled) return;
      settled = true;
      callback(apiName, !!ok, ok ? _jsonSafe(data || {}) : "", ok ? "" : _fmtErr(err));
    };

    try {
      const result = fn.call(_api, {
        ...(options || {}),
        success: (res) => finish(true, res || {}),
        fail: (err) => finish(false, null, err),
        complete: (res) => {
          if (!settled && res && typeof res.errMsg === "string" && res.errMsg.includes(":fail")) {
            finish(false, null, res);
          }
        },
      });
      if (result && typeof result.then === "function") {
        result.then((res) => finish(true, res || {})).catch((err) => finish(false, null, err));
      }
    } catch (e) {
      finish(false, null, e);
    }
  }

  setUserCloudStorage(kvDataJson, callback) {
    this._cloudStorageAction("setUserCloudStorage", {
      KVDataList: _kvDataList(kvDataJson),
    }, callback);
  }

  removeUserCloudStorage(keyListJson, callback) {
    this._cloudStorageAction("removeUserCloudStorage", {
      keyList: _jsonArray(keyListJson),
    }, callback);
  }

  getUserCloudStorageKeys(callback) {
    this._cloudStorageAction("getUserCloudStorageKeys", {}, callback);
  }

  getUserCloudStorage(keyListJson, callback) {
    this._cloudStorageAction("getUserCloudStorage", {
      keyList: _jsonArray(keyListJson),
    }, callback);
  }

  getFriendCloudStorage(keyListJson, callback) {
    this._cloudStorageAction("getFriendCloudStorage", {
      keyList: _jsonArray(keyListJson),
    }, callback);
  }

  getGroupCloudStorage(keyListJson, shareTicket, groupid, callback) {
    const options = { keyList: _jsonArray(keyListJson) };
    if (shareTicket) options.shareTicket = shareTicket;
    if (groupid) options.groupid = groupid;
    this._cloudStorageAction("getGroupCloudStorage", options, callback);
  }

  postOpenDataContextMessage(messageJson, sharedCanvasMode) {
    if (typeof _api.getOpenDataContext !== "function") return false;
    try {
      const options = { sharedCanvasMode: sharedCanvasMode || "offscreenCanvas" };
      const context = _api.getOpenDataContext(options);
      if (!context || typeof context.postMessage !== "function") return false;
      context.postMessage(_jsonObject(messageJson));
      return true;
    } catch (e) {
      console.warn("[SDK] postOpenDataContextMessage:", _fmtErr(e));
      return false;
    }
  }

  // ── Customer service / subscribe message ───────────────────────

  openCustomerServiceConversation(sessionFrom, showMessageCard, sendMessageTitle, sendMessagePath, sendMessageImg, callback) {
    const options = {};
    if (sessionFrom) options.sessionFrom = sessionFrom;
    if (showMessageCard) options.showMessageCard = true;
    if (sendMessageTitle) options.sendMessageTitle = sendMessageTitle;
    if (sendMessagePath) options.sendMessagePath = sendMessagePath;
    if (sendMessageImg) options.sendMessageImg = sendMessageImg;
    this._cloudStorageAction("openCustomerServiceConversation", options, callback);
  }

  requestSubscribeMessage(tmplIdsJson, callback) {
    this._cloudStorageAction("requestSubscribeMessage", {
      tmplIds: _jsonArray(tmplIdsJson),
    }, callback);
  }

  requestSubscribeSystemMessage(msgTypeListJson, callback) {
    this._cloudStorageAction("requestSubscribeSystemMessage", {
      msgTypeList: _jsonArray(msgTypeListJson),
    }, callback);
  }

  // ── Update manager / memory warning ───────────────────────────

  _getUpdateManager(callback) {
    if (typeof _api.getUpdateManager !== "function") {
      if (callback) callback("check", false, "{}", _unsupported("getUpdateManager"));
      return null;
    }

    try {
      if (!this._updateManager) this._updateManager = _api.getUpdateManager();
      return this._updateManager || null;
    } catch (e) {
      if (callback) callback("check", false, "{}", _fmtErr(e));
      return null;
    }
  }

  startUpdateListener(callback) {
    const manager = this._getUpdateManager(callback);
    if (!manager) return false;

    const required = ["onCheckForUpdate", "onUpdateReady", "onUpdateFailed"];
    for (const method of required) {
      if (typeof manager[method] !== "function") {
        if (callback) callback("check", false, "{}", _unsupported(`UpdateManager.${method}`));
        return false;
      }
    }

    this._updateCallback = callback;
    if (this._updateListenerStarted) return true;

    try {
      manager.onCheckForUpdate((res) => {
        const data = res || {};
        if (this._updateCallback) this._updateCallback("check", !!data.hasUpdate, _jsonSafe(data), "");
      });
      manager.onUpdateReady(() => {
        if (this._updateCallback) this._updateCallback("ready", true, "{}", "");
      });
      manager.onUpdateFailed(() => {
        if (this._updateCallback) this._updateCallback("failed", false, "{}", "");
      });
      this._updateListenerStarted = true;
      return true;
    } catch (e) {
      this._updateCallback = null;
      if (callback) callback("check", false, "{}", _fmtErr(e));
      return false;
    }
  }

  applyUpdate() {
    const manager = this._getUpdateManager();
    if (!manager || typeof manager.applyUpdate !== "function") return false;
    try {
      manager.applyUpdate();
      return true;
    } catch (e) {
      console.warn("[SDK] applyUpdate:", _fmtErr(e));
      return false;
    }
  }

  onMemoryWarning(callback) {
    if (typeof _api.onMemoryWarning !== "function") return false;

    try {
      if (this._memoryWarningListener && typeof _api.offMemoryWarning === "function") {
        try { _api.offMemoryWarning(this._memoryWarningListener); } catch (_) {}
      }
      this._memoryWarningListener = (res) => {
        const data = res || {};
        callback(Math.trunc(_num(data.level)), _jsonSafe(data), "");
      };
      _api.onMemoryWarning(this._memoryWarningListener);
      return true;
    } catch (e) {
      console.warn("[SDK] onMemoryWarning:", _fmtErr(e));
      this._memoryWarningListener = null;
      return false;
    }
  }

  offMemoryWarning() {
    if (typeof _api.offMemoryWarning !== "function" || !this._memoryWarningListener) return false;
    try {
      _api.offMemoryWarning(this._memoryWarningListener);
      this._memoryWarningListener = null;
      return true;
    } catch (e) {
      console.warn("[SDK] offMemoryWarning:", _fmtErr(e));
      return false;
    }
  }

  // ── Window / runtime error events ──────────────────────────────

  onWindowResize(callback) {
    if (typeof _api.onWindowResize !== "function") return false;
    try {
      if (this._windowResizeListener && typeof _api.offWindowResize === "function") {
        try { _api.offWindowResize(this._windowResizeListener); } catch (_) {}
      }
      this._windowResizeListener = (res) => {
        const data = res || {};
        const size = data.size || {};
        callback(
          Math.trunc(_num(size.windowWidth)),
          Math.trunc(_num(size.windowHeight)),
          _jsonSafe(data),
          ""
        );
      };
      _api.onWindowResize(this._windowResizeListener);
      return true;
    } catch (e) {
      console.warn("[SDK] onWindowResize:", _fmtErr(e));
      this._windowResizeListener = null;
      return false;
    }
  }

  offWindowResize() {
    if (typeof _api.offWindowResize !== "function" || !this._windowResizeListener) return false;
    try {
      _api.offWindowResize(this._windowResizeListener);
      this._windowResizeListener = null;
      return true;
    } catch (e) {
      console.warn("[SDK] offWindowResize:", _fmtErr(e));
      return false;
    }
  }

  onUnhandledRejection(callback) {
    if (typeof _api.onUnhandledRejection !== "function") return false;
    try {
      if (this._unhandledRejectionListener && typeof _api.offUnhandledRejection === "function") {
        try { _api.offUnhandledRejection(this._unhandledRejectionListener); } catch (_) {}
      }
      this._unhandledRejectionListener = (res) => {
        const data = res || {};
        const reason = _reasonToString(data.reason);
        callback(reason, _jsonSafe({ ...data, reason }), "");
      };
      _api.onUnhandledRejection(this._unhandledRejectionListener);
      return true;
    } catch (e) {
      console.warn("[SDK] onUnhandledRejection:", _fmtErr(e));
      this._unhandledRejectionListener = null;
      return false;
    }
  }

  offUnhandledRejection() {
    if (typeof _api.offUnhandledRejection !== "function" || !this._unhandledRejectionListener) return false;
    try {
      _api.offUnhandledRejection(this._unhandledRejectionListener);
      this._unhandledRejectionListener = null;
      return true;
    } catch (e) {
      console.warn("[SDK] offUnhandledRejection:", _fmtErr(e));
      return false;
    }
  }

  // ── Screen brightness / capture / recording ───────────────────

  getScreenBrightness(callback) {
    if (typeof _api.getScreenBrightness !== "function") {
      callback(0, "", _unsupported("getScreenBrightness"));
      return;
    }
    try {
      _api.getScreenBrightness({
        success: (res) => {
          const data = res || {};
          callback(_num(data.value), _jsonSafe(data), "");
        },
        fail: (err) => callback(0, "", _fmtErr(err)),
      });
    } catch (e) {
      callback(0, "", _fmtErr(e));
    }
  }

  setScreenBrightness(value, callback) {
    const numericValue = _num(value);
    if (typeof _api.setScreenBrightness !== "function") {
      callback(numericValue, false, _unsupported("setScreenBrightness"));
      return;
    }
    try {
      _api.setScreenBrightness({
        value: numericValue,
        success: () => callback(numericValue, true, ""),
        fail: (err) => callback(numericValue, false, _fmtErr(err)),
      });
    } catch (e) {
      callback(numericValue, false, _fmtErr(e));
    }
  }

  onUserCaptureScreen(callback) {
    if (typeof _api.onUserCaptureScreen !== "function") return false;
    try {
      if (this._userCaptureScreenListener && typeof _api.offUserCaptureScreen === "function") {
        try { _api.offUserCaptureScreen(); } catch (_) {}
      }
      this._userCaptureScreenListener = (res) => callback(_jsonSafe(res || {}), "");
      _api.onUserCaptureScreen(this._userCaptureScreenListener);
      return true;
    } catch (e) {
      console.warn("[SDK] onUserCaptureScreen:", _fmtErr(e));
      this._userCaptureScreenListener = null;
      return false;
    }
  }

  offUserCaptureScreen() {
    if (typeof _api.offUserCaptureScreen !== "function" || !this._userCaptureScreenListener) return false;
    try {
      _api.offUserCaptureScreen();
      this._userCaptureScreenListener = null;
      return true;
    } catch (e) {
      console.warn("[SDK] offUserCaptureScreen:", _fmtErr(e));
      return false;
    }
  }

  getScreenRecordingState(callback) {
    if (typeof _api.getScreenRecordingState !== "function") {
      callback("", "", _unsupported("getScreenRecordingState"));
      return;
    }
    try {
      _api.getScreenRecordingState({
        success: (res) => {
          const data = res || {};
          callback(data.state || "", _jsonSafe(data), "");
        },
        fail: (err) => callback("", "", _fmtErr(err)),
      });
    } catch (e) {
      callback("", "", _fmtErr(e));
    }
  }

  onScreenRecordingStateChanged(callback) {
    if (typeof _api.onScreenRecordingStateChanged !== "function") return false;
    try {
      if (this._screenRecordingStateListener && typeof _api.offScreenRecordingStateChanged === "function") {
        try { _api.offScreenRecordingStateChanged(this._screenRecordingStateListener); } catch (_) {}
      }
      this._screenRecordingStateListener = (res) => {
        const data = res || {};
        callback(data.state || "", _jsonSafe(data), "");
      };
      _api.onScreenRecordingStateChanged(this._screenRecordingStateListener);
      return true;
    } catch (e) {
      console.warn("[SDK] onScreenRecordingStateChanged:", _fmtErr(e));
      this._screenRecordingStateListener = null;
      return false;
    }
  }

  offScreenRecordingStateChanged() {
    if (typeof _api.offScreenRecordingStateChanged !== "function" || !this._screenRecordingStateListener) return false;
    try {
      _api.offScreenRecordingStateChanged(this._screenRecordingStateListener);
      this._screenRecordingStateListener = null;
      return true;
    } catch (e) {
      console.warn("[SDK] offScreenRecordingStateChanged:", _fmtErr(e));
      return false;
    }
  }

  setVisualEffectOnCapture(visualEffect, callback) {
    const effect = visualEffect === "hidden" ? "hidden" : (visualEffect === "none" ? "none" : "");
    if (!effect) {
      callback(visualEffect || "", false, "Invalid visualEffect. Use 'none' or 'hidden'.");
      return;
    }
    if (typeof _api.setVisualEffectOnCapture !== "function") {
      callback(effect, false, _unsupported("setVisualEffectOnCapture"));
      return;
    }
    try {
      _api.setVisualEffectOnCapture({
        visualEffect: effect,
        success: () => callback(effect, true, ""),
        fail: (err) => callback(effect, false, _fmtErr(err)),
      });
    } catch (e) {
      callback(effect, false, _fmtErr(e));
    }
  }

  // ── System Info ────────────────────────────────────────────────

  getSystemInfo() {
    try { return JSON.stringify(_getSystemInfoModern()); }
    catch (_) { return "{}"; }
  }

  getLaunchOptions() {
    try { return JSON.stringify(_api.getLaunchOptionsSync()); }
    catch (_) { return "{}"; }
  }

  getWindowInfo() {
    try {
      // getWindowInfo is the modern dedicated API; fall back to the composed
      // info object so older base libraries still get something usable.
      const fn = _api.getWindowInfo;
      return JSON.stringify(fn ? fn.call(_api) : _getSystemInfoModern());
    } catch (_) { return "{}"; }
  }

  getMenuButtonRect() {
    try { return JSON.stringify(_api.getMenuButtonBoundingClientRect()); }
    catch (_) { return "{}"; }
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  onAppShow(callback) {
    if (typeof _api.onShow !== "function") return false;
    _api.onShow((res) => callback(JSON.stringify(res || {})));
    return true;
  }

  onAppHide(callback) {
    if (typeof _api.onHide !== "function") return false;
    _api.onHide(() => callback(""));
    return true;
  }

  onAppError(callback) {
    if (typeof _api.onError !== "function") return false;
    _api.onError((msg) => callback(typeof msg === "string" ? msg : JSON.stringify(msg)));
    return true;
  }

  // ── Clipboard ──────────────────────────────────────────────────

  setClipboard(data) {
    _api.setClipboardData({ data: data || "" });
  }

  getClipboard(callback) {
    _api.getClipboardData({
      success: (res) => callback(res.data || "", ""),
      fail: (err) => callback("", _fmtErr(err)),
    });
  }

  // ── Screen ─────────────────────────────────────────────────────

  setKeepScreenOn(keepOn) {
    _api.setKeepScreenOn({ keepScreenOn: !!keepOn });
  }

  // ── Toast / Modal (platform native) ────────────────────────────

  showToast(title, icon, duration) {
    _api.showToast({ title: title || "", icon: icon || "none", duration: duration || 1500 });
  }

  showModal(title, content, callback) {
    _api.showModal({
      title: title || "",
      content: content || "",
      success: (res) => callback(!!res.confirm, !!res.cancel),
    });
  }

  showLoading(title) { _api.showLoading({ title: title || "", mask: true }); }
  hideLoading() { _api.hideLoading({}); }

  // ── File system bridge (existing) ──────────────────────────────

  writeFile(path, array) {
    const fs = _api.getFileSystemManager();
    const idx = path.lastIndexOf("/");
    const dir = idx > 0 ? path.slice(0, idx) : "/";
    return this._ensureDir(fs, `${_api.env.USER_DATA_PATH}${dir}`)
      .then(() => new Promise((resolve, reject) => {
        fs.open({ filePath: `${_api.env.USER_DATA_PATH}${path}`, flag: "w+",
          success: res => resolve(res.fd), fail: reject });
      }))
      .then(fd => new Promise((resolve, reject) => {
        fs.write({ fd, data: array.buffer || array,
          success: () => resolve(fd), fail: err => reject({ fd, error: err }) });
      }))
      .then(fd => new Promise((resolve, reject) => {
        fs.close({ fd, success: resolve, fail: reject });
      }))
      .catch(err => {
        if (err && err.fd !== undefined) {
          return new Promise((resolve, reject) => {
            fs.close({ fd: err.fd, success: resolve, fail: reject });
          }).then(() => { throw err.error; });
        }
        throw err;
      });
  }

  copyLocalToFS(path) {
    const fs = _api.getFileSystemManager();
    return this._accessOrMkdir(fs, `${_api.env.USER_DATA_PATH}${path}`)
      .then(() => new Promise((resolve, reject) => {
        fs.readdir({ dirPath: `${_api.env.USER_DATA_PATH}${path}`,
          success: res => resolve(res.files.filter(v => v !== "." && v !== "..")),
          fail: reject });
      }))
      .then(dirs => dirs.reduce((chain, name) => chain.then(() => {
        const p = `${_api.env.USER_DATA_PATH}${path}/${name}`;
        return new Promise((resolve, reject) => {
          fs.stat({ path: p, success: r => resolve(r.stats), fail: reject });
        }).then(stat => {
          if (stat.isDirectory()) return this.copyLocalToFS(`${path}/${name}`);
          if (stat.isFile()) {
            return new Promise((resolve, reject) => {
              fs.readFile({ filePath: p, success: r => { this.engine.copyToFS(`${path}/${name}`, r.data); resolve(); }, fail: reject });
            });
          }
        });
      }), Promise.resolve()));
  }

  syncfs(onSuccess, onError) {
    if (!this.engine || typeof this.engine.copyFSToAdapter !== "function") {
      if (onSuccess) onSuccess();
      return;
    }
    this.engine.copyFSToAdapter(this)
      .then(() => { if (onSuccess) onSuccess(); })
      .catch(err => { if (onError) onError(err); });
  }

  downloadSubpacks(onSuccess, onError) {
    return new Promise((resolve, reject) => {
      _api.loadSubpackage({ name: "subpacks", success: () => resolve(), fail: reject });
    }).then(() => {
      const fs = _api.getFileSystemManager();
      return new Promise((resolve, reject) => {
        fs.readdir({ dirPath: "subpacks", success: res => resolve(res.files), fail: reject });
      });
    }).then(files => {
      const fs = _api.getFileSystemManager();
      return Promise.all(files.filter(f => !f.endsWith(".js")).map(f =>
        new Promise((resolve, reject) => {
          fs.readFile({ filePath: `subpacks/${f}`, success: res => resolve({ name: f, data: res.data }), fail: reject });
        })
      ));
    }).then(values => {
      values.forEach(v => this.engine.copyToFS(`subpacks/${v.name}`, v.data));
      if (onSuccess) onSuccess();
    }).catch(reason => { if (onError) onError(reason.errMsg || reason); });
  }

  downloadCDNSubpacks(url, onSuccess, onError) {
    return new Promise((resolve, reject) => {
      _api.request({ url, responseType: "arraybuffer", method: "GET", success: res => resolve(res.data), fail: reject });
    }).then(data => {
      const filename = url.split("/").pop();
      this.engine.copyToFS(`subpacks/${filename}`, data);
      if (onSuccess) onSuccess();
    }).catch(reason => { if (onError) onError(reason); });
  }

  _ensureDir(fs, dirPath) {
    return new Promise(resolve => {
      fs.access({ path: dirPath, success: resolve,
        fail: () => { fs.mkdir({ dirPath, recursive: true, success: resolve, fail: resolve }); } });
    });
  }

  _accessOrMkdir(fs, dirPath) {
    return new Promise((resolve, reject) => {
      fs.access({ path: dirPath, success: resolve, fail: reject });
    }).catch(() => new Promise((resolve, reject) => {
      fs.mkdir({ dirPath, recursive: true, success: resolve, fail: reject });
    }));
  }
}

export { BRIDGE_ABI_VERSION, BRIDGE_BRAND, BRIDGE_GLOBAL_NAME, GodotSDK };
