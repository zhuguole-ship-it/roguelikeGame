# Godot 资产管线 v1

本文件定义方案 A：Godot 只作为资产管理、动画预览、锚点校准、朝向校验、碰撞盒预览、技能特效预览和导出工具。当前 Web 项目仍是唯一正式运行时；战斗核心、技能逻辑、天赋、奖励、关卡、存档和测试体系不迁移到 Godot。

## 第一性边界

- Godot 负责素材生产、动画预览、锚点 / 朝向 / 碰撞盒 / 特效预览和导出。
- Web 项目负责正式运行时、战斗渲染、玩法逻辑、UI、存档、测试和发布。
- Godot 导出物必须适配现有 `assetManifest`、`runtimeAssetOverrides`、`DeveloperAssetPanel` 体系。
- Godot 不得绕过开发者资产管理后台直接写入 runtime override、项目配置或正式素材目录。
- Godot 接入第一版只做资产管线设计和后续导入器契约，不改战斗主循环、不改怪物 AI、不改技能伤害、不改素材本体。

## 当前资产管线事实

- 开发者资产后台入口在开发 / 测试环境的 `测试` 面板，正式环境隐藏。
- 后台实体范围为普通怪、精英怪、Boss、野兽召唤物。
- 后台动作槽枚举为 `idle`、`move`、`attack`、`cast`、`skill_1`、`skill_2`、`hit`、`death`、`downed`、`revive`、`leader`。
- `src/game/assetManifest.ts` 定义实体、动作槽、帧尺寸、帧数、FPS、循环、左右翻转、战斗动作映射、显示缩放、锚点、图鉴 / 战斗预览来源。
- `src/game/runtimeAssetOverrides.ts` 的项目配置 URL 为 `assets/developer-assets/runtime-asset-overrides.json`，文件位于 `public/assets/developer-assets/runtime-asset-overrides.json`。
- runtime override 字段包括 `entityId`、`slot`、`combatAction`、`frameUrls`、`frameWidth`、`frameHeight`、`frameCount`、`fps`、`durationSeconds`、`loop`、`hitFrameIndex`、`flipX`、`guideFrame`、`assetPath`、`anchors`、`combatScale`、`assetRevision`。
- 后台保存流程是：草稿预览 -> 保存草稿到 localStorage -> 通过现有保存 / 应用路径写项目配置并生成备份。测试环境不应真实写项目配置。
- 当前浏览器真实文件 upload + save 仍有污染风险和未充分验证点，Godot 管线不能把该路径写成已完全通过。

## 目录与污染边界

### 允许目录

- `godot_asset_tools/`：建议的新 Godot 工程目录。用于 Godot 场景、导出脚本、工具 UI、编辑器插件和示例数据。
- `assets/developer-assets/godot-export-staging/`：建议的新 staging 导出目录。用于 Godot 导出的中间 JSON、帧文件、预览图和校验报告。
- `/private/tmp/roguelike-godot-export-*`：临时本机导出目录。用于一次性 QA、截图或导入器开发，不入仓。

当前仓库根目录尚无 `assets/`，因此第一版如需落地 staging，应由后续导入器任务显式新建 `assets/developer-assets/godot-export-staging/`。该目录不是 Web runtime 直接读取路径。

### 禁止直接写入

- `public/assets/monsters/`、`public/assets/player/`、`public/assets/tiles/`、`public/assets/reference/`：正式素材本体目录，Godot 不得直接覆盖。
- `public/assets/developer-assets/runtime-asset-overrides.json`：用户 / 项目 runtime override，Godot 不得直接改写。
- `assets/developer-assets/runtime-asset-overrides.json`：若未来出现同名项目配置路径，同样不得由 Godot 直接改写。
- `dist/`：构建产物，Godot 不得写入或作为导出目标。
- `src/game/assetManifest.ts`：Godot 导出不直接编辑源代码；转换成 manifest 草稿后由程序员 review，再通过后台应用。

### Git 忽略建议

后续若创建 Godot 工程，建议补充 `.gitignore`，但本任务不直接修改：

```gitignore
# Godot editor cache
godot_asset_tools/.godot/
godot_asset_tools/.import/
godot_asset_tools/imported/
godot_asset_tools/.mono/

# Godot export scratch
assets/developer-assets/godot-export-staging/**/*.tmp
assets/developer-assets/godot-export-staging/**/.DS_Store
assets/developer-assets/godot-export-staging/**/cache/
assets/developer-assets/godot-export-staging/**/preview-cache/
```

是否提交 staging 内的 PNG / JSON 需要按 review 决定：导出报告和小型示例 JSON 可以入仓；大批量帧文件默认先不入仓，避免把未验收素材当正式资源。

## Godot 导出契约

Godot 第一版导出一个包目录，每个包包含 `godot-export.json`、可选 `frames/`、可选 `sheets/`、可选 `previews/`、可选 `qa-report.json`。字段必须足够转换为现有 `DeveloperAssetAction` 与 `RuntimeAssetActionOverride`。

```json
{
  "schemaVersion": 1,
  "assetId": "dungeon-hellhound-godot-v1",
  "entityId": "dungeon-hellhound",
  "displayName": "地狱犬",
  "kind": "monster",
  "sourceGodotScene": "res://entities/dungeon_hellhound/hellhound_preview.tscn",
  "sourceRevision": "git-or-export-revision",
  "generatedAt": "2026-07-08T00:00:00.000Z",
  "clips": [
    {
      "action": "idle",
      "combatAction": "idle",
      "label": "待机",
      "frameFiles": [
        "frames/idle/frame_01.png",
        "frames/idle/frame_02.png"
      ],
      "spriteSheet": {
        "path": "sheets/hellhound_idle.png",
        "columns": 6,
        "rows": 1,
        "frameWidth": 64,
        "frameHeight": 64
      },
      "fps": 8,
      "loop": true,
      "durationSeconds": 0.75,
      "releaseFrame": null,
      "hitFrame": 2,
      "flipX": true,
      "facing": "right",
      "anchors": {
        "body": { "x": 0.5, "y": 0.68, "label": "身体" },
        "mouth": { "x": 0.82, "y": 0.32, "label": "口部" },
        "cast": { "x": 0.73, "y": 0.4, "label": "吐息" },
        "projectileSpawn": { "x": 0.83, "y": 0.33, "label": "火焰" }
      },
      "pivot": { "x": 0.5, "y": 0.72 },
      "hurtbox": { "x": 0.5, "y": 0.62, "width": 0.48, "height": 0.5 },
      "hitbox": null,
      "collisionRadius": 36,
      "scale": 1,
      "zIndex": 20,
      "shadow": { "enabled": true, "width": 54, "height": 18, "opacity": 0.35 },
      "effectBlendMode": "normal",
      "completeness": {
        "status": "complete",
        "currentFrames": 6,
        "targetFrames": 6,
        "missingFrames": [],
        "missingActions": [],
        "placeholder": false,
        "source": "godot-export"
      }
    }
  ]
}
```

### 字段约束

- `entityId` 必须匹配现有 manifest 实体，例如 `dungeon-hellhound`。
- `kind` 只能使用 `player`、`monster`、`elite`、`boss`、`summon`、`skillEffect`、`ui`。
- `action` 必须映射到现有动作槽：`idle`、`move`、`attack`、`cast`、`skill_1`、`skill_2`、`hit`、`death`、`downed`、`revive`、`leader`。
- `combatAction` 必须映射到运行时动作名，例如 `idle`、`move`、`attack`、`cast`、`skill`、`skill2`、`hit`、`death`。
- `frameFiles` 使用相对导出包路径；导入器转换时再决定是否复制到 `public/assets/developer-assets/...`。
- `spriteSheet` 可选；若同时提供逐帧文件和 sheet，后台预览优先使用逐帧文件，sheet 作为 review / 压缩候选。
- `fps`、`loop`、`durationSeconds` 必须能转换为 `DeveloperAssetAction.fps`、`loop`、`durationSeconds`。
- `releaseFrame` 用于技能释放帧；`hitFrame` 用于攻击 / 命中帧，转换为当前 `hitFrameIndex`。
- `flipX` 和 `facing` 必须保留。若 Godot 预览朝向与 Web runtime 默认朝向相反，导入器只能写草稿字段，不得直接改素材。
- `anchors` 使用 0-1 归一化坐标，键名对齐 `body`、`weapon`、`mouth`、`cast`、`projectileSpawn`。Web/staging 导出契约以复数 `anchors` 为准；若 Godot 内部存在单点 anchor 概念，导入器必须转换为 runtime `anchors`。
- `pivot`、`hurtbox`、`hitbox`、`collisionRadius` 第一版只供后台预览和 QA；不得自动改怪物碰撞或攻击判定。
- `scale` 对应当前 `combatScale`；`zIndex`、`shadow`、`effectBlendMode` 第一版只供预览和后续导入器使用。
- `completeness.status` 使用 `complete`、`missing-frame`、`missing-action`、`placeholder`、`manual-qa`、`missing-source`，导入后台后映射为文档要求的完整、缺帧、缺动作、待人工验收、草稿未保存、配置来源缺失。

## 与现有后台的关系

Godot 导出后的唯一合法接入路径：

1. Godot 导出到 staging 包目录。
2. 后续导入器读取 `godot-export.json`，把 clip 转换为后台可读草稿对象。
3. `DeveloperAssetPanel` 显示 staging 来源、动作槽状态、缺帧 / 缺动作原因、锚点、朝向、帧尺寸、帧数、FPS、循环、战斗实测预览。
4. 用户在后台确认草稿。
5. 后台执行保存草稿 / 应用项目配置。只有这一步可以写 runtime override 或项目配置。
6. 战斗渲染继续读取转换后的 manifest / runtime override，不直接读取 Godot 工程。

Godot 不负责：

- 写 `public/assets/developer-assets/runtime-asset-overrides.json`。
- 写 localStorage 草稿。
- 调用 `/__roguelike-asset-config`。
- 修改 `src/game/assetManifest.ts`。
- 修改怪物数值、技能伤害、装备词缀、掉率、经济或存档。

## Staging 校验清单

导入器或后台读取 Godot staging 时必须给出以下状态，而不是把导出成功等同于正式应用成功：

| 检查项 | 通过标准 | 失败显示 |
| --- | --- | --- |
| 包结构 | 存在 `godot-export.json` | 配置来源缺失 |
| 实体 ID | `entityId` 匹配现有实体或待新增实体卡 | 配置来源缺失 |
| 动作槽 | clip action 属于已确认槽位 | 缺动作 |
| 帧文件 | `frameFiles` 指向 staging 内存在文件 | 缺帧 |
| 帧规格 | 实际 PNG 尺寸等于 `frameWidth` / `frameHeight` | 帧规格不匹配 |
| 帧数 | 当前帧数达到目标帧数 | 缺帧 |
| 锚点 | 必填技能锚点存在 | 待人工验收或缺动作 |
| 朝向 | `facing` / `flipX` 可在预览中复现 | 待人工验收 |
| 四足剪影 | 地狱犬、狼等四足怪需人工确认 | 待人工验收 |
| 保存路径 | 未写 `public/assets` / runtime override / `dist` | 若写入则判为污染 |

## 最小试点：dungeon-hellhound

第一版只试点 `dungeon-hellhound`，因为当前资产后台、runtime override 和用户反馈都已覆盖该实体的 `flipX`、吐息锚点、缺帧风险。

### 试点范围

- Godot 场景：`res://entities/dungeon_hellhound/hellhound_preview.tscn`。
- 导出动作：`idle`、`move` 或 `run`、`attack`、`skill_1`、`death`。
- 若 Godot 使用 `run` 命名，导出 JSON 必须将 `action` 映射为当前后台槽位 `move`，并保留 `sourceClip: "run"` 供 review。
- 必须导出 `flipX`、`facing`、`body`、`mouth`、`cast`、`projectileSpawn`。
- 必须导出帧尺寸、帧数、FPS、循环、技能释放 / 命中帧。
- 不改战斗逻辑，不改地狱犬 AI，不改吐息伤害，不改现有 PNG 本体。

### 试点完成标准

- 当前项目能读取导出描述并在资产后台预览。
- 后台能显示 staging 来源，不把 staging 当作已应用项目配置。
- 后台能验证 `flipX` / 朝向 / 锚点不丢失。
- 后台能区分“Godot 导出成功”和“正式保存 / 应用成功”。
- 不污染 `public/assets` 正式素材。
- 不污染 `public/assets/developer-assets/runtime-asset-overrides.json` 用户 runtime override。
- 不写 `dist`。
- 组件测试或浏览器测试能覆盖：读取 staging、预览动作、导出成功状态、保存 / 应用前不污染正式配置。

## 后续开发拆分

- B 线程负责：文档、导出契约、staging 读取 / 转换 UI、资产后台配置校验、保存 / 应用边界、污染保护、组件测试。
- A 线程负责：只有在后续需要时，让现有渲染消费端读取转换后的 manifest / runtime override；不得重写战斗核心。
- D 线程负责：资产后台 UI、数据字段、缺帧清单、保存 / 应用、upload 风险和 staging 导入验收。
- C 线程负责：正式战斗画面消费验收，确认 Web runtime 使用转换后 manifest 时不会白屏、错向、锚点丢失或技能特效错位。

## 后续任务切片

1. 新建 Godot 工具工程骨架和 `.gitignore`，不导出正式素材。
2. 定义 `godot-export.schema.json`，用示例 JSON 验证字段完整性。
3. 做 `dungeon-hellhound` staging 示例包，文件放在 staging，不进 `public/assets`。
4. 写导入器纯函数：Godot export -> DeveloperAsset draft entity。
5. 在 `DeveloperAssetPanel` 增加“读取 Godot staging”入口，仅开发 / 测试环境可见。
6. 补组件测试：导入 staging 后草稿 dirty、缺帧状态、锚点、flipX、保存前不污染 runtime override。
7. 浏览器验收地狱犬 idle / move / attack / skill / death 预览。
8. 经 D / C 验收后，再决定是否推广到骷髅战士、骷髅骑士、野兽召唤物和技能特效。

## 明确不做

- 不把 Web 项目迁移到 Godot。
- 不让 Godot 执行正式战斗逻辑。
- 不用 Godot 生成或覆盖正式 `public/assets` 素材本体。
- 不让 Godot 直接写 runtime override。
- 不把 staging 导出成功写成正式应用成功。
- 不把浏览器 upload/save 未充分验证风险写成已完成。
