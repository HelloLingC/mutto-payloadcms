import type { Access, FieldAccess } from 'payload'

/**
 * Field-level access for sensitive content (audios, subtitles)
 * Check if user's role is in the resource's visibility array
 */
export const sensitiveFieldAccess: FieldAccess = ({ req, doc }) => {
  const user = req.user
  const visibility = doc?.visibility as string[] | undefined

  // Admin can always access
  if (user?.role === 'admin') return true

  // If no visibility set, treat as public
  if (!visibility || visibility.length === 0) return true

  // If 'free' is in visibility, everyone can access
  if (visibility.includes('free')) return true

  // Check if user's role is in the visibility array
  return user?.role ? visibility.includes(user.role) : false
}

export const serverAccess: Access = ({ req }) => {
  const serverToken = req.headers.get('x-server-token')
  if (!serverToken) return false
  return serverToken == process.env.SERVER_AUTH_TOKEN
}
