import { NextResponse } from 'next/server';
const { pool, initDatabase } = require('@/lib/db');
const { hashPassword, comparePassword, generateToken, requireAuth, requireRole } = require('@/lib/auth');

// Initialize database on startup
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Main GET handler
export async function GET(request) {
  await ensureDbInitialized();
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api/', '');

  try {
    // Health check
    if (path === '' || path === 'health') {
      return NextResponse.json({ 
        status: 'ok', 
        message: 'AHEDNA API Backend',
        version: '1.0.0'
      }, { headers: corsHeaders });
    }

    // Get current user
    if (path === 'auth/me') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
      }

      const result = await pool.query(
        'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
        [authResult.user.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ user: result.rows[0] }, { headers: corsHeaders });
    }

    // Get all news
    if (path === 'news') {
      const { searchParams } = new URL(request.url);
      const published = searchParams.get('published');
      
      let query = `
        SELECT n.*, u.first_name, u.last_name, u.email as author_email
        FROM news n
        LEFT JOIN users u ON n.author_id = u.id
        ORDER BY n.created_at DESC
      `;
      
      if (published === 'true') {
        query = `
          SELECT n.*, u.first_name, u.last_name, u.email as author_email
          FROM news n
          LEFT JOIN users u ON n.author_id = u.id
          WHERE n.published = true
          ORDER BY n.created_at DESC
        `;
      }

      const result = await pool.query(query);
      return NextResponse.json({ news: result.rows }, { headers: corsHeaders });
    }

    // Get news by ID
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
        return NextResponse.json({ error: 'News not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ news: result.rows[0] }, { headers: corsHeaders });
    }

    // Get all events
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
      return NextResponse.json({ events: result.rows }, { headers: corsHeaders });
    }

    // Get event by ID with photos
    if (path.startsWith('events/') && path.split('/').length === 2) {
      const id = path.split('/')[1];
      const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
      
      if (eventResult.rows.length === 0) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404, headers: corsHeaders });
      }

      const photosResult = await pool.query(
        `SELECT ep.*, u.first_name, u.last_name
         FROM event_photos ep
         LEFT JOIN users u ON ep.uploaded_by = u.id
         WHERE ep.event_id = $1 AND ep.validated = true
         ORDER BY ep.created_at DESC`,
        [id]
      );

      return NextResponse.json({ 
        event: eventResult.rows[0],
        photos: photosResult.rows
      }, { headers: corsHeaders });
    }

    // Get forum topics
    if (path === 'forum/topics') {
      const { searchParams } = new URL(request.url);
      const validated = searchParams.get('validated');
      
      let query = `
        SELECT ft.*, u.first_name, u.last_name, u.email as author_email,
               (SELECT COUNT(*) FROM forum_messages WHERE topic_id = ft.id) as message_count
        FROM forum_topics ft
        LEFT JOIN users u ON ft.author_id = u.id
        ORDER BY ft.created_at DESC
      `;
      
      if (validated === 'true') {
        query = `
          SELECT ft.*, u.first_name, u.last_name, u.email as author_email,
                 (SELECT COUNT(*) FROM forum_messages WHERE topic_id = ft.id) as message_count
          FROM forum_topics ft
          LEFT JOIN users u ON ft.author_id = u.id
          WHERE ft.validated = true
          ORDER BY ft.created_at DESC
        `;
      }

      const result = await pool.query(query);
      return NextResponse.json({ topics: result.rows }, { headers: corsHeaders });
    }

    // Get forum messages for a topic
    if (path.startsWith('forum/topics/') && path.endsWith('/messages')) {
      const topicId = path.split('/')[2];
      const result = await pool.query(
        `SELECT fm.*, u.first_name, u.last_name, u.email as author_email
         FROM forum_messages fm
         LEFT JOIN users u ON fm.author_id = u.id
         WHERE fm.topic_id = $1
         ORDER BY fm.created_at ASC`,
        [topicId]
      );

      return NextResponse.json({ messages: result.rows }, { headers: corsHeaders });
    }

    // Get gallery photos
    if (path === 'gallery') {
      const { searchParams } = new URL(request.url);
      const validated = searchParams.get('validated');
      
      let query = `
        SELECT gp.*, u.first_name, u.last_name
        FROM gallery_photos gp
        LEFT JOIN users u ON gp.uploaded_by = u.id
        ORDER BY gp.created_at DESC
      `;
      
      if (validated === 'true') {
        query = `
          SELECT gp.*, u.first_name, u.last_name
          FROM gallery_photos gp
          LEFT JOIN users u ON gp.uploaded_by = u.id
          WHERE gp.validated = true
          ORDER BY gp.created_at DESC
        `;
      }

      const result = await pool.query(query);
      return NextResponse.json({ photos: result.rows }, { headers: corsHeaders });
    }

    // Get history chapters
    if (path === 'history/chapters') {
      const result = await pool.query('SELECT * FROM history_chapters ORDER BY chapter_order ASC');
      return NextResponse.json({ chapters: result.rows }, { headers: corsHeaders });
    }

    // Get users (admin only)
    if (path === 'users') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
      }

      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const result = await pool.query(
        'SELECT id, email, first_name, last_name, role, created_at FROM users ORDER BY created_at DESC'
      );
      return NextResponse.json({ users: result.rows }, { headers: corsHeaders });
    }

    // Get membership status
    if (path === 'memberships/my-status') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
      }

      const result = await pool.query(
        'SELECT * FROM memberships WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [authResult.user.id]
      );

      return NextResponse.json({ 
        membership: result.rows.length > 0 ? result.rows[0] : null 
      }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404, headers: corsHeaders });
    
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders });
  }
}

// Main POST handler
export async function POST(request) {
  await ensureDbInitialized();
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api/', '');

  try {
    const body = await request.json();

    // Register
    if (path === 'auth/register') {
      const { email, password, first_name, last_name, want_membership } = body;

      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400, headers: corsHeaders });
      }

      // Check if user exists
      const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400, headers: corsHeaders });
      }

      // Create user
      const password_hash = await hashPassword(password);
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role',
        [email, password_hash, first_name || null, last_name || null, 'membre']
      );

      const user = result.rows[0];

      // Create membership if requested
      if (want_membership) {
        await pool.query(
          'INSERT INTO memberships (user_id, status) VALUES ($1, $2)',
          [user.id, 'pending']
        );
      }

      const token = generateToken(user);

      return NextResponse.json({ 
        message: 'Registration successful',
        user, 
        token 
      }, { headers: corsHeaders });
    }

    // Login
    if (path === 'auth/login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers: corsHeaders });
      }

      const user = result.rows[0];
      const validPassword = await comparePassword(password, user.password_hash);

      if (!validPassword) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401, headers: corsHeaders });
      }

      const token = generateToken(user);
      
      // Don't send password hash
      delete user.password_hash;

      return NextResponse.json({ 
        message: 'Login successful',
        user, 
        token 
      }, { headers: corsHeaders });
    }

    // Create news (auteur or admin)
    if (path === 'news') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
      }

      const roleCheck = requireRole(authResult.user, ['auteur', 'admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const { title, content, excerpt, published, image_url } = body;

      if (!title || !content) {
        return NextResponse.json({ error: 'Title and content required' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query(
        'INSERT INTO news (title, content, excerpt, author_id, published, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, content, excerpt || null, authResult.user.id, published || false, image_url || null]
      );

      return NextResponse.json({ 
        message: 'News created successfully',
        news: result.rows[0] 
      }, { headers: corsHeaders });
    }

    // Create event (admin only)
    if (path === 'events') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
      }

      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const { title, description, event_date, location, type } = body;

      if (!title || !event_date) {
        return NextResponse.json({ error: 'Title and event date required' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query(
        'INSERT INTO events (title, description, event_date, location, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [title, description || null, event_date, location || null, type || 'upcoming']
      );

      return NextResponse.json({ 
        message: 'Event created successfully',
        event: result.rows[0] 
      }, { headers: corsHeaders });
    }

    // Create forum topic (authenticated users)
    if (path === 'forum/topics') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
      }

      const { title, content } = body;

      if (!title || !content) {
        return NextResponse.json({ error: 'Title and content required' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query(
        'INSERT INTO forum_topics (title, content, author_id, validated) VALUES ($1, $2, $3, $4) RETURNING *',
        [title, content, authResult.user.id, false] // Needs admin validation
      );

      return NextResponse.json({ 
        message: 'Topic created, awaiting validation',
        topic: result.rows[0] 
      }, { headers: corsHeaders });
    }

    // Create forum message (authenticated users)
    if (path.startsWith('forum/topics/') && path.endsWith('/messages')) {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
      }

      const topicId = path.split('/')[2];
      const { content } = body;

      if (!content) {
        return NextResponse.json({ error: 'Content required' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query(
        'INSERT INTO forum_messages (topic_id, content, author_id) VALUES ($1, $2, $3) RETURNING *',
        [topicId, content, authResult.user.id]
      );

      return NextResponse.json({ 
        message: 'Message created successfully',
        message: result.rows[0] 
      }, { headers: corsHeaders });
    }

    // Upload gallery photo (authenticated users)
    if (path === 'gallery') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
      }

      const { photo_url, description } = body;

      if (!photo_url) {
        return NextResponse.json({ error: 'Photo URL required' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query(
        'INSERT INTO gallery_photos (photo_url, description, uploaded_by, validated) VALUES ($1, $2, $3, $4) RETURNING *',
        [photo_url, description || null, authResult.user.id, false] // Needs admin validation
      );

      return NextResponse.json({ 
        message: 'Photo uploaded, awaiting validation',
        photo: result.rows[0] 
      }, { headers: corsHeaders });
    }

    // Create history chapter (admin only)
    if (path === 'history/chapters') {
      const authResult = await requireAuth(request);
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
      }

      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const { title, content, chapter_order, year_start, year_end, media_urls, coordinates } = body;

      if (!title || !content || chapter_order === undefined) {
        return NextResponse.json({ error: 'Title, content and chapter order required' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query(
        'INSERT INTO history_chapters (title, content, chapter_order, year_start, year_end, media_urls, coordinates) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [title, content, chapter_order, year_start || null, year_end || null, JSON.stringify(media_urls || []), JSON.stringify(coordinates || {})]
      );

      return NextResponse.json({ 
        message: 'Chapter created successfully',
        chapter: result.rows[0] 
      }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders });
  }
}

// Main PUT handler
export async function PUT(request) {
  await ensureDbInitialized();
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api/', '');

  try {
    const body = await request.json();
    const authResult = await requireAuth(request);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
    }

    // Update news
    if (path.startsWith('news/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['auteur', 'admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const { title, content, excerpt, published, image_url } = body;
      const result = await pool.query(
        'UPDATE news SET title = $1, content = $2, excerpt = $3, published = $4, image_url = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [title, content, excerpt, published, image_url, id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'News not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ 
        message: 'News updated successfully',
        news: result.rows[0] 
      }, { headers: corsHeaders });
    }

    // Update event
    if (path.startsWith('events/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const { title, description, event_date, location, type } = body;
      const result = await pool.query(
        'UPDATE events SET title = $1, description = $2, event_date = $3, location = $4, type = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [title, description, event_date, location, type, id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ 
        message: 'Event updated successfully',
        event: result.rows[0] 
      }, { headers: corsHeaders });
    }

    // Validate forum topic (admin only)
    if (path.startsWith('forum/topics/') && path.endsWith('/validate')) {
      const id = path.split('/')[2];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const { validated } = body;
      const result = await pool.query(
        'UPDATE forum_topics SET validated = $1 WHERE id = $2 RETURNING *',
        [validated, id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ 
        message: 'Topic validation updated',
        topic: result.rows[0] 
      }, { headers: corsHeaders });
    }

    // Validate gallery photo (admin only)
    if (path.startsWith('gallery/') && path.endsWith('/validate')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const { validated } = body;
      const result = await pool.query(
        'UPDATE gallery_photos SET validated = $1 WHERE id = $2 RETURNING *',
        [validated, id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ 
        message: 'Photo validation updated',
        photo: result.rows[0] 
      }, { headers: corsHeaders });
    }

    // Update user role (admin only)
    if (path.startsWith('users/') && path.endsWith('/role')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const { role } = body;
      if (!['membre', 'auteur', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400, headers: corsHeaders });
      }

      const result = await pool.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, first_name, last_name, role',
        [role, id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ 
        message: 'User role updated',
        user: result.rows[0] 
      }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders });
  }
}

// Main DELETE handler
export async function DELETE(request) {
  await ensureDbInitialized();
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api/', '');

  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
    }

    // Delete news
    if (path.startsWith('news/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const result = await pool.query('DELETE FROM news WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'News not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ message: 'News deleted successfully' }, { headers: corsHeaders });
    }

    // Delete event
    if (path.startsWith('events/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ message: 'Event deleted successfully' }, { headers: corsHeaders });
    }

    // Delete forum topic
    if (path.startsWith('forum/topics/')) {
      const id = path.split('/')[2];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const result = await pool.query('DELETE FROM forum_topics WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Topic not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ message: 'Topic deleted successfully' }, { headers: corsHeaders });
    }

    // Delete gallery photo
    if (path.startsWith('gallery/')) {
      const id = path.split('/')[1];
      const roleCheck = requireRole(authResult.user, ['admin']);
      if (roleCheck) {
        return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status, headers: corsHeaders });
      }

      const result = await pool.query('DELETE FROM gallery_photos WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Photo not found' }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json({ message: 'Photo deleted successfully' }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500, headers: corsHeaders });
  }
}
