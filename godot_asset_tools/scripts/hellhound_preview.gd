@tool
extends Node2D

const ACTIONS := [
	{ "name": "idle", "fps": 8.0, "loop": true },
	{ "name": "move", "fps": 8.0, "loop": true },
	{ "name": "attack", "fps": 8.0, "loop": false },
	{ "name": "skill_1", "fps": 7.0, "loop": false },
	{ "name": "hit", "fps": 6.0, "loop": false },
	{ "name": "death", "fps": 5.0, "loop": false },
]

@export_enum("idle", "move", "attack", "skill_1", "hit", "death") var preview_action := "idle":
	set(value):
		preview_action = value
		_play_preview_action()

@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var action_label: Label = $CanvasLayer/Panel/ActionLabel
@onready var anchor_label: Label = $CanvasLayer/Panel/AnchorLabel

func _ready() -> void:
	_load_sprite_frames()
	_play_preview_action()
	_update_anchor_label()

func _load_sprite_frames() -> void:
	if animated_sprite == null:
		return
	var sprite_frames := SpriteFrames.new()
	for action in ACTIONS:
		var action_name := String(action.name)
		sprite_frames.add_animation(action_name)
		sprite_frames.set_animation_speed(action_name, float(action.fps))
		sprite_frames.set_animation_loop(action_name, bool(action.loop))
		for frame_index in range(1, 100):
			var frame_path := "res://assets/developer-assets/dungeon-hellhound/%s/frame_%02d.png" % [action_name, frame_index]
			if not ResourceLoader.exists(frame_path):
				break
			var texture := load(frame_path)
			if texture is Texture2D:
				sprite_frames.add_frame(action_name, texture)
	animated_sprite.sprite_frames = sprite_frames

func _play_preview_action() -> void:
	if animated_sprite == null or animated_sprite.sprite_frames == null:
		return
	if not animated_sprite.sprite_frames.has_animation(preview_action):
		return
	animated_sprite.play(preview_action)
	if action_label:
		action_label.text = "动作：" + preview_action

func _process(_delta: float) -> void:
	if Engine.is_editor_hint():
		_update_anchor_label()

func _update_anchor_label() -> void:
	if anchor_label == null:
		return
	var anchors := [
		"body " + _marker_text($Anchors/Body),
		"mouth " + _marker_text($Anchors/Mouth),
		"cast " + _marker_text($Anchors/Cast),
		"projectile " + _marker_text($Anchors/ProjectileSpawn),
	]
	anchor_label.text = "\n".join(anchors)

func _marker_text(marker: Marker2D) -> String:
	var normalized := Vector2(
		clampf((marker.position.x + 32.0) / 64.0, 0.0, 1.0),
		clampf((marker.position.y + 32.0) / 64.0, 0.0, 1.0),
	)
	return "(%.2f, %.2f)" % [normalized.x, normalized.y]
