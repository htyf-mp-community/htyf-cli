extends Node
class_name _HtyfSdk

## Godot 发往 RN 的请求：通过 ipcMain 发送 JSON 字符串，格式 { "id": "可选请求id", "type": "方法名", "payload": {} }
## RN 处理后会通过 emitToGodot 回传，本节点发出 ipcResponse 信号，格式 { "id", "type", "success": bool, "payload"?, "error"? }
## 排查链路建议：
## 1) 先看 call_rn 是否发出（带 id/type） -> 2) 看 RN 是否回传 emitToGodot -> 3) 看 _on_ipc_response 是否命中 pending 回调。
signal ipcMain(message: String)
signal ipcResponse(message: String)

var _pending_callbacks: Dictionary = {}
var _ipc_response_connected: bool = false
var _isReady: bool = false
var _is_dev_mode: bool = false
# 统一日志前缀，方便在控制台快速过滤 SDK 输出。
const LOG_TAG := "[HTYF_SDK]"
var _menu_button_bounding_client_rect: Dictionary = {
	"top" = 0,
	"right" = 0,
	"bottom" = 0,
	"left" = 0,
	"width" = 0,
	"height" = 0
}

func set_dev_mode(is_dev_mode: bool) -> void:
	_is_dev_mode = is_dev_mode

# 示例：log("message", "warn")
## level 可选：warn | error
func log(message: Variant, level: String = "warn") -> void:
	var message_str: String = ""
	if typeof(message) == TYPE_DICTIONARY or typeof(message) == TYPE_ARRAY:
		message_str = JSON.stringify(message)
	else:
		message_str = str(message)
	print(LOG_TAG + " [ " + level + " ]: " + message_str)
	call_rn("__log", { "message": message_str, "level": level })


func _ready() -> void:
	_isReady = false
	# 只连接一次：让所有 call_rn 都能通过 id 匹配回调
	if _ipc_response_connected:
		return
	_ipc_response_connected = true
	ipcResponse.connect(_on_ipc_response)
	if _is_dev_mode:
		self.log("ipcResponse connected", "debug")

func _on_ipc_response(message: String) -> void:
	# message 是 RN 回传的 JSON 字符串
	var json := JSON.new()
	var err := json.parse(message)
	if err != OK:
		if _is_dev_mode:
			call_show_modal("error", "parse json error: " + message)
		return
	var data: Dictionary = json.get_data()
	if _is_dev_mode:
		self.log({ "type": "ipcResponse parsed", "data": data }, "debug")
	if typeof(data) != TYPE_DICTIONARY:
		if _is_dev_mode:
			call_show_modal("error", "data is not a dictionary: " + message)	
		return
	# 宿主主动推送：无 id，不走 pending 回调（嵌入 Godot 时系统不会把前后台事件交给 _notification）
	if str(data.get("type", "")) == "lifecycle":
		var ev: int = int(data.get("event", 2017))
		if _host_lifecycle_callback.is_valid():
			_host_lifecycle_callback.call(ev)
		return
	if str(data.get("type", "")) == "isReady":
		var ev: int = int(data.get("event", false))
		_isReady = bool(ev)
		self.log("  ")
		self.log("========= HTYF READY =========")
		self.log("  ")
		call_get_menu_button_bounding_client_rect( 
			func(_data: Dictionary):
				self.log(_data)
				pass
		)
		return
	var id: String = str(data.get("id", ""))
	if id == "":
		if _is_dev_mode:
			call_show_modal("error", "id is empty: " + message)
			self.log({ "type": "ipcResponse missing id", "raw": message }, "warn")
		return
	if !_pending_callbacks.has(id):
		if _is_dev_mode:
			self.log({ "type": "callback not found", "id": id, "response": data }, "warn")
		return
	var cb: Callable = _pending_callbacks[id]
	_pending_callbacks.erase(id)
	if cb.is_valid():
		cb.call(data)

# 宿主生命周期回调 参数为what与_notification的参数对齐
var _host_lifecycle_callback: Callable = func(what: int):
	if _is_dev_mode:
		self.log("host_lifecycle default callback: " + str(what))
	pass
# 设置宿主生命周期回调
func set_host_lifecycle_callback(c: Callable = Callable()) -> void:
	_host_lifecycle_callback = func(what: int):
		if _is_dev_mode:
			self.log("host_lifecycle: " + str(what))
		if c.is_valid():
			c.call(what)

# 宿主生命周期回调
func _notification(what: int) -> void:
	if _host_lifecycle_callback.is_valid():
		_host_lifecycle_callback.call(what)

## RN 调用此方法传入一个 Callable，Godot 执行 c.call() 取得返回值（RN 的响应 JSON），并发出 ipcResponse 供业务层使用
func emitToGodot(c: Callable) -> void:
	var result: Variant = c.call()
	if result != null and str(result).length() > 0:
		ipcResponse.emit(str(result))
		

## 便捷方法：向 RN 发起 SDK 调用。type 为方法名，payload 为可选参数字典。
## 业务层连接 ipcResponse 信号，根据返回 JSON 的 id 或 type 匹配本次调用结果。
## 支持的 type 示例：openQR, showToast, showModal, getClipboardString, setClipboardString, openBrowser, getNetworkState, triggerHaptic 等；
## 也可以直接传 SDKFuncs 上的其它方法名，并通过 payload.args（数组）传参。
func call_rn(type: String, payload: Dictionary = {}, on_result: Callable = Callable()) -> String:
	if !_isReady:
		print("SDK not ready")
		return ""
	var id := str(type + "_" + str(Time.get_ticks_msec()) + "_" + str(randi()))
	var msg := { "id": id, "type": type, "payload": payload }
	var json_str: String = JSON.stringify(msg)
	var base64 = Marshalls.raw_to_base64(json_str.to_utf8_buffer())

	# 注册回调（支持并发）：等 RN 回传带相同 id 的 ipcResponse
	if on_result.is_valid():
		_pending_callbacks[id] = on_result

	# 开发模式下记录出站请求，排查“是否真的发出请求”与“id 是否对应”。
	if _is_dev_mode:
		self.log({ "type": "call_rn send", "id": id, "method": type, "payload": payload }, "debug")

	ipcMain.emit(base64)
	return id

## 示例：打开扫码
## on_result 回调签名约定：func _cb(result: String) -> void
func call_open_qr(on_result: Callable = Callable()) -> void:
	call_rn(
		"openQR",
		{},
		func (data: Dictionary):
			if data.get("success", false) == true:
				var result: String = data.get("payload").get("data", "")
				on_result.call(result)
			# 失败时也把 error 透传出去，避免 Godot 侧“无回调”
			else:
				var error: String = data.get("error", "")
				on_result.call(error)
	)

## 示例：显示 Toast（type 可选：success | alert | error | loading）
func call_show_toast(title: String, description: String = "", toast_type: String = "success") -> void:
	call_rn("showToast", { "title": title, "description": description, "type": toast_type })

## 示例：显示弹窗
func call_show_modal(title: String, description: String, confirm_text: String = "确定", cancel_text: String = "取消") -> void:
	call_rn("showModal", { "title": title, "description": description, "confirmText": confirm_text, "cancelText": cancel_text })

## 示例：获取剪贴板
func call_get_clipboard() -> void:
	call_rn("getClipboardString", {})

## 示例：设置剪贴板
func call_set_clipboard(text: String) -> void:
	call_rn("setClipboardString", { "text": text })

## 示例：打开浏览器
func call_open_browser(url: String) -> void:
	call_rn("openBrowser", { "url": url })

## 示例：获取网络状态
func call_get_network_state() -> void:
	call_rn("getNetworkState", {})

## 示例：触觉反馈
func call_trigger_haptic(haptic_type: String = "impactMedium") -> void:
	call_rn("triggerHaptic", { "type": haptic_type })

## 示例：关闭应用
func call_close_app() -> void:
	call_rn("closeApp", {})

## 示例：展示激励广告
## on_result 回调签名：func _cb(data: Dictionary) -> void
## data 结构：{ "success": bool, "payload": any, "error": String }
func call_show_rewarded_ad(on_result: Callable = Callable()) -> void:
	call_rn(
		"showRewardedAd",
		{},
		func (data: Dictionary):
			if on_result.is_valid():
				on_result.call(data)
	)

## 示例：展示插页广告
## options 可选，透传给 RN 侧 showInterstitialAd(options)
## on_result 回调签名：func _cb(data: Dictionary) -> void
func call_show_interstitial_ad(options: Dictionary = {}, on_result: Callable = Callable()) -> void:
	call_rn(
		"showInterstitialAd",
		{ "options": options },
		func (data: Dictionary):
			if on_result.is_valid():
				on_result.call(data)
	)

## 示例：获取菜单按钮边界矩形
## on_result 回调签名约定：func _cb(result: Dictionary) -> void
func call_get_menu_button_bounding_client_rect(on_result: Callable = Callable()) -> void:
	# 先同步返回缓存值，避免首次渲染时 UI 等待异步结果导致抖动。
	on_result.call(_menu_button_bounding_client_rect)
	call_rn(
		"getMenuButtonBoundingClientRect",
		{},
		func (data: Dictionary):
			if data.get("success", false) == true:
				var result: Dictionary = data.get("payload", {})
				var rect: Dictionary = {
					"top": result.get("top", 0),
					"right": result.get("right", 0),
					"bottom": result.get("bottom", 0),
					"left": result.get("left", 0),
					"width": result.get("width", 0),
					"height": result.get("height", 0)
				}
				_menu_button_bounding_client_rect = rect
				if _is_dev_mode:
					self.log({ "type": "menu rect updated", "rect": _menu_button_bounding_client_rect }, "debug")
				if on_result.is_valid():
					on_result.call(_menu_button_bounding_client_rect)
			else:
				if _is_dev_mode:
					self.log({ "type": "menu rect failed", "data": data }, "warn")
				if on_result.is_valid():
					on_result.call({ "top": 0, "right": 0, "bottom": 0, "left": 0, "width": 0, "height": 0 })
	)
	
