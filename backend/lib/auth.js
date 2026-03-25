// Authentication utilities
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const ROLE_HIERARCHY = ['membre', 'auteur', 'admin'];

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return 'fallback-secret-key';
}

// Hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Compare password
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    return null;
  }
}

// Extract token from request
function extractToken(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Middleware to verify authentication
async function requireAuth(request) {
  const token = extractToken(request);
  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  return { user: decoded };
}

// Middleware to check role
function requireRole(user, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    return { error: 'Insufficient permissions', status: 403 };
  }
  return null;
}

function hasMinimumRole(userRole, minimumRole) {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minimumRole);
}

module.exports = {
  ROLE_HIERARCHY,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractToken,
  requireAuth,
  requireRole,
  hasMinimumRole
};
