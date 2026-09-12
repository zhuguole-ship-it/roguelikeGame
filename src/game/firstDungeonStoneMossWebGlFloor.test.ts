import { afterEach, describe, expect, it, vi } from 'vitest'

import { createInitialSnapshot } from './engine'
import { FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1 } from './firstDungeonStoneFragmentAssets'
import { getFirstDungeonStoneFragmentClusterPlan } from './firstDungeonStoneFragmentFloorPlan'
import { FirstDungeonStoneMossWebGlFloorRenderer } from './firstDungeonStoneMossWebGlFloor'

const createWebGl2Context = () => {
  const uniform = {} as WebGLUniformLocation
  const object = {}
  return {
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88E4,
    STREAM_DRAW: 0x88E0,
    TEXTURE0: 0x84C0,
    TEXTURE_2D: 0x0DE1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    NEAREST: 0x2600,
    REPEAT: 0x2901,
    CLAMP_TO_EDGE: 0x812F,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    UNPACK_FLIP_Y_WEBGL: 0x9240,
    COLOR_BUFFER_BIT: 0x4000,
    FLOAT: 0x1406,
    TRIANGLES: 0x0004,
    BLEND: 0x0BE2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    createShader: vi.fn(() => object as WebGLShader),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => object as WebGLProgram),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn(() => object as WebGLBuffer),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    createTexture: vi.fn(() => object as WebGLTexture),
    activeTexture: vi.fn(),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => uniform),
    pixelStorei: vi.fn(),
    texImage2D: vi.fn(),
    texImage3D: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    useProgram: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform1i: vi.fn(),
    uniform2f: vi.fn(),
    drawArrays: vi.fn(),
  } as unknown as WebGL2RenderingContext
}

class ImmediateImage {
  public complete = true
  public naturalWidth = 1024
  public naturalHeight = 1024
  public decoding = 'async'
  public onload: ((event: Event) => void) | null = null
  public onerror: ((event: Event | string) => void) | null = null
  private value = ''

  public get src() {
    return this.value
  }

  public set src(value: string) {
    this.value = value
    queueMicrotask(() => this.onload?.(new Event('load')))
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('FirstDungeonStoneMossWebGlFloorRenderer', () => {
  it('draws the frozen fragment atlas and each shared-seam layer exactly once per stable cluster', async () => {
    vi.stubGlobal('Image', ImmediateImage)
    const canvas = document.createElement('canvas')
    canvas.width = 960
    canvas.height = 640
    const gl = createWebGl2Context()
    vi.spyOn(canvas, 'getContext').mockImplementation((kind) => (
      kind === 'webgl2' ? gl : null
    ))
    const renderer = new FirstDungeonStoneMossWebGlFloorRenderer(canvas, vi.fn())
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.battlefield.mode = 'infinite'
    snapshot.battlefield.seed = 74_219
    const camera = { x: -512, y: 384 }
    const input = { active: true, state: snapshot, camera }

    expect(renderer.render(input)).toBe('fallback')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(renderer.getMode()).toBe('webgl')
    expect(canvas.dataset.groundMode).toBe('webgl')

    renderer.render(input)
    const clusters = getFirstDungeonStoneFragmentClusterPlan(snapshot.battlefield.seed, camera)
    const placementsPerCluster = FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1.clusters[0].placements.length
    expect(gl.drawArrays).toHaveBeenCalledTimes(1 + clusters.length * (placementsPerCluster + 1))
    expect(gl.texImage2D).toHaveBeenCalledTimes(3)
    expect(gl.texImage3D).not.toHaveBeenCalled()
    expect(gl.pixelStorei).toHaveBeenCalledWith(gl.UNPACK_FLIP_Y_WEBGL, false)
    expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    expect(gl.blendFunc).toHaveBeenCalledWith(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, expect.any(Float32Array), gl.STREAM_DRAW)

    const shaderSources = (gl.shaderSource as unknown as ReturnType<typeof vi.fn>).mock.calls
      .map(([, source]) => source as string)
    expect(shaderSources.some((source) => source.includes('texture(uMoss, world / uMossTextureSize)'))).toBe(true)
    expect(shaderSources.some((source) => source.includes('aWorldPosition') && source.includes('aTextureUv'))).toBe(true)
    expect(shaderSources.join('\n')).not.toContain('uStoneVariants')
    expect(shaderSources.join('\n')).not.toContain('uMaskGrid')
  })

  it('keeps infinite and boss-arena sampling identical and falls back when WebGL2 is unavailable or lost', () => {
    const camera = { x: 640, y: -384 }
    const snapshot = createInitialSnapshot('running')
    snapshot.battlefield.seed = 19_842
    snapshot.battlefield.mode = 'infinite'
    const boss = createInitialSnapshot('running')
    boss.level = 22
    boss.battlefield.seed = 19_842
    boss.battlefield.mode = 'boss-arena'
    expect(getFirstDungeonStoneFragmentClusterPlan(snapshot.battlefield.seed, camera))
      .toEqual(getFirstDungeonStoneFragmentClusterPlan(boss.battlefield.seed, camera))

    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getContext').mockReturnValue(null)
    const renderer = new FirstDungeonStoneMossWebGlFloorRenderer(canvas, vi.fn())
    expect(renderer.render({ active: true, state: snapshot, camera })).toBe('fallback')
    expect(canvas.dataset.groundMode).toBe('fallback')
    expect(canvas.style.display).toBe('none')

    const contextLost = new Event('webglcontextlost', { cancelable: true })
    canvas.dispatchEvent(contextLost)
    expect(contextLost.defaultPrevented).toBe(true)
    expect(renderer.getMode()).toBe('fallback')
    expect(renderer.render({ active: false, state: snapshot, camera })).toBe('inactive')
  })
})
