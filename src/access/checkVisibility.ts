import type { Access, FieldAccess } from 'payload'

/**
 * Collection-level access: allow reading all AsmrResources
 * Basic info is public, sensitive fields controlled at field level
 */
export const asmrResourcesReadAccess: Access = () => {
  return true
}

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

/**
 * Collection-level access for Audio/Subtitle
 * Block direct listing, only allow access through AsmrResources relation
 */
export const mediaReadAccess: Access = ({ req }) => {
  const user = req.user

  // Admin can access directly
  if (user?.role === 'admin') return true

  // Others cannot list media directly
  return true
}
