"""Build an unoverlapped, review-only nine-module floor mosaic."""

from collections import deque
from hashlib import sha256
from json import dumps
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
MOSS = REPO / 'public/assets/terrain/campaign-1/stone-moss-v1/moss-repeatable.png'
EDGE = (41, 58, 46, 255)
PREVIEW_SIZE = (1040, 960)
GAP = 2

# Every tuple is an opaque source rectangle at 1:1 scale. The plan is a
# staggered masonry layout: neighbouring rectangles have exactly a 2px void,
# reserved exclusively for a single shared seam; no rectangles overlap.
LAYOUT = [
    ('m01', 'main-group', 4, 20, 15, False, False), ('m02', 'main-group', 4, 20, 399, True, False), ('m03', 'main-group', 5, 20, 783, False, True),
    ('m04', 'main-group', 1, 210, 15, True, False), ('m05', 'main-group', 1, 210, 253, False, True), ('m06', 'main-group', 1, 210, 491, True, True), ('m07', 'main-group', 5, 210, 729, True, False), ('m08', 'main-group', 2, 210, 811, False, True),
    ('m09', 'main-group', 8, 442, 15, False, True), ('m10', 'main-group', 8, 442, 181, True, False), ('m12', 'main-group', 8, 442, 513, True, True), ('m13', 'main-group', 6, 442, 679, False, True), ('m14', 'main-group', 5, 442, 809, True, False),
    ('m15', 'main-group', 7, 670, 15, False, True), ('m16', 'main-group', 7, 670, 311, True, False), ('m17', 'main-group', 5, 670, 607, True, True), ('m18', 'main-group', 2, 670, 689, False, False), ('m19', 'main-group', 5, 670, 761, False, True),
    ('m20', 'main-group', 3, 794, 15, True, False), ('m21', 'main-group', 6, 794, 153, False, True), ('m22', 'main-group', 9, 794, 283, True, True), ('m23', 'main-group', 3, 794, 415, False, False), ('m24', 'main-group', 9, 794, 553, False, True), ('m25', 'main-group', 5, 794, 685, True, False), ('m26', 'main-group', 2, 794, 767, True, True), ('m27', 'main-group', 5, 794, 839, False, False),
]


def transformed(index, horizontal_flip, vertical_flip):
    image = Image.open(ROOT / 'sources' / f'{index}.png.jpg').convert('RGBA')
    if horizontal_flip:
        image = ImageOps.mirror(image)
    if vertical_flip:
        image = ImageOps.flip(image)
    return image


def label(draw, text, x, y):
    draw.rectangle((x - 3, y - 3, x + 23, y + 14), fill=(20, 29, 21, 255))
    draw.text((x, y - 1), text, fill=(255, 232, 133, 255))


def moss_canvas(size):
    canvas = Image.new('RGBA', size, (0, 0, 0, 255))
    moss = Image.open(MOSS).convert('RGBA')
    for y in range(0, canvas.height, moss.height):
        for x in range(0, canvas.width, moss.width):
            canvas.alpha_composite(moss, (x, y))
    return canvas


def bboxes_touching_with_gap(records):
    seams = []
    for offset, first in enumerate(records):
        ax, ay, aw, ah = first['layout'].values()
        for second in records[offset + 1:]:
            bx, by, bw, bh = second['layout'].values()
            if ax + aw + GAP == bx or bx + bw + GAP == ax:
                seam_x = ax + aw if ax < bx else bx + bw
                top, bottom = max(ay, by), min(ay + ah, by + bh)
                if top < bottom:
                    seams.append({'id': f"seam-{first['id']}-{second['id']}", 'ownerInstanceId': first['id'], 'participantInstanceIds': [first['id'], second['id']], 'rect': {'x': seam_x, 'y': top, 'width': GAP, 'height': bottom - top}, 'axis': 'vertical', 'sourcePixels': 2, 'color': '#293A2E', 'alpha': 255, 'mossVisible': False})
            if ay + ah + GAP == by or by + bh + GAP == ay:
                seam_y = ay + ah if ay < by else by + bh
                left, right = max(ax, bx), min(ax + aw, bx + bw)
                if left < right:
                    seams.append({'id': f"seam-{first['id']}-{second['id']}", 'ownerInstanceId': first['id'], 'participantInstanceIds': [first['id'], second['id']], 'rect': {'x': left, 'y': seam_y, 'width': right - left, 'height': GAP}, 'axis': 'horizontal', 'sourcePixels': 2, 'color': '#293A2E', 'alpha': 255, 'mossVisible': False})
    return seams


def fill_seam_junctions(records, seam):
    """Fill only isolated 2x2 seam-corner voids, never a moss opening."""
    left = min(record['layout']['x'] for record in records)
    top = min(record['layout']['y'] for record in records)
    right = max(record['layout']['x'] + record['layout']['width'] for record in records)
    bottom = max(record['layout']['y'] + record['layout']['height'] for record in records)
    width, height = right - left, bottom - top
    occupied = bytearray(width * height)
    for record in records:
        rect = record['layout']
        for y in range(rect['y'], rect['y'] + rect['height']):
            start = (y - top) * width
            for x in range(rect['x'], rect['x'] + rect['width']):
                occupied[start + x - left] = 1
    seam_pixels = seam.load()
    for y in range(top, bottom):
        start = (y - top) * width
        for x in range(left, right):
            if seam_pixels[x, y][3] != 0:
                occupied[start + x - left] = 1
    junctions = []
    draw = ImageDraw.Draw(seam)
    for start_y in range(height):
        for start_x in range(width):
            start = start_y * width + start_x
            if occupied[start]:
                continue
            occupied[start] = 1
            queue = deque([(start_x, start_y)])
            cells = []
            touches_boundary = start_x in (0, width - 1) or start_y in (0, height - 1)
            while queue:
                x, y = queue.popleft()
                cells.append((x, y))
                for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    index = next_y * width + next_x
                    if occupied[index]:
                        continue
                    occupied[index] = 1
                    touches_boundary = touches_boundary or next_x in (0, width - 1) or next_y in (0, height - 1)
                    queue.append((next_x, next_y))
            if not touches_boundary and len(cells) <= 4:
                xs, ys = zip(*cells)
                for x, y in cells:
                    seam_pixels[left + x, top + y] = EDGE
                junctions.append({'rect': {'x': left + min(xs), 'y': top + min(ys), 'width': max(xs) - min(xs) + 1, 'height': max(ys) - min(ys) + 1}, 'pixelCount': len(cells), 'kind': 'seam-junction-fill'})
    return junctions


def main():
    atlas = Image.new('RGBA', (1024, 900), (0, 0, 0, 0))
    atlas_draw = ImageDraw.Draw(atlas)
    atlas_positions = [(20, 35), (270, 35), (390, 35), (570, 35), (780, 35), (20, 470), (210, 470), (360, 470), (610, 470)]
    sources = []
    for index, position in enumerate(atlas_positions, start=1):
        source = ROOT / 'sources' / f'{index}.png.jpg'
        image = Image.open(source).convert('RGBA')
        atlas.alpha_composite(image, position)
        label(atlas_draw, str(index), position[0], position[1] - 20)
        sources.append({'sourceIndex': index, 'path': str(source.relative_to(REPO)), 'sha256': sha256(source.read_bytes()).hexdigest(), 'dimensions': {'width': image.width, 'height': image.height}, 'allowedTransforms': {'horizontalFlip': True, 'verticalFlip': True, 'uniformScaleOnly': True, 'rotationDegrees': 0}})
    atlas.save(ROOT / 'module-atlas-index-v2.png')

    preview = moss_canvas(PREVIEW_SIZE)
    records = []
    for identifier, group_id, source_index, x, y, horizontal_flip, vertical_flip in LAYOUT:
        image = transformed(source_index, horizontal_flip, vertical_flip)
        preview.alpha_composite(image, (x, y))
        records.append({'id': identifier, 'groupId': group_id, 'sourceIndex': source_index, 'layout': {'x': x, 'y': y, 'width': image.width, 'height': image.height}, 'transform': {'horizontalFlip': horizontal_flip, 'verticalFlip': vertical_flip, 'uniformScale': 1, 'rotationDegrees': 0, 'sampling': 'nearest'}})
    seams = bboxes_touching_with_gap(records)
    seam = Image.new('RGBA', PREVIEW_SIZE, (0, 0, 0, 0))
    seam_draw = ImageDraw.Draw(seam)
    for seam_record in seams:
        rect = seam_record['rect']
        seam_draw.rectangle((rect['x'], rect['y'], rect['x'] + rect['width'] - 1, rect['y'] + rect['height'] - 1), fill=EDGE)
    junction_fills = fill_seam_junctions(records, seam)
    preview.alpha_composite(seam)
    preview.save(ROOT / 'module-mosaic-preview-v2.png')
    seam.save(ROOT / 'shared-seams-v2.png')

    manifest = {
        'schemaVersion': 'first-dungeon-user-nine-module-mosaic-review-v2', 'reviewOnly': True, 'runtimeEligible': False,
        'sampling': {'minFilter': 'nearest', 'magFilter': 'nearest', 'smoothing': False, 'mipmaps': False},
        'seamMetric': {'sourcePixels': 2, 'chosenUniformScale': 1, 'outputPixels': 2, 'note': 'All instances are 1:1 source rectangles, so the seam strip is a distinct two-output-pixel strip.'},
        'mossBase': str(MOSS.relative_to(REPO)), 'inputs': sources,
        'atlas': {'file': 'module-atlas-index-v2.png', 'mode': 'RGBA', 'size': {'width': 1024, 'height': 900}, 'indexOrder': list(range(1, 10))},
        'layoutPreview': {'file': 'module-mosaic-preview-v2.png', 'mode': 'RGBA', 'size': {'width': PREVIEW_SIZE[0], 'height': PREVIEW_SIZE[1]}, 'instances': records, 'groups': [{'id': 'main-group', 'instanceIds': [record['id'] for record in records]}], 'mossExposure': 'main group outer contour plus the explicitly declared internal moss hole only'},
        'sharedSeamLayer': {'file': 'shared-seams-v2.png', 'mode': 'RGBA', 'color': '#293A2E', 'sourcePixels': 2, 'alpha': 255, 'mossVisible': False, 'seams': seams, 'junctionFills': junction_fills},
        'nonOverlap': {'contentRectangles': 'pairwise disjoint; every 2px void between adjacent content bboxes is a seam strip', 'overlapAllowed': False},
        'nonGridNote': 'One connected masonry group uses five unequal column widths and staggered, non-periodic horizontal cut points. The only interior blank is the declared bounded hole; no full-width or full-height moss channel exists.',
        'mossGaps': [
            {'id': 'gap-a-enclosed-core', 'bbox': {'x': 440, 'y': 345, 'width': 230, 'height': 168}, 'boundary': 'near-rectangular core hole; its four sides are bounded by staggered stone rectangles rather than a generated grid', 'area': 38640, 'mode': 'enclosed', 'adjacentModuleIds': ['m05', 'm06', 'm10', 'm12', 'm16']},
        ],
    }
    (ROOT / 'module-mosaic-v2.review.json').write_text(dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
