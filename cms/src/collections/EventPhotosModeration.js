import { isAdminUser, never } from '../lib/access.js';
import {
  deletePublicEventPhoto,
  updatePublicEventPhotoFromPayload,
} from '../lib/operationalSync.js';

export const EventPhotosModeration = {
  slug: 'event-photos-moderation',
  labels: {
    singular: 'Photo evenement',
    plural: 'Photos evenement',
  },
  access: {
    create: never,
    delete: isAdminUser,
    read: isAdminUser,
    update: isAdminUser,
  },
  admin: {
    useAsTitle: 'eventTitle',
    defaultColumns: ['eventTitle', 'uploaderLabel', 'validated', 'createdAtPublic'],
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
      name: 'eventTitle',
      label: 'Evenement',
      type: 'text',
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
        await updatePublicEventPhotoFromPayload(doc);
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        if (doc?.externalId) {
          await deletePublicEventPhoto(doc.externalId);
        }
      },
    ],
  },
};
