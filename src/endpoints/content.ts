import type { Endpoint, PayloadRequest, Where } from 'payload'

import type { AsmrResource, User } from '@/payload-types'

const USERS_COLLECTION = 'users' as const
const COUPONS_COLLECTION = 'coupons' as const
const ASMR_RESOURCES_COLLECTION = 'asmr-resources' as const

type GenerateCouponsBody = {
  batchId?: string
  count?: number
}

type PurchaseResponse = {
  resource: unknown
  transaction: {
    pointsDeducted: number
    purchaseTime: string
    remainingPoints: number
  }
  user: unknown
}

const isDuplicateError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('duplicate') ||
    message.includes('already exists') ||
    message.includes('unique')
  )
}

const readJSON = async <T>(req: PayloadRequest): Promise<Partial<T>> => {
  if (typeof req.json !== 'function') {
    return {}
  }

  try {
    return (await req.json()) as Partial<T>
  } catch {
    return {}
  }
}

const jsonSuccess = (data: unknown, init?: ResponseInit): Response => {
  const responseInit: ResponseInit = {
    status: 200,
    ...init,
  }

  return Response.json(
    {
      data,
      success: true,
    },
    responseInit,
  )
}

const jsonError = (status: number, message: string, details?: unknown): Response => {
  return Response.json(
    {
      details,
      message,
      success: false,
    },
    {
      status,
    },
  )
}

const getRouteParam = (req: PayloadRequest, key: string): null | string => {
  const routeParams = req.routeParams as Record<string, unknown> | undefined
  const value = routeParams?.[key]

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toPositiveInt = (value: unknown): number | undefined => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return undefined
  }

  const num = Math.trunc(parsed)
  if (num <= 0) {
    return undefined
  }

  return num
}

const toNumber = (value: unknown): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const toSort = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.length > 0 ? value : undefined
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

const generateCode = (length = 16): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let value = ''

  for (let i = 0; i < length; i++) {
    value += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return value.match(/.{1,4}/g)?.join('-') ?? value
}

const generateCouponsEndpoint: Endpoint = {
  handler: async (req) => {
    const body = await readJSON<GenerateCouponsBody>(req)
    const count = Number.isFinite(Number(body.count)) ? Math.trunc(Number(body.count)) : 10
    const batchId =
      typeof body.batchId === 'string' && body.batchId.trim().length > 0
        ? body.batchId.trim()
        : Date.now().toString()

    if (count < 1) {
      return jsonError(400, 'count must be at least 1')
    }

    if (count > 1000) {
      return jsonError(400, 'count cannot exceed 1000')
    }

    let generated = 0
    for (let i = 0; i < count; i++) {
      try {
        await req.payload.create({
          collection: COUPONS_COLLECTION,
          data: {
            batchId,
            code: generateCode(),
            used: false,
            value: 10,
          },
          overrideAccess: false,
          req,
        })
        generated++
      } catch (error) {
        if (!isDuplicateError(error)) {
          return jsonError(500, 'Failed to generate coupons')
        }
      }
    }

    return jsonSuccess({ batchId, generated })
  },
  method: 'post',
  path: '/generate-coupons',
}

const contentListEndpoint: Endpoint = {
  handler: async (req) => {
    try {
      const query = (req.query as Record<string, unknown> | undefined) ?? {}
      const page = toPositiveInt(query.page)
      const limit = toPositiveInt(query.limit)
      const depth = toNumber(query.depth)
      const sort = toSort(query.sort)
      const userWhere = query.where
      const publicWhere: Where = { public: { equals: true } }
      const where: Where =
        userWhere && typeof userWhere === 'object'
          ? {
              and: [userWhere as Where, publicWhere],
            }
          : publicWhere

      const result = await req.payload.find({
        collection: ASMR_RESOURCES_COLLECTION,
        depth,
        limit,
        overrideAccess: false,
        page,
        req,
        sort,
        where,
      })

      return jsonSuccess(result)
    } catch {
      return jsonError(502, 'PayloadCMS')
    }
  },
  method: 'get',
  path: '/content/list',
}

const contentDetailEndpoint: Endpoint = {
  handler: async (req) => {
    const resourceID = getRouteParam(req, 'id')
    if (!resourceID) {
      return jsonError(400, 'Resource ID is required')
    }

    try {
      const resource = await req.payload.findByID({
        collection: ASMR_RESOURCES_COLLECTION,
        depth: 1,
        id: resourceID,
        overrideAccess: false,
        req,
      })

      if (!resource.public) {
        return jsonError(404, 'Resource not found')
      }

      return jsonSuccess(resource)
    } catch (error) {
      if (isNotFoundError(error)) {
        return jsonError(404, 'Resource not found')
      }

      return jsonError(500, 'Failed to fetch resource')
    }
  },
  method: 'get',
  path: '/content/:id',
}

const contentPurchaseEndpoint: Endpoint = {
  handler: async (req) => {
    const resourceID = getRouteParam(req, 'id')
    if (!resourceID) {
      return jsonError(400, 'resourceId is required')
    }

    const authResult = await req.payload.auth({
      canSetHeaders: true,
      headers: req.headers,
      req,
    })

    if (!authResult.user) {
      return jsonError(401, 'Authentication required')
    }

    let resource: AsmrResource
    try {
      resource = await req.payload.findByID({
        collection: ASMR_RESOURCES_COLLECTION,
        depth: 1,
        id: resourceID,
        overrideAccess: false,
        req,
      })
    } catch (error) {
      if (isNotFoundError(error)) {
        return jsonError(404, 'ASMR resource not found')
      }

      return jsonError(500, 'Failed to complete purchase')
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
      return jsonError(401, 'Invalid authentication token')
    }

    const ownedAsmrRelations: unknown[] = Array.isArray(currentUser.ownedAsmrResources)
      ? currentUser.ownedAsmrResources
      : []
    const ownedResourceIds = new Set(
      ownedAsmrRelations
        .map((relation) => getRelationId(relation))
        .filter((id): id is number => id !== null),
    )

    if (ownedResourceIds.has(resource.id)) {
      return jsonError(409, 'You already own this ASMR resource')
    }

    const currentPoints = typeof currentUser.points === 'number' ? currentUser.points : 0
    const resourcePrice = typeof resource.price === 'number' ? resource.price : 0

    if (resourcePrice <= 0) {
      return jsonError(400, 'The resource is not allowed to purchase')
    }

    if (currentPoints < resourcePrice) {
      return jsonError(
        400,
        `You need ${resourcePrice} points to purchase this resource, but you only have ${currentPoints} points`,
      )
    }

    const newPointsTotal = currentPoints - resourcePrice
    const updatedOwnedResourceIds = [...ownedResourceIds, resource.id]

    let updatedUser: User
    try {
      updatedUser = await req.payload.update({
        collection: USERS_COLLECTION,
        data: {
          ownedAsmrResources: updatedOwnedResourceIds,
          points: newPointsTotal,
        },
        id: currentUser.id,
        overrideAccess: false,
        req,
        user: authResult.user,
      })
    } catch {
      return jsonError(500, 'Failed to complete purchase')
    }

    const transaction = {
      pointsDeducted: resourcePrice,
      purchaseTime: new Date().toISOString(),
      remainingPoints: typeof updatedUser.points === 'number' ? updatedUser.points : newPointsTotal,
    }

    const responseData: PurchaseResponse = {
      resource,
      transaction,
      user: updatedUser,
    }

    return jsonSuccess(responseData, {
      headers: authResult.responseHeaders,
      status: 201,
    })
  },
  method: 'post',
  path: '/content/purchase/:id',
}

export const contentEndpoints: Endpoint[] = [
  generateCouponsEndpoint,
  contentListEndpoint,
  contentPurchaseEndpoint,
  contentDetailEndpoint,
]
