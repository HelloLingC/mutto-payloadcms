import { CollectionConfig } from 'payload'
import { asmrResourcesReadAccess } from '../access/checkVisibility'

export const AsmrResources: CollectionConfig = {
  slug: 'asmr-resources',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: asmrResourcesReadAccess,
  },
  fields: [
    // Basic info
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
    },
    {
      name: 'info',
      type: 'textarea',
    },
    {
      name: 'price',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'public',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'If unchecked, this ASMR resource will not be visible on the public site',
      },
    },
    // Cover image
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'image',
      required: false,
    },

    // Gallery images
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'image',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
        },
      ],
    },

    // Multiple audio tracks
    {
      name: 'audios',
      type: 'array',
      fields: [
        {
          name: 'order',
          type: 'number',
          required: true,
          admin: {
            description: 'Track order (1, 2, 3 ...)',
          },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'audioFile',
          type: 'upload',
          relationTo: 'audio',
          required: true,
        },
        {
          name: 'duration',
          type: 'number',
          admin: {
            description: 'Duration in seconds (optional)',
          },
        },
      ],
    },

    // Subtitle files
    {
      name: 'subtitles',
      type: 'array',
      fields: [
        {
          name: 'language',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g. jp / en / zh',
          },
        },
        {
          name: 'subtitleFile',
          type: 'upload',
          relationTo: 'subtitle',
          required: true,
        },
      ],
    },

    // Tags / categories
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },
  ],
}
