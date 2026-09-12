# First-dungeon Dual Grid 4×4 review v1

This directory is review-only and is not a runtime input.

The two requested PNG sources are `1024×1024`, while a strict `4×4` grid of
`128×128` cells requires a `512×512` working canvas. The generator therefore
uses the complete source image with nearest-neighbor `1024→512` reduction,
records that `1` working pixel represents `2` source pixels, and never presents
the derived canvas as a native-pixel atlas.

Run from the repository root:

```sh
python3 drafts/first-dungeon-dual-grid-4x4-review-v1/generate_review.py
```

The audit compares exact original-order reconstruction, source repeatability,
original neighbor contacts, every directed reordered contact, and a conservative
freely-exchangeable subset. It does not change files under `public/`.
