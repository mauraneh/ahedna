import { isAdminUser, normalizeSlug } from '../lib/access.js';
import {
  deleteSyncedMemberDocument,
  syncMemberDocument,
} from '../lib/publicSync.js';

export const MemberDocuments = {
  slug: 'member-documents',
  labels: {
    singular: 'Document adherent',
    plural: 'Documents adherents',
  },
  access: {
    create: isAdminUser,
    delete: isAdminUser,
    read: isAdminUser,
    update: isAdminUser,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'minimumRole', 'sortOrder', 'isActive'],
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
      name: 'slug',
      label: 'Slug',
      type: 'text',
      unique: true,
      required: true,
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => normalizeSlug(value || siblingData?.title),
        ],
      },
    },
    {
      name: 'file',
      label: 'Fichier',
      type: 'relationship',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'minimumRole',
      label: 'Role minimum',
      type: 'select',
      defaultValue: 'membre',
      options: [
        { label: 'Membre', value: 'membre' },
        { label: 'Auteur', value: 'auteur' },
        { label: 'Admin', value: 'admin' },
      ],
      required: true,
    },
    {
      name: 'sortOrder',
      label: 'Ordre',
      type: 'number',
      defaultValue: 0,
      required: true,
    },
    {
      name: 'isActive',
      label: 'Actif',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        await syncMemberDocument(req, doc);
        return doc;
      },
    ],
    afterDelete: [
      async ({ id }) => {
        await deleteSyncedMemberDocument(id);
      },
    ],
  },
};
