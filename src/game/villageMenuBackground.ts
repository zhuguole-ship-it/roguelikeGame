import { HOMEPAGE_FOREST_BACKGROUND } from './homepageForestAssets'
import { getReadySceneAssetImage } from './sceneAssetLoading'
import { WORLD_HEIGHT, WORLD_WIDTH } from './config'

export const drawVillageMenuBackground = (ctx: CanvasRenderingContext2D) => {
  // Reuse the gated/decoded home image. No eager or hidden poster request.
  const villageMenuBackground = getReadySceneAssetImage(HOMEPAGE_FOREST_BACKGROUND)?.image
  if (!villageMenuBackground) {
    return false
  }

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#050908'
  const transform = ctx.getTransform?.()
  const width = ctx.canvas ? ctx.canvas.width / Math.abs(transform?.a || 1) : WORLD_WIDTH
  const height = ctx.canvas ? ctx.canvas.height / Math.abs(transform?.d || 1) : WORLD_HEIGHT
  ctx.fillRect(0, 0, width, height)
  const imageRatio = villageMenuBackground.naturalWidth / villageMenuBackground.naturalHeight
  const worldRatio = width / height
  const drawWidth = imageRatio > worldRatio ? height * imageRatio : width
  const drawHeight = imageRatio > worldRatio ? height : width / imageRatio
  const drawX = (width - drawWidth) * 0.30
  const drawY = (height - drawHeight) * 0.82
  ctx.drawImage(villageMenuBackground, Math.round(drawX), Math.round(drawY), Math.round(drawWidth), Math.round(drawHeight))
  ctx.restore()
  return true
}
