extends CanvasLayer

## RNInterface API 演示：UI 在 main.tscn 静态配置，此脚本仅做事件绑定

var _result_dialog: AcceptDialog

func _ready() -> void:
	HtyfSdk.set_host_lifecycle_callback(
		func (what: int): 
			if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
				#HtyfSdk.log("进入后台，暂停游戏")
				HtyfSdk.call_show_modal("进入后台", "暂停游戏")
			if what == NOTIFICATION_APPLICATION_FOCUS_IN:
				#HtyfSdk.log("回到前台，恢复游戏")
				HtyfSdk.call_show_modal("回到前台", "恢复游戏")
			
	)
	_result_dialog = AcceptDialog.new()
	_result_dialog.title = "RN 返回"
	add_child(_result_dialog)
	
	# HtyfSdk.ipcResponse.connect(_on_ipc_response)
	_bind_buttons()

func _bind_button(path: String, callback: Callable) -> void:
	var btn := get_node_or_null(path) as Button
	if btn == null:
		push_warning("找不到按钮节点: " + path)
		return
	btn.pressed.connect(callback)
	_wire_button_feedback(btn)

func _wire_button_feedback(btn: Button) -> void:
	btn.button_down.connect(func():
		var tw := create_tween()
		tw.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
		tw.tween_property(btn, "scale", Vector2(0.97, 0.97), 0.06)
	)
	btn.button_up.connect(func():
		var tw := create_tween()
		tw.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
		tw.tween_property(btn, "scale", Vector2.ONE, 0.12)
	)

func _bind_buttons() -> void:
	_bind_button("Scroll/Main/OpenQRButton", _on_open_qr)
	_bind_button("Scroll/Main/ToastInfoButton", func(): HtyfSdk.call_show_toast("标题", "这是描述", "info"))
	_bind_button("Scroll/Main/ToastSuccessButton", func(): HtyfSdk.call_show_toast("成功", "操作完成", "success"))
	_bind_button("Scroll/Main/ShowModalButton", _on_show_modal)
	_bind_button("Scroll/Main/GetClipboardButton", _on_get_clipboard)
	_bind_button("Scroll/Main/SetClipboardButton", _on_set_clipboard)
	_bind_button("Scroll/Main/OpenBrowserButton", _on_open_browser)
	_bind_button("Scroll/Main/GetMenuRectButton", _on_get_menu_button_bounding_client_rect)
	_bind_button("Scroll/Main/GetNetworkStateButton", _on_get_network_state)
	_bind_button("Scroll/Main/CloseAppButton", _on_close_app)
	_bind_button("Scroll/Main/HapticImpactButton", func(): HtyfSdk.call_trigger_haptic("impactMedium"))
	_bind_button("Scroll/Main/HapticSuccessButton", func(): HtyfSdk.call_trigger_haptic("notificationSuccess"))
	_bind_button("Scroll/Main/RewardedAdButton", _on_show_rewarded_ad)
	_bind_button("Scroll/Main/InterstitialAdButton", _on_show_interstitial_ad)

func _on_ipc_response(message: String) -> void:
	_result_dialog.dialog_text = message
	_result_dialog.popup_centered()


func _on_open_qr() -> void:
	HtyfSdk.log("openQR")
	HtyfSdk.call_open_qr(func(data: String):
		print("openQR result: ", data)
		HtyfSdk.call_show_modal("success", "openQR result: " + data)
	)

func _on_show_modal() -> void:
	HtyfSdk.log("showModal")
	HtyfSdk.call_show_modal("演示弹窗", "这是 Godot 通过 RNInterface 调起的弹窗", "确定", "取消")

func _on_get_clipboard() -> void:
	HtyfSdk.log("getClipboard")
	HtyfSdk.call_get_clipboard()

func _on_set_clipboard() -> void:
	HtyfSdk.log("setClipboard")
	HtyfSdk.call_set_clipboard("来自 Godot 的剪贴板内容")

func _on_open_browser() -> void:
	HtyfSdk.log("openBrowser")
	HtyfSdk.call_open_browser("https://godotengine.org")

func _on_get_network_state() -> void:
	HtyfSdk.log("getNetworkState")
	HtyfSdk.call_get_network_state()

func _on_get_menu_button_bounding_client_rect() -> void:
	HtyfSdk.log("getMenuButtonBoundingClientRect")
	HtyfSdk.call_get_menu_button_bounding_client_rect(func(data: Dictionary):
		print("getMenuButtonBoundingClientRect result: ", data)
		HtyfSdk.call_show_modal("success", "getMenuButtonBoundingClientRect result: " + JSON.stringify(data))
	)

func _on_show_rewarded_ad() -> void:
	HtyfSdk.log("showRewardedAd")
	HtyfSdk.call_show_rewarded_ad(func(data: Dictionary):
		print("showRewardedAd result: ", data)
		HtyfSdk.call_show_modal("showRewardedAd", JSON.stringify(data))
	)

func _on_show_interstitial_ad() -> void:
	HtyfSdk.log("showInterstitialAd")
	HtyfSdk.call_show_interstitial_ad({}, func(data: Dictionary):
		print("showInterstitialAd result: ", data)
		HtyfSdk.call_show_modal("showInterstitialAd", JSON.stringify(data))
	)

func _on_close_app() -> void:
	HtyfSdk.log("closeApp")
	HtyfSdk.call_close_app()
