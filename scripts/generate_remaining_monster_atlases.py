from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "monsters"


def rect(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str) -> None:
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=fill)


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None) -> None:
    draw.ellipse(box, fill=fill, outline=outline)


def poly(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], fill: str, outline: str | None = None) -> None:
    draw.polygon(points, fill=fill)
    if outline:
        draw.line(points + [points[0]], fill=outline, width=1)


def spark(draw: ImageDraw.ImageDraw, x: int, y: int, fill: str, size: int = 2) -> None:
    rect(draw, x, y, size, max(1, size - 1), fill)


def make_sheet(frames: list[Image.Image], frame_size: int, sheet_name: str, preview_name: str, rows: list[int]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (len(frames) * frame_size, frame_size), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * frame_size, 0))
    sheet.save(OUT_DIR / sheet_name)

    scale = 4 if frame_size == 32 else 3 if frame_size == 64 else 2
    gap = 5
    pad = 8
    width = max(rows) * (frame_size * scale + gap) - gap + pad * 2
    height = len(rows) * (frame_size * scale + gap) - gap + pad * 2
    preview = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    cursor = 0
    y = pad
    for count in rows:
        for col in range(count):
            enlarged = frames[cursor].resize((frame_size * scale, frame_size * scale), Image.Resampling.NEAREST)
            preview.alpha_composite(enlarged, (pad + col * (frame_size * scale + gap), y))
            cursor += 1
        y += frame_size * scale + gap
    preview.save(OUT_DIR / preview_name)


def draw_ooze(index: int, action: str) -> Image.Image:
    size = 32
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ground = 25
    bob = [0, -1, 0, 1, 0][index % 5]
    core = "#7fb51f"
    dark = "#17270b"
    mid = "#5f8f16"
    acid = "#b6ef38"
    eye = "#a1007d"

    if action == "death":
        height = max(3, 12 - index * 2)
        ellipse(draw, (6 + index, ground - height, 26 - index, ground + 2), dark)
        ellipse(draw, (8 + index, ground - height + 1, 24 - index, ground + 1), mid)
        for mote in range(7):
            spark(draw, 5 + mote * 4, ground - 4 - (mote % 3) * max(1, 4 - index), acid if mote % 2 else core, 2)
        return image

    width = 19 + (index % 2 if action != "hit" else -2)
    height = 15 + (-1 if action == "hit" else 0)
    if action == "attack":
        split = min(7, index * 2)
        ellipse(draw, (5 - split // 2, ground - height + bob, 21 - split, ground + 1), dark)
        ellipse(draw, (7 - split // 2, ground - height + 1 + bob, 20 - split, ground), core)
        ellipse(draw, (13 + split, ground - height + 2, 27 + split // 2, ground), dark)
        ellipse(draw, (14 + split, ground - height + 3, 25 + split // 2, ground - 1), mid)
        rect(draw, 16, ground - 11, max(2, 8 - index), 2, acid)
        ellipse(draw, (21 + split, ground - 10, 27 + split, ground - 5), acid, dark)
    else:
        ellipse(draw, (6, ground - height + bob, 26, ground + 1), dark)
        ellipse(draw, (8, ground - height + 1 + bob, 24, ground), core)
        ellipse(draw, (11, ground - height + 5 + bob, 21, ground - 1), mid)
        if action == "hit":
            rect(draw, 7, ground - 13, 18, 2, acid)
            for mote in range(8):
                spark(draw, 5 + mote * 3, 12 + (mote % 4), acid, 2)

    ellipse(draw, (15, ground - 14 + bob, 21, ground - 8 + bob), eye, dark)
    rect(draw, 17, ground - 12 + bob, 2, 2, "#f5d0fe")
    for bubble in range(5):
        bx = 8 + bubble * 4 + (index % 2)
        by = ground - 17 - (bubble % 3) + bob
        spark(draw, bx, by, acid if bubble % 2 else "#d9f99d", 2)
    rect(draw, 8, ground + 1, 17, 1, "#07110b")
    return image


def draw_fire_sac(index: int, action: str) -> Image.Image:
    size = 32
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ground = 25
    dark = "#1b0806"
    shell = "#54210d"
    ember = "#f97316"
    hot = "#fff0a3"

    if action == "death":
        radius = max(2, 12 - index * 2)
        ellipse(draw, (16 - radius, ground - radius, 16 + radius, ground + radius // 3), "#7c2d12", dark)
        for ray in range(12):
            x = 16 + (ray - 6) * (index + 1)
            y = ground - 7 - (ray % 4) * 3
            spark(draw, x, y, hot if ray % 3 == 0 else ember, 2)
        return image

    pulse = index if action == "attack" else index % 2
    radius = 9 + (pulse if action == "attack" else 0)
    ellipse(draw, (16 - radius, ground - 3 - radius, 16 + radius, ground + 2), dark)
    ellipse(draw, (18 - radius, ground - 2 - radius, 15 + radius, ground), shell)
    ellipse(draw, (11, ground - 14, 21, ground - 4), ember, dark)
    ellipse(draw, (14, ground - 11, 18, ground - 7), hot)
    poly(draw, [(8, ground - 14), (5, ground - 20), (11, ground - 17)], "#d97706", dark)
    poly(draw, [(24, ground - 14), (27, ground - 20), (21, ground - 17)], "#d97706", dark)
    if action == "attack":
      ellipse(draw, (16 - radius - 1, ground - 4 - radius, 16 + radius + 1, ground + 3), "rgba(249,115,22,64)")
      rect(draw, 15, ground - 21, 3, 27, hot)
      rect(draw, 4, ground - 9, 25, 3, ember)
    if action == "hit":
        rect(draw, 9, ground - 14, 14, 2, hot)
        for mote in range(6):
            spark(draw, 7 + mote * 4, 8 + mote % 3, ember, 2)
    for flame in range(5):
        spark(draw, 9 + flame * 4, ground - 20 - (index + flame) % 3, ember if flame % 2 else hot, 2)
    rect(draw, 8, ground + 1, 17, 1, "#080403")
    return image


def draw_skeleton(index: int, action: str) -> Image.Image:
    size = 64
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ground = 54
    bone = "#ead8b4"
    shade = "#6b5a45"
    red = "#ef4444"
    dark = "#090806"
    swing = index if action in {"attack", "skill"} else 0
    lean = min(5, swing * 2) if action == "attack" else 0

    if action == "death":
        collapse = index * 4
        for part in range(10):
            spark(draw, 10 + part * 5, ground - 8 - (part % 4) * max(1, 4 - index), bone if part % 2 else shade, 3)
        rect(draw, 14, ground - 3, 36, 3, shade)
        return image

    ellipse(draw, (18 + lean, 10, 32 + lean, 24), bone, dark)
    rect(draw, 18 + lean, 9, 14, 3, shade)
    rect(draw, 22 + lean, 15, 3, 3, dark)
    rect(draw, 28 + lean, 15, 3, 3, dark)
    rect(draw, 24 + lean, 21, 6, 2, dark)
    rect(draw, 18 + lean, 24, 17, 4, "#7f1d1d")
    rect(draw, 23 + lean, 25, 5, 18, bone)
    for rib in range(4):
        rect(draw, 21 + lean, 30 + rib * 3, 10, 1, shade)
    rect(draw, 17 + lean, 31, 18, 4, bone)
    rect(draw, 18 + lean, 37, 5, 16, bone)
    rect(draw, 31 + lean, 37, 5, 16, bone)
    rect(draw, 16 + lean, 52, 10, 3, shade)
    rect(draw, 30 + lean, 52, 10, 3, shade)
    rect(draw, 10 + lean, 28, 8, 5, bone)
    rect(draw, 35 + lean, 29, 10, 5, bone)
    ellipse(draw, (9 + lean, 25, 23 + lean, 39), "#5b3a1d", dark)
    rect(draw, 12 + lean, 28, 8, 7, shade)
    rect(draw, 13 + lean, 30, 6, 2, "#d8c8aa")
    rect(draw, 15 + lean, 26, 2, 12, "#2a1b10")

    if action == "attack":
        start_x = 39 + lean
        start_y = 27
        rect(draw, start_x, start_y, 4, 3, bone)
        poly(draw, [(start_x + 4, start_y), (58, 16 - swing), (60, 18 - swing), (start_x + 6, start_y + 4)], "#d1d5db", dark)
        poly(draw, [(start_x + 6, start_y + 1), (57, 16 - swing), (58, 17 - swing), (start_x + 7, start_y + 3)], "#f8fafc")
        draw.arc((28, 11, 66, 49), -35, 30 + swing * 14, fill=red, width=3)
        draw.arc((34, 16, 62, 45), -35, 24 + swing * 12, fill="#fff0a3", width=1)
    elif action == "skill":
        rect(draw, 40, 29, 4, 3, bone)
        poly(draw, [(42, 28), (56, 22), (58, 25), (44, 32)], "#d1d5db", dark)
        for ring in range(3):
            box = (14 - ring * 2, 17 - ring, 53 + ring * 3, 56 + ring)
            draw.arc(box, index * 35 + ring * 40, index * 35 + 155 + ring * 35, fill=red if ring != 1 else "#fff0a3", width=3 if ring != 1 else 1)
    else:
        rect(draw, 40, 28, 4, 4, bone)
        poly(draw, [(42, 27), (56, 19), (58, 21), (44, 32)], "#d1d5db", dark)
        poly(draw, [(44, 27), (55, 20), (56, 21), (45, 30)], "#f8fafc")

    if action == "hit":
        rect(draw, 16, 18, 28, 2, red)
        rect(draw, 29, 10, 3, 37, "#fff0a3")
    return image


def draw_knight(index: int, action: str) -> Image.Image:
    size = 96
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ground = 80
    dark = "#08070a"
    armor = "#1f2937"
    metal = "#9ca3af"
    bone = "#e9d5b5"
    red = "#991b1b"
    gold = "#f59e0b"
    charge = action == "skill"
    lean = min(10, index * 2) if action == "attack" else 4 if charge else 0

    if action == "death":
        fall = index * 4
        ellipse(draw, (15, ground - 7, 79, ground + 2), dark)
        rect(draw, 21, ground - 18 + fall, 42, 8, armor)
        rect(draw, 42, ground - 30 + fall, 18, 10, bone)
        rect(draw, 17, ground - 10, 56, 3, metal)
        for mote in range(16):
            spark(draw, 10 + mote * 5, ground - 22 - (mote % 4) * max(1, 6 - index), gold if mote % 3 == 0 else red, 3)
        return image

    if charge:
        for trail in range(6):
            rect(draw, 4 + trail * 5, ground - 48 + trail * 3, 42, 3, "#3b1530" if trail % 2 else "#7f1d1d")

    ellipse(draw, (14 + lean, ground - 12, 78 + lean, ground + 3), dark)
    ellipse(draw, (22 + lean, ground - 42, 72 + lean, ground - 15), "#2b1a16", dark)
    rect(draw, 20 + lean, ground - 31, 44, 10, "#3f2a22")
    rect(draw, 27 + lean, ground - 44, 7, 33, dark)
    rect(draw, 35 + lean, ground - 43, 7, 32, "#2f1b18")
    rect(draw, 56 + lean, ground - 42, 7, 32, dark)
    rect(draw, 65 + lean, ground - 40, 7, 30, "#2f1b18")
    for hoof in [27, 36, 57, 66]:
        rect(draw, hoof + lean - 2, ground - 12, 9, 4, metal)
        rect(draw, hoof + lean, ground - 31, 3, 18, "#4b342b")
    ellipse(draw, (65 + lean, ground - 49, 88 + lean, ground - 27), bone, dark)
    rect(draw, 78 + lean, ground - 38, 13, 5, metal)
    rect(draw, 70 + lean, ground - 44, 5, 5, red)
    rect(draw, 71 + lean, ground - 35, 12, 3, "#d8c8aa")
    rect(draw, 24 + lean, ground - 43, 37, 4, "#9ca3af")
    rect(draw, 29 + lean, ground - 39, 28, 3, "#111827")

    rect(draw, 47 + lean, ground - 65, 15, 25, armor)
    rect(draw, 42 + lean, ground - 50, 26, 8, metal)
    ellipse(draw, (47 + lean, ground - 78, 63 + lean, ground - 63), bone, dark)
    rect(draw, 51 + lean, ground - 74, 4, 4, red)
    poly(draw, [(46 + lean, ground - 76), (39 + lean, ground - 83), (49 + lean, ground - 72)], metal, dark)
    poly(draw, [(61 + lean, ground - 76), (69 + lean, ground - 83), (60 + lean, ground - 72)], metal, dark)
    rect(draw, 49 + lean, ground - 80, 12, 4, armor)
    poly(draw, [(43 + lean, ground - 67), (33 + lean, ground - 54), (42 + lean, ground - 50)], red, dark)
    poly(draw, [(42 + lean, ground - 66), (24 + lean, ground - 50), (38 + lean, ground - 48)], "#7f1d1d", dark)
    rect(draw, 58 + lean, ground - 60, 8, 5, armor)
    spear_y = ground - 53 if action != "attack" else ground - 56
    spear_start = 61 + lean
    spear_end = 90 + lean if action == "attack" else 82 + lean
    rect(draw, spear_start, spear_y, spear_end - spear_start, 3, metal)
    poly(draw, [(spear_end, spear_y - 4), (spear_end + 8, spear_y + 1), (spear_end, spear_y + 6)], "#fef3c7", dark)
    if action == "attack":
        rect(draw, spear_end - 10, spear_y - 2, 16, 2, "#ef4444")
        rect(draw, spear_end + 1, spear_y - 7, 5, 16, gold)
    if charge:
        rect(draw, spear_end - 6, spear_y - 2, 19, 3, "#fef3c7")
        rect(draw, 12, ground - 44, 44, 3, "#7f1d1d")
    if action == "hit":
        rect(draw, 39, ground - 70, 36, 2, gold)
        rect(draw, 57, ground - 75, 3, 39, "#fef3c7")
    return image


def generate() -> None:
    ooze_frames = [draw_ooze(i, action) for action, count in [("idle", 5), ("attack", 5), ("hit", 4), ("death", 5)] for i in range(count)]
    make_sheet(ooze_frames, 32, "splitting-ooze-sheet.png", "splitting-ooze-preview.png", [5, 5, 4, 5])

    sac_frames = [draw_fire_sac(i, action) for action, count in [("idle", 5), ("attack", 5), ("hit", 4), ("death", 5)] for i in range(count)]
    make_sheet(sac_frames, 32, "explosive-fire-sac-sheet.png", "explosive-fire-sac-preview.png", [5, 5, 4, 5])

    skeleton_frames = [draw_skeleton(i, action) for action, count in [("idle", 6), ("attack", 5), ("skill", 5), ("hit", 4), ("death", 5)] for i in range(count)]
    make_sheet(skeleton_frames, 64, "skeleton-warrior-sheet.png", "skeleton-warrior-preview.png", [6, 5, 5, 4, 5])

    knight_frames = [draw_knight(i, action) for action, count in [("idle", 6), ("attack", 5), ("skill", 6), ("hit", 4), ("death", 6)] for i in range(count)]
    make_sheet(knight_frames, 96, "skeleton-knight-sheet.png", "skeleton-knight-preview.png", [6, 5, 6, 4, 6])


if __name__ == "__main__":
    generate()
