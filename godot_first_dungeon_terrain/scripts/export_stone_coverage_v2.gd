extends SceneTree

## E26 offline-only export.  The emitted files are intentionally not copied to
## public/ and are not a browser-runtime input yet.

const CELL_SIZE := 16
const ATLAS_COLUMNS := 4
const ATLAS_ROWS := 4
const EDGE_COLOR := Color8(41, 58, 46, 255) # #293A2E
const STONE_MASK_COLOR := Color8(255, 255, 255, 255)
const TRANSPARENT := Color8(0, 0, 0, 0)
const OUTPUT_DIR := "res://exports/stone-coverage-v2"
const SOURCE_DIR := "res://sources/official-v2"
const SOURCE_INPUTS := {
	"stone": "res://sources/stone/1.jpg",
	"moss": "res://sources/moss/2.jpg",
}
const OFFICIAL_SOURCES := {
	"stone": SOURCE_DIR + "/stone-brick-512.jpg",
	"moss": SOURCE_DIR + "/moss-512.jpg",
}
const MASK_NORTH := 1
const MASK_EAST := 2
const MASK_SOUTH := 4
const MASK_WEST := 8


func _init() -> void:
	if not _make_directories():
		quit(1)
		return
	if not _copy_and_verify_sources():
		quit(1)
		return

	var masks: Array[Image] = []
	var mask_entries: Array[Dictionary] = []
	for mask in range(16):
		var image := _build_mask(mask)
		var path := "%s/stone-coverage-mask-%02d.png" % [OUTPUT_DIR, mask]
		if image.save_png(path) != OK:
			push_error("Could not write E26 coverage mask %s" % path)
			quit(1)
			return
		masks.append(image)
		mask_entries.append(_mask_entry(mask, path, image))

	var atlas := _build_atlas(masks)
	var atlas_path := OUTPUT_DIR + "/stone-coverage-mask-atlas-64.png"
	if atlas.save_png(atlas_path) != OK:
		push_error("Could not write E26 coverage atlas")
		quit(1)
		return

	var rules := _build_rules(mask_entries)
	_write_json(OUTPUT_DIR + "/stone-coverage-rules-v2.json", rules)
	var manifest := _build_manifest(mask_entries, atlas_path, rules)
	_write_json(OUTPUT_DIR + "/stone-coverage-manifest-v2.json", manifest)
	print("E26 stone-coverage-v2 export written: ", OUTPUT_DIR)
	quit(0)


func _make_directories() -> bool:
	for path in [OUTPUT_DIR, SOURCE_DIR]:
		var error := DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(path))
		if error != OK:
			push_error("Could not create %s" % path)
			return false
	return true


func _copy_and_verify_sources() -> bool:
	for role in ["stone", "moss"]:
		var source_path: String = SOURCE_INPUTS[role]
		var target_path: String = OFFICIAL_SOURCES[role]
		if not FileAccess.file_exists(source_path):
			push_error("Missing controlled E26 source: %s" % source_path)
			return false
		if DirAccess.copy_absolute(ProjectSettings.globalize_path(source_path), ProjectSettings.globalize_path(target_path)) != OK:
			push_error("Could not copy controlled E26 source: %s" % role)
			return false
		var image := Image.load_from_file(target_path)
		if image == null or image.get_width() != 512 or image.get_height() != 512:
			push_error("E26 %s source must be a 512px image" % role)
			return false
	return true


func _build_mask(mask: int) -> Image:
	var stone: Array[bool] = []
	stone.resize(CELL_SIZE * CELL_SIZE)
	for y in range(CELL_SIZE):
		for x in range(CELL_SIZE):
			stone[y * CELL_SIZE + x] = _is_stone_coverage(mask, x, y)

	var image := Image.create(CELL_SIZE, CELL_SIZE, false, Image.FORMAT_RGBA8)
	for y in range(CELL_SIZE):
		for x in range(CELL_SIZE):
			if stone[y * CELL_SIZE + x]:
				image.set_pixel(x, y, STONE_MASK_COLOR)
			elif x > 0 and x < CELL_SIZE - 1 and y > 0 and y < CELL_SIZE - 1 and _distance_to_stone(stone, x, y) <= 2:
				# Keep the contour inside the cell: matching topology connectors meet
				# at a shared boundary and must not receive a duplicate moss-side line.
				image.set_pixel(x, y, EDGE_COLOR)
			else:
				image.set_pixel(x, y, TRANSPARENT)
	return image


func _is_stone_coverage(mask: int, x: int, y: int) -> bool:
	if mask == 0:
		return false
	if mask == 15:
		return true

	# An irregular central island plus the declared N/E/S/W continuations.
	# This is topology only: no source texture is sampled or baked here.
	var center := (x >= 4 and x <= 11 and y >= 3 and y <= 12) \
		or (x >= 3 and x <= 12 and y >= 5 and y <= 10) \
		or (x >= 5 and x <= 10 and y >= 2 and y <= 13)
	# A set bit owns a full three-source-pixel wide topology connector. This is
	# deliberately only coverage data: it permits a paired neighbor to share an
	# unbroken stone sampling boundary without baking any stone art into the mask.
	var north := (mask & MASK_NORTH) != 0 and y <= 2
	var east := (mask & MASK_EAST) != 0 and x >= CELL_SIZE - 3
	var south := (mask & MASK_SOUTH) != 0 and y >= CELL_SIZE - 3
	var west := (mask & MASK_WEST) != 0 and x <= 2
	return center or north or east or south or west


func _distance_to_stone(stone: Array[bool], x: int, y: int) -> int:
	var nearest := CELL_SIZE * 2
	for candidate_y in range(max(0, y - 2), min(CELL_SIZE, y + 3)):
		for candidate_x in range(max(0, x - 2), min(CELL_SIZE, x + 3)):
			if stone[candidate_y * CELL_SIZE + candidate_x]:
				nearest = min(nearest, max(abs(candidate_x - x), abs(candidate_y - y)))
	return nearest


func _build_atlas(masks: Array[Image]) -> Image:
	var atlas := Image.create(CELL_SIZE * ATLAS_COLUMNS, CELL_SIZE * ATLAS_ROWS, false, Image.FORMAT_RGBA8)
	atlas.fill(TRANSPARENT)
	for mask in range(16):
		atlas.blit_rect(masks[mask], Rect2i(Vector2i.ZERO, Vector2i(CELL_SIZE, CELL_SIZE)), Vector2i((mask % ATLAS_COLUMNS) * CELL_SIZE, (mask / ATLAS_COLUMNS) * CELL_SIZE))
	return atlas


func _mask_entry(mask: int, path: String, image: Image) -> Dictionary:
	var alpha_counts := { "transparent": 0, "opaque": 0 }
	var color_counts := { "stoneCoverage": 0, "mossSideEdge": 0 }
	for y in range(CELL_SIZE):
		for x in range(CELL_SIZE):
			var pixel := image.get_pixel(x, y)
			if pixel.a8 == 0:
				alpha_counts.transparent += 1
			else:
				alpha_counts.opaque += 1
				if pixel == STONE_MASK_COLOR:
					color_counts.stoneCoverage += 1
				elif pixel == EDGE_COLOR:
					color_counts.mossSideEdge += 1
	return {
		"mask": mask,
		"path": path.replace("res://", ""),
		"width": CELL_SIZE,
		"height": CELL_SIZE,
		"format": "RGBA8",
		"sha256": _sha256_file(path),
		"atlas": { "x": mask % ATLAS_COLUMNS, "y": mask / ATLAS_COLUMNS },
		"neighbors": {
			"north": (mask & MASK_NORTH) != 0,
			"east": (mask & MASK_EAST) != 0,
			"south": (mask & MASK_SOUTH) != 0,
			"west": (mask & MASK_WEST) != 0,
		},
		"alphaAudit": alpha_counts,
		"channelAudit": color_counts,
	}


func _build_rules(mask_entries: Array[Dictionary]) -> Dictionary:
	return {
		"schemaVersion": "first-dungeon-stone-coverage-rules-v2",
		"ruleVersion": 1,
		"campaign": 1,
		"appliesTo": ["infinite", "boss-arena"],
		"coverageTopology": {
			"cellSizeWorldPixels": CELL_SIZE,
			"bitOrder": ["north", "east", "south", "west"],
			"bitValues": { "north": MASK_NORTH, "east": MASK_EAST, "south": MASK_SOUTH, "west": MASK_WEST },
			"maskEntries": mask_entries.map(func(entry): return { "mask": entry.mask, "atlas": entry.atlas, "neighbors": entry.neighbors }),
		},
		"composition": {
			"order": ["world-coordinate-continuous-moss-texture", "world-coordinate-continuous-stone-texture-times-coverage-mask", "moss-side-edge-overlay"],
			"stoneCoverageEncoding": { "rgb": "#FFFFFF", "alpha": 255, "meaning": "sample continuous stone source texture" },
			"mossEncoding": { "alpha": 0, "meaning": "show continuous moss source texture" },
			"mossSideEdge": { "rgb": "#293A2E", "alpha": 255, "sourcePixels": 2, "hardEdge": true, "antiAlias": false, "owner": "the stone-cell mask at a stone-to-moss boundary; a moss cell never emits a duplicate edge" },
			"forbidden": ["baked-stone-texture", "resized-stone-pattern", "precomposited-moss-texture", "visible-repeated-stone-art"],
		},
		"internalStoneSeams": { "preservedBy": "continuous source stone texture", "extraOutline": "forbidden" },
		"collision": { "forbidden": true, "exported": false, "semantic": "visual-only" },
	}


func _build_manifest(mask_entries: Array[Dictionary], atlas_path: String, rules: Dictionary) -> Dictionary:
	return {
		"schemaVersion": "first-dungeon-stone-coverage-manifest-v2",
		"manifestVersion": 1,
		"runtimeEligible": false,
		"presentationOnly": true,
		"campaign": 1,
		"appliesTo": ["infinite", "boss-arena"],
		"sources": [
			{ "role": "stone", "path": OFFICIAL_SOURCES.stone.replace("res://", ""), "width": 512, "height": 512, "sha256": _sha256_file(OFFICIAL_SOURCES.stone) },
			{ "role": "moss", "path": OFFICIAL_SOURCES.moss.replace("res://", ""), "width": 512, "height": 512, "sha256": _sha256_file(OFFICIAL_SOURCES.moss) },
		],
		"sourceProvenance": "E26 start: Downloads originals were unavailable; files were copied from the existing project-controlled E24 source copies and verified against their recorded SHA-256 values.",
		"masks": mask_entries,
		"atlas": { "path": atlas_path.replace("res://", ""), "width": CELL_SIZE * ATLAS_COLUMNS, "height": CELL_SIZE * ATLAS_ROWS, "format": "RGBA8", "sha256": _sha256_file(atlas_path), "filter": "nearest", "mipmaps": false, "smoothing": false },
		"rules": { "path": "exports/stone-coverage-v2/stone-coverage-rules-v2.json", "sha256": _sha256_text(JSON.stringify(rules, "\t") + "\n") },
		"runtimeBoundary": { "webConsumesOnlyAfterA1Integration": ["static PNG masks", "rules JSON", "manifest JSON"], "neverConsumes": ["Godot runtime", "Godot Web/WASM", "GDScript", "collision", "Downloads paths"] },
		"fallback": { "preserve": "assets/tiles/dungeon-floor-level1-128-image2.png", "owner": "A1", "changed": false },
	}


func _write_json(path: String, value: Variant) -> void:
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(value, "\t") + "\n")
	file.close()


func _sha256_file(path: String) -> String:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return ""
	var bytes := file.get_buffer(file.get_length())
	file.close()
	return _sha256_bytes(bytes)


func _sha256_text(value: String) -> String:
	return _sha256_bytes(value.to_utf8_buffer())


func _sha256_bytes(bytes: PackedByteArray) -> String:
	var hashing := HashingContext.new()
	hashing.start(HashingContext.HASH_SHA256)
	hashing.update(bytes)
	return hashing.finish().hex_encode()
