import { mediaReadAccess } from '@/access/checkVisibility'
import { CollectionConfig } from 'payload'

export const Image: CollectionConfig = {
  slug: 'image',
  access: {
    // Block direct listing - only accessible through AsmrResources relation
    read: mediaReadAccess,
  },
  upload: {
    staticDir: 'image',
    mimeTypes: ['image/*'],
  },
  fields: [],
}
