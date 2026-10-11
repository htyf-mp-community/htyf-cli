@tool
extends EditorPlugin

const SDK_AUTOLOAD := "MiniGameSDK"
const SDK_PATH := "res://addons/godot_mini_game/MiniGameSDK.gd"
const SDK_AUTOLOAD_SETTING := "autoload/" + SDK_AUTOLOAD

var dock: Control

func _enter_tree() -> void:
	dock = preload("res://addons/godot_mini_game/export_dock.tscn").instantiate()
	add_control_to_dock(DOCK_SLOT_RIGHT_BL, dock)

	if not ProjectSettings.has_setting(SDK_AUTOLOAD_SETTING):
		add_autoload_singleton(SDK_AUTOLOAD, SDK_PATH)
	elif _current_autoload_path() != SDK_PATH:
		push_error(
			"Godot Mini Game cannot register %s because the name is already used by %s" % [
				SDK_AUTOLOAD,
				_current_autoload_path(),
			]
		)


func _exit_tree() -> void:
	if dock:
		remove_control_from_docks(dock)
		dock.queue_free()
		dock = null
	# Ownership is derived from the path, not transient editor-session state. This
	# keeps disable/uninstall behavior correct after the editor has been restarted
	# while still preserving a user autoload that merely shares the same name.
	if _current_autoload_path() == SDK_PATH:
		remove_autoload_singleton(SDK_AUTOLOAD)


func _current_autoload_path() -> String:
	if not ProjectSettings.has_setting(SDK_AUTOLOAD_SETTING):
		return ""
	return str(ProjectSettings.get_setting(SDK_AUTOLOAD_SETTING, "")).trim_prefix("*")
