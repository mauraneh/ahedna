import { isAdminUser, never } from '../lib/access.js';
import {
  deletePublicForumTopic,
  updatePublicForumTopicFromPayload,
} from '../lib/operationalSync.js';

export const ForumTopicsModeration = {
  slug: 'forum-topics-moderation',
  labels: {
    singular: 'Sujet forum',
    plural: 'Moderation forum',
  },
  access: {
    create: never,
    delete: isAdminUser,
    read: isAdminUser,
    update: isAdminUser,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'authorLabel', 'validated', 'createdAtPublic'],
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
      name: 'title',
      label: 'Titre',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      label: 'Message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'authorLabel',
      label: 'Auteur',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'validated',
      label: 'Valide',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'createdAtPublic',
      label: 'Creation',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc }) => {
        await updatePublicForumTopicFromPayload(doc);
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        if (doc?.externalId) {
          await deletePublicForumTopic(doc.externalId);
        }
      },
    ],
  },
};
