extends SceneTree

const TerrainRules = preload("res://scripts/terrain_rule_contract.gd")
const OUTPUT_DIR := "res://exports/terrain-v1"
const EXPECTED_SOURCE_HASHES := {
	"sources/stone/1.jpg": "2584ddad06c7b5abddb9b886a7b465b6fbd68271ae2275d950f6c73dba6c1fab",
	"sources/moss/2.jpg": "45e542620ec30dd04bcdc30f38e4c7c99324c9ded1f9173386a9a3caf758b857",
}

func _init() -> void:
	var failures: Array[String] = []
	var manifest := _read_json(OUTPUT_DIR + "/terrain-manifest.json", failures)
	var rules := _read_json(OUTPUT_DIR + "/terrain-rules.json", failures)
	var fixtures := _read_json(OUTPUT_DIR + "/terrain-fixtures-v1.json", failures)
	var atlas := Image.load_from_file(OUTPUT_DIR + "/terrain-atlas-16px.png")
	var preview := Image.load_from_file(OUTPUT_DIR + "/terrain-preview-512.png")
	if atlas == null or atlas.get_width() != 64 or atlas.get_height() != 64 or atlas.get_format() != Image.FORMAT_RGBA8:
		failures.append("atlas must be 64x64 RGBA8")
	if preview == null or preview.get_width() != 512 or preview.get_height() != 512 or preview.get_format() != Image.FORMAT_RGBA8:
		failures.append("preview must be 512x512 RGBA8")
	if rules.get("cellSize") != 16 or rules.get("chunkPixels") != 512 or rules.get("chunkCells") != 32:
		failures.append("rules dimensions do not match E24 contract")
	var bits: Dictionary = rules.get("bitValues", {})
	if rules.get("bitOrder") != ["north", "east", "south", "west"] or bits.get("north", -1) != 1 or bits.get("east", -1) != 2 or bits.get("south", -1) != 4 or bits.get("west", -1) != 8:
		failures.append("N/E/S/W mask convention is not frozen")
	if not rules.has("maskToAtlasTile") or rules.maskToAtlasTile.size() != 16:
		failures.append("rules must contain all sixteen masks")
	if rules.get("schemaVersion") != "first-dungeon-terrain-rules-v2" or rules.get("occupancy", {}).get("algorithmId") != TerrainRules.ALGORITHM_ID or rules.get("chunkEvaluation", {}).get("haloCells") != 1:
		failures.append("portable global-cell occupancy contract is not frozen")
	if rules.get("collision", {}).get("forbidden") != true or rules.get("collision", {}).get("exported") != false:
		failures.append("collision must remain forbidden and unexported")
	if manifest.get("runtimeBoundary", {}).get("webConsumes") != ["exported static PNG", "terrain-rules.json", "terrain-manifest.json"]:
		failures.append("runtime boundary differs from the static export contract")
	if manifest.get("exports", {}).get("fixtures", {}).get("sha256") != FileAccess.get_sha256(OUTPUT_DIR + "/terrain-fixtures-v1.json"):
		failures.append("manifest fixture hash is stale")
	_validate_fixtures(fixtures, failures)
	var tileset_resource: Resource = load("res://terrain/first_dungeon_terrain_tileset.tres")
	if not (tileset_resource is TileSet):
		failures.append("editor TileSet is missing")
	else:
		var tile_source := (tileset_resource as TileSet).get_source(0)
		if not (tile_source is TileSetAtlasSource) or (tile_source as TileSetAtlasSource).get_tiles_count() != 16:
			failures.append("editor TileSet must contain all sixteen atlas cells")
	for source_path in EXPECTED_SOURCE_HASHES:
		var actual := FileAccess.get_sha256("res://" + source_path)
		if actual != EXPECTED_SOURCE_HASHES[source_path]:
			failures.append("source hash mismatch: " + source_path)
	for relative_path in ["terrain-manifest.json", "terrain-rules.json"]:
		if FileAccess.get_file_as_string(OUTPUT_DIR + "/" + relative_path).contains("Downloads"):
			failures.append("export must not reference Downloads: " + relative_path)
	var project_files := _all_project_files("res://")
	for path in project_files:
		if path.ends_with(".tscn") or path.ends_with(".tres"):
			var source := FileAccess.get_file_as_string(path)
			if source.contains("CollisionShape2D") or source.contains("collision_layer") or source.contains("collision_mask"):
				failures.append("collision artifact found: " + path)
	var report := {
		"schemaVersion": "first-dungeon-terrain-qa-v1",
		"atlas": { "sha256": FileAccess.get_sha256(OUTPUT_DIR + "/terrain-atlas-16px.png"), "width": atlas.get_width() if atlas != null else 0, "height": atlas.get_height() if atlas != null else 0, "rgba8": atlas != null and atlas.get_format() == Image.FORMAT_RGBA8 },
		"preview": { "sha256": FileAccess.get_sha256(OUTPUT_DIR + "/terrain-preview-512.png"), "width": preview.get_width() if preview != null else 0, "height": preview.get_height() if preview != null else 0, "rgba8": preview != null and preview.get_format() == Image.FORMAT_RGBA8 },
		"maskCount": rules.get("maskToAtlasTile", []).size(),
		"fixtures": { "sha256": FileAccess.get_sha256(OUTPUT_DIR + "/terrain-fixtures-v1.json"), "chunkCount": fixtures.get("chunks", []).size(), "sharedEdgeCount": fixtures.get("sharedEdges", []).size(), "comparisonSeedChangedCellCount": fixtures.get("recomputation", {}).get("differentSeedChangedCellCount", 0) },
		"sourceHashes": EXPECTED_SOURCE_HASHES,
		"collisions": "none",
		"downloadsReferences": "none",
		"failures": failures,
	}
	var file := FileAccess.open(OUTPUT_DIR + "/terrain-qa-report.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(report, "  ", true) + "\n")
	if failures.is_empty():
		print("E24 terrain-v1 verification passed")
		quit(0)
	else:
		for failure in failures:
			push_error(failure)
		quit(1)

func _validate_fixtures(fixtures: Dictionary, failures: Array[String]) -> void:
	if fixtures.get("battlefieldSeed") != 305419896 or fixtures.get("chunks", []).size() != 3:
		failures.append("fixtures must freeze seed 305419896 and origin/east/south chunks")
		return
	for chunk in fixtures.chunks:
		var origin: Dictionary = chunk.get("globalOriginCell", {})
		var occupancy_rows: Array = chunk.get("occupancyRows", [])
		var mask_rows: Array = chunk.get("maskRowsHex", [])
		if occupancy_rows.size() != 32 or mask_rows.size() != 32:
			failures.append("fixture chunk rows are incomplete: " + str(chunk.get("id")))
			continue
		for local_y in range(32):
			var occupancy_row: String = occupancy_rows[local_y]
			var mask_row: String = mask_rows[local_y]
			if occupancy_row.length() != 32 or mask_row.length() != 32:
				failures.append("fixture row width is not 32: " + str(chunk.get("id")))
				continue
			for local_x in range(32):
				var global_x: int = int(origin.get("x", 0)) + local_x
				var global_y: int = int(origin.get("y", 0)) + local_y
				var expected_occupancy := "1" if TerrainRules.is_stone(fixtures.battlefieldSeed, global_x, global_y) else "0"
				var expected_mask := String.num_int64(TerrainRules.mask_for_global_cell(fixtures.battlefieldSeed, global_x, global_y), 16)
				if occupancy_row.substr(local_x, 1) != expected_occupancy or mask_row.substr(local_x, 1) != expected_mask:
					failures.append("fixture differs from global occupancy contract at %s,%s" % [global_x, global_y])
					return
	for edge in fixtures.get("sharedEdges", []):
		if edge.get("pairCount") != 32 or edge.get("bidirectionalNeighborConsistency") != true or edge.get("pairs", []).size() != 32:
			failures.append("shared-edge fixture is incomplete: " + str(edge.get("orientation")))
			continue
		for pair in edge.pairs:
			var first_cell: Dictionary = pair.get("firstCell", {})
			var second_cell: Dictionary = pair.get("secondCell", {})
			var expected_connection: bool = first_cell.get("stone") == true and second_cell.get("stone") == true
			if pair.get("consistent") != true or first_cell.get("neighborBit") != expected_connection or second_cell.get("neighborBit") != expected_connection:
				failures.append("shared-edge fixture has a directional mismatch: " + str(edge.get("orientation")))
				return
	if fixtures.get("recomputation", {}).get("sameSeedStable") != true or int(fixtures.get("recomputation", {}).get("differentSeedChangedCellCount", 0)) <= 0:
		failures.append("fixture does not prove seed stability and variation")

func _read_json(path: String, failures: Array[String]) -> Dictionary:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if not (parsed is Dictionary):
		failures.append("invalid JSON: " + path)
		return {}
	return parsed

func _all_project_files(path: String) -> Array[String]:
	var files: Array[String] = []
	var dir := DirAccess.open(path)
	if dir == null:
		return files
	dir.list_dir_begin()
	var name := dir.get_next()
	while name != "":
		if name != "." and name != ".." and name != ".godot":
			var child_path := path.path_join(name)
			if dir.current_is_dir():
				files.append_array(_all_project_files(child_path))
			else:
				files.append(child_path)
		name = dir.get_next()
	dir.list_dir_end()
	return files
