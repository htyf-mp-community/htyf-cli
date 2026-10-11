@tool
extends RefCounted
## A validated, indivisible Godot JavaScript/WASM engine template.
##
## Both engine files are resolved from one directory and one manifest.  This
## prevents the old exporter behaviour where godot.js and godot.wasm.br could
## silently come from different template sources.

const MANIFEST_FILE := "template.json"
const COPYRIGHT_FILE := "GODOT_COPYRIGHT.txt"
const SCHEMA_VERSION := 1
const BRIDGE_ABI := 1
const PROFILE := "2d_full"
const TARGET := "release"

var source: String = "none"
var root_dir: String = ""
var manifest_path: String = ""
var manifest: Dictionary = {}
var godot_version: String = ""
var godot_commit: String = ""
var emscripten_version: String = ""
var javascript_path: String = ""
var wasm_path: String = ""
var wasm_encoding: String = ""
var commit_verified := false
var valid := false
var error: String = ""
var priority := 0


static func normalize_version(value: String) -> String:
	var text := value.strip_edges().replace("-", ".")
	var parts := text.split(".", false)
	if parts.size() != 4:
		return ""
	if (
		not parts[0].is_valid_int()
		or not parts[1].is_valid_int()
		or not parts[2].is_valid_int()
	):
		return ""
	var status := str(parts[3])
	if status.is_empty():
		return ""
	for character in status:
		if "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".find(
			str(character)) == -1:
			return ""
	return "%s.%s.%s.%s" % [parts[0], parts[1], parts[2], status]


static func normalize_commit(value: String) -> String:
	var text := value.strip_edges().to_lower()
	if text.begins_with("0x"):
		text = text.substr(2)
	for character in text:
		if "0123456789abcdef".find(str(character)) == -1:
			return ""
	return text if text.length() >= 7 else ""


## Emscripten releases are normally numeric triples (for example 4.0.3).
## A release suffix is accepted for reproducible development toolchains, but
## the whole value must be path-safe and match the release manifest contract.
static func normalize_emscripten_version(value: String) -> String:
	var matcher := RegEx.new()
	if matcher.compile(
		"^[0-9]+\\.[0-9]+\\.[0-9]+([.-][0-9A-Za-z][0-9A-Za-z.-]*)?$"
	) != OK:
		return ""
	return value if matcher.search(value) != null else ""


static func commits_match(template_commit: String, editor_commit: String) -> bool:
	var template_key := normalize_commit(template_commit)
	var editor_key := normalize_commit(editor_commit)
	if template_key.is_empty() or editor_key.is_empty():
		return false
	if template_key.length() != 40:
		return false
	return template_key.begins_with(editor_key)


## Orders exact Emscripten identities for deterministic template selection.
## Numeric release components win first; a final release wins over a suffix,
## then suffixes use a stable lexical order.
static func compare_emscripten_versions(left: String, right: String) -> int:
	var left_value := normalize_emscripten_version(left)
	var right_value := normalize_emscripten_version(right)
	if left_value == right_value:
		return 0
	if left_value.is_empty():
		return -1
	if right_value.is_empty():
		return 1
	var matcher := RegEx.new()
	if matcher.compile("^([0-9]+)\\.([0-9]+)\\.([0-9]+)(.*)$") != OK:
		return 0
	var left_match := matcher.search(left_value)
	var right_match := matcher.search(right_value)
	if left_match == null or right_match == null:
		return 1 if left_value > right_value else -1
	for group in range(1, 4):
		var left_number := int(left_match.get_string(group))
		var right_number := int(right_match.get_string(group))
		if left_number != right_number:
			return 1 if left_number > right_number else -1
	var left_suffix := left_match.get_string(4)
	var right_suffix := right_match.get_string(4)
	if left_suffix.is_empty() != right_suffix.is_empty():
		return 1 if left_suffix.is_empty() else -1
	return 1 if left_suffix > right_suffix else -1


static func build_manifest(
	root: String,
	version: String,
	commit: String,
	emscripten_version: String,
	revision: int = 1,
) -> Dictionary:
	var js_path := root.path_join("godot.js")
	var br_path := root.path_join("godot.wasm.br")
	if not FileAccess.file_exists(js_path) or not FileAccess.file_exists(br_path):
		return {}
	return {
		"schema": SCHEMA_VERSION,
		"godot": {
			"version": normalize_version(version),
			"commit": normalize_commit(commit),
		},
		"emscriptenVersion": normalize_emscripten_version(emscripten_version),
		"profile": PROFILE,
		"target": TARGET,
		"revision": max(1, revision),
		"bridgeAbi": BRIDGE_ABI,
		"features": {
			"simd": false,
			"threads": false,
			"wasmExceptions": false,
		},
		"artifacts": {
			"godot.js": {"sha256": _sha256(js_path)},
			"godot.wasm.br": {"sha256": _sha256(br_path)},
		},
	}


static func write_manifest(path: String, value: Dictionary) -> Error:
	if value.is_empty():
		return ERR_INVALID_DATA
	var file := FileAccess.open(path, FileAccess.WRITE)
	if not file:
		return FileAccess.get_open_error()
	var content := JSON.stringify(value, "\t") + "\n"
	file.store_string(content)
	var write_error := file.get_error()
	file.close()
	if write_error != OK:
		return write_error
	var verification := FileAccess.open(path, FileAccess.READ)
	if not verification:
		return ERR_CANT_CREATE
	var size_ok := verification.get_length() == content.to_utf8_buffer().size()
	verification.close()
	return OK if size_ok else ERR_FILE_CORRUPT


static func load_from_directory(
	source_name: String,
	root: String,
	editor_version: String,
	editor_commit: String = "",
	source_priority: int = 0,
):
	var bundle := new()
	bundle.source = source_name
	bundle.root_dir = root.simplify_path()
	bundle.manifest_path = bundle.root_dir.path_join(MANIFEST_FILE)
	bundle.priority = source_priority

	if FileAccess.file_exists(bundle.manifest_path):
		var manifest_file := FileAccess.open(bundle.manifest_path, FileAccess.READ)
		if not manifest_file:
			bundle.error = "Cannot read template manifest: %s" % bundle.manifest_path
			return bundle
		var parsed: Variant = JSON.parse_string(manifest_file.get_as_text())
		manifest_file.close()
		if not parsed is Dictionary:
			bundle.error = "Invalid template manifest JSON: %s" % bundle.manifest_path
			return bundle
		bundle.manifest = parsed
	else:
		bundle.error = "Missing required template manifest: %s" % bundle.manifest_path
		return bundle

	bundle._validate(editor_version, editor_commit)
	return bundle


static func select(
	candidates: Array,
	editor_version: String,
	editor_commit: String = "",
):
	var valid_bundles: Array = []
	for candidate_value in candidates:
		if not candidate_value is Dictionary:
			continue
		var candidate: Dictionary = candidate_value
		var bundle = load_from_directory(
			str(candidate.get("source", "unknown")),
			str(candidate.get("root", "")),
			editor_version,
			editor_commit,
			int(candidate.get("priority", 0)),
		)
		if not bundle.valid:
			continue
		# Store candidates carry the identity encoded in their directory path.
		# Refuse manually moved or partially overwritten bundles whose manifest
		# no longer agrees with that path.
		if (
			(candidate.has("godot_commit")
				and bundle.godot_commit != str(candidate.godot_commit))
			or (candidate.has("emscripten_version")
				and bundle.emscripten_version != str(candidate.emscripten_version))
			or (candidate.has("bridge_abi")
				and int(bundle.manifest.get("bridgeAbi", 0)) != int(candidate.bridge_abi))
			or (candidate.has("revision")
				and int(bundle.manifest.get("revision", 0)) != int(candidate.revision))
		):
			continue
		valid_bundles.append(bundle)

	valid_bundles.sort_custom(func(a, b) -> bool:
		if int(a.priority) != int(b.priority):
			return int(a.priority) > int(b.priority)
		var emscripten_order := compare_emscripten_versions(
			a.emscripten_version, b.emscripten_version)
		if emscripten_order != 0:
			return emscripten_order > 0
		return str(a.root_dir) < str(b.root_dir)
	)
	return valid_bundles[0] if not valid_bundles.is_empty() else null


func describe() -> Dictionary:
	return {
		"source": source,
		"root_dir": root_dir,
		"manifest_path": manifest_path,
		"manifest": manifest.duplicate(true),
		"godot_version": godot_version,
		"godot_commit": godot_commit,
		"emscripten_version": emscripten_version,
		"javascript_path": javascript_path,
		"wasm_path": wasm_path,
		"wasm_encoding": wasm_encoding,
		"commit_verified": commit_verified,
		"valid": valid,
		"error": error,
		"priority": priority,
	}


func _validate(editor_version: String, editor_commit: String) -> void:
	if int(manifest.get("schema", 0)) != SCHEMA_VERSION:
		error = "Unsupported template manifest schema"
		return

	var godot_value: Variant = manifest.get("godot", {})
	if not godot_value is Dictionary:
		error = "Template manifest has no Godot identity"
		return
	var godot: Dictionary = godot_value
	godot_version = normalize_version(str(godot.get("version", "")))
	if godot_version.is_empty():
		error = "Template manifest has no exact Godot version"
		return
	var expected_version := normalize_version(editor_version)
	if expected_version.is_empty() or godot_version != expected_version:
		error = "Template Godot version %s does not match editor %s" % [godot_version, expected_version]
		return

	var raw_commit := str(godot.get("commit", "")).strip_edges()
	godot_commit = normalize_commit(raw_commit)
	if godot_commit.length() != 40:
		error = "Template manifest requires the full 40-character Godot commit"
		return
	var expected_commit := normalize_commit(editor_commit)
	if not commits_match(godot_commit, expected_commit):
		error = "Template Godot commit %s does not match editor %s" % [godot_commit, expected_commit]
		return
	commit_verified = true

	emscripten_version = normalize_emscripten_version(
		str(manifest.get("emscriptenVersion", "")))
	if emscripten_version.is_empty():
		error = "Template manifest requires a valid Emscripten version"
		return

	if str(manifest.get("profile", "")) != PROFILE:
		error = "Template profile must be %s" % PROFILE
		return
	if str(manifest.get("target", "")) != TARGET:
		error = "Template target must be %s" % TARGET
		return
	if int(manifest.get("revision", 0)) < 1:
		error = "Template revision must be positive"
		return
	if int(manifest.get("bridgeAbi", 0)) != BRIDGE_ABI:
		error = "Template bridge ABI is incompatible"
		return
	var features_value: Variant = manifest.get("features", {})
	if not features_value is Dictionary:
		error = "Template features must be an object"
		return
	var features: Dictionary = features_value
	if (
		bool(features.get("simd", true))
		or bool(features.get("threads", true))
		or bool(features.get("wasmExceptions", true))
	):
		error = "Template enables unsupported WASM features"
		return

	var artifacts_value: Variant = manifest.get("artifacts", {})
	if not artifacts_value is Dictionary:
		error = "Template manifest artifacts must be an object"
		return
	var artifacts: Dictionary = artifacts_value
	var js_entry := _entry(artifacts.get("godot.js"))
	var wasm_entry := _entry(artifacts.get("godot.wasm.br"))
	if js_entry.is_empty() or wasm_entry.is_empty():
		error = "Template manifest must describe both JavaScript and WASM"
		return

	javascript_path = root_dir.path_join("godot.js")
	wasm_path = root_dir.path_join("godot.wasm.br")
	wasm_encoding = "br"
	if not FileAccess.file_exists(javascript_path) or not FileAccess.file_exists(wasm_path):
		error = "Template manifest references missing engine files"
		return
	var version_file := normalize_version(_read_text(root_dir.path_join("version.txt")))
	if version_file != godot_version:
		error = "template.json and version.txt disagree"
		return

	var js_hash := str(js_entry.get("sha256", "")).to_lower()
	var wasm_hash := str(wasm_entry.get("sha256", "")).to_lower()
	if js_hash.length() != 64 or wasm_hash.length() != 64:
		error = "Template manifest requires SHA-256 for both engine files"
		return
	if _sha256(javascript_path) != js_hash:
		error = "Template JavaScript SHA-256 mismatch"
		return
	if _sha256(wasm_path) != wasm_hash:
		error = "Template WASM SHA-256 mismatch"
		return

	valid = true
	error = ""


static func _entry(value: Variant) -> Dictionary:
	return value if value is Dictionary else {}


static func _read_text(path: String) -> String:
	if not FileAccess.file_exists(path):
		return ""
	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return ""
	var text := file.get_as_text().strip_edges()
	file.close()
	return text


static func _sha256(path: String) -> String:
	if not FileAccess.file_exists(path):
		return ""
	return FileAccess.get_sha256(path).to_lower()
