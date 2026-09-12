extends SceneTree

const TerrainRules = preload("res://scripts/terrain_rule_contract.gd")
const CELL_SIZE := 16
const CHUNK_CELLS := 32
const CHUNK_PIXELS := CELL_SIZE * CHUNK_CELLS
const ATLAS_COLUMNS := 4
const ATLAS_ROWS := 4
const TERRAIN_SET_INDEX := 0
const STONE_TERRAIN_INDEX := 0
const FIXTURE_SEED := 305419896
const FIXTURE_COMPARE_SEED := 2271560481
const FIXTURE_ORIGINS := {
	"origin": Vector2i(0, 0),
	"east": Vector2i(CHUNK_CELLS, 0),
	"south": Vector2i(0, CHUNK_CELLS),
}
const SOURCE_PATHS := {
	"stone": "res://sources/stone/1.jpg",
	"moss": "res://sources/moss/2.jpg",
}
const OUTPUT_DIR := "res://exports/terrain-v1"
const ATLAS_PATH := OUTPUT_DIR + "/terrain-atlas-16px.png"
const PREVIEW_PATH := OUTPUT_DIR + "/terrain-preview-512.png"
const EAST_PREVIEW_PATH := OUTPUT_DIR + "/terrain-preview-east-512.png"
const SOUTH_PREVIEW_PATH := OUTPUT_DIR + "/terrain-preview-south-512.png"
const RULES_PATH := OUTPUT_DIR + "/terrain-rules.json"
const FIXTURES_PATH := OUTPUT_DIR + "/terrain-fixtures-v1.json"
const MANIFEST_PATH := OUTPUT_DIR + "/terrain-manifest.json"
const TILESET_PATH := "res://terrain/first_dungeon_terrain_tileset.tres"

func _init() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUTPUT_DIR))
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://terrain"))
	var stone := Image.load_from_file(SOURCE_PATHS.stone)
	var moss := Image.load_from_file(SOURCE_PATHS.moss)
	if stone == null or moss == null:
		push_error("E24 terrain export needs both controlled source images.")
		quit(1)
		return
	stone.convert(Image.FORMAT_RGBA8)
	moss.convert(Image.FORMAT_RGBA8)
	var atlas := _build_atlas(stone, moss)
	var save_atlas_error := atlas.save_png(ATLAS_PATH)
	if save_atlas_error != OK:
		push_error("Could not save terrain atlas: %s" % save_atlas_error)
		quit(1)
		return
	var preview := _build_preview(atlas, FIXTURE_SEED, FIXTURE_ORIGINS.origin)
	var save_preview_error := preview.save_png(PREVIEW_PATH)
	if save_preview_error != OK:
		push_error("Could not save terrain preview: %s" % save_preview_error)
		quit(1)
		return
	var east_preview := _build_preview(atlas, FIXTURE_SEED, FIXTURE_ORIGINS.east)
	var south_preview := _build_preview(atlas, FIXTURE_SEED, FIXTURE_ORIGINS.south)
	if east_preview.save_png(EAST_PREVIEW_PATH) != OK or south_preview.save_png(SOUTH_PREVIEW_PATH) != OK:
		push_error("Could not save cross-chunk fixture previews.")
		quit(1)
		return
	var rules := _build_rules()
	_write_stable_json(RULES_PATH, rules)
	var fixtures := _build_fixtures()
	_write_stable_json(FIXTURES_PATH, fixtures)
	_create_tileset(ATLAS_PATH)
	var manifest := _build_manifest(rules)
	_write_stable_json(MANIFEST_PATH, manifest)
	print("E24 terrain-v1 export written: ", OUTPUT_DIR)
	quit(0)

func _build_atlas(stone: Image, moss: Image) -> Image:
	var atlas := Image.create(CELL_SIZE * ATLAS_COLUMNS, CELL_SIZE * ATLAS_ROWS, false, Image.FORMAT_RGBA8)
	for mask in range(16):
		var origin := Vector2i((mask % ATLAS_COLUMNS) * CELL_SIZE, (mask / ATLAS_COLUMNS) * CELL_SIZE)
		for y in range(CELL_SIZE):
			for x in range(CELL_SIZE):
				var color := _sample_source(moss, x, y, 0)
				if _is_stone_pixel(mask, x, y):
					color = _sample_source(stone, x, y, mask)
				atlas.set_pixel(origin.x + x, origin.y + y, color)
	return atlas

func _sample_source(source: Image, x: int, y: int, variant: int) -> Color:
	var sample_x := posmod(variant * 31 + x * 29 + y * 7, source.get_width())
	var sample_y := posmod(variant * 47 + y * 31 + x * 5, source.get_height())
	return source.get_pixel(sample_x, sample_y)

func _is_stone_pixel(mask: int, x: int, y: int) -> bool:
	if mask == 0:
		return false
	if mask == 15:
		return true
	var center_x := 7
	var center_y := 7
	var core: bool = abs(x - center_x) + abs(y - center_y) <= 7
	var north: bool = (mask & TerrainRules.MASK_NORTH) != 0 and y <= 7 and x >= 3 and x <= 12
	var east: bool = (mask & TerrainRules.MASK_EAST) != 0 and x >= 7 and y >= 3 and y <= 12
	var south: bool = (mask & TerrainRules.MASK_SOUTH) != 0 and y >= 7 and x >= 3 and x <= 12
	var west: bool = (mask & TerrainRules.MASK_WEST) != 0 and x <= 7 and y >= 3 and y <= 12
	return core or north or east or south or west

func _build_preview(atlas: Image, battlefield_seed: int, global_origin: Vector2i) -> Image:
	var preview := Image.create(CHUNK_PIXELS, CHUNK_PIXELS, false, Image.FORMAT_RGBA8)
	for cell_y in range(CHUNK_CELLS):
		for cell_x in range(CHUNK_CELLS):
			var global_cell_x := global_origin.x + cell_x
			var global_cell_y := global_origin.y + cell_y
			var mask := TerrainRules.mask_for_global_cell(battlefield_seed, global_cell_x, global_cell_y)
			var tile_origin := Vector2i((mask % ATLAS_COLUMNS) * CELL_SIZE, (mask / ATLAS_COLUMNS) * CELL_SIZE)
			preview.blit_rect(atlas, Rect2i(tile_origin, Vector2i(CELL_SIZE, CELL_SIZE)), Vector2i(cell_x * CELL_SIZE, cell_y * CELL_SIZE))
	return preview

func _build_rules() -> Dictionary:
	var tiles := []
	for mask in range(16):
		tiles.append({
			"mask": mask,
			"atlas": { "x": mask % ATLAS_COLUMNS, "y": mask / ATLAS_COLUMNS },
			"neighbors": { "north": (mask & TerrainRules.MASK_NORTH) != 0, "east": (mask & TerrainRules.MASK_EAST) != 0, "south": (mask & TerrainRules.MASK_SOUTH) != 0, "west": (mask & TerrainRules.MASK_WEST) != 0 },
		})
	return {
		"schemaVersion": "first-dungeon-terrain-rules-v2",
		"ruleVersion": 2,
		"cellSize": CELL_SIZE,
		"chunkPixels": CHUNK_PIXELS,
		"chunkCells": CHUNK_CELLS,
		"bitOrder": ["north", "east", "south", "west"],
		"bitValues": { "north": TerrainRules.MASK_NORTH, "east": TerrainRules.MASK_EAST, "south": TerrainRules.MASK_SOUTH, "west": TerrainRules.MASK_WEST },
		"maskToAtlasTile": tiles,
		"occupancy": TerrainRules.rule_spec(),
		"chunkEvaluation": { "globalCellCoordinates": true, "haloCells": 1, "chunkBoundary": "Evaluate N/E/S/W with the same global function outside the local 32x32 range; never substitute false at a boundary." },
		"collision": { "forbidden": true, "exported": false, "semantic": "visual-only" },
	}

func _build_fixtures() -> Dictionary:
	var chunks := []
	for chunk_id in ["origin", "east", "south"]:
		chunks.append(_build_chunk_fixture(chunk_id, FIXTURE_ORIGINS[chunk_id]))
	return {
		"schemaVersion": "first-dungeon-terrain-fixtures-v1",
		"fixtureVersion": 1,
		"battlefieldSeed": FIXTURE_SEED,
		"chunkCells": CHUNK_CELLS,
		"haloCells": 1,
		"chunks": chunks,
		"sharedEdges": [_shared_edge_fixture("origin", "east", "east-west"), _shared_edge_fixture("origin", "south", "north-south")],
		"recomputation": { "sameSeedStable": true, "comparisonSeed": FIXTURE_COMPARE_SEED, "differentSeedChangedCellCount": _different_seed_cell_count() },
	}

func _build_chunk_fixture(chunk_id: String, global_origin: Vector2i) -> Dictionary:
	var occupancy_rows := []
	var mask_rows := []
	for cell_y in range(CHUNK_CELLS):
		var occupancy_row := ""
		var mask_row := ""
		for cell_x in range(CHUNK_CELLS):
			var global_x := global_origin.x + cell_x
			var global_y := global_origin.y + cell_y
			occupancy_row += "1" if TerrainRules.is_stone(FIXTURE_SEED, global_x, global_y) else "0"
			mask_row += String.num_int64(TerrainRules.mask_for_global_cell(FIXTURE_SEED, global_x, global_y), 16)
		occupancy_rows.append(occupancy_row)
		mask_rows.append(mask_row)
	return { "id": chunk_id, "globalOriginCell": { "x": global_origin.x, "y": global_origin.y }, "occupancyRows": occupancy_rows, "maskRowsHex": mask_rows }

func _shared_edge_fixture(first_id: String, second_id: String, orientation: String) -> Dictionary:
	var first_origin: Vector2i = FIXTURE_ORIGINS[first_id]
	var second_origin: Vector2i = FIXTURE_ORIGINS[second_id]
	var pairs := []
	var all_consistent := true
	for index in range(CHUNK_CELLS):
		var first_coordinate := Vector2i(first_origin.x + (CHUNK_CELLS - 1 if orientation == "east-west" else index), first_origin.y + (index if orientation == "east-west" else CHUNK_CELLS - 1))
		var second_coordinate := Vector2i(second_origin.x + (0 if orientation == "east-west" else index), second_origin.y + (index if orientation == "east-west" else 0))
		var first_mask := TerrainRules.mask_for_global_cell(FIXTURE_SEED, first_coordinate.x, first_coordinate.y)
		var second_mask := TerrainRules.mask_for_global_cell(FIXTURE_SEED, second_coordinate.x, second_coordinate.y)
		var first_neighbor_bit := (first_mask & (TerrainRules.MASK_EAST if orientation == "east-west" else TerrainRules.MASK_SOUTH)) != 0
		var second_neighbor_bit := (second_mask & (TerrainRules.MASK_WEST if orientation == "east-west" else TerrainRules.MASK_NORTH)) != 0
		var first_occupancy := TerrainRules.is_stone(FIXTURE_SEED, first_coordinate.x, first_coordinate.y)
		var second_occupancy := TerrainRules.is_stone(FIXTURE_SEED, second_coordinate.x, second_coordinate.y)
		# A moss cell has mask 0, so an opposing bit is present only when both
		# cells are stone.  This is the bidirectional, seam-free adjacency rule.
		var expected_connection := first_occupancy and second_occupancy
		var consistent := first_neighbor_bit == expected_connection and second_neighbor_bit == expected_connection
		all_consistent = all_consistent and consistent
		pairs.append({ "index": index, "firstCell": { "x": first_coordinate.x, "y": first_coordinate.y, "stone": first_occupancy, "mask": first_mask, "neighborBit": first_neighbor_bit }, "secondCell": { "x": second_coordinate.x, "y": second_coordinate.y, "stone": second_occupancy, "mask": second_mask, "neighborBit": second_neighbor_bit }, "consistent": consistent })
	return { "firstChunk": first_id, "secondChunk": second_id, "orientation": orientation, "pairCount": CHUNK_CELLS, "bidirectionalNeighborConsistency": all_consistent, "pairs": pairs }

func _different_seed_cell_count() -> int:
	var changed := 0
	for cell_y in range(CHUNK_CELLS):
		for cell_x in range(CHUNK_CELLS):
			if TerrainRules.is_stone(FIXTURE_SEED, cell_x, cell_y) != TerrainRules.is_stone(FIXTURE_COMPARE_SEED, cell_x, cell_y):
				changed += 1
	return changed

func _create_tileset(atlas_path: String) -> void:
	var tileset := TileSet.new()
	tileset.tile_size = Vector2i(CELL_SIZE, CELL_SIZE)
	tileset.add_terrain_set(TERRAIN_SET_INDEX)
	tileset.set_terrain_set_mode(TERRAIN_SET_INDEX, TileSet.TERRAIN_MODE_MATCH_SIDES)
	tileset.add_terrain(TERRAIN_SET_INDEX)
	var atlas_source := TileSetAtlasSource.new()
	# The PNG is produced in this same headless process, before Godot's editor
	# import cache exists.  Build the editor-only texture directly from those
	# bytes so the TileSet has no import-timing dependency.
	var atlas_image := Image.load_from_file(atlas_path)
	atlas_source.texture = ImageTexture.create_from_image(atlas_image)
	atlas_source.texture_region_size = Vector2i(CELL_SIZE, CELL_SIZE)
	for mask in range(16):
		var coords := Vector2i(mask % ATLAS_COLUMNS, mask / ATLAS_COLUMNS)
		atlas_source.create_tile(coords)
		var tile_data := atlas_source.get_tile_data(coords, 0)
		tile_data.set_terrain_set(TERRAIN_SET_INDEX)
		tile_data.set_terrain(STONE_TERRAIN_INDEX)
		tile_data.set_terrain_peering_bit(TileSet.CELL_NEIGHBOR_TOP_SIDE, STONE_TERRAIN_INDEX if (mask & TerrainRules.MASK_NORTH) != 0 else -1)
		tile_data.set_terrain_peering_bit(TileSet.CELL_NEIGHBOR_RIGHT_SIDE, STONE_TERRAIN_INDEX if (mask & TerrainRules.MASK_EAST) != 0 else -1)
		tile_data.set_terrain_peering_bit(TileSet.CELL_NEIGHBOR_BOTTOM_SIDE, STONE_TERRAIN_INDEX if (mask & TerrainRules.MASK_SOUTH) != 0 else -1)
		tile_data.set_terrain_peering_bit(TileSet.CELL_NEIGHBOR_LEFT_SIDE, STONE_TERRAIN_INDEX if (mask & TerrainRules.MASK_WEST) != 0 else -1)
	tileset.add_source(atlas_source, 0)
	var save_error := ResourceSaver.save(tileset, TILESET_PATH)
	if save_error != OK:
		push_error("Could not save TileSet: %s" % save_error)

func _build_manifest(rules: Dictionary) -> Dictionary:
	return {
		"manifestVersion": "first-dungeon-terrain-manifest-v2",
		"schemaVersion": "first-dungeon-terrain-export-v1",
		"campaign": 1,
		"appliesTo": ["infinite", "boss-arena"],
		"sources": [
			{ "path": "sources/stone/1.jpg", "sha256": FileAccess.get_sha256(SOURCE_PATHS.stone), "role": "stone" },
			{ "path": "sources/moss/2.jpg", "sha256": FileAccess.get_sha256(SOURCE_PATHS.moss), "role": "moss" },
		],
		"exports": {
			"atlas": { "path": "exports/terrain-v1/terrain-atlas-16px.png", "sha256": FileAccess.get_sha256(ATLAS_PATH), "width": 64, "height": 64, "format": "RGBA8", "cellSize": CELL_SIZE, "columns": ATLAS_COLUMNS, "rows": ATLAS_ROWS, "mipmaps": false, "filter": "nearest" },
			"preview": { "path": "exports/terrain-v1/terrain-preview-512.png", "sha256": FileAccess.get_sha256(PREVIEW_PATH), "width": CHUNK_PIXELS, "height": CHUNK_PIXELS, "format": "RGBA8", "filter": "nearest", "battlefieldSeed": FIXTURE_SEED, "globalOriginCell": { "x": 0, "y": 0 } },
			"fixturePreviews": [{ "path": "exports/terrain-v1/terrain-preview-east-512.png", "sha256": FileAccess.get_sha256(EAST_PREVIEW_PATH), "globalOriginCell": { "x": CHUNK_CELLS, "y": 0 } }, { "path": "exports/terrain-v1/terrain-preview-south-512.png", "sha256": FileAccess.get_sha256(SOUTH_PREVIEW_PATH), "globalOriginCell": { "x": 0, "y": CHUNK_CELLS } }],
			"rules": { "path": "exports/terrain-v1/terrain-rules.json", "sha256": FileAccess.get_sha256(RULES_PATH) },
			"fixtures": { "path": "exports/terrain-v1/terrain-fixtures-v1.json", "sha256": FileAccess.get_sha256(FIXTURES_PATH), "schemaVersion": "first-dungeon-terrain-fixtures-v1" },
			"tileset": { "path": "terrain/first_dungeon_terrain_tileset.tres", "tileCount": 16, "cellSize": CELL_SIZE, "terrainMode": "n/e/s/w-sides" },
		},
		"runtimeBoundary": {
			"webConsumes": ["exported static PNG", "terrain-rules.json", "terrain-manifest.json"],
			"neverConsumes": ["Godot runtime", "Godot Web/WASM", "GDScript", "collision"],
			"presentationOnly": true,
		},
		"fallback": { "preserve": "assets/tiles/dungeon-floor-level1-128-image2.png", "when": "terrain export is unavailable or fails resource/performance validation" },
		"stability": { "deterministic": true, "generatedAtExcludedFromStableHash": true },
	}

func _write_stable_json(path: String, value: Variant) -> void:
	var file := FileAccess.open(path, FileAccess.WRITE)
	file.store_string(JSON.stringify(value, "  ", true) + "\n")
