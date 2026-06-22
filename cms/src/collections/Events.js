import { isAdminUser } from '../lib/access.js';
import { deleteSyncedEvent, syncEvent } from '../lib/publicSync.js';

export const Events = {
  slug: 'events',
  labels: {
    singular: 'Evenement',
    plural: 'Evenements',
  },
  access: {
    create: isAdminUser,
    delete: isAdminUser,
    read: isAdminUser,
    update: isAdminUser,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'eventDate', 'type', 'galleryEnabled'],
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
      name: 'description',
      label: 'Description',
      type: 'textarea',
    },
    {
      name: 'eventDate',
      label: 'Date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'location',
      label: 'Lieu',
      type: 'text',
    },
    {
      name: 'coverImage',
      label: 'Image',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      defaultValue: 'upcoming',
      options: [
        { label: 'A venir', value: 'upcoming' },
        { label: 'Passe', value: 'past' },
      ],
      required: true,
    },
    {
      name: 'galleryEnabled',
      label: 'Activer la galerie associee',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        await syncEvent(req, doc);
        return doc;
      },
    ],
    afterDelete: [
      async ({ id }) => {
        await deleteSyncedEvent(id);
      },
    ],
  },
};
