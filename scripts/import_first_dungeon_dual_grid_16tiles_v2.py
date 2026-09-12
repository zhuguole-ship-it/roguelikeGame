#!/usr/bin/env python3
"""Import the approved individual Dual Grid slices into a runtime atlas package.

This is an asset-only build step.  It preserves the supplied individual files,
packs every layer by its explicit mask index, and creates the composite atlas
used by the Canvas 2D renderer.
"""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Users/zackota/Downloads/dual_grid_16tiles_individual_slices')
OUTPUT = ROOT / 'public/assets/terrain/campaign-1/dual-grid-16tiles-v2'
TILE_SIZE = 128
GRID_SIZE = 4
LAYERS = (
    ('stone', 'color'),
    ('stone', 'border'),
    ('stone', 'alpha'),
    ('moss', 'color'),
    ('moss', 'border'),
    ('moss', 'alpha'),
)
COMPOSITE_ORDER = (
    ('stone', 'color'),
    ('stone', 'border'),
    ('moss', 'border'),
    ('moss', 'color'),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tile_name(index: int) -> str:
    return f'{index:02d}_mask_{index:04b}.png'


def main() -> None:
    if not SOURCE.is_dir():
        raise SystemExit(f'Missing supplied Dual Grid package: {SOURCE}')

    OUTPUT.mkdir(parents=True, exist_ok=True)
    packed_layers: dict[str, str] = {}
    source_hashes: dict[str, str] = {}
    composites: list[Image.Image] = []

    for role, layer in LAYERS:
        atlas = Image.new('RGBA', (TILE_SIZE * GRID_SIZE, TILE_SIZE * GRID_SIZE), (0, 0, 0, 0))
        for index in range(16):
            relative = Path(role) / layer / tile_name(index)
            source = SOURCE / relative
            if not source.is_file():
                raise SystemExit(f'Missing supplied tile: {source}')
            image = Image.open(source).convert('RGBA')
            if image.size != (TILE_SIZE, TILE_SIZE):
                raise SystemExit(f'Unexpected size for {source}: {image.size}')
            copied = OUTPUT / 'source-slices' / relative
            copied.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, copied)
            source_hashes[str(relative)] = sha256(source)
            atlas.alpha_composite(image, ((index % GRID_SIZE) * TILE_SIZE, (index // GRID_SIZE) * TILE_SIZE))
        filename = f'{role}-{layer}-atlas-4x4-512.png'
        atlas.save(OUTPUT / filename)
        packed_layers[f'{role}/{layer}'] = filename

    composite_atlas = Image.new('RGBA', (TILE_SIZE * GRID_SIZE, TILE_SIZE * GRID_SIZE), (0, 0, 0, 0))
    for index in range(16):
        composite = Image.new('RGBA', (TILE_SIZE, TILE_SIZE), (0, 0, 0, 0))
        for role, layer in COMPOSITE_ORDER:
            source = SOURCE / role / layer / tile_name(index)
            composite.alpha_composite(Image.open(source).convert('RGBA'))
        composites.append(composite)
        composite_atlas.alpha_composite(composite, ((index % GRID_SIZE) * TILE_SIZE, (index // GRID_SIZE) * TILE_SIZE))
    composite_filename = 'dual-grid-composite-atlas-4x4-512.png'
    composite_atlas.save(OUTPUT / composite_filename)

    generated = {name: sha256(OUTPUT / name) for name in [*packed_layers.values(), composite_filename]}
    manifest = {
        'schemaVersion': 'first-dungeon-dual-grid-autotiles-v2',
        'runtimeEligible': True,
        'presentationOnly': True,
        'campaignId': 'campaign-1',
        'tileSize': TILE_SIZE,
        'grid': {'columns': GRID_SIZE, 'rows': GRID_SIZE, 'indexOrder': 'row-major'},
        'bitOrder': {'northWest': 1, 'northEast': 2, 'southEast': 4, 'southWest': 8},
        'meaning': 'bit 1 is moss and bit 0 is stone',
        'compositionOrder': ['stone/color', 'stone/border', 'moss/border', 'moss/color'],
        'layers': packed_layers,
        'runtime': {'compositeAtlas': composite_filename, 'sha256': generated[composite_filename]},
        'sourceSlices': source_hashes,
        'generatedAtlases': generated,
        'neverConsumes': ['Godot runtime', 'Godot Web/WASM', 'GDScript', 'collision', 'Downloads paths'],
    }
    (OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
