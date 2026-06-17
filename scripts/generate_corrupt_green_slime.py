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
    "outline": "#06120a",
    "outline2": "#0b1b0c",
    "deep": "#123315",
    "shadow": "#1f4a17",
    "base": "#3f7f22",
    "mid": "#5da52a",
    "light": "#91d73d",
    "hot": "#c8f15a",
    "foam": "#e5ff92",
    "acid": "#a7f13f",
    "eye": "#06120a",
    "tooth": "#f4ffe7",
    "crack": "#1a260c",
}


def rect(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str) -> None:
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=fill)


def px(draw: ImageDraw.ImageDraw, points: Iterable[tuple[int, int]], fill: str) -> None:
    for x, y in points:
        if 0 <= x < FRAME_SIZE and 0 <= y < FRAME_SIZE:
            draw.point((x, y), fill=fill)


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str | None = None) -> None:
    draw.ellipse(box, fill=fill, outline=outline)


def draw_body(
    draw: ImageDraw.ImageDraw,
    *,
    cx: int = 16,
    base_y: int = 25,
    width: int = 20,
    height: int = 16,
    squash: int = 0,
    lean: int = 0,
    frame: int = 0,
    mouth_open: bool = False,
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
    rect(draw, left + 4, bottom - 3, width - 7, 2, PALETTE["base"])
    rect(draw, left + 5, bottom - 2, 5, 1, PALETTE["light"])
    rect(draw, right - 9, bottom - 3, 4, 1, PALETTE["light"])

    eye_y = top + 9 + squash // 2
    rect(draw, cx - 5 + lean, eye_y, 3, 3, PALETTE["eye"])
    rect(draw, cx + 4 + lean, eye_y, 3, 3, PALETTE["eye"])
    rect(draw, cx - 4 + lean, eye_y, 1, 1, PALETTE["foam"])
    rect(draw, cx + 5 + lean, eye_y, 1, 1, PALETTE["foam"])

    if mouth_open:
        rect(draw, cx - 4 + lean, eye_y + 6, 10, 4, PALETTE["outline"])
        rect(draw, cx - 2 + lean, eye_y + 7, 6, 2, "#28440f")
        rect(draw, cx - 3 + lean, eye_y + 6, 2, 2, PALETTE["tooth"])
        rect(draw, cx + 3 + lean, eye_y + 6, 2, 2, PALETTE["tooth"])
    else:
        rect(draw, cx - 4 + lean, eye_y + 7, 9, 2, PALETTE["outline"])
        rect(draw, cx - 1 + lean, eye_y + 8, 2, 2, PALETTE["tooth"])
        rect(draw, cx + 3 + lean, eye_y + 8, 2, 2, PALETTE["tooth"])

    bubble_y = max(2, top - 5 + (frame % 3 == 1) - (frame % 5 == 3))
    rect(draw, cx + 4 + lean, top - 1, 2, 3, PALETTE["outline2"])
    rect(draw, cx + 5 + lean, top - 4, 2, 3, PALETTE["mid"])
    ellipse(draw, (cx + 4 + lean, bubble_y, cx + 9 + lean, bubble_y + 5), PALETTE["hot"], PALETTE["outline"])
    rect(draw, cx + 6 + lean, bubble_y + 1, 2, 1, PALETTE["foam"])

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
    px(
        draw,
        [
            (left + 7, top + 13),
            (right - 8, top + 12),
            (cx - 8 + lean, bottom - 6),
            (cx + 7 + lean, bottom - 7),
        ],
        PALETTE["crack"] if hurt else PALETTE["deep"],
    )

    if hurt:
        rect(draw, cx - 1 + lean, top + 4, 2, 9, PALETTE["crack"])
        rect(draw, cx + 1 + lean, top + 11, 5, 2, PALETTE["crack"])
        rect(draw, cx - 7 + lean, top + 11, 4, 2, PALETTE["crack"])


def draw_splashes(draw: ImageDraw.ImageDraw, frame: int, origin_x: int, origin_y: int, color: str = PALETTE["acid"]) -> None:
    droplets = [
        (origin_x + 2 + frame, origin_y - 5 - frame // 2),
        (origin_x + 7 + frame, origin_y - 3),
        (origin_x + 10 + frame, origin_y + 1),
        (origin_x + 5 + frame, origin_y + 4),
        (origin_x + 13 + frame, origin_y - 7 + frame),
    ]
    for index, (x, y) in enumerate(droplets):
        size = 2 if index % 2 else 1
        rect(draw, x, y, size, size, PALETTE["foam"] if index == 0 else color)


def draw_frame(action: str, index: int) -> Image.Image:
    image = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    if action == "idle":
        bob = [0, -1, -1, 0, 1][index]
        widths = [20, 21, 20, 19, 20]
        heights = [16, 17, 17, 16, 15]
        draw_body(draw, width=widths[index], height=heights[index], base_y=25 + bob, frame=index)
        px(draw, [(7, 25), (24, 25), (5, 26), (27, 26)], PALETTE["shadow"])

    elif action == "move":
        params = [
            (20, 14, 0, -2),
            (22, 13, 1, 0),
            (19, 17, -1, 2),
            (23, 12, 2, 0),
            (20, 15, 0, -1),
        ][index]
        width, height, lean, bob = params
        rect(draw, 5 + index, 25, 7, 2, PALETTE["deep"])
        rect(draw, 3 + index, 26, 5, 1, PALETTE["mid"])
        rect(draw, 8 + index, 24, 3, 1, PALETTE["acid"])
        draw_body(draw, width=width, height=height, base_y=25 + bob, lean=lean, frame=index)
        px(draw, [(6 + index, 27), (11 + index, 26), (22 + index // 2, 26)], PALETTE["hot"])

    elif action == "attack":
        params = [
            (20, 16, 0, 0, False),
            (22, 15, 2, 0, True),
            (24, 14, 3, 1, True),
            (21, 16, 4, -1, True),
            (20, 15, 1, 0, False),
        ][index]
        width, height, lean, bob, open_mouth = params
        draw_body(draw, width=width, height=height, base_y=25 + bob, lean=lean, frame=index, mouth_open=open_mouth)
        if index >= 1:
            rect(draw, 23, 16 + index // 2, 5 + index, 2, PALETTE["acid"])
            rect(draw, 25, 20, 4, 1, PALETTE["foam"])
            draw_splashes(draw, index, 19, 19)

    elif action == "hit":
        params = [
            (21, 13, -1, 2),
            (24, 11, 0, 4),
            (22, 12, 1, 3),
            (20, 14, 0, 1),
        ][index]
        width, height, lean, squash = params
        draw_body(draw, width=width, height=height, base_y=24, squash=squash, lean=lean, frame=index, hurt=True)
        draw_splashes(draw, index, 4, 17, "#b8f25a")
        px(draw, [(6, 15), (8, 12), (25, 13), (28, 17), (9, 22), (24, 23)], PALETTE["foam"])

    elif action == "death":
        puddles = [
            (22, 9, 22),
            (24, 6, 24),
            (26, 4, 25),
            (28, 3, 26),
        ]
        width, height, base_y = puddles[index]
        left = 16 - width // 2
        top = base_y - height
        ellipse(draw, (left - 1, top, left + width + 1, base_y + 2), PALETTE["outline"])
        ellipse(draw, (left, top + 1, left + width, base_y + 1), PALETTE["deep"])
        ellipse(draw, (left + 2, top + 2, left + width - 2, base_y), PALETTE["base"])
        rect(draw, left + 5, base_y - 2, width - 10, 2, PALETTE["mid"])
        rect(draw, left + 8, base_y - 4, 5, 1, PALETTE["hot"])
        for bubble in range(6 + index * 2):
            x = 5 + bubble * 4 + (index % 2)
            y = base_y - 4 - (bubble % 4) * (index + 1)
            rect(draw, x, y, 1 + (bubble % 3 == 0), 1 + (bubble % 4 == 0), PALETTE["foam"] if bubble % 3 == 0 else PALETTE["acid"])

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
    sheet.save(OUT_DIR / "corrupt-green-slime-sheet.png")

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
    preview.save(OUT_DIR / "corrupt-green-slime-preview.png")


if __name__ == "__main__":
    write_outputs()
