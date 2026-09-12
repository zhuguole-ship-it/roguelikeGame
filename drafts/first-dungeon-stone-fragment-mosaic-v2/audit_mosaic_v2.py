"""Review-only pixel audit for the E23 dense stone-fragment mosaic draft."""

from hashlib import sha256
from json import dumps, loads
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
EDGE = (41, 58, 46, 255)
SOURCE = REPO / 'public/assets/terrain/campaign-1/stone-moss-v1/stone-brick-source.jpg'


def image_report(path: Path):
    image = Image.open(path)
    assert image.mode == 'RGBA', f'{path.name} must be RGBA, got {image.mode}'
    alpha = image.getchannel('A')
    alpha_histogram = alpha.histogram()
    return {
        'sha256': sha256(path.read_bytes()).hexdigest(),
        'size': {'width': image.width, 'height': image.height},
        'mode': image.mode,
        'alpha': {
            'transparentPixels': alpha_histogram[0],
            'opaquePixels': alpha_histogram[255],
            'hasOnlyHardAlpha': sum(alpha_histogram[1:255]) == 0,
        },
    }


def main():
    manifest = loads((ROOT / 'fragment-mosaic-v2.draft.json').read_text())
    fragments = manifest['fragments']
    seams = manifest['sharedSeamLayer']['seams']
    ids = [fragment['id'] for fragment in fragments]
    assert 24 <= len(ids) <= 30 and len(ids) == len(set(ids))
    assert all(fragment['orientation'] == {'rotationDegrees': 0, 'mirrored': False, 'scale': 1} for fragment in fragments)
    assert len({(fragment['layoutLocalPosition']['x'], fragment['layoutLocalPosition']['y']) for fragment in fragments}) == len(fragments)

    seam_image = Image.open(ROOT / 'shared-seams-v2.png').convert('RGBA')
    seam_pixels = seam_image.load()
    seam_colors = {
        seam_pixels[x, y]
        for y in range(seam_image.height)
        for x in range(seam_image.width)
        if seam_pixels[x, y][3] != 0
    }
    assert seam_colors == {EDGE}, seam_colors
    seam_ids = [seam['id'] for seam in seams]
    assert len(seam_ids) == len(set(seam_ids))
    assert len(manifest['clusters']) == 1
    assert manifest['clusters'][0]['fragmentIds'] == ids
    assert all(
        seam['sourcePixels'] == 2
        and seam['alpha'] == 255
        and seam['mossVisible'] is False
        and len(seam['participantFragmentIds']) == 2
        and seam['ownerFragmentId'] in seam['participantFragmentIds']
        and len(seam['path']) == 3
        for seam in seams
    )

    report = {
        'reviewOnly': True,
        'source': {
            'relativePath': str(SOURCE.relative_to(REPO)),
            'sha256': sha256(SOURCE.read_bytes()).hexdigest(),
        },
        'fragments': {'count': len(fragments), 'uniqueIds': len(set(ids)), 'unrotatedUnmirroredUnscaled': True, 'uniqueLayoutPositions': True},
        'images': {
            'atlas': image_report(ROOT / 'fragment-atlas-v2.png'),
            'annotation': image_report(ROOT / 'source-fragment-annotation-v2.png'),
            'layoutPreview': image_report(ROOT / 'mosaic-layout-preview-v2.png'),
            'sharedSeams': image_report(ROOT / 'shared-seams-v2.png'),
        },
        'sharedSeams': {
            'count': len(seams),
            'onlyOpaque293A2E': True,
            'construction': 'Each explicit unique-owner path was rasterized once with Pillow ImageDraw.line(width=2); no per-fragment outline was rendered.',
            'eachSeamPathDeclaredAtSourcePixels': [seam['sourcePixels'] for seam in seams],
            'sourcePixels': 2,
            'mossVisible': False,
        },
    }
    (ROOT / 'pixel-audit-v2.json').write_text(dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
