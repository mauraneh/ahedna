// PostgreSQL Database Connection
const { Pool } = require('pg');

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
    max: 20,
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

const pool = new Pool(createPoolConfig());

// Initialize database schema
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'membre' CHECK (role IN ('membre', 'auteur', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
      ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
      ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS city VARCHAR(120),
      ADD COLUMN IF NOT EXISTS country VARCHAR(120),
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS membership_number VARCHAR(50);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
        start_date DATE,
        end_date DATE,
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE memberships
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS news (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        author_id UUID REFERENCES users(id),
        published BOOLEAN DEFAULT false,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date TIMESTAMP NOT NULL,
        location VARCHAR(255),
        type VARCHAR(50) CHECK (type IN ('upcoming', 'past')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS gallery_enabled BOOLEAN DEFAULT false;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS event_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        photo_url TEXT NOT NULL,
        description TEXT,
        uploaded_by UUID REFERENCES users(id),
        validated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE event_photos
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        photo_url TEXT NOT NULL,
        description TEXT,
        uploaded_by UUID REFERENCES users(id),
        validated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id UUID REFERENCES users(id),
        validated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        author_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS history_chapters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        chapter_order INTEGER NOT NULL,
        year_start INTEGER,
        year_end INTEGER,
        media_urls JSONB,
        coordinates JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS member_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(120) UNIQUE NOT NULL,
        file_url TEXT NOT NULL,
        minimum_role VARCHAR(20) DEFAULT 'membre' CHECK (minimum_role IN ('membre', 'auteur', 'admin')),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_news_published ON news(published);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_events_gallery_enabled ON events(gallery_enabled, event_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_forum_topics_validated ON forum_topics(validated);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_gallery_validated ON gallery_photos(validated);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_event_photos_event_validated ON event_photos(event_id, validated, created_at);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_member_documents_role ON member_documents(minimum_role, is_active, sort_order);');

    await client.query(`
      INSERT INTO member_documents (slug, file_url, minimum_role, sort_order)
      VALUES
        ('member-guide', '/documents/member-guide.txt', 'membre', 1),
        ('association-charter', '/documents/association-charter.txt', 'membre', 2),
        ('content-kit', '/documents/content-kit.txt', 'auteur', 3),
        ('admin-operations', '/documents/admin-operations.txt', 'admin', 4)
      ON CONFLICT (slug) DO UPDATE SET
        file_url = EXCLUDED.file_url,
        minimum_role = EXCLUDED.minimum_role,
        sort_order = EXCLUDED.sort_order,
        updated_at = CURRENT_TIMESTAMP;
    `);

    await client.query('COMMIT');
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function checkDatabaseHealth() {
  const startedAt = Date.now();

  try {
    await pool.query('SELECT 1 AS ok');

    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      message: 'Database connection successful',
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      message: error.message,
    };
  }
}

module.exports = {
  pool,
  initDatabase,
  checkDatabaseHealth,
};
