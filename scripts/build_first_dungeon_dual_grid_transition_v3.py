#!/usr/bin/env python3
"""Build the production Dual Grid geometry atlas (no colour texture baked in)."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/assets/terrain/campaign-1/dual-grid-transition-mask-v3'
TILE = 128
# Eight source cells scale to 2px steps at the 16px runtime Dual Tile.  That
# keeps the edge pixelated while avoiding the 1px sawtooth that read as a
# smooth round sticker in the first V3 pass.
GRID = 8
STEP = TILE // GRID
NW, NE, SE, SW = 1, 2, 4, 8


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def field(mask: int, x: float, y: float) -> float:
    nw = 1 if mask & NW else 0
    ne = 1 if mask & NE else 0
    se = 1 if mask & SE else 0
    sw = 1 if mask & SW else 0
    return nw * (1 - x) * (1 - y) + ne * x * (1 - y) + se * x * y + sw * (1 - x) * y


def cell_is_moss(mask: int, x: int, y: int, moss_connected: bool) -> bool:
    if mask == 0:
        return False
    if mask == 15:
        return True
    value = field(mask, (x + .5) / GRID, (y + .5) / GRID)
    # The two saddle cases receive an explicit, stable center resolver.
    if mask in (5, 10) and 6 <= x <= 9 and 6 <= y <= 9:
        return moss_connected
    return value >= .5


def make_tile(mask: int, moss_connected: bool = True) -> Image.Image:
    cells = [[cell_is_moss(mask, x, y, moss_connected) for x in range(GRID)] for y in range(GRID)]
    # Low-frequency, socket-safe stone bites.  A bite removes a 2×2 source
    # block (4px at runtime), never an individual pixel.  Outer sockets stay
    # untouched so adjacent Dual Tiles still join exactly.
    for y in range(2, GRID - 2):
        for x in range(2, GRID - 2):
            key = (mask * 131 + x * 47 + y * 71 + (0 if moss_connected else 19)) % 17
            if key not in (0, 1):
                continue
            points = [(x + dx, y + dy) for dy in (0, 1) for dx in (0, 1)]
            if not all(px < GRID - 1 and py < GRID - 1 and cells[py][px] for px, py in points):
                continue
            for px, py in points:
                cells[py][px] = False
    image = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    for y in range(GRID):
        for x in range(GRID):
            if not cells[y][x]:
                continue
            for py in range(y * STEP, (y + 1) * STEP):
                for px in range(x * STEP, (x + 1) * STEP):
                    image.putpixel((px, py), (255, 255, 255, 255))
    return image


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas = Image.new('RGBA', (TILE * 6, TILE * 3), (0, 0, 0, 0))
    entries = []
    for index in range(16):
        tile = make_tile(index, True)
        position = (index % 6, index // 6)
        atlas.alpha_composite(tile, (position[0] * TILE, position[1] * TILE))
        entries.append({'atlasIndex': index, 'mask': index, 'centerMoss': True, 'x': position[0], 'y': position[1]})
    for atlas_index, mask in ((16, 5), (17, 10)):
        tile = make_tile(mask, False)
        position = (atlas_index % 6, atlas_index // 6)
        atlas.alpha_composite(tile, (position[0] * TILE, position[1] * TILE))
        entries.append({'atlasIndex': atlas_index, 'mask': mask, 'centerMoss': False, 'x': position[0], 'y': position[1]})
    atlas_path = OUTPUT / 'moss-alpha-mask-atlas-6x3-768x384.png'
    atlas.save(atlas_path)
    manifest = {
        'schemaVersion': 'first-dungeon-dual-grid-transition-mask-v3',
        'runtimeEligible': True,
        'tileSize': TILE,
        'atlas': {'width': TILE * 6, 'height': TILE * 3, 'columns': 6, 'rows': 3, 'sha256': sha256(atlas_path)},
        'bitOrder': {'northWest': NW, 'northEast': NE, 'southEast': SE, 'southWest': SW},
        'alphaSemantics': {'whiteAlpha255': 'moss', 'transparentAlpha0': 'stone'},
        'entries': entries,
        'sockets': 'N/E/S/W edges derive only from their shared corner values; stone bites are interior-only.',
        'composition': 'geometry-only; Canvas samples Stone and Moss texture sources separately.',
    }
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
