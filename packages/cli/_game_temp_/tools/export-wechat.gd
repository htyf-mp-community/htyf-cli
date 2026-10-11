@tool
extends SceneTree

const Exporter = preload("res://addons/godot_mini_game/exporter.gd")

func _initialize() -> void:
	_export.call_deferred()

func _export() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() != 4:
		push_error("Expected AppID, orientation, Web preset and output directory")
		quit(1)
		return
	var exporter := Exporter.new()
	exporter.log_callback = func(message: String): print(message)
	var result: Error = await exporter.export_mini_game("wechat", args[0], args[1], args[2], args[3])
	quit(0 if result == OK else 1)
