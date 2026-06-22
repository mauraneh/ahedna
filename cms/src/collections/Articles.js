import { isAdminUser } from '../lib/access.js';
import { deleteSyncedArticle, syncArticle } from '../lib/publicSync.js';

export const Articles = {
  slug: 'articles',
  labels: {
    singular: 'Actualite',
    plural: 'Actualites',
  },
  access: {
    create: isAdminUser,
    delete: isAdminUser,
    read: isAdminUser,
    update: isAdminUser,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'published', 'updatedAt'],
    group: 'Contenus',
  },
  fields: [
    {
      name: 'title',
      label: 'Titre',
      type: 'text',
      required: true,
    },
    {
      name: 'excerpt',
      label: 'Resume',
      type: 'textarea',
    },
    {
      name: 'content',
      label: 'Contenu',
      type: 'textarea',
      required: true,
    },
    {
      name: 'coverImage',
      label: 'Image',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'published',
      label: 'Publie',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        await syncArticle(req, doc);
        return doc;
      },
    ],
    afterDelete: [
      async ({ id }) => {
        await deleteSyncedArticle(id);
      },
    ],
  },
};
