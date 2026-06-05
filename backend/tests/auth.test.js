const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'unit-test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const {
  generateToken,
  verifyToken,
  extractToken,
  requireAuth,
  requireRole,
  hasMinimumRole,
} = require('../lib/auth');

test('generateToken and verifyToken keep the useful user claims', () => {
  const token = generateToken({
    id: 'user-123',
    email: 'contact@example.org',
    role: 'admin',
  });

  const payload = verifyToken(token);

  assert.equal(payload.id, 'user-123');
  assert.equal(payload.email, 'contact@example.org');
  assert.equal(payload.role, 'admin');
});

test('extractToken reads a bearer token from the request headers', () => {
  const request = {
    headers: new Headers({
      authorization: 'Bearer signed-token',
    }),
  };

  assert.equal(extractToken(request), 'signed-token');
});

test('requireAuth rejects missing or invalid tokens', async () => {
  const missingTokenResult = await requireAuth({
    headers: new Headers(),
  });

  const invalidTokenResult = await requireAuth({
    headers: new Headers({
      authorization: 'Bearer definitely-invalid',
    }),
  });

  assert.deepEqual(missingTokenResult, {
    error: 'Authentication required',
    status: 401,
  });
  assert.deepEqual(invalidTokenResult, {
    error: 'Invalid or expired token',
    status: 401,
  });
});

test('requireRole and hasMinimumRole enforce the role hierarchy', () => {
  assert.equal(requireRole({ role: 'membre' }, ['admin'])?.status, 403);
  assert.equal(requireRole({ role: 'admin' }, ['admin']), null);
  assert.equal(hasMinimumRole('admin', 'auteur'), true);
  assert.equal(hasMinimumRole('auteur', 'admin'), false);
});
