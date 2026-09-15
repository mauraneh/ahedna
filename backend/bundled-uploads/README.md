# Public media preserved with the application

The event-media PDF here is the existing public production poster, downloaded
unchanged on 2026-09-15. Its filename matches the URL already stored in the database.

GET /api/uploads/* checks runtime uploads first, then this directory. This preserves
this published poster across deployments on ephemeral hosting. This directory is
only for deliberately published assets; it is not a backup of user uploads.

Future uploads still require persistent disk or object storage to survive restarts.
