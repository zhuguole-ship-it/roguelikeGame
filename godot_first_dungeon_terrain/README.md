# E24 第一关随机视觉地形 Godot 离线包

此目录是独立的 Godot 4.x 编辑、预览和导出项目；React/Vite 浏览器运行时不加载本项目、Godot Web/WASM 或 GDScript。

## 可重复导出

```bash
godot --headless --path godot_first_dungeon_terrain --script res://scripts/export_terrain.gd
godot --headless --path godot_first_dungeon_terrain --script res://scripts/verify_terrain_export.gd
node godot_first_dungeon_terrain/scripts/verify_terrain_contract.mjs
```

`sources/stone/1.jpg` 与 `sources/moss/2.jpg` 是受控的原始字节副本。`exports/terrain-v1/` 的 atlas、preview、rules、manifest 与 QA report 是供后续 Web 静态导入器审阅的离线包；它们不是当前网页运行时输入。

TileSet 使用 16px grid，N/E/S/W 邻接 bit 为 `1/2/4/8`，并禁止所有 Collision/physics 语义。preview 固定使用 `battlefieldSeed=305419896` 及 global origin `(0,0)`；同时导出 east `(32,0)`、south `(0,32)` fixtures。所有 mask 都从全局格与一格 halo 的同一无符号 32-bit hash 计算，`terrain-rules.json` 提供可由 TypeScript `Math.imul` 重放的精确步骤，`terrain-fixtures-v1.json` 固定记录跨 chunk 边缘。
