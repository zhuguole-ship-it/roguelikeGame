extends CanvasLayer

const INK := Color("#08100b")
const PANEL := Color(0.04, 0.08, 0.06, 0.88)
const PANEL_STRONG := Color(0.07, 0.12, 0.09, 0.94)
const GOLD := Color("#f6c86f")
const LEAF := Color("#9dd5ac")
const PARCHMENT := Color("#f4f0d7")
const HOTSPOT := Color(0.06, 0.12, 0.09, 0.74)

@onready var title_label: Label = $UIRoot/TitleLabel
@onready var subtitle_label: Label = $UIRoot/SubtitleLabel
@onready var menu_panel: Panel = $UIRoot/MenuPanel
@onready var status_panel: Panel = $UIRoot/StatusPanel
@onready var status_title_label: Label = $UIRoot/StatusPanel/StatusTitleLabel
@onready var status_label: Label = $UIRoot/StatusPanel/StatusLabel

@onready var menu_buttons: Array[Button] = [
	$UIRoot/MenuPanel/StartButton,
	$UIRoot/MenuPanel/CharacterButton,
	$UIRoot/MenuPanel/InventoryButton,
	$UIRoot/MenuPanel/SettingsButton,
]

@onready var hotspot_buttons: Array[Button] = [
	$UIRoot/Hotspots/BlacksmithButton,
	$UIRoot/Hotspots/HunterHomeButton,
	$UIRoot/Hotspots/PortalButton,
	$UIRoot/Hotspots/NoticeBoardButton,
]

func _ready() -> void:
	_apply_default_theme()
	for button in menu_buttons + hotspot_buttons:
		button.pressed.connect(_on_menu_pressed.bind(button.text))

func _apply_default_theme() -> void:
	_style_label(title_label, 46, PARCHMENT, true)
	_style_label(subtitle_label, 22, LEAF, false)
	_style_label(status_title_label, 20, GOLD, false)
	_style_label(status_label, 22, PARCHMENT, false)
	_style_panel(menu_panel, PANEL)
	_style_panel(status_panel, PANEL_STRONG)

	for button in menu_buttons:
		_style_button(button, GOLD, Color("#b78034"), INK)

	for button in hotspot_buttons:
		_style_button(button, HOTSPOT, LEAF, PARCHMENT)

func _style_label(label: Label, size: int, color: Color, shadow: bool) -> void:
	if not label.has_theme_font_size_override("font_size"):
		label.add_theme_font_size_override("font_size", size)
	if not label.has_theme_color_override("font_color"):
		label.add_theme_color_override("font_color", color)
	if shadow:
		if not label.has_theme_color_override("font_shadow_color"):
			label.add_theme_color_override("font_shadow_color", INK)
		if not label.has_theme_constant_override("shadow_offset_x"):
			label.add_theme_constant_override("shadow_offset_x", 4)
		if not label.has_theme_constant_override("shadow_offset_y"):
			label.add_theme_constant_override("shadow_offset_y", 4)

func _style_panel(panel: Panel, color: Color) -> void:
	if not panel.has_theme_stylebox_override("panel"):
		panel.add_theme_stylebox_override("panel", _panel_style(color))

func _style_button(button: Button, fill: Color, border: Color, font_color: Color) -> void:
	if not button.has_theme_font_size_override("font_size"):
		button.add_theme_font_size_override("font_size", 22)
	if not button.has_theme_color_override("font_color"):
		button.add_theme_color_override("font_color", font_color)
	if not button.has_theme_stylebox_override("normal"):
		button.add_theme_stylebox_override("normal", _button_style(fill, border))
	if not button.has_theme_stylebox_override("hover"):
		button.add_theme_stylebox_override("hover", _button_style(fill.lightened(0.16), GOLD))
	if not button.has_theme_stylebox_override("pressed"):
		button.add_theme_stylebox_override("pressed", _button_style(Color("#ea580c"), Color("#7c2d12")))

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
	status_label.text = "已选择：" + label + "\n下一步：接入现有 Web 流程\n当前为 Godot 首页原型"
	print("Godot 主页按钮：", label)
