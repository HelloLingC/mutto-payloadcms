import { CollectionConfig } from 'payload'

export const Subtitle: CollectionConfig = {
  slug: 'subtitle',
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
