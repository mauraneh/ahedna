import './loadEnv.js';
import pg from 'pg';

const { Pool } = pg;

function createPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const parsed = new URL(databaseUrl);
  const sslmode = parsed.searchParams.get('sslmode');
  const channelBinding = parsed.searchParams.get('channel_binding');

  const config = {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    database: parsed.pathname.replace(/^\//, ''),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  if (sslmode && sslmode !== 'disable') {
    config.ssl = {
      rejectUnauthorized: sslmode === 'verify-ca' || sslmode === 'verify-full',
    };
  } else {
    config.ssl = false;
  }

  if (channelBinding === 'require') {
    config.enableChannelBinding = true;
  }

  return config;
}

export const pool = new Pool(createPoolConfig());

let ensuredPublicSyncColumns = false;
let ensurePromise = null;

export async function ensurePublicSyncColumns() {
  if (ensuredPublicSyncColumns) {
    return;
  }

  if (ensurePromise) {
    await ensurePromise;
    return;
  }

  ensurePromise = (async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(`
        ALTER TABLE IF EXISTS news
        ADD COLUMN IF NOT EXISTS cms_source_id VARCHAR(64);
      `);
      await client.query(`
        ALTER TABLE IF EXISTS events
        ADD COLUMN IF NOT EXISTS cms_source_id VARCHAR(64);
      `);
      await client.query(`
        ALTER TABLE IF EXISTS member_documents
        ADD COLUMN IF NOT EXISTS cms_source_id VARCHAR(64);
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_news_cms_source_id
        ON news (cms_source_id)
        WHERE cms_source_id IS NOT NULL;
      `);
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_events_cms_source_id
        ON events (cms_source_id)
        WHERE cms_source_id IS NOT NULL;
      `);
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_member_documents_cms_source_id
        ON member_documents (cms_source_id)
        WHERE cms_source_id IS NOT NULL;
      `);

      await client.query('COMMIT');
      ensuredPublicSyncColumns = true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      ensurePromise = null;
    }
  })();

  await ensurePromise;
}
