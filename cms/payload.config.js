import './src/lib/loadEnv.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { Admins } from './src/collections/Admins.js';
import { Articles } from './src/collections/Articles.js';
import { Events } from './src/collections/Events.js';
import { EventPhotosModeration } from './src/collections/EventPhotosModeration.js';
import { ForumTopicsModeration } from './src/collections/ForumTopicsModeration.js';
import { GalleryPhotosModeration } from './src/collections/GalleryPhotosModeration.js';
import { AppUsers } from './src/collections/AppUsers.js';
import { Media } from './src/collections/Media.js';
import { MemberDocuments } from './src/collections/MemberDocuments.js';
import { syncOperationalCollections } from './src/lib/operationalSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default buildConfig({
  admin: {
    user: 'admins',
    importMap: {
      baseDir: __dirname,
    },
    meta: {
      titleSuffix: 'AHEDNA Back Office',
      description: 'Back-office editorial AHEDNA',
    },
  },
  collections: [
    Admins,
    Media,
    Articles,
    Events,
    MemberDocuments,
    AppUsers,
    ForumTopicsModeration,
    EventPhotosModeration,
    GalleryPhotosModeration,
  ],
  editor: lexicalEditor({}),
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    schemaName: process.env.PAYLOAD_DB_SCHEMA || 'payload',
  }),
  secret: process.env.PAYLOAD_SECRET || 'payload-secret-change-me',
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:4000',
  csrf: [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
  ],
  onInit: async (payload) => {
    try {
      await syncOperationalCollections(payload);
    } catch (error) {
      payload.logger.warn(`Operational sync skipped: ${error.message}`);
    }
  },
});
