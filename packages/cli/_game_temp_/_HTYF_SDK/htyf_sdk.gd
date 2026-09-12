extends Node
class_name _HtyfSdk

## Godot 发往 RN 的请求：通过 ipcMain 发送 JSON 字符串，格式 { "id": "可选请求id", "type": "方法名", "payload": {} }
## RN 处理后会通过 emitToGodot 回传，本节点发出 ipcResponse 信号，格式 { "id", "type", "success": bool, "payload"?, "error"? }
## 排查链路建议：
## 1) 先看 call_rn 是否发出（带 id/type） -> 2) 看 RN 是否回传 emitToGodot -> 3) 看 _on_ipc_response 是否命中 pending 回调。
signal ipcMain(message: String)
signal ipcResponse(message: String)
signal host_layout_changed(snapshot: Dictionary)
## 已转换为根 viewport 坐标；只在矩形或 ready 状态变化时通知。
signal menu_button_rect_changed(result: Dictionary)
## 本地 AI 流式事件：started | delta | completed | cancelled | error。
signal ai_event(event: Dictionary)

var _pending_callbacks: Dictionary = {}
var _ipc_response_connected: bool = false
var _isReady: bool = false
var _is_dev_mode: bool = false
const SAVE_FILE_PATH = "user://save_game.json"
# 统一日志前缀，方便在控制台快速过滤 SDK 输出。
const LOG_TAG := "[HTYF_SDK]"
var _menu_button_bounding_client_rect: Dictionary = {
    "top" = 0,
    "right" = 0,
    "bottom" = 0,
    "left" = 0,
    "width" = 0,
    "height" = 0,
    "windowWidth" = 0,
    "windowHeight" = 0,
    "pixelRatio" = 1
}
var _window_info: Dictionary = {}
var _host_layout: Dictionary = {}
var _menu_watchers: Dictionary = {}
var _menu_watch_id := 0
var _last_menu_result: Dictionary = {}

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
    process_mode = Node.PROCESS_MODE_ALWAYS
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
    if str(data.get("type", "")) == "hostLayoutChanged":
        var snapshot: Dictionary = data.get("payload", {})
        _accept_host_layout(snapshot)
        return
    if str(data.get("type", "")) == "aiEvent":
        var ai_payload: Variant = data.get("payload", {})
        if typeof(ai_payload) == TYPE_DICTIONARY:
            ai_event.emit(ai_payload)
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
        call_get_window_info()
        call_get_host_layout()
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
## 支持的 type 示例：openQR, showToast, showModal, getClipboardString, setClipboardString, openBrowser, getNetworkState, triggerHaptic, activateKeepAwake, deactivateKeepAwake 等；
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

## 示例：申请屏幕常亮（引用计数；全部释放后才允许休眠）
func call_activate_keep_awake() -> void:
    call_rn("activateKeepAwake", {})

## 示例：释放一次屏幕常亮申请
func call_deactivate_keep_awake() -> void:
    call_rn("deactivateKeepAwake", {})

## 示例：关闭应用
func call_close_app() -> void:
    call_rn("closeApp", {})

## 一次性本地 AI 问答。options 至少包含 prompt；可选 sessionId、systemPrompt、generation、timeoutMs。
## on_result 收到统一响应：{ success, payload?, error? }。
func call_ask_ai(options: Dictionary, on_result: Callable = Callable()) -> String:
    return call_rn("askAI", options, on_result)

## 启动流式本地 AI 问答。成功后 payload 含 requestId；token 及完成事件由 ai_event 信号推送。
func call_start_ai(options: Dictionary, on_result: Callable = Callable()) -> String:
    return call_rn("startAI", options, on_result)

## 取消运行中或排队中的 AI 请求。
func call_cancel_ai(request_id: String, on_result: Callable = Callable()) -> String:
    return call_rn("cancelAI", { "requestId": request_id }, on_result)

## 释放指定 AI 会话在宿主中的临时上下文。
func call_close_ai_session(session_id: String, on_result: Callable = Callable()) -> String:
    return call_rn("closeAISession", { "sessionId": session_id }, on_result)

## 获取 AI 可用、就绪、忙碌状态及当前模型名称。
func call_get_ai_status(on_result: Callable = Callable()) -> String:
    return call_rn("getAIStatus", {}, on_result)

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
                    "height": result.get("height", 0),
                    "windowWidth": result.get("windowWidth", 0),
                    "windowHeight": result.get("windowHeight", 0),
                    "pixelRatio": result.get("pixelRatio", 1)
                }
                _menu_button_bounding_client_rect = rect
                if _is_dev_mode:
                    self.log({ "type": "menu rect updated", "rect": _menu_button_bounding_client_rect }, "debug")
                if on_result.is_valid():
                    on_result.call(get_menu_button_bounding_client_rect_sync().get("rect", {}))
            else:
                if _is_dev_mode:
                    self.log({ "type": "menu rect failed", "data": data }, "warn")
                if on_result.is_valid():
                    on_result.call(data)
    )

## 同步读取最近一次成功缓存。首次异步请求完成前 ready=false。
func get_menu_button_bounding_client_rect_sync() -> Dictionary:
    # RN 的 capsule 和 surface 都来自 measureInWindow，单位相同（逻辑点）。
    # 使用最新布局还原窗口坐标，避免旋转或安全区变化后一直返回首帧缓存。
    var surface: Dictionary = _host_layout.get("surface", {})
    var capsule: Dictionary = _host_layout.get("capsule", {})
    if float(surface.get("width", 0)) > 0.0 and float(surface.get("height", 0)) > 0.0 and !capsule.is_empty():
        var left := float(surface.get("left", 0)) + float(capsule.get("left", 0)) * float(surface.width)
        var top := float(surface.get("top", 0)) + float(capsule.get("top", 0)) * float(surface.height)
        var width := float(capsule.get("width", 0)) * float(surface.width)
        var height := float(capsule.get("height", 0)) * float(surface.height)
        _menu_button_bounding_client_rect.merge({
            "left": left, "top": top, "right": left + width, "bottom": top + height,
            "width": width, "height": height
        }, true)
    var width: float = float(_menu_button_bounding_client_rect.get("width", 0))
    var height: float = float(_menu_button_bounding_client_rect.get("height", 0))
    var ready: bool = width > 0.0 and height > 0.0
    return { "ready": ready, "rect": _menu_button_bounding_client_rect.duplicate(true) }

## 获取宿主窗口信息，字段语义与微信小游戏 wx.getWindowInfo() 一致。
func call_get_window_info(on_result: Callable = Callable()) -> void:
    call_rn(
        "getWindowInfo",
        {},
        func(data: Dictionary):
            if data.get("success", false) == true:
                _window_info = data.get("payload", {}).duplicate(true)
                if on_result.is_valid():
                    on_result.call(_window_info.duplicate(true))
            elif on_result.is_valid():
                on_result.call(data)
    )

## 同步读取最近一次成功缓存。首次异步请求完成前 ready=false。
func get_window_info_sync() -> Dictionary:
    var ready := float(_window_info.get("windowWidth", 0)) > 0.0 and float(_window_info.get("windowHeight", 0)) > 0.0
    return { "ready": ready, "info": _window_info.duplicate(true) }

## 拉取归一化宿主布局；正常情况下 RN 会通过 host_layout_changed 主动推送更新。
func call_get_host_layout(on_result: Callable = Callable()) -> void:
    call_rn(
        "getHostLayout",
        {},
        func(data: Dictionary):
            if data.get("success", false) == true:
                var snapshot: Dictionary = data.get("payload", {})
                _accept_host_layout(snapshot)
                if on_result.is_valid():
                    on_result.call(_host_layout.duplicate(true))
            elif on_result.is_valid():
                on_result.call(data)
    )

# 异步拉取和主动推送使用同一 revision 门禁，避免迟到响应覆盖新布局。
func _accept_host_layout(snapshot: Dictionary) -> void:
    if int(snapshot.get("revision", 0)) < int(_host_layout.get("revision", 0)):
        return
    _host_layout = snapshot.duplicate(true)
    get_menu_button_bounding_client_rect_sync()
    host_layout_changed.emit(_host_layout.duplicate(true))
    _refresh_menu_rect_watchers()


## 订阅已计算的矩形，立即回调当前状态，返回取消订阅 Callable。
## target 为空时为根 viewport 坐标；传入 Control/Node2D 时为该节点的本地坐标。
## 旋转、窗口缩放、CanvasLayer/父节点变换均由 SDK 跟踪，无需调用方轮询。
func watch_menu_button_rect(on_changed: Callable, target: CanvasItem = null) -> Callable:
    if !on_changed.is_valid():
        return Callable()
    _menu_watch_id += 1
    var id := _menu_watch_id
    var result := get_menu_button_rect_for_control(target) if target != null else get_menu_button_rect_for_viewport()
    _menu_watchers[id] = {
        "callback": on_changed, "target": weakref(target) if target != null else null,
        "last": result.duplicate(true)
    }
    on_changed.call(result.duplicate(true))
    return _unwatch_menu_button_rect.bind(id)


func _unwatch_menu_button_rect(id: int) -> void:
    _menu_watchers.erase(id)


func _same_menu_result(a: Dictionary, b: Dictionary) -> bool:
    return a.get("ready") == b.get("ready") and a.get("error") == b.get("error") and a.get("rect") == b.get("rect")


func _process(_delta: float) -> void:
    # 不发 RN 测量请求；只对有订阅的布局检查本地渲染变换。
    if !_menu_watchers.is_empty() or menu_button_rect_changed.has_connections():
        _refresh_menu_rect_watchers()


func _refresh_menu_rect_watchers() -> void:
    var viewport_result := get_menu_button_rect_for_viewport()
    if !_same_menu_result(_last_menu_result, viewport_result):
        _last_menu_result = viewport_result.duplicate(true)
        menu_button_rect_changed.emit(viewport_result.duplicate(true))
    for id in _menu_watchers.keys():
        if !_menu_watchers.has(id):
            continue
        var watcher: Dictionary = _menu_watchers[id]
        var callback: Callable = watcher.callback
        var target: CanvasItem = watcher.target.get_ref() if watcher.target != null else null
        if !callback.is_valid() or (watcher.target != null and target == null):
            _menu_watchers.erase(id)
            continue
        var result := get_menu_button_rect_for_control(target) if target != null else viewport_result
        if !_same_menu_result(watcher.last, result):
            watcher.last = result.duplicate(true)
            callback.call(result.duplicate(true))


## 返回目标节点本地坐标中的轴对齐包围盒。旋转节点时包含胶囊的全部四角。
## target 应传入用于放置 UI 的父 Control；不要把待移动的控件本身传入订阅。
func get_menu_button_rect_for_control(target: CanvasItem) -> Dictionary:
    if !is_instance_valid(target) or !target.is_inside_tree():
        return {"ready": false, "error": "MENU_BUTTON_TARGET_UNAVAILABLE"}
    if target.get_viewport() != get_tree().root:
        return {"ready": false, "error": "MENU_BUTTON_ROOT_VIEWPORT_REQUIRED"}
    var result := get_menu_button_rect_for_viewport()
    if !result.get("ready", false):
        return result
    var transform := target.get_global_transform_with_canvas()
    if is_zero_approx(transform.determinant()):
        return {"ready": false, "error": "MENU_BUTTON_TARGET_TRANSFORM_INVALID"}
    var rect: Dictionary = result.rect
    var local := transform.affine_inverse() * Rect2(float(rect.left), float(rect.top), float(rect.width), float(rect.height))
    result.rect = {"left": local.position.x, "top": local.position.y, "right": local.end.x, "bottom": local.end.y, "width": local.size.x, "height": local.size.y}
    return result


func get_host_layout_sync() -> Dictionary:
    return { "ready": !_host_layout.is_empty(), "layout": _host_layout.duplicate(true) }

## 获取当前 Godot viewport 中的胶囊矩形，包含实际拉伸与留黑边偏移。
func get_host_capsule_rect() -> Rect2:
    var result := get_menu_button_rect_for_viewport()
    if !result.get("ready", false):
        return Rect2()
    var rect: Dictionary = result.rect
    return Rect2(float(rect.left), float(rect.top), float(rect.width), float(rect.height))

## RN 窗口逻辑坐标 -> Godot View 局部坐标 -> Godot viewport 坐标。
## 默认 auto 使用引擎实际变换，支持项目的 stretch/aspect/content_scale_factor。
## 显式 design_size 时可选 contain（默认）、cover、stretch，用于自定义设计空间。
## RN 坐标不直接乘 pixelRatio；以实际 Godot 窗口尺寸 / RN surface 尺寸换算。
func get_menu_button_rect_for_viewport(
    design_size: Vector2 = Vector2.ZERO,
    stretch_mode: String = "auto"
) -> Dictionary:
    var source := get_menu_button_bounding_client_rect_sync()
    if !source.get("ready", false):
        return source
    var rect: Dictionary = source.get("rect", {})
    var surface: Dictionary = _host_layout.get("surface", {})
    var host_size := Vector2(float(surface.get("width", 0)), float(surface.get("height", 0)))
    if host_size.x <= 0.0 or host_size.y <= 0.0:
        # 全窗口大小无法确定嵌入 View 的原点和尺寸，不再静默猜测。
        return { "ready": false, "error": "MENU_BUTTON_SURFACE_UNAVAILABLE", "rect": rect }
    var local_rect := Rect2(
        Vector2(float(rect.get("left", 0)), float(rect.get("top", 0))) - Vector2(float(surface.get("left", 0)), float(surface.get("top", 0))),
        Vector2(float(rect.get("width", 0)), float(rect.get("height", 0)))
    )
    var converted_rect: Rect2
    if stretch_mode == "auto" and (design_size.x <= 0.0 or design_size.y <= 0.0):
        var viewport := get_viewport()
        # 宿主 surface 对应根 Window；SubViewport 没有唯一的宿主映射。
        if viewport != get_tree().root:
            return { "ready": false, "error": "MENU_BUTTON_ROOT_VIEWPORT_REQUIRED", "rect": rect }
        var window_size := Vector2(get_tree().root.size)
        if window_size.x <= 0.0 or window_size.y <= 0.0:
            return { "ready": false, "error": "MENU_BUTTON_WINDOW_SIZE_UNAVAILABLE", "rect": rect }
        var to_pixels := Transform2D.IDENTITY.scaled(window_size / host_size)
        # final_transform 同时包含 viewport 拉伸和 Window 留黑边偏移。
        converted_rect = viewport.get_final_transform().affine_inverse() * (to_pixels * local_rect)
    else:
        if design_size.x <= 0.0 or design_size.y <= 0.0:
            design_size = get_viewport().get_visible_rect().size
        if design_size.x <= 0.0 or design_size.y <= 0.0:
            return { "ready": false, "error": "MENU_BUTTON_DESIGN_SIZE_UNAVAILABLE", "rect": rect }
        var scale := host_size / design_size
        var offset := Vector2.ZERO
        if stretch_mode == "auto" or stretch_mode == "contain" or stretch_mode == "cover":
            var uniform_scale := maxf(scale.x, scale.y) if stretch_mode == "cover" else minf(scale.x, scale.y)
            scale = Vector2(uniform_scale, uniform_scale)
            offset = (host_size - design_size * uniform_scale) * 0.5
        elif stretch_mode != "stretch":
            return { "ready": false, "error": "INVALID_STRETCH_MODE", "rect": rect }
        converted_rect = Rect2((local_rect.position - offset) / scale, local_rect.size / scale)

    return { "ready": true, "rect": {
        "left": converted_rect.position.x, "top": converted_rect.position.y,
        "right": converted_rect.end.x, "bottom": converted_rect.end.y,
        "width": converted_rect.size.x, "height": converted_rect.size.y
    }, "source": rect }

# 示例：设置存储
func setStorage(options: Dictionary, on_result: Callable = Callable()):
    var key = str(options.get("key", ""))
    var data = str(options.get("data", ""))
    if key != "":
        call_rn("setStorage", { "key": key, "data": data },
            func (_data: Dictionary):
                if _data.get("success", false) == true:
                    if on_result.is_valid():
                        on_result.call({ "success": true, "payload": _data.get("payload", "") })
                else:
                    self.log("setStorage failed", "warn")
                    if on_result.is_valid():
                        on_result.call({ "success": false, "error": data.get("error", "") })
        )
    else:
        self.log("setStorage key is empty", "warn")
        if on_result.is_valid():
            on_result.call({ "success": false, "error": "key is empty" })

# 示例：获取存储
func getStorage(key: String, on_result: Callable = Callable()):
    if key != "":
        call_rn("getStorage", { "key": key },
            func (data: Dictionary):
                if data.get("success", false) == true:
                    var result: Dictionary = data.get("payload", {})
                    if on_result.is_valid():
                        on_result.call(result)
                else:
                    self.log("getStorage failed", "warn")
                    if on_result.is_valid():
                        on_result.call({ "success": false, "error": data.get("error", "") })
        )
    else:
        self.log("getStorage key is empty", "warn")
        if on_result.is_valid():
            on_result.call({ "success": false, "error": "key is empty" })
