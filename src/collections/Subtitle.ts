import { CollectionConfig } from 'payload'
import { mediaReadAccess } from '../access/checkVisibility'

export const Subtitle: CollectionConfig = {
  slug: 'subtitle',
  access: {
    // Block direct listing - only accessible through AsmrResources relation
    read: mediaReadAccess,
  },
  upload: {
    staticDir: 'subtitle',
    mimeTypes: [
      'text/vtt',
      'application/x-subrip', // .srt
    ],
  },
  fields: [
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
