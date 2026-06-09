import { WORLD_HEIGHT, WORLD_WIDTH } from './config'

const VILLAGE_MENU_BACKGROUND_SRC = `${import.meta.env.BASE_URL}assets/village-main-menu-background.png`

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
  ctx.drawImage(villageMenuBackground, 0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  ctx.restore()
  return true
}
