import { isAdminUser, never } from '../lib/access.js';
import {
  deletePublicGalleryPhoto,
  updatePublicGalleryPhotoFromPayload,
} from '../lib/operationalSync.js';

export const GalleryPhotosModeration = {
  slug: 'gallery-photos-moderation',
  labels: {
    singular: 'Photo galerie',
    plural: 'Photos galerie',
  },
  access: {
    create: never,
    delete: isAdminUser,
    read: isAdminUser,
    update: isAdminUser,
  },
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['description', 'uploaderLabel', 'validated', 'createdAtPublic'],
    group: 'Moderation',
  },
  fields: [
    {
      name: 'externalId',
      label: 'ID public',
      type: 'text',
      unique: true,
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'photoUrl',
      label: 'Photo',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
    },
    {
      name: 'uploaderLabel',
      label: 'Deposee par',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'validated',
      label: 'Validee',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'createdAtPublic',
      label: 'Depot',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc }) => {
        await updatePublicGalleryPhotoFromPayload(doc);
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        if (doc?.externalId) {
          await deletePublicGalleryPhoto(doc.externalId);
        }
      },
    ],
  },
};
