from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "monsters"


def rect(draw: ImageDraw.ImageDraw, x: float, y: float, w: float, h: float, fill: str) -> None:
    draw.rectangle((round(x), round(y), round(x + w - 1), round(y + h - 1)), fill=fill)


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], fill: str, outline: str | None = None) -> None:
    rounded = tuple(round(value) for value in box)
    draw.ellipse(rounded, fill=fill, outline=outline)


def poly(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: str, outline: str | None = None) -> None:
    rounded = [(round(x), round(y)) for x, y in points]
    draw.polygon(rounded, fill=fill)
    if outline:
        draw.line(rounded + [rounded[0]], fill=outline, width=1)


def line(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], fill: str, width: int = 1) -> None:
    draw.line([(round(x), round(y)) for x, y in points], fill=fill, width=width)


def pixel_polyline(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], colors: list[str], width: int = 1) -> None:
    for index in range(len(points) - 1):
        line(draw, [points[index], points[index + 1]], colors[index % len(colors)], width)


def spark(draw: ImageDraw.ImageDraw, x: float, y: float, fill: str, size: int = 2) -> None:
    rect(draw, x, y, size, max(1, size - 1), fill)


def make_sheet(frames: list[Image.Image], frame_size: int, sheet_name: str, preview_name: str, rows: list[int]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (len(frames) * frame_size, frame_size), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * frame_size, 0))
    sheet.save(OUT_DIR / sheet_name)

    scale = 4 if frame_size == 32 else 3 if frame_size == 64 else 2
    gap = 6
    pad = 10
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


def draw_ooze_body(draw: ImageDraw.ImageDraw, cx: float, ground: float, frame: int, action: str) -> None:
    dark = "#122006"
    rim = "#24380b"
    rind = "#35570d"
    mid = "#5e8f18"
    body = "#80b927"
    high = "#c8ff55"
    acid = "#a7f432"
    core = "#b01395"
    core_hi = "#ffd6ff"

    squash = 1 + (0.1 if action == "move" and frame % 2 else 0)
    stretch = 1 - (0.12 if action == "move" and frame % 2 else 0)
    if action == "hit":
        squash = 1.22
        stretch = 0.78

    width = 21 * squash
    height = 15 * stretch
    bob = math.sin(frame * 1.3) * (1.2 if action in {"idle", "move"} else 0.4)

    ellipse(draw, (cx - width / 2 - 1, ground - height + bob - 1, cx + width / 2 + 1, ground + 2), dark)
    ellipse(draw, (cx - width / 2 + 1, ground - height + bob, cx + width / 2 - 1, ground + 1), rim)
    ellipse(draw, (cx - width / 2 + 2, ground - height + bob + 1, cx + width / 2 - 1, ground), rind)
    ellipse(draw, (cx - width / 2 + 3, ground - height + bob + 2, cx + width / 2 - 2, ground), body)
    ellipse(draw, (cx - 5, ground - height + bob + 6, cx + 8, ground - 2), mid)
    line(draw, [(cx - 8, ground - height + bob + 5), (cx - 2, ground - height + bob + 3), (cx + 7, ground - height + bob + 4)], high, 1)
    line(draw, [(cx - 9, ground - height + bob + 9), (cx - 2, ground - height + bob + 11), (cx + 9, ground - height + bob + 9)], "#426b12", 1)
    rect(draw, cx - 9, ground - 7 + bob, 4, 2, "#3f6d12")
    rect(draw, cx + 5, ground - 9 + bob, 5, 2, "#436f12")
    rect(draw, cx - 3, ground - 12 + bob, 2, 2, "#d9ff79")
    for pore in range(10):
        px = cx - 9 + (pore * 2.1) % 18 + math.sin(frame + pore) * 0.35
        py = ground - height + bob + 5 + (pore * 3) % 9
        fill = "#213909" if pore % 3 else "#9ce13a"
        rect(draw, px, py, 1 + (pore % 2), 1, fill)
    for vein in range(5):
        vx = cx - 8 + vein * 4
        vy = ground - height + bob + 6 + (vein % 2) * 2
        line(draw, [(vx, vy), (vx + 2, vy + 2), (vx + 5, vy + 1)], "#203b08" if vein % 2 else "#d9ff79", 1)
    for bead in range(7):
        bx = cx - 10 + bead * 3
        by = ground - 5 - (bead % 3)
        rect(draw, bx, by, 2, 1, "#c8ff55" if bead % 2 else "#31570d")

    eye_x = cx + (2 if action == "attack" else 0)
    ellipse(draw, (eye_x - 4, ground - height + bob + 2, eye_x + 6, ground - height + bob + 12), dark)
    ellipse(draw, (eye_x - 3, ground - height + bob + 3, eye_x + 5, ground - height + bob + 11), "#42103c")
    ellipse(draw, (eye_x - 1, ground - height + bob + 4, eye_x + 4, ground - height + bob + 10), core)
    rect(draw, eye_x + 1, ground - height + bob + 5, 2, 2, core_hi)
    rect(draw, eye_x - 2, ground - height + bob + 9, 2, 1, "#ff7bff")

    for bubble in range(12):
        bx = cx - 11 + bubble * 2.4 + math.sin(frame + bubble) * 0.8
        by = ground - height - 4 - (bubble % 3) + math.cos(frame * 0.8 + bubble)
        spark(draw, bx, by, high if bubble % 2 else acid, 1 + (bubble % 3 == 0))


def draw_splitting_ooze(frame: int, action: str) -> Image.Image:
    image = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ground = 25
    cx = 16

    if action == "death":
        spread = frame * 2
        height = max(2, 11 - frame * 2)
        ellipse(draw, (6 + spread, ground - height, 26 - spread, ground + 2), "#122006")
        ellipse(draw, (8 + spread, ground - height + 2, 24 - spread, ground), "#5e8f18")
        if height > 4:
            ellipse(draw, (12 + spread * 0.2, ground - height + 3, 18 - spread * 0.2, ground - 1), "#b01395")
        else:
            rect(draw, cx - 2, ground - 3, 4, 2, "#b01395")
        for mote in range(22):
            spark(draw, 2 + mote * 1.35, ground - 2 - (mote % 6) * (1 + frame * 0.55), "#b6ef38" if mote % 3 else "#d9ff79", 1 + (mote % 5 == 0))
        for shard in range(4):
            rect(draw, 9 + shard * 4 + spread * 0.2, ground - 7 - shard % 2, 2, 2, "#ff7bff")
        return image

    if action == "attack":
        split = min(8, frame * 2)
        mother_x = cx - split * 0.45
        draw_ooze_body(draw, mother_x, ground, frame, "idle")
        line(draw, [(mother_x + 4, ground - 15), (mother_x + 2, ground - 10), (mother_x + 7, ground - 7), (mother_x + 5, ground - 2)], "#d9ff79", 2)
        line(draw, [(mother_x + 5, ground - 14), (mother_x + 3, ground - 9), (mother_x + 8, ground - 5)], "#213909", 1)
        child_left = cx + 3 + split
        child_right = max(child_left + 8, cx + 17 + split * 0.38)
        ellipse(draw, (child_left, ground - 13, child_right, ground + 1), "#122006")
        ellipse(draw, (child_left + 2, ground - 11, child_right - 2, ground), "#83c52d")
        ellipse(draw, (child_left + 5, ground - 8, child_left + 10, ground - 3), "#b01395")
        for strand in range(4):
            line(draw, [(mother_x + 7, ground - 10 + strand * 2), (cx + 7 + split, ground - 11 + strand)], "#a7f432", 1)
        for strand in range(5):
            line(draw, [(mother_x + 5, ground - 5 - strand), (child_left + 2 + strand, ground - 6 + strand % 3)], "#d9ff79" if strand % 2 else "#31570d", 1)
        for mote in range(18):
            spark(draw, cx + 1 + mote * 1.45, ground - 15 + (mote % 7), "#c8ff55" if mote % 2 else "#5e8f18", 1 + (mote % 6 == 0))
    else:
        if action == "move":
            cx += [-2, -1, 0, 1, 2][frame % 5]
        draw_ooze_body(draw, cx, ground, frame, action)
        if action == "move":
            for trail in range(9):
                spark(draw, 3 + trail * 1.8, ground - 1 - trail % 3, "#5e8f18" if trail % 2 else "#9ce13a", 1 + (trail % 4 == 0))
        if action == "hit":
            line(draw, [(7, 14), (24, 12)], "#d9ff79", 2)
            line(draw, [(9, 20), (22, 13)], "#213909", 1)
            for mote in range(18):
                spark(draw, 3 + mote * 1.55, 8 + mote % 7, "#c8ff55" if mote % 2 else "#5e8f18", 1 + (mote % 5 == 0))
    rect(draw, 7, ground + 1, 18, 1, "#07110b")
    return image


def draw_fire_sac_body(draw: ImageDraw.ImageDraw, cx: float, ground: float, frame: int, action: str) -> None:
    dark = "#130403"
    shell = "#431407"
    shell2 = "#7c2d12"
    ember = "#f97316"
    hot = "#fff0a3"
    red = "#dc2626"
    char = "#090302"
    pulse = 1 + (0.12 * math.sin(frame * 1.1))
    if action == "attack":
        pulse += frame * 0.08
    if action == "hit":
        pulse *= 0.88

    rx = 10 * pulse
    ry = 12 * pulse
    ellipse(draw, (cx - rx - 1, ground - ry - 1, cx + rx + 1, ground + 2), dark)
    ellipse(draw, (cx - rx + 1, ground - ry, cx + rx - 1, ground), shell)
    ellipse(draw, (cx - rx + 3, ground - ry + 2, cx + rx - 3, ground - 1), "#2f0d05")
    ellipse(draw, (cx - 6 * pulse, ground - 10 * pulse, cx + 6 * pulse, ground - 1), shell2)
    ellipse(draw, (cx - 5, ground - 12, cx + 5, ground - 3), ember)
    ellipse(draw, (cx - 2, ground - 10, cx + 3, ground - 5), hot)
    poly(draw, [(cx - 9, ground - 13), (cx - 14, ground - 21), (cx - 6, ground - 17)], "#f59e0b", dark)
    poly(draw, [(cx + 9, ground - 13), (cx + 14, ground - 21), (cx + 6, ground - 17)], "#f59e0b", dark)
    line(draw, [(cx - 6, ground - 5), (cx + 6, ground - 6)], red, 1)
    line(draw, [(cx - 5, ground - 15), (cx - 1, ground - 12), (cx + 4, ground - 15)], "#fed7aa", 1)
    line(draw, [(cx - 7, ground - 9), (cx - 2, ground - 7), (cx + 1, ground - 11), (cx + 6, ground - 8)], char, 1)
    line(draw, [(cx - 4, ground - 16), (cx - 1, ground - 12), (cx + 1, ground - 15), (cx + 5, ground - 13)], "#fb923c", 1)
    line(draw, [(cx - 7, ground - 13), (cx - 4, ground - 9), (cx - 8, ground - 6)], "#130403", 1)
    line(draw, [(cx + 6, ground - 14), (cx + 2, ground - 10), (cx + 7, ground - 6)], "#fed7aa", 1)
    line(draw, [(cx - 1, ground - 18), (cx + 1, ground - 13), (cx - 2, ground - 9), (cx + 1, ground - 4)], "#fff0a3" if action == "attack" else "#9a3412", 1)
    for plate in range(8):
        px = cx - 8 + plate * 2.2
        py = ground - 13 + (plate * 3) % 10
        rect(draw, px, py, 2, 1, "#9a3412" if plate % 2 else "#f97316")
    for scale in range(9):
        sx = cx - 9 + (scale * 2.1)
        sy = ground - 17 + (scale % 4) * 3
        rect(draw, sx, sy, 1 + (scale % 3 == 0), 1, "#fff0a3" if scale % 4 == 0 else "#431407")
    for flame in range(14):
        spark(draw, cx - 11 + flame * 1.65, ground - 21 - ((frame + flame) % 5), hot if flame % 3 == 0 else ember, 1 + (flame % 5 == 0))


def draw_fire_sac(frame: int, action: str) -> Image.Image:
    image = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ground = 25
    cx = 16

    if action == "death":
        radius = max(2, 11 - frame * 1.8)
        core_y = ground - 7
        ellipse(draw, (cx - radius - 1, core_y - radius * 0.75, cx + radius + 1, ground + 1), "#130403")
        for shell_index in range(6):
            angle = -2.7 + shell_index * 1.05 + frame * 0.08
            sx = cx + math.cos(angle) * (radius + frame * 1.6)
            sy = core_y + math.sin(angle) * (radius * 0.6 + frame)
            poly(draw, [(sx - 2, sy), (sx + 2, sy - 2), (sx + 4, sy + 2), (sx, sy + 4)], "#7c2d12", "#130403")
            rect(draw, sx, sy, 2, 1, "#fed7aa")
        ellipse(draw, (cx - radius * 0.48, core_y - radius * 0.52, cx + radius * 0.48, core_y + radius * 0.48), "#f97316")
        ellipse(draw, (cx - radius * 0.22, core_y - radius * 0.25, cx + radius * 0.22, core_y + radius * 0.18), "#fff0a3")
        line(draw, [(cx - radius * 0.65, core_y - 3), (cx - 2, core_y + 1), (cx + radius * 0.62, core_y - 2)], "#dc2626", 1)
        for ray in range(42):
            angle = ray * math.pi * 2 / 21
            length = 3 + frame * 2.4 + (ray % 6)
            color = "#fff0a3" if ray % 5 == 0 else "#f97316" if ray % 2 == 0 else "#7c2d12"
            spark(draw, cx + math.cos(angle) * length, core_y + math.sin(angle) * length * 0.7, color, 1 + (ray % 11 == 0))
        for ash in range(18):
            angle = ash * math.pi * 2 / 18 + frame * 0.2
            length = 7 + frame * 2 + (ash % 5)
            spark(draw, cx + math.cos(angle) * length, core_y + math.sin(angle) * length * 0.55 + 2, "#431407" if ash % 2 else "#130403", 1 + (ash % 7 == 0))
        rect(draw, 7, ground + 1, 18, 1, "#080403")
        return image

    if action == "move":
        cx += [-1, -2, 0, 2, 1][frame % 5]
    if action == "attack":
        radius = 5 + frame * 1.7
        core_y = ground - 8
        for ring in range(3):
            draw.arc(
                (
                    round(cx - radius - ring * 2),
                    round(core_y - radius * 0.8 - ring),
                    round(cx + radius + ring * 2),
                    round(core_y + radius * 0.8 + ring),
                ),
                18 + frame * 12 + ring * 17,
                330 - ring * 22,
                fill="#f97316" if ring == 0 else "#7c2d12",
                width=1,
            )
        for ray in range(30):
            angle = ray * math.pi * 2 / 30 + frame * 0.08
            length = 4 + frame * 1.9 + ray % 5
            color = "#fff0a3" if ray % 6 == 0 else "#fb923c" if ray % 2 else "#dc2626"
            spark(draw, cx + math.cos(angle) * length, core_y + math.sin(angle) * length * 0.7, color, 1 + (ray % 10 == 0))
        for chip in range(10):
            angle = chip * math.pi * 2 / 10 + 0.4
            sx = cx + math.cos(angle) * (9 + frame * 1.6)
            sy = core_y + math.sin(angle) * (5 + frame)
            poly(draw, [(sx - 2, sy), (sx + 1, sy - 2), (sx + 3, sy + 1), (sx - 1, sy + 3)], "#7c2d12", "#130403")
            rect(draw, sx, sy - 1, 2, 1, "#fed7aa")
    draw_fire_sac_body(draw, cx, ground, frame, action)
    if action == "attack":
        crack_color = "#fff0a3" if frame >= 2 else "#fed7aa"
        line(draw, [(cx - 2, ground - 18), (cx - 1, ground - 13), (cx - 4, ground - 8), (cx - 2, ground - 3)], crack_color, 1)
        line(draw, [(cx + 2, ground - 18), (cx + 4, ground - 14), (cx + 1, ground - 10), (cx + 5, ground - 5)], "#fb923c", 1)
        line(draw, [(cx - 9, ground - 14), (cx - 4, ground - 12), (cx - 8, ground - 8)], "#fed7aa", 1)
        line(draw, [(cx + 8, ground - 14), (cx + 4, ground - 10), (cx + 9, ground - 7)], "#fed7aa", 1)
        for shard in range(34):
            angle = -2.9 + shard * 0.18
            spread = 5 + frame * 2 + (shard % 5)
            sx = cx + math.cos(angle) * spread
            sy = ground - 9 + math.sin(angle) * spread * 0.62
            color = "#fed7aa" if shard % 5 == 0 else "#f97316" if shard % 2 else "#7c2d12"
            spark(draw, sx, sy, color, 1 + (shard % 13 == 0))
        if frame >= 3:
            for chunk in range(5):
                angle = chunk * math.pi * 2 / 5 + 0.4
                sx = cx + math.cos(angle) * (8 + frame)
                sy = ground - 8 + math.sin(angle) * (5 + frame * 0.5)
                poly(draw, [(sx - 2, sy), (sx + 2, sy - 1), (sx + 1, sy + 3), (sx - 2, sy + 2)], "#7c2d12", "#130403")
    if action == "hit":
        rect(draw, 8, 13, 17, 2, "#fff0a3")
        line(draw, [(9, 10), (14, 14), (12, 19), (21, 18)], "#090302", 1)
        for mote in range(18):
            spark(draw, 4 + mote * 1.45, 8 + mote % 7, "#f97316" if mote % 2 else "#fff0a3", 1 + (mote % 6 == 0))
    rect(draw, 7, ground + 1, 18, 1, "#080403")
    return image


def draw_bone_segment(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], width: int = 3) -> None:
    line(draw, points, "#09070b", width + 2)
    line(draw, points, "#7a6a59", width)
    line(draw, [(x + 1, y - 1) for x, y in points], "#ead8b4", max(1, width - 1))
    for x, y in points[1:-1]:
        ellipse(draw, (x - width, y - width, x + width, y + width), "#c9b18f", "#09070b")


def draw_horse_legs(draw: ImageDraw.ImageDraw, cx: float, ground: float, frame: int, action: str, lean: float) -> None:
    hoof = "#cbd5e1"
    phase = frame % 6
    gait = {
        "idle": [0, 1, 1, 0],
        "hit": [1, 0, 1, 0],
        "move": [0, 3, 3, 0],
        "skill": [4, 1, 0, 4],
        "attack": [1, 2, 0, 3],
        "phase": [0, 1, 1, 0],
    }.get(action, [0, 1, 1, 0])
    leg_roots = [(-26, ground - 40), (-13, ground - 38), (13, ground - 39), (26, ground - 37)]
    for index, (lx, root_y) in enumerate(leg_roots):
        stride = (gait[index] + phase % 2) if action in {"move", "skill", "attack"} else gait[index]
        forward = (-4 if index in {0, 2} else 4) * (1 if phase % 2 == 0 else -1)
        if action == "skill":
            forward = 6 if index in {0, 1} else -5
        if action == "attack" and index in {0, 1}:
            forward += 5
        root = (cx + lx + lean, root_y)
        knee = (cx + lx * 0.9 + lean + forward * 0.45, ground - 25 + stride)
        ankle = (cx + lx + lean + forward, ground - 10 + (stride * 0.35))
        hoof_x = ankle[0] + (3 if index % 2 else -2)
        draw_bone_segment(draw, [root, knee, ankle], 3 if index in {0, 3} else 2)
        rect(draw, hoof_x - 5, ground - 7, 11, 3, "#111827")
        rect(draw, hoof_x - 4, ground - 9, 8, 3, hoof)
        rect(draw, hoof_x - 2, ground - 10, 3, 1, "#f8fafc")
        rect(draw, ankle[0] - 2, ankle[1] - 1, 3, 2, "#fff1c7" if index % 2 == 0 else "#6c5a46")
        if action in {"move", "skill"} and (frame + index) % 2 == 0:
            spark(draw, hoof_x - 5 + index, ground - 12 - index % 3, "#f97316" if action == "skill" else "#cbd5e1", 1)


def draw_bone_horse(draw: ImageDraw.ImageDraw, frame: int, action: str, lean: float) -> None:
    ground = 82
    dark = "#050407"
    bone = "#d9c39a"
    bone_hi = "#fff1c7"
    bone_shadow = "#6c5a46"
    red = "#7f1d1d"
    ember = "#f97316"
    cx = 47 + lean

    ellipse(draw, (12 + lean, ground - 12, 83 + lean, ground + 4), "rgba(3,3,6,170)")
    poly(draw, [(22 + lean, ground - 42), (35 + lean, ground - 50), (62 + lean, ground - 49), (74 + lean, ground - 39), (67 + lean, ground - 24), (31 + lean, ground - 24)], "#170d0d", dark)
    poly(draw, [(25 + lean, ground - 43), (39 + lean, ground - 48), (62 + lean, ground - 45), (70 + lean, ground - 38), (63 + lean, ground - 28), (31 + lean, ground - 28)], "#2a1714", dark)

    line(draw, [(26 + lean, ground - 40), (64 + lean, ground - 42)], bone_shadow, 4)
    line(draw, [(27 + lean, ground - 42), (64 + lean, ground - 44)], bone_hi, 2)
    for rib in range(8):
        x = 31 + lean + rib * 4.2
        line(draw, [(x, ground - 40), (x - 2, ground - 29)], dark, 3)
        line(draw, [(x + 1, ground - 40), (x - 1, ground - 29)], bone, 1)
        if rib % 2 == frame % 2:
            rect(draw, x - 1, ground - 35, 2, 1, bone_hi)
    ellipse(draw, (22 + lean, ground - 45, 35 + lean, ground - 32), bone_shadow, dark)
    ellipse(draw, (55 + lean, ground - 47, 72 + lean, ground - 29), bone_shadow, dark)
    rect(draw, 26 + lean, ground - 40, 6, 3, bone_hi)
    rect(draw, 61 + lean, ground - 42, 5, 3, bone_hi)
    for plate in range(6):
        rect(draw, 31 + lean + plate * 5, ground - 47 + plate % 2, 3, 1, "#fff1c7" if plate % 2 else "#6c5a46")

    pixel_polyline(draw, [(63 + lean, ground - 43), (74 + lean, ground - 51), (83 + lean, ground - 52)], [dark, bone_shadow], 5)
    pixel_polyline(draw, [(64 + lean, ground - 45), (75 + lean, ground - 52), (84 + lean, ground - 53)], [bone, bone_hi], 2)
    ellipse(draw, (77 + lean, ground - 60, 93 + lean, ground - 43), bone, dark)
    rect(draw, 83 + lean, ground - 54, 4, 4, "#dc2626")
    rect(draw, 87 + lean, ground - 50, 8, 3, "#f8fafc")
    rect(draw, 91 + lean, ground - 47, 3, 5, bone_shadow)
    rect(draw, 80 + lean, ground - 55, 2, 2, dark)
    line(draw, [(78 + lean, ground - 48), (92 + lean, ground - 45)], dark, 1)
    for tooth in range(4):
        rect(draw, 88 + lean + tooth * 2, ground - 47, 1, 3, bone_hi)
    poly(draw, [(80 + lean, ground - 59), (76 + lean, ground - 67), (86 + lean, ground - 60)], bone_shadow, dark)
    poly(draw, [(89 + lean, ground - 56), (94 + lean, ground - 64), (92 + lean, ground - 52)], bone_shadow, dark)

    for vertebra in range(7):
        ellipse(draw, (24 + lean + vertebra * 6, ground - 51 + (vertebra % 2), 28 + lean + vertebra * 6, ground - 47 + (vertebra % 2)), bone_hi, dark)
    draw_horse_legs(draw, 47, ground, frame, action, lean)
    line(draw, [(63 + lean, ground - 49), (46 + lean, ground - 61), (29 + lean, ground - 46)], "#0f172a", 2)
    line(draw, [(64 + lean, ground - 50), (47 + lean, ground - 62), (30 + lean, ground - 47)], "#f59e0b", 1)
    for chain in range(7):
        rect(draw, 28 + lean + chain * 5, ground - 28 - chain % 2, 2, 2, "#9ca3af" if chain % 2 else "#374151")
    for spark_index in range(9):
        if (spark_index + frame) % 2 == 0:
            spark(draw, 19 + lean + spark_index * 7, ground - 54 - spark_index % 3, ember if spark_index % 3 else red, 2)


def draw_torn_banner(draw: ImageDraw.ImageDraw, lean: float, frame: int, action: str) -> None:
    ground = 82
    flutter = math.sin(frame * 0.9) * (2 if action in {"move", "skill"} else 1)
    poly(draw, [
        (39 + lean, ground - 68),
        (19 + lean - flutter, ground - 58),
        (28 + lean + flutter, ground - 50),
        (17 + lean - flutter, ground - 42),
        (39 + lean, ground - 47),
    ], "#4c0b13", "#09070b")
    poly(draw, [
        (42 + lean, ground - 68),
        (28 + lean - flutter, ground - 55),
        (38 + lean + flutter, ground - 48),
        (32 + lean - flutter, ground - 40),
        (47 + lean, ground - 48),
    ], "#7f1d1d", "#09070b")
    for tear in range(5):
        rect(draw, 24 + lean + tear * 4 + flutter * 0.2, ground - 50 + tear % 3 * 3, 2, 5, "#09070b")


def draw_knight_rider(draw: ImageDraw.ImageDraw, frame: int, action: str, lean: float) -> None:
    ground = 82
    dark = "#050407"
    bone = "#ead8b4"
    bone_hi = "#fff1c7"
    armor = "#111827"
    armor2 = "#263241"
    armor_hi = "#94a3b8"
    gold = "#f59e0b"
    red = "#dc2626"
    stab = action in {"attack", "skill2"}
    charge = action == "skill"
    block = action == "phase"
    hit = action == "hit"
    hurt_shift = -3 if hit and frame % 2 else 0

    rx = 47 + lean + hurt_shift
    draw_torn_banner(draw, lean + hurt_shift, frame, action)
    rect(draw, rx - 3, ground - 71, 24, 28, dark)
    rect(draw, rx, ground - 70, 18, 26, armor)
    rect(draw, rx + 2, ground - 67, 14, 20, armor2)
    rect(draw, rx - 5, ground - 58, 29, 7, armor_hi)
    rect(draw, rx + 1, ground - 65, 4, 17, "#475569")
    rect(draw, rx + 8, ground - 66, 3, 18, "#64748b")
    rect(draw, rx + 13, ground - 62, 3, 12, "#1e293b")
    for plate in range(4):
        rect(draw, rx + 2, ground - 58 + plate * 4, 13, 1, "#cbd5e1" if plate % 2 == 0 else "#334155")
    for rivet in range(9):
        rect(draw, rx + 2 + (rivet % 3) * 5, ground - 66 + (rivet // 3) * 6, 2, 2, gold if rivet % 2 else armor_hi)
    ellipse(draw, (rx - 7, ground - 66, rx + 4, ground - 55), armor2, dark)
    ellipse(draw, (rx + 14, ground - 66, rx + 27, ground - 55), armor2, dark)
    rect(draw, rx - 6, ground - 62, 7, 3, armor_hi)
    rect(draw, rx + 18, ground - 62, 7, 3, armor_hi)

    ellipse(draw, (rx + 1, ground - 85, rx + 20, ground - 66), bone, dark)
    rect(draw, rx + 4, ground - 81, 4, 5, "#111827")
    rect(draw, rx + 13, ground - 81, 4, 5, red)
    rect(draw, rx + 6, ground - 73, 9, 2, "#513329")
    for tooth in range(5):
        rect(draw, rx + 5 + tooth * 2, ground - 71, 1, 2, bone_hi)
    rect(draw, rx + 3, ground - 78, 3, 1, "#6c5a46")
    rect(draw, rx + 13, ground - 78, 3, 1, "#ffedd5")
    rect(draw, rx + 4, ground - 88, 15, 4, armor)
    rect(draw, rx + 1, ground - 91, 21, 5, "#1f2937")
    poly(draw, [(rx + 1, ground - 84), (rx - 8, ground - 91), (rx + 3, ground - 77)], armor_hi, dark)
    poly(draw, [(rx + 19, ground - 84), (rx + 29, ground - 91), (rx + 18, ground - 77)], armor_hi, dark)
    rect(draw, rx + 8, ground - 90, 6, 2, gold)
    rect(draw, rx + 11, ground - 86, 2, 4, bone_hi)

    shield_x = rx - 8
    shield_y = ground - 55
    poly(draw, [
        (shield_x - 8, shield_y - 11),
        (shield_x + 8, shield_y - 12),
        (shield_x + 12, shield_y + 2),
        (shield_x + 3, shield_y + 16),
        (shield_x - 9, shield_y + 6),
    ], "#111827", dark)
    poly(draw, [
        (shield_x - 5, shield_y - 8),
        (shield_x + 6, shield_y - 8),
        (shield_x + 8, shield_y + 2),
        (shield_x + 2, shield_y + 11),
        (shield_x - 6, shield_y + 4),
    ], "#374151", "#0f172a")
    line(draw, [(shield_x - 3, shield_y - 4), (shield_x + 6, shield_y + 5)], armor_hi, 2)
    line(draw, [(shield_x + 5, shield_y - 5), (shield_x - 3, shield_y + 6)], "#cbd5e1", 1)
    for rivet in [(-5, -6), (6, -6), (7, 2), (-4, 6)]:
        rect(draw, shield_x + rivet[0], shield_y + rivet[1], 2, 2, gold)
    rect(draw, shield_x, shield_y, 4, 4, "#fef3c7")
    rect(draw, shield_x - 2, shield_y - 2, 2, 2, "#f59e0b")
    rect(draw, shield_x + 5, shield_y + 5, 2, 2, "#cbd5e1")
    line(draw, [(shield_x - 6, shield_y + 1), (shield_x + 8, shield_y + 1)], "#64748b", 1)
    if block:
        for step in range(4):
            line(draw, [
                (shield_x - 13 - step, shield_y - 12 - step),
                (shield_x - 17 - step, shield_y),
                (shield_x - 12 - step, shield_y + 12 + step),
            ], "#fef3c7" if step < 2 else gold, 1)
        for mote in range(16):
            angle = -math.pi * 0.78 + mote * math.pi * 1.25 / 15
            spark(draw, shield_x - 13 + math.cos(angle) * 13, shield_y + math.sin(angle) * 17, "#fff7cc" if mote % 2 else gold, 2)

    spear_y = ground - 58 + (-4 if stab or charge else -1)
    spear_start = rx + 17
    spear_end = 92 + lean if stab or charge else 81 + lean
    if action == "skill2":
        spear_end = 94 + lean
    line(draw, [(spear_start - 2, spear_y + 4), (spear_end, spear_y - (4 if charge else 1))], dark, 5)
    line(draw, [(spear_start - 2, spear_y + 4), (spear_end, spear_y - (4 if charge else 1))], "#7a5a38", 3)
    line(draw, [(spear_start + 3, spear_y + 2), (spear_end - 3, spear_y - (5 if charge else 2))], "#f8fafc", 1)
    poly(draw, [(spear_end - 1, spear_y - 9), (spear_end + 10, spear_y - 2), (spear_end, spear_y + 6)], bone_hi, dark)
    rect(draw, spear_end - 3, spear_y - 3, 5, 2, gold)
    if stab:
        for ray in range(4):
            line(draw, [(spear_end - 13, spear_y - 2 + ray * 2), (95, spear_y - 9 + ray * 5)], "#f87171" if ray % 2 else "#fef3c7", 1)
        spark(draw, spear_end + 7, spear_y - 2, "#fef3c7", 3)
        for shard in range(10):
            spark(draw, spear_end - 14 + shard * 3, spear_y - 10 + (shard % 5) * 4, "#f97316" if shard % 2 else "#fef3c7", 1 + (shard % 4 == 0))
    if charge:
        for trail in range(6):
            line(draw, [(spear_start - 12 - trail * 5, spear_y + 12 + trail % 2), (94 - trail * 3, spear_y - 2)], "#7f1d1d" if trail % 2 else "#f97316", 2)
        spark(draw, spear_end + 5, spear_y - 3, "#fff7cc", 3)


def draw_knight_body(draw: ImageDraw.ImageDraw, frame: int, action: str) -> None:
    ground = 82
    red = "#7f1d1d"
    ember = "#f97316"
    gold = "#f59e0b"
    charge = action == "skill"
    stab = action in {"attack", "skill2"}
    lean = 7 if charge else 4 if stab else -3 if action == "hit" and frame % 2 else 0

    if charge:
        for trail in range(10):
            rect(draw, 1 + trail * 4, ground - 54 + trail * 3.2, 52 - trail * 2, 2, "#421326" if trail % 2 else red)
            rect(draw, 5 + trail * 5, ground - 23 + trail % 5, 36 - trail * 2, 1, "#271012")
            spark(draw, 8 + trail * 7, ground - 20 + trail % 4, ember if trail % 2 else gold, 2)

    draw_bone_horse(draw, frame, action, lean)
    draw_knight_rider(draw, frame, action, lean)
    if action == "hit":
        for mote in range(16):
            spark(draw, 34 + mote * 3.2, ground - 66 + (mote % 7) * 4, "#fef3c7" if mote % 2 else red, 2)
    if action == "skill2":
        for streak in range(9):
            line(draw, [(36 + streak * 5, ground - 67 + streak % 3), (94, ground - 66 + streak * 2)], "#fef3c7" if streak % 2 else "#dc2626", 1)
            spark(draw, 81 + streak, ground - 72 + streak % 5, gold if streak % 2 else ember, 2)


def draw_skeleton_knight(frame: int, action: str) -> Image.Image:
    image = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    ground = 82
    if action == "death":
        collapse = frame * 4
        ellipse(draw, (13, ground - 10, 82, ground + 4), "#070507")
        line(draw, [(14, ground - 10 + collapse * 0.25), (41, ground - 18 + collapse * 0.4), (71, ground - 13 + collapse * 0.25)], "#09070b", 5)
        line(draw, [(15, ground - 12 + collapse * 0.25), (40, ground - 20 + collapse * 0.4), (70, ground - 15 + collapse * 0.25)], "#ead8b4", 2)
        for rib in range(8):
            x = 24 + rib * 5
            line(draw, [(x, ground - 22 + collapse * 0.3), (x - 2, ground - 10 + collapse * 0.45)], "#c9b18f", 1)
        rect(draw, 40, ground - 44 + collapse, 21, 13, "#111827")
        rect(draw, 43, ground - 41 + collapse, 15, 7, "#64748b")
        ellipse(draw, (50, ground - 55 + collapse, 68, ground - 38 + collapse), "#ead8b4", "#09070b")
        rect(draw, 55, ground - 50 + collapse, 4, 4, "#dc2626")
        line(draw, [(15, ground - 4), (86, ground - 21 + collapse)], "#09070b", 5)
        line(draw, [(16, ground - 6), (84, ground - 23 + collapse)], "#9ca3af", 3)
        poly(draw, [(25, ground - 37 + collapse), (8, ground - 24 + collapse * 0.35), (31, ground - 22 + collapse * 0.4)], "#7f1d1d", "#09070b")
        poly(draw, [(36, ground - 37 + collapse), (27, ground - 22 + collapse), (43, ground - 20 + collapse)], "#4c0b13", "#09070b")
        for bone in range(26):
            spark(draw, 8 + bone * 3.2, ground - 27 - (bone % 6) * max(1, 6 - frame) + collapse * 0.25, "#ead8b4" if bone % 2 else "#9ca3af", 2 + (bone % 3 == 0))
        for ember in range(28):
            spark(draw, 3 + ember * 3.4, ground - 41 - (ember % 7) * 3 + collapse * 0.3, "#f97316" if ember % 3 else "#fef3c7", 2)
        return image
    draw_knight_body(draw, frame, action)
    return image


def generate() -> None:
    ooze_plan = [("idle", 5), ("move", 5), ("attack", 5), ("hit", 4), ("death", 5)]
    ooze_frames = [draw_splitting_ooze(index, action) for action, count in ooze_plan for index in range(count)]
    make_sheet(ooze_frames, 32, "splitting-ooze-sheet.png", "splitting-ooze-preview.png", [count for _, count in ooze_plan])

    sac_plan = [("idle", 5), ("move", 5), ("attack", 5), ("hit", 4), ("death", 5)]
    sac_frames = [draw_fire_sac(index, action) for action, count in sac_plan for index in range(count)]
    make_sheet(sac_frames, 32, "explosive-fire-sac-sheet.png", "explosive-fire-sac-preview.png", [count for _, count in sac_plan])

    knight_plan = [("idle", 6), ("move", 6), ("attack", 5), ("skill", 6), ("skill2", 5), ("hit", 4), ("phase", 4), ("death", 6)]
    knight_action_map = {
        "idle": "idle",
        "move": "move",
        "attack": "attack",
        "skill": "skill",
        "skill2": "skill2",
        "hit": "hit",
        "phase": "phase",
        "death": "death",
    }
    knight_frames = [draw_skeleton_knight(index, knight_action_map[action]) for action, count in knight_plan for index in range(count)]
    make_sheet(knight_frames, 96, "skeleton-knight-sheet.png", "skeleton-knight-preview.png", [count for _, count in knight_plan])


if __name__ == "__main__":
    generate()
