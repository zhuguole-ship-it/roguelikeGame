from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "monsters"
FRAME_SIZE = 32
GROUPS = [
    ("idle", 5),
    ("move", 5),
    ("attack", 5),
    ("hit", 4),
    ("death", 4),
]

PALETTE = {
    "outline": "#061827",
    "outline2": "#0b2740",
    "deep": "#0c3b5a",
    "shadow": "#125b7e",
    "base": "#1e9bd0",
    "mid": "#44c3ef",
    "light": "#93e8ff",
    "hot": "#dffbff",
    "ice": "#f8fbff",
    "crack": "#082f49",
    "eye": "#04111f",
    "trail": "#7dd3fc",
}


def rect(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str) -> None:
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=fill)


def px(draw: ImageDraw.ImageDraw, points: Iterable[tuple[int, int]], fill: str) -> None:
    for x, y in points:
        if 0 <= x < FRAME_SIZE and 0 <= y < FRAME_SIZE:
            draw.point((x, y), fill=fill)


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None) -> None:
    draw.ellipse(box, fill=fill, outline=outline)


def diamond(draw: ImageDraw.ImageDraw, cx: int, cy: int, radius: int, fill: str, outline: str | None = None) -> None:
    points = [(cx, cy - radius), (cx + radius, cy), (cx, cy + radius), (cx - radius, cy)]
    if outline:
        draw.polygon(points, fill=outline)
        points = [(cx, cy - radius + 1), (cx + radius - 1, cy), (cx, cy + radius - 1), (cx - radius + 1, cy)]
    draw.polygon(points, fill=fill)


def draw_crystals(draw: ImageDraw.ImageDraw, cx: int, top: int, frame: int, lean: int = 0, cracked: bool = False) -> None:
    wobble = [0, -1, 0, 1, 0][frame % 5]
    rect(draw, cx - 8 + lean, top + 1 + wobble, 3, 8, PALETTE["outline"])
    rect(draw, cx - 7 + lean, top + wobble, 2, 7, PALETTE["ice"] if not cracked else PALETTE["light"])
    rect(draw, cx - 5 + lean, top + 4 + wobble, 1, 3, PALETTE["mid"])

    rect(draw, cx + 4 + lean, top - 2 - wobble, 4, 10, PALETTE["outline"])
    rect(draw, cx + 5 + lean, top - 4 - wobble, 2, 10, PALETTE["hot"])
    rect(draw, cx + 7 + lean, top + 1 - wobble, 1, 6, PALETTE["mid"])

    rect(draw, cx - 1 + lean, top - 5 + wobble, 3, 9, PALETTE["outline2"])
    rect(draw, cx + lean, top - 7 + wobble, 2, 8, PALETTE["ice"])
    rect(draw, cx + 1 + lean, top - 2 + wobble, 1, 5, PALETTE["light"])

    if cracked:
      rect(draw, cx + lean, top - 4 + wobble, 1, 5, PALETTE["crack"])
      rect(draw, cx + 5 + lean, top + 1 - wobble, 2, 1, PALETTE["crack"])


def draw_body(
    draw: ImageDraw.ImageDraw,
    *,
    cx: int = 16,
    base_y: int = 25,
    width: int = 20,
    height: int = 15,
    squash: int = 0,
    lean: int = 0,
    frame: int = 0,
    charge: int = 0,
    hurt: bool = False,
) -> None:
    top = base_y - height
    left = cx - width // 2 + lean
    right = cx + width // 2 + lean
    bottom = base_y + squash

    ellipse(draw, (left - 1, top + 1, right + 1, bottom + 1), PALETTE["outline"])
    ellipse(draw, (left, top + 2, right, bottom), PALETTE["deep"])
    ellipse(draw, (left + 1, top + 2, right - 1, bottom - 1), PALETTE["base"])
    ellipse(draw, (left + 3, top + 3, right - 3, top + height // 2 + 4), PALETTE["mid"])
    ellipse(draw, (left + 5, top + 4, left + 15, top + 10), PALETTE["light"])
    ellipse(draw, (left + 7, top + 5, left + 12, top + 8), PALETTE["hot"])

    rect(draw, left + 2, bottom - 4, width - 3, 3, PALETTE["shadow"])
    rect(draw, left + 5, bottom - 3, width - 9, 2, PALETTE["base"])
    rect(draw, left + 6, bottom - 2, 5, 1, PALETTE["light"])
    rect(draw, right - 8, bottom - 3, 4, 1, PALETTE["ice"])

    eye_y = top + 9 + squash // 2
    rect(draw, cx - 5 + lean, eye_y, 3, 3, PALETTE["eye"])
    rect(draw, cx + 4 + lean, eye_y, 3, 3, PALETTE["eye"])
    rect(draw, cx - 4 + lean, eye_y, 1, 1, PALETTE["ice"])
    rect(draw, cx + 5 + lean, eye_y, 1, 1, PALETTE["ice"])

    rect(draw, cx - 4 + lean, eye_y + 7, 9, 2, PALETTE["outline"])
    rect(draw, cx - 1 + lean, eye_y + 8, 2, 2, PALETTE["ice"])
    rect(draw, cx + 3 + lean, eye_y + 8, 2, 2, PALETTE["ice"])

    draw_crystals(draw, cx, top, frame, lean, hurt)

    if charge:
        diamond(draw, cx + 11 + charge + lean, eye_y + 3, 3 + charge // 2, PALETTE["hot"], PALETTE["outline2"])
        rect(draw, cx + 4 + lean, eye_y + 2, 7 + charge, 2, PALETTE["light"])
        rect(draw, cx + 8 + lean, eye_y - 2, 2, 7, PALETTE["ice"])

    px(
        draw,
        [
            (left + 5, top + 12),
            (left + 9, top + 7),
            (right - 5, top + 8),
            (right - 6, bottom - 6),
            (left + 3, bottom - 7),
            (cx + lean, top + 5),
        ],
        PALETTE["hot"],
    )

    if hurt:
        rect(draw, cx - 1 + lean, top + 4, 2, 9, PALETTE["crack"])
        rect(draw, cx + 1 + lean, top + 11, 5, 2, PALETTE["crack"])
        rect(draw, cx - 7 + lean, top + 11, 4, 2, PALETTE["crack"])


def draw_snow(draw: ImageDraw.ImageDraw, frame: int, origin_x: int, origin_y: int, spread: int = 12) -> None:
    for index in range(7):
        x = origin_x + index * 3 + frame % 2
        y = origin_y - (index % 3) * 3 + (frame % 3)
        color = PALETTE["ice"] if index % 3 == 0 else PALETTE["trail"]
        rect(draw, x % FRAME_SIZE, y, 1 + (index % 4 == 0), 1, color)
    rect(draw, max(0, origin_x - 1), origin_y + 3, spread, 1, PALETTE["trail"])


def draw_frame(action: str, index: int) -> Image.Image:
    image = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if action == "idle":
        bob = [0, -1, -1, 0, 1][index]
        widths = [20, 20, 21, 19, 20]
        heights = [15, 16, 16, 15, 14]
        draw_snow(draw, index, 4, 26, 7)
        draw_body(draw, width=widths[index], height=heights[index], base_y=25 + bob, frame=index)
        px(draw, [(5, 19), (27, 17), (8, 10), (24, 8)], PALETTE["ice"])

    elif action == "move":
        params = [
            (20, 13, 0, -1),
            (22, 12, 1, 0),
            (19, 16, -1, 1),
            (23, 12, 2, 0),
            (20, 14, 0, -1),
        ][index]
        width, height, lean, bob = params
        rect(draw, 2 + index, 26, 10, 1, PALETTE["trail"])
        rect(draw, 5 + index, 25, 7, 1, PALETTE["ice"])
        draw_snow(draw, index, 3 + index, 24, 11)
        draw_body(draw, width=width, height=height, base_y=25 + bob, lean=lean, frame=index)

    elif action == "attack":
        params = [
            (20, 15, 0, 0, 0),
            (20, 15, 0, 0, 1),
            (19, 16, -1, -1, 2),
            (20, 15, 0, 0, 3),
            (20, 14, 0, 0, 5),
        ][index]
        width, height, lean, bob, charge = params
        draw_body(draw, width=width, height=height, base_y=25 + bob, lean=lean, frame=index, charge=charge)
        if index >= 1:
            rect(draw, 22, 15, 4 + index, 2, PALETTE["light"])
            if index >= 3:
                diamond(draw, 27 + min(index, 4), 16, 4, PALETTE["ice"], PALETTE["outline2"])
                rect(draw, 22, 17, 7, 1, PALETTE["trail"])
                px(draw, [(25, 12), (28, 10), (30, 19), (24, 21)], PALETTE["hot"])

    elif action == "hit":
        params = [
            (21, 12, -1, 2),
            (24, 10, 0, 4),
            (22, 11, 1, 3),
            (20, 13, 0, 1),
        ][index]
        width, height, lean, squash = params
        draw_body(draw, width=width, height=height, base_y=24, squash=squash, lean=lean, frame=index, hurt=True)
        for shard in range(10):
            x = 3 + shard * 3
            y = 10 + (shard % 5) * 3 - index
            color = PALETTE["ice"] if shard % 2 == 0 else PALETTE["light"]
            rect(draw, x, y, 1 + (shard % 4 == 0), 1 + (shard % 3 == 0), color)

    elif action == "death":
        puddles = [
            (22, 8, 23),
            (24, 5, 25),
            (26, 3, 26),
            (28, 2, 27),
        ]
        width, height, base_y = puddles[index]
        left = 16 - width // 2
        top = base_y - height
        ellipse(draw, (left - 1, top, left + width + 1, base_y + 2), PALETTE["outline"])
        ellipse(draw, (left, top + 1, left + width, base_y + 1), PALETTE["deep"])
        ellipse(draw, (left + 2, top + 1, left + width - 2, base_y), PALETTE["base"])
        rect(draw, left + 6, base_y - 2, width - 12, 2, PALETTE["light"])
        rect(draw, left + 9, base_y - 4, 5, 1, PALETTE["ice"])
        for shard in range(8 + index * 3):
            x = 4 + shard * 3 + (index % 2)
            y = base_y - 4 - (shard % 4) * (index + 1)
            color = PALETTE["ice"] if shard % 3 == 0 else PALETTE["trail"]
            rect(draw, x % FRAME_SIZE, y, 1 + (shard % 4 == 0), 1, color)

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
    sheet.save(OUT_DIR / "frost-ranged-slime-sheet.png")

    scale = 4
    gap = 4
    preview_width = max(count for _, count in GROUPS) * (FRAME_SIZE * scale + gap) - gap
    preview_height = len(GROUPS) * (FRAME_SIZE * scale + gap) - gap
    preview = Image.new("RGBA", (preview_width, preview_height), (0, 0, 0, 0))
    cursor = 0
    y = 0
    for _, count in GROUPS:
        for x_index in range(count):
            enlarged = frames[cursor].resize((FRAME_SIZE * scale, FRAME_SIZE * scale), Image.Resampling.NEAREST)
            preview.alpha_composite(enlarged, (x_index * (FRAME_SIZE * scale + gap), y))
            cursor += 1
        y += FRAME_SIZE * scale + gap
    preview.save(OUT_DIR / "frost-ranged-slime-preview.png")


if __name__ == "__main__":
    write_outputs()
