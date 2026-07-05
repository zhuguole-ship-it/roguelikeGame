# Godot 首页原型

这是按“夜间森林村庄主页”概念图制作的 Godot 4.x 首页原型。它目前是独立原型，不会替换现有 React / Vite 版本首页，也不会接入战斗逻辑。

## 打开方式

1. 安装 Godot 4.x。
2. 用 Godot 打开 `godot_homepage/project.godot`。
3. 运行主场景 `scenes/main_menu.tscn`。

## 当前内容

- 中文标题：`像素地牢猎人`
- 中文按钮：
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

## 当前限制

- 本机当前没有检测到 Godot 可执行文件，所以还没有做引擎内运行截图。
- 场景使用 GDScript 绘制像素风图形，不是最终拆分后的 PNG 图集资产。
- 按钮只打印/更新原型状态文案，尚未接入现有 Web 项目的状态管理和战斗入口。

## 后续接入建议

1. 在 Godot 内确认主页构图、中文标题和按钮位置。
2. 若保留 Web 项目为主版本，可将 Godot 主页拆成参考图层，再反向实现到 React / Canvas。
3. 若未来迁移到 Godot，可继续拆分为：
   - `VillageScene`
   - `BlacksmithHotspot`
   - `PortalHotspot`
   - `InventoryMenu`
   - `CampaignSelectMenu`
