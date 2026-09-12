extends SceneTree

const CELL_SIZE := 16
const EDGE_COLOR := Color8(41, 58, 46, 255)
const STONE_MASK_COLOR := Color8(255, 255, 255, 255)
const OUTPUT_DIR := "res://exports/stone-coverage-v2"
const REPORT_PATH := OUTPUT_DIR + "/stone-coverage-audit-v2.json"


func _init() -> void:
	var failures: Array[String] = []
	var entries: Array[Dictionary] = []
	for mask in range(16):
		var path := "%s/stone-coverage-mask-%02d.png" % [OUTPUT_DIR, mask]
		var image := Image.load_from_file(path)
		if image == null:
			failures.append("missing mask %02d" % mask)
			continue
		entries.append(_audit_mask(mask, image, failures))

	var contact_audit := _audit_contacts(entries, failures)
	var report := {
		"schemaVersion": "first-dungeon-stone-coverage-audit-v2",
		"passed": failures.is_empty(),
		"maskCount": entries.size(),
		"failures": failures,
		"masks": entries,
		"boundaryCompatibility": contact_audit,
		"contract": {
			"size": "%dx%d RGBA8" % [CELL_SIZE, CELL_SIZE],
			"edge": "#293A2E / alpha 255 / 2 source pixels / hard / no antialias",
			"stone": "#FFFFFF / alpha 255 / continuous texture sampling only",
			"moss": "alpha 0 / continuous moss texture",
			"contacts": "N/E/S/W connectors are white across a matched neighbor boundary; no edge color crosses that contact",
		},
	}
	var file := FileAccess.open(REPORT_PATH, FileAccess.WRITE)
	file.store_string(JSON.stringify(report, "\t") + "\n")
	file.close()
	if failures.is_empty():
		print("E26 coverage audit passed: ", entries.size(), " masks")
		quit(0)
	else:
		push_error("E26 coverage audit failed: %s" % "; ".join(failures))
		quit(1)


func _audit_mask(mask: int, image: Image, failures: Array[String]) -> Dictionary:
	if image.get_width() != CELL_SIZE or image.get_height() != CELL_SIZE or image.get_format() != Image.FORMAT_RGBA8:
		failures.append("mask %02d must be 16x16 RGBA8" % mask)
	var counts := { "transparent": 0, "stoneCoverage": 0, "mossSideEdge": 0, "other": 0 }
	var edge_distances: Array[int] = []
	for y in range(CELL_SIZE):
		for x in range(CELL_SIZE):
			var pixel := image.get_pixel(x, y)
			if pixel.a8 == 0:
				counts.transparent += 1
			elif pixel == STONE_MASK_COLOR:
				counts.stoneCoverage += 1
			elif pixel == EDGE_COLOR:
				counts.mossSideEdge += 1
				edge_distances.append(_nearest_stone_distance(image, x, y))
			else:
				counts.other += 1
				failures.append("mask %02d has non-contract opaque color at %d,%d" % [mask, x, y])
			if pixel.a8 != 0 and pixel.a8 != 255:
				failures.append("mask %02d has soft alpha at %d,%d" % [mask, x, y])
	if mask == 0 and counts.transparent != CELL_SIZE * CELL_SIZE:
		failures.append("mask 00 must be fully transparent moss")
	if mask == 15 and counts.stoneCoverage != CELL_SIZE * CELL_SIZE:
		failures.append("mask 15 must be fully opaque stone coverage")
	if mask != 0 and mask != 15 and counts.mossSideEdge == 0:
		failures.append("mask %02d has no moss-side edge" % mask)
	for distance in edge_distances:
		if distance < 1 or distance > 2:
			failures.append("mask %02d edge is not 1-2 source pixels from stone" % mask)
	var edge_distance_set: Array[int] = []
	for distance in edge_distances:
		if not edge_distance_set.has(distance):
			edge_distance_set.append(distance)
	edge_distance_set.sort()
	return { "mask": mask, "counts": counts, "edgeDistanceSet": edge_distance_set }


func _nearest_stone_distance(image: Image, x: int, y: int) -> int:
	var nearest := CELL_SIZE * 2
	for candidate_y in range(CELL_SIZE):
		for candidate_x in range(CELL_SIZE):
			if image.get_pixel(candidate_x, candidate_y) == STONE_MASK_COLOR:
				nearest = min(nearest, max(abs(candidate_x - x), abs(candidate_y - y)))
	return nearest


func _audit_contacts(entries: Array[Dictionary], failures: Array[String]) -> Dictionary:
	var checked_contacts := 0
	var checked_shared_stone_samples := 0
	for left_mask in range(16):
		for right_mask in range(16):
			var east_connected := (left_mask & 2) != 0
			var west_connected := (right_mask & 8) != 0
			if east_connected != west_connected:
				continue
			if east_connected:
				var horizontal_result := _assert_contact(left_mask, right_mask, Vector2i(15, 0), Vector2i(0, 0), true, failures)
				checked_contacts += 1
				checked_shared_stone_samples += horizontal_result.shared_stone_samples
	for top_mask in range(16):
		for bottom_mask in range(16):
			var south_connected := (top_mask & 4) != 0
			var north_connected := (bottom_mask & 1) != 0
			if south_connected != north_connected:
				continue
			if south_connected:
				var vertical_result := _assert_contact(top_mask, bottom_mask, Vector2i(0, 15), Vector2i(0, 0), false, failures)
				checked_contacts += 1
				checked_shared_stone_samples += vertical_result.shared_stone_samples
	return {
		"checkedConnectorPairs": checked_contacts,
		"sharedStoneSamples": checked_shared_stone_samples,
		"rule": "all boundary stone samples are white on both matched neighbors; no #293A2E crosses a matched connector",
	}


func _assert_contact(first_mask: int, second_mask: int, first_start: Vector2i, second_start: Vector2i, horizontal: bool, failures: Array[String]) -> Dictionary:
	var first := Image.load_from_file("%s/stone-coverage-mask-%02d.png" % [OUTPUT_DIR, first_mask])
	var second := Image.load_from_file("%s/stone-coverage-mask-%02d.png" % [OUTPUT_DIR, second_mask])
	var shared_stone_samples := 0
	for offset in range(CELL_SIZE):
		var first_position := first_start + (Vector2i(0, offset) if horizontal else Vector2i(offset, 0))
		var second_position := second_start + (Vector2i(0, offset) if horizontal else Vector2i(offset, 0))
		var first_pixel := first.get_pixelv(first_position)
		var second_pixel := second.get_pixelv(second_position)
		if first_pixel == EDGE_COLOR or second_pixel == EDGE_COLOR:
			failures.append("matched contact %02d/%02d contains duplicate moss edge" % [first_mask, second_mask])
			return { "shared_stone_samples": shared_stone_samples }
		if first_pixel == STONE_MASK_COLOR or second_pixel == STONE_MASK_COLOR:
			if first_pixel != STONE_MASK_COLOR or second_pixel != STONE_MASK_COLOR:
				failures.append("matched contact %02d/%02d has discontinuous stone coverage" % [first_mask, second_mask])
				return { "shared_stone_samples": shared_stone_samples }
			shared_stone_samples += 1
	if shared_stone_samples == 0:
		failures.append("matched contact %02d/%02d has no shared stone coverage" % [first_mask, second_mask])
	return { "shared_stone_samples": shared_stone_samples }
