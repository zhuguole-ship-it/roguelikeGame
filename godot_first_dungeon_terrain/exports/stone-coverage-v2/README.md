# E26 first-dungeon coverage topology v2

This is an offline Godot export package. It is not a browser runtime input until
A1 explicitly consumes its static PNG and JSON files.

Rebuild and audit from the repository root:

```sh
godot --headless --log-file /tmp/godot-e26-export.log \
  --path godot_first_dungeon_terrain \
  --script res://scripts/export_stone_coverage_v2.gd
godot --headless --log-file /tmp/godot-e26-verify.log \
  --path godot_first_dungeon_terrain \
  --script res://scripts/verify_stone_coverage_v2.gd
```

The masks are topology only: opaque white means sample the continuous,
world-coordinate stone source texture; alpha-zero means reveal the continuous
moss texture; `#293A2E` is the two-source-pixel hard moss-side boundary. No
stone or moss artwork is baked into a mask. `stone-coverage-rules-v2.json` is
the complete N/E/S/W `1/2/4/8` contract, and the manifest records source and
output hashes.
