// Uploaded files live in the remote PostgreSQL database, alongside their event data.
// No filesystem write is needed to accept or serve a new upload.
function createMediaStore(database) {
  let schemaReady;
  async function ensureSchema() {
    if (!schemaReady) {
      schemaReady = database.query(`CREATE TABLE IF NOT EXISTS uploaded_media (
        url TEXT PRIMARY KEY,
        mime_type TEXT NOT NULL,
        content BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`).catch((error) => {
        schemaReady = undefined;
        throw error;
      });
    }
    await schemaReady;
  }

  return {
    async put({ url, mimeType, buffer }) {
      await ensureSchema();
      await database.query(
        'INSERT INTO uploaded_media (url, mime_type, content) VALUES ($1, $2, $3) ON CONFLICT (url) DO NOTHING',
        [url, mimeType, buffer]
      );
    },
    async get(url) {
      await ensureSchema();
      const result = await database.query('SELECT mime_type, content FROM uploaded_media WHERE url = $1', [url]);
      const row = result.rows[0];
      return row ? { mimeType: row.mime_type, buffer: row.content } : null;
    },
  };
}

module.exports = { createMediaStore };
