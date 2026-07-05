extends Node2D

const VIEW_SIZE := Vector2(960, 640)

var elapsed := 0.0
var menu_background: Texture2D

func _ready() -> void:
	var image_path := ProjectSettings.globalize_path("res://assets/village-main-menu-background.png")
	var image := Image.load_from_file(image_path)
	if image:
		menu_background = ImageTexture.create_from_image(image)

func _process(delta: float) -> void:
	elapsed += delta
	queue_redraw()

func _draw() -> void:
	if menu_background:
		draw_texture_rect_region(
			menu_background,
			Rect2(Vector2.ZERO, VIEW_SIZE),
			Rect2(Vector2.ZERO, menu_background.get_size())
		)
		_draw_vignette()
		return

	_draw_sky()
	_draw_far_forest()
	_draw_castle()
	_draw_village_ground()
	_draw_stone_paths()
	_draw_blacksmith()
	_draw_hunter_home()
	_draw_portal()
	_draw_notice_board()
	_draw_campfire()
	_draw_foreground_trees()
	_draw_vignette()

func rect(x: float, y: float, w: float, h: float, color: Color) -> void:
	draw_rect(Rect2(Vector2(round(x), round(y)), Vector2(round(w), round(h))), color)

func _draw_sky() -> void:
	rect(0, 0, VIEW_SIZE.x, VIEW_SIZE.y, Color("#08101d"))
	rect(0, 260, VIEW_SIZE.x, 190, Color("#0b1621"))
	for i in range(95):
		var x := float((i * 73) % int(VIEW_SIZE.x))
		var y := float(22 + (i * 41) % 210)
		var twinkle := 0.55 + sin(elapsed * 1.5 + float(i)) * 0.25
		var star_color := Color(0.72, 0.82, 1.0, twinkle)
		var star_size := 3 if i % 3 == 0 else 2
		rect(x, y, star_size, 2, star_color)
	rect(1015, 58, 64, 64, Color("#e6e0b8"))
	rect(1032, 48, 18, 18, Color("#f5efc9"))
	rect(1062, 78, 14, 14, Color("#b6c0d6"))

func _draw_far_forest() -> void:
	for i in range(34):
		var x := float(i * 42 - 24)
		var height := float(120 + (i * 19) % 80)
		var color := Color("#102b28") if i % 2 == 0 else Color("#0d2423")
		draw_polygon([
			Vector2(x, 360),
			Vector2(x + 28, 360 - height),
			Vector2(x + 58, 360),
		], [color])
		rect(x + 24, 345 - height * 0.25, 9, 55, Color("#112018"))
	rect(0, 344, VIEW_SIZE.x, 34, Color("#0b1e1b"))
	rect(0, 376, VIEW_SIZE.x, 78, Color("#0a1712"))

func _draw_castle() -> void:
	var base_x := 872.0
	var base_y := 278.0
	rect(base_x, base_y - 72, 160, 72, Color("#12182a"))
	rect(base_x + 16, base_y - 108, 34, 108, Color("#11172b"))
	rect(base_x + 106, base_y - 122, 36, 122, Color("#11172b"))
	rect(base_x + 58, base_y - 94, 54, 94, Color("#151d32"))
	for i in range(5):
		rect(base_x + 14 + i * 28, base_y - 80, 12, 10, Color("#23304a"))
	rect(base_x + 28, base_y - 110, 14, 8, Color("#33415f"))
	rect(base_x + 118, base_y - 124, 14, 8, Color("#33415f"))
	rect(base_x + 76, base_y - 45, 10, 18, Color("#f1c46b"))
	rect(base_x + 124, base_y - 58, 8, 16, Color("#f1c46b"))
	rect(base_x - 28, base_y + 2, 220, 14, Color("#08101d"))

func _draw_village_ground() -> void:
	rect(0, 418, VIEW_SIZE.x, 302, Color("#0f2118"))
	rect(0, 560, VIEW_SIZE.x, 160, Color("#132719"))
	for i in range(60):
		var x := float((i * 53) % int(VIEW_SIZE.x))
		var y := float(430 + (i * 31) % 270)
		var color := Color("#1c3823") if i % 2 == 0 else Color("#18301f")
		rect(x, y, 12, 4, color)

func _draw_stone_paths() -> void:
	var stones := [
		Rect2(575, 520, 130, 32), Rect2(548, 555, 176, 36), Rect2(512, 594, 236, 44),
		Rect2(438, 632, 380, 50), Rect2(300, 580, 260, 36), Rect2(710, 574, 248, 36),
		Rect2(418, 515, 130, 30), Rect2(744, 514, 142, 30)
	]
	for stone in stones:
		rect(stone.position.x, stone.position.y, stone.size.x, stone.size.y, Color("#5a5547"))
		rect(stone.position.x + 6, stone.position.y + 6, stone.size.x - 12, stone.size.y - 12, Color("#7b7161"))
	for i in range(90):
		var x := float(360 + (i * 37) % 560)
		var y := float(510 + (i * 23) % 160)
		rect(x, y, 5, 3, Color("#a09377") if i % 2 == 0 else Color("#433d35"))

func _draw_blacksmith() -> void:
	var x := 88.0
	var y := 394.0
	rect(x + 26, y + 114, 288, 42, Color(0, 0, 0, 0.24))
	rect(x + 34, y + 28, 244, 130, Color("#30231a"))
	rect(x + 20, y + 58, 270, 24, Color("#5b3421"))
	rect(x + 44, y + 46, 220, 20, Color("#8b522d"))
	draw_polygon([Vector2(x + 12, y + 58), Vector2(x + 150, y - 32), Vector2(x + 306, y + 58)], [Color("#1d1716")])
	rect(x + 55, y + 86, 62, 72, Color("#15100d"))
	rect(x + 65, y + 98, 42, 42, Color("#ff6b1a"))
	rect(x + 72, y + 105, 28, 24, Color("#ffd15c"))
	rect(x + 185, y + 91, 56, 67, Color("#191311"))
	rect(x + 194, y + 100, 38, 26, Color("#ff9a2e"))
	rect(x + 210, y + 76, 28, 10, Color("#6b7280"))
	rect(x + 216, y + 65, 16, 14, Color("#9ca3af"))
	for i in range(18):
		var sx := x + 72 + float((i * 19) % 150)
		var sy := y + 60 + float((i * 31) % 76)
		rect(sx, sy, 3, 3, Color("#ffcc55") if i % 2 == 0 else Color("#ff4d1f"))
	_label("铁匠铺", Vector2(x + 112, y + 176), Color("#f6c86f"))

func _draw_hunter_home() -> void:
	var x := 420.0
	var y := 346.0
	rect(x + 16, y + 168, 330, 42, Color(0, 0, 0, 0.22))
	rect(x + 42, y + 64, 270, 150, Color("#2b2118"))
	for i in range(8):
		rect(x + 50, y + 78 + i * 16, 254, 4, Color("#4a3424"))
	draw_polygon([Vector2(x + 18, y + 70), Vector2(x + 176, y - 28), Vector2(x + 336, y + 70)], [Color("#1a1514")])
	rect(x + 68, y + 102, 56, 45, Color("#f2b85b"))
	rect(x + 76, y + 110, 40, 29, Color("#fff1a7"))
	rect(x + 226, y + 104, 56, 44, Color("#f2b85b"))
	rect(x + 234, y + 112, 40, 28, Color("#fff1a7"))
	rect(x + 155, y + 126, 60, 88, Color("#130f0c"))
	rect(x + 169, y + 138, 32, 16, Color("#6b4b2b"))
	rect(x + 148, y + 80, 76, 14, Color("#80553a"))
	rect(x + 168, y + 70, 36, 12, Color("#d8c8aa"))
	_label("猎手之家", Vector2(x + 120, y + 232), Color("#f4f0d7"))

func _draw_portal() -> void:
	var x := 928.0
	var y := 394.0
	var pulse := 0.5 + sin(elapsed * 2.6) * 0.18
	rect(x - 76, y + 118, 160, 34, Color(0, 0, 0, 0.27))
	rect(x - 58, y + 14, 122, 146, Color("#35354d"))
	rect(x - 48, y + 24, 102, 126, Color("#161226"))
	rect(x - 38, y + 34, 82, 106, Color(0.42, 0.13, 0.82, 0.72 + pulse * 0.2))
	rect(x - 24, y + 48, 54, 78, Color(0.64, 0.25, 1.0, 0.58 + pulse * 0.24))
	rect(x - 9, y + 26, 18, 120, Color(0.88, 0.78, 1.0, 0.35 + pulse * 0.22))
	rect(x - 67, y + 5, 140, 16, Color("#718096"))
	rect(x - 68, y + 148, 142, 16, Color("#1e293b"))
	for i in range(11):
		var angle := elapsed * 1.15 + i * 0.62
		var rx := x + cos(angle) * 52.0
		var ry := y + 82 + sin(angle) * 66.0
		rect(rx, ry, 5, 5, Color("#d8b4fe") if i % 2 == 0 else Color("#7dd3fc"))
	_label("传送门", Vector2(x - 34, y + 190), Color("#d8b4fe"))

func _draw_notice_board() -> void:
	var x := 1086.0
	var y := 412.0
	rect(x - 48, y + 106, 112, 26, Color(0, 0, 0, 0.24))
	rect(x - 7, y + 46, 14, 88, Color("#3a2416"))
	rect(x - 60, y, 132, 72, Color("#3a2416"))
	rect(x - 52, y + 8, 116, 56, Color("#6b4426"))
	rect(x - 40, y + 18, 42, 34, Color("#d8c8aa"))
	rect(x + 12, y + 18, 40, 30, Color("#bfa982"))
	for i in range(6):
		rect(x - 34 + i * 16, y + 24 + (i % 2) * 12, 10, 3, Color("#3a2416"))
	_label("告示牌", Vector2(x - 36, y + 152), Color("#d8c8aa"))

func _draw_campfire() -> void:
	var x := 646.0
	var y := 522.0
	var pulse := 0.58 + sin(elapsed * 5.0) * 0.2
	draw_circle(Vector2(x, y + 22), 82, Color(1.0, 0.45, 0.06, 0.08 + pulse * 0.07))
	rect(x - 68, y + 58, 136, 18, Color(0, 0, 0, 0.2))
	rect(x - 42, y + 50, 84, 12, Color("#4a2a16"))
	rect(x - 34, y + 42, 68, 10, Color("#7a4520"))
	rect(x - 19, y + 8, 38, 46, Color("#ff7a1a"))
	rect(x - 11, y - 8, 22, 50, Color("#ffd15c"))
	rect(x - 5, y + 9, 10, 28, Color("#fff3a3"))
	rect(x - 30, y + 46, 24, 8, Color("#2b1b12"))
	rect(x + 8, y + 48, 26, 8, Color("#2b1b12"))
	for i in range(12):
		var sx := x - 50 + float((i * 17) % 100)
		var sy := y - 8 + float((i * 23) % 52)
		rect(sx, sy, 3, 3, Color("#ffcc55") if i % 2 == 0 else Color("#ff5a1f"))
	_label("篝火", Vector2(x - 24, y + 104), Color("#f6c86f"))

func _draw_foreground_trees() -> void:
	for i in range(13):
		var x := float(-28 + i * 112)
		var y := float(560 + (i % 3) * 26)
		rect(x + 24, y - 55, 14, 85, Color("#1e2418"))
		draw_polygon([Vector2(x - 16, y - 35), Vector2(x + 32, y - 132), Vector2(x + 82, y - 35)], [Color("#123225")])
		draw_polygon([Vector2(x - 5, y - 80), Vector2(x + 32, y - 158), Vector2(x + 70, y - 80)], [Color("#183d2b")])
		draw_polygon([Vector2(x + 5, y - 118), Vector2(x + 32, y - 176), Vector2(x + 58, y - 118)], [Color("#1f5135")])

func _draw_vignette() -> void:
	rect(0, 0, VIEW_SIZE.x, 34, Color(0, 0, 0, 0.2))
	rect(0, VIEW_SIZE.y - 44, VIEW_SIZE.x, 44, Color(0, 0, 0, 0.24))
	rect(0, 0, 36, VIEW_SIZE.y, Color(0, 0, 0, 0.18))
	rect(VIEW_SIZE.x - 36, 0, 36, VIEW_SIZE.y, Color(0, 0, 0, 0.18))

func _label(text: String, pos: Vector2, color: Color) -> void:
	var font := ThemeDB.fallback_font
	draw_string(font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, 24, color)
