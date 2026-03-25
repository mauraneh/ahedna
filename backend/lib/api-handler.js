const { pool, initDatabase } = require('./db');
const {
  hashPassword,
  comparePassword,
  generateToken,
  requireAuth,
  requireRole,
  hasMinimumRole,
  extractToken,
  verifyToken,
} = require('./auth');

let dbInitialized = false;
let dbInitializationPromise = null;

function jsonResponse(body, options = {}) {
  return new Response(JSON.stringify(body), {
    status: options.status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(options.headers || {}),
    },
  });
}

async function ensureDbInitialized() {
  if (dbInitialized) {
    return;
  }

  if (dbInitializationPromise) {
    await dbInitializationPromise;
    return;
  }

  try {
    dbInitializationPromise = initDatabase();
    await dbInitializationPromise;
    dbInitialized = true;
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    dbInitializationPromise = null;
  }
}

function getAllowedOrigins() {
  const configuredOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins?.length) {
    return configuredOrigins;
  }

  if (process.env.NODE_ENV !== 'production') {
    return [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
  }

  return [];
}

function isOriginAllowed(origin) {
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes('*')) {
    return process.env.NODE_ENV !== 'production';
  }

  return allowedOrigins.includes(origin);
}

function buildCorsHeaders(request) {
  const origin = request.headers.get('origin');
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };

  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function getCorsRejectionResponse(request, corsHeaders) {
  const origin = request.headers.get('origin');

  if (!origin || isOriginAllowed(origin)) {
    return null;
  }

  return jsonResponse(
    { error: 'Origin not allowed' },
    { status: 403, headers: corsHeaders }
  );
}

function getApiPath(request) {
  const { pathname } = new URL(request.url);
  return pathname.replace(/^\/api\/?/, '');
}

const profileFields = `
  id,
  email,
  first_name,
  last_name,
  role,
  phone,
  address_line1,
  address_line2,
  postal_code,
  city,
  country,
  bio,
  avatar_url,
  membership_number,
  created_at,
  updated_at
`;

function normalizeString(value, maxLength = 255) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeEmail(value) {
  const email = normalizeString(value, 255);
  return email ? email.toLowerCase() : null;
}

function sanitizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

async function readOptionalJson(request) {
  const rawBody = await request.text();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return {};
  }
}

async function getLatestMembership(userId) {
  const result = await pool.query(
    'SELECT * FROM memberships WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );

  return result.rows[0] || null;
}

async function hasActiveMembership(userId) {
  const membership = await getLatestMembership(userId);
  return membership?.status === 'active';
}

async function getProfileByUserId(userId) {
  const result = await pool.query(`SELECT ${profileFields} FROM users WHERE id = $1`, [userId]);
  return result.rows[0] || null;
}

function getOptionalUser(request) {
  const token = extractToken(request);
  return token ? verifyToken(token) : null;
}

async function deleteUserAccount(userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingUser = await client.query(
      'SELECT id, email FROM users WHERE id = $1',
      [userId]
    );

    if (existingUser.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM forum_messages WHERE author_id = $1', [userId]);
    await client.query('DELETE FROM forum_topics WHERE author_id = $1', [userId]);
    await client.query('DELETE FROM event_photos WHERE uploaded_by = $1', [userId]);
    await client.query('DELETE FROM gallery_photos WHERE uploaded_by = $1', [userId]);
    await client.query('DELETE FROM news WHERE author_id = $1', [userId]);
    await client.query('DELETE FROM memberships WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');
    return existingUser.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function prepareRequest(request, options = {}) {
  if (!options.skipDbInit) {
    await ensureDbInitialized();
  }

  const corsHeaders = buildCorsHeaders(request);
  const corsError = getCorsRejectionResponse(request, corsHeaders);

  return {
    corsHeaders,
    corsError,
    path: getApiPath(request),
  };
}

function notFound(corsHeaders) {
  return jsonResponse({ error: 'Endpoint not found' }, { status: 404, headers: corsHeaders });
}

function internalError(method, error, corsHeaders) {
  console.error(`${method} Error:`, error);
  return jsonResponse(
    { error: 'Internal server error', details: error.message },
    { status: 500, headers: corsHeaders }
  );
}

async function handleOptions(request) {
  const { corsHeaders, corsError } = await prepareRequest(request, { skipDbInit: true });
  if (corsError) {
    return corsError;
  }

  return jsonResponse({}, { headers: corsHeaders });
}

async function handleGet(request) {
  const { corsHeaders, corsError, path } = await prepareRequest(request);
  if (corsError) {
    return corsError;
  }

  try {
    if (path === '' || path === 'health') {
      return jsonResponse(
        {
          status: 'ok',
          message: 'AHEDNA API Backend',
          version: '1.0.0',
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'auth/me') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const profile = await getProfileByUserId(authResult.user.id);
      if (!profile) {
        return jsonResponse({ error: 'User not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse({ user: profile }, { headers: corsHeaders });
    }

    if (path === 'profile/me') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const profile = await getProfileByUserId(authResult.user.id);
      if (!profile) {
        return jsonResponse({ error: 'User not found' }, { status: 404, headers: corsHeaders });
      }

      const membership = await getLatestMembership(authResult.user.id);
      return jsonResponse({ profile, membership }, { headers: corsHeaders });
    }

    if (path === 'profile/documents') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const result = await pool.query(
        `SELECT id, slug, file_url, minimum_role, sort_order
         FROM member_documents
         WHERE is_active = true
         ORDER BY sort_order ASC, created_at ASC`
      );

      const documents = result.rows.filter((document) =>
        hasMinimumRole(authResult.user.role, document.minimum_role)
      );

      return jsonResponse({ documents }, { headers: corsHeaders });
    }

    if (path === 'news') {
      const { searchParams } = new URL(request.url);
      const published = searchParams.get('published');
      const authUser = getOptionalUser(request);

      let query;
      let params = [];

      if (authUser?.role === 'admin') {
        query = `
          SELECT n.*, u.first_name, u.last_name, u.email as author_email
          FROM news n
          LEFT JOIN users u ON n.author_id = u.id
          ORDER BY n.created_at DESC
        `;
      } else if (authUser?.role === 'auteur' && published !== 'true') {
        query = `
          SELECT n.*, u.first_name, u.last_name, u.email as author_email
          FROM news n
          LEFT JOIN users u ON n.author_id = u.id
          WHERE n.published = true OR n.author_id = $1
          ORDER BY n.created_at DESC
        `;
        params = [authUser.id];
      } else {
        query = `
          SELECT n.*, u.first_name, u.last_name, u.email as author_email
          FROM news n
          LEFT JOIN users u ON n.author_id = u.id
          WHERE n.published = true
          ORDER BY n.created_at DESC
        `;
      }

      const result = await pool.query(query, params);
      return jsonResponse({ news: result.rows }, { headers: corsHeaders });
    }

    if (path.startsWith('news/') && path.split('/').length === 2) {
      const id = path.split('/')[1];
      const result = await pool.query(
        `SELECT n.*, u.first_name, u.last_name, u.email as author_email
         FROM news n
         LEFT JOIN users u ON n.author_id = u.id
         WHERE n.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return jsonResponse({ error: 'News not found' }, { status: 404, headers: corsHeaders });
      }

      const news = result.rows[0];
      if (!news.published) {
        const authUser = getOptionalUser(request);
        const canReadDraft =
          authUser && (authUser.role === 'admin' || authUser.id === news.author_id);

        if (!canReadDraft) {
          return jsonResponse({ error: 'News not found' }, { status: 404, headers: corsHeaders });
        }
      }

      return jsonResponse({ news }, { headers: corsHeaders });
    }

    if (path === 'events') {
      const { searchParams } = new URL(request.url);
      const type = searchParams.get('type');
      let query = 'SELECT * FROM events ORDER BY event_date DESC';
      let params = [];

      if (type) {
        query = 'SELECT * FROM events WHERE type = $1 ORDER BY event_date DESC';
        params = [type];
      }

      const result = await pool.query(query, params);
      return jsonResponse({ events: result.rows }, { headers: corsHeaders });
    }

    if (path.startsWith('events/') && path.split('/').length === 2) {
      const id = path.split('/')[1];
      const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);

      if (eventResult.rows.length === 0) {
        return jsonResponse({ error: 'Event not found' }, { status: 404, headers: corsHeaders });
      }

      const photosResult = await pool.query(
        `SELECT ep.*, u.first_name, u.last_name
         FROM event_photos ep
         LEFT JOIN users u ON ep.uploaded_by = u.id
         WHERE ep.event_id = $1 AND ep.validated = true
         ORDER BY ep.created_at DESC`,
        [id]
      );

      return jsonResponse(
        {
          event: eventResult.rows[0],
          photos: photosResult.rows,
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'gallery/events') {
      const eventsResult = await pool.query(
        `SELECT id, title, description, event_date, location, type, image_url, gallery_enabled
         FROM events
         WHERE gallery_enabled = true
         ORDER BY event_date DESC`
      );

      const galleryEvents = eventsResult.rows;

      if (galleryEvents.length === 0) {
        return jsonResponse({ events: [] }, { headers: corsHeaders });
      }

      const eventIds = galleryEvents.map((event) => event.id);
      const photosResult = await pool.query(
        `SELECT ep.*, u.first_name, u.last_name
         FROM event_photos ep
         LEFT JOIN users u ON ep.uploaded_by = u.id
         WHERE ep.validated = true AND ep.event_id = ANY($1::uuid[])
         ORDER BY ep.created_at DESC`,
        [eventIds]
      );

      const photosByEventId = new Map();
      photosResult.rows.forEach((photo) => {
        const eventPhotos = photosByEventId.get(photo.event_id) ?? [];
        eventPhotos.push(photo);
        photosByEventId.set(photo.event_id, eventPhotos);
      });

      return jsonResponse(
        {
          events: galleryEvents.map((event) => ({
            ...event,
            photos: photosByEventId.get(event.id) ?? [],
            photo_count: (photosByEventId.get(event.id) ?? []).length,
          })),
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'forum/topics') {
      const { searchParams } = new URL(request.url);
      const validated = searchParams.get('validated');
      const authUser = getOptionalUser(request);

      let query;
      if (validated === 'true' || authUser?.role !== 'admin') {
        query = `
          SELECT ft.*, u.first_name, u.last_name, u.email as author_email,
                 (SELECT COUNT(*) FROM forum_messages WHERE topic_id = ft.id) as message_count
          FROM forum_topics ft
          LEFT JOIN users u ON ft.author_id = u.id
          WHERE ft.validated = true
          ORDER BY ft.created_at DESC
        `;
      } else {
        query = `
          SELECT ft.*, u.first_name, u.last_name, u.email as author_email,
                 (SELECT COUNT(*) FROM forum_messages WHERE topic_id = ft.id) as message_count
          FROM forum_topics ft
          LEFT JOIN users u ON ft.author_id = u.id
          ORDER BY ft.created_at DESC
        `;
      }

      const result = await pool.query(query);
      return jsonResponse({ topics: result.rows }, { headers: corsHeaders });
    }

    if (path.startsWith('forum/topics/') && path.endsWith('/messages')) {
      const topicId = path.split('/')[2];
      const topicResult = await pool.query(
        'SELECT id, validated, author_id FROM forum_topics WHERE id = $1',
        [topicId]
      );

      if (topicResult.rows.length === 0) {
        return jsonResponse({ error: 'Topic not found' }, { status: 404, headers: corsHeaders });
      }

      const topic = topicResult.rows[0];
      if (!topic.validated) {
        const authUser = getOptionalUser(request);
        const canReadPendingTopic =
          authUser && (authUser.role === 'admin' || authUser.id === topic.author_id);

        if (!canReadPendingTopic) {
          return jsonResponse({ error: 'Topic not found' }, { status: 404, headers: corsHeaders });
        }
      }

      const result = await pool.query(
        `SELECT fm.*, u.first_name, u.last_name, u.email as author_email
         FROM forum_messages fm
         LEFT JOIN users u ON fm.author_id = u.id
         WHERE fm.topic_id = $1
         ORDER BY fm.created_at ASC`,
        [topicId]
      );

      return jsonResponse({ messages: result.rows }, { headers: corsHeaders });
    }

    if (path === 'gallery') {
      const { searchParams } = new URL(request.url);
      const validated = searchParams.get('validated');
      const authUser = getOptionalUser(request);

      let query;
      if (validated === 'true' || authUser?.role !== 'admin') {
        query = `
          SELECT gp.*, u.first_name, u.last_name
          FROM gallery_photos gp
          LEFT JOIN users u ON gp.uploaded_by = u.id
          WHERE gp.validated = true
          ORDER BY gp.created_at DESC
        `;
      } else {
        query = `
          SELECT gp.*, u.first_name, u.last_name
          FROM gallery_photos gp
          LEFT JOIN users u ON gp.uploaded_by = u.id
          ORDER BY gp.created_at DESC
        `;
      }

      const result = await pool.query(query);
      return jsonResponse({ photos: result.rows }, { headers: corsHeaders });
    }

    if (path === 'gallery/event-photos') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const result = await pool.query(
        `SELECT ep.*, e.title AS event_title, e.event_date, e.location, u.first_name, u.last_name
         FROM event_photos ep
         INNER JOIN events e ON e.id = ep.event_id
         LEFT JOIN users u ON ep.uploaded_by = u.id
         WHERE ep.validated = false
         ORDER BY e.event_date DESC, ep.created_at DESC`
      );

      return jsonResponse({ photos: result.rows }, { headers: corsHeaders });
    }

    if (path === 'history/chapters') {
      const result = await pool.query('SELECT * FROM history_chapters ORDER BY chapter_order ASC');
      return jsonResponse({ chapters: result.rows }, { headers: corsHeaders });
    }

    if (path === 'users') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const result = await pool.query(`SELECT ${profileFields} FROM users ORDER BY created_at DESC`);
      return jsonResponse({ users: result.rows }, { headers: corsHeaders });
    }

    if (path === 'admin/overview') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const [statsResult, recentUsersResult, recentNewsResult, recentEventsResult] =
        await Promise.all([
          pool.query(`
            SELECT
              (SELECT COUNT(*)::int FROM users) AS users,
              (SELECT COUNT(*)::int FROM memberships WHERE status = 'active') AS active_memberships,
              (SELECT COUNT(*)::int FROM memberships WHERE status = 'pending') AS pending_memberships,
              (SELECT COUNT(*)::int FROM news) AS news,
              (SELECT COUNT(*)::int FROM news WHERE published = true) AS published_news,
              (SELECT COUNT(*)::int FROM events) AS events,
              (SELECT COUNT(*)::int FROM events WHERE event_date >= CURRENT_TIMESTAMP) AS upcoming_events,
              (SELECT COUNT(*)::int FROM forum_topics WHERE validated = false) AS pending_topics,
              (
                (SELECT COUNT(*)::int FROM gallery_photos WHERE validated = false) +
                (SELECT COUNT(*)::int FROM event_photos WHERE validated = false)
              ) AS pending_photos
          `),
          pool.query(
            'SELECT id, email, first_name, last_name, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
          ),
          pool.query(
            `SELECT n.id, n.title, n.published, n.created_at, u.first_name, u.last_name
             FROM news n
             LEFT JOIN users u ON n.author_id = u.id
             ORDER BY n.created_at DESC
             LIMIT 5`
          ),
          pool.query(
            'SELECT id, title, event_date, location, type, created_at FROM events ORDER BY created_at DESC LIMIT 5'
          ),
        ]);

      return jsonResponse(
        {
          stats: statsResult.rows[0],
          recentUsers: recentUsersResult.rows,
          recentNews: recentNewsResult.rows,
          recentEvents: recentEventsResult.rows,
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'memberships/my-status') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const result = await pool.query(
        'SELECT * FROM memberships WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [authResult.user.id]
      );

      return jsonResponse(
        { membership: result.rows.length > 0 ? result.rows[0] : null },
        { headers: corsHeaders }
      );
    }

    return notFound(corsHeaders);
  } catch (error) {
    return internalError('GET', error, corsHeaders);
  }
}

async function handlePost(request) {
  const { corsHeaders, corsError, path } = await prepareRequest(request);
  if (corsError) {
    return corsError;
  }

  try {
    const body = await request.json();

    if (path === 'auth/register') {
      const email = normalizeEmail(body.email);
      const password = body.password;
      const first_name = normalizeString(body.first_name, 100);
      const last_name = normalizeString(body.last_name, 100);
      const want_membership = sanitizeBoolean(body.want_membership);

      if (!email || !password) {
        return jsonResponse(
          { error: 'Email and password required' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!isValidPassword(password)) {
        return jsonResponse(
          { error: 'Password must be at least 8 characters long' },
          { status: 400, headers: corsHeaders }
        );
      }

      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return jsonResponse(
          { error: 'Email already registered' },
          { status: 400, headers: corsHeaders }
        );
      }

      const password_hash = await hashPassword(password);
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role, created_at',
        [email, password_hash, first_name || null, last_name || null, 'membre']
      );

      const user = result.rows[0];

      if (want_membership) {
        await pool.query('INSERT INTO memberships (user_id, status) VALUES ($1, $2)', [
          user.id,
          'pending',
        ]);
      }

      const token = generateToken(user);

      return jsonResponse(
        {
          message: 'Registration successful',
          user,
          token,
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'auth/login') {
      const email = normalizeEmail(body.email);
      const password = body.password;

      if (!email || !password) {
        return jsonResponse(
          { error: 'Email and password required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return jsonResponse(
          { error: 'Invalid credentials' },
          { status: 401, headers: corsHeaders }
        );
      }

      const user = result.rows[0];
      const validPassword = await comparePassword(password, user.password_hash);

      if (!validPassword) {
        return jsonResponse(
          { error: 'Invalid credentials' },
          { status: 401, headers: corsHeaders }
        );
      }

      const token = generateToken(user);
      delete user.password_hash;

      return jsonResponse(
        {
          message: 'Login successful',
          user,
          token,
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'news') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const roleCheck = requireRole(authResult.user, ['auteur', 'admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const title = normalizeString(body.title, 255);
      const content = normalizeString(body.content, 20000);
      const excerpt = normalizeString(body.excerpt, 500);
      const image_url = normalizeString(body.image_url, 2000);
      const published = sanitizeBoolean(body.published);

      if (!title || !content) {
        return jsonResponse(
          { error: 'Title and content required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await pool.query(
        'INSERT INTO news (title, content, excerpt, author_id, published, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, content, excerpt || null, authResult.user.id, published, image_url || null]
      );

      return jsonResponse(
        {
          message: 'News created successfully',
          news: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'events') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const title = normalizeString(body.title, 255);
      const description = normalizeString(body.description, 5000);
      const event_date = body.event_date;
      const location = normalizeString(body.location, 255);
      const image_url = normalizeString(body.image_url, 2000);
      const type = body.type;
      const gallery_enabled = sanitizeBoolean(body.gallery_enabled);

      if (!title || !event_date) {
        return jsonResponse(
          { error: 'Title and event date required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await pool.query(
        'INSERT INTO events (title, description, event_date, location, image_url, type, gallery_enabled) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [title, description || null, event_date, location || null, image_url || null, type || 'upcoming', gallery_enabled]
      );

      return jsonResponse(
        {
          message: 'Event created successfully',
          event: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'forum/topics') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const title = normalizeString(body.title, 255);
      const content = normalizeString(body.content, 10000);

      if (!title || !content) {
        return jsonResponse(
          { error: 'Title and content required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await pool.query(
        'INSERT INTO forum_topics (title, content, author_id, validated) VALUES ($1, $2, $3, $4) RETURNING *',
        [title, content, authResult.user.id, false]
      );

      return jsonResponse(
        {
          message: 'Topic created, awaiting validation',
          topic: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path.startsWith('forum/topics/') && path.endsWith('/messages')) {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const topicId = path.split('/')[2];
      const content = normalizeString(body.content, 5000);

      if (!content) {
        return jsonResponse({ error: 'Content required' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query(
        'INSERT INTO forum_messages (topic_id, content, author_id) VALUES ($1, $2, $3) RETURNING *',
        [topicId, content, authResult.user.id]
      );

      return jsonResponse(
        {
          message: 'Message created successfully',
          message: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path.startsWith('gallery/events/') && path.endsWith('/photos')) {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const eventId = path.split('/')[2];
      const eventResult = await pool.query(
        'SELECT id, title, gallery_enabled FROM events WHERE id = $1',
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        return jsonResponse({ error: 'Event not found' }, { status: 404, headers: corsHeaders });
      }

      if (!eventResult.rows[0].gallery_enabled) {
        return jsonResponse(
          { error: 'Gallery is not open for this event' },
          { status: 400, headers: corsHeaders }
        );
      }

      const canUpload =
        authResult.user.role === 'admin' || (await hasActiveMembership(authResult.user.id));

      if (!canUpload) {
        return jsonResponse(
          { error: 'Active membership required to upload photos' },
          { status: 403, headers: corsHeaders }
        );
      }

      const photo_url = normalizeString(body.photo_url, 2000);
      const description = normalizeString(body.description, 500);

      if (!photo_url) {
        return jsonResponse(
          { error: 'Photo URL required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const isAdminUpload = authResult.user.role === 'admin';
      const result = await pool.query(
        `INSERT INTO event_photos (event_id, photo_url, description, uploaded_by, validated)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [eventId, photo_url, description || null, authResult.user.id, isAdminUpload]
      );

      return jsonResponse(
        {
          message: isAdminUpload
            ? 'Photo uploaded successfully'
            : 'Photo uploaded, awaiting validation',
          photo: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'gallery') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const photo_url = normalizeString(body.photo_url, 2000);
      const description = normalizeString(body.description, 500);

      if (!photo_url) {
        return jsonResponse(
          { error: 'Photo URL required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await pool.query(
        'INSERT INTO gallery_photos (photo_url, description, uploaded_by, validated) VALUES ($1, $2, $3, $4) RETURNING *',
        [photo_url, description || null, authResult.user.id, false]
      );

      return jsonResponse(
        {
          message: 'Photo uploaded, awaiting validation',
          photo: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'history/chapters') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return jsonResponse(
          { error: authResult.error },
          { status: authResult.status, headers: corsHeaders }
        );
      }

      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const title = normalizeString(body.title, 255);
      const content = normalizeString(body.content, 20000);
      const chapter_order = body.chapter_order;
      const year_start = body.year_start;
      const year_end = body.year_end;
      const media_urls = Array.isArray(body.media_urls) ? body.media_urls : [];
      const coordinates =
        body.coordinates && typeof body.coordinates === 'object' ? body.coordinates : {};

      if (!title || !content || chapter_order === undefined) {
        return jsonResponse(
          { error: 'Title, content and chapter order required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await pool.query(
        'INSERT INTO history_chapters (title, content, chapter_order, year_start, year_end, media_urls, coordinates) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [
          title,
          content,
          chapter_order,
          year_start || null,
          year_end || null,
          JSON.stringify(media_urls || []),
          JSON.stringify(coordinates || {}),
        ]
      );

      return jsonResponse(
        {
          message: 'Chapter created successfully',
          chapter: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    return notFound(corsHeaders);
  } catch (error) {
    return internalError('POST', error, corsHeaders);
  }
}

async function handlePut(request) {
  const { corsHeaders, corsError, path } = await prepareRequest(request);
  if (corsError) {
    return corsError;
  }

  try {
    const body = await request.json();
    const authResult = await requireAuth(request);

    if (authResult.error) {
      return jsonResponse(
        { error: authResult.error },
        { status: authResult.status, headers: corsHeaders }
      );
    }

    if (path === 'profile/me') {
      const email = normalizeEmail(body.email);
      const first_name = normalizeString(body.first_name, 100);
      const last_name = normalizeString(body.last_name, 100);
      const phone = normalizeString(body.phone, 30);
      const address_line1 = normalizeString(body.address_line1, 255);
      const address_line2 = normalizeString(body.address_line2, 255);
      const postal_code = normalizeString(body.postal_code, 20);
      const city = normalizeString(body.city, 120);
      const country = normalizeString(body.country, 120);
      const bio = normalizeString(body.bio, 1000);
      const avatar_url = normalizeString(body.avatar_url, 2000);

      if (!email) {
        return jsonResponse({ error: 'Email is required' }, { status: 400, headers: corsHeaders });
      }

      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id <> $2',
        [email, authResult.user.id]
      );

      if (existingUser.rows.length > 0) {
        return jsonResponse(
          { error: 'Email already registered' },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await pool.query(
        `UPDATE users
         SET email = $1,
             first_name = $2,
             last_name = $3,
             phone = $4,
             address_line1 = $5,
             address_line2 = $6,
             postal_code = $7,
             city = $8,
             country = $9,
             bio = $10,
             avatar_url = $11,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $12
         RETURNING ${profileFields}`,
        [
          email,
          first_name,
          last_name,
          phone,
          address_line1,
          address_line2,
          postal_code,
          city,
          country,
          bio,
          avatar_url,
          authResult.user.id,
        ]
      );

      const profile = result.rows[0];
      const membership = await getLatestMembership(authResult.user.id);
      const token = generateToken(profile);

      return jsonResponse(
        {
          message: 'Profile updated successfully',
          profile,
          membership,
          token,
        },
        { headers: corsHeaders }
      );
    }

    if (path === 'profile/password') {
      const current_password = body.current_password;
      const new_password = body.new_password;

      if (!current_password || !new_password) {
        return jsonResponse(
          { error: 'Current password and new password are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!isValidPassword(new_password)) {
        return jsonResponse(
          { error: 'Password must be at least 8 characters long' },
          { status: 400, headers: corsHeaders }
        );
      }

      const userResult = await pool.query(
        'SELECT id, password_hash FROM users WHERE id = $1',
        [authResult.user.id]
      );

      if (userResult.rows.length === 0) {
        return jsonResponse({ error: 'User not found' }, { status: 404, headers: corsHeaders });
      }

      const validPassword = await comparePassword(
        current_password,
        userResult.rows[0].password_hash
      );

      if (!validPassword) {
        return jsonResponse(
          { error: 'Current password is incorrect' },
          { status: 400, headers: corsHeaders }
        );
      }

      const password_hash = await hashPassword(new_password);
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [password_hash, authResult.user.id]
      );

      return jsonResponse({ message: 'Password updated successfully' }, { headers: corsHeaders });
    }

    if (path.startsWith('news/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['auteur', 'admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const title = normalizeString(body.title, 255);
      const content = normalizeString(body.content, 20000);
      const excerpt = normalizeString(body.excerpt, 500);
      const published = sanitizeBoolean(body.published);
      const image_url = normalizeString(body.image_url, 2000);
      const params = [title, content, excerpt, published, image_url, id];
      const query =
        authResult.user.role === 'admin'
          ? 'UPDATE news SET title = $1, content = $2, excerpt = $3, published = $4, image_url = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *'
          : 'UPDATE news SET title = $1, content = $2, excerpt = $3, published = $4, image_url = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND author_id = $7 RETURNING *';

      if (authResult.user.role !== 'admin') {
        params.push(authResult.user.id);
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return jsonResponse(
          { error: 'News not found or not editable' },
          { status: 404, headers: corsHeaders }
        );
      }

      return jsonResponse(
        {
          message: 'News updated successfully',
          news: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path.startsWith('events/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const title = normalizeString(body.title, 255);
      const description = normalizeString(body.description, 5000);
      const event_date = body.event_date;
      const location = normalizeString(body.location, 255);
      const image_url = normalizeString(body.image_url, 2000);
      const type = body.type;
      const gallery_enabled = sanitizeBoolean(body.gallery_enabled);
      const result = await pool.query(
        'UPDATE events SET title = $1, description = $2, event_date = $3, location = $4, image_url = $5, type = $6, gallery_enabled = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
        [title, description, event_date, location, image_url, type, gallery_enabled, id]
      );

      if (result.rows.length === 0) {
        return jsonResponse({ error: 'Event not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse(
        {
          message: 'Event updated successfully',
          event: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path.startsWith('gallery/event-photos/') && path.endsWith('/validate')) {
      const id = path.split('/')[2];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const { validated } = body;
      const result = await pool.query(
        'UPDATE event_photos SET validated = $1 WHERE id = $2 RETURNING *',
        [validated, id]
      );

      if (result.rows.length === 0) {
        return jsonResponse({ error: 'Photo not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse(
        {
          message: 'Photo validation updated',
          photo: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path.startsWith('forum/topics/') && path.endsWith('/validate')) {
      const id = path.split('/')[2];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const { validated } = body;
      const result = await pool.query(
        'UPDATE forum_topics SET validated = $1 WHERE id = $2 RETURNING *',
        [validated, id]
      );

      if (result.rows.length === 0) {
        return jsonResponse({ error: 'Topic not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse(
        {
          message: 'Topic validation updated',
          topic: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path.startsWith('gallery/') && path.endsWith('/validate')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const { validated } = body;
      const result = await pool.query(
        'UPDATE gallery_photos SET validated = $1 WHERE id = $2 RETURNING *',
        [validated, id]
      );

      if (result.rows.length === 0) {
        return jsonResponse({ error: 'Photo not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse(
        {
          message: 'Photo validation updated',
          photo: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    if (path.startsWith('users/') && path.endsWith('/role')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const { role } = body;
      if (!['membre', 'auteur', 'admin'].includes(role)) {
        return jsonResponse({ error: 'Invalid role' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, first_name, last_name, role, updated_at',
        [role, id]
      );

      if (result.rows.length === 0) {
        return jsonResponse({ error: 'User not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse(
        {
          message: 'User role updated',
          user: result.rows[0],
        },
        { headers: corsHeaders }
      );
    }

    return notFound(corsHeaders);
  } catch (error) {
    return internalError('PUT', error, corsHeaders);
  }
}

async function handleDelete(request) {
  const { corsHeaders, corsError, path } = await prepareRequest(request);
  if (corsError) {
    return corsError;
  }

  try {
    const body = await readOptionalJson(request);
    const authResult = await requireAuth(request);

    if (authResult.error) {
      return jsonResponse(
        { error: authResult.error },
        { status: authResult.status, headers: corsHeaders }
      );
    }

    if (path === 'profile/me') {
      const confirm_email = normalizeEmail(body.confirm_email);
      const currentProfile = await getProfileByUserId(authResult.user.id);

      if (!currentProfile) {
        return jsonResponse({ error: 'User not found' }, { status: 404, headers: corsHeaders });
      }

      if (!confirm_email || confirm_email !== normalizeEmail(currentProfile.email)) {
        return jsonResponse(
          { error: 'Email confirmation does not match your account' },
          { status: 400, headers: corsHeaders }
        );
      }

      await deleteUserAccount(authResult.user.id);
      return jsonResponse({ message: 'Account deleted successfully' }, { headers: corsHeaders });
    }

    if (path.startsWith('users/') && path.split('/').length === 2) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      if (id === authResult.user.id) {
        return jsonResponse(
          { error: 'Use your profile page to delete your own account' },
          { status: 400, headers: corsHeaders }
        );
      }

      const deletedUser = await deleteUserAccount(id);
      if (!deletedUser) {
        return jsonResponse({ error: 'User not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse({ message: 'User deleted successfully' }, { headers: corsHeaders });
    }

    if (path.startsWith('news/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['auteur', 'admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const result =
        authResult.user.role === 'admin'
          ? await pool.query('DELETE FROM news WHERE id = $1 RETURNING id', [id])
          : await pool.query('DELETE FROM news WHERE id = $1 AND author_id = $2 RETURNING id', [
              id,
              authResult.user.id,
            ]);

      if (result.rows.length === 0) {
        return jsonResponse(
          { error: 'News not found or not removable' },
          { status: 404, headers: corsHeaders }
        );
      }

      return jsonResponse({ message: 'News deleted successfully' }, { headers: corsHeaders });
    }

    if (path.startsWith('events/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return jsonResponse({ error: 'Event not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse({ message: 'Event deleted successfully' }, { headers: corsHeaders });
    }

    if (path.startsWith('forum/topics/')) {
      const id = path.split('/')[2];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const result = await pool.query('DELETE FROM forum_topics WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return jsonResponse({ error: 'Topic not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse({ message: 'Topic deleted successfully' }, { headers: corsHeaders });
    }

    if (path.startsWith('gallery/event-photos/')) {
      const id = path.split('/')[2];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const result = await pool.query('DELETE FROM event_photos WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return jsonResponse({ error: 'Photo not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse({ message: 'Photo deleted successfully' }, { headers: corsHeaders });
    }

    if (path.startsWith('gallery/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return jsonResponse(
          { error: roleCheck.error },
          { status: roleCheck.status, headers: corsHeaders }
        );
      }

      const result = await pool.query('DELETE FROM gallery_photos WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return jsonResponse({ error: 'Photo not found' }, { status: 404, headers: corsHeaders });
      }

      return jsonResponse({ message: 'Photo deleted successfully' }, { headers: corsHeaders });
    }

    return notFound(corsHeaders);
  } catch (error) {
    return internalError('DELETE', error, corsHeaders);
  }
}

module.exports = {
  handleOptions,
  handleGet,
  handlePost,
  handlePut,
  handleDelete,
};
