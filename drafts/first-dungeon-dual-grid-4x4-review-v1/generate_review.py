from __future__ import annotations

import hashlib
import itertools
import json
import random
import statistics
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_ROOT = Path(__file__).resolve().parent
SOURCE_ROOT = REPOSITORY_ROOT / "public/assets/terrain/campaign-1/stone-moss-v1"
SOURCES = {
    "stone": SOURCE_ROOT / "stone-brick-repeatable.png",
    "moss": SOURCE_ROOT / "moss-repeatable.png",
}
PATCH_SIZE = 128
WORKING_SIZE = 512
RANDOM_SEEDS = (20260901, 305419896, 27)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rgb_mae(first: list[tuple[int, int, int, int]], second: list[tuple[int, int, int, int]]) -> float:
    return statistics.fmean(
        sum(abs(left[channel] - right[channel]) for channel in range(3)) / 3
        for left, right in zip(first, second, strict=True)
    )


def edge(image: Image.Image, side: str) -> list[tuple[int, int, int, int]]:
    pixels = image.load()
    if side == "left":
        return [pixels[0, y] for y in range(image.height)]
    if side == "right":
        return [pixels[image.width - 1, y] for y in range(image.height)]
    if side == "top":
        return [pixels[x, 0] for x in range(image.width)]
    return [pixels[x, image.height - 1] for x in range(image.width)]


def contact(first: Image.Image, second: Image.Image, orientation: str) -> float:
    if orientation == "horizontal":
        return rgb_mae(edge(first, "right"), edge(second, "left"))
    return rgb_mae(edge(first, "bottom"), edge(second, "top"))


def matrix(tiles: list[Image.Image], orientation: str) -> list[list[float]]:
    return [[contact(first, second, orientation) for second in tiles] for first in tiles]


def create_contact_sheet(tiles: list[Image.Image], output: Path) -> None:
    sheet = Image.new("RGBA", (WORKING_SIZE, WORKING_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sheet)
    for index, tile in enumerate(tiles):
        column = index % 4
        row = index // 4
        x = column * PATCH_SIZE
        y = row * PATCH_SIZE
        sheet.alpha_composite(tile, (x, y))
        draw.rectangle((x + 3, y + 3, x + 34, y + 19), fill=(0, 0, 0, 220))
        draw.text((x + 7, y + 5), f"{index:02d}", fill=(255, 255, 255, 255))
    for position in (PATCH_SIZE, PATCH_SIZE * 2, PATCH_SIZE * 3):
        draw.line((position, 0, position, WORKING_SIZE - 1), fill=(255, 72, 72, 255), width=1)
        draw.line((0, position, WORKING_SIZE - 1, position), fill=(255, 72, 72, 255), width=1)
    sheet.save(output)


def create_reconstruction(tiles: list[Image.Image], output: Path) -> Image.Image:
    reconstruction = Image.new("RGBA", (WORKING_SIZE, WORKING_SIZE), (0, 0, 0, 0))
    for index, tile in enumerate(tiles):
        reconstruction.alpha_composite(tile, ((index % 4) * PATCH_SIZE, (index // 4) * PATCH_SIZE))
    reconstruction.save(output)
    return reconstruction


def create_random_preview(tiles: list[Image.Image], seed: int, output: Path) -> list[int]:
    generator = random.Random(seed)
    indices = [generator.randrange(len(tiles)) for _ in range(64)]
    preview = Image.new("RGBA", (PATCH_SIZE * 8, PATCH_SIZE * 8), (0, 0, 0, 0))
    for position, tile_index in enumerate(indices):
        preview.alpha_composite(tiles[tile_index], ((position % 8) * PATCH_SIZE, (position // 8) * PATCH_SIZE))
    preview.save(output)
    return indices


def create_matrix_preview(horizontal: list[list[float]], vertical: list[list[float]], output: Path) -> None:
    cell = 18
    gap = 30
    width = 16 * cell
    canvas = Image.new("RGB", (width, width * 2 + gap), (16, 18, 20))
    draw = ImageDraw.Draw(canvas)
    values = [value for row in horizontal + vertical for value in row]
    maximum = max(values) or 1
    for matrix_index, values_matrix in enumerate((horizontal, vertical)):
        y_offset = matrix_index * (width + gap)
        for row in range(16):
            for column in range(16):
                value = values_matrix[row][column]
                intensity = min(1.0, value / maximum)
                color = (round(34 + 221 * intensity), round(180 - 130 * intensity), 54)
                draw.rectangle(
                    (column * cell, y_offset + row * cell, (column + 1) * cell - 1, y_offset + (row + 1) * cell - 1),
                    fill=color,
                )
        draw.text((4, y_offset + 4), "H" if matrix_index == 0 else "V", fill=(255, 255, 255))
    canvas.save(output)


def natural_contacts(tiles: list[Image.Image], orientation: str) -> list[float]:
    if orientation == "horizontal":
        return [contact(tiles[row * 4 + column], tiles[row * 4 + column + 1], orientation) for row in range(4) for column in range(3)]
    return [contact(tiles[row * 4 + column], tiles[(row + 1) * 4 + column], orientation) for row in range(3) for column in range(4)]


def largest_safe_subset(
    horizontal: list[list[float]],
    vertical: list[list[float]],
    horizontal_threshold: float,
    vertical_threshold: float,
) -> list[int]:
    compatible = [[
        horizontal[first][second] <= horizontal_threshold
        and horizontal[second][first] <= horizontal_threshold
        and vertical[first][second] <= vertical_threshold
        and vertical[second][first] <= vertical_threshold
        for second in range(16)
    ] for first in range(16)]
    candidates = [index for index in range(16) if compatible[index][index]]
    for size in range(len(candidates), 0, -1):
        for subset in itertools.combinations(candidates, size):
            if all(compatible[first][second] for first in subset for second in subset):
                return list(subset)
    return []


def audit_source(role: str, source_path: Path) -> dict[str, object]:
    source = Image.open(source_path).convert("RGBA")
    if source.size != (1024, 1024):
        raise ValueError(f"{source_path} must be 1024x1024 for this review")
    alpha = source.getchannel("A")
    top_left = source.crop((0, 0, 512, 512))
    mirror_checks = {
        "topRightIsHorizontalMirror": ImageChops.difference(
            source.crop((512, 0, 1024, 512)),
            top_left.transpose(Image.Transpose.FLIP_LEFT_RIGHT),
        ).getbbox() is None,
        "bottomLeftIsVerticalMirror": ImageChops.difference(
            source.crop((0, 512, 512, 1024)),
            top_left.transpose(Image.Transpose.FLIP_TOP_BOTTOM),
        ).getbbox() is None,
        "bottomRightIsRotatedTopLeft": ImageChops.difference(
            source.crop((512, 512, 1024, 1024)),
            top_left.transpose(Image.Transpose.ROTATE_180),
        ).getbbox() is None,
    }

    # The requested 4x4x128 experiment needs a 512px working canvas. Preserve
    # the complete 1024px source by reducing it with nearest-neighbor sampling;
    # this is review-only and is never represented as a native-pixel atlas.
    working = source.resize((WORKING_SIZE, WORKING_SIZE), Image.Resampling.NEAREST)
    working_path = OUTPUT_ROOT / f"{role}-working-512-nearest.png"
    working.save(working_path)
    tile_directory = OUTPUT_ROOT / "tiles" / role
    tile_directory.mkdir(parents=True, exist_ok=True)
    tiles: list[Image.Image] = []
    tile_records = []
    for row in range(4):
        for column in range(4):
            index = row * 4 + column
            tile = working.crop((column * PATCH_SIZE, row * PATCH_SIZE, (column + 1) * PATCH_SIZE, (row + 1) * PATCH_SIZE))
            tile_path = tile_directory / f"tile-{index:02d}.png"
            tile.save(tile_path)
            tiles.append(tile)
            tile_alpha = tile.getchannel("A")
            tile_records.append({
                "index": index,
                "atlas": [column, row],
                "path": str(tile_path.relative_to(OUTPUT_ROOT)),
                "sha256": sha256(tile_path),
                "alphaExtrema": list(tile_alpha.getextrema()),
            })

    contact_sheet = OUTPUT_ROOT / f"{role}-contact-sheet-4x4.png"
    create_contact_sheet(tiles, contact_sheet)
    reconstruction_path = OUTPUT_ROOT / f"{role}-reconstruction-original-order.png"
    reconstruction = create_reconstruction(tiles, reconstruction_path)
    reconstruction_difference = ImageChops.difference(working, reconstruction)
    random_previews = []
    for seed in RANDOM_SEEDS:
        preview_path = OUTPUT_ROOT / f"{role}-random-full-preview-seed-{seed}.png"
        indices = create_random_preview(tiles, seed, preview_path)
        random_previews.append({
            "seed": seed,
            "path": str(preview_path.relative_to(OUTPUT_ROOT)),
            "sha256": sha256(preview_path),
            "tileIndices": indices,
        })

    horizontal_matrix = matrix(tiles, "horizontal")
    vertical_matrix = matrix(tiles, "vertical")
    matrix_path = OUTPUT_ROOT / f"{role}-contact-matrices.png"
    create_matrix_preview(horizontal_matrix, vertical_matrix, matrix_path)
    natural_horizontal = natural_contacts(tiles, "horizontal")
    natural_vertical = natural_contacts(tiles, "vertical")
    horizontal_threshold = max(natural_horizontal)
    vertical_threshold = max(natural_vertical)
    safe_subset = largest_safe_subset(horizontal_matrix, vertical_matrix, horizontal_threshold, vertical_threshold)

    return {
        "role": role,
        "source": {
            "path": str(source_path.relative_to(REPOSITORY_ROOT)),
            "sha256": sha256(source_path),
            "size": list(source.size),
            "mode": source.mode,
            "alphaExtrema": list(alpha.getextrema()),
            "allOpaque": alpha.getextrema() == (255, 255),
            "leftRightWrapRgbMae": rgb_mae(edge(source, "left"), edge(source, "right")),
            "topBottomWrapRgbMae": rgb_mae(edge(source, "top"), edge(source, "bottom")),
            "mirrorConstruction": mirror_checks,
        },
        "workingCanvas": {
            "path": str(working_path.relative_to(OUTPUT_ROOT)),
            "sha256": sha256(working_path),
            "size": [WORKING_SIZE, WORKING_SIZE],
            "derivation": "full 1024px source resized to 512px with nearest-neighbor; 1 working pixel = 2 source pixels",
            "nativePixelAtlas": False,
            "leftRightWrapRgbMae": rgb_mae(edge(working, "left"), edge(working, "right")),
            "topBottomWrapRgbMae": rgb_mae(edge(working, "top"), edge(working, "bottom")),
        },
        "tiles": tile_records,
        "contactSheet": {"path": str(contact_sheet.relative_to(OUTPUT_ROOT)), "sha256": sha256(contact_sheet)},
        "reconstruction": {
            "path": str(reconstruction_path.relative_to(OUTPUT_ROOT)),
            "sha256": sha256(reconstruction_path),
            "workingCanvasPixelExact": reconstruction_difference.getbbox() is None,
            "maximumChannelDifference": max(ImageStat.Stat(reconstruction_difference).extrema[channel][1] for channel in range(4)),
        },
        "randomPreviews": random_previews,
        "seams": {
            "metric": "mean absolute RGB difference across touching one-pixel edge rows/columns",
            "naturalOriginalOrder": {
                "horizontal": natural_horizontal,
                "vertical": natural_vertical,
                "horizontalMean": statistics.fmean(natural_horizontal),
                "verticalMean": statistics.fmean(natural_vertical),
                "horizontalWorst": horizontal_threshold,
                "verticalWorst": vertical_threshold,
            },
            "allDirectedReorders": {
                "horizontalMedian": statistics.median(value for row in horizontal_matrix for value in row),
                "horizontalMaximum": max(value for row in horizontal_matrix for value in row),
                "verticalMedian": statistics.median(value for row in vertical_matrix for value in row),
                "verticalMaximum": max(value for row in vertical_matrix for value in row),
            },
            "matrixPreview": {"path": str(matrix_path.relative_to(OUTPUT_ROOT)), "sha256": sha256(matrix_path)},
            "safeSubsetCriterion": "every directed H/V pairing including self must be no worse than the worst original-order adjacent seam",
            "safeFreelyExchangeableSubset": safe_subset,
        },
        "transitionSemantics": {
            "hasAlphaTransitionEncoding": False,
            "hasStoneMossBoundaryEncoding": False,
            "canBe16MaskDualGridAtlas": False,
            "reason": "all 16 cells are opaque texture samples; their 0..15 positions do not encode N/E/S/W transitions",
        },
    }


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    audits = {role: audit_source(role, path) for role, path in SOURCES.items()}
    audit_path = OUTPUT_ROOT / "audit-report.json"
    audit_path.write_text(json.dumps({
        "schemaVersion": "first-dungeon-dual-grid-4x4-review-v1",
        "reviewOnly": True,
        "runtimeEligible": False,
        "requestedExperiment": "4x4 = 16 tiles of 128x128",
        "sourceDimensionConflict": "sources are 1024x1024; full-source nearest 512px working canvases are used so the experiment covers every source pixel without a 512px crop",
        "randomSeeds": list(RANDOM_SEEDS),
        "audits": audits,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    artifact_hashes = {}
    for path in sorted(OUTPUT_ROOT.rglob("*")):
        if path.is_file() and path.name not in {"review-manifest.json"}:
            artifact_hashes[str(path.relative_to(OUTPUT_ROOT))] = sha256(path)
    manifest_path = OUTPUT_ROOT / "review-manifest.json"
    manifest_path.write_text(json.dumps({
        "schemaVersion": "first-dungeon-dual-grid-4x4-review-manifest-v1",
        "reviewOnly": True,
        "runtimeEligible": False,
        "sourcePaths": [str(path.relative_to(REPOSITORY_ROOT)) for path in SOURCES.values()],
        "auditReport": str(audit_path.relative_to(OUTPUT_ROOT)),
        "artifactSha256": artifact_hashes,
        "forbiddenRuntimeUse": ["render", "GameCanvas", "battle", "public source replacement", "runtime config"],
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(audit_path)
    print(manifest_path)


if __name__ == "__main__":
    main()
