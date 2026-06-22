import { isAdminUser } from '../lib/access.js';

export const Media = {
  slug: 'media',
  labels: {
    singular: 'Media',
    plural: 'Medias',
  },
  access: {
    create: isAdminUser,
    delete: isAdminUser,
    read: isAdminUser,
    update: isAdminUser,
  },
  admin: {
    group: 'Contenus',
    defaultColumns: ['filename', 'alt', 'updatedAt'],
  },
  upload: {
    staticDir: 'media',
    mimeTypes: [
      'image/*',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  fields: [
    {
      name: 'alt',
      label: 'Texte alternatif',
      type: 'text',
    },
  ],
};
