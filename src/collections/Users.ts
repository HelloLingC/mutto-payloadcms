import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    read: () => true,
    update: () => true,
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
      name: 'role',
      type: 'select',
      label: 'Membership Tier',
      options: [
        { label: 'User', value: 'free' },
        { label: 'Premium', value: 'premium' },
        { label: 'admin', value: 'admin' },
      ],
      defaultValue: 'free',
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
    {
      name: 'ownedAsmrResources',
      type: 'relationship',
      relationTo: 'asmr-resources',
      hasMany: true,
      label: 'Owned ASMR Resources',
      admin: {
        description: 'ASMR resources that the user has paid for and owns',
        position: 'sidebar',
      },
    },
  ],
}
