import { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    mimeTypes: [
      'audio/mpeg',
      'audio/mp3',
      'image/*',
      'text/vtt',
      'application/x-subrip', // .srt
    ],
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Audio', value: 'audio' },
        { label: 'Subtitle', value: 'subtitle' },
        { label: 'Image', value: 'image' },
      ],
      required: true,
    },
    {
      name: 'language',
      type: 'select',
      options: [
        { label: '简体中文', value: 'zh-cn'},
        { label: '日本语', value: 'jp'},
      ],
      admin: {
        description: 'For subtitles / audio language (jp, en, zh, etc.)',
      },
    },
  ],
}
