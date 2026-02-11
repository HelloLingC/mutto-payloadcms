import type { Endpoint, PayloadRequest } from 'payload'

const USERS_COLLECTION = 'users' as const

const GIFT_CARDS: Record<string, { description: string; points: number }> = {
  MEGA1000: { description: 'Mega bonus card', points: 1000 },
  PREMIUM500: { description: 'Premium bonus card', points: 500 },
  SPECIAL250: { description: 'Special offer card', points: 250 },
  WELCOME100: { description: 'Welcome bonus card', points: 100 },
}

type RedeemGiftCardBody = {
  code?: string
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

const redeemGiftCardEndpoint: Endpoint = {
  handler: async (req) => {
    try {
      const authResult = await req.payload.auth({
        canSetHeaders: true,
        headers: req.headers,
        req,
      })

      if (!authResult.user) {
        return jsonError(401, 'Authentication required')
      }

      const body = await readJSON<RedeemGiftCardBody>(req)
      const code = typeof body.code === 'string' ? body.code : ''

      if (!code.trim()) {
        return jsonError(400, 'Invalid gift card code')
      }

      const normalizedCode = code.toUpperCase().trim()
      const giftCard = GIFT_CARDS[normalizedCode]

      if (!giftCard) {
        return jsonError(404, 'Gift card not found')
      }

      const currentUser = await req.payload.findByID({
        collection: USERS_COLLECTION,
        id: authResult.user.id,
        overrideAccess: false,
        req,
        user: authResult.user,
      })

      const currentPoints = typeof currentUser.points === 'number' ? currentUser.points : 0
      const updatedPoints = currentPoints + giftCard.points

      await req.payload.update({
        collection: USERS_COLLECTION,
        data: {
          points: updatedPoints,
        },
        id: currentUser.id,
        overrideAccess: false,
        req,
        user: authResult.user,
      })

      return jsonSuccess(
        {
          giftCard: {
            code: normalizedCode,
            description: giftCard.description,
          },
          newBalance: updatedPoints,
          pointsAdded: giftCard.points,
        },
        {
          headers: authResult.responseHeaders,
        },
      )
    } catch {
      return jsonError(500, 'Internal server error')
    }
  },
  method: 'post',
  path: '/gift-cards/redeem',
}

export const giftCardsEndpoints: Endpoint[] = [redeemGiftCardEndpoint]
