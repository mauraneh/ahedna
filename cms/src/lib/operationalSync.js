import { pool } from './publicDb.js';

function formatPerson(row) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return name || row.email || 'Utilisateur';
}

async function upsertMirrorDoc(payload, collection, externalId, data) {
  const existing = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      externalId: {
        equals: externalId,
      },
    },
  });

  if (existing.docs[0]) {
    await payload.update({
      collection,
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    });
    return;
  }

  await payload.create({
    collection,
    data,
    overrideAccess: true,
  });
}

async function syncUsers(payload) {
  const result = await pool.query(`
    SELECT id, email, first_name, last_name, role, phone, city, membership_number, created_at
    FROM users
    ORDER BY created_at DESC
  `);

  await Promise.all(
    result.rows.map((user) =>
      upsertMirrorDoc(payload, 'app-users', user.id, {
        externalId: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: user.role,
        phone: user.phone || '',
        city: user.city || '',
        membershipNumber: user.membership_number || '',
        createdAtPublic: user.created_at,
      })
    )
  );
}

async function syncForumTopics(payload) {
  const result = await pool.query(`
    SELECT ft.id, ft.title, ft.content, ft.validated, ft.created_at,
           u.first_name, u.last_name, u.email
    FROM forum_topics ft
    LEFT JOIN users u ON u.id = ft.author_id
    ORDER BY ft.created_at DESC
  `);

  await Promise.all(
    result.rows.map((topic) =>
      upsertMirrorDoc(payload, 'forum-topics-moderation', topic.id, {
        externalId: topic.id,
        title: topic.title,
        content: topic.content,
        authorLabel: formatPerson(topic),
        validated: Boolean(topic.validated),
        createdAtPublic: topic.created_at,
      })
    )
  );
}

async function syncEventPhotos(payload) {
  const result = await pool.query(`
    SELECT ep.id, ep.photo_url, ep.description, ep.validated, ep.created_at,
           e.title AS event_title,
           u.first_name, u.last_name, u.email
    FROM event_photos ep
    LEFT JOIN events e ON e.id = ep.event_id
    LEFT JOIN users u ON u.id = ep.uploaded_by
    ORDER BY ep.validated ASC, ep.created_at DESC
  `);

  await Promise.all(
    result.rows.map((photo) =>
      upsertMirrorDoc(payload, 'event-photos-moderation', photo.id, {
        externalId: photo.id,
        eventTitle: photo.event_title || 'Evenement',
        photoUrl: photo.photo_url,
        description: photo.description || '',
        uploaderLabel: formatPerson(photo),
        validated: Boolean(photo.validated),
        createdAtPublic: photo.created_at,
      })
    )
  );
}

async function syncGalleryPhotos(payload) {
  const result = await pool.query(`
    SELECT gp.id, gp.photo_url, gp.description, gp.validated, gp.created_at,
           u.first_name, u.last_name, u.email
    FROM gallery_photos gp
    LEFT JOIN users u ON u.id = gp.uploaded_by
    ORDER BY gp.validated ASC, gp.created_at DESC
  `);

  await Promise.all(
    result.rows.map((photo) =>
      upsertMirrorDoc(payload, 'gallery-photos-moderation', photo.id, {
        externalId: photo.id,
        photoUrl: photo.photo_url,
        description: photo.description || '',
        uploaderLabel: formatPerson(photo),
        validated: Boolean(photo.validated),
        createdAtPublic: photo.created_at,
      })
    )
  );
}

export async function syncOperationalCollections(payload) {
  await Promise.all([
    syncUsers(payload),
    syncForumTopics(payload),
    syncEventPhotos(payload),
    syncGalleryPhotos(payload),
  ]);
}

export async function updatePublicUserFromPayload(doc) {
  await pool.query(
    `
      UPDATE users
      SET email = $1,
          first_name = $2,
          last_name = $3,
          role = $4,
          phone = $5,
          city = $6,
          membership_number = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
    `,
    [
      doc.email,
      doc.firstName || null,
      doc.lastName || null,
      doc.role,
      doc.phone || null,
      doc.city || null,
      doc.membershipNumber || null,
      doc.externalId,
    ]
  );
}

export async function deletePublicUserAccount(userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM forum_messages WHERE author_id = $1', [userId]);
    await client.query('DELETE FROM forum_topics WHERE author_id = $1', [userId]);
    await client.query('DELETE FROM event_photos WHERE uploaded_by = $1', [userId]);
    await client.query('DELETE FROM gallery_photos WHERE uploaded_by = $1', [userId]);
    await client.query('DELETE FROM news WHERE author_id = $1', [userId]);
    await client.query('DELETE FROM memberships WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePublicForumTopicFromPayload(doc) {
  await pool.query(
    `
      UPDATE forum_topics
      SET title = $1,
          content = $2,
          validated = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `,
    [doc.title, doc.content, Boolean(doc.validated), doc.externalId]
  );
}

export async function deletePublicForumTopic(topicId) {
  await pool.query('DELETE FROM forum_topics WHERE id = $1', [topicId]);
}

export async function updatePublicEventPhotoFromPayload(doc) {
  await pool.query(
    'UPDATE event_photos SET description = $1, validated = $2 WHERE id = $3',
    [doc.description || null, Boolean(doc.validated), doc.externalId]
  );
}

export async function deletePublicEventPhoto(photoId) {
  await pool.query('DELETE FROM event_photos WHERE id = $1', [photoId]);
}

export async function updatePublicGalleryPhotoFromPayload(doc) {
  await pool.query(
    'UPDATE gallery_photos SET description = $1, validated = $2 WHERE id = $3',
    [doc.description || null, Boolean(doc.validated), doc.externalId]
  );
}

export async function deletePublicGalleryPhoto(photoId) {
  await pool.query('DELETE FROM gallery_photos WHERE id = $1', [photoId]);
}
