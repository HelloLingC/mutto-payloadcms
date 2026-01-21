import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default
    {
      name: 'nickname',
      type: 'text',
      label: 'Nickname',
      required: true,
      unique: false,
      admin: {
        position: 'sidebar', // 可选：显示在侧边栏
      },
    },
    {
      name: 'isVerified',
      type: 'checkbox',
      label: 'isVerfied',
      required: true,
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'tier',
      type: 'select',
      label: 'Membership Tier',
      options: [
        { label: 'User', value: 'User' },
        { label: 'VIP1', value: 'VIP1' },
        { label: 'VIP2', value: 'VIP2' },
      ],
      defaultValue: 'User',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'points',
      type: 'number',
      label: 'Points',
      defaultValue: 0,
      min: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'playlist',
      type: 'relationship',
      relationTo: 'asmr-resources',
      hasMany: true,
      label: 'Playlist',
    },
  ],
}
