import { CollectionConfig } from 'payload'
import { mediaReadAccess } from '../access/checkVisibility'

export const Audio: CollectionConfig = {
  slug: 'audio',
  access: {
    // Block direct listing - only accessible through AsmrResources relation
    read: mediaReadAccess,
  },
  upload: {
    staticDir: 'audio',
    mimeTypes: ['audio/mpeg', 'audio/mp3'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'language',
      type: 'select',
      options: [
        { label: '简体中文', value: 'zh-cn' },
        { label: '日本语', value: 'jp' },
      ],
    },
  ],
}
