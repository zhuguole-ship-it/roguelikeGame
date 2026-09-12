"""Audits the review-only module mosaic without creating runtime inputs."""

from collections import Counter, deque
from hashlib import sha256
from json import dumps, loads
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
EDGE = (41, 58, 46, 255)


def image_report(path: Path):
    image = Image.open(path).convert('RGBA')
    alpha = image.getchannel('A').histogram()
    return {
        'sha256': sha256(path.read_bytes()).hexdigest(),
        'dimensions': {'width': image.width, 'height': image.height},
        'mode': image.mode,
        'transparentPixels': alpha[0],
        'opaquePixels': alpha[255],
    }


def intersects(first, second):
    return not (
        first['x'] + first['width'] <= second['x']
        or second['x'] + second['width'] <= first['x']
        or first['y'] + first['height'] <= second['y']
        or second['y'] + second['height'] <= first['y']
    )


def blank_components(instances, seams, junction_fills):
    left = min(item['layout']['x'] for item in instances)
    top = min(item['layout']['y'] for item in instances)
    right = max(item['layout']['x'] + item['layout']['width'] for item in instances)
    bottom = max(item['layout']['y'] + item['layout']['height'] for item in instances)
    width, height = right - left, bottom - top
    occupied = bytearray(width * height)
    for item in [*instances, *({'layout': seam['rect']} for seam in seams), *({'layout': fill['rect']} for fill in junction_fills)]:
        rect = item['layout']
        for y in range(rect['y'], rect['y'] + rect['height']):
            row = (y - top) * width
            for x in range(rect['x'], rect['x'] + rect['width']):
                occupied[row + x - left] = 1

    components = []
    for start_y in range(height):
        for start_x in range(width):
            start = start_y * width + start_x
            if occupied[start]:
                continue
            occupied[start] = 1
            queue = deque([(start_x, start_y)])
            area = 0
            min_x = max_x = start_x
            min_y = max_y = start_y
            touches_boundary = start_x in (0, width - 1) or start_y in (0, height - 1)
            while queue:
                x, y = queue.popleft()
                area += 1
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)
                for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    index = next_y * width + next_x
                    if occupied[index]:
                        continue
                    occupied[index] = 1
                    touches_boundary = touches_boundary or next_x in (0, width - 1) or next_y in (0, height - 1)
                    queue.append((next_x, next_y))
            components.append({'bbox': {'x': left + min_x, 'y': top + min_y, 'width': max_x - min_x + 1, 'height': max_y - min_y + 1}, 'area': area, 'touchesGroupBoundary': touches_boundary})
    return {'bbox': {'x': left, 'y': top, 'width': width, 'height': height}, 'components': components}


def connected_group_count(instances, seams):
    graph = {item['id']: set() for item in instances}
    for seam in seams:
        first, second = seam['participantInstanceIds']
        graph[first].add(second)
        graph[second].add(first)
    remaining = set(graph)
    groups = 0
    while remaining:
        groups += 1
        pending = [remaining.pop()]
        while pending:
            current = pending.pop()
            neighbours = graph[current] & remaining
            remaining -= neighbours
            pending.extend(neighbours)
    return groups


def main():
    manifest = loads((ROOT / 'module-mosaic-v2.review.json').read_text())
    assert manifest['reviewOnly'] is True and manifest['runtimeEligible'] is False
    inputs = manifest['inputs']
    assert [item['sourceIndex'] for item in inputs] == list(range(1, 10))
    for item in inputs:
        copy = REPO / item['path']
        assert sha256(copy.read_bytes()).hexdigest() == item['sha256']
    assert inputs[5]['sha256'] != inputs[8]['sha256'], '6 and 9 remain separate inputs'

    instances = manifest['layoutPreview']['instances']
    usage = Counter(instance['sourceIndex'] for instance in instances)
    assert set(usage) == set(range(1, 10))
    assert all(instance['transform']['rotationDegrees'] == 0 for instance in instances)
    assert all(instance['transform']['uniformScale'] == 1 for instance in instances)
    assert all(instance['transform']['sampling'] == 'nearest' for instance in instances)
    assert len(instances) >= 18
    assert any(instance['transform']['horizontalFlip'] for instance in instances)
    assert any(instance['transform']['verticalFlip'] for instance in instances)
    overlap_pairs = [
        (first['id'], second['id'])
        for index, first in enumerate(instances)
        for second in instances[index + 1:]
        if intersects(first['layout'], second['layout'])
    ]
    assert not overlap_pairs, overlap_pairs

    seam_path = ROOT / manifest['sharedSeamLayer']['file']
    seam = Image.open(seam_path).convert('RGBA')
    pixels = seam.load()
    colors = {pixels[x, y] for y in range(seam.height) for x in range(seam.width) if pixels[x, y][3] != 0}
    assert colors == {EDGE}, colors
    seams = manifest['sharedSeamLayer']['seams']
    junction_fills = manifest['sharedSeamLayer']['junctionFills']
    assert len({seam['id'] for seam in seams}) == len(seams)
    assert all(seam['sourcePixels'] == 2 and seam['alpha'] == 255 and seam['mossVisible'] is False and len(seam['participantInstanceIds']) == 2 and seam['ownerInstanceId'] in seam['participantInstanceIds'] for seam in seams)
    seam_content_intersections = [
        (seam['id'], instance['id'])
        for seam in seams
        for instance in instances
        if intersects(seam['rect'], instance['layout'])
    ]
    assert not seam_content_intersections, seam_content_intersections
    junction_content_intersections = [
        (fill['rect'], instance['id'])
        for fill in junction_fills
        for instance in instances
        if intersects(fill['rect'], instance['layout'])
    ]
    assert not junction_content_intersections, junction_content_intersections
    moss_gaps = manifest['mossGaps']
    assert len(moss_gaps) == 1
    assert moss_gaps[0]['mode'] == 'enclosed'
    gap_content_intersections = [
        (gap['id'], instance['id'])
        for gap in moss_gaps
        for instance in instances
        if intersects(gap['bbox'], instance['layout'])
    ]
    seam_gap_intersections = [
        (seam['id'], gap['id'])
        for seam in seams
        for gap in moss_gaps
        if intersects(seam['rect'], gap['bbox'])
    ]
    assert not gap_content_intersections, gap_content_intersections
    assert not seam_gap_intersections, seam_gap_intersections
    component_audit = blank_components(instances, seams, junction_fills)
    interior_blanks = [component for component in component_audit['components'] if not component['touchesGroupBoundary']]
    declared_gap_bboxes = [gap['bbox'] for gap in moss_gaps]
    matching_declared = [
        component for component in interior_blanks
        if component['bbox'] in declared_gap_bboxes
    ]
    fillable_blank_non_moss_gaps = [component for component in interior_blanks if component not in matching_declared]
    assert len(matching_declared) == len(moss_gaps), (interior_blanks, declared_gap_bboxes)
    assert not fillable_blank_non_moss_gaps, fillable_blank_non_moss_gaps
    main_group_count = connected_group_count(instances, seams)
    assert main_group_count == 1, main_group_count

    report = {
        'reviewOnly': True,
        'runtimeEligible': False,
        'sourceIndexes': list(range(1, 10)),
        'sourceUsageCounts': dict(sorted(usage.items())),
        'layout': {'instances': len(instances), 'groups': len(manifest['layoutPreview']['groups']), 'mainGroupCount': main_group_count, 'pairwiseBboxOverlapPairs': overlap_pairs, 'allScaleOne': True, 'rotationDisabled': True, 'hasHorizontalAndVerticalFlips': True, 'nonGridNote': manifest['nonGridNote']},
        'images': {'atlas': image_report(ROOT / manifest['atlas']['file']), 'preview': image_report(ROOT / manifest['layoutPreview']['file']), 'seams': image_report(seam_path)},
        'sharedSeams': {'exactContacts': len(seams), 'junctionFills': len(junction_fills), 'eachSeamHasExactlyOneOwner': True, 'contentRectangleIntersections': seam_content_intersections, 'junctionContentRectangleIntersections': junction_content_intersections, 'mossGapIntersections': seam_gap_intersections, 'onlyOpaque293A2E': True, 'sourcePixels': 2, 'mossVisible': False},
        'mossGaps': {'count': len(moss_gaps), 'ids': [gap['id'] for gap in moss_gaps], 'modes': [gap['mode'] for gap in moss_gaps], 'contentRectangleIntersections': gap_content_intersections, 'groupBoundingBox': component_audit['bbox'], 'interiorBlankComponents': interior_blanks, 'fillableBlankNonMossGapCount': len(fillable_blank_non_moss_gaps)},
    }
    (ROOT / 'module-mosaic-audit-v2.json').write_text(dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
