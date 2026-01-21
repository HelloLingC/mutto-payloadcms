import { CollectionConfig } from 'payload'

export const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    useAsTitle: 'content',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'resource',
      type: 'relationship',
      relationTo: 'asmr-resources',
      required: true,
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'comments',
      admin: {
        description: 'Parent comment for nested replies',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
