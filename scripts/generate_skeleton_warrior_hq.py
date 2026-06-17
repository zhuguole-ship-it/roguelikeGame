from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "monsters"
FRAME = 64

SHEET = "skeleton-warrior-hq-sheet.png"
PREVIEW = "skeleton-warrior-hq-preview.png"
QA = "skeleton-warrior-hq-qa.png"

PALETTE = {
    "outline": "#070605",
    "outline2": "#17110d",
    "bone_shadow": "#6b5640",
    "bone_mid": "#c6aa79",
    "bone": "#ecd8ad",
    "bone_hi": "#fff0c8",
    "cloth_dark": "#4a0d0d",
    "cloth": "#8f1d1d",
    "cloth_hi": "#ef4444",
    "metal_dark": "#2f3440",
    "metal": "#9aa3ad",
    "metal_hi": "#f8fafc",
    "wood_dark": "#2d160b",
    "wood": "#6b3f1d",
    "leather": "#b7793b",
    "gold": "#f5b74f",
    "red": "#ef2929",
    "red_hot": "#ffb14a",
    "purple_shadow": "#261222",
}


def rect(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str) -> None:
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=fill)


def px(draw: ImageDraw.ImageDraw, x: int, y: int, fill: str, w: int = 1, h: int | None = None) -> None:
    rect(draw, x, y, w, h or w, fill)


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None, width: int = 1) -> None:
    if outline:
        draw.ellipse(box, fill=outline)
        inset = width
        draw.ellipse((box[0] + inset, box[1] + inset, box[2] - inset, box[3] - inset), fill=fill)
    else:
        draw.ellipse(box, fill=fill)


def poly(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], fill: str, outline: str | None = None) -> None:
    draw.polygon(points, fill=fill)
    if outline:
        draw.line(points + [points[0]], fill=outline, width=1)


def draw_segment(draw: ImageDraw.ImageDraw, a: tuple[int, int], b: tuple[int, int], color: str, width: int = 3, hi: bool = True) -> None:
    draw.line((a, b), fill=PALETTE["outline"], width=width + 2)
    draw.line((a, b), fill=PALETTE["bone_shadow"], width=width + 1)
    draw.line((a, b), fill=color, width=width)
    if hi:
        ax, ay = a
        bx, by = b
        draw.line(((ax, ay - 1), (bx, by - 1)), fill=PALETTE["bone_hi"], width=1)


def draw_joint(draw: ImageDraw.ImageDraw, x: int, y: int, r: int = 2) -> None:
    ellipse(draw, (x - r, y - r, x + r, y + r), PALETTE["bone"], PALETTE["outline"])
    px(draw, x - 1, y - 1, PALETTE["bone_hi"], 2, 1)
    px(draw, x + r - 1, y, PALETTE["bone_shadow"], 1, 2)


def draw_blade(draw: ImageDraw.ImageDraw, base: tuple[int, int], tip: tuple[int, int], width: int = 4, glow: bool = False) -> None:
    bx, by = base
    tx, ty = tip
    vx, vy = tx - bx, ty - by
    length = max(1, math.hypot(vx, vy))
    nx, ny = -vy / length, vx / length
    shoulder = (int(bx + vx * 0.13), int(by + vy * 0.13))
    p1 = (int(shoulder[0] + nx * width), int(shoulder[1] + ny * width))
    p2 = (int(tx + nx * 1), int(ty + ny * 1))
    p3 = (int(tx - nx * 1), int(ty - ny * 1))
    p4 = (int(shoulder[0] - nx * width), int(shoulder[1] - ny * width))
    if glow:
        draw.line((base, tip), fill=PALETTE["red"], width=8)
        draw.line((base, tip), fill=PALETTE["red_hot"], width=4)
    poly(draw, [p1, p2, p3, p4], PALETTE["metal"], PALETTE["outline"])
    draw.line((shoulder, tip), fill=PALETTE["metal_hi"], width=1)
    draw.line(((int(shoulder[0] - nx * 1), int(shoulder[1] - ny * 1)), (int(tx - nx * 1), int(ty - ny * 1))), fill=PALETTE["metal_dark"], width=1)
    draw.line(((bx - 3, by + 2), (bx + 4, by - 2)), fill=PALETTE["gold"], width=2)
    draw.line(((bx - 1, by + 3), (bx + 2, by + 7)), fill=PALETTE["wood"], width=3)
    px(draw, bx, by + 8, PALETTE["gold"], 2, 2)


def draw_slash_arc(draw: ImageDraw.ImageDraw, bbox: tuple[int, int, int, int], start: int, end: int, hot: bool = False) -> None:
    draw.arc(bbox, start, end, fill=PALETTE["outline"], width=5)
    draw.arc((bbox[0] + 1, bbox[1] + 1, bbox[2] - 1, bbox[3] - 1), start, end, fill=PALETTE["red"], width=3)
    draw.arc((bbox[0] + 3, bbox[1] + 3, bbox[2] - 3, bbox[3] - 3), start + 4, end - 8, fill=PALETTE["red_hot"] if hot else PALETTE["gold"], width=1)
    for t in (0.15, 0.45, 0.75):
        angle = math.radians(start + (end - start) * t)
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        rx = (bbox[2] - bbox[0]) / 2
        ry = (bbox[3] - bbox[1]) / 2
        px(draw, int(cx + math.cos(angle) * rx), int(cy + math.sin(angle) * ry), PALETTE["red_hot"], 2, 1)


def draw_shield(draw: ImageDraw.ImageDraw, cx: int, cy: int, angle: int = 0) -> None:
    points = [(cx - 10, cy - 11), (cx + 8, cy - 12), (cx + 11, cy - 1), (cx + 4, cy + 13), (cx - 8, cy + 9), (cx - 12, cy - 2)]
    shifted = [(x + angle // 2, y) for x, y in points]
    poly(draw, shifted, PALETTE["outline"])
    inner = [(x + (1 if x < cx else -1), y + (1 if y < cy else -1)) for x, y in shifted]
    poly(draw, inner, PALETTE["wood_dark"])
    poly(draw, [(cx - 6, cy - 8), (cx + 5, cy - 8), (cx + 7, cy), (cx + 2, cy + 8), (cx - 5, cy + 6), (cx - 8, cy - 1)], PALETTE["wood"])
    draw.line(((cx - 8, cy - 8), (cx + 6, cy + 7)), fill=PALETTE["leather"], width=2)
    draw.line(((cx + 6, cy - 7), (cx - 5, cy + 7)), fill=PALETTE["leather"], width=2)
    for stripe in range(4):
        px(draw, cx - 8 + stripe * 4, cy - 9 + (stripe % 2), PALETTE["wood_dark"], 2, 1)
        px(draw, cx - 7 + stripe * 4, cy + 7 - (stripe % 2), PALETTE["leather"], 2, 1)
    for dx, dy in [(-7, -6), (6, -6), (7, 2), (-5, 6)]:
        px(draw, cx + dx, cy + dy, PALETTE["metal_hi"], 2, 2)
        px(draw, cx + dx + 1, cy + dy + 1, PALETTE["metal_dark"], 1, 1)
    ellipse(draw, (cx - 4, cy - 4, cx + 4, cy + 4), PALETTE["bone"], PALETTE["outline"])
    px(draw, cx - 2, cy - 1, PALETTE["outline"], 2, 2)
    px(draw, cx + 1, cy - 1, PALETTE["outline"], 2, 2)
    px(draw, cx - 1, cy + 3, PALETTE["outline"], 3, 1)


def draw_skull(draw: ImageDraw.ImageDraw, cx: int, cy: int, mood: str = "idle") -> None:
    ellipse(draw, (cx - 8, cy - 9, cx + 8, cy + 7), PALETTE["bone"], PALETTE["outline"], 2)
    rect(draw, cx - 5, cy + 5, 11, 6, PALETTE["bone"])
    rect(draw, cx - 6, cy + 4, 13, 3, PALETTE["outline"])
    rect(draw, cx - 5, cy + 4, 11, 3, PALETTE["bone"])
    px(draw, cx - 4, cy - 2, PALETTE["outline"], 4, 4)
    px(draw, cx + 2, cy - 2, PALETTE["outline"], 4, 4)
    px(draw, cx - 3, cy - 1, PALETTE["red_hot"], 2, 2)
    px(draw, cx + 3, cy - 1, PALETTE["red_hot"], 2, 2)
    px(draw, cx, cy + 2, PALETTE["bone_shadow"], 2, 3)
    for i in range(5):
        px(draw, cx - 5 + i * 2, cy + 8, PALETTE["outline"], 1, 2)
    px(draw, cx - 5, cy - 7, PALETTE["bone_hi"], 6, 2)
    px(draw, cx + 4, cy - 6, PALETTE["bone_shadow"], 3, 4)
    px(draw, cx - 1, cy - 8, PALETTE["bone_shadow"], 1, 4)
    px(draw, cx, cy - 5, PALETTE["outline2"], 1, 2)
    px(draw, cx + 5, cy + 5, PALETTE["bone_shadow"], 1, 3)
    px(draw, cx - 7, cy + 1, PALETTE["bone_shadow"], 2, 2)
    px(draw, cx + 6, cy + 1, PALETTE["bone_shadow"], 1, 2)
    if mood == "hit":
        px(draw, cx - 8, cy - 8, PALETTE["red"], 3, 2)
        px(draw, cx + 5, cy + 4, PALETTE["red"], 2, 2)


def draw_ribcage(draw: ImageDraw.ImageDraw, cx: int, cy: int, twist: int = 0) -> None:
    rect(draw, cx - 3, cy - 8, 6, 18, PALETTE["outline"])
    rect(draw, cx - 2, cy - 7, 4, 16, PALETTE["bone_mid"])
    for rib in range(5):
        y = cy - 6 + rib * 3
        span = 8 - min(rib, 3)
        draw.line(((cx - 2, y), (cx - span + twist // 2, y + 1)), fill=PALETTE["outline"], width=3)
        draw.line(((cx + 2, y), (cx + span + twist // 2, y + 1)), fill=PALETTE["outline"], width=3)
        draw.line(((cx - 2, y), (cx - span + twist // 2, y + 1)), fill=PALETTE["bone"], width=1)
        draw.line(((cx + 2, y), (cx + span + twist // 2, y + 1)), fill=PALETTE["bone"], width=1)
    rect(draw, cx - 8, cy + 8, 16, 4, PALETTE["outline"])
    rect(draw, cx - 6, cy + 8, 12, 3, PALETTE["bone_shadow"])
    px(draw, cx - 4, cy + 8, PALETTE["bone_hi"], 7, 1)
    px(draw, cx - 10, cy - 9, PALETTE["bone_hi"], 4, 2)
    px(draw, cx + 6, cy - 9, PALETTE["bone_hi"], 4, 2)
    for bead in range(4):
        px(draw, cx - 1, cy - 4 + bead * 4, PALETTE["bone_hi"] if bead % 2 else PALETTE["bone_shadow"], 2, 1)


def draw_scarf(draw: ImageDraw.ImageDraw, cx: int, cy: int, frame: int, action: str) -> None:
    poly(draw, [(cx - 9, cy - 8), (cx + 9, cy - 8), (cx + 8, cy - 2), (cx - 10, cy - 1)], PALETTE["cloth_dark"], PALETTE["outline"])
    rect(draw, cx - 8, cy - 7, 15, 3, PALETTE["cloth"])
    wave = (frame % 3) - 1
    tail = 9 if action in {"move", "skill"} else 5
    poly(draw, [(cx + 5, cy - 6), (cx + 16 + tail // 2, cy - 5 + wave), (cx + 12 + tail, cy), (cx + 4, cy - 2)], PALETTE["cloth"], PALETTE["outline"])
    px(draw, cx + 8, cy - 5 + wave, PALETTE["cloth_hi"], 5, 1)
    px(draw, cx + 14 + tail // 2, cy - 2 + wave, PALETTE["cloth_dark"], 3, 2)
    px(draw, cx + 17 + tail // 2, cy - 4 + wave, PALETTE["cloth_hi"], 2, 1)


def pose_points(action: str, frame: int) -> dict[str, tuple[int, int]]:
    bob = [0, -1, 0, 1, 0, -1][frame % 6]
    lean = 0
    recoil = 0
    if action == "move":
        lean = 1 + (frame % 2)
    if action == "attack":
        lean = [0, 2, 4, 5, 2][frame]
    if action == "skill":
        lean = [0, 2, 0, -1, 1][frame]
    if action == "hit":
        recoil = [3, 5, 2, 0][frame]
        bob = [-1, -2, 0, 1][frame]
    cx = 31 + lean - recoil
    return {
        "head": (cx, 17 + bob),
        "chest": (cx, 32 + bob),
        "pelvis": (cx, 43 + bob),
        "l_shoulder": (cx - 8, 30 + bob),
        "r_shoulder": (cx + 8, 30 + bob),
        "l_hand": (cx - 17, 37 + bob),
        "r_hand": (cx + 13 + lean, 34 + bob),
        "l_hip": (cx - 5, 43 + bob),
        "r_hip": (cx + 5, 43 + bob),
    }


def draw_shadow(draw: ImageDraw.ImageDraw, frame: int, action: str) -> None:
    y = 57
    w = 32 if action != "death" else 42
    shade = "#050403"
    for i in range(3):
        draw.ellipse((32 - w // 2 + i * 2, y - 2 + i, 32 + w // 2 - i * 2, y + 3), fill=shade)


def draw_skeleton(frame: int, action: str) -> Image.Image:
    image = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw_shadow(draw, frame, action)

    if action == "death":
        collapse = frame
        base_y = 54
        for i in range(16):
            x = 11 + i * 3 + (i % 2)
            y = base_y - 8 - (i % 5) * max(1, 4 - collapse) + collapse * 2
            px(draw, x, y, PALETTE["bone"] if i % 3 else PALETTE["bone_shadow"], 2, 2)
            if i % 5 == 0:
                px(draw, x + 1, y - 1, PALETTE["bone_hi"], 1, 1)
        ellipse(draw, (15 + collapse * 3, base_y - 12 + collapse * 2, 31 + collapse * 3, base_y + 2), PALETTE["bone"], PALETTE["outline"], 2)
        rect(draw, 28, base_y - 8, 20, 4, PALETTE["bone_shadow"])
        rect(draw, 20, base_y - 3, 31, 3, PALETTE["wood"])
        draw_blade(draw, (35, base_y - 7), (54 - collapse * 2, base_y - 17 + collapse), 3)
        for ember in range(7):
            px(draw, 13 + ember * 6, base_y - 18 - (ember % 3) * (4 - min(collapse, 3)), PALETTE["red"] if ember % 2 else PALETTE["gold"], 2, 1)
        return image

    pts = pose_points(action, frame)
    head = pts["head"]
    chest = pts["chest"]
    pelvis = pts["pelvis"]
    mood = "hit" if action == "hit" else "idle"

    # Legs first, so torso and shield sit above them.
    leg_shift = 0
    if action == "move":
        leg_shift = [-3, -1, 2, 3, 1, -2][frame]
    if action == "attack":
        leg_shift = [0, 1, 3, 2, -1][frame]
    if action == "skill":
        leg_shift = [-2, 2, -1, 2, -2][frame]
    if action == "hit":
        leg_shift = [-1, -3, 1, 0][frame]

    l_knee = (pts["l_hip"][0] - 3 - leg_shift // 2, 49)
    r_knee = (pts["r_hip"][0] + 3 + leg_shift // 2, 49)
    l_foot = (22 + leg_shift, 56)
    r_foot = (39 - leg_shift, 56)
    draw_segment(draw, pts["l_hip"], l_knee, PALETTE["bone_mid"], 3)
    draw_segment(draw, l_knee, l_foot, PALETTE["bone"], 3)
    draw_segment(draw, pts["r_hip"], r_knee, PALETTE["bone_mid"], 3)
    draw_segment(draw, r_knee, r_foot, PALETTE["bone"], 3)
    for point in [pts["l_hip"], pts["r_hip"], l_knee, r_knee, l_foot, r_foot]:
        draw_joint(draw, *point, 2)
    px(draw, l_foot[0] + 2, l_foot[1] - 1, PALETTE["bone_hi"], 3, 1)
    px(draw, r_foot[0] + 2, r_foot[1] - 1, PALETTE["bone_hi"], 3, 1)

    draw_ribcage(draw, chest[0], chest[1], twist=leg_shift)
    draw_scarf(draw, chest[0], chest[1], frame, action)
    draw_skull(draw, head[0], head[1], mood)

    # Arms and shield.
    shield_x = pts["l_hand"][0] - (1 if action == "hit" else 0)
    shield_y = pts["l_hand"][1] + (1 if action == "move" and frame % 2 else 0)
    draw_segment(draw, pts["l_shoulder"], (shield_x + 3, shield_y - 3), PALETTE["bone_mid"], 3)
    draw_joint(draw, *pts["l_shoulder"], 2)
    draw_shield(draw, shield_x, shield_y, angle=leg_shift)

    hand = pts["r_hand"]
    draw_segment(draw, pts["r_shoulder"], hand, PALETTE["bone_mid"], 3)
    draw_joint(draw, *pts["r_shoulder"], 2)
    draw_joint(draw, *hand, 2)

    if action == "attack":
        tips = [(51, 17), (58, 20), (61, 28), (55, 38), (48, 44)]
        bases = [(39, 30), (42, 31), (43, 33), (42, 35), (39, 36)]
        draw_slash_arc(draw, (27, 8, 70, 52), -55 + frame * 8, 45 + frame * 16, hot=True)
        draw_blade(draw, bases[frame], tips[frame], 4, glow=frame in {2, 3})
        for chip in range(8):
            px(draw, 46 + chip * 2, 22 + ((chip + frame) % 5), PALETTE["red_hot"] if chip % 2 else PALETTE["red"], 2, 1)
    elif action == "skill":
        draw_slash_arc(draw, (10, 10, 57, 58), 185 + frame * 50, 360 + frame * 50, hot=True)
        draw_slash_arc(draw, (15, 15, 63, 54), 20 + frame * 55, 195 + frame * 55, hot=False)
        sword_angles = [(49, 26), (47, 46), (17, 45), (18, 24), (52, 17)]
        draw_blade(draw, hand, sword_angles[frame], 4, glow=True)
        for dust in range(10):
            px(draw, 12 + dust * 5, 52 - (dust + frame) % 8, PALETTE["red"] if dust % 3 else PALETTE["gold"], 2, 1)
    else:
        if action == "hit":
            draw.line(((12, 19), (49, 23)), fill=PALETTE["red_hot"], width=2)
            draw.line(((24, 12), (45, 47)), fill=PALETTE["red"], width=1)
            for chip in range(9):
                px(draw, 15 + chip * 4, 15 + (chip % 4) * 5, PALETTE["bone_hi"] if chip % 2 else PALETTE["bone_shadow"], 2, 1)
        tip = (55, 21) if action != "move" else (53, 21 + (frame % 2))
        draw_blade(draw, hand, tip, 4)

    # Secondary pixel chips and edge highlights.
    for i, (x, y) in enumerate([(23, 20), (38, 22), (19, 29), (44, 33), (25, 47), (39, 47)]):
        color = PALETTE["bone_hi"] if i % 2 else PALETTE["bone_shadow"]
        px(draw, x + (frame + i) % 2, y, color, 1, 1)
    for mote in range(5):
        px(draw, 15 + mote * 8 + (frame % 2), 58 - (mote % 2), PALETTE["bone_shadow"] if mote % 2 else PALETTE["gold"], 1, 1)
    return image


def make_sheet(frames: list[Image.Image]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (len(frames) * FRAME, FRAME), (0, 0, 0, 0))
    for idx, frame in enumerate(frames):
        sheet.alpha_composite(frame, (idx * FRAME, 0))
    sheet.save(OUT_DIR / SHEET)


def make_preview(groups: list[tuple[str, list[Image.Image]]]) -> None:
    scale = 3
    gap = 8
    pad = 10
    label_w = 88
    font = ImageFont.load_default()
    max_count = max(len(frames) for _, frames in groups)
    width = label_w + pad * 2 + max_count * FRAME * scale + (max_count - 1) * gap
    height = pad * 2 + len(groups) * (FRAME * scale + gap)
    preview = Image.new("RGBA", (width, height), (5, 10, 8, 255))
    draw = ImageDraw.Draw(preview)
    y = pad
    for label, frames in groups:
        draw.text((pad, y + 6), label, fill="#f5d58a", font=font)
        for col, frame in enumerate(frames):
            enlarged = frame.resize((FRAME * scale, FRAME * scale), Image.Resampling.NEAREST)
            x = label_w + pad + col * (FRAME * scale + gap)
            preview.alpha_composite(enlarged, (x, y))
            draw.rectangle((x, y, x + FRAME * scale - 1, y + FRAME * scale - 1), outline="#5c4420")
        y += FRAME * scale + gap
    preview.save(OUT_DIR / PREVIEW)


def silhouette(frame: Image.Image) -> Image.Image:
    alpha = frame.getchannel("A")
    bw = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    solid = Image.new("RGBA", frame.size, (245, 245, 220, 255))
    bw.alpha_composite(solid)
    bw.putalpha(alpha.point(lambda value: 255 if value > 8 else 0))
    return bw


def make_qa(groups: list[tuple[str, list[Image.Image]]]) -> None:
    selected = [
        ("idle", groups[0][1][0]),
        ("sword slash", groups[2][1][2]),
        ("whirlwind", groups[3][1][2]),
        ("hit", groups[4][1][1]),
        ("death", groups[5][1][2]),
    ]
    scale = 4
    pad = 12
    font = ImageFont.load_default()
    cell_w = 64 + 12 + 64 * scale + 12 + 64 * scale
    cell_h = 64 * scale + 42
    qa = Image.new("RGBA", (pad * 2 + len(selected) * cell_w, pad * 2 + cell_h), (5, 9, 8, 255))
    draw = ImageDraw.Draw(qa)
    for idx, (label, frame) in enumerate(selected):
        x = pad + idx * cell_w
        draw.text((x, pad), label, fill="#f5d58a", font=font)
        draw.text((x, pad + 14), "1x", fill="#9ae6b4", font=font)
        qa.alpha_composite(frame, (x, pad + 30))
        large = frame.resize((64 * scale, 64 * scale), Image.Resampling.NEAREST)
        draw.text((x + 76, pad + 14), "4x", fill="#9ae6b4", font=font)
        qa.alpha_composite(large, (x + 76, pad + 30))
        sil = silhouette(frame).resize((64 * scale, 64 * scale), Image.Resampling.NEAREST)
        draw.text((x + 76 + 64 * scale + 12, pad + 14), "silhouette", fill="#9ae6b4", font=font)
        qa.alpha_composite(sil, (x + 76 + 64 * scale + 12, pad + 30))
        draw.rectangle((x, pad + 30, x + 63, pad + 93), outline="#5c4420")
        draw.rectangle((x + 76, pad + 30, x + 76 + 64 * scale - 1, pad + 30 + 64 * scale - 1), outline="#5c4420")
        draw.rectangle((x + 76 + 64 * scale + 12, pad + 30, x + 76 + 64 * scale + 12 + 64 * scale - 1, pad + 30 + 64 * scale - 1), outline="#5c4420")
    qa.save(OUT_DIR / QA)


def generate() -> None:
    groups = [
        ("idle", [draw_skeleton(i, "idle") for i in range(6)]),
        ("move", [draw_skeleton(i, "move") for i in range(6)]),
        ("attack", [draw_skeleton(i, "attack") for i in range(5)]),
        ("whirlwind", [draw_skeleton(i, "skill") for i in range(5)]),
        ("hit", [draw_skeleton(i, "hit") for i in range(4)]),
        ("death", [draw_skeleton(i, "death") for i in range(5)]),
    ]
    frames = [frame for _, action_frames in groups for frame in action_frames]
    make_sheet(frames)
    make_preview(groups)
    make_qa(groups)


if __name__ == "__main__":
    generate()
