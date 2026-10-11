@tool
extends RefCounted
## Pure output-path ownership checks used before the exporter writes or removes
## anything.  A generated manifest acts as the ownership sentinel.

const OWNERSHIP_FILE := ".godot-mini-game-export.json"
const SCHEMA_VERSION := 1
const TemplateBundle = preload("res://addons/godot_mini_game/core/template_bundle.gd")


static func inspect(
	output_path: String,
	project_root: String,
	managed_files: PackedStringArray,
	managed_dirs: PackedStringArray,
) -> Dictionary:
	if output_path.strip_edges().is_empty():
		return _result(false, "Output directory is empty")

	var output := _absolute(output_path)
	var project := _absolute(project_root)
	if output.is_empty() or not output.is_absolute_path():
		return _result(false, "Output directory must resolve to an absolute path")
	if _is_filesystem_root(output):
		return _result(false, "Filesystem root cannot be used as output")
	if not project.is_empty() and (
		_is_same_or_child(output, project)
		or _is_same_or_child(project, output)
	):
		return _result(false, "Output directory cannot contain or be inside the Godot project")

	var home := _absolute(OS.get_environment("HOME"))
	if not home.is_empty() and _same_path(output, home):
		return _result(false, "User home directory cannot be used as output")

	if FileAccess.file_exists(output):
		return _result(false, "Output path points to a file")
	if not DirAccess.dir_exists_absolute(output):
		return {
			"ok": true,
			"path": output,
			"owned": false,
			"legacy_owned": false,
			"state_token": "missing",
			"error": "",
		}

	var sentinel := output.path_join(OWNERSHIP_FILE)
	var ownership := _validate_ownership_manifest(
		output, sentinel, managed_files, managed_dirs)
	if bool(ownership.get("valid", false)):
		return {
			"ok": true,
			"path": output,
			"owned": true,
			"legacy_owned": false,
			"state_token": "owned:" + str(ownership.get("manifest_sha256", "")),
			"error": "",
		}
	if FileAccess.file_exists(sentinel):
		return _result(
			false,
			"Invalid ownership manifest: %s" % str(
				ownership.get("error", "validation failed")),
		)

	var conflicts := PackedStringArray()
	for filename in managed_files:
		if _path_exists(output.path_join(filename)):
			conflicts.append(filename)
	for dirname in managed_dirs:
		if _path_exists(output.path_join(dirname)):
			conflicts.append(dirname + "/")

	if conflicts.is_empty() and _directory_is_empty(output):
		return {
			"ok": true,
			"path": output,
			"owned": false,
			"legacy_owned": false,
			"state_token": "empty",
			"error": "",
		}
	if conflicts.is_empty():
		return _result(false, "Existing output directory must be empty or contain a valid ownership manifest")
	return _result(false, "Output contains unmanaged paths that the exporter would replace: %s" % ", ".join(conflicts))


static func _path_exists(path: String) -> bool:
	return FileAccess.file_exists(path) or DirAccess.dir_exists_absolute(path)


static func _directory_is_empty(path: String) -> bool:
	var directory := DirAccess.open(path)
	if not directory:
		return false
	directory.list_dir_begin()
	var entry := directory.get_next()
	directory.list_dir_end()
	return entry.is_empty()


static func _validate_ownership_manifest(
	output: String,
	manifest_path: String,
	managed_files: PackedStringArray,
	managed_dirs: PackedStringArray,
) -> Dictionary:
	if not FileAccess.file_exists(manifest_path):
		return _ownership_result(false, "manifest is missing")
	if _path_has_link(output, OWNERSHIP_FILE):
		return _ownership_result(false, "manifest must not be a symbolic link")

	var manifest_sha_before := FileAccess.get_sha256(manifest_path).to_lower()
	var file := FileAccess.open(manifest_path, FileAccess.READ)
	if not file:
		return _ownership_result(false, "manifest cannot be read")
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	if not parsed is Dictionary:
		return _ownership_result(false, "manifest JSON must be an object")
	var manifest: Dictionary = parsed
	if not _has_valid_metadata(manifest):
		return _ownership_result(false, "manifest metadata is invalid")

	var required_value: Variant = manifest.get("required_files", [])
	var artifacts_value: Variant = manifest.get("output_artifacts", {})
	if not required_value is Array or not artifacts_value is Dictionary:
		return _ownership_result(
			false, "required_files and output_artifacts must be collections")
	var required_files: Array = required_value
	var output_artifacts: Dictionary = artifacts_value
	var required_set := {}
	var allowed_directories := {}
	for path_value in required_files:
		if not path_value is String:
			return _ownership_result(false, "required file paths must be strings")
		var relative_path: String = path_value
		if (
			not _is_safe_relative_path(relative_path)
			or not _is_managed_path(relative_path, managed_files, managed_dirs)
			or required_set.has(relative_path)
		):
			return _ownership_result(
				false, "unsafe, unmanaged, or duplicate required path: %s" % relative_path)
		required_set[relative_path] = true
		_add_parent_directories(relative_path, allowed_directories)

	if not required_set.has(OWNERSHIP_FILE):
		return _ownership_result(false, "manifest must list itself")
	if output_artifacts.size() != required_set.size() - 1:
		return _ownership_result(false, "artifact metadata count does not match required files")

	for artifact_key in output_artifacts.keys():
		if not artifact_key is String:
			return _ownership_result(false, "artifact paths must be strings")
		var artifact_path: String = artifact_key
		if (
			artifact_path == OWNERSHIP_FILE
			or not required_set.has(artifact_path)
			or not _is_safe_relative_path(artifact_path)
		):
			return _ownership_result(false, "unexpected artifact path: %s" % artifact_path)

	for relative_path_value in required_set.keys():
		var relative_path: String = relative_path_value
		var absolute_path := output.path_join(relative_path)
		if _path_has_link(output, relative_path):
			return _ownership_result(false, "managed paths must not contain links: %s" % relative_path)
		if not FileAccess.file_exists(absolute_path):
			return _ownership_result(false, "required file is missing: %s" % relative_path)
		if relative_path == OWNERSHIP_FILE:
			continue
		var expected_value: Variant = output_artifacts.get(relative_path, {})
		if not expected_value is Dictionary:
			return _ownership_result(false, "artifact metadata is missing: %s" % relative_path)
		var expected: Dictionary = expected_value
		var size_value: Variant = expected.get("size", -1)
		var expected_hash := str(expected.get("sha256", ""))
		if (
			not _is_nonnegative_integer(size_value)
			or not _is_sha256(expected_hash)
		):
			return _ownership_result(false, "artifact metadata is invalid: %s" % relative_path)
		var actual := _file_metadata(absolute_path)
		if (
			actual.is_empty()
			or int(size_value) != int(actual.get("size", -1))
			or expected_hash.to_lower() != str(actual.get("sha256", ""))
		):
			return _ownership_result(false, "artifact hash or size changed: %s" % relative_path)

	if not _managed_tree_matches(
		output, required_set, allowed_directories, managed_files, managed_dirs):
		return _ownership_result(false, "managed output contains undeclared paths or links")

	var template: Dictionary = manifest.get("template", {})
	var source_artifacts: Dictionary = template.get("source_artifacts", {})
	var source_wasm: Dictionary = source_artifacts.get("godot.wasm.br", {})
	var output_wasm: Dictionary = output_artifacts.get("engine/godot.wasm.br", {})
	if (
		not _is_sha256(str(source_wasm.get("sha256", "")))
		or str(source_wasm.get("sha256", "")).to_lower()
		!= str(output_wasm.get("sha256", "")).to_lower()
	):
		return _ownership_result(false, "template and output WASM identities disagree")

	var manifest_sha_after := FileAccess.get_sha256(manifest_path).to_lower()
	if manifest_sha_before.is_empty() or manifest_sha_before != manifest_sha_after:
		return _ownership_result(false, "manifest changed during inspection")
	return _ownership_result(true, "", manifest_sha_after)


static func _has_valid_metadata(manifest: Dictionary) -> bool:
	if (
		not _is_integer(manifest.get("schema_version", 0))
		or int(manifest.get("schema_version", 0)) != SCHEMA_VERSION
		or str(manifest.get("tool", "")) != "godot_mini_game"
		or str(manifest.get("ownership", "")) != "managed-output"
		or not ["wechat", "douyin"].has(str(manifest.get("platform", "")))
		or not ["portrait", "landscape"].has(str(manifest.get("orientation", "")))
		or str(manifest.get("generated_at", "")).is_empty()
	):
		return false
	var template_value: Variant = manifest.get("template", {})
	if not template_value is Dictionary:
		return false
	var template: Dictionary = template_value
	var godot_version := str(template.get("godot_version", ""))
	var godot_commit := str(template.get("godot_commit", ""))
	var emscripten_version := str(template.get("emscripten_version", ""))
	var source_artifacts_value: Variant = template.get("source_artifacts", {})
	if (
		str(template.get("source", "")).is_empty()
		or TemplateBundle.normalize_version(godot_version) != godot_version
		or TemplateBundle.normalize_commit(godot_commit) != godot_commit
		or godot_commit.length() != 40
		or TemplateBundle.normalize_emscripten_version(emscripten_version)
		!= emscripten_version
		or not _is_integer(template.get("bridge_abi", 0))
		or int(template.get("bridge_abi", 0)) != TemplateBundle.BRIDGE_ABI
		or not _is_positive_integer(template.get("revision", 0))
		or str(template.get("profile", "")) != TemplateBundle.PROFILE
		or str(template.get("target", "")) != TemplateBundle.TARGET
		or not source_artifacts_value is Dictionary
	):
		return false
	var source_artifacts: Dictionary = source_artifacts_value
	for artifact_name in ["godot.js", "godot.wasm.br"]:
		var entry_value: Variant = source_artifacts.get(artifact_name, {})
		if not entry_value is Dictionary:
			return false
		var entry: Dictionary = entry_value
		if not _is_sha256(str(entry.get("sha256", ""))):
			return false
	return true


static func _managed_tree_matches(
	output: String,
	required_set: Dictionary,
	allowed_directories: Dictionary,
	managed_files: PackedStringArray,
	managed_dirs: PackedStringArray,
) -> bool:
	for filename in managed_files:
		var path := output.path_join(filename)
		if _path_has_link(output, filename):
			return false
		if _path_exists(path) and not required_set.has(filename):
			return false
	for dirname in managed_dirs:
		var path := output.path_join(dirname)
		if _path_has_link(output, dirname):
			return false
		if not _path_exists(path):
			continue
		if (
			not DirAccess.dir_exists_absolute(path)
			or not allowed_directories.has(dirname)
			or not _scan_managed_directory(
				output, dirname, required_set, allowed_directories)
		):
			return false
	return true


static func _scan_managed_directory(
	output: String,
	relative_dir: String,
	required_set: Dictionary,
	allowed_directories: Dictionary,
) -> bool:
	var directory := DirAccess.open(output.path_join(relative_dir))
	if not directory:
		return false
	directory.list_dir_begin()
	var entry := directory.get_next()
	while not entry.is_empty():
		var relative_path := relative_dir.path_join(entry)
		if directory.is_link(entry):
			directory.list_dir_end()
			return false
		if directory.current_is_dir():
			if (
				not allowed_directories.has(relative_path)
				or not _scan_managed_directory(
					output, relative_path, required_set, allowed_directories)
			):
				directory.list_dir_end()
				return false
		elif not required_set.has(relative_path):
			directory.list_dir_end()
			return false
		entry = directory.get_next()
	directory.list_dir_end()
	return true


static func _add_parent_directories(
	relative_path: String, allowed_directories: Dictionary) -> void:
	var parent := relative_path.get_base_dir()
	while parent != "." and not parent.is_empty():
		allowed_directories[parent] = true
		parent = parent.get_base_dir()


static func _is_managed_path(
	relative_path: String,
	managed_files: PackedStringArray,
	managed_dirs: PackedStringArray,
) -> bool:
	if managed_files.has(relative_path):
		return true
	for dirname in managed_dirs:
		if relative_path.begins_with(dirname + "/"):
			return true
	return false


static func _is_safe_relative_path(path: String) -> bool:
	if (
		path.is_empty()
		or path.is_absolute_path()
		or path.contains("\\")
		or path.contains(":")
		or path.simplify_path() != path
	):
		return false
	for component in path.split("/", true):
		if component.is_empty() or component == "." or component == "..":
			return false
		for character in component:
			if str(character).unicode_at(0) < 32:
				return false
	return true


static func _path_has_link(root: String, relative_path: String) -> bool:
	var current := root
	for component in relative_path.split("/", false):
		var directory := DirAccess.open(current)
		if not directory:
			return false
		if directory.is_link(component):
			return true
		current = current.path_join(component)
	return false


static func _file_metadata(path: String) -> Dictionary:
	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return {}
	var size := file.get_length()
	file.close()
	return {
		"size": size,
		"sha256": FileAccess.get_sha256(path).to_lower(),
	}


static func _is_sha256(value: String) -> bool:
	if value.length() != 64:
		return false
	for character in value:
		if "0123456789abcdefABCDEF".find(str(character)) == -1:
			return false
	return true


static func _is_integer(value: Variant) -> bool:
	return value is int or (value is float and value == floor(value))


static func _is_nonnegative_integer(value: Variant) -> bool:
	return _is_integer(value) and int(value) >= 0


static func _is_positive_integer(value: Variant) -> bool:
	return _is_integer(value) and int(value) > 0


static func _ownership_result(
	valid: bool, error: String, manifest_sha256: String = "") -> Dictionary:
	return {
		"valid": valid,
		"error": error,
		"manifest_sha256": manifest_sha256,
	}


static func _absolute(path: String) -> String:
	if path.strip_edges().is_empty():
		return ""
	var value := ProjectSettings.globalize_path(path) if path.begins_with("res://") or path.begins_with("user://") else path
	return _resolve_links(value.simplify_path().trim_suffix("/"))


static func _same_path(a: String, b: String) -> bool:
	if OS.get_name() in ["Windows", "macOS"]:
		return a.to_lower() == b.to_lower()
	return a == b


static func _is_same_or_child(path: String, parent: String) -> bool:
	if _same_path(path, parent):
		return true
	var prefix := parent.trim_suffix("/") + "/"
	if OS.get_name() in ["Windows", "macOS"]:
		return path.to_lower().begins_with(prefix.to_lower())
	return path.begins_with(prefix)


static func _resolve_links(path: String) -> String:
	var pending := path
	var seen := {}
	for _pass in range(64):
		if seen.has(pending):
			return ""
		seen[pending] = true

		var components: Array[String] = []
		var root := pending
		while not _is_filesystem_root(root):
			components.push_front(root.get_file())
			var parent := root.get_base_dir()
			if parent == root:
				return ""
			root = parent

		var resolved := root
		var replaced := false
		for index in range(components.size()):
			var directory := DirAccess.open(resolved)
			var component := components[index]
			if directory and directory.is_link(component):
				var target := directory.read_link(component)
				resolved = target if target.is_absolute_path() else resolved.path_join(target)
				for remainder in range(index + 1, components.size()):
					resolved = resolved.path_join(components[remainder])
				pending = resolved.simplify_path().trim_suffix("/")
				replaced = true
				break
			resolved = resolved.path_join(component)
		if not replaced:
			return resolved.simplify_path().trim_suffix("/")
	return ""


static func _is_filesystem_root(path: String) -> bool:
	if path == "/":
		return true
	if (
		OS.get_name() == "Windows"
		and path.length() <= 3
		and (path.ends_with(":") or path.ends_with(":/"))
	):
		return true
	return path.get_base_dir() == path


static func _result(ok: bool, error: String) -> Dictionary:
	return {
		"ok": ok,
		"path": "",
		"owned": false,
		"legacy_owned": false,
		"state_token": "",
		"error": error,
	}
