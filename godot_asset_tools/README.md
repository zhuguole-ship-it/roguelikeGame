# Godot 资产工具

这个工程用于编辑会同步到 Web 运行时的素材预览。当前 Web/Vite 仍是正式运行时；Godot 只作为素材编辑、动画预览、锚点校准工具。

## 打开方式

1. 用 Godot 打开 `godot_asset_tools/project.godot`。
2. 打开场景 `entities/dungeon_hellhound/hellhound_preview.tscn`。
3. 运行场景可预览 `dungeon-hellhound` 的动作。

## 地狱犬编辑点

- 帧文件在 `assets/developer-assets/dungeon-hellhound/`。
- 预览动作在 `HellhoundPreview` 节点的 `preview_action` 属性切换。
- 锚点在 `Anchors` 下：
  - `Body`
  - `Mouth`
  - `Cast`
  - `ProjectileSpawn`

## 同步到 Web 本地服务

Godot 只能导出待审查的 staging 候选包，不能直接覆盖 Web 正式运行时资源。权威链路如下：

1. Godot 导出包含 `godot-export.json` 的 staging 包。
2. 导入器读取候选包，不直接改写正式运行时目录。
3. `DeveloperAssetPanel` 展示帧、动作、锚点和配置供人工复核。
4. 用户明确确认草稿后，才允许调用后端 save / apply 链路。
5. 只有后端 save / apply 链路可以更新项目配置和 runtime override。
6. 战斗、告示牌图鉴和资产管理必须从同一 manifest / runtime override 读取。

禁止 Godot 工具或同步脚本直接写入 `public/assets`、受保护的 `runtime-asset-overrides.json` 或 `dist`。如果旧命令仍会直接改写这些目录，在完成代码审计和修复前不得继续使用。

完整格式、导入、保存和发布约束见 `docs/godot-asset-pipeline.md`。

## 注意

- 不要把 `.godot/`、`.import`、`.uid` 当成需要手动维护的文件；它们已经被 `.gitignore` 忽略。
- 不要在这个工程里修改战斗数值、AI、掉落或技能伤害。
- 不要把 Godot 编辑器预览视为 Web 已生效；必须经过 staging、审查、save / apply 和 Web 运行时复核。
