@tool
extends RefCounted
## Core export logic. Nothing in the destination is replaced until a complete
## export has passed validation in a sibling staging directory.

const ADDON_ROOT := "res://addons/godot_mini_game/"
const TEMPLATES  := "res://addons/godot_mini_game/templates/"
const ENGINE_DIR := "res://addons/godot_mini_game/engine/"
const TemplateBundle = preload("res://addons/godot_mini_game/core/template_bundle.gd")
const OutputGuard = preload("res://addons/godot_mini_game/core/output_guard.gd")
const OUTPUT_MANIFEST: String = OutputGuard.OWNERSHIP_FILE
const PUBLISH_JOURNAL := "journal.json"
const PUBLISH_JOURNAL_SCHEMA_VERSION := 1

const SUPPORTED_PLATFORMS: PackedStringArray = ["wechat", "douyin"]
const SUPPORTED_ORIENTATIONS: PackedStringArray = ["portrait", "landscape"]
const COMMON_TEMPLATE_MAPPINGS := {
	"adapter.js": "adapter.js",
	"audio/demo-tone.wav": "audio/demo-tone.wav",
	"fetch.js": "fetch.js",
	"js/libs/sdk.js": "js/libs/sdk.js",
	"js/image_loader.js": "js/image_loader.js",
	"js/loader.js": "js/loader.js",
	"js/platform_runtime.js": "js/platform_runtime.js",
	"js/worker/position_reporting.js": "js/worker/position_reporting.js",
}

## File / directory names this exporter owns inside the user's output dir.
## A validated staged copy replaces these transactionally; anything else in
## the destination (e.g. user-kept files) is left alone.
const MANAGED_FILES: PackedStringArray = [
	"adapter.js", "fetch.js", "game.js", "game.json",
	"project.config.json", "project.private.config.json",
	OUTPUT_MANIFEST,
]
const MANAGED_DIRS: PackedStringArray = ["audio", "engine", "images", "js", "subpacks"]

var log_callback: Callable
var _publish_recovery_required := false


# ─── Template store ────────────────────────────────────────────────

static func get_godot_version_key() -> String:
	return _editor_version_string()


static func get_godot_legacy_version_key() -> String:
	var v := Engine.get_version_info()
	return "%d.%d" % [v.major, v.minor]


static func get_template_store_dir() -> String:
	return _template_store_root_dir().path_join(get_godot_version_key())


static func _template_store_root_dir() -> String:
	return OS.get_config_dir().path_join("godot_mini_game/templates/v1")


static func _template_store_destination(
	store_root: String,
	version: String,
	commit: String,
	emscripten_version: String,
	profile: String,
	target: String,
	bridge_abi: int,
	revision: int,
) -> String:
	var version_key := TemplateBundle.normalize_version(version)
	var commit_key := TemplateBundle.normalize_commit(commit)
	var emscripten_key := TemplateBundle.normalize_emscripten_version(
		emscripten_version)
	if (
		store_root.is_empty()
		or version_key.is_empty()
		or commit_key.length() != 40
		or emscripten_key.is_empty()
		or profile != TemplateBundle.PROFILE
		or target != TemplateBundle.TARGET
		or bridge_abi < 1
		or revision < 1
	):
		return ""
	return store_root.simplify_path().path_join(version_key).path_join(
		commit_key).path_join("emsdk-%s" % emscripten_key).path_join(
		profile).path_join(target).path_join("abi-%d" % bridge_abi).path_join(
		"r%d" % revision)


static func get_template_store_dirs() -> PackedStringArray:
	var dirs := PackedStringArray()
	for candidate in _versioned_store_candidates():
		dirs.append(str(candidate.root))
	for legacy in _legacy_template_store_dirs():
		if not dirs.has(legacy):
			dirs.append(legacy)
	return dirs


static func _versioned_store_candidates(version_root_override: String = "") -> Array:
	var candidates: Array = []
	var version_root := (
		get_template_store_dir()
		if version_root_override.is_empty()
		else version_root_override.simplify_path()
	)
	if not DirAccess.dir_exists_absolute(version_root):
		return candidates
	for commit_dir in DirAccess.get_directories_at(version_root):
		var normalized_commit := TemplateBundle.normalize_commit(commit_dir)
		if normalized_commit.length() != 40 or commit_dir != normalized_commit:
			continue
		var commit_root := version_root.path_join(commit_dir)
		for emsdk_dir in DirAccess.get_directories_at(commit_root):
			if not emsdk_dir.begins_with("emsdk-"):
				continue
			var emscripten_version := TemplateBundle.normalize_emscripten_version(
				emsdk_dir.trim_prefix("emsdk-"))
			if emscripten_version.is_empty() or emsdk_dir != "emsdk-" + emscripten_version:
				continue
			var release_root := commit_root.path_join(emsdk_dir).path_join(
				TemplateBundle.PROFILE).path_join(TemplateBundle.TARGET).path_join(
				"abi-%d" % TemplateBundle.BRIDGE_ABI)
			if not DirAccess.dir_exists_absolute(release_root):
				continue
			for revision_dir in DirAccess.get_directories_at(release_root):
				if not revision_dir.begins_with("r"):
					continue
				var revision_text := revision_dir.trim_prefix("r")
				if (
					not revision_text.is_valid_int()
					or int(revision_text) < 1
					or revision_dir != "r%d" % int(revision_text)
				):
					continue
				candidates.append({
					"source": "store",
					"root": release_root.path_join(revision_dir),
					"priority": 1000000 + mini(int(revision_text), 999999),
					"godot_commit": normalized_commit,
					"emscripten_version": emscripten_version,
					"bridge_abi": TemplateBundle.BRIDGE_ABI,
					"revision": int(revision_text),
				})
	return candidates


static func _legacy_template_store_dirs() -> PackedStringArray:
	var root := OS.get_config_dir().path_join("godot_mini_game/templates")
	var dirs := PackedStringArray([root.path_join(get_godot_version_key())])
	var major_minor := root.path_join(get_godot_legacy_version_key())
	if major_minor != dirs[0]:
		dirs.append(major_minor)
	return dirs


static func get_template_status() -> Dictionary:
	var editor_version := get_godot_version_key()
	var editor_commit := _editor_commit_string()
	var result := {
		"source": "none",
		"has_js": false,
		"has_wasm": false,
		"ready": false,
		"editor_version": editor_version,
		"editor_commit": editor_commit,
		"template_version": "",
		"template_commit": "",
		"emscripten_version": "",
		"bridge_abi": 0,
		"profile": "",
		"target": "",
		"template_revision": 0,
		"version_match": false,
		"commit_verified": false,
		"error": "No compatible engine template bundle was found",
	}

	var bundle = _select_template_bundle(
		_template_candidates(), editor_version, editor_commit)
	if bundle:
		result.source = bundle.source
		result.has_js = true
		result.has_wasm = true
		result.ready = true
		result.template_version = bundle.godot_version
		result.template_commit = bundle.godot_commit
		result.emscripten_version = bundle.emscripten_version
		result.bridge_abi = int(bundle.manifest.get("bridgeAbi", 0))
		result.profile = str(bundle.manifest.get("profile", ""))
		result.target = str(bundle.manifest.get("target", ""))
		result.template_revision = int(bundle.manifest.get("revision", 0))
		result.version_match = bundle.godot_version == editor_version
		result.commit_verified = bundle.commit_verified
		result.error = ""
		return result

	return result


static func _template_candidates() -> Array:
	var candidates: Array = [
		{
			"source": "addon",
			"root": ADDON_ROOT,
			"priority": 2000000000,
		},
	]
	candidates.append_array(_versioned_store_candidates())
	candidates.append(
		{
			"source": "bundled",
			"root": ENGINE_DIR,
			"priority": 500000,
		}
	)
	var legacy_priority := 400000
	for legacy in _legacy_template_store_dirs():
		candidates.append({
			"source": "store_legacy",
			"root": legacy,
			"priority": legacy_priority,
		})
		legacy_priority -= 1
	return candidates


static func _select_template_bundle(
	candidates: Array,
	editor_version: String,
	editor_commit: String = "",
):
	return TemplateBundle.select(candidates, editor_version, editor_commit)


## Imports a mini-game compatible engine template zip into the per-version
## template store. The destination directory is keyed by the ZIP's *own*
## version.txt when present, so users can install a 4.6 template from a 4.3
## editor without it being misfiled under `templates/4.3/`.
func import_template_zip(zip_path: String) -> Error:
	return _import_template_zip_to_store(zip_path, _template_store_root_dir())


## The explicit store root keeps import transaction tests isolated from the
## user's real Godot configuration directory.
func _import_template_zip_to_store(zip_path: String, store_root: String) -> Error:
	if store_root.is_empty():
		return ERR_INVALID_PARAMETER
	var reader := ZIPReader.new()
	if reader.open(zip_path) != OK:
		_log("[color=red]无法打开 ZIP: %s[/color]" % zip_path)
		return ERR_CANT_OPEN

	var archive_files := reader.get_files()
	var manifest_entry := ""
	var found_js := ""
	var found_wasm_br := ""
	var found_version_file := ""
	var found_copyright_file := ""
	var incoming_manifest: Dictionary = {}
	var zip_version := ""
	var zip_commit := ""
	var zip_emscripten_version := ""

	for entry in archive_files:
		if entry.get_file() == TemplateBundle.MANIFEST_FILE:
			manifest_entry = entry
			break
	if manifest_entry.is_empty():
		reader.close()
		_log("[color=red]模板 ZIP 必须包含 template.json；v0.2 不再接受无法验证来源的旧模板[/color]")
		return ERR_INVALID_DATA

	if not manifest_entry.is_empty():
		var manifest_text := reader.read_file(manifest_entry).get_string_from_utf8()
		var parsed: Variant = JSON.parse_string(manifest_text)
		if not parsed is Dictionary:
			reader.close()
			_log("[color=red]ZIP 中的 template.json 无效[/color]")
			return ERR_INVALID_DATA
		incoming_manifest = parsed
		var godot_value: Variant = incoming_manifest.get("godot", {})
		if not godot_value is Dictionary:
			reader.close()
			_log("[color=red]模板 template.json 缺少 godot 身份[/color]")
			return ERR_INVALID_DATA
		var godot: Dictionary = godot_value
		zip_version = str(godot.get("version", ""))
		zip_commit = str(godot.get("commit", ""))
		zip_emscripten_version = TemplateBundle.normalize_emscripten_version(
			str(incoming_manifest.get("emscriptenVersion", "")))
		if zip_emscripten_version.is_empty():
			reader.close()
			_log("[color=red]模板 template.json 缺少有效的 emscriptenVersion[/color]")
			return ERR_INVALID_DATA
		var artifacts_value: Variant = incoming_manifest.get("artifacts", {})
		if not artifacts_value is Dictionary:
			reader.close()
			_log("[color=red]模板 template.json 缺少 artifacts[/color]")
			return ERR_INVALID_DATA
		var artifacts: Dictionary = artifacts_value
		var js_value: Variant = artifacts.get("godot.js", {})
		var wasm_value: Variant = artifacts.get("godot.wasm.br", {})
		if not js_value is Dictionary or not wasm_value is Dictionary:
			reader.close()
			_log("[color=red]模板 template.json 必须同时描述 JavaScript 和 WASM[/color]")
			return ERR_INVALID_DATA
		var archive_root := manifest_entry.get_base_dir()
		archive_root = "" if archive_root == "." else archive_root
		found_js = "godot.js" if archive_root.is_empty() else archive_root.path_join("godot.js")
		found_wasm_br = "godot.wasm.br" if archive_root.is_empty() else archive_root.path_join("godot.wasm.br")
		found_version_file = "version.txt" if archive_root.is_empty() else archive_root.path_join("version.txt")
		found_copyright_file = TemplateBundle.COPYRIGHT_FILE if archive_root.is_empty() else archive_root.path_join(TemplateBundle.COPYRIGHT_FILE)
		if (
			not archive_files.has(found_js)
			or not archive_files.has(found_wasm_br)
			or not archive_files.has(found_version_file)
			or not archive_files.has(found_copyright_file)
		):
			reader.close()
			_log("[color=red]template.json 同目录缺少引擎文件、version.txt 或 Godot 版权声明[/color]")
			return ERR_FILE_NOT_FOUND
		var declared_version := TemplateBundle.normalize_version(zip_version)
		var file_version := TemplateBundle.normalize_version(
			reader.read_file(found_version_file).get_string_from_utf8())
		if declared_version.is_empty() or declared_version != file_version:
			reader.close()
			_log("[color=red]template.json 与 version.txt 版本不一致[/color]")
			return ERR_INVALID_DATA

	var version_key := _version_key_from_string(zip_version)
	var editor_key := get_godot_version_key()
	if version_key.is_empty():
		reader.close()
		_log("[color=red]模板未声明有效的精确 Godot 版本[/color]")
		return ERR_INVALID_DATA
	if version_key != editor_key:
		_log("  [color=yellow]⚠ ZIP 版本 (%s) 与当前编辑器 (%s) 不匹配 — 按 ZIP 版本归档，需要切换编辑器版本才能使用[/color]" % [version_key, editor_key])

	var normalized_commit := TemplateBundle.normalize_commit(zip_commit)
	var revision := int(incoming_manifest.get("revision", 0))
	var bridge_abi := int(incoming_manifest.get("bridgeAbi", 0))
	if (
		normalized_commit.length() != 40
		or revision < 1
		or str(incoming_manifest.get("profile", "")) != TemplateBundle.PROFILE
		or str(incoming_manifest.get("target", "")) != TemplateBundle.TARGET
		or bridge_abi != TemplateBundle.BRIDGE_ABI
	):
		reader.close()
		_log("[color=red]template.json 的 commit、profile、target、ABI 或 revision 无效[/color]")
		return ERR_INVALID_DATA
	var store_dir := _template_store_destination(
		store_root,
		version_key,
		normalized_commit,
		zip_emscripten_version,
		str(incoming_manifest.get("profile", "")),
		str(incoming_manifest.get("target", "")),
		bridge_abi,
		revision,
	)
	if store_dir.is_empty():
		reader.close()
		return ERR_INVALID_DATA
	var global_store := ProjectSettings.globalize_path(store_dir) if store_dir.begins_with("res://") else store_dir
	var staging_dir := _make_sibling_temp_path(global_store, "template-import")
	if DirAccess.dir_exists_absolute(staging_dir):
		_rm_rf(staging_dir)
	var mkdir_err := DirAccess.make_dir_recursive_absolute(staging_dir)
	if mkdir_err != OK:
		reader.close()
		_log("[color=red]无法创建模板暂存目录[/color]")
		return mkdir_err

	var js_data := reader.read_file(found_js)
	var js_path := staging_dir.path_join("godot.js")
	var write_err := _write_buffer(js_path, js_data)
	if write_err != OK or js_data.is_empty():
		reader.close()
		_rm_rf(staging_dir)
		_log("[color=red]无法提取有效的 godot.js[/color]")
		return ERR_CANT_CREATE if write_err == OK else write_err
	_log("  提取 godot.js (%d bytes)" % js_data.size())

	var br_data := reader.read_file(found_wasm_br)
	write_err = _write_buffer(staging_dir.path_join("godot.wasm.br"), br_data)
	if write_err != OK or br_data.is_empty():
		reader.close()
		_rm_rf(staging_dir)
		_log("[color=red]无法提取有效的 godot.wasm.br[/color]")
		return ERR_CANT_CREATE if write_err == OK else write_err
	_log("  提取 godot.wasm.br (%.1f MB)" % [br_data.size() / 1048576.0])

	var copyright_data := reader.read_file(found_copyright_file)
	write_err = _write_buffer(
		staging_dir.path_join(TemplateBundle.COPYRIGHT_FILE), copyright_data)
	if write_err != OK or copyright_data.is_empty():
		reader.close()
		_rm_rf(staging_dir)
		_log("[color=red]无法提取有效的 Godot 版权声明[/color]")
		return ERR_CANT_CREATE if write_err == OK else write_err

	reader.close()

	write_err = _write_text(staging_dir.path_join("version.txt"), version_key + "\n")
	if write_err != OK:
		_rm_rf(staging_dir)
		return write_err

	write_err = TemplateBundle.write_manifest(
		staging_dir.path_join(TemplateBundle.MANIFEST_FILE), incoming_manifest)
	if write_err != OK:
		_rm_rf(staging_dir)
		_log("[color=red]无法写入模板 manifest[/color]")
		return write_err

	var imported_bundle = TemplateBundle.load_from_directory(
		"import", staging_dir, version_key, zip_commit)
	if not imported_bundle.valid:
		_rm_rf(staging_dir)
		_log("[color=red]模板完整性校验失败: %s[/color]" % imported_bundle.error)
		return ERR_INVALID_DATA

	var publish_err := _replace_directory_transaction(staging_dir, global_store)
	if publish_err != OK:
		_rm_rf(staging_dir)
		_log("[color=red]无法发布模板: %s[/color]" % error_string(publish_err))
		return publish_err
	_log("[color=green]模板已导入到: %s[/color]" % global_store)
	return OK


## Extracts a normalized version key from strings like "4.6.1-stable" or "4.6.1.stable".
static func _version_key_from_string(s: String) -> String:
	return TemplateBundle.normalize_version(s)


static func _editor_version_string() -> String:
	var v := Engine.get_version_info()
	return "%d.%d.%d.%s" % [v.major, v.minor, v.patch, v.status]


static func _editor_commit_string() -> String:
	var version_info := Engine.get_version_info()
	return str(version_info.get("hash", ""))


# ─── Public entry point ────────────────────────────────────────────

func export_mini_game(
	platform: String,
	appid: String,
	orientation: String,
	preset_name: String,
	output_dir: String,
) -> Error:
	_log("平台: %s | AppID: %s | 方向: %s" % [platform, appid, orientation])
	_log("输出目录: %s" % output_dir)

	if not SUPPORTED_PLATFORMS.has(platform):
		_log("[color=red]不支持的平台: %s[/color]" % platform)
		return ERR_INVALID_PARAMETER
	if not SUPPORTED_ORIENTATIONS.has(orientation):
		_log("[color=red]不支持的屏幕方向: %s[/color]" % orientation)
		return ERR_INVALID_PARAMETER

	var output_check := OutputGuard.inspect(
		output_dir,
		ProjectSettings.globalize_path("res://"),
		MANAGED_FILES,
		MANAGED_DIRS,
	)
	if not bool(output_check.get("ok", false)):
		_log("[color=red]输出目录预检失败: %s[/color]" % output_check.get("error", ""))
		return ERR_INVALID_PARAMETER
	var output_path := str(output_check.path)

	var err := _validate_export_preset(preset_name)
	if err != OK:
		return err

	var bundle = _select_template_bundle(
		_template_candidates(), get_godot_version_key(), _editor_commit_string())
	if not bundle:
		_log("[color=red]没有与当前 Godot 版本完全匹配的完整引擎模板束[/color]")
		_log_template_candidate_errors()
		return ERR_FILE_NOT_FOUND

	err = _validate_template_sources(platform)
	if err != OK:
		return err

	var staging_dir := _make_sibling_temp_path(output_path, "export-staging")
	err = DirAccess.make_dir_recursive_absolute(staging_dir)
	if err != OK:
		_log("[color=red]无法创建导出暂存目录: %s[/color]" % staging_dir)
		return err

	for sub in ["audio", "engine", "js/libs", "js/worker", "images", "subpacks"]:
		err = DirAccess.make_dir_recursive_absolute(staging_dir.path_join(sub))
		if err != OK:
			_rm_rf(staging_dir)
			return err

	# Step 1: Export .pck (lightweight, does not require export templates)
	_log("步骤 1/7: 导出资源包 (.pck) ...")
	err = await _export_pck(preset_name, staging_dir.path_join("engine/godot.zip"))
	if err != OK:
		_rm_rf(staging_dir)
		_log("[color=red]导出 PCK 失败: %s[/color]" % error_string(err))
		return err

	# Step 2: Copy both engine files from the same validated bundle.
	_log("步骤 2/7: 获取已校验的引擎模板束 ...")
	err = _obtain_engine_files(staging_dir, bundle)
	if err != OK:
		_rm_rf(staging_dir)
		return err

	# Step 3: Copy common JS runtime templates
	_log("步骤 3/7: 复制 JS 运行时模板 ...")
	err = _copy_common_templates(staging_dir)
	if err != OK:
		_rm_rf(staging_dir)
		return err

	# Step 4: Copy platform-specific entry & configs
	_log("步骤 4/7: 生成平台配置 (%s) ..." % platform)
	err = _copy_platform_templates(platform, staging_dir, appid, orientation)
	if err != OK:
		_rm_rf(staging_dir)
		return err

	# Step 5: Create placeholder files for the subpackage structure declared in game.json.
	# Both /engine and /subpacks are listed under "subpackages" in game.json; WeChat
	# expects every subpackage root to be a real (possibly empty) directory containing
	# at least one file, otherwise the bundler complains. A zero-byte game.js satisfies
	# that without bloating the package.
	_log("步骤 5/7: 创建占位文件 ...")
	err = _write_text(staging_dir.path_join("engine/game.js"), "")
	if err == OK:
		err = _write_text(staging_dir.path_join("subpacks/game.js"), "")
	if err == OK:
		err = _generate_placeholder_images(staging_dir)
	if err != OK:
		_rm_rf(staging_dir)
		return err

	_log("步骤 6/7: 校验最终产物 ...")
	err = _write_output_manifest(staging_dir, platform, orientation, bundle)
	if err == OK:
		err = _validate_output_manifest(staging_dir, platform)
	if err != OK:
		_rm_rf(staging_dir)
		_log("[color=red]最终产物校验失败: %s[/color]" % error_string(err))
		return err

	_log("步骤 7/7: 事务发布导出结果 ...")
	err = _publish_staging(
		staging_dir,
		output_path,
		platform,
		str(output_check.get("state_token", "")),
	)
	if err != OK:
		if not _publish_recovery_required and DirAccess.dir_exists_absolute(staging_dir):
			_rm_rf(staging_dir)
		_log("[color=red]发布失败；请根据上方日志确认原产物或恢复目录: %s[/color]" % error_string(err))
		return err

	_log("[color=green]导出完成！→ %s[/color]" % output_path)
	return OK


func _validate_export_preset(preset_name: String) -> Error:
	if preset_name.strip_edges().is_empty():
		_log("[color=red]导出预设不能为空[/color]")
		return ERR_INVALID_PARAMETER
	var cfg := ConfigFile.new()
	var err := cfg.load("res://export_presets.cfg")
	if err != OK:
		_log("[color=red]无法读取 export_presets.cfg[/color]")
		return err
	for section in cfg.get_sections():
		if (
			section.begins_with("preset.")
			and str(cfg.get_value(section, "name", "")) == preset_name
		):
			if str(cfg.get_value(section, "platform", "")) != "Web":
				_log("[color=red]预设 \"%s\" 不是 Web 导出预设[/color]" % preset_name)
				return ERR_INVALID_PARAMETER
			return OK
	_log("[color=red]未找到导出预设: %s[/color]" % preset_name)
	return ERR_FILE_NOT_FOUND


func _validate_template_sources(platform: String) -> Error:
	var required := PackedStringArray()
	for src_rel in COMMON_TEMPLATE_MAPPINGS:
		required.append(TEMPLATES + "common/" + str(src_rel))
	var platform_dir := TEMPLATES + platform + "/"
	for filename in ["game.js", "game.json.template", "project.config.json.template"]:
		required.append(platform_dir + filename)
	if platform == "wechat":
		required.append(platform_dir + "project.private.config.json.template")
	for path in required:
		if not _is_nonempty_file(path):
			_log("[color=red]缺少或为空的运行时模板: %s[/color]" % path)
			return ERR_FILE_NOT_FOUND
	return OK


func _log_template_candidate_errors() -> void:
	for candidate_value in _template_candidates():
		var candidate: Dictionary = candidate_value
		var candidate_bundle = TemplateBundle.load_from_directory(
			str(candidate.get("source", "unknown")),
			str(candidate.get("root", "")),
			get_godot_version_key(),
			_editor_commit_string(),
			int(candidate.get("priority", 0)),
		)
		_log("  %s: %s" % [candidate_bundle.source, candidate_bundle.error])


static func _required_output_files(platform: String) -> PackedStringArray:
	var required: PackedStringArray = [
		"adapter.js",
		"audio/demo-tone.wav",
		"engine/game.js",
		"engine/godot.wasm.br",
		"engine/godot.zip",
		"fetch.js",
		"game.js",
		"game.json",
		"images/background.png",
		"images/logo.png",
		"js/image_loader.js",
		"js/libs/godot.js",
		"js/libs/sdk.js",
		"js/loader.js",
		"js/platform_runtime.js",
		"js/worker/position_reporting.js",
		"project.config.json",
		"subpacks/game.js",
		OUTPUT_MANIFEST,
	]
	if platform == "wechat":
		required.append("project.private.config.json")
	return required


func _write_output_manifest(
	output_dir: String,
	platform: String,
	orientation: String,
	bundle,
) -> Error:
	var required_files: Array = []
	for path in _required_output_files(platform):
		required_files.append(path)
	var source_artifacts: Variant = bundle.manifest.get("artifacts", {})
	if not source_artifacts is Dictionary:
		return ERR_INVALID_DATA
	var output_artifacts := {}
	for relative_path in required_files:
		if relative_path == OUTPUT_MANIFEST:
			continue
		var metadata := _file_metadata(output_dir.path_join(relative_path))
		if metadata.is_empty():
			return ERR_FILE_NOT_FOUND
		output_artifacts[relative_path] = metadata
	var source_wasm: Variant = source_artifacts.get("godot.wasm.br", {})
	if (
		not source_wasm is Dictionary
		or str(source_wasm.get("sha256", "")).to_lower()
		!= str(output_artifacts["engine/godot.wasm.br"].get("sha256", "")).to_lower()
	):
		return ERR_FILE_CORRUPT
	var value := {
		"schema_version": OutputGuard.SCHEMA_VERSION,
		"tool": "godot_mini_game",
		"ownership": "managed-output",
		"platform": platform,
		"orientation": orientation,
		"generated_at": Time.get_datetime_string_from_system(true),
		"required_files": required_files,
		"output_artifacts": output_artifacts,
		"template": {
			"source": bundle.source,
			"godot_version": bundle.godot_version,
			"godot_commit": bundle.godot_commit,
			"emscripten_version": bundle.emscripten_version,
			"bridge_abi": int(bundle.manifest.get("bridgeAbi", 0)),
			"revision": int(bundle.manifest.get("revision", 0)),
			"profile": str(bundle.manifest.get("profile", "")),
			"target": str(bundle.manifest.get("target", "")),
			"source_artifacts": source_artifacts.duplicate(true),
		},
	}
	return _write_text(
		output_dir.path_join(OUTPUT_MANIFEST), JSON.stringify(value, "\t") + "\n")


func _validate_output_manifest(output_dir: String, platform: String) -> Error:
	if not SUPPORTED_PLATFORMS.has(platform):
		return ERR_INVALID_PARAMETER
	var manifest_path := output_dir.path_join(OUTPUT_MANIFEST)
	var manifest_value := _read_json_dictionary(manifest_path)
	if manifest_value.is_empty():
		_log("  [color=red]所有权清单缺失或无效[/color]")
		return ERR_INVALID_DATA
	if (
		int(manifest_value.get("schema_version", 0)) != OutputGuard.SCHEMA_VERSION
		or str(manifest_value.get("tool", "")) != "godot_mini_game"
		or str(manifest_value.get("ownership", "")) != "managed-output"
		or str(manifest_value.get("platform", "")) != platform
	):
		_log("  [color=red]所有权清单元数据不匹配[/color]")
		return ERR_INVALID_DATA

	var template_value: Variant = manifest_value.get("template", {})
	if not template_value is Dictionary:
		_log("  [color=red]所有权清单缺少模板身份[/color]")
		return ERR_INVALID_DATA
	var template: Dictionary = template_value
	if (
		TemplateBundle.normalize_version(str(template.get("godot_version", ""))).is_empty()
		or TemplateBundle.normalize_commit(
			str(template.get("godot_commit", ""))).length() != 40
		or TemplateBundle.normalize_emscripten_version(
			str(template.get("emscripten_version", ""))).is_empty()
		or int(template.get("bridge_abi", 0)) != TemplateBundle.BRIDGE_ABI
		or int(template.get("revision", 0)) < 1
		or str(template.get("profile", "")) != TemplateBundle.PROFILE
		or str(template.get("target", "")) != TemplateBundle.TARGET
	):
		_log("  [color=red]所有权清单模板身份无效[/color]")
		return ERR_INVALID_DATA

	var listed_value: Variant = manifest_value.get("required_files", [])
	if not listed_value is Array:
		return ERR_INVALID_DATA
	var listed: Array = listed_value
	var artifacts_value: Variant = manifest_value.get("output_artifacts", {})
	if not artifacts_value is Dictionary:
		return ERR_INVALID_DATA
	var output_artifacts: Dictionary = artifacts_value
	var zero_byte_allowed: PackedStringArray = ["engine/game.js", "subpacks/game.js"]
	for relative_path in _required_output_files(platform):
		if not listed.has(relative_path):
			_log("  [color=red]所有权清单未列出: %s[/color]" % relative_path)
			return ERR_INVALID_DATA
		var path := output_dir.path_join(relative_path)
		if not FileAccess.file_exists(path):
			_log("  [color=red]最终产物缺失: %s[/color]" % relative_path)
			return ERR_FILE_NOT_FOUND
		if relative_path == OUTPUT_MANIFEST:
			continue
		if not zero_byte_allowed.has(relative_path) and not _is_nonempty_file(path):
			_log("  [color=red]最终产物为空: %s[/color]" % relative_path)
			return ERR_INVALID_DATA
		var expected_value: Variant = output_artifacts.get(relative_path, {})
		if not expected_value is Dictionary:
			_log("  [color=red]产物清单缺少哈希: %s[/color]" % relative_path)
			return ERR_INVALID_DATA
		var expected: Dictionary = expected_value
		var actual := _file_metadata(path)
		if (
			actual.is_empty()
			or int(expected.get("size", -1)) != int(actual.get("size", -2))
			or str(expected.get("sha256", "")) != str(actual.get("sha256", ""))
		):
			_log("  [color=red]产物大小或 SHA-256 不匹配: %s[/color]" % relative_path)
			return ERR_FILE_CORRUPT

	var json_files: PackedStringArray = [
		"game.json", "project.config.json", OUTPUT_MANIFEST,
	]
	if platform == "wechat":
		json_files.append("project.private.config.json")
	for relative_path in json_files:
		if _read_json_dictionary(output_dir.path_join(relative_path)).is_empty():
			_log("  [color=red]JSON 文件无效: %s[/color]" % relative_path)
			return ERR_INVALID_DATA
	return OK


## Swaps only exporter-owned top-level paths. User files beside those paths
## are never moved or deleted. Every old path is backed up before the first
## staged path is published, and any rename failure rolls the swap back.
func _publish_staging(
	staging_dir: String,
	output_dir: String,
	platform: String,
	expected_state_token: String,
) -> Error:
	_publish_recovery_required = false
	if expected_state_token.is_empty():
		return ERR_INVALID_PARAMETER
	var validation_err := _validate_output_manifest(staging_dir, platform)
	if validation_err != OK:
		return validation_err

	var lock_path := _output_lock_path(output_dir)
	var lock_err := _acquire_output_lock(lock_path)
	if lock_err != OK:
		_log_existing_publish_journal(lock_path)
		return lock_err

	var journal_path := lock_path.path_join(PUBLISH_JOURNAL)
	var journal := {
		"schema_version": PUBLISH_JOURNAL_SCHEMA_VERSION,
		"tool": "godot_mini_game",
		"phase": "locked",
		"output_dir": output_dir,
		"staging_dir": staging_dir,
		"backup_dir": "",
		"platform": platform,
		"old_moved": [],
		"new_moved": [],
	}
	var journal_err := _write_publish_journal(journal_path, journal)
	if journal_err != OK:
		_release_output_lock(lock_path)
		return journal_err

	var publish_err := _publish_staging_locked(
		staging_dir,
		output_dir,
		platform,
		expected_state_token,
		journal_path,
		journal,
	)
	if not _publish_recovery_required:
		if FileAccess.file_exists(journal_path):
			DirAccess.remove_absolute(journal_path)
		_release_output_lock(lock_path)
	else:
		_log("[color=red]发布锁与恢复日志已保留: %s[/color]" % lock_path)
	return publish_err


func _publish_staging_locked(
	staging_dir: String,
	output_dir: String,
	platform: String,
	expected_state_token: String,
	journal_path: String,
	journal: Dictionary,
) -> Error:
	var current_state := OutputGuard.inspect(
		output_dir,
		ProjectSettings.globalize_path("res://"),
		MANAGED_FILES,
		MANAGED_DIRS,
	)
	if (
		not bool(current_state.get("ok", false))
		or str(current_state.get("state_token", "")) != expected_state_token
	):
		_log("[color=red]导出期间输出目录发生变化，拒绝覆盖[/color]")
		return ERR_BUSY
	if FileAccess.file_exists(output_dir):
		return ERR_ALREADY_EXISTS

	var output_existed := DirAccess.dir_exists_absolute(output_dir)
	var mkdir_err := DirAccess.make_dir_recursive_absolute(output_dir)
	if mkdir_err != OK:
		return mkdir_err
	var backup_dir := _make_sibling_temp_path(output_dir, "export-backup")
	mkdir_err = DirAccess.make_dir_recursive_absolute(backup_dir)
	if mkdir_err != OK:
		if not output_existed and _directory_is_empty(output_dir):
			DirAccess.remove_absolute(output_dir)
		return mkdir_err
	var journal_err := _update_publish_journal(
		journal_path, journal, "backup_ready", backup_dir, [], [])
	if journal_err != OK:
		_rm_rf(backup_dir)
		if not output_existed and _directory_is_empty(output_dir):
			DirAccess.remove_absolute(output_dir)
		return journal_err

	var old_moved: Array[String] = []
	var new_moved: Array[String] = []
	journal_err = _update_publish_journal(
		journal_path, journal, "backing_up", backup_dir, old_moved, new_moved)
	if journal_err != OK:
		_rm_rf(backup_dir)
		return journal_err
	for relative_path in _managed_top_level_paths():
		var old_path := output_dir.path_join(relative_path)
		if not _path_exists(old_path):
			continue
		var err := DirAccess.rename_absolute(old_path, backup_dir.path_join(relative_path))
		if err != OK:
			var rollback_err := _rollback_publish(
				output_dir, backup_dir, old_moved, new_moved, output_existed)
			return rollback_err if rollback_err != OK else err
		old_moved.append(relative_path)
		journal_err = _update_publish_journal(
			journal_path, journal, "backing_up", backup_dir, old_moved, new_moved)
		if journal_err != OK:
			var rollback_err := _rollback_publish(
				output_dir, backup_dir, old_moved, new_moved, output_existed)
			return rollback_err if rollback_err != OK else journal_err

	journal_err = _update_publish_journal(
		journal_path, journal, "publishing", backup_dir, old_moved, new_moved)
	if journal_err != OK:
		var rollback_err := _rollback_publish(
			output_dir, backup_dir, old_moved, new_moved, output_existed)
		return rollback_err if rollback_err != OK else journal_err
	for relative_path in _managed_top_level_paths():
		var staged_path := staging_dir.path_join(relative_path)
		if not _path_exists(staged_path):
			continue
		var err := DirAccess.rename_absolute(staged_path, output_dir.path_join(relative_path))
		if err != OK:
			var rollback_err := _rollback_publish(
				output_dir, backup_dir, old_moved, new_moved, output_existed)
			return rollback_err if rollback_err != OK else err
		new_moved.append(relative_path)
		journal_err = _update_publish_journal(
			journal_path, journal, "publishing", backup_dir, old_moved, new_moved)
		if journal_err != OK:
			var rollback_err := _rollback_publish(
				output_dir, backup_dir, old_moved, new_moved, output_existed)
			return rollback_err if rollback_err != OK else journal_err

	journal_err = _update_publish_journal(
		journal_path, journal, "committed", backup_dir, old_moved, new_moved)
	if journal_err != OK:
		var rollback_err := _rollback_publish(
			output_dir, backup_dir, old_moved, new_moved, output_existed)
		return rollback_err if rollback_err != OK else journal_err

	_rm_rf(backup_dir)
	_rm_rf(staging_dir)
	return OK


func _rollback_publish(
	output_dir: String,
	backup_dir: String,
	old_moved: Array[String],
	new_moved: Array[String],
	output_existed: bool,
) -> Error:
	var rollback_error := OK
	for relative_path in new_moved:
		var published_path := output_dir.path_join(relative_path)
		_remove_path(published_path)
		if _path_exists(published_path) and rollback_error == OK:
			rollback_error = ERR_CANT_CREATE
	for relative_path in old_moved:
		var backup_path := backup_dir.path_join(relative_path)
		if _path_exists(backup_path):
			var restore_err := DirAccess.rename_absolute(
				backup_path, output_dir.path_join(relative_path))
			if restore_err != OK and rollback_error == OK:
				rollback_error = restore_err
	if rollback_error == OK:
		_rm_rf(backup_dir)
		if not output_existed and _directory_is_empty(output_dir):
			DirAccess.remove_absolute(output_dir)
	else:
		_publish_recovery_required = true
		_log("[color=red]自动回滚未完成；旧产物保留在恢复目录: %s[/color]" % backup_dir)
	return rollback_error


func _replace_directory_transaction(staging_dir: String, target_dir: String) -> Error:
	if not DirAccess.dir_exists_absolute(staging_dir):
		return ERR_FILE_NOT_FOUND
	if FileAccess.file_exists(target_dir):
		return ERR_ALREADY_EXISTS
	var parent_err := DirAccess.make_dir_recursive_absolute(target_dir.get_base_dir())
	if parent_err != OK:
		return parent_err
	var backup_dir := _make_sibling_temp_path(target_dir, "directory-backup")
	var had_target := DirAccess.dir_exists_absolute(target_dir)
	if had_target:
		var backup_err := DirAccess.rename_absolute(target_dir, backup_dir)
		if backup_err != OK:
			return backup_err
	var publish_err := DirAccess.rename_absolute(staging_dir, target_dir)
	if publish_err != OK:
		if had_target and DirAccess.dir_exists_absolute(backup_dir):
			var restore_err := DirAccess.rename_absolute(backup_dir, target_dir)
			if restore_err != OK:
				_log("[color=red]模板目录回滚失败；旧模板保留在恢复目录: %s[/color]" % backup_dir)
				return restore_err
		return publish_err
	if had_target:
		_rm_rf(backup_dir)
	return OK


static func _managed_top_level_paths() -> Array[String]:
	var paths: Array[String] = []
	for filename in MANAGED_FILES:
		paths.append(filename)
	for dirname in MANAGED_DIRS:
		paths.append(dirname)
	return paths


static func _make_sibling_temp_path(target_path: String, label: String) -> String:
	var target := target_path.simplify_path().trim_suffix("/")
	var token := "%d-%d" % [OS.get_process_id(), Time.get_ticks_usec()]
	return target.get_base_dir().path_join(
		".%s.%s-%s" % [target.get_file(), label, token])


static func _output_lock_path(output_path: String) -> String:
	var target := output_path.simplify_path().trim_suffix("/")
	return target.get_base_dir().path_join(
		".%s.godot-mini-game.lock" % target.get_file())


static func _acquire_output_lock(lock_path: String) -> Error:
	return DirAccess.make_dir_absolute(lock_path)


static func _release_output_lock(lock_path: String) -> void:
	if DirAccess.dir_exists_absolute(lock_path):
		DirAccess.remove_absolute(lock_path)


func _write_publish_journal(path: String, journal: Dictionary) -> Error:
	return _write_text(path, JSON.stringify(journal, "\t") + "\n")


func _update_publish_journal(
	path: String,
	journal: Dictionary,
	phase: String,
	backup_dir: String,
	old_moved: Array,
	new_moved: Array,
) -> Error:
	journal.phase = phase
	journal.backup_dir = backup_dir
	journal.old_moved = old_moved.duplicate()
	journal.new_moved = new_moved.duplicate()
	journal.updated_at = Time.get_datetime_string_from_system(true)
	return _write_publish_journal(path, journal)


func _log_existing_publish_journal(lock_path: String) -> void:
	var journal_path := lock_path.path_join(PUBLISH_JOURNAL)
	var journal := _read_json_dictionary(journal_path)
	if journal.is_empty():
		_log("[color=red]另一个发布正在进行，或存在无效的遗留发布锁: %s[/color]" % lock_path)
		return
	_log("[color=red]检测到未完成发布（阶段: %s）。恢复日志: %s[/color]" % [
		str(journal.get("phase", "unknown")), journal_path,
	])
	for key in ["output_dir", "staging_dir", "backup_dir"]:
		var value := str(journal.get(key, ""))
		if not value.is_empty():
			_log("  %s: %s" % [key, value])


static func _path_exists(path: String) -> bool:
	return FileAccess.file_exists(path) or DirAccess.dir_exists_absolute(path)


static func _is_nonempty_file(path: String) -> bool:
	if not FileAccess.file_exists(path):
		return false
	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return false
	var has_content := file.get_length() > 0
	file.close()
	return has_content


static func _read_json_dictionary(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	return parsed if parsed is Dictionary else {}


static func _file_metadata(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {}
	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return {}
	var size := file.get_length()
	file.close()
	return {
		"size": size,
		"sha256": FileAccess.get_sha256(path).to_lower(),
	}


func _remove_path(path: String) -> void:
	if DirAccess.dir_exists_absolute(path):
		_rm_rf(path)
	elif FileAccess.file_exists(path):
		DirAccess.remove_absolute(path)


static func _directory_is_empty(path: String) -> bool:
	var directory := DirAccess.open(path)
	if not directory:
		return true
	directory.list_dir_begin()
	var entry := directory.get_next()
	directory.list_dir_end()
	return entry.is_empty()


## Recursive directory delete. Stays inside the directory we were given —
## DirAccess refuses to escape, so this can't accidentally walk up.
func _rm_rf(global_path: String) -> void:
	var da := DirAccess.open(global_path)
	if not da:
		return
	da.list_dir_begin()
	var entry := da.get_next()
	while entry != "":
		var child := global_path.path_join(entry)
		if da.is_link(entry):
			DirAccess.remove_absolute(child)
		elif da.current_is_dir():
			_rm_rf(child)
		else:
			DirAccess.remove_absolute(child)
		entry = da.get_next()
	da.list_dir_end()
	DirAccess.remove_absolute(global_path)


# ─── Step 1: Export PCK ────────────────────────────────────────────

## Spawns a separate headless Godot process to write the `.pck` and awaits
## its completion without freezing the editor.
##
## Previous implementation called `OS.execute(..., true)` which blocks the
## main thread; large projects pinned the editor for tens of seconds at a
## time. `OS.create_process` returns immediately and we poll via SceneTree
## timer, yielding to the editor so the dock stays responsive.
##
## Trade-off: `OS.create_process` does not capture stdout/stderr, so the
## sub-process Godot's warnings are lost. In return we get a non-blocking
## UI and a heartbeat log every second. If a deeper failure investigation
## is needed, run the command from a terminal manually — the log line
## "执行: <cmd>" prints the full invocation.
func _export_pck(preset_name: String, pck_path: String) -> Error:
	var godot_path := OS.get_executable_path()
	var project_path := ProjectSettings.globalize_path("res://")
	var global_pck := ProjectSettings.globalize_path(pck_path)
	var child_log := pck_path.get_base_dir().path_join(".godot-pack-export.log")
	var global_child_log := ProjectSettings.globalize_path(child_log)

	var args: PackedStringArray = [
		"--headless",
		"--quiet",
		"--log-file", global_child_log,
		"--path", project_path,
		"--export-pack", preset_name,
		global_pck,
	]

	_log("  执行: %s %s" % [godot_path, " ".join(args)])

	var pid := OS.create_process(godot_path, args)
	if pid <= 0:
		_log("  [color=red]无法启动 Godot 子进程[/color]")
		return ERR_CANT_FORK

	var tree: SceneTree = Engine.get_main_loop() as SceneTree
	var elapsed_ms: int = 0
	var POLL_MS := 250
	while OS.is_process_running(pid):
		if tree:
			await tree.create_timer(POLL_MS / 1000.0).timeout
		else:
			OS.delay_msec(POLL_MS)
		elapsed_ms += POLL_MS
		if elapsed_ms % 4000 == 0:
			_log("  ...导出中 (%ds)" % (elapsed_ms / 1000))

	var exit_code := OS.get_process_exit_code(pid)
	if exit_code != 0:
		_log_child_process_tail(child_log)
		_log("  [color=red]导出 PCK 失败 (exit=%d)，请在终端手动重跑命令查看详细错误[/color]" % exit_code)
		return ERR_COMPILATION_FAILED

	if not FileAccess.file_exists(pck_path):
		_log_child_process_tail(child_log)
		_log("  [color=red]PCK 文件未生成[/color]")
		return ERR_FILE_NOT_FOUND

	if FileAccess.file_exists(child_log):
		DirAccess.remove_absolute(global_child_log)
	_log("  PCK 已导出 → engine/godot.zip (耗时 %.1fs)" % (elapsed_ms / 1000.0))
	return OK


func _log_child_process_tail(path: String) -> void:
	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return
	var lines := file.get_as_text().split("\n", false)
	file.close()
	var first := maxi(0, lines.size() - 20)
	for index in range(first, lines.size()):
		_log("    Godot: %s" % str(lines[index]))


# ─── Step 2: Obtain engine files ──────────────────────────────────

func _obtain_engine_files(output_dir: String, bundle) -> Error:
	if not bundle or not bundle.valid:
		_log("[color=red]引擎模板束无效[/color]")
		return ERR_INVALID_DATA
	var artifacts_value: Variant = bundle.manifest.get("artifacts", {})
	if not artifacts_value is Dictionary:
		return ERR_INVALID_DATA
	var artifacts: Dictionary = artifacts_value
	var js_entry: Variant = artifacts.get("godot.js", {})
	var wasm_entry: Variant = artifacts.get("godot.wasm.br", {})
	if not js_entry is Dictionary or not wasm_entry is Dictionary:
		return ERR_INVALID_DATA
	var expected_js_hash := str(js_entry.get("sha256", "")).to_lower()
	var expected_wasm_hash := str(wasm_entry.get("sha256", "")).to_lower()
	var js_dst := output_dir.path_join("js/libs/godot.js")
	var wasm_dst := output_dir.path_join("engine/godot.wasm.br")
	var err := _copy_file(bundle.javascript_path, js_dst)
	if err == OK and FileAccess.get_sha256(js_dst).to_lower() != expected_js_hash:
		err = ERR_FILE_CORRUPT
	if err == OK:
		err = _copy_file(bundle.wasm_path, wasm_dst)
	if err == OK and FileAccess.get_sha256(wasm_dst).to_lower() != expected_wasm_hash:
		err = ERR_FILE_CORRUPT
	if err != OK:
		_log("[color=red]复制引擎模板束失败: %s[/color]" % error_string(err))
		return err
	_log("  已使用 %s 模板束 (%s)" % [bundle.source, bundle.godot_version])
	return _patch_godot_js(js_dst)


func _patch_godot_js(path: String) -> Error:
	var f := FileAccess.open(path, FileAccess.READ)
	if not f:
		return FileAccess.get_open_error()
	var content := f.get_as_text()
	f.close()

	# Prepend scope-level vars so bare `document`/`window` inside the Emscripten
	# IIFE resolve to our adapter polyfills instead of the devtools' native objects.
	var preamble := "if(typeof GameGlobal!==\"undefined\"&&GameGlobal.__adapter){var document=GameGlobal.__adapter.document;var window=GameGlobal.__adapter.window||GameGlobal;var navigator=GameGlobal.__adapter.navigator;}\n"

	var postamble := "\nif(typeof Engine!==\"undefined\")GameGlobal.Engine=Engine;if(typeof Godot!==\"undefined\")GameGlobal.Godot=Godot;\n"

	var modified := false
	if not content.begins_with("if(typeof GameGlobal"):
		content = preamble + content
		modified = true
	if content.find("GameGlobal.Engine=Engine") == -1:
		content = content + postamble
		modified = true

	# Mini-game canvas parentElement is a non-configurable native getter
	# returning null. Patch direct accesses to use a safe fallback.
	var _pe := "GodotConfig.canvas.parentElement.appendChild("
	if content.find(_pe) != -1:
		content = content.replace(
			_pe,
			"(GodotConfig.canvas.parentElement||document.body).appendChild(")
		modified = true

	# Replace GL.createContext to handle mini-game quirks:
	# 1) canvas may be null if findCanvasEventTarget fails (no DOM IDs)
	# 2) getContext may fail on second call (context limit)
	# 3) Fall back to cached context or GameGlobal.canvas
	var _gl_create_old := "createContext:(canvas,webGLContextAttributes)=>{if(webGLContextAttributes.renderViaOffscreenBackBuffer)webGLContextAttributes[\"preserveDrawingBuffer\"]=true;var ctx=webGLContextAttributes.majorVersion>1?canvas.getContext(\"webgl2\",webGLContextAttributes):canvas.getContext(\"webgl\",webGLContextAttributes);if(!ctx)return 0;var handle=GL.registerContext(ctx,webGLContextAttributes);return handle}"
	if content.find(_gl_create_old) != -1:
		var _gl_create_new := "createContext:(canvas,webGLContextAttributes)=>{if(!canvas&&typeof GameGlobal!==\"undefined\")canvas=GameGlobal.canvas;if(!canvas){console.error(\"[GL] no canvas\");return 0}var type=webGLContextAttributes.majorVersion>1?\"webgl2\":\"webgl\";console.log(\"[GL.createContext] type=\"+type);var ctx=canvas.getContext(type,webGLContextAttributes);if(!ctx)ctx=canvas.getContext(type);if(!ctx&&canvas.__glctx)ctx=canvas.__glctx;if(!ctx&&typeof GameGlobal!==\"undefined\"&&GameGlobal.canvas&&GameGlobal.canvas!==canvas){ctx=GameGlobal.canvas.getContext(type,webGLContextAttributes)||GameGlobal.canvas.getContext(type);canvas=GameGlobal.canvas}if(!ctx){console.error(\"[GL] getContext failed\");return 0}canvas.__glctx=ctx;console.log(\"[GL.createContext] OK\");var handle=GL.registerContext(ctx,webGLContextAttributes);return handle}"
		content = content.replace(_gl_create_old, _gl_create_new)
		modified = true
	else:
		_log("  [color=yellow]⚠ 未找到 GL.createContext 模式，跳过补丁[/color]")

	# Neutralize connectPositionWorklet — the position-reporting AudioWorkletNode
	# cannot be connected to real native AudioNodes in mini-game runtimes.
	# Audio playback still works; only per-sample position tracking is lost.
	var _cpw_old := "async connectPositionWorklet(start){await GodotAudio.audioPositionWorkletPromise;if(this.isCanceled){return}this._source.connect(this.getPositionWorklet());if(start){this.start()}}"
	if content.find(_cpw_old) != -1:
		content = content.replace(
			_cpw_old,
			"async connectPositionWorklet(start){if(start){this.start()}}")
		modified = true

	# Also patch isWebGLAvailable to always report true for WebGL2
	# (the actual context works, but the test canvas may fail due to context limits)
	var _webgl_check := "return !!document.createElement('canvas').getContext(['webgl', 'webgl2'][majorVersion - 1]);"
	if content.find(_webgl_check) != -1:
		content = content.replace(
			_webgl_check,
			"try{var _c=document.createElement('canvas');var _r=_c.getContext(['webgl','webgl2'][majorVersion-1]);console.log('[isWebGLAvailable] v='+majorVersion+' r='+!!_r);return !!_r}catch(e){return true;}")
		modified = true

	if modified:
		var out := FileAccess.open(path, FileAccess.WRITE)
		if not out:
			return FileAccess.get_open_error()
		out.store_string(content)
		var write_error := out.get_error()
		out.close()
		if write_error != OK:
			return write_error
		var metadata := _file_metadata(path)
		if int(metadata.get("size", -1)) != content.to_utf8_buffer().size():
			return ERR_FILE_CORRUPT
		_log("  已注入 mini-game 兼容补丁到 godot.js")
	return OK


# ─── Step 3: Copy common JS templates ─────────────────────────────

func _copy_common_templates(output_dir: String) -> Error:
	var common := TEMPLATES + "common/"
	for src_rel in COMMON_TEMPLATE_MAPPINGS:
		var src_path: String = common + src_rel
		var dst_path: String = output_dir.path_join(COMMON_TEMPLATE_MAPPINGS[src_rel])
		var err := _copy_file(src_path, dst_path)
		if err != OK:
			return err
	return OK


# ─── Step 4: Platform-specific templates ──────────────────────────

func _copy_platform_templates(
	platform: String,
	output_dir: String,
	appid: String,
	orientation: String,
) -> Error:
	if not SUPPORTED_PLATFORMS.has(platform):
		return ERR_INVALID_PARAMETER
	var plat_dir := TEMPLATES + platform + "/"
	var project_name := ProjectSettings.get_setting("application/config/name", "MiniGame")

	var err := _copy_file(plat_dir + "game.js", output_dir.path_join("game.js"))
	if err != OK:
		return err

	err = _copy_template(
		plat_dir + "game.json.template",
		output_dir.path_join("game.json"),
		appid, orientation, project_name,
	)
	if err != OK:
		return err

	err = _copy_template(
		plat_dir + "project.config.json.template",
		output_dir.path_join("project.config.json"),
		appid, orientation, project_name,
	)
	if err != OK:
		return err

	if platform == "wechat":
		err = _copy_template(
			plat_dir + "project.private.config.json.template",
			output_dir.path_join("project.private.config.json"),
			appid, orientation, project_name,
		)
		if err != OK:
			return err
	return OK


# ─── File utilities ────────────────────────────────────────────────

func _copy_file(src: String, dst: String) -> Error:
	var file := FileAccess.open(src, FileAccess.READ)
	if not file:
		_log("  [color=red]无法读取: %s[/color]" % src)
		return FileAccess.get_open_error()
	var source_size := file.get_length()
	var content := file.get_buffer(source_size)
	file.close()
	if content.size() != source_size:
		return ERR_FILE_CORRUPT

	var dir := dst.get_base_dir()
	var err := DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	if err != OK:
		return err

	var out := FileAccess.open(dst, FileAccess.WRITE)
	if not out:
		return FileAccess.get_open_error()
	out.store_buffer(content)
	var write_error := out.get_error()
	out.close()
	if write_error != OK:
		return write_error
	var metadata := _file_metadata(dst)
	return OK if int(metadata.get("size", -1)) == content.size() else ERR_FILE_CORRUPT


func _copy_template(
	src: String,
	dst: String,
	appid: String,
	orientation: String,
	project_name: String,
) -> Error:
	var file := FileAccess.open(src, FileAccess.READ)
	if not file:
		_log("  [color=red]无法读取模板: %s[/color]" % src)
		return FileAccess.get_open_error()
	var text := file.get_as_text()
	file.close()

	text = text.replace("{{APPID}}", _json_string_contents(appid))
	text = text.replace("{{ORIENTATION}}", _json_string_contents(orientation))
	text = text.replace("{{NAME}}", _json_string_contents(project_name))

	return _write_text(dst, text)


func _write_text(path: String, text: String) -> Error:
	var dir := path.get_base_dir()
	var err := DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	if err != OK:
		return err
	var f := FileAccess.open(path, FileAccess.WRITE)
	if not f:
		return FileAccess.get_open_error()
	f.store_string(text)
	var write_error := f.get_error()
	f.close()
	if write_error != OK:
		return write_error
	var metadata := _file_metadata(path)
	return OK if int(metadata.get("size", -1)) == text.to_utf8_buffer().size() else ERR_FILE_CORRUPT


func _generate_placeholder_images(output_dir: String) -> Error:
	var images_dir := output_dir.path_join("images")
	var err := DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(images_dir))
	if err != OK:
		return err

	var logo_dst := images_dir.path_join("logo.png")
	if not FileAccess.file_exists(logo_dst):
		var bundled := TEMPLATES + "common/images/logo.png"
		if FileAccess.file_exists(bundled):
			err = _copy_file(bundled, logo_dst)
			if err != OK:
				return err
			_log("  已复制 Godot 图标 → logo.png")
		else:
			var img := Image.create(128, 128, false, Image.FORMAT_RGBA8)
			img.fill(Color(0.278, 0.549, 0.749))
			err = img.save_png(ProjectSettings.globalize_path(logo_dst))
			if err != OK:
				return err
			_log("  生成占位 logo.png")

	var bg_dst := images_dir.path_join("background.png")
	if not FileAccess.file_exists(bg_dst):
		var img := Image.create(128, 128, false, Image.FORMAT_RGBA8)
		img.fill(Color(0.157, 0.173, 0.204))
		err = img.save_png(ProjectSettings.globalize_path(bg_dst))
		if err != OK:
			return err
		_log("  生成占位 background.png")
	return OK


func _write_buffer(path: String, data: PackedByteArray) -> Error:
	var dir := path.get_base_dir()
	var err := DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir))
	if err != OK:
		return err
	var f := FileAccess.open(path, FileAccess.WRITE)
	if not f:
		return FileAccess.get_open_error()
	f.store_buffer(data)
	var write_error := f.get_error()
	f.close()
	if write_error != OK:
		return write_error
	var metadata := _file_metadata(path)
	return OK if int(metadata.get("size", -1)) == data.size() else ERR_FILE_CORRUPT


static func _json_string_contents(value: String) -> String:
	var encoded := JSON.stringify(value)
	return encoded.substr(1, encoded.length() - 2) if encoded.length() >= 2 else ""


func _log(msg: String) -> void:
	if log_callback.is_valid():
		log_callback.call(msg)
	else:
		print("[MiniGame] ", msg)
