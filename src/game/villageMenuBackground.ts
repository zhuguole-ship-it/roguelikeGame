import { WORLD_HEIGHT, WORLD_WIDTH } from './config'

const VILLAGE_MENU_BACKGROUND_SRC = `${import.meta.env.BASE_URL}assets/godot-ui/pixel_contract_hunter_start_screen_960x640_poster.png`

const villageMenuBackground =
  typeof Image === 'undefined'
    ? null
    : (() => {
        const image = new Image()
        image.src = VILLAGE_MENU_BACKGROUND_SRC
        return image
      })()

export const drawVillageMenuBackground = (ctx: CanvasRenderingContext2D) => {
  if (!villageMenuBackground?.complete || villageMenuBackground.naturalWidth === 0 || villageMenuBackground.naturalHeight === 0) {
    return false
  }

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#050908'
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  const imageRatio = villageMenuBackground.naturalWidth / villageMenuBackground.naturalHeight
  const worldRatio = WORLD_WIDTH / WORLD_HEIGHT
  const drawWidth = imageRatio > worldRatio ? WORLD_WIDTH : WORLD_HEIGHT * imageRatio
  const drawHeight = imageRatio > worldRatio ? WORLD_WIDTH / imageRatio : WORLD_HEIGHT
  const drawX = (WORLD_WIDTH - drawWidth) / 2
  const drawY = (WORLD_HEIGHT - drawHeight) / 2
  ctx.drawImage(villageMenuBackground, Math.round(drawX), Math.round(drawY), Math.round(drawWidth), Math.round(drawHeight))
  ctx.restore()
  return true
}
