import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

const developerAssetOutputDir = path.resolve(process.cwd(), 'public/assets/developer-assets')
const developerAssetConfigPath = path.join(developerAssetOutputDir, 'runtime-asset-overrides.json')

const sanitizePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'asset'

const extensionForMimeType = (mimeType: string) => {
  if (mimeType === 'image/webp') {
    return 'webp'
  }
  if (mimeType === 'image/jpeg') {
    return 'jpg'
  }
  return 'png'
}

const readRequestBody = (request: import('node:http').IncomingMessage) => new Promise<string>((resolve, reject) => {
  const chunks: Buffer[] = []
  request.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
  request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  request.on('error', reject)
})

const persistFrameUrl = async (
  frameUrl: string,
  entityId: string,
  slot: string,
  frameIndex: number,
) => {
  if (!frameUrl.startsWith('data:image/')) {
    return frameUrl.startsWith('/roguelikeGame/')
      ? frameUrl.replace(/^\/roguelikeGame\//, '')
      : frameUrl
  }

  const match = /^data:(image\/(?:png|webp|jpeg));base64,(.+)$/i.exec(frameUrl)
  if (!match) {
    return frameUrl
  }

  const [, mimeType, base64] = match
  const entityDir = sanitizePathSegment(entityId)
  const slotDir = sanitizePathSegment(slot)
  const extension = extensionForMimeType(mimeType)
  const relativePath = `assets/developer-assets/${entityDir}/${slotDir}/frame_${String(frameIndex + 1).padStart(2, '0')}.${extension}`
  const absolutePath = path.resolve(process.cwd(), 'public', relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, Buffer.from(base64, 'base64'))
  return relativePath
}

const listPersistedFrameUrls = async (entityId: string, slot: string) => {
  const entityDir = sanitizePathSegment(entityId)
  const slotDir = sanitizePathSegment(slot)
  const relativeDir = `assets/developer-assets/${entityDir}/${slotDir}`
  const absoluteDir = path.resolve(process.cwd(), 'public', relativeDir)
  try {
    const files = await readdir(absoluteDir)
    return files
      .filter((file) => /^frame_\d+\.(png|webp|jpe?g)$/i.test(file))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
      .map((file) => `${relativeDir}/${file}`)
  } catch {
    return []
  }
}

const mergePersistedFrames = (configuredFrameUrls: string[], persistedFrameUrls: string[]) => {
  const merged = [...configuredFrameUrls]
  persistedFrameUrls.forEach((frameUrl, index) => {
    if (!merged[index]) {
      merged[index] = frameUrl
      return
    }
    if (!merged.includes(frameUrl)) {
      merged.push(frameUrl)
    }
  })
  return merged
}

const persistDeveloperAssetConfig = async (rawConfig: any) => {
  const entities = await Promise.all((rawConfig.entities ?? []).map(async (entity: any) => {
    const entityId = String(entity.entityId ?? 'unknown')
    const actions = await Promise.all((entity.actions ?? []).map(async (action: any) => {
      const slot = String(action.slot ?? action.combatAction ?? 'action')
      const sourceFrameUrls = Array.isArray(action.frameUrls) ? action.frameUrls : []
      const configuredFrameUrls = await Promise.all(sourceFrameUrls.map((frameUrl: string, frameIndex: number) => (
        persistFrameUrl(String(frameUrl ?? ''), entityId, slot, frameIndex)
      )))
      const persistedFrameUrls = await listPersistedFrameUrls(entityId, slot)
      const frameUrls = mergePersistedFrames(configuredFrameUrls, persistedFrameUrls)
      const guideIndex = sourceFrameUrls.findIndex((frameUrl: string) => frameUrl && frameUrl === action.guideFrame)
      const guideFrame = guideIndex >= 0
        ? frameUrls[guideIndex]
        : action.guideFrame
          ? await persistFrameUrl(String(action.guideFrame), entityId, slot, 0)
          : frameUrls.find(Boolean)

      return {
        ...action,
        entityId,
        slot,
        frameUrls,
        guideFrame,
        assetPath: frameUrls.filter(Boolean).join(' / ') || action.assetPath,
      }
    }))
    return { entityId, actions }
  }))

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    entities,
  }
}

const developerAssetPersistencePlugin = (): Plugin => ({
  name: 'roguelike-developer-asset-persistence',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__roguelike-asset-config', async (request, response, next) => {
      try {
        if (request.method === 'GET') {
          try {
            const config = await readFile(developerAssetConfigPath, 'utf8')
            response.statusCode = 200
            response.setHeader('Content-Type', 'application/json')
            response.end(config)
          } catch {
            response.statusCode = 404
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify({ error: 'no developer asset config' }))
          }
          return
        }

        if (request.method !== 'POST') {
          next()
          return
        }

        const body = await readRequestBody(request)
        const config = await persistDeveloperAssetConfig(JSON.parse(body))
        await mkdir(developerAssetOutputDir, { recursive: true })
        await writeFile(developerAssetConfigPath, `${JSON.stringify(config, null, 2)}\n`)
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ config }))
      } catch (error) {
        response.statusCode = 500
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'asset persistence failed' }))
      }
    })
  },
})

export default defineConfig({
  base: '/roguelikeGame/',
  plugins: [react(), developerAssetPersistencePlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react'
          }
          if (id.includes('/node_modules/zustand/')) {
            return 'state'
          }
          if (id.includes('/node_modules/lucide-react/')) {
            return 'icons'
          }
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    fileParallelism: false,
    maxWorkers: 1,
  },
})
