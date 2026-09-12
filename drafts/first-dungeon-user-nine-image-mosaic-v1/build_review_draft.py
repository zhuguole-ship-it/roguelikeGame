"""Build review-only previews from the nine unmodified local source copies."""

from hashlib import sha256
from json import dumps
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
MOSS = REPO / 'public/assets/terrain/campaign-1/stone-moss-v1/moss-repeatable.png'
ATLAS_SIZE = (1024, 900)
MOSAIC_SIZE = (900, 780)
ATLAS_POSITIONS = [(20, 35), (270, 35), (390, 35), (570, 35), (780, 35), (20, 470), (210, 470), (360, 470), (610, 470)]
# A hand-placed, deliberately irregular review composition.  Every input is
# alpha-composited as a full opaque JPEG rectangle: no crop, alpha inference,
# rotation, mirror or rescale is applied.
MOSAIC_POSITIONS = [(300, 30), (35, 80), (110, 175), (575, 25), (25, 290), (140, 330), (760, 60), (340, 320), (590, 450)]


def jpeg_record(index: int, source: Path, copy: Path, atlas_position, mosaic_position):
    image = Image.open(copy)
    return {
        'index': index,
        'sourceFilename': source.name,
        'sourcePath': str(source),
        'copyPath': str(copy.relative_to(REPO)),
        'sha256': sha256(copy.read_bytes()).hexdigest(),
        'dimensions': {'width': image.width, 'height': image.height},
        'fileFormat': image.format,
        'originalTransform': {'rotationDegrees': 0, 'mirrored': False, 'scale': 1, 'cropped': False},
        'opaqueBlackBackgroundRetained': True,
        'atlasPosition': {'x': atlas_position[0], 'y': atlas_position[1]},
        'layoutPosition': {'x': mosaic_position[0], 'y': mosaic_position[1]},
        'uncertaintyRef': f'input-{index:02d}',
    }


def label(draw: ImageDraw.ImageDraw, number: int, x: int, y: int):
    draw.rectangle((x - 3, y - 3, x + 17, y + 15), fill=(20, 29, 21, 255))
    draw.text((x, y - 1), str(number), fill=(255, 232, 133, 255))


def fill_moss(size):
    canvas = Image.new('RGBA', size, (0, 0, 0, 255))
    moss = Image.open(MOSS).convert('RGBA')
    for y in range(0, canvas.height, moss.height):
        for x in range(0, canvas.width, moss.width):
            canvas.alpha_composite(moss, (x, y))
    return canvas


def main():
    sources = []
    atlas = Image.new('RGBA', ATLAS_SIZE, (0, 0, 0, 0))
    atlas_draw = ImageDraw.Draw(atlas)
    preview = fill_moss(MOSAIC_SIZE)
    preview_draw = ImageDraw.Draw(preview)
    for index in range(1, 10):
        source = Path('/Users/zackota/Downloads') / f'{index}.png.jpg'
        copy = ROOT / 'sources' / f'{index}.png.jpg'
        image = Image.open(copy).convert('RGBA')
        atlas_position = ATLAS_POSITIONS[index - 1]
        mosaic_position = MOSAIC_POSITIONS[index - 1]
        atlas.alpha_composite(image, atlas_position)
        preview.alpha_composite(image, mosaic_position)
        label(atlas_draw, index, atlas_position[0], atlas_position[1] - 20)
        label(preview_draw, index, mosaic_position[0], mosaic_position[1] - 20)
        sources.append(jpeg_record(index, source, copy, atlas_position, mosaic_position))

    atlas.save(ROOT / 'input-atlas-index-v1.png')
    preview.save(ROOT / 'mosaic-preview-uncut-v1.png')
    # No seams can truthfully be constructed while each opaque black JPEG
    # boundary is unresolved.  A transparent layer is an explicit placeholder,
    # rather than an assertion that black is transparent or a stone outline.
    Image.new('RGBA', MOSAIC_SIZE, (0, 0, 0, 0)).save(ROOT / 'shared-seams-unconstructed-v1.png')
    manifest = {
        'schemaVersion': 'first-dungeon-user-nine-image-mosaic-review-v1',
        'reviewOnly': True,
        'runtimeEligible': False,
        'sourceHandling': 'Project-local byte copies only; each input remains uncropped, unrotated, unmirrored and unscaled in review compositions.',
        'inputs': sources,
        'atlas': {'file': 'input-atlas-index-v1.png', 'size': {'width': ATLAS_SIZE[0], 'height': ATLAS_SIZE[1]}, 'mode': 'RGBA', 'indexOrder': list(range(1, 10)), 'sourcePixelsRetained': True},
        'mosaicPreview': {
            'file': 'mosaic-preview-uncut-v1.png', 'size': {'width': MOSAIC_SIZE[0], 'height': MOSAIC_SIZE[1]},
            'mossBase': str(MOSS.relative_to(REPO)), 'labels': list(range(1, 10)),
            'status': 'Uncut review composition only; black image regions are preserved opaque pending user boundary decisions.',
            'intentionalMossGaps': 'Not asserted: uncut opaque JPEG borders prevent a reliable stone-outline composition.',
        },
        'sharedSeamLayer': {
            'file': 'shared-seams-unconstructed-v1.png', 'constructed': False, 'seams': [],
            'reason': 'No user input supplies a confirmed alpha contour or contact relation. Constructing a #293A2E seam would require guessing whether opaque black JPEG pixels are stone or background.',
        },
        'unresolved': 'Each input boundary, including its black pixels, requires user confirmation before any alpha, crop, fragment outline, contact or seam may be introduced.',
    }
    (ROOT / 'user-nine-mosaic-v1.review.json').write_text(dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
