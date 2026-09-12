import { WORLD_HEIGHT, WORLD_WIDTH } from './config'
import { FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1 } from './firstDungeonStoneFragmentAssets'
import { getFirstDungeonStoneFragmentClusterPlan } from './firstDungeonStoneFragmentFloorPlan'
import type { GameSnapshot, Vector2 } from './types'

export type FirstDungeonStoneMossWebGlFloorMode = 'inactive' | 'webgl' | 'fallback'

export type FirstDungeonStoneMossWebGlFloorInput = Readonly<{
  active: boolean
  state: GameSnapshot
  camera: Vector2
}>

const FULLSCREEN_VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = vec2(aPosition.x * 0.5 + 0.5, 1.0 - (aPosition.y * 0.5 + 0.5));
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const MOSS_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uMoss;
uniform vec2 uCamera;
uniform vec2 uLogicalSize;
uniform vec2 uMossTextureSize;
void main() {
  vec2 world = uCamera + vUv * uLogicalSize;
  outColor = texture(uMoss, world / uMossTextureSize);
}`

const SPRITE_VERTEX_SHADER = `#version 300 es
in vec2 aWorldPosition;
in vec2 aTextureUv;
out vec2 vTextureUv;
uniform vec2 uCamera;
uniform vec2 uLogicalSize;
void main() {
  vec2 normalized = (aWorldPosition - uCamera) / uLogicalSize;
  gl_Position = vec4(normalized.x * 2.0 - 1.0, 1.0 - normalized.y * 2.0, 0.0, 1.0);
  vTextureUv = aTextureUv;
}`

const SPRITE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vTextureUv;
out vec4 outColor;
uniform sampler2D uTexture;
void main() {
  outColor = texture(uTexture, vTextureUv);
}`

const isWebGl2Context = (value: unknown): value is WebGL2RenderingContext => (
  Boolean(value)
  && typeof (value as Partial<WebGL2RenderingContext>).createShader === 'function'
  && typeof (value as Partial<WebGL2RenderingContext>).texImage3D === 'function'
)

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Unable to create WebGL shader.')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compile error.'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

const createProgram = (gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) => {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!program) throw new Error('Unable to create WebGL program.')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Unknown shader link error.'
    gl.deleteProgram(program)
    throw new Error(message)
  }
  return program
}

const requireUniform = (gl: WebGL2RenderingContext, program: WebGLProgram, name: string) => {
  const uniform = gl.getUniformLocation(program, name)
  if (!uniform) throw new Error(`Missing WebGL uniform ${name}.`)
  return uniform
}

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  if (typeof Image === 'undefined') {
    reject(new Error('Image is unavailable.'))
    return
  }
  const image = new Image()
  image.decoding = 'async'
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error(`Unable to load ${url}.`))
  image.src = url
})

const createTexture = (gl: WebGL2RenderingContext, unit: number, wrap: number) => {
  const texture = gl.createTexture()
  if (!texture) throw new Error('Unable to create WebGL texture.')
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
  return texture
}

type WebGlResources = Readonly<{
  gl: WebGL2RenderingContext
  mossProgram: WebGLProgram
  spriteProgram: WebGLProgram
  fullscreenBuffer: WebGLBuffer
  spriteBuffer: WebGLBuffer
  mossTexture: WebGLTexture
  atlasTexture: WebGLTexture
  seamTexture: WebGLTexture
  mossPosition: number
  mossUniforms: Readonly<{
    moss: WebGLUniformLocation
    camera: WebGLUniformLocation
    logicalSize: WebGLUniformLocation
    textureSize: WebGLUniformLocation
  }>
  spriteAttributes: Readonly<{ worldPosition: number; textureUv: number }>
  spriteUniforms: Readonly<{
    texture: WebGLUniformLocation
    camera: WebGLUniformLocation
    logicalSize: WebGLUniformLocation
  }>
}>

const createQuadVertices = (
  x: number,
  y: number,
  width: number,
  height: number,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
) => new Float32Array([
  x, y, u0, v0,
  x + width, y, u1, v0,
  x + width, y + height, u1, v1,
  x, y, u0, v0,
  x + width, y + height, u1, v1,
  x, y + height, u0, v1,
])

const createFragmentQuadVertices = (
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  localAnchorX: number,
  localAnchorY: number,
  rotationDegrees: number,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
) => {
  const radians = rotationDegrees * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const rotate = (x: number, y: number) => ({
    x: anchorX + x * cosine - y * sine,
    y: anchorY + x * sine + y * cosine,
  })
  const topLeft = rotate(-localAnchorX, -localAnchorY)
  const topRight = rotate(width - localAnchorX, -localAnchorY)
  const bottomRight = rotate(width - localAnchorX, height - localAnchorY)
  const bottomLeft = rotate(-localAnchorX, height - localAnchorY)
  return new Float32Array([
    topLeft.x, topLeft.y, u0, v0,
    topRight.x, topRight.y, u1, v0,
    bottomRight.x, bottomRight.y, u1, v1,
    topLeft.x, topLeft.y, u0, v0,
    bottomRight.x, bottomRight.y, u1, v1,
    bottomLeft.x, bottomLeft.y, u0, v1,
  ])
}

/** Presentation-only WebGL sibling. It never writes game state. */
export class FirstDungeonStoneMossWebGlFloorRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly onModeChange: () => void
  private mode: FirstDungeonStoneMossWebGlFloorMode = 'inactive'
  private resources: WebGlResources | undefined
  private initializing = false
  private unavailable = false

  constructor(canvas: HTMLCanvasElement, onModeChange: () => void) {
    this.canvas = canvas
    this.onModeChange = onModeChange
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      this.resources = undefined
      this.unavailable = true
      this.setMode('fallback')
    })
  }

  getMode() {
    return this.mode
  }

  render(input: FirstDungeonStoneMossWebGlFloorInput): FirstDungeonStoneMossWebGlFloorMode {
    if (!input.active) {
      this.setMode('inactive')
      return this.mode
    }
    if (!this.resources && !this.initializing && !this.unavailable) {
      void this.initialize()
    }
    if (!this.resources) {
      this.setMode('fallback')
      return this.mode
    }
    this.draw(input)
    this.setMode('webgl')
    return this.mode
  }

  dispose() {
    this.resources = undefined
    this.setMode('inactive')
  }

  private setMode(mode: FirstDungeonStoneMossWebGlFloorMode) {
    if (this.mode === mode) return
    this.mode = mode
    this.canvas.dataset.groundMode = mode
    this.canvas.style.display = mode === 'webgl' ? '' : 'none'
    this.onModeChange()
  }

  private async initialize() {
    this.initializing = true
    try {
      const gl = this.canvas.getContext('webgl2', { alpha: true, antialias: false })
      if (!isWebGl2Context(gl)) throw new Error('WebGL2 is unavailable.')
      const manifest = FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1
      const [moss, atlas, seams] = await Promise.all([
        loadImage(manifest.moss.publicUrl),
        loadImage(manifest.atlas.publicUrl),
        loadImage(manifest.sharedSeams.publicUrl),
      ])
      const mossProgram = createProgram(gl, FULLSCREEN_VERTEX_SHADER, MOSS_FRAGMENT_SHADER)
      const spriteProgram = createProgram(gl, SPRITE_VERTEX_SHADER, SPRITE_FRAGMENT_SHADER)
      const fullscreenBuffer = gl.createBuffer()
      const spriteBuffer = gl.createBuffer()
      if (!fullscreenBuffer || !spriteBuffer) throw new Error('Unable to create WebGL buffers.')
      const mossTexture = createTexture(gl, 0, gl.REPEAT)
      const atlasTexture = createTexture(gl, 1, gl.CLAMP_TO_EDGE)
      const seamTexture = createTexture(gl, 2, gl.CLAMP_TO_EDGE)
      // Manifest atlasRect coordinates are top-left image pixels. Keep the
      // upload in that coordinate convention so transparent fragment bounds
      // sample their approved RGBA pixels rather than the empty mirrored row.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, mossTexture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, moss)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, seamTexture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, seams)
      gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW)
      this.resources = {
        gl,
        mossProgram,
        spriteProgram,
        fullscreenBuffer,
        spriteBuffer,
        mossTexture,
        atlasTexture,
        seamTexture,
        mossPosition: gl.getAttribLocation(mossProgram, 'aPosition'),
        mossUniforms: {
          moss: requireUniform(gl, mossProgram, 'uMoss'),
          camera: requireUniform(gl, mossProgram, 'uCamera'),
          logicalSize: requireUniform(gl, mossProgram, 'uLogicalSize'),
          textureSize: requireUniform(gl, mossProgram, 'uMossTextureSize'),
        },
        spriteAttributes: {
          worldPosition: gl.getAttribLocation(spriteProgram, 'aWorldPosition'),
          textureUv: gl.getAttribLocation(spriteProgram, 'aTextureUv'),
        },
        spriteUniforms: {
          texture: requireUniform(gl, spriteProgram, 'uTexture'),
          camera: requireUniform(gl, spriteProgram, 'uCamera'),
          logicalSize: requireUniform(gl, spriteProgram, 'uLogicalSize'),
        },
      }
      this.unavailable = false
      this.initializing = false
      this.setMode('webgl')
    } catch {
      this.resources = undefined
      this.initializing = false
      this.unavailable = true
      this.setMode('fallback')
    }
  }

  private draw({ state, camera }: FirstDungeonStoneMossWebGlFloorInput) {
    const resources = this.resources
    if (!resources) return
    const { gl } = resources
    const manifest = FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1
    const fragmentById = new Map(manifest.fragments.map((fragment) => [fragment.id, fragment]))
    const clusters = getFirstDungeonStoneFragmentClusterPlan(state.battlefield.seed, camera)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.BLEND)
    gl.useProgram(resources.mossProgram)
    gl.bindBuffer(gl.ARRAY_BUFFER, resources.fullscreenBuffer)
    gl.enableVertexAttribArray(resources.mossPosition)
    gl.vertexAttribPointer(resources.mossPosition, 2, gl.FLOAT, false, 0, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, resources.mossTexture)
    gl.uniform1i(resources.mossUniforms.moss, 0)
    gl.uniform2f(resources.mossUniforms.camera, camera.x, camera.y)
    gl.uniform2f(resources.mossUniforms.logicalSize, WORLD_WIDTH, WORLD_HEIGHT)
    gl.uniform2f(resources.mossUniforms.textureSize, manifest.moss.width, manifest.moss.height)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(resources.spriteProgram)
    gl.bindBuffer(gl.ARRAY_BUFFER, resources.spriteBuffer)
    gl.enableVertexAttribArray(resources.spriteAttributes.worldPosition)
    gl.enableVertexAttribArray(resources.spriteAttributes.textureUv)
    gl.vertexAttribPointer(resources.spriteAttributes.worldPosition, 2, gl.FLOAT, false, 16, 0)
    gl.vertexAttribPointer(resources.spriteAttributes.textureUv, 2, gl.FLOAT, false, 16, 8)
    gl.uniform2f(resources.spriteUniforms.camera, camera.x, camera.y)
    gl.uniform2f(resources.spriteUniforms.logicalSize, WORLD_WIDTH, WORLD_HEIGHT)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, resources.atlasTexture)
    gl.uniform1i(resources.spriteUniforms.texture, 1)
    clusters.forEach((cluster) => {
      cluster.layout.placements.forEach((placement) => {
        const fragment = fragmentById.get(placement.fragmentId)
        if (!fragment) return
        const anchorX = cluster.origin.x + placement.localPosition.x + fragment.anchor.x
        const anchorY = cluster.origin.y + placement.localPosition.y + fragment.anchor.y
        const u0 = fragment.atlasRect.x / manifest.atlas.width
        const v0 = fragment.atlasRect.y / manifest.atlas.height
        const u1 = (fragment.atlasRect.x + fragment.atlasRect.width) / manifest.atlas.width
        const v1 = (fragment.atlasRect.y + fragment.atlasRect.height) / manifest.atlas.height
        gl.bufferData(gl.ARRAY_BUFFER, createFragmentQuadVertices(
          anchorX,
          anchorY,
          fragment.sourcePixelSize.width,
          fragment.sourcePixelSize.height,
          fragment.anchor.x,
          fragment.anchor.y,
          placement.rotationDegrees,
          u0,
          v0,
          u1,
          v1,
        ), gl.STREAM_DRAW)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
      })
    })

    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, resources.seamTexture)
    gl.uniform1i(resources.spriteUniforms.texture, 2)
    clusters.forEach((cluster) => {
      const x = cluster.origin.x - cluster.layout.boundary.x
      const y = cluster.origin.y - cluster.layout.boundary.y
      gl.bufferData(gl.ARRAY_BUFFER, createQuadVertices(x, y, manifest.sharedSeams.width, manifest.sharedSeams.height, 0, 0, 1, 1), gl.STREAM_DRAW)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    })
    gl.disable(gl.BLEND)
  }
}
