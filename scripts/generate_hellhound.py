from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "monsters"
FRAME_SIZE = 64
GROUPS = [
    ("idle", 6),
    ("move", 6),
    ("attack", 6),
    ("skill", 6),
    ("hit", 5),
    ("death", 5),
]

P = {
    "outline": "#050405",
    "black": "#0b0809",
    "charcoal": "#161014",
    "body": "#241017",
    "red": "#57151c",
    "red2": "#8f1d1d",
    "ember": "#e34418",
    "orange": "#ff7a1a",
    "yellow": "#ffd05a",
    "hot": "#fff0a3",
    "bone": "#ffe9c7",
    "shadow": "#100609",
    "smoke": "#2f2630",
    "joint": "#b7311b",
}


def rect(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str) -> None:
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=fill)


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None) -> None:
    draw.ellipse(box, fill=fill, outline=outline)


def poly(draw: ImageDraw.ImageDraw, points: list[tuple[int, int]], fill: str, outline: str | None = None) -> None:
    draw.polygon(points, fill=fill)
    if outline:
        draw.line(points + [points[0]], fill=outline, width=1)


def spark(draw: ImageDraw.ImageDraw, x: int, y: int, color: str = P["orange"], size: int = 2) -> None:
    rect(draw, x, y, size, max(1, size - 1), color)
    if size > 2:
        rect(draw, x + 1, y - 2, max(1, size - 2), 2, P["yellow"])


def draw_flames(draw: ImageDraw.ImageDraw, frame: int, ox: int, oy: int, count: int = 8) -> None:
    for index in range(count):
        x = ox + index * 5 + (frame % 2)
        y = oy - (index % 4) * 3 + ((frame + index) % 3)
        color = P["yellow"] if index % 5 == 0 else P["orange"] if index % 2 == 0 else P["ember"]
        spark(draw, x, y, color, 2 + (index % 3 == 0))


def draw_head(
    draw: ImageDraw.ImageDraw,
    hx: int,
    hy: int,
    *,
    frame: int,
    jaw: int = 0,
    main: bool = False,
    hurt: bool = False,
) -> None:
    rect(draw, hx - 8, hy - 7, 15, 12, P["outline"])
    rect(draw, hx - 6, hy - 9, 13, 8, P["body"])
    rect(draw, hx + 4, hy - 5, 14, 8, P["outline"])
    rect(draw, hx + 6, hy - 4, 11, 6, P["charcoal"])
    rect(draw, hx + 15, hy - 2, 6, 4, P["black"])
    rect(draw, hx + 5, hy + 3 + jaw, 13, 5, P["red"])
    rect(draw, hx + 7, hy + 4 + jaw, 9, 2, P["bone"])
    rect(draw, hx + 11, hy + 6 + jaw, 4, 2, P["orange"])

    poly(draw, [(hx - 7, hy - 8), (hx - 3, hy - 18), (hx, hy - 7)], P["red"], P["outline"])
    poly(draw, [(hx + 3, hy - 9), (hx + 8, hy - 19), (hx + 9, hy - 7)], P["red2"], P["outline"])
    rect(draw, hx - 2, hy - 3, 3, 3, P["yellow"] if main else P["orange"])
    rect(draw, hx + 9, hy - 2, 3, 3, P["ember"])
    if hurt:
        rect(draw, hx - 5, hy + 1, 10, 1, P["ember"])
        rect(draw, hx + 5, hy + 1, 7, 1, P["yellow"])
    if main:
        spark(draw, hx - 2 + frame % 2, hy - 20, P["orange"], 2)


def draw_leg(
    draw: ImageDraw.ImageDraw,
    hip_x: int,
    hip_y: int,
    phase: int,
    *,
    front: bool = False,
    planted: bool = False,
) -> None:
    cycle = phase % 6
    lift = [0, -2, -5, -3, 1, 0][cycle]
    stride = [-5, -2, 2, 5, 2, -3][cycle]
    if planted:
        lift = 0
        stride = max(-2, min(2, stride))

    knee_x = hip_x + stride // 2 + (1 if front else -1)
    knee_y = hip_y + 13 + lift // 2
    paw_x = hip_x + stride
    paw_y = hip_y + 29 + lift
    upper = P["red"] if front else P["charcoal"]
    lower = P["body"] if front else P["black"]
    edge = P["ember"] if front else P["red2"]

    poly(draw, [(hip_x - 3, hip_y), (hip_x + 4, hip_y + 1), (knee_x + 4, knee_y), (knee_x - 3, knee_y + 1)], P["outline"])
    poly(draw, [(hip_x - 2, hip_y + 1), (hip_x + 3, hip_y + 2), (knee_x + 2, knee_y), (knee_x - 2, knee_y)], upper)
    rect(draw, knee_x - 3, knee_y - 1, 7, 4, P["outline"])
    rect(draw, knee_x - 1, knee_y, 4, 2, P["joint"])
    poly(draw, [(knee_x - 2, knee_y + 2), (knee_x + 3, knee_y + 1), (paw_x + 3, paw_y - 4), (paw_x - 3, paw_y - 3)], P["outline"])
    poly(draw, [(knee_x - 1, knee_y + 3), (knee_x + 2, knee_y + 2), (paw_x + 1, paw_y - 4), (paw_x - 2, paw_y - 3)], lower)
    rect(draw, paw_x - 5, paw_y - 3, 11, 4, P["outline"])
    rect(draw, paw_x - 4, paw_y - 4, 9, 3, P["red"] if front else P["body"])
    rect(draw, paw_x + 4, paw_y - 5, 3, 2, P["bone"])
    rect(draw, paw_x - 5, paw_y - 5, 2, 2, P["orange"] if front else P["red2"])
    rect(draw, paw_x - 4, paw_y + 2, 10, 1, "#050303")


def draw_body(
    draw: ImageDraw.ImageDraw,
    *,
    frame: int,
    cx: int = 31,
    ground: int = 51,
    lean: int = 0,
    squash: int = 0,
    stride_offset: int = 0,
    jaw: int = 0,
    skill: int = 0,
    hurt: bool = False,
) -> None:
    y = ground - 24 + squash
    x = cx + lean
    for sx, sw in [(-19, 12), (-5, 10), (10, 10), (24, 11)]:
        ellipse(draw, (x + sx - 4, ground - 1, x + sx + sw, ground + 3), "#080405")

    tail_y = y + 2 + (frame % 3) - squash
    rect(draw, x - 30, tail_y + 1, 13, 4, P["outline"])
    rect(draw, x - 39, tail_y - 3, 12, 4, P["body"])
    rect(draw, x - 45, tail_y - 10, 8, 7, P["red2"])
    spark(draw, x - 42, tail_y - 13, P["orange"], 3)

    shoulder_y = y - 4 - (1 if frame % 3 == 1 else 0)
    hip_y = y - 1 + (1 if frame % 3 == 4 else 0)
    ellipse(draw, (x - 25, shoulder_y - 7, x + 7, shoulder_y + 14), P["outline"])
    ellipse(draw, (x - 23, shoulder_y - 6, x + 5, shoulder_y + 11), P["charcoal"])
    ellipse(draw, (x - 5, hip_y - 8, x + 24, hip_y + 14), P["outline"])
    ellipse(draw, (x - 3, hip_y - 7, x + 21, hip_y + 11), P["body"])
    rect(draw, x - 21, shoulder_y - 4, 30, 5, P["red"])
    rect(draw, x - 15, y + 3, 25, 3, P["black"])
    rect(draw, x - 8, y + 8, 16, 2, P["red2"])
    rect(draw, x - 3, y + 10, 9, 2, P["outline"])

    mane = [
        (x - 16, y - 9, 5, 9),
        (x - 8, y - 12, 5, 10),
        (x + 1, y - 11, 5, 8),
        (x + 9, y - 7, 5, 6),
    ]
    for index, (mx, my, mw, mh) in enumerate(mane):
        rect(draw, mx, my - ((frame + index) % 2), mw, mh, P["red2"] if index % 2 else P["ember"])
        rect(draw, mx + 1, my - 4 - ((frame + index) % 2), max(2, mw - 2), 4, P["orange"])

    front_support = skill > 0
    attack_brace = jaw >= 4
    draw_leg(draw, x - 19, ground - 30, frame + stride_offset, front=False, planted=attack_brace)
    draw_leg(draw, x - 5, ground - 31, frame + 3 + stride_offset, front=True, planted=front_support)
    draw_leg(draw, x + 10, ground - 30, frame + 1 + stride_offset, front=False, planted=front_support)
    draw_leg(draw, x + 24, ground - 32, frame + 4 + stride_offset, front=True, planted=attack_brace or front_support)

    draw_head(draw, x + 8, y - 12, frame=frame, jaw=max(0, jaw - 1), hurt=hurt)
    draw_head(draw, x + 24, y - 18, frame=frame, jaw=jaw, main=True, hurt=hurt)
    draw_head(draw, x + 32, y - 7, frame=frame, jaw=max(0, jaw - 2), hurt=hurt)

    rect(draw, x - 21, y + 7, 26, 1, P["ember"])
    rect(draw, x - 10, y - 7, 18, 1, P["yellow"])
    rect(draw, x + 12, y + 3, 10, 1, P["orange"])
    if hurt:
        rect(draw, x - 12, y + 1, 21, 2, P["ember"])
        rect(draw, x - 5, y - 5, 4, 15, P["yellow"])
    if skill:
        rect(draw, x + 31, y - 17, 7, 5, P["yellow"])
        rect(draw, x + 36, y - 15, 10, 3, P["orange"])
        spark(draw, x + 41, y - 21, P["hot"], 3)

    draw_flames(draw, frame, x - 20, y - 12, 7)


def draw_fire_breath(draw: ImageDraw.ImageDraw, frame: int, ox: int, oy: int) -> None:
    reach = 17 + frame * 6
    height = 9 + frame
    for step in range(reach):
        t = step / max(1, reach)
        spread = int(height * t)
        x = ox + step
        y = oy + ((step + frame) % 3) - 1
        color = P["hot"] if step % 7 == 0 else P["yellow"] if step % 3 == 0 else P["orange"] if step % 2 == 0 else P["ember"]
        rect(draw, x, y - spread // 2, 3 + (step % 3 == 0), 2 + min(5, spread), color)
    for ember in range(18):
        x = ox + ember * 3 + frame
        y = oy - 12 + (ember % 7) * 4 - frame % 2
        spark(draw, x, y, P["orange"] if ember % 2 else P["yellow"], 2)


def draw_frame(action: str, index: int) -> Image.Image:
    image = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if action == "idle":
        bob = [0, -1, -1, 0, 1, 0][index]
        draw_body(draw, frame=index, ground=51 + bob, lean=[0, 0, 1, 0, -1, 0][index])

    elif action == "move":
        lean = [-2, 0, 3, 1, -2, -3][index]
        ground = [51, 50, 49, 51, 52, 51][index]
        for trail in range(9):
            spark(draw, 7 + trail * 4 - index, 45 - (trail % 3) * 3, P["ember"] if trail % 2 else P["orange"], 2)
        draw_body(draw, frame=index, ground=ground, lean=lean, stride_offset=index)

    elif action == "attack":
        settings = [
            (-3, 51, 0),
            (-2, 50, 1),
            (1, 49, 4),
            (5, 50, 6),
            (3, 51, 4),
            (0, 51, 1),
        ][index]
        lean, ground, jaw = settings
        draw_body(draw, frame=index, ground=ground, lean=lean, jaw=jaw)
        if index >= 2:
            rect(draw, 48, 31, 12, 2, P["bone"])
            rect(draw, 51, 38, 10, 2, P["bone"])
            spark(draw, 55, 28, P["orange"], 3)

    elif action == "skill":
        settings = [
            (-2, 51, 1),
            (-1, 50, 3),
            (0, 50, 5),
            (1, 51, 7),
            (0, 51, 6),
            (-1, 51, 3),
        ][index]
        lean, ground, jaw = settings
        # Skill frames keep the body slightly left so the breath cone visibly starts
        # from the lead head's mouth instead of reading as a low/body-center effect.
        draw_body(draw, frame=index, cx=25, ground=ground, lean=lean, jaw=jaw, skill=index + 1)
        if index >= 2:
            draw_fire_breath(draw, index - 1, 53, 17)

    elif action == "hit":
        lean = [-2, -5, -3, 0, 1][index]
        squash = [0, 2, 3, 1, 0][index]
        draw_body(draw, frame=index, ground=52, lean=lean, squash=squash, jaw=2, hurt=True)
        for ember in range(14):
            spark(draw, 8 + ember * 4, 21 + (ember % 5) * 5 - index, P["yellow"] if ember % 3 == 0 else P["ember"], 2)

    elif action == "death":
        ground = 52
        for sx, sw in [(11, 9), (22, 8), (34, 9), (46, 8)]:
            ellipse(draw, (sx - 4, ground - 1, sx + sw, ground + 2), "#080405")

        if index <= 2:
            slump = index * 3
            ellipse(draw, (15, ground - 20 + slump, 45, ground - 4 + slump // 2), P["outline"])
            ellipse(draw, (17, ground - 19 + slump, 42, ground - 6 + slump // 2), P["body"])
            ellipse(draw, (31, ground - 21 + slump, 54, ground - 6 + slump // 2), P["outline"])
            ellipse(draw, (33, ground - 20 + slump, 51, ground - 8 + slump // 2), P["charcoal"])
            rect(draw, 18, ground - 18 + slump, 25, 3, P["red"])
            rect(draw, 23, ground - 14 + slump, 16, 2, P["orange"])

            fallen_legs = [
                ((18, ground - 11 + slump), (9, ground - 2), True),
                ((26, ground - 10 + slump), (24, ground - 1), False),
                ((37, ground - 11 + slump), (41, ground - 1), False),
                ((47, ground - 12 + slump), (56, ground - 2), True),
            ]
            for (hip_x, hip_y), (paw_x, paw_y), front in fallen_legs:
                poly(draw, [(hip_x - 2, hip_y), (hip_x + 3, hip_y), (paw_x + 4, paw_y - 4), (paw_x - 3, paw_y - 3)], P["outline"])
                poly(draw, [(hip_x - 1, hip_y + 1), (hip_x + 2, hip_y + 1), (paw_x + 2, paw_y - 4), (paw_x - 2, paw_y - 3)], P["red"] if front else P["black"])
                rect(draw, paw_x - 4, paw_y - 4, 9, 3, P["red"] if front else P["body"])
                rect(draw, paw_x + 3, paw_y - 5, 3, 2, P["bone"])

            rect(draw, 41, ground - 28 + slump, 14, 10, P["outline"])
            rect(draw, 43, ground - 27 + slump, 10, 7, P["black"])
            rect(draw, 51, ground - 24 + slump, 7, 3, P["bone"])
            rect(draw, 46, ground - 26 + slump, 3, 3, P["ember"])
            rect(draw, 7, ground - 17 + slump, 15, 4, P["outline"])
            rect(draw, 4, ground - 20 + slump, 9, 5, P["red2"])
            spark(draw, 5, ground - 24 + slump, P["orange"], 2)
        else:
            ellipse(draw, (10, ground - 6, 53, ground + 1), P["outline"])
            ellipse(draw, (13, ground - 5, 49, ground), P["charcoal"])
            for x in [13, 23, 35, 46]:
                rect(draw, x, ground - 7, 8, 3, P["body"])
                rect(draw, x + 5, ground - 8, 3, 2, P["bone"])
            rect(draw, 20, ground - 9, 18, 4, P["red"])
            rect(draw, 39, ground - 12, 12, 4, P["black"])
        for ember in range(18):
            x = 9 + ember * 3
            y = ground - 7 - (ember % 4) * max(1, 3 - index // 2)
            spark(draw, x % FRAME_SIZE, y, P["orange"] if ember % 2 else P["ember"], 2)
        if index >= 3:
            rect(draw, 21, ground - 2, 22, 2, P["ember"])
            rect(draw, 31, ground - 6, 3, 3, P["yellow"])

    return image


def write_outputs() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    frames: list[Image.Image] = []
    for action, count in GROUPS:
        for index in range(count):
            frames.append(draw_frame(action, index))

    sheet = Image.new("RGBA", (len(frames) * FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))
    sheet.save(OUT_DIR / "hellhound-sheet.png")

    scale = 3
    gap = 5
    pad = 8
    preview_width = max(count for _, count in GROUPS) * (FRAME_SIZE * scale + gap) - gap + pad * 2
    preview_height = len(GROUPS) * (FRAME_SIZE * scale + gap) - gap + pad * 2
    preview = Image.new("RGBA", (preview_width, preview_height), (0, 0, 0, 0))
    cursor = 0
    y = pad
    for _, count in GROUPS:
        for x_index in range(count):
            enlarged = frames[cursor].resize((FRAME_SIZE * scale, FRAME_SIZE * scale), Image.Resampling.NEAREST)
            preview.alpha_composite(enlarged, (pad + x_index * (FRAME_SIZE * scale + gap), y))
            cursor += 1
        y += FRAME_SIZE * scale + gap
    preview.save(OUT_DIR / "hellhound-preview.png")


if __name__ == "__main__":
    write_outputs()
