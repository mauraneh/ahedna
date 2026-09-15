# Public media preserved with the application

The event-media PDF here is the existing public production poster, downloaded
unchanged on 2026-09-15. Its filename matches the URL already stored in the database.

GET /api/uploads/* checks PostgreSQL first, then legacy runtime files and this directory.
Legacy files are copied into PostgreSQL when read. This preserves
this published poster across deployments on ephemeral hosting. This directory is
only for deliberately published assets; it is not a backup of user uploads.

New uploads are stored directly in PostgreSQL by lib/media-store.js and do not use
the local filesystem. This directory only helps recover pre-migration media.
