extends Node
## Unified mini-game platform SDK (WeChat / Douyin).
##
## Add as an autoload (singleton) named "MiniGameSDK".
## All async results are delivered via signals.
## Synchronous methods (storage, vibration, etc.) return immediately.
## Outside a mini-game runtime every method is a safe fallback (no crash,
## signal emitted with an error string, getters return defaults).

# ── Signals ────────────────────────────────────────────────────────

signal login_completed(code: String, error: String)
signal session_checked(valid: bool, error: String)
signal user_info_received(info_json: String, error: String)

signal privacy_setting_received(need_authorization: bool, privacy_contract_name: String, data_json: String, error: String)
signal privacy_authorize_result(success: bool, error: String)
signal privacy_contract_opened(success: bool, error: String)
signal privacy_authorization_needed(event_info_json: String, error: String)

signal setting_received(settings_json: String, error: String)
signal setting_opened(settings_json: String, error: String)
signal authorization_result(scope: String, success: bool, error: String)
signal native_button_operation_result(button_type: String, action: String, success: bool, data_json: String, error: String)
signal native_button_tapped(button_type: String, data_json: String, error: String)
signal debug_operation_result(action: String, success: bool, data_json: String, error: String)

signal ad_created(ad_type: String, success: bool, error: String)
signal rewarded_ad_result(is_ended: bool, error: String)
signal interstitial_ad_result(success: bool, error: String)

signal payment_result(success: bool, error: String)

signal keyboard_event(event_type: String, value: String)

signal http_response(status_code: int, data: String, error: String)
signal file_transfer_result(action: String, success: bool, status_code: int, data_json: String, error: String)
signal socket_operation_result(action: String, success: bool, data_json: String, error: String)
signal socket_opened(data_json: String, error: String)
signal socket_message_received(data: String, data_json: String, error: String)
signal socket_closed(code: int, reason: String, data_json: String, error: String)
signal socket_error(data_json: String, error: String)
signal file_system_result(action: String, success: bool, data_json: String, error: String)
signal subpackage_result(action: String, success: bool, data_json: String, error: String)
signal subpackage_progress(action: String, progress: int, total_bytes_written: int, total_bytes_expected: int, data_json: String)
signal worker_operation_result(action: String, success: bool, data_json: String, error: String)
signal worker_message(data_json: String, error: String)
signal worker_error(data_json: String, error: String)
signal worker_process_killed(data_json: String, error: String)
signal media_result(action: String, success: bool, data_json: String, error: String)
signal camera_operation_result(action: String, success: bool, data_json: String, error: String)
signal camera_frame(data_json: String, error: String)
signal camera_event(event_type: String, data_json: String, error: String)
signal video_operation_result(action: String, success: bool, data_json: String, error: String)
signal video_event(event_type: String, data_json: String, error: String)
signal recorder_operation_result(action: String, success: bool, data_json: String, error: String)
signal recorder_event(event_type: String, data_json: String, error: String)
signal available_audio_sources_received(sources_json: String, data_json: String, error: String)
signal video_decoder_operation_result(action: String, success: bool, data_json: String, error: String)
signal video_decoder_event(event_type: String, data_json: String, error: String)
signal media_audio_operation_result(action: String, success: bool, data_json: String, error: String)
signal game_recorder_operation_result(action: String, success: bool, data_json: String, error: String)
signal game_recorder_event(event_type: String, data_json: String, error: String)
signal inner_audio_operation_result(action: String, success: bool, data_json: String, error: String)
signal inner_audio_event(event_type: String, data_json: String, error: String)
signal network_type_received(network_type: String, data_json: String, error: String)
signal network_status_changed(is_connected: bool, network_type: String, data_json: String)

signal sensor_started(sensor: String, success: bool, error: String)
signal sensor_stopped(sensor: String, success: bool, error: String)
signal accelerometer_changed(x: float, y: float, z: float, data_json: String)
signal gyroscope_changed(x: float, y: float, z: float, data_json: String)
signal compass_changed(direction: float, accuracy: Variant, data_json: String)
signal device_motion_changed(alpha: float, beta: float, gamma: float, data_json: String)
signal battery_info_received(level: int, is_charging: bool, data_json: String, error: String)

signal audio_interruption(event_type: String, data_json: String, error: String)
signal theme_changed(theme: String, data_json: String, error: String)
signal mini_program_navigation_result(action: String, success: bool, data_json: String, error: String)
signal cloud_storage_result(action: String, success: bool, data_json: String, error: String)
signal customer_service_result(action: String, success: bool, data_json: String, error: String)
signal subscribe_message_result(action: String, success: bool, data_json: String, error: String)
signal update_checked(has_update: bool, data_json: String, error: String)
signal update_ready(error: String)
signal update_failed(error: String)
signal memory_warning(level: int, data_json: String, error: String)
signal window_resized(width: int, height: int, data_json: String, error: String)
signal unhandled_rejection(reason: String, data_json: String, error: String)
signal screen_brightness_received(value: float, data_json: String, error: String)
signal screen_brightness_set(value: float, success: bool, error: String)
signal user_capture_screen(data_json: String, error: String)
signal screen_recording_state_received(state: String, data_json: String, error: String)
signal screen_recording_state_changed(state: String, data_json: String, error: String)
signal visual_effect_on_capture_set(effect: String, success: bool, error: String)

signal clipboard_received(data: String, error: String)

signal modal_result(confirmed: bool)

signal generic_api_result(api_name: String, success: bool, data_json: String, error: String)

signal app_shown(options_json: String)
signal app_hidden()
signal app_error(message: String)
signal bridge_initialization_failed(error: String)

# ── State ──────────────────────────────────────────────────────────

const NOT_IN_RUNTIME := "Not in mini-game environment"
const BRIDGE_ABI_VERSION := 1
const BRIDGE_GLOBAL_NAME := "godotMiniGameBridgeV1"
const BRIDGE_BRAND := "godot-mini-game-bridge"
const REQUIRED_BRIDGE_METHODS := [
	"getBridgeInfo",
	"validateBridge",
	"onAppShow",
	"onAppHide",
	"onAppError",
]
const NATIVE_BUTTON_OBJECTS := {
	"userInfo": "UserInfoButton",
	"openSetting": "OpenSettingButton",
	"gameClub": "GameClubButton",
}

var _sdk: JavaScriptObject = null
var bridge_info: Dictionary = {}
var bridge_initialization_error := ""
var _privacy_listener_started := false
var _network_listener_started := false
var _accelerometer_change_cb: JavaScriptObject = null
var _gyroscope_change_cb: JavaScriptObject = null
var _compass_change_cb: JavaScriptObject = null
var _device_motion_change_cb: JavaScriptObject = null
var _audio_interruption_begin_listener_started := false
var _audio_interruption_end_listener_started := false
var _audio_interruption_cb: JavaScriptObject = null
var _theme_change_listener_started := false
var _theme_change_cb: JavaScriptObject = null
var _update_listener_started := false
var _update_event_cb: JavaScriptObject = null
var _memory_warning_listener_started := false
var _memory_warning_cb: JavaScriptObject = null
var _window_resize_listener_started := false
var _window_resize_cb: JavaScriptObject = null
var _unhandled_rejection_listener_started := false
var _unhandled_rejection_cb: JavaScriptObject = null
var _user_capture_screen_listener_started := false
var _user_capture_screen_cb: JavaScriptObject = null
var _screen_recording_state_listener_started := false
var _screen_recording_state_cb: JavaScriptObject = null

# Callbacks must be kept alive on the GDScript side, otherwise the
# JavaScriptBridge garbage-collects them and the JS side fires into
# nothing. We give each callback a unique id and store it in `_cbs`.
# One-shot callbacks (login, payment, ad, modal, ...) erase themselves
# from `_cbs` after first invocation, so concurrent calls don't overwrite
# each other and we don't leak forever. Persistent callbacks (lifecycle
# events: onAppShow / onAppHide / onAppError) stay for the SDK's lifetime.
var _cbs: Dictionary = {}
var _cb_counter: int = 0

## True when running inside a mini-game runtime with the JS SDK available.
var is_mini_game: bool:
	get: return _sdk != null


func _ready() -> void:
	if not OS.has_feature("web"):
		return
	var candidate := JavaScriptBridge.get_interface(BRIDGE_GLOBAL_NAME)
	if candidate == null:
		_fail_bridge_initialization(
			"Mini-game Bridge ABI %d (%s) is not available" % [
				BRIDGE_ABI_VERSION, BRIDGE_GLOBAL_NAME])
		return
	var validation_raw: Variant = candidate.validateBridge(
		BRIDGE_ABI_VERSION, JSON.stringify(REQUIRED_BRIDGE_METHODS))
	var validation := _parse_json_object(validation_raw)
	var info_value: Variant = validation.get("bridgeInfo", {})
	var info: Dictionary = info_value if info_value is Dictionary else {}
	var error := _bridge_validation_error(validation, info)
	if not error.is_empty():
		_fail_bridge_initialization(error)
		return
	_sdk = candidate
	bridge_info = info.duplicate(true)
	bridge_initialization_error = ""
	_setup_lifecycle()


static func _bridge_validation_error(
	validation: Dictionary,
	info: Dictionary,
) -> String:
	var identity_matches := (
		str(info.get("brand", "")) == BRIDGE_BRAND
		and str(info.get("globalName", "")) == BRIDGE_GLOBAL_NAME
		and int(info.get("abiVersion", 0)) == BRIDGE_ABI_VERSION
	)
	if bool(validation.get("ok", false)) and identity_matches:
		return ""
	var reported_error := str(validation.get("error", "")).strip_edges()
	if not reported_error.is_empty():
		return reported_error
	return (
		"Bridge identity is incompatible: expected %s/%s ABI %d, got %s/%s ABI %d"
		% [
			BRIDGE_BRAND,
			BRIDGE_GLOBAL_NAME,
			BRIDGE_ABI_VERSION,
			str(info.get("brand", "<missing>")),
			str(info.get("globalName", "<missing>")),
			int(info.get("abiVersion", 0)),
		]
	)


func _fail_bridge_initialization(error: String) -> void:
	_sdk = null
	bridge_info.clear()
	bridge_initialization_error = error
	push_warning(error)
	call_deferred("_emit_bridge_initialization_failed")


func _emit_bridge_initialization_failed() -> void:
	bridge_initialization_failed.emit(bridge_initialization_error)


# ── Internal helpers ──────────────────────────────────────────────

## Wraps `handler` so that JS can invoke it exactly once. The wrapper
## removes itself from `_cbs` after firing, which is what lets the
## JavaScriptBridge eventually release it.
func _track_oneshot(handler: Callable) -> JavaScriptObject:
	var id := _cb_counter
	_cb_counter += 1
	var cb := JavaScriptBridge.create_callback(func(args: Array) -> void:
		_cbs.erase(id)
		handler.call(args))
	_cbs[id] = cb
	return cb


## Wraps a long-lived `handler` (e.g. lifecycle hooks fired many times).
## Kept alive for the SDK's lifetime.
func _track_persistent(handler: Callable) -> JavaScriptObject:
	var id := _cb_counter
	_cb_counter += 1
	var cb := JavaScriptBridge.create_callback(handler)
	_cbs[id] = cb
	return cb


## str() but null-safe. `str(null)` returns "<null>" in GDScript 4,
## which downstream `error.is_empty()` checks would misread as a
## non-empty error message.
static func _s(v: Variant) -> String:
	return "" if v == null else str(v)


## bool() but null-safe.
static func _b(v: Variant) -> bool:
	return false if v == null else bool(v)


## int() but null-safe.
static func _i(v: Variant) -> int:
	if v == null:
		return 0
	if v is int or v is float or v is bool:
		return int(v)
	var s := str(v)
	return s.to_int() if s.is_valid_int() else 0


## float() but null-safe.
static func _f(v: Variant) -> float:
	if v == null:
		return 0.0
	if v is int or v is float or v is bool:
		return float(v)
	var s := str(v)
	return s.to_float() if s.is_valid_float() else 0.0


static func _parse_json_array(json_str: Variant) -> Array:
	if json_str == null:
		return []
	var parsed: Variant = JSON.parse_string(str(json_str))
	return parsed if parsed is Array else []


# ── Storage (synchronous) ─────────────────────────────────────────

func storage_set(key: String, value: String) -> void:
	if _sdk:
		_sdk.storageSet(key, value)


func storage_get(key: String, default_value: String = "") -> String:
	if not _sdk:
		return default_value
	var result: Variant = _sdk.storageGet(key, default_value)
	if result == null:
		return default_value
	var s := str(result)
	# Defensive: JS bridges occasionally surface JS `undefined` as the
	# literal string "undefined". Treat it as missing.
	if s == "undefined" or s == "<null>":
		return default_value
	return s


func storage_remove(key: String) -> void:
	if _sdk:
		_sdk.storageRemove(key)


func storage_clear() -> void:
	if _sdk:
		_sdk.storageClear()


## Returns { "keys": Array[String], "size": int, "limit": int }
## or an empty Dictionary outside the mini-game runtime.
func storage_info() -> Dictionary:
	if not _sdk:
		return {}
	var json_str: Variant = _sdk.storageGetAll()
	if json_str == null:
		return {}
	var parsed: Variant = JSON.parse_string(str(json_str))
	return parsed if parsed is Dictionary else {}


# ── Auth / Login ──────────────────────────────────────────────────

func login() -> void:
	if not _sdk:
		login_completed.emit("", NOT_IN_RUNTIME)
		return
	_sdk.login(_track_oneshot(_on_login))


func _on_login(args: Array) -> void:
	login_completed.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "")


func check_session() -> void:
	if not _sdk:
		session_checked.emit(false, NOT_IN_RUNTIME)
		return
	_sdk.checkSession(_track_oneshot(_on_check_session))


func _on_check_session(args: Array) -> void:
	session_checked.emit(
		_b(args[0]) if args.size() > 0 else false,
		_s(args[1]) if args.size() > 1 else "")


func get_user_info() -> void:
	if not _sdk:
		user_info_received.emit("", NOT_IN_RUNTIME)
		return
	_sdk.getUserInfo(_track_oneshot(_on_user_info))


func _on_user_info(args: Array) -> void:
	user_info_received.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "")


# ── Privacy Authorization ────────────────────────────────────────

func get_privacy_setting() -> void:
	if not _sdk:
		privacy_setting_received.emit(false, "", "", NOT_IN_RUNTIME)
		return
	_sdk.getPrivacySetting(_track_oneshot(_on_privacy_setting))


func _on_privacy_setting(args: Array) -> void:
	privacy_setting_received.emit(
		_b(args[0]) if args.size() > 0 else false,
		_s(args[1]) if args.size() > 1 else "",
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func require_privacy_authorize() -> void:
	if not _sdk:
		privacy_authorize_result.emit(false, NOT_IN_RUNTIME)
		return
	_sdk.requirePrivacyAuthorize(_track_oneshot(_on_privacy_authorize))


func _on_privacy_authorize(args: Array) -> void:
	privacy_authorize_result.emit(
		_b(args[0]) if args.size() > 0 else false,
		_s(args[1]) if args.size() > 1 else "")


func open_privacy_contract() -> void:
	if not _sdk:
		privacy_contract_opened.emit(false, NOT_IN_RUNTIME)
		return
	_sdk.openPrivacyContract(_track_oneshot(_on_privacy_contract_opened))


func _on_privacy_contract_opened(args: Array) -> void:
	privacy_contract_opened.emit(
		_b(args[0]) if args.size() > 0 else false,
		_s(args[1]) if args.size() > 1 else "")


## Explicitly register wx.onNeedPrivacyAuthorization. Register this only
## when your game is prepared to show a privacy prompt and call
## resolve_privacy_authorization(), because WeChat keeps the original
## privacy API pending until it is resolved.
func start_privacy_authorization_listener() -> void:
	if not _sdk:
		privacy_authorization_needed.emit("{}", NOT_IN_RUNTIME)
		return
	if _privacy_listener_started:
		return
	_privacy_listener_started = true
	_sdk.onNeedPrivacyAuthorization(_track_persistent(_on_need_privacy_authorization))


func _on_need_privacy_authorization(args: Array) -> void:
	privacy_authorization_needed.emit(
		_s(args[0]) if args.size() > 0 else "{}",
		_s(args[1]) if args.size() > 1 else "")


## event: "exposureAuthorization" | "agree" | "disagree".
## button_id is required by WeChat for event == "agree".
func resolve_privacy_authorization(event: String = "agree", button_id: String = "agree-btn") -> bool:
	if not _sdk:
		return false
	return _b(_sdk.resolvePrivacyAuthorization(event, button_id))


func expose_privacy_authorization() -> bool:
	return resolve_privacy_authorization("exposureAuthorization", "")


func agree_privacy_authorization(button_id: String = "agree-btn") -> bool:
	return resolve_privacy_authorization("agree", button_id)


func disagree_privacy_authorization() -> bool:
	return resolve_privacy_authorization("disagree", "")


# ── Settings / Authorization / Account ───────────────────────────

func get_setting(with_subscriptions: bool = false) -> void:
	if not _sdk:
		setting_received.emit("", NOT_IN_RUNTIME)
		return
	_sdk.getSetting(with_subscriptions, _track_oneshot(_on_setting_received))


func _on_setting_received(args: Array) -> void:
	setting_received.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "")


func open_setting(with_subscriptions: bool = false) -> void:
	if not _sdk:
		setting_opened.emit("", NOT_IN_RUNTIME)
		return
	_sdk.openSetting(with_subscriptions, _track_oneshot(_on_setting_opened))


func _on_setting_opened(args: Array) -> void:
	setting_opened.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "")


func authorize(scope: String) -> void:
	if not _sdk:
		authorization_result.emit(scope, false, NOT_IN_RUNTIME)
		return
	_sdk.authorize(scope, _track_oneshot(_on_authorization_result))


func _on_authorization_result(args: Array) -> void:
	authorization_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "")


# ── Native Buttons ────────────────────────────────────────────────

func _native_button_object_name(button_type: String) -> String:
	return _s(NATIVE_BUTTON_OBJECTS.get(button_type, "NativeButton"))


func _native_button_action_name(button_type: String, action: String) -> String:
	if action.begins_with("create"):
		return action
	return "%s.%s" % [_native_button_object_name(button_type), action]


func _emit_native_button_not_in_runtime(button_type: String, action: String) -> void:
	native_button_operation_result.emit(button_type, _native_button_action_name(button_type, action), false, "", NOT_IN_RUNTIME)


func create_user_info_button(options: Dictionary = {}) -> void:
	if not _sdk:
		_emit_native_button_not_in_runtime("userInfo", "createUserInfoButton")
		return
	_sdk.createUserInfoButton(
		JSON.stringify(options),
		_track_oneshot(_on_native_button_operation),
		_track_persistent(_on_native_button_tap))


func create_open_setting_button(options: Dictionary = {}) -> void:
	if not _sdk:
		_emit_native_button_not_in_runtime("openSetting", "createOpenSettingButton")
		return
	_sdk.createOpenSettingButton(
		JSON.stringify(options),
		_track_oneshot(_on_native_button_operation),
		_track_persistent(_on_native_button_tap))


func create_game_club_button(options: Dictionary = {}) -> void:
	if not _sdk:
		_emit_native_button_not_in_runtime("gameClub", "createGameClubButton")
		return
	_sdk.createGameClubButton(
		JSON.stringify(options),
		_track_oneshot(_on_native_button_operation),
		_track_persistent(_on_native_button_tap))


func show_native_button(button_type: String) -> void:
	_native_button_action(button_type, "show")


func hide_native_button(button_type: String) -> void:
	_native_button_action(button_type, "hide")


func destroy_native_button(button_type: String) -> void:
	_native_button_action(button_type, "destroy")


func stop_native_button_tap_listener(button_type: String) -> void:
	if not _sdk:
		_emit_native_button_not_in_runtime(button_type, "offTap")
		return
	_sdk.stopNativeButtonTap(button_type, _track_oneshot(_on_native_button_operation))


func _native_button_action(button_type: String, action: String) -> void:
	if not _sdk:
		_emit_native_button_not_in_runtime(button_type, action)
		return
	_sdk.nativeButtonAction(button_type, action, _track_oneshot(_on_native_button_operation))


func _on_native_button_operation(args: Array) -> void:
	native_button_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "",
		_b(args[2]) if args.size() > 2 else false,
		_s(args[3]) if args.size() > 3 else "",
		_s(args[4]) if args.size() > 4 else "")


func _on_native_button_tap(args: Array) -> void:
	native_button_tapped.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "",
		_s(args[2]) if args.size() > 2 else "")


# ── Debug Logging ─────────────────────────────────────────────────

func _emit_debug_not_in_runtime(action: String) -> void:
	debug_operation_result.emit(action, false, "", NOT_IN_RUNTIME)


func set_enable_debug(enable_debug: bool) -> void:
	if not _sdk:
		_emit_debug_not_in_runtime("setEnableDebug")
		return
	_sdk.setEnableDebug(enable_debug, _track_oneshot(_on_debug_operation))


func get_log_manager(level: int = 0) -> void:
	if not _sdk:
		_emit_debug_not_in_runtime("getLogManager")
		return
	_sdk.getLogManager(level, _track_oneshot(_on_debug_operation))


func log_manager_write(level: String, args: Array = []) -> void:
	var action := "LogManager.%s" % level
	if not _sdk:
		_emit_debug_not_in_runtime(action)
		return
	_sdk.logManagerWrite(level, JSON.stringify(args), _track_oneshot(_on_debug_operation))


func log_manager_debug(args: Array = []) -> void:
	log_manager_write("debug", args)


func log_manager_info(args: Array = []) -> void:
	log_manager_write("info", args)


func log_manager_log(args: Array = []) -> void:
	log_manager_write("log", args)


func log_manager_warn(args: Array = []) -> void:
	log_manager_write("warn", args)


func get_realtime_log_manager() -> void:
	if not _sdk:
		_emit_debug_not_in_runtime("getRealtimeLogManager")
		return
	_sdk.getRealtimeLogManager(_track_oneshot(_on_debug_operation))


func realtime_log_write(level: String, args: Array = []) -> void:
	var action := "RealtimeLogManager.%s" % level
	if not _sdk:
		_emit_debug_not_in_runtime(action)
		return
	_sdk.realtimeLogManagerWrite(level, JSON.stringify(args), _track_oneshot(_on_debug_operation))


func realtime_log_info(args: Array = []) -> void:
	realtime_log_write("info", args)


func realtime_log_warn(args: Array = []) -> void:
	realtime_log_write("warn", args)


func realtime_log_error(args: Array = []) -> void:
	realtime_log_write("error", args)


func realtime_log_set_filter_msg(msg: String) -> void:
	if not _sdk:
		_emit_debug_not_in_runtime("RealtimeLogManager.setFilterMsg")
		return
	_sdk.realtimeLogManagerSetFilterMsg(msg, _track_oneshot(_on_debug_operation))


func realtime_log_add_filter_msg(msg: String) -> void:
	if not _sdk:
		_emit_debug_not_in_runtime("RealtimeLogManager.addFilterMsg")
		return
	_sdk.realtimeLogManagerAddFilterMsg(msg, _track_oneshot(_on_debug_operation))


func realtime_log_tag(tag: String) -> void:
	if not _sdk:
		_emit_debug_not_in_runtime("RealtimeLogManager.tag")
		return
	_sdk.realtimeLogManagerTag(tag, _track_oneshot(_on_debug_operation))


func _on_debug_operation(args: Array) -> void:
	debug_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func get_account_info() -> Dictionary:
	return _parse_json_object(_sdk.getAccountInfo() if _sdk else null)


# ── Share ─────────────────────────────────────────────────────────

func share_app(title: String, image_url: String = "", query: String = "") -> void:
	if _sdk:
		_sdk.shareApp(title, image_url, query)


func show_share_menu() -> void:
	if _sdk:
		_sdk.showShareMenu()


func hide_share_menu() -> void:
	if _sdk:
		_sdk.hideShareMenu()


# ── Rewarded Video Ad ─────────────────────────────────────────────

func create_rewarded_ad(ad_unit_id: String) -> void:
	if not _sdk:
		ad_created.emit("rewarded", false, NOT_IN_RUNTIME)
		return
	_sdk.createRewardedAd(ad_unit_id, _track_oneshot(_on_ad_created.bind("rewarded")))


func show_rewarded_ad() -> void:
	if not _sdk:
		rewarded_ad_result.emit(false, NOT_IN_RUNTIME)
		return
	_sdk.showRewardedAd(_track_oneshot(_on_rewarded_ad))


func _on_rewarded_ad(args: Array) -> void:
	rewarded_ad_result.emit(
		_b(args[0]) if args.size() > 0 else false,
		_s(args[1]) if args.size() > 1 else "")


# ── Banner Ad ─────────────────────────────────────────────────────

func create_banner_ad(ad_unit_id: String) -> void:
	if not _sdk:
		ad_created.emit("banner", false, NOT_IN_RUNTIME)
		return
	_sdk.createBannerAd(ad_unit_id, _track_oneshot(_on_ad_created.bind("banner")))


func show_banner_ad() -> void:
	if _sdk:
		_sdk.showBannerAd()


func hide_banner_ad() -> void:
	if _sdk:
		_sdk.hideBannerAd()


func destroy_banner_ad() -> void:
	if _sdk:
		_sdk.destroyBannerAd()


# ── Interstitial Ad ───────────────────────────────────────────────

func create_interstitial_ad(ad_unit_id: String) -> void:
	if not _sdk:
		ad_created.emit("interstitial", false, NOT_IN_RUNTIME)
		return
	_sdk.createInterstitialAd(ad_unit_id, _track_oneshot(_on_ad_created.bind("interstitial")))


func show_interstitial_ad() -> void:
	if not _sdk:
		interstitial_ad_result.emit(false, NOT_IN_RUNTIME)
		return
	_sdk.showInterstitialAd(_track_oneshot(_on_interstitial_ad))


func _on_interstitial_ad(args: Array) -> void:
	interstitial_ad_result.emit(
		_b(args[0]) if args.size() > 0 else false,
		_s(args[1]) if args.size() > 1 else "")


## Shared handler for the three ad-create flows. `ad_type` is bound
## by the caller so we can route to a single ad_created signal.
func _on_ad_created(args: Array, ad_type: String) -> void:
	ad_created.emit(
		ad_type,
		_b(args[0]) if args.size() > 0 else false,
		_s(args[1]) if args.size() > 1 else "")


# ── Payment ───────────────────────────────────────────────────────

func request_payment(params: Dictionary) -> void:
	if not _sdk:
		payment_result.emit(false, NOT_IN_RUNTIME)
		return
	_sdk.requestPayment(JSON.stringify(params), _track_oneshot(_on_payment))


func _on_payment(args: Array) -> void:
	payment_result.emit(
		_b(args[0]) if args.size() > 0 else false,
		_s(args[1]) if args.size() > 1 else "")


# ── Vibration ─────────────────────────────────────────────────────

## type: "heavy" | "medium" | "light"
func vibrate_short(type: String = "medium") -> void:
	if _sdk:
		_sdk.vibrateShort(type)


func vibrate_long() -> void:
	if _sdk:
		_sdk.vibrateLong()


# ── Keyboard ──────────────────────────────────────────────────────

func show_keyboard(default_value: String = "", max_length: int = 140, multiple: bool = false) -> void:
	if not _sdk:
		return
	# Keyboard fires multiple events (input/confirm/complete) so it is
	# tracked as persistent — the JS side decides when to stop emitting.
	_sdk.showKeyboard(default_value, max_length, multiple, _track_persistent(_on_keyboard))


func _on_keyboard(args: Array) -> void:
	keyboard_event.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "")


func hide_keyboard() -> void:
	if _sdk:
		_sdk.hideKeyboard()


# ── Network / HTTP ────────────────────────────────────────────────

func http_request(url: String, method: String = "GET", data: String = "", headers: Dictionary = {}) -> void:
	if not _sdk:
		http_response.emit(0, "", NOT_IN_RUNTIME)
		return
	_sdk.httpRequest(url, method, data, JSON.stringify(headers), _track_oneshot(_on_http_response))


func _on_http_response(args: Array) -> void:
	http_response.emit(
		_i(args[0]) if args.size() > 0 else 0,
		_s(args[1]) if args.size() > 1 else "",
		_s(args[2]) if args.size() > 2 else "")


func download_file(
	url: String,
	file_path: String = "",
	headers: Dictionary = {},
	timeout_ms: int = 60000,
	enable_profile: bool = true,
	enable_http2: bool = false,
	enable_quic: bool = false
) -> void:
	if not _sdk:
		file_transfer_result.emit("downloadFile", false, 0, "", NOT_IN_RUNTIME)
		return
	_sdk.downloadFile(
		url,
		file_path,
		JSON.stringify(headers),
		timeout_ms,
		enable_profile,
		enable_http2,
		enable_quic,
		_track_oneshot(_on_file_transfer_result))


func upload_file(
	url: String,
	file_path: String,
	name: String = "file",
	form_data: Dictionary = {},
	headers: Dictionary = {},
	timeout_ms: int = 60000,
	enable_profile: bool = true,
	enable_http2: bool = false,
	enable_quic: bool = false
) -> void:
	if not _sdk:
		file_transfer_result.emit("uploadFile", false, 0, "", NOT_IN_RUNTIME)
		return
	_sdk.uploadFile(
		url,
		file_path,
		name,
		JSON.stringify(form_data),
		JSON.stringify(headers),
		timeout_ms,
		enable_profile,
		enable_http2,
		enable_quic,
		_track_oneshot(_on_file_transfer_result))


func _on_file_transfer_result(args: Array) -> void:
	file_transfer_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_i(args[2]) if args.size() > 2 else 0,
		_s(args[3]) if args.size() > 3 else "",
		_s(args[4]) if args.size() > 4 else "")


func connect_socket(
	url: String,
	headers: Dictionary = {},
	protocols: Array = [],
	tcp_no_delay: bool = false,
	per_message_deflate: bool = false,
	timeout_ms: int = 0,
	force_cellular_network: bool = false
) -> void:
	if not _sdk:
		socket_operation_result.emit("connectSocket", false, "", NOT_IN_RUNTIME)
		return
	_sdk.connectSocket(
		url,
		JSON.stringify(headers),
		JSON.stringify(protocols),
		tcp_no_delay,
		per_message_deflate,
		timeout_ms,
		force_cellular_network,
		_track_oneshot(_on_socket_operation),
		_track_persistent(_on_socket_event))


func send_socket_message(data: String) -> void:
	if not _sdk:
		socket_operation_result.emit("sendSocketMessage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.sendSocketMessage(data, _track_oneshot(_on_socket_operation))


func close_socket(code: int = 1000, reason: String = "") -> void:
	if not _sdk:
		socket_operation_result.emit("closeSocket", false, "", NOT_IN_RUNTIME)
		return
	_sdk.closeSocket(code, reason, _track_oneshot(_on_socket_operation))


func _on_socket_operation(args: Array) -> void:
	socket_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_socket_event(args: Array) -> void:
	var event_type := _s(args[0]) if args.size() > 0 else ""
	var data := _s(args[1]) if args.size() > 1 else ""
	var data_json := _s(args[2]) if args.size() > 2 else "{}"
	var error := _s(args[3]) if args.size() > 3 else ""
	match event_type:
		"open":
			socket_opened.emit(data_json, error)
		"message":
			socket_message_received.emit(data, data_json, error)
		"close":
			var close_info: Variant = JSON.parse_string(data_json)
			var code := 0
			var reason := ""
			if close_info is Dictionary:
				code = _i(close_info.get("code", 0))
				reason = _s(close_info.get("reason", ""))
			socket_closed.emit(code, reason, data_json, error)
		"error":
			socket_error.emit(data_json, error)


func call_file_system(method: String, options: Dictionary = {}) -> void:
	if not _sdk:
		file_system_result.emit(method, false, "", NOT_IN_RUNTIME)
		return
	_sdk.fileSystemCall(method, JSON.stringify(options), _track_oneshot(_on_file_system_result))


func file_system_access(path: String) -> void:
	call_file_system("access", {"path": path})


func file_system_read_file(file_path: String, encoding: String = "utf8", position: int = -1, length: int = -1) -> void:
	var options := {
		"filePath": file_path,
		"encoding": encoding,
	}
	if position >= 0:
		options["position"] = position
	if length >= 0:
		options["length"] = length
	call_file_system("readFile", options)


func file_system_write_file(file_path: String, data: String, encoding: String = "utf8") -> void:
	call_file_system("writeFile", {
		"filePath": file_path,
		"data": data,
		"encoding": encoding,
	})


func file_system_append_file(file_path: String, data: String, encoding: String = "utf8") -> void:
	call_file_system("appendFile", {
		"filePath": file_path,
		"data": data,
		"encoding": encoding,
	})


func file_system_mkdir(dir_path: String, recursive: bool = true) -> void:
	call_file_system("mkdir", {
		"dirPath": dir_path,
		"recursive": recursive,
	})


func file_system_readdir(dir_path: String) -> void:
	call_file_system("readdir", {"dirPath": dir_path})


func file_system_unlink(file_path: String) -> void:
	call_file_system("unlink", {"filePath": file_path})


func file_system_save_file(temp_file_path: String, file_path: String = "") -> void:
	var options := {"tempFilePath": temp_file_path}
	if not file_path.is_empty():
		options["filePath"] = file_path
	call_file_system("saveFile", options)


func file_system_get_saved_file_list() -> void:
	call_file_system("getSavedFileList")


func file_system_remove_saved_file(file_path: String) -> void:
	call_file_system("removeSavedFile", {"filePath": file_path})


func file_system_get_file_info(file_path: String, digest_algorithm: String = "md5") -> void:
	call_file_system("getFileInfo", {
		"filePath": file_path,
		"digestAlgorithm": digest_algorithm,
	})


func file_system_copy_file(src_path: String, dest_path: String) -> void:
	call_file_system("copyFile", {
		"srcPath": src_path,
		"destPath": dest_path,
	})


func file_system_rename(old_path: String, new_path: String) -> void:
	call_file_system("rename", {
		"oldPath": old_path,
		"newPath": new_path,
	})


func file_system_rmdir(dir_path: String, recursive: bool = false) -> void:
	call_file_system("rmdir", {
		"dirPath": dir_path,
		"recursive": recursive,
	})


func file_system_stat(path: String, recursive: bool = false) -> void:
	call_file_system("stat", {
		"path": path,
		"recursive": recursive,
	})


func file_system_unzip(zip_file_path: String, target_path: String) -> void:
	call_file_system("unzip", {
		"zipFilePath": zip_file_path,
		"targetPath": target_path,
	})


func _on_file_system_result(args: Array) -> void:
	file_system_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func load_subpackage(name: String) -> void:
	if not _sdk:
		subpackage_result.emit("loadSubpackage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.loadSubpackage(
		name,
		_track_oneshot(_on_subpackage_result),
		_track_persistent(_on_subpackage_progress))


func pre_download_subpackage(name: String, package_type: String = "normal") -> void:
	if not _sdk:
		subpackage_result.emit("preDownloadSubpackage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.preDownloadSubpackage(
		name,
		package_type,
		_track_oneshot(_on_subpackage_result),
		_track_persistent(_on_subpackage_progress))


func _on_subpackage_result(args: Array) -> void:
	subpackage_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_subpackage_progress(args: Array) -> void:
	subpackage_progress.emit(
		_s(args[0]) if args.size() > 0 else "",
		_i(args[1]) if args.size() > 1 else 0,
		_i(args[2]) if args.size() > 2 else 0,
		_i(args[3]) if args.size() > 3 else 0,
		_s(args[4]) if args.size() > 4 else "{}")


func create_worker(script_path: String, use_experimental_worker: bool = false) -> void:
	if not _sdk:
		worker_operation_result.emit("createWorker", false, "", NOT_IN_RUNTIME)
		return
	_sdk.createWorker(
		script_path,
		use_experimental_worker,
		_track_oneshot(_on_worker_operation),
		_track_persistent(_on_worker_event))


func worker_post_message(message: Dictionary) -> void:
	if not _sdk:
		worker_operation_result.emit("Worker.postMessage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.workerPostMessage(JSON.stringify(message), _track_oneshot(_on_worker_operation))


func worker_terminate() -> void:
	if not _sdk:
		worker_operation_result.emit("Worker.terminate", false, "", NOT_IN_RUNTIME)
		return
	_sdk.workerTerminate(_track_oneshot(_on_worker_operation))


func _on_worker_operation(args: Array) -> void:
	worker_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_worker_event(args: Array) -> void:
	var event_type := _s(args[0]) if args.size() > 0 else ""
	var data_json := _s(args[1]) if args.size() > 1 else "{}"
	var error := _s(args[2]) if args.size() > 2 else ""
	match event_type:
		"message":
			worker_message.emit(data_json, error)
		"error":
			worker_error.emit(data_json, error)
		"processKilled":
			worker_process_killed.emit(data_json, error)


# ── Media / Images ────────────────────────────────────────────────

func choose_media(
	count: int = 9,
	media_type: Array = [],
	source_type: Array = [],
	max_duration: int = 10,
	size_type: Array = [],
	camera: String = "back"
) -> void:
	if not _sdk:
		media_result.emit("chooseMedia", false, "", NOT_IN_RUNTIME)
		return
	var media_type_arg := media_type if not media_type.is_empty() else ["image", "video"]
	var source_type_arg := source_type if not source_type.is_empty() else ["album", "camera"]
	var size_type_arg := size_type if not size_type.is_empty() else ["original", "compressed"]
	_sdk.chooseMedia(
		count,
		JSON.stringify(media_type_arg),
		JSON.stringify(source_type_arg),
		max_duration,
		JSON.stringify(size_type_arg),
		camera,
		_track_oneshot(_on_media_result))


func choose_image(count: int = 9, size_type: Array = [], source_type: Array = []) -> void:
	if not _sdk:
		media_result.emit("chooseImage", false, "", NOT_IN_RUNTIME)
		return
	var size_type_arg := size_type if not size_type.is_empty() else ["original", "compressed"]
	var source_type_arg := source_type if not source_type.is_empty() else ["album", "camera"]
	_sdk.chooseImage(
		count,
		JSON.stringify(size_type_arg),
		JSON.stringify(source_type_arg),
		_track_oneshot(_on_media_result))


func preview_image(urls: Array, current: String = "", show_menu: bool = true, referrer_policy: String = "no-referrer") -> void:
	if not _sdk:
		media_result.emit("previewImage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.previewImage(
		JSON.stringify(urls),
		current,
		show_menu,
		referrer_policy,
		_track_oneshot(_on_media_result))


func save_image_to_photos_album(file_path: String) -> void:
	if not _sdk:
		media_result.emit("saveImageToPhotosAlbum", false, "", NOT_IN_RUNTIME)
		return
	_sdk.saveImageToPhotosAlbum(file_path, _track_oneshot(_on_media_result))


func compress_image(src: String, quality: int = 80, compressed_width: int = 0, compressed_height: int = 0) -> void:
	if not _sdk:
		media_result.emit("compressImage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.compressImage(
		src,
		quality,
		compressed_width,
		compressed_height,
		_track_oneshot(_on_media_result))


func _on_media_result(args: Array) -> void:
	media_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


# ── Camera ────────────────────────────────────────────────────────

func create_camera(
	x: int = 0,
	y: int = 0,
	width: int = 300,
	height: int = 150,
	device_position: String = "back",
	flash: String = "auto",
	frame_size: String = "small"
) -> void:
	if not _sdk:
		camera_operation_result.emit("createCamera", false, "", NOT_IN_RUNTIME)
		return
	_sdk.createCamera(
		x,
		y,
		width,
		height,
		device_position,
		flash,
		frame_size,
		_track_oneshot(_on_camera_operation),
		_track_persistent(_on_camera_event))


func camera_take_photo(quality: String = "normal") -> void:
	if not _sdk:
		camera_operation_result.emit("Camera.takePhoto", false, "", NOT_IN_RUNTIME)
		return
	_sdk.cameraTakePhoto(quality, _track_oneshot(_on_camera_operation))


func camera_start_record() -> void:
	if not _sdk:
		camera_operation_result.emit("Camera.startRecord", false, "", NOT_IN_RUNTIME)
		return
	_sdk.cameraStartRecord(_track_oneshot(_on_camera_operation))


func camera_stop_record(compressed: bool = true) -> void:
	if not _sdk:
		camera_operation_result.emit("Camera.stopRecord", false, "", NOT_IN_RUNTIME)
		return
	_sdk.cameraStopRecord(compressed, _track_oneshot(_on_camera_operation))


func camera_set_zoom(zoom: float) -> void:
	if not _sdk:
		camera_operation_result.emit("Camera.setZoom", false, "", NOT_IN_RUNTIME)
		return
	_sdk.cameraSetZoom(zoom, _track_oneshot(_on_camera_operation))


func camera_listen_frame_change(use_active_worker: bool = false) -> void:
	if not _sdk:
		camera_operation_result.emit("Camera.listenFrameChange", false, "", NOT_IN_RUNTIME)
		return
	_sdk.cameraListenFrameChange(use_active_worker, _track_oneshot(_on_camera_operation))


func camera_close_frame_change() -> void:
	if not _sdk:
		camera_operation_result.emit("Camera.closeFrameChange", false, "", NOT_IN_RUNTIME)
		return
	_sdk.cameraCloseFrameChange(_track_oneshot(_on_camera_operation))


func camera_destroy() -> void:
	if not _sdk:
		camera_operation_result.emit("Camera.destroy", false, "", NOT_IN_RUNTIME)
		return
	_sdk.cameraDestroy(_track_oneshot(_on_camera_operation))


func _on_camera_operation(args: Array) -> void:
	camera_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_camera_event(args: Array) -> void:
	var event_type := _s(args[0]) if args.size() > 0 else ""
	var data_json := _s(args[1]) if args.size() > 1 else "{}"
	var error := _s(args[2]) if args.size() > 2 else ""
	if event_type == "frame":
		camera_frame.emit(data_json, error)
	else:
		camera_event.emit(event_type, data_json, error)


# ── Video ─────────────────────────────────────────────────────────

func create_video(options: Dictionary = {}) -> void:
	if not _sdk:
		video_operation_result.emit("createVideo", false, "", NOT_IN_RUNTIME)
		return
	_sdk.createVideo(
		JSON.stringify(options),
		_track_oneshot(_on_video_operation),
		_track_persistent(_on_video_event))


func set_video_properties(properties: Dictionary = {}) -> void:
	if not _sdk:
		video_operation_result.emit("Video.setProperties", false, "", NOT_IN_RUNTIME)
		return
	_sdk.setVideoProperties(JSON.stringify(properties), _track_oneshot(_on_video_operation))


func get_video_state() -> void:
	if not _sdk:
		video_operation_result.emit("Video.getState", false, "", NOT_IN_RUNTIME)
		return
	_sdk.getVideoState(_track_oneshot(_on_video_operation))


func video_play() -> void:
	if not _sdk:
		video_operation_result.emit("Video.play", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoPlay(_track_oneshot(_on_video_operation))


func video_pause() -> void:
	if not _sdk:
		video_operation_result.emit("Video.pause", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoPause(_track_oneshot(_on_video_operation))


func video_stop() -> void:
	if not _sdk:
		video_operation_result.emit("Video.stop", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoStop(_track_oneshot(_on_video_operation))


func video_seek(time: float) -> void:
	if not _sdk:
		video_operation_result.emit("Video.seek", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoSeek(time, _track_oneshot(_on_video_operation))


func video_request_full_screen(direction: int = 0) -> void:
	if not _sdk:
		video_operation_result.emit("Video.requestFullScreen", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoRequestFullScreen(direction, _track_oneshot(_on_video_operation))


func video_exit_full_screen() -> void:
	if not _sdk:
		video_operation_result.emit("Video.exitFullScreen", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoExitFullScreen(_track_oneshot(_on_video_operation))


func stop_video_listener(event_types: Array = []) -> void:
	if not _sdk:
		video_operation_result.emit("Video.off", false, "", NOT_IN_RUNTIME)
		return
	_sdk.stopVideoListener(JSON.stringify(event_types), _track_oneshot(_on_video_operation))


func video_destroy() -> void:
	if not _sdk:
		video_operation_result.emit("Video.destroy", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoDestroy(_track_oneshot(_on_video_operation))


func _on_video_operation(args: Array) -> void:
	video_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_video_event(args: Array) -> void:
	video_event.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


# ── Recorder Manager ─────────────────────────────────────────────

func get_recorder_manager() -> void:
	if not _sdk:
		recorder_operation_result.emit("getRecorderManager", false, "", NOT_IN_RUNTIME)
		return
	_sdk.getRecorderManager(
		_track_oneshot(_on_recorder_operation),
		_track_persistent(_on_recorder_event))


func recorder_start(options: Dictionary = {}) -> void:
	if not _sdk:
		recorder_operation_result.emit("RecorderManager.start", false, "", NOT_IN_RUNTIME)
		return
	_sdk.recorderStart(JSON.stringify(options), _track_oneshot(_on_recorder_operation))


func recorder_pause() -> void:
	if not _sdk:
		recorder_operation_result.emit("RecorderManager.pause", false, "", NOT_IN_RUNTIME)
		return
	_sdk.recorderPause(_track_oneshot(_on_recorder_operation))


func recorder_resume() -> void:
	if not _sdk:
		recorder_operation_result.emit("RecorderManager.resume", false, "", NOT_IN_RUNTIME)
		return
	_sdk.recorderResume(_track_oneshot(_on_recorder_operation))


func recorder_stop() -> void:
	if not _sdk:
		recorder_operation_result.emit("RecorderManager.stop", false, "", NOT_IN_RUNTIME)
		return
	_sdk.recorderStop(_track_oneshot(_on_recorder_operation))


func _on_recorder_operation(args: Array) -> void:
	recorder_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_recorder_event(args: Array) -> void:
	recorder_event.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


# ── Audio sources / VideoDecoder / MediaAudioPlayer ──────────────

func get_available_audio_sources() -> void:
	if not _sdk:
		available_audio_sources_received.emit("[]", "", NOT_IN_RUNTIME)
		return
	_sdk.getAvailableAudioSources(_track_oneshot(_on_available_audio_sources))


func _on_available_audio_sources(args: Array) -> void:
	available_audio_sources_received.emit(
		_s(args[0]) if args.size() > 0 else "[]",
		_s(args[1]) if args.size() > 1 else "",
		_s(args[2]) if args.size() > 2 else "")


func create_video_decoder() -> void:
	if not _sdk:
		video_decoder_operation_result.emit("createVideoDecoder", false, "", NOT_IN_RUNTIME)
		return
	_sdk.createVideoDecoder(_track_oneshot(_on_video_decoder_operation))


func video_decoder_start(options: Dictionary = {}) -> void:
	if not _sdk:
		video_decoder_operation_result.emit("VideoDecoder.start", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoDecoderStart(JSON.stringify(options), _track_oneshot(_on_video_decoder_operation))


func video_decoder_get_frame_data() -> void:
	if not _sdk:
		video_decoder_operation_result.emit("VideoDecoder.getFrameData", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoDecoderGetFrameData(_track_oneshot(_on_video_decoder_operation))


func video_decoder_seek(position: float) -> void:
	if not _sdk:
		video_decoder_operation_result.emit("VideoDecoder.seek", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoDecoderSeek(position, _track_oneshot(_on_video_decoder_operation))


func video_decoder_stop() -> void:
	if not _sdk:
		video_decoder_operation_result.emit("VideoDecoder.stop", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoDecoderStop(_track_oneshot(_on_video_decoder_operation))


func video_decoder_remove() -> void:
	if not _sdk:
		video_decoder_operation_result.emit("VideoDecoder.remove", false, "", NOT_IN_RUNTIME)
		return
	_sdk.videoDecoderRemove(_track_oneshot(_on_video_decoder_operation))


func start_video_decoder_listener(event_types: Array = []) -> void:
	if not _sdk:
		video_decoder_operation_result.emit("VideoDecoder.on", false, "", NOT_IN_RUNTIME)
		return
	_sdk.startVideoDecoderListener(
		JSON.stringify(event_types),
		_track_oneshot(_on_video_decoder_operation),
		_track_persistent(_on_video_decoder_event))


func stop_video_decoder_listener(event_types: Array = []) -> void:
	if not _sdk:
		video_decoder_operation_result.emit("VideoDecoder.off", false, "", NOT_IN_RUNTIME)
		return
	_sdk.stopVideoDecoderListener(JSON.stringify(event_types), _track_oneshot(_on_video_decoder_operation))


func _on_video_decoder_operation(args: Array) -> void:
	video_decoder_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_video_decoder_event(args: Array) -> void:
	video_decoder_event.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


func create_media_audio_player(volume: float = 1.0) -> void:
	if not _sdk:
		media_audio_operation_result.emit("createMediaAudioPlayer", false, "", NOT_IN_RUNTIME)
		return
	_sdk.createMediaAudioPlayer(volume, _track_oneshot(_on_media_audio_operation))


func set_media_audio_volume(volume: float) -> void:
	if not _sdk:
		media_audio_operation_result.emit("MediaAudioPlayer.setVolume", false, "", NOT_IN_RUNTIME)
		return
	_sdk.setMediaAudioVolume(volume, _track_oneshot(_on_media_audio_operation))


func media_audio_add_video_decoder_source() -> void:
	if not _sdk:
		media_audio_operation_result.emit("MediaAudioPlayer.addAudioSource", false, "", NOT_IN_RUNTIME)
		return
	_sdk.mediaAudioAddVideoDecoderSource(_track_oneshot(_on_media_audio_operation))


func media_audio_remove_video_decoder_source() -> void:
	if not _sdk:
		media_audio_operation_result.emit("MediaAudioPlayer.removeAudioSource", false, "", NOT_IN_RUNTIME)
		return
	_sdk.mediaAudioRemoveVideoDecoderSource(_track_oneshot(_on_media_audio_operation))


func media_audio_start() -> void:
	if not _sdk:
		media_audio_operation_result.emit("MediaAudioPlayer.start", false, "", NOT_IN_RUNTIME)
		return
	_sdk.mediaAudioStart(_track_oneshot(_on_media_audio_operation))


func media_audio_stop() -> void:
	if not _sdk:
		media_audio_operation_result.emit("MediaAudioPlayer.stop", false, "", NOT_IN_RUNTIME)
		return
	_sdk.mediaAudioStop(_track_oneshot(_on_media_audio_operation))


func media_audio_destroy() -> void:
	if not _sdk:
		media_audio_operation_result.emit("MediaAudioPlayer.destroy", false, "", NOT_IN_RUNTIME)
		return
	_sdk.mediaAudioDestroy(_track_oneshot(_on_media_audio_operation))


func _on_media_audio_operation(args: Array) -> void:
	media_audio_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


# ── Game Recorder ────────────────────────────────────────────────

func get_game_recorder() -> void:
	if not _sdk:
		game_recorder_operation_result.emit("getGameRecorder", false, "", NOT_IN_RUNTIME)
		return
	_sdk.getGameRecorder(_track_oneshot(_on_game_recorder_operation))


func game_recorder_start(options: Dictionary = {}) -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorder.start", false, "", NOT_IN_RUNTIME)
		return
	_sdk.gameRecorderStart(JSON.stringify(options), _track_oneshot(_on_game_recorder_operation))


func game_recorder_stop() -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorder.stop", false, "", NOT_IN_RUNTIME)
		return
	_sdk.gameRecorderStop(_track_oneshot(_on_game_recorder_operation))


func game_recorder_pause() -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorder.pause", false, "", NOT_IN_RUNTIME)
		return
	_sdk.gameRecorderPause(_track_oneshot(_on_game_recorder_operation))


func game_recorder_resume() -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorder.resume", false, "", NOT_IN_RUNTIME)
		return
	_sdk.gameRecorderResume(_track_oneshot(_on_game_recorder_operation))


func game_recorder_abort() -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorder.abort", false, "", NOT_IN_RUNTIME)
		return
	_sdk.gameRecorderAbort(_track_oneshot(_on_game_recorder_operation))


func start_game_recorder_listener(event_types: Array = []) -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorder.on", false, "", NOT_IN_RUNTIME)
		return
	_sdk.startGameRecorderListener(
		JSON.stringify(event_types),
		_track_oneshot(_on_game_recorder_operation),
		_track_persistent(_on_game_recorder_event))


func stop_game_recorder_listener(event_types: Array = []) -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorder.off", false, "", NOT_IN_RUNTIME)
		return
	_sdk.stopGameRecorderListener(JSON.stringify(event_types), _track_oneshot(_on_game_recorder_operation))


func operate_game_recorder_video(params: Dictionary = {}) -> void:
	if not _sdk:
		game_recorder_operation_result.emit("operateGameRecorderVideo", false, "", NOT_IN_RUNTIME)
		return
	_sdk.operateGameRecorderVideo(JSON.stringify(params), _track_oneshot(_on_game_recorder_operation))


func create_game_recorder_share_button(style: Dictionary, share: Dictionary) -> void:
	if not _sdk:
		game_recorder_operation_result.emit("createGameRecorderShareButton", false, "", NOT_IN_RUNTIME)
		return
	_sdk.createGameRecorderShareButton(
		JSON.stringify(style),
		JSON.stringify(share),
		_track_oneshot(_on_game_recorder_operation),
		_track_persistent(_on_game_recorder_event))


func show_game_recorder_share_button() -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorderShareButton.show", false, "", NOT_IN_RUNTIME)
		return
	_sdk.showGameRecorderShareButton(_track_oneshot(_on_game_recorder_operation))


func hide_game_recorder_share_button() -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorderShareButton.hide", false, "", NOT_IN_RUNTIME)
		return
	_sdk.hideGameRecorderShareButton(_track_oneshot(_on_game_recorder_operation))


func off_game_recorder_share_button_tap() -> void:
	if not _sdk:
		game_recorder_operation_result.emit("GameRecorderShareButton.offTap", false, "", NOT_IN_RUNTIME)
		return
	_sdk.offGameRecorderShareButtonTap(_track_oneshot(_on_game_recorder_operation))


func _on_game_recorder_operation(args: Array) -> void:
	game_recorder_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_game_recorder_event(args: Array) -> void:
	game_recorder_event.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


# ── Inner Audio ───────────────────────────────────────────────────

func set_inner_audio_option(options: Dictionary = {}) -> void:
	if not _sdk:
		inner_audio_operation_result.emit("setInnerAudioOption", false, "", NOT_IN_RUNTIME)
		return
	_sdk.setInnerAudioOption(JSON.stringify(options), _track_oneshot(_on_inner_audio_operation))


func create_inner_audio_context(create_options: Dictionary = {}, properties: Dictionary = {}) -> void:
	if not _sdk:
		inner_audio_operation_result.emit("createInnerAudioContext", false, "", NOT_IN_RUNTIME)
		return
	_sdk.createInnerAudioContext(
		JSON.stringify(create_options),
		JSON.stringify(properties),
		_track_oneshot(_on_inner_audio_operation),
		_track_persistent(_on_inner_audio_event))


func set_inner_audio_properties(properties: Dictionary = {}) -> void:
	if not _sdk:
		inner_audio_operation_result.emit("InnerAudioContext.setProperties", false, "", NOT_IN_RUNTIME)
		return
	_sdk.setInnerAudioProperties(JSON.stringify(properties), _track_oneshot(_on_inner_audio_operation))


func get_inner_audio_state() -> void:
	if not _sdk:
		inner_audio_operation_result.emit("InnerAudioContext.getState", false, "", NOT_IN_RUNTIME)
		return
	_sdk.getInnerAudioState(_track_oneshot(_on_inner_audio_operation))


func inner_audio_play() -> void:
	if not _sdk:
		inner_audio_operation_result.emit("InnerAudioContext.play", false, "", NOT_IN_RUNTIME)
		return
	_sdk.innerAudioPlay(_track_oneshot(_on_inner_audio_operation))


func inner_audio_pause() -> void:
	if not _sdk:
		inner_audio_operation_result.emit("InnerAudioContext.pause", false, "", NOT_IN_RUNTIME)
		return
	_sdk.innerAudioPause(_track_oneshot(_on_inner_audio_operation))


func inner_audio_stop() -> void:
	if not _sdk:
		inner_audio_operation_result.emit("InnerAudioContext.stop", false, "", NOT_IN_RUNTIME)
		return
	_sdk.innerAudioStop(_track_oneshot(_on_inner_audio_operation))


func inner_audio_seek(position: float) -> void:
	if not _sdk:
		inner_audio_operation_result.emit("InnerAudioContext.seek", false, "", NOT_IN_RUNTIME)
		return
	_sdk.innerAudioSeek(position, _track_oneshot(_on_inner_audio_operation))


func stop_inner_audio_listener(event_types: Array = []) -> void:
	if not _sdk:
		inner_audio_operation_result.emit("InnerAudioContext.off", false, "", NOT_IN_RUNTIME)
		return
	_sdk.stopInnerAudioListener(JSON.stringify(event_types), _track_oneshot(_on_inner_audio_operation))


func inner_audio_destroy() -> void:
	if not _sdk:
		inner_audio_operation_result.emit("InnerAudioContext.destroy", false, "", NOT_IN_RUNTIME)
		return
	_sdk.innerAudioDestroy(_track_oneshot(_on_inner_audio_operation))


func _on_inner_audio_operation(args: Array) -> void:
	inner_audio_operation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_inner_audio_event(args: Array) -> void:
	inner_audio_event.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


# ── Network Status ────────────────────────────────────────────────

func get_network_type() -> void:
	if not _sdk:
		network_type_received.emit("", "", NOT_IN_RUNTIME)
		return
	_sdk.getNetworkType(_track_oneshot(_on_network_type))


func _on_network_type(args: Array) -> void:
	network_type_received.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "",
		_s(args[2]) if args.size() > 2 else "")


func start_network_status_listener() -> void:
	if not _sdk:
		network_status_changed.emit(false, "", NOT_IN_RUNTIME)
		return
	if _network_listener_started:
		return
	_network_listener_started = true
	var ok := _b(_sdk.onNetworkStatusChange(_track_persistent(_on_network_status_changed)))
	if not ok:
		_network_listener_started = false
		network_status_changed.emit(false, "", "Network status listener is not supported")


func _on_network_status_changed(args: Array) -> void:
	network_status_changed.emit(
		_b(args[0]) if args.size() > 0 else false,
		_s(args[1]) if args.size() > 1 else "",
		_s(args[2]) if args.size() > 2 else "{}")


func stop_network_status_listener() -> bool:
	if not _sdk:
		return false
	_network_listener_started = false
	return _b(_sdk.offNetworkStatusChange())


# ── Sensors / Battery ─────────────────────────────────────────────

func start_accelerometer(interval: String = "normal") -> void:
	if not _sdk:
		sensor_started.emit("accelerometer", false, NOT_IN_RUNTIME)
		return
	_sdk.startAccelerometer(interval, _track_oneshot(_on_sensor_started), _get_accelerometer_change_cb())


func stop_accelerometer() -> void:
	if not _sdk:
		sensor_stopped.emit("accelerometer", false, NOT_IN_RUNTIME)
		return
	_sdk.stopAccelerometer(_track_oneshot(_on_sensor_stopped))


func start_gyroscope(interval: String = "normal") -> void:
	if not _sdk:
		sensor_started.emit("gyroscope", false, NOT_IN_RUNTIME)
		return
	_sdk.startGyroscope(interval, _track_oneshot(_on_sensor_started), _get_gyroscope_change_cb())


func stop_gyroscope() -> void:
	if not _sdk:
		sensor_stopped.emit("gyroscope", false, NOT_IN_RUNTIME)
		return
	_sdk.stopGyroscope(_track_oneshot(_on_sensor_stopped))


func start_compass() -> void:
	if not _sdk:
		sensor_started.emit("compass", false, NOT_IN_RUNTIME)
		return
	_sdk.startCompass(_track_oneshot(_on_sensor_started), _get_compass_change_cb())


func stop_compass() -> void:
	if not _sdk:
		sensor_stopped.emit("compass", false, NOT_IN_RUNTIME)
		return
	_sdk.stopCompass(_track_oneshot(_on_sensor_stopped))


func start_device_motion_listening(interval: String = "normal") -> void:
	if not _sdk:
		sensor_started.emit("deviceMotion", false, NOT_IN_RUNTIME)
		return
	_sdk.startDeviceMotionListening(interval, _track_oneshot(_on_sensor_started), _get_device_motion_change_cb())


func stop_device_motion_listening() -> void:
	if not _sdk:
		sensor_stopped.emit("deviceMotion", false, NOT_IN_RUNTIME)
		return
	_sdk.stopDeviceMotionListening(_track_oneshot(_on_sensor_stopped))


func get_battery_info() -> void:
	if not _sdk:
		battery_info_received.emit(0, false, "", NOT_IN_RUNTIME)
		return
	_sdk.getBatteryInfo(_track_oneshot(_on_battery_info))


func get_battery_info_sync() -> Dictionary:
	return _parse_json_object(_sdk.getBatteryInfoSync() if _sdk else null)


func _get_accelerometer_change_cb() -> JavaScriptObject:
	if _accelerometer_change_cb == null:
		_accelerometer_change_cb = _track_persistent(_on_accelerometer_changed)
	return _accelerometer_change_cb


func _get_gyroscope_change_cb() -> JavaScriptObject:
	if _gyroscope_change_cb == null:
		_gyroscope_change_cb = _track_persistent(_on_gyroscope_changed)
	return _gyroscope_change_cb


func _get_compass_change_cb() -> JavaScriptObject:
	if _compass_change_cb == null:
		_compass_change_cb = _track_persistent(_on_compass_changed)
	return _compass_change_cb


func _get_device_motion_change_cb() -> JavaScriptObject:
	if _device_motion_change_cb == null:
		_device_motion_change_cb = _track_persistent(_on_device_motion_changed)
	return _device_motion_change_cb


func _on_sensor_started(args: Array) -> void:
	sensor_started.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "")


func _on_sensor_stopped(args: Array) -> void:
	sensor_stopped.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "")


func _on_accelerometer_changed(args: Array) -> void:
	accelerometer_changed.emit(
		_f(args[0]) if args.size() > 0 else 0.0,
		_f(args[1]) if args.size() > 1 else 0.0,
		_f(args[2]) if args.size() > 2 else 0.0,
		_s(args[3]) if args.size() > 3 else "{}")


func _on_gyroscope_changed(args: Array) -> void:
	gyroscope_changed.emit(
		_f(args[0]) if args.size() > 0 else 0.0,
		_f(args[1]) if args.size() > 1 else 0.0,
		_f(args[2]) if args.size() > 2 else 0.0,
		_s(args[3]) if args.size() > 3 else "{}")


func _on_compass_changed(args: Array) -> void:
	compass_changed.emit(
		_f(args[0]) if args.size() > 0 else 0.0,
		args[1] if args.size() > 1 else "",
		_s(args[2]) if args.size() > 2 else "{}")


func _on_device_motion_changed(args: Array) -> void:
	device_motion_changed.emit(
		_f(args[0]) if args.size() > 0 else 0.0,
		_f(args[1]) if args.size() > 1 else 0.0,
		_f(args[2]) if args.size() > 2 else 0.0,
		_s(args[3]) if args.size() > 3 else "{}")


func _on_battery_info(args: Array) -> void:
	battery_info_received.emit(
		_i(args[0]) if args.size() > 0 else 0,
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


# ── Audio Interruption ────────────────────────────────────────────

func start_audio_interruption_listener() -> void:
	if not _sdk:
		audio_interruption.emit("begin", "{}", NOT_IN_RUNTIME)
		return
	if _audio_interruption_begin_listener_started and _audio_interruption_end_listener_started:
		return

	var callback := _get_audio_interruption_cb()
	if not _audio_interruption_begin_listener_started:
		_audio_interruption_begin_listener_started = _b(_sdk.onAudioInterruptionBegin(callback))
	if not _audio_interruption_end_listener_started:
		_audio_interruption_end_listener_started = _b(_sdk.onAudioInterruptionEnd(callback))
	if not _audio_interruption_begin_listener_started and not _audio_interruption_end_listener_started:
		audio_interruption.emit("begin", "{}", "Audio interruption listener is not supported")


func stop_audio_interruption_listener() -> bool:
	if not _sdk:
		return false
	var begin_ok := _b(_sdk.offAudioInterruptionBegin())
	var end_ok := _b(_sdk.offAudioInterruptionEnd())
	_audio_interruption_begin_listener_started = false
	_audio_interruption_end_listener_started = false
	return begin_ok or end_ok


func _get_audio_interruption_cb() -> JavaScriptObject:
	if _audio_interruption_cb == null:
		_audio_interruption_cb = _track_persistent(_on_audio_interruption)
	return _audio_interruption_cb


func _on_audio_interruption(args: Array) -> void:
	audio_interruption.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


# ── Theme / Performance ───────────────────────────────────────────

func start_theme_change_listener() -> void:
	if not _sdk:
		theme_changed.emit("", "{}", NOT_IN_RUNTIME)
		return
	if _theme_change_listener_started:
		return
	var ok := _b(_sdk.onThemeChange(_get_theme_change_cb()))
	_theme_change_listener_started = ok
	if not ok:
		theme_changed.emit("", "{}", "Theme change listener is not supported")


func stop_theme_change_listener() -> bool:
	if not _sdk:
		return false
	_theme_change_listener_started = false
	return _b(_sdk.offThemeChange())


func _get_theme_change_cb() -> JavaScriptObject:
	if _theme_change_cb == null:
		_theme_change_cb = _track_persistent(_on_theme_changed)
	return _theme_change_cb


func _on_theme_changed(args: Array) -> void:
	theme_changed.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


func get_performance_entries(entry_type: String = "") -> Array:
	return _parse_json_array(_sdk.getPerformanceEntries(entry_type) if _sdk else null)


func report_performance(id: int, value: float, dimensions: Variant = null) -> bool:
	if not _sdk:
		return false
	var dimensions_json := "" if dimensions == null else JSON.stringify(dimensions)
	return _b(_sdk.reportPerformance(id, value, dimensions_json))


# ── Mini Program Navigation / App Control ─────────────────────────

func navigate_to_mini_program(app_id: String = "", path: String = "", extra_data: Dictionary = {}, env_version: String = "release", short_link: String = "", no_relaunch_if_path_unchanged: bool = false) -> void:
	if not _sdk:
		mini_program_navigation_result.emit("navigateToMiniProgram", false, "", NOT_IN_RUNTIME)
		return
	_sdk.navigateToMiniProgram(
		app_id,
		path,
		JSON.stringify(extra_data),
		env_version,
		short_link,
		no_relaunch_if_path_unchanged,
		_track_oneshot(_on_mini_program_navigation_result))


func navigate_back_mini_program(extra_data: Dictionary = {}) -> void:
	if not _sdk:
		mini_program_navigation_result.emit("navigateBackMiniProgram", false, "", NOT_IN_RUNTIME)
		return
	_sdk.navigateBackMiniProgram(JSON.stringify(extra_data), _track_oneshot(_on_mini_program_navigation_result))


func exit_mini_program() -> void:
	if not _sdk:
		mini_program_navigation_result.emit("exitMiniProgram", false, "", NOT_IN_RUNTIME)
		return
	_sdk.exitMiniProgram(_track_oneshot(_on_mini_program_navigation_result))


func restart_mini_program(path: String) -> void:
	if not _sdk:
		mini_program_navigation_result.emit("restartMiniProgram", false, "", NOT_IN_RUNTIME)
		return
	_sdk.restartMiniProgram(path, _track_oneshot(_on_mini_program_navigation_result))


func _on_mini_program_navigation_result(args: Array) -> void:
	mini_program_navigation_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


# ── User Cloud Storage / Open Data Context ────────────────────────

func set_user_cloud_storage(kv_data: Dictionary) -> void:
	if not _sdk:
		cloud_storage_result.emit("setUserCloudStorage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.setUserCloudStorage(JSON.stringify(kv_data), _track_oneshot(_on_cloud_storage_result))


func remove_user_cloud_storage(key_list: Array) -> void:
	if not _sdk:
		cloud_storage_result.emit("removeUserCloudStorage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.removeUserCloudStorage(JSON.stringify(key_list), _track_oneshot(_on_cloud_storage_result))


func get_user_cloud_storage_keys() -> void:
	if not _sdk:
		cloud_storage_result.emit("getUserCloudStorageKeys", false, "", NOT_IN_RUNTIME)
		return
	_sdk.getUserCloudStorageKeys(_track_oneshot(_on_cloud_storage_result))


func get_user_cloud_storage(key_list: Array) -> void:
	if not _sdk:
		cloud_storage_result.emit("getUserCloudStorage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.getUserCloudStorage(JSON.stringify(key_list), _track_oneshot(_on_cloud_storage_result))


func get_friend_cloud_storage(key_list: Array) -> void:
	if not _sdk:
		cloud_storage_result.emit("getFriendCloudStorage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.getFriendCloudStorage(JSON.stringify(key_list), _track_oneshot(_on_cloud_storage_result))


func get_group_cloud_storage(key_list: Array, share_ticket: String = "", group_id: String = "") -> void:
	if not _sdk:
		cloud_storage_result.emit("getGroupCloudStorage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.getGroupCloudStorage(JSON.stringify(key_list), share_ticket, group_id, _track_oneshot(_on_cloud_storage_result))


func post_open_data_context_message(message: Dictionary, shared_canvas_mode: String = "offscreenCanvas") -> bool:
	if not _sdk:
		return false
	return _b(_sdk.postOpenDataContextMessage(JSON.stringify(message), shared_canvas_mode))


func _on_cloud_storage_result(args: Array) -> void:
	cloud_storage_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


# ── Customer Service / Subscribe Message ─────────────────────────

func open_customer_service_conversation(session_from: String = "", show_message_card: bool = false, send_message_title: String = "", send_message_path: String = "", send_message_img: String = "") -> void:
	if not _sdk:
		customer_service_result.emit("openCustomerServiceConversation", false, "", NOT_IN_RUNTIME)
		return
	_sdk.openCustomerServiceConversation(
		session_from,
		show_message_card,
		send_message_title,
		send_message_path,
		send_message_img,
		_track_oneshot(_on_customer_service_result))


func request_subscribe_message(tmpl_ids: Array) -> void:
	if not _sdk:
		subscribe_message_result.emit("requestSubscribeMessage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.requestSubscribeMessage(JSON.stringify(tmpl_ids), _track_oneshot(_on_subscribe_message_result))


func request_subscribe_system_message(msg_type_list: Array) -> void:
	if not _sdk:
		subscribe_message_result.emit("requestSubscribeSystemMessage", false, "", NOT_IN_RUNTIME)
		return
	_sdk.requestSubscribeSystemMessage(JSON.stringify(msg_type_list), _track_oneshot(_on_subscribe_message_result))


func _on_customer_service_result(args: Array) -> void:
	customer_service_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


func _on_subscribe_message_result(args: Array) -> void:
	subscribe_message_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


# ── Update Manager / Memory Warning ───────────────────────────────

func start_update_listener() -> void:
	if not _sdk:
		update_checked.emit(false, "{}", NOT_IN_RUNTIME)
		return
	if _update_listener_started:
		return
	var ok := _b(_sdk.startUpdateListener(_get_update_event_cb()))
	_update_listener_started = ok


func apply_update() -> bool:
	if not _sdk:
		return false
	return _b(_sdk.applyUpdate())


func _get_update_event_cb() -> JavaScriptObject:
	if _update_event_cb == null:
		_update_event_cb = _track_persistent(_on_update_event)
	return _update_event_cb


func _on_update_event(args: Array) -> void:
	var event_type := _s(args[0]) if args.size() > 0 else ""
	var has_update := _b(args[1]) if args.size() > 1 else false
	var data_json := _s(args[2]) if args.size() > 2 else "{}"
	var error := _s(args[3]) if args.size() > 3 else ""

	match event_type:
		"check":
			update_checked.emit(has_update, data_json, error)
		"ready":
			update_ready.emit(error)
		"failed":
			update_failed.emit(error)
		_:
			update_failed.emit(error if not error.is_empty() else "Unknown update event: %s" % event_type)


func start_memory_warning_listener() -> void:
	if not _sdk:
		memory_warning.emit(0, "{}", NOT_IN_RUNTIME)
		return
	if _memory_warning_listener_started:
		return
	var ok := _b(_sdk.onMemoryWarning(_get_memory_warning_cb()))
	_memory_warning_listener_started = ok
	if not ok:
		memory_warning.emit(0, "{}", "Memory warning listener is not supported")


func stop_memory_warning_listener() -> bool:
	if not _sdk:
		return false
	_memory_warning_listener_started = false
	return _b(_sdk.offMemoryWarning())


func _get_memory_warning_cb() -> JavaScriptObject:
	if _memory_warning_cb == null:
		_memory_warning_cb = _track_persistent(_on_memory_warning)
	return _memory_warning_cb


func _on_memory_warning(args: Array) -> void:
	memory_warning.emit(
		_i(args[0]) if args.size() > 0 else 0,
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


# ── Window / Runtime Error Events ─────────────────────────────────

func start_window_resize_listener() -> void:
	if not _sdk:
		window_resized.emit(0, 0, "{}", NOT_IN_RUNTIME)
		return
	if _window_resize_listener_started:
		return
	var ok := _b(_sdk.onWindowResize(_get_window_resize_cb()))
	_window_resize_listener_started = ok
	if not ok:
		window_resized.emit(0, 0, "{}", "Window resize listener is not supported")


func stop_window_resize_listener() -> bool:
	if not _sdk:
		return false
	_window_resize_listener_started = false
	return _b(_sdk.offWindowResize())


func _get_window_resize_cb() -> JavaScriptObject:
	if _window_resize_cb == null:
		_window_resize_cb = _track_persistent(_on_window_resized)
	return _window_resize_cb


func _on_window_resized(args: Array) -> void:
	window_resized.emit(
		_i(args[0]) if args.size() > 0 else 0,
		_i(args[1]) if args.size() > 1 else 0,
		_s(args[2]) if args.size() > 2 else "{}",
		_s(args[3]) if args.size() > 3 else "")


func start_unhandled_rejection_listener() -> void:
	if not _sdk:
		unhandled_rejection.emit("", "{}", NOT_IN_RUNTIME)
		return
	if _unhandled_rejection_listener_started:
		return
	var ok := _b(_sdk.onUnhandledRejection(_get_unhandled_rejection_cb()))
	_unhandled_rejection_listener_started = ok
	if not ok:
		unhandled_rejection.emit("", "{}", "Unhandled rejection listener is not supported")


func stop_unhandled_rejection_listener() -> bool:
	if not _sdk:
		return false
	_unhandled_rejection_listener_started = false
	return _b(_sdk.offUnhandledRejection())


func _get_unhandled_rejection_cb() -> JavaScriptObject:
	if _unhandled_rejection_cb == null:
		_unhandled_rejection_cb = _track_persistent(_on_unhandled_rejection)
	return _unhandled_rejection_cb


func _on_unhandled_rejection(args: Array) -> void:
	unhandled_rejection.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


# ── Screen Brightness / Capture / Recording ───────────────────────

func get_screen_brightness() -> void:
	if not _sdk:
		screen_brightness_received.emit(0.0, "", NOT_IN_RUNTIME)
		return
	_sdk.getScreenBrightness(_track_oneshot(_on_screen_brightness))


func _on_screen_brightness(args: Array) -> void:
	screen_brightness_received.emit(
		_f(args[0]) if args.size() > 0 else 0.0,
		_s(args[1]) if args.size() > 1 else "",
		_s(args[2]) if args.size() > 2 else "")


func set_screen_brightness(value: float) -> void:
	if not _sdk:
		screen_brightness_set.emit(value, false, NOT_IN_RUNTIME)
		return
	_sdk.setScreenBrightness(value, _track_oneshot(_on_screen_brightness_set))


func _on_screen_brightness_set(args: Array) -> void:
	screen_brightness_set.emit(
		_f(args[0]) if args.size() > 0 else 0.0,
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "")


func start_user_capture_screen_listener() -> void:
	if not _sdk:
		user_capture_screen.emit("{}", NOT_IN_RUNTIME)
		return
	if _user_capture_screen_listener_started:
		return
	var ok := _b(_sdk.onUserCaptureScreen(_get_user_capture_screen_cb()))
	_user_capture_screen_listener_started = ok
	if not ok:
		user_capture_screen.emit("{}", "User capture screen listener is not supported")


func stop_user_capture_screen_listener() -> bool:
	if not _sdk:
		return false
	_user_capture_screen_listener_started = false
	return _b(_sdk.offUserCaptureScreen())


func _get_user_capture_screen_cb() -> JavaScriptObject:
	if _user_capture_screen_cb == null:
		_user_capture_screen_cb = _track_persistent(_on_user_capture_screen)
	return _user_capture_screen_cb


func _on_user_capture_screen(args: Array) -> void:
	user_capture_screen.emit(
		_s(args[0]) if args.size() > 0 else "{}",
		_s(args[1]) if args.size() > 1 else "")


func get_screen_recording_state() -> void:
	if not _sdk:
		screen_recording_state_received.emit("", "", NOT_IN_RUNTIME)
		return
	_sdk.getScreenRecordingState(_track_oneshot(_on_screen_recording_state))


func _on_screen_recording_state(args: Array) -> void:
	screen_recording_state_received.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "",
		_s(args[2]) if args.size() > 2 else "")


func start_screen_recording_state_listener() -> void:
	if not _sdk:
		screen_recording_state_changed.emit("", "{}", NOT_IN_RUNTIME)
		return
	if _screen_recording_state_listener_started:
		return
	var ok := _b(_sdk.onScreenRecordingStateChanged(_get_screen_recording_state_cb()))
	_screen_recording_state_listener_started = ok
	if not ok:
		screen_recording_state_changed.emit("", "{}", "Screen recording state listener is not supported")


func stop_screen_recording_state_listener() -> bool:
	if not _sdk:
		return false
	_screen_recording_state_listener_started = false
	return _b(_sdk.offScreenRecordingStateChanged())


func _get_screen_recording_state_cb() -> JavaScriptObject:
	if _screen_recording_state_cb == null:
		_screen_recording_state_cb = _track_persistent(_on_screen_recording_state_changed)
	return _screen_recording_state_cb


func _on_screen_recording_state_changed(args: Array) -> void:
	screen_recording_state_changed.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "{}",
		_s(args[2]) if args.size() > 2 else "")


func set_visual_effect_on_capture(effect: String = "none") -> void:
	if not _sdk:
		visual_effect_on_capture_set.emit(effect, false, NOT_IN_RUNTIME)
		return
	_sdk.setVisualEffectOnCapture(effect, _track_oneshot(_on_visual_effect_on_capture_set))


func _on_visual_effect_on_capture_set(args: Array) -> void:
	visual_effect_on_capture_set.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "")


# ── System Info ───────────────────────────────────────────────────

func can_i_use(schema: String) -> bool:
	if not _sdk:
		return false
	return _b(_sdk.canIUse(schema))


func get_device_info() -> Dictionary:
	return _parse_json_object(_sdk.getDeviceInfo() if _sdk else null)


func get_app_base_info() -> Dictionary:
	return _parse_json_object(_sdk.getAppBaseInfo() if _sdk else null)


func get_system_setting() -> Dictionary:
	return _parse_json_object(_sdk.getSystemSetting() if _sdk else null)


func get_app_authorize_setting() -> Dictionary:
	return _parse_json_object(_sdk.getAppAuthorizeSetting() if _sdk else null)


func get_system_info() -> Dictionary:
	return _parse_json_object(_sdk.getSystemInfo() if _sdk else null)


func get_launch_options() -> Dictionary:
	return _parse_json_object(_sdk.getLaunchOptions() if _sdk else null)


func get_window_info() -> Dictionary:
	return _parse_json_object(_sdk.getWindowInfo() if _sdk else null)


func get_menu_button_rect() -> Dictionary:
	return _parse_json_object(_sdk.getMenuButtonRect() if _sdk else null)


static func _parse_json_object(json_str: Variant) -> Dictionary:
	if json_str == null:
		return {}
	var parsed: Variant = JSON.parse_string(str(json_str))
	return parsed if parsed is Dictionary else {}


# ── Generic platform API bridge ───────────────────────────────────

## Calls a platform API that does not yet have a typed wrapper.
##
## `params` maps to the usual wx.* options object. For sync/positional APIs,
## pass `{ "_args": [...] }`, for example:
## `call_api("getStorageSync", {"_args": ["level"]})`.
func call_api(api_name: String, params: Dictionary = {}) -> void:
	if not _sdk:
		generic_api_result.emit(api_name, false, "", NOT_IN_RUNTIME)
		return
	_sdk.callApi(api_name, JSON.stringify(params), _track_oneshot(_on_generic_api_result))


func _on_generic_api_result(args: Array) -> void:
	generic_api_result.emit(
		_s(args[0]) if args.size() > 0 else "",
		_b(args[1]) if args.size() > 1 else false,
		_s(args[2]) if args.size() > 2 else "",
		_s(args[3]) if args.size() > 3 else "")


# ── Lifecycle ─────────────────────────────────────────────────────

func _setup_lifecycle() -> void:
	_sdk.onAppShow(_track_persistent(_on_app_show))
	_sdk.onAppHide(_track_persistent(_on_app_hide))
	_sdk.onAppError(_track_persistent(_on_app_error))


func _on_app_show(args: Array) -> void:
	app_shown.emit(_s(args[0]) if args.size() > 0 else "{}")


func _on_app_hide(_args: Array) -> void:
	app_hidden.emit()


func _on_app_error(args: Array) -> void:
	app_error.emit(_s(args[0]) if args.size() > 0 else "")


# ── Clipboard ─────────────────────────────────────────────────────

func set_clipboard(data: String) -> void:
	if _sdk:
		_sdk.setClipboard(data)


func get_clipboard() -> void:
	if not _sdk:
		clipboard_received.emit("", NOT_IN_RUNTIME)
		return
	_sdk.getClipboard(_track_oneshot(_on_clipboard))


func _on_clipboard(args: Array) -> void:
	clipboard_received.emit(
		_s(args[0]) if args.size() > 0 else "",
		_s(args[1]) if args.size() > 1 else "")


# ── Screen ────────────────────────────────────────────────────────

func set_keep_screen_on(keep_on: bool) -> void:
	if _sdk:
		_sdk.setKeepScreenOn(keep_on)


# ── Toast / Modal (platform native UI) ────────────────────────────

## icon: "success" | "error" | "loading" | "none"
func show_toast(title: String, icon: String = "none", duration_ms: int = 1500) -> void:
	if _sdk:
		_sdk.showToast(title, icon, duration_ms)


func show_modal(title: String, content: String) -> void:
	if not _sdk:
		modal_result.emit(false)
		return
	_sdk.showModal(title, content, _track_oneshot(_on_modal))


func _on_modal(args: Array) -> void:
	modal_result.emit(_b(args[0]) if args.size() > 0 else false)


func show_loading(title: String = "Loading...") -> void:
	if _sdk:
		_sdk.showLoading(title)


func hide_loading() -> void:
	if _sdk:
		_sdk.hideLoading()
