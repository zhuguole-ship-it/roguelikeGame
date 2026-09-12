"""Pixel and byte audit for the review-only nine-user-input mosaic draft."""

from hashlib import sha256
from json import dumps, loads
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
DOWNLOADS = Path('/Users/zackota/Downloads')


def report_image(path: Path):
    image = Image.open(path)
    assert image.mode == 'RGBA', f'{path.name}: {image.mode}'
    return {
        'sha256': sha256(path.read_bytes()).hexdigest(),
        'dimensions': {'width': image.width, 'height': image.height},
        'mode': image.mode,
        'alpha': {'transparentPixels': image.getchannel('A').histogram()[0], 'opaquePixels': image.getchannel('A').histogram()[255]},
    }


def main():
    manifest = loads((ROOT / 'user-nine-mosaic-v1.review.json').read_text())
    inputs = manifest['inputs']
    assert manifest['reviewOnly'] is True and manifest['runtimeEligible'] is False
    assert [item['index'] for item in inputs] == list(range(1, 10))
    assert len({item['sha256'] for item in inputs}) == 9, 'inputs 6 and 9 must remain distinct too'
    source_audit = []
    for item in inputs:
        source = DOWNLOADS / item['sourceFilename']
        copy = REPO / item['copyPath']
        assert sha256(source.read_bytes()).hexdigest() == sha256(copy.read_bytes()).hexdigest() == item['sha256']
        image = Image.open(copy)
        assert image.size == (item['dimensions']['width'], item['dimensions']['height'])
        assert item['originalTransform'] == {'rotationDegrees': 0, 'mirrored': False, 'scale': 1, 'cropped': False}
        source_audit.append({'index': item['index'], 'filename': item['sourceFilename'], 'sha256': item['sha256'], 'dimensions': item['dimensions']})

    seam = Image.open(ROOT / manifest['sharedSeamLayer']['file']).convert('RGBA')
    assert manifest['sharedSeamLayer']['constructed'] is False
    assert seam.getchannel('A').getextrema() == (0, 0), 'unconstructed seam placeholder must be fully transparent'
    report = {
        'reviewOnly': True,
        'runtimeEligible': False,
        'orderedInputs': source_audit,
        'images': {
            'atlas': report_image(ROOT / manifest['atlas']['file']),
            'mosaicPreview': report_image(ROOT / manifest['mosaicPreview']['file']),
            'sharedSeamPlaceholder': report_image(ROOT / manifest['sharedSeamLayer']['file']),
        },
        'sharedSeams': {'constructed': False, 'reason': manifest['sharedSeamLayer']['reason']},
        'v2StatusMarkerExists': (REPO / 'drafts/first-dungeon-stone-fragment-mosaic-v2/review-status-v2.md').is_file(),
    }
    (ROOT / 'review-audit-v1.json').write_text(dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
