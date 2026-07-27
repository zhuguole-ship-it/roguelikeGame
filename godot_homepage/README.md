# Godot 首页原型

这是按“夜间森林村庄主页”概念图制作的 Godot 4.x 首页原型。当前 Web / Vite 仍是正式运行时；Godot 负责编辑首页背景视频、封面参考图、按钮和热点位置，再通过同步脚本导出给 Web 读取。

## 打开方式

1. 安装 Godot 4.x。
2. 用 Godot 打开 `godot_homepage/project.godot`。
3. 运行主场景 `scenes/main_menu.tscn`。

## 当前内容

- 中文标题：`像素地牢猎人`
- 可在 Godot 编辑器直接选中和修改的中文按钮：
  - `开始游戏`
  - `角色选择`
  - `物品仓库`
  - `设置`
- 夜间森林村庄主页：
  - 中央篝火
  - 铁匠铺与发光熔炉
  - 猎手之家暖光窗户
  - 紫色魔法传送门
  - 木质告示牌
  - 石路、树木、远处城堡与星空

## 如何编辑首页按钮

1. 用 Godot 打开 `godot_homepage/project.godot`。
2. 打开场景 `scenes/main_menu.tscn`。
3. 在场景树中展开 `MainMenu -> UI -> UIRoot`。
4. 主菜单按钮位于 `MenuPanel` 下：
   - `StartButton`
   - `CharacterButton`
   - `InventoryButton`
   - `SettingsButton`
5. 场景热点按钮位于 `Hotspots` 下：
   - `BlacksmithButton`
   - `HunterHomeButton`
   - `PortalButton`
   - `NoticeBoardButton`
6. 选中任意按钮后，可以在 2D 视图拖动位置，也可以在 Inspector 中修改 `Text`、`Position`、`Size`、`Tooltip Text` 和主题样式覆盖。
7. `homepage_ui.gd` 只绑定这些已存在节点、连接点击信号并更新状态文案；不要再通过脚本坐标数组创建首页按钮。

## 同步到 Web 本地服务

改完 `main_menu.tscn` 后，在项目根目录运行：

```bash
npm run sync:godot:homepage
```

脚本会读取 Godot 场景里的按钮矩形、`BackgroundVideo.stream` 和 `BackgroundPoster.texture`，并生成 `public/assets/godot-ui/main-menu-layout.json`。同时会把 Godot 使用的视频和封面图复制到 `public/assets/godot-ui/`。如果 Godot 使用 `.ogv`，脚本会优先查找同名 `.webm` 作为网页视频源，因为 Chrome 对 Godot 常用的 Theora `.ogv` 支持不稳定。Web 首页会优先读取这个 JSON；刷新 `http://127.0.0.1:5173/roguelikeGame/` 后即可看到新的背景媒体和点击区域生效。

## 当前限制

- `.godot` / `.import` / `.uid` 是 Godot 自动生成文件，已经被 `.gitignore` 忽略，不需要手动维护。
- 编辑器里用于摆放 UI 的静态参考图是 `BackgroundPoster`；运行时会隐藏它并播放 `BackgroundVideo`。
- Web 运行时使用 `BackgroundVideo.stream` 对应的同名 `.webm`，例如 `pixel_contract_hunter_start_screen_960x640.webm`；Godot 仍可继续使用 `.ogv`。
- Web 当前同步背景视频、封面图、按钮和热点点击区域的位置、尺寸、文案和入口映射；弹窗内容仍由 `src/components/game/GameOverlay.tsx` 负责。

## 后续接入建议

1. 在 Godot 内确认主页构图、中文标题和按钮位置。
2. 若保留 Web 项目为主版本，可继续扩展 `main-menu-layout.json`，逐步同步更多样式 token。
3. 若未来迁移到 Godot，可继续拆分为：
   - `VillageScene`
   - `BlacksmithHotspot`
   - `PortalHotspot`
   - `InventoryMenu`
   - `CampaignSelectMenu`
