extends CanvasLayer

const INK := Color("#08100b")
const PANEL := Color(0.04, 0.08, 0.06, 0.88)
const PANEL_STRONG := Color(0.07, 0.12, 0.09, 0.94)
const GOLD := Color("#f6c86f")
const LEAF := Color("#9dd5ac")
const PARCHMENT := Color("#f4f0d7")

var status_label: Label

func _ready() -> void:
	var root := Control.new()
	root.name = "中文主页UI"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	_add_hotspots(root)

func _add_hotspots(parent: Control) -> void:
	var hotspots := [
		{ "label": "开始游戏", "rect": Rect2(18, 370, 138, 42) },
		{ "label": "角色选择", "rect": Rect2(18, 416, 138, 42) },
		{ "label": "物品仓库", "rect": Rect2(18, 462, 138, 42) },
		{ "label": "设置", "rect": Rect2(18, 508, 138, 42) },
		{ "label": "铁匠铺", "rect": Rect2(0, 184, 320, 256) },
		{ "label": "猎手之家", "rect": Rect2(328, 136, 278, 262) },
		{ "label": "传送门", "rect": Rect2(608, 176, 136, 216) },
		{ "label": "告示牌", "rect": Rect2(740, 238, 160, 218) },
	]

	for hotspot in hotspots:
		var button := Button.new()
		button.text = ""
		button.tooltip_text = hotspot["label"]
		button.position = hotspot["rect"].position
		button.size = hotspot["rect"].size
		button.flat = true
		button.modulate = Color(1, 1, 1, 0.01)
		button.pressed.connect(_on_menu_pressed.bind(hotspot["label"]))
		parent.add_child(button)

func _add_title(parent: Control) -> void:
	var title := Label.new()
	title.text = "像素地牢猎人"
	title.position = Vector2(0, 28)
	title.size = Vector2(1280, 70)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 46)
	title.add_theme_color_override("font_color", PARCHMENT)
	title.add_theme_color_override("font_shadow_color", INK)
	title.add_theme_constant_override("shadow_offset_x", 4)
	title.add_theme_constant_override("shadow_offset_y", 4)
	parent.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "死亡契约 · 夜林村庄"
	subtitle.position = Vector2(0, 92)
	subtitle.size = Vector2(1280, 28)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 22)
	subtitle.add_theme_color_override("font_color", LEAF)
	parent.add_child(subtitle)

func _add_menu(parent: Control) -> void:
	var panel := PanelContainer.new()
	panel.position = Vector2(48, 470)
	panel.size = Vector2(300, 214)
	panel.add_theme_stylebox_override("panel", _panel_style(PANEL))
	parent.add_child(panel)

	var box := VBoxContainer.new()
	box.name = "菜单按钮"
	box.add_theme_constant_override("separation", 12)
	panel.add_child(box)

	var buttons := [
		"开始游戏",
		"角色选择",
		"物品仓库",
		"设置",
	]
	for label in buttons:
		var button := Button.new()
		button.text = label
		button.custom_minimum_size = Vector2(260, 40)
		button.add_theme_font_size_override("font_size", 22)
		button.add_theme_color_override("font_color", INK)
		button.add_theme_stylebox_override("normal", _button_style(GOLD, Color("#b78034")))
		button.add_theme_stylebox_override("hover", _button_style(Color("#ffe08a"), GOLD))
		button.add_theme_stylebox_override("pressed", _button_style(Color("#ea580c"), Color("#7c2d12")))
		button.pressed.connect(_on_menu_pressed.bind(label))
		box.add_child(button)

func _add_status(parent: Control) -> void:
	var panel := PanelContainer.new()
	panel.position = Vector2(924, 470)
	panel.size = Vector2(300, 150)
	panel.add_theme_stylebox_override("panel", _panel_style(PANEL_STRONG))
	parent.add_child(panel)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	panel.add_child(box)

	var header := Label.new()
	header.text = "当前契约"
	header.add_theme_font_size_override("font_size", 20)
	header.add_theme_color_override("font_color", GOLD)
	box.add_child(header)

	status_label = Label.new()
	status_label.text = "第 1 关 · 死契地牢\n武器：林地短弓\n目标：进入传送门"
	status_label.add_theme_font_size_override("font_size", 22)
	status_label.add_theme_color_override("font_color", PARCHMENT)
	box.add_child(status_label)

func _add_scene_labels(parent: Control) -> void:
	_add_chip(parent, "铁匠铺", Vector2(182, 586), GOLD)
	_add_chip(parent, "猎手之家", Vector2(536, 612), PARCHMENT)
	_add_chip(parent, "传送门", Vector2(892, 610), Color("#d8b4fe"))
	_add_chip(parent, "告示牌", Vector2(1038, 592), Color("#d8c8aa"))
	_add_chip(parent, "篝火", Vector2(612, 650), GOLD)

func _add_chip(parent: Control, text: String, position: Vector2, color: Color) -> void:
	var chip := Label.new()
	chip.text = text
	chip.position = position
	chip.size = Vector2(150, 30)
	chip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	chip.add_theme_font_size_override("font_size", 20)
	chip.add_theme_color_override("font_color", color)
	chip.add_theme_color_override("font_shadow_color", INK)
	chip.add_theme_constant_override("shadow_offset_x", 2)
	chip.add_theme_constant_override("shadow_offset_y", 2)
	chip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(chip)

func _panel_style(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = INK
	style.set_border_width_all(4)
	style.content_margin_left = 18
	style.content_margin_right = 18
	style.content_margin_top = 16
	style.content_margin_bottom = 16
	return style

func _button_style(fill: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(3)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style

func _on_menu_pressed(label: String) -> void:
	if status_label:
		status_label.text = "已选择：" + label + "\n下一步：接入现有 Web 流程\n当前为 Godot 首页原型"
	print("Godot 主页按钮：", label)
