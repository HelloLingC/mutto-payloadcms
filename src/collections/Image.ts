import { CollectionConfig } from 'payload'

export const Image: CollectionConfig = {
  slug: 'image',
  access: {
    read: () => true,
  },
  upload: {
    staticDir: 'image',
    mimeTypes: ['image/*'],
  },
  fields: [],
}
