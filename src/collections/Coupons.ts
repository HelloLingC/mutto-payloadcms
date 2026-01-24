// collections/Coupons.ts
import { CollectionConfig } from 'payload'

export const Coupons: CollectionConfig = {
  slug: 'coupons',
  admin: {
    useAsTitle: 'code',
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'value',
      type: 'number',
      required: true,
      defaultValue: 10,
    },
    {
      name: 'used',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'expiresAt',
      type: 'date',
    },
    {
      name: 'batchId', // 用于标识哪一批生成的
      type: 'text',
    },
    {
      name: 'resumedBy',
      type: 'relationship',
      relationTo: 'users',
    },
  ],
}
