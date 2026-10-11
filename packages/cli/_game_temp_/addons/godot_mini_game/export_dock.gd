@tool
extends VBoxContainer

const Exporter = preload("res://addons/godot_mini_game/exporter.gd")

const PLATFORM_OPTIONS := [
	["微信小游戏", "wechat"],
	["抖音小游戏", "douyin"],
]
const ORIENTATION_OPTIONS := [
	["竖屏 (portrait)", "portrait"],
	["横屏 (landscape)", "landscape"],
]

@onready var platform_option: OptionButton = $PlatformOption
@onready var appid_input: LineEdit = $AppIdInput
@onready var orientation_option: OptionButton = $OrientationOption
@onready var preset_option: OptionButton = $PresetOption
@onready var output_path: LineEdit = $OutputRow/OutputPath
@onready var browse_btn: Button = $OutputRow/BrowseBtn
@onready var export_btn: Button = $ExportBtn
@onready var status_label: RichTextLabel = $StatusLabel
@onready var folder_dialog: FileDialog = $FolderDialog
@onready var template_status: RichTextLabel = $TemplateStatus
@onready var import_btn: Button = $TemplateRow/ImportBtn
@onready var refresh_btn: Button = $TemplateRow/RefreshBtn
@onready var template_file_dialog: FileDialog = $TemplateFileDialog


func _ready() -> void:
	platform_option.clear()
	for option in PLATFORM_OPTIONS:
		platform_option.add_item(str(option[0]))
		platform_option.set_item_metadata(platform_option.item_count - 1, option[1])

	orientation_option.clear()
	for option in ORIENTATION_OPTIONS:
		orientation_option.add_item(str(option[0]))
		orientation_option.set_item_metadata(orientation_option.item_count - 1, option[1])

	_refresh_presets()
	_refresh_template_status()

	browse_btn.pressed.connect(_on_browse)
	export_btn.pressed.connect(_on_export)
	folder_dialog.dir_selected.connect(_on_dir_selected)
	import_btn.pressed.connect(_on_import_template)
	# The "Refresh" button refreshes BOTH the template status and the export
	# preset list, because users frequently create their Web preset *after*
	# enabling the plugin and would otherwise be stuck staring at "(未找到导出预设)"
	# until they restarted the editor.
	refresh_btn.pressed.connect(_refresh_all)
	template_file_dialog.file_selected.connect(_on_template_file_selected)

	_log("[b]小游戏导出插件已就绪[/b]")


func _refresh_all() -> void:
	_refresh_presets()
	_refresh_template_status()
	_log("已刷新预设和模板状态")


func _refresh_presets() -> void:
	var previous := ""
	if preset_option.item_count > 0 and preset_option.selected >= 0:
		previous = str(preset_option.get_item_metadata(preset_option.selected))
	preset_option.clear()
	var cfg := ConfigFile.new()
	var err := cfg.load("res://export_presets.cfg")
	if err != OK:
		_set_no_preset("(未找到 export_presets.cfg)")
		return
	var selected_index := -1
	for section in cfg.get_sections():
		if section.begins_with("preset."):
			var preset_name: String = cfg.get_value(section, "name", "")
			var preset_platform: String = cfg.get_value(section, "platform", "")
			if preset_name.is_empty() or preset_platform != "Web":
				continue
			preset_option.add_item(preset_name)
			var index := preset_option.item_count - 1
			preset_option.set_item_metadata(index, preset_name)
			if preset_name == previous:
				selected_index = index
	if preset_option.item_count == 0:
		_set_no_preset("(未找到 Web 导出预设)")
		return
	preset_option.disabled = false
	preset_option.select(selected_index if selected_index >= 0 else 0)


func _set_no_preset(label: String) -> void:
	preset_option.add_item(label)
	preset_option.set_item_metadata(0, "")
	preset_option.disabled = true


func _refresh_template_status() -> void:
	if not template_status:
		return
	var ver_key := Exporter.get_godot_version_key()
	var status := Exporter.get_template_status()
	var template_version: String = status.get("template_version", "")
	var template_commit: String = status.get("template_commit", "")
	var emscripten_version: String = status.get("emscripten_version", "")
	var bridge_abi: int = status.get("bridge_abi", 0)
	var template_revision: int = status.get("template_revision", 0)
	var version_note := ""
	if not template_version.is_empty():
		version_note = "模板 %s / 编辑器 %s" % [template_version, ver_key]
		if not template_commit.is_empty():
			version_note += " / commit %s" % template_commit.substr(0, 10)
		if not emscripten_version.is_empty():
			version_note += " / emsdk %s" % emscripten_version
		if bridge_abi > 0:
			version_note += " / ABI %d" % bridge_abi
		if template_revision > 0:
			version_note += " / r%d" % template_revision
	else:
		version_note = "编辑器 %s" % ver_key
	template_status.clear()
	match status.source:
		"addon":
			template_status.append_text("[color=green]✓ 兼容模板就绪[/color] (自定义, %s)" % version_note)
		"bundled":
			template_status.append_text("[color=green]✓ 兼容模板就绪[/color] (内置, %s)" % version_note)
		"store":
			template_status.append_text("[color=green]✓ 兼容模板就绪[/color] (模板库, %s)" % version_note)
		"store_legacy":
			template_status.append_text("[color=green]✓ 兼容模板就绪[/color] (旧模板库, %s)" % version_note)
		_:
			template_status.append_text("[color=red]✗ 未找到精确匹配的引擎模板[/color] (Godot %s)" % ver_key)


func _on_import_template() -> void:
	template_file_dialog.popup_centered()


func _on_template_file_selected(path: String) -> void:
	_log("[color=cyan]正在导入引擎模板: %s[/color]" % path.get_file())
	var exporter := Exporter.new()
	exporter.log_callback = _log
	var err := exporter.import_template_zip(path)
	if err == OK:
		_log("[color=green][b]模板导入成功！[/b][/color]")
		_show_toast("导入成功", "已按 template.json 中的精确 Godot 版本归档。")
	else:
		_log("[color=red]模板导入失败[/color]")
	_refresh_template_status()


func _on_browse() -> void:
	folder_dialog.popup_centered()


func _on_dir_selected(dir: String) -> void:
	output_path.text = dir


func _on_export() -> void:
	# Re-read export_presets.cfg every time the user clicks Export so we never
	# act on a stale snapshot taken when the dock was first instantiated.
	# This is the cheapest way to avoid the "(未找到导出预设)" sticky-state bug
	# where the user creates the preset *after* enabling the plugin.
	_refresh_presets()

	var platform: String = str(platform_option.get_item_metadata(platform_option.selected))
	var appid: String = appid_input.text.strip_edges()
	var orientation: String = str(orientation_option.get_item_metadata(orientation_option.selected))
	var output_dir: String = output_path.text.strip_edges()
	var preset_name: String = ""
	if preset_option.selected >= 0:
		preset_name = str(preset_option.get_item_metadata(preset_option.selected))

	if output_dir.is_empty():
		_log("[color=red]请选择输出目录[/color]")
		return
	if preset_name.is_empty():
		_log("[color=red]请先在 Project → Export 中创建一个 Web 导出预设；如已创建请点击「刷新」按钮[/color]")
		return

	export_btn.disabled = true
	_log("[color=cyan]开始导出 %s ...[/color]" % ("微信小游戏" if platform == "wechat" else "抖音小游戏"))

	var exporter := Exporter.new()
	exporter.log_callback = _log

	var err := await exporter.export_mini_game(
		platform,
		appid,
		orientation,
		preset_name,
		output_dir,
	)

	if err == OK:
		_log("[color=green][b]导出成功！[/b] → %s[/color]" % output_dir)
		_show_toast("导出成功！", "小游戏已导出到:\n%s" % output_dir)
	else:
		_log("[color=red][b]导出失败[/b][/color]")

	export_btn.disabled = false


## Pops a one-shot modal dialog. The dialog is parented to the editor's base
## control instead of the dock itself, so it centers over the whole editor
## window and survives even if the dock is hidden / moved mid-export.
func _show_toast(title: String, message: String) -> void:
	var dialog := AcceptDialog.new()
	dialog.title = title
	dialog.dialog_text = message
	dialog.min_size = Vector2i(320, 0)
	var parent: Node = EditorInterface.get_base_control() if Engine.is_editor_hint() else self
	parent.add_child(dialog)
	dialog.popup_centered()
	dialog.confirmed.connect(dialog.queue_free)
	dialog.canceled.connect(dialog.queue_free)


func _log(msg: String) -> void:
	if status_label:
		status_label.append_text(msg + "\n")
