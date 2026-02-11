import type { Endpoint, PayloadRequest } from 'payload'
import path from 'path'
import { createRequire } from 'module'

import type { AsmrResource, User } from '@/payload-types'

const USERS_COLLECTION = 'users' as const
const ASMR_RESOURCES_COLLECTION = 'asmr-resources' as const

type AwsModules = {
  GetObjectCommand: new (input: { Bucket: string; Key: string }) => unknown
  S3Client: new (config: {
    credentials: { accessKeyId: string; secretAccessKey: string }
    endpoint: string
    region: string
  }) => unknown
  getSignedUrl: (client: unknown, command: unknown, options: { expiresIn: number }) => Promise<string>
}

let awsModulesPromise: AwsModules | Promise<AwsModules> | null = null

const getRouteParam = (req: PayloadRequest, key: string): null | string => {
  const routeParams = req.routeParams as Record<string, unknown> | undefined
  const value = routeParams?.[key]

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const getRelationId = (relation: unknown): null | number => {
  if (typeof relation === 'string') {
    const parsed = Number(relation)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (typeof relation === 'number') {
    return relation
  }

  if (relation && typeof relation === 'object' && 'id' in relation) {
    const value = (relation as { id?: unknown }).id
    if (typeof value === 'number') {
      return value
    }
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
  }

  return null
}

const isNotFoundError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const withStatus = error as { status?: number; statusCode?: number }
  if (withStatus.status === 404 || withStatus.statusCode === 404) {
    return true
  }

  if (error instanceof Error) {
    return error.message.includes('not found') || error.message.includes('404')
  }

  return false
}

const getAudioFilename = (audioFile: unknown): null | string => {
  if (typeof audioFile !== 'object' || audioFile === null) {
    return null
  }

  const filename = (audioFile as { filename?: unknown }).filename
  return typeof filename === 'string' && filename.length > 0 ? filename : null
}

const getQueryString = (req: PayloadRequest, key: string): null | string => {
  const valueFromSearchParams = req.searchParams.get(key)
  if (typeof valueFromSearchParams === 'string' && valueFromSearchParams.length > 0) {
    return valueFromSearchParams
  }

  const query = (req.query as Record<string, unknown> | undefined) ?? {}
  const valueFromQuery = query[key]
  return typeof valueFromQuery === 'string' && valueFromQuery.length > 0 ? valueFromQuery : null
}

const mediaAudioError = (status: number, code: string, message: string): Response => {
  return Response.json(
    {
      error: { code, message },
      success: false,
    },
    { status },
  )
}

const loadAwsModules = async (): Promise<AwsModules> => {
  if (awsModulesPromise) {
    return awsModulesPromise
  }

  awsModulesPromise = (async () => {
    const require = createRequire(import.meta.url)
    const storageS3Entry = require.resolve('@payloadcms/storage-s3')
    const storageS3Dir = path.dirname(storageS3Entry)

    const clientS3Path = require.resolve('@aws-sdk/client-s3', { paths: [storageS3Dir] })
    const presignerPath = require.resolve('@aws-sdk/s3-request-presigner', { paths: [storageS3Dir] })

    const [clientS3Module, presignerModule] = await Promise.all([
      import(clientS3Path),
      import(presignerPath),
    ])

    return {
      GetObjectCommand: clientS3Module.GetObjectCommand as AwsModules['GetObjectCommand'],
      S3Client: clientS3Module.S3Client as AwsModules['S3Client'],
      getSignedUrl: presignerModule.getSignedUrl as AwsModules['getSignedUrl'],
    }
  })()

  return awsModulesPromise
}

const mediaAudioEndpoint: Endpoint = {
  handler: async (req) => {
    try {
      const authResult = await req.payload.auth({
        canSetHeaders: true,
        headers: req.headers,
        req,
      })

      if (!authResult.user) {
        return mediaAudioError(401, 'UNAUTHORIZED', 'Authentication required')
      }

      const asmrID = getRouteParam(req, 'id')
      if (!asmrID) {
        return mediaAudioError(400, 'BAD_REQUEST', 'Resource ID is required')
      }

      const filename = getQueryString(req, 'filename')
      if (!filename) {
        return mediaAudioError(400, 'BAD_REQUEST', 'Filename parameter is required')
      }

      let asmr: AsmrResource
      try {
        asmr = await req.payload.findByID({
          collection: ASMR_RESOURCES_COLLECTION,
          depth: 1,
          id: asmrID,
          overrideAccess: false,
          req,
        })
      } catch (error) {
        if (isNotFoundError(error)) {
          return mediaAudioError(404, 'NOT_FOUND', 'ASMR resource not found')
        }
        return mediaAudioError(500, 'SERVER_ERROR', 'Failed to generate audio URL')
      }

      let currentUser: User
      try {
        currentUser = await req.payload.findByID({
          collection: USERS_COLLECTION,
          id: authResult.user.id,
          overrideAccess: false,
          req,
          user: authResult.user,
        })
      } catch {
        return mediaAudioError(401, 'UNAUTHORIZED', 'Authentication required')
      }

      const isAdmin = currentUser.role === 'admin'
      const isFreeResource = (asmr.price ?? 0) === 0
      const ownedResourceIDs = new Set(
        (Array.isArray(currentUser.ownedAsmrResources) ? currentUser.ownedAsmrResources : [])
          .map((owned) => getRelationId(owned))
          .filter((id): id is number => id !== null),
      )

      if (!isAdmin && !isFreeResource && !ownedResourceIDs.has(asmr.id)) {
        return mediaAudioError(403, 'FORBIDDEN', 'Access denied')
      }

      const audioItem = (Array.isArray(asmr.audios) ? asmr.audios : []).find((item) => {
        return getAudioFilename(item.audioFile) === filename
      })
      const audioFilename = audioItem ? getAudioFilename(audioItem.audioFile) : null

      if (!audioFilename) {
        return mediaAudioError(404, 'NOT_FOUND', 'Audio file not found')
      }

      const endpoint = process.env.R2_ENDPOINT
      const accessKeyId = process.env.R2_ACCESS_KEY_ID
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
      const bucket = process.env.R2_AUDIO_BUCKET || process.env.R2_BUCKET

      if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
        return mediaAudioError(500, 'SERVER_ERROR', 'Failed to generate audio URL')
      }

      const awsModules = await loadAwsModules()

      const s3Client = new awsModules.S3Client({
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint,
        region: 'auto',
      })

      const command = new awsModules.GetObjectCommand({
        Bucket: bucket,
        Key: audioFilename,
      })

      const url = await awsModules.getSignedUrl(s3Client, command, { expiresIn: 300 })

      return Response.json(
        { success: true, url },
        {
          headers: authResult.responseHeaders,
          status: 200,
        },
      )
    } catch {
      return mediaAudioError(500, 'SERVER_ERROR', 'Failed to generate audio URL')
    }
  },
  method: 'get',
  path: '/media/audio/:id',
}

export const mediaAudioEndpoints: Endpoint[] = [mediaAudioEndpoint]
