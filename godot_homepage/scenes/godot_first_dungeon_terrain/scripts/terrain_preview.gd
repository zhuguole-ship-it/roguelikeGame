extends Node2D

const PREVIEW_PATH := "res://exports/terrain-v1/terrain-preview-512.png"

func _ready() -> void:
	var preview := Sprite2D.new()
	preview.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	preview.texture = load(PREVIEW_PATH)
	preview.position = Vector2(256, 256)
	add_child(preview)
