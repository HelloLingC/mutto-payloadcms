import { logoutOperation, type Endpoint, type PayloadRequest } from 'payload'

import { Users } from '@/collections/Users'

const USERS_COLLECTION = Users.slug as 'users'

type RegisterBody = {
  email?: string
  name?: string
  password?: string
}

type LoginBody = {
  email?: string
  password?: string
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

const getAuthCookieOptions = (req: PayloadRequest) => {
  const collection = req.payload.collections[USERS_COLLECTION]
  const authConfig = collection?.config.auth
  const cookieName = `${req.payload.config.cookiePrefix}-token`
  const sameSite =
    typeof authConfig?.cookies.sameSite === 'string'
      ? authConfig.cookies.sameSite
      : authConfig?.cookies.sameSite
        ? 'Strict'
        : 'Lax'

  return {
    cookieName,
    domain: authConfig?.cookies.domain,
    sameSite,
    secure: Boolean(authConfig?.cookies.secure ?? process.env.NODE_ENV === 'production'),
    tokenExpiration: authConfig?.tokenExpiration ?? 7200,
  }
}

const buildAuthCookie = ({
  exp,
  req,
  token,
}: {
  exp?: number
  req: PayloadRequest
  token: string
}): string => {
  const options = getAuthCookieOptions(req)
  const maxAgeFromExp =
    typeof exp === 'number' ? Math.max(exp - Math.floor(Date.now() / 1000), 0) : undefined
  const maxAge = maxAgeFromExp ?? options.tokenExpiration

  const parts = [
    `${options.cookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAge}`,
    `SameSite=${options.sameSite}`,
  ]

  if (options.domain) {
    parts.push(`Domain=${options.domain}`)
  }

  if (options.secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

const buildExpiredAuthCookie = (req: PayloadRequest): string => {
  const options = getAuthCookieOptions(req)
  const parts = [
    `${options.cookieName}=`,
    'Path=/',
    'HttpOnly',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0',
    `SameSite=${options.sameSite}`,
  ]

  if (options.domain) {
    parts.push(`Domain=${options.domain}`)
  }

  if (options.secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const loginEndpoint: Endpoint = {
  handler: async (req) => {
    const body = await readJSON<LoginBody>(req)
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return jsonError(400, 'Email and password are required')
    }

    try {
      const result = await req.payload.login({
        collection: USERS_COLLECTION,
        data: { email, password },
        overrideAccess: false,
        req,
      })

      if (!result.token) {
        return jsonError(500, 'Login failed')
      }

      const headers = new Headers()
      headers.set('Set-Cookie', buildAuthCookie({ exp: result.exp, req, token: result.token }))

      return jsonSuccess(result.user, { headers })
    } catch {
      return jsonError(401, 'Login failed')
    }
  },
  method: 'post',
  path: '/auth/login',
}

const registerEndpoint: Endpoint = {
  handler: async (req) => {
    const body = await readJSON<RegisterBody>(req)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!email || !isValidEmail(email)) {
      return jsonError(400, 'Invalid email address')
    }

    if (password.length < 8) {
      return jsonError(400, 'Password must be at least 8 characters')
    }

    const nickname = name || email.split('@')[0] || 'user'

    try {
      await req.payload.create({
        collection: USERS_COLLECTION,
        data: {
          email,
          isVerified: false,
          nickname,
          password,
          role: 'free',
        },
        overrideAccess: false,
        req,
      })

      const loginResult = await req.payload.login({
        collection: USERS_COLLECTION,
        data: { email, password },
        overrideAccess: false,
        req,
      })

      if (!loginResult.token) {
        return jsonError(500, 'Registration failed')
      }

      const headers = new Headers()
      headers.set(
        'Set-Cookie',
        buildAuthCookie({ exp: loginResult.exp, req, token: loginResult.token }),
      )

      return jsonSuccess({ user: loginResult.user }, { headers, status: 201 })
    } catch (error) {
      if (isDuplicateError(error)) {
        return jsonError(409, 'Email already exists')
      }

      return jsonError(500, 'Registration failed')
    }
  },
  method: 'post',
  path: '/auth/register',
}

const meEndpoint: Endpoint = {
  handler: async (req) => {
    const authResult = await req.payload.auth({
      canSetHeaders: true,
      headers: req.headers,
      req,
    })

    if (!authResult.user) {
      return jsonError(401, 'Unauthorized')
    }

    return jsonSuccess(authResult.user, {
      headers: authResult.responseHeaders,
    })
  },
  method: 'get',
  path: '/auth/me',
}

const logoutEndpoint: Endpoint = {
  handler: async (req) => {
    const collection = req.payload.collections[USERS_COLLECTION]

    if (collection) {
      try {
        await logoutOperation({ collection, req })
      } catch {
        // Always continue so cookie can still be cleared
      }
    }

    const headers = new Headers()
    headers.set('Set-Cookie', buildExpiredAuthCookie(req))

    return jsonSuccess({ message: 'Logged out successfully' }, { headers })
  },
  method: 'post',
  path: '/auth/logout',
}

export const authEndpoints: Endpoint[] = [
  loginEndpoint,
  registerEndpoint,
  meEndpoint,
  logoutEndpoint,
]
