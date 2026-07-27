import type { MetaTalentNode } from './talents'

const encodeAssetPath = (path: string) => path.split('/').map(encodeURIComponent).join('/')

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${encodeAssetPath(path)}`

const iconPathByAssetName: Record<string, string> = {
  Boss追忆: 'assets/meta-talents/icons/1基础通用树/Boss追忆.png',
  仓库整理: 'assets/meta-talents/icons/1基础通用树/仓库整理.png',
  分解熟练: 'assets/meta-talents/icons/1基础通用树/分解熟练.png',
  初始重绑: 'assets/meta-talents/icons/1基础通用树/初始重绑.png',
  契约回响: 'assets/meta-talents/icons/1基础通用树/契约回响.png',
  契约记忆: 'assets/meta-talents/icons/1基础通用树/契约记忆.png',
  封存选择: 'assets/meta-talents/icons/1基础通用树/封存选择.png',
  强化基础: 'assets/meta-talents/icons/1基础通用树/强化基础.png',
  流派偏向: 'assets/meta-talents/icons/1基础通用树/流派偏向.png',
  精英记录: 'assets/meta-talents/icons/1基础通用树/精英记录.png',
  结算清算: 'assets/meta-talents/icons/1基础通用树/结算清算.png',
  蓝晶亲和: 'assets/meta-talents/icons/1基础通用树/蓝晶亲和.png',
  处刑入门: 'assets/meta-talents/icons/2死契处刑/处刑入门.png',
  处刑者传承: 'assets/meta-talents/icons/2死契处刑/处刑者传承.png',
  标记训练: 'assets/meta-talents/icons/2死契处刑/标记训练.png',
  穿透传承: 'assets/meta-talents/icons/2死契处刑/穿透传承.png',
  精英破契术: 'assets/meta-talents/icons/2死契处刑/精英破契术.png',
  处刑保留: 'assets/meta-talents/icons/2死契处刑/进阶树/处刑保留.png',
  契约视界: 'assets/meta-talents/icons/2死契处刑/进阶树/契约视界.png',
  断罪回响: 'assets/meta-talents/icons/2死契处刑/进阶树/断罪回响.png',
  魂爆修正: 'assets/meta-talents/icons/2死契处刑/进阶树/魂爆修正.png',
  魂火残响: 'assets/meta-talents/icons/2死契处刑/魂火残响.png',
  暴击感知: 'assets/meta-talents/icons/3血羽游侠/暴击感知.png',
  流血熟练: 'assets/meta-talents/icons/3血羽游侠/流血熟练.png',
  羽裂追踪: 'assets/meta-talents/icons/3血羽游侠/羽裂追踪.png',
  血羽传承: 'assets/meta-talents/icons/3血羽游侠/血羽传承.png',
  血羽入门: 'assets/meta-talents/icons/3血羽游侠/血羽入门.png',
  轻弦训练: 'assets/meta-talents/icons/3血羽游侠/轻弦训练.png',
  散射校准: 'assets/meta-talents/icons/3血羽游侠/进阶树/散射校准.png',
  羽迹锁定: 'assets/meta-talents/icons/3血羽游侠/进阶树/羽迹锁定.png',
  血裂熟练: 'assets/meta-talents/icons/3血羽游侠/进阶树/血裂熟练.png',
  风暴蓄势: 'assets/meta-talents/icons/3血羽游侠/进阶树/风暴蓄势.png',
  兽王传承: 'assets/meta-talents/icons/4兽王赦令/兽王传承.png',
  兽语入门: 'assets/meta-talents/icons/4兽王赦令/兽语入门.png',
  复苏训练: 'assets/meta-talents/icons/4兽王赦令/复苏训练.png',
  护主训练: 'assets/meta-talents/icons/4兽王赦令/护主训练.png',
  指令熟练: 'assets/meta-talents/icons/4兽王赦令/指令熟练.png',
  兽群站位: 'assets/meta-talents/icons/4兽王赦令/进阶树/兽群站位.png',
  合围熟练: 'assets/meta-talents/icons/4兽王赦令/进阶树/合围熟练.png',
  复苏图腾: 'assets/meta-talents/icons/4兽王赦令/进阶树/复苏图腾.png',
  首领命令: 'assets/meta-talents/icons/4兽王赦令/进阶树/首领命令.png',
  首领血脉: 'assets/meta-talents/icons/4兽王赦令/首领血脉.png',
  充能导线: 'assets/meta-talents/icons/5蓝晶契约/充能导线.png',
  冷却研习: 'assets/meta-talents/icons/5蓝晶契约/冷却研习.png',
  晶域维持: 'assets/meta-talents/icons/5蓝晶契约/晶域维持.png',
  蓝晶传承: 'assets/meta-talents/icons/5蓝晶契约/蓝晶传承.png',
  蓝晶入门: 'assets/meta-talents/icons/5蓝晶契约/蓝晶入门.png',
  过载稳定: 'assets/meta-talents/icons/5蓝晶契约/过载稳定.png',
  冷却闭环: 'assets/meta-talents/icons/5蓝晶契约/进阶树/冷却闭环.png',
  晶域稳定: 'assets/meta-talents/icons/5蓝晶契约/进阶树/晶域稳定.png',
  晶脉感知: 'assets/meta-talents/icons/5蓝晶契约/进阶树/晶脉感知.png',
  过载校准: 'assets/meta-talents/icons/5蓝晶契约/进阶树/过载校准.png',
  困难BOSS追忆: 'assets/meta-talents/icons/6四难度精通树/困难难度/困难BOSS追忆.png',
  困难契约熟练: 'assets/meta-talents/icons/6四难度精通树/困难难度/困难契约熟练.png',
  困难套装追踪: 'assets/meta-talents/icons/6四难度精通树/困难难度/困难套装追踪.png',
  困难精英猎手: 'assets/meta-talents/icons/6四难度精通树/困难难度/困难精英猎手.png',
  地狱BOSS追忆: 'assets/meta-talents/icons/6四难度精通树/地狱难度/地狱BOSS追忆.png',
  地狱契约熟练: 'assets/meta-talents/icons/6四难度精通树/地狱难度/地狱契约熟练.png',
  地狱套装追踪: 'assets/meta-talents/icons/6四难度精通树/地狱难度/地狱套装追踪.png',
  地狱精英破局: 'assets/meta-talents/icons/6四难度精通树/地狱难度/地狱精英破局.png',
  折磨BOSS追忆: 'assets/meta-talents/icons/6四难度精通树/折磨难度/折磨BOSS追忆.png',
  折磨传奇嗅觉: 'assets/meta-talents/icons/6四难度精通树/折磨难度/折磨传奇嗅觉.png',
  折磨契约熟练: 'assets/meta-talents/icons/6四难度精通树/折磨难度/折磨契约熟练.png',
  折磨精英战利品: 'assets/meta-talents/icons/6四难度精通树/折磨难度/折磨精英战利品.png',
  普通契约熟练: 'assets/meta-talents/icons/6四难度精通树/普通难度/普通契约熟练.png',
  普通战利品识别: 'assets/meta-talents/icons/6四难度精通树/普通难度/普通战利品识别.png',
  普通精英记录: 'assets/meta-talents/icons/6四难度精通树/普通难度/普通精英记录.png',
  普通通关回响: 'assets/meta-talents/icons/6四难度精通树/普通难度/普通通关回响.png',
  圣林精通: 'assets/meta-talents/icons/7十关契约精通/圣林精通.png',
  死契地牢精通: 'assets/meta-talents/icons/7十关契约精通/死契地牢精通.png',
  沼泽精通: 'assets/meta-talents/icons/7十关契约精通/沼泽精通.png',
  潮汐精通: 'assets/meta-talents/icons/7十关契约精通/潮汐精通.png',
  矿坑精通: 'assets/meta-talents/icons/7十关契约精通/矿坑精通.png',
  破阵精通: 'assets/meta-talents/icons/7十关契约精通/破阵精通.png',
  血月古堡精通: 'assets/meta-talents/icons/7十关契约精通/血月古堡精通.png',
  迷宫精通: 'assets/meta-talents/icons/7十关契约精通/迷宫精通.png',
  黑森林精通: 'assets/meta-talents/icons/7十关契约精通/黑森林精通.png',
  龙审精通: 'assets/meta-talents/icons/7十关契约精通/龙审精通.png',
  传承保底: 'assets/meta-talents/icons/8终局通用树/传承保底.png',
  契约归档: 'assets/meta-talents/icons/8终局通用树/契约归档.png',
  契约清档: 'assets/meta-talents/icons/8终局通用树/契约清档.png',
  折磨保管: 'assets/meta-talents/icons/8终局通用树/折磨保管.png',
  终局鉴定: 'assets/meta-talents/icons/8终局通用树/终局鉴定.png',
  锁词重铸: 'assets/meta-talents/icons/8终局通用树/锁词重铸.png',
}

const normalizeIconName = (name: string) => name.replace(/\s+/g, '').toLowerCase()

const normalizedIconPathByAssetName = Object.fromEntries(
  Object.entries(iconPathByAssetName).map(([name, path]) => [normalizeIconName(name), path]),
)

const talentIconNameAliases: Record<string, string> = {
  初始重掷: '初始重绑',
  地狱橙装追踪: '地狱套装追踪',
  高难清算: '契约清档',
}

export const getMetaTalentIconAssetPath = (node: Pick<MetaTalentNode, 'name'>) => {
  const alias = talentIconNameAliases[node.name]
  return iconPathByAssetName[node.name]
    ?? normalizedIconPathByAssetName[normalizeIconName(node.name)]
    ?? (alias ? iconPathByAssetName[alias] : undefined)
}

export const getMetaTalentIconAssetUrl = (node: Pick<MetaTalentNode, 'name'>) => {
  const path = getMetaTalentIconAssetPath(node)
  return path ? publicAsset(path) : undefined
}
