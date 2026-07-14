import { isAdminUser, never } from '../lib/access.js';
import { deletePublicUserAccount, updatePublicUserFromPayload } from '../lib/operationalSync.js';

export const AppUsers = {
  slug: 'app-users',
  labels: {
    singular: 'Utilisateur du site',
    plural: 'Utilisateurs du site',
  },
  access: {
    create: never,
    delete: isAdminUser,
    read: isAdminUser,
    update: isAdminUser,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'role', 'membershipNumber'],
    group: 'Administration',
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
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
    },
    {
      name: 'firstName',
      label: 'Prenom',
      type: 'text',
    },
    {
      name: 'lastName',
      label: 'Nom',
      type: 'text',
    },
    {
      name: 'role',
      label: 'Role',
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
      name: 'membershipNumber',
      label: "Numero d'adherent",
      type: 'text',
    },
    {
      name: 'phone',
      label: 'Telephone',
      type: 'text',
    },
    {
      name: 'city',
      label: 'Ville',
      type: 'text',
    },
    {
      name: 'createdAtPublic',
      label: 'Inscription',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc }) => {
        await updatePublicUserFromPayload(doc);
        return doc;
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        if (doc?.externalId) {
          await deletePublicUserAccount(doc.externalId);
        }
      },
    ],
  },
};
