export const Admins = {
  slug: 'admins',
  labels: {
    singular: 'Administrateur',
    plural: 'Administrateurs',
  },
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'role'],
    group: 'Administration',
  },
  fields: [
    {
      name: 'firstName',
      label: 'Prenom',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      label: 'Nom',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      defaultValue: 'admin',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editeur', value: 'editor' },
      ],
      required: true,
    },
  ],
};
