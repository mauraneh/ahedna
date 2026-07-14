import { ensurePublicSyncColumns, pool } from './publicDb.js';

function getServerUrl() {
  return (
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.SERVER_URL ||
    'http://localhost:4000'
  ).replace(/\/+$/, '');
}

function toAbsoluteUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value.trim();
  }

  return `${getServerUrl()}${value.startsWith('/') ? value : `/${value}`}`;
}

async function resolveMediaDoc(req, value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && value?.url) {
    return value;
  }

  if (typeof value !== 'string' || !req?.payload?.findByID) {
    return null;
  }

  try {
    return await req.payload.findByID({
      collection: 'media',
      id: value,
      depth: 0,
    });
  } catch {
    return null;
  }
}

async function resolveMediaUrl(req, value) {
  const mediaDoc = await resolveMediaDoc(req, value);
  return toAbsoluteUrl(mediaDoc?.url || null);
}

export async function syncArticle(req, doc) {
  await ensurePublicSyncColumns();

  const imageUrl = await resolveMediaUrl(req, doc.coverImage);

  await pool.query(
    `
      INSERT INTO news (cms_source_id, title, excerpt, content, published, image_url, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (cms_source_id) DO UPDATE SET
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        content = EXCLUDED.content,
        published = EXCLUDED.published,
        image_url = EXCLUDED.image_url,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      doc.id,
      doc.title,
      doc.excerpt || null,
      doc.content,
      Boolean(doc.published),
      imageUrl,
    ]
  );
}

export async function deleteSyncedArticle(cmsSourceId) {
  await ensurePublicSyncColumns();
  await pool.query('DELETE FROM news WHERE cms_source_id = $1', [cmsSourceId]);
}

export async function syncEvent(req, doc) {
  await ensurePublicSyncColumns();

  const imageUrl = await resolveMediaUrl(req, doc.coverImage);

  await pool.query(
    `
      INSERT INTO events (
        cms_source_id,
        title,
        description,
        event_date,
        location,
        image_url,
        type,
        gallery_enabled,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (cms_source_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        event_date = EXCLUDED.event_date,
        location = EXCLUDED.location,
        image_url = EXCLUDED.image_url,
        type = EXCLUDED.type,
        gallery_enabled = EXCLUDED.gallery_enabled,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      doc.id,
      doc.title,
      doc.description || null,
      doc.eventDate,
      doc.location || null,
      imageUrl,
      doc.type,
      Boolean(doc.galleryEnabled),
    ]
  );
}

export async function deleteSyncedEvent(cmsSourceId) {
  await ensurePublicSyncColumns();
  await pool.query('DELETE FROM events WHERE cms_source_id = $1', [cmsSourceId]);
}

export async function syncMemberDocument(req, doc) {
  await ensurePublicSyncColumns();

  const fileUrl = await resolveMediaUrl(req, doc.file);

  await pool.query(
    `
      INSERT INTO member_documents (
        cms_source_id,
        slug,
        file_url,
        minimum_role,
        sort_order,
        is_active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (cms_source_id) DO UPDATE SET
        slug = EXCLUDED.slug,
        file_url = EXCLUDED.file_url,
        minimum_role = EXCLUDED.minimum_role,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      doc.id,
      doc.slug,
      fileUrl,
      doc.minimumRole,
      Number(doc.sortOrder || 0),
      Boolean(doc.isActive),
    ]
  );
}

export async function deleteSyncedMemberDocument(cmsSourceId) {
  await ensurePublicSyncColumns();
  await pool.query('DELETE FROM member_documents WHERE cms_source_id = $1', [cmsSourceId]);
}
