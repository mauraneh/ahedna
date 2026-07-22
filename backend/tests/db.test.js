const test = require('node:test');
const assert = require('node:assert/strict');

const { createPoolConfig, isConcurrentInitializationRace } = require('../lib/db');

// createPoolConfig takes an explicit URL (defaulting to process.env.DATABASE_URL) so these
// cases can be exercised without touching the real env var, which the shared `pool` singleton
// (and any other test file requiring lib/db for the first time) depends on.

test('createPoolConfig throws when no DATABASE_URL is given', () => {
  assert.throws(() => createPoolConfig(''), /DATABASE_URL is required/);
});

test('createPoolConfig defaults to port 5432 when the URL has none', () => {
  const config = createPoolConfig('postgres://user:pass@example.com/mydb');
  assert.equal(config.port, 5432);
  assert.equal(config.database, 'mydb');
});

test('createPoolConfig uses the explicit port from the URL when present', () => {
  assert.equal(createPoolConfig('postgres://user:pass@example.com:6543/mydb').port, 6543);
});

test('createPoolConfig disables SSL when sslmode is absent or "disable"', () => {
  assert.equal(createPoolConfig('postgres://user:pass@example.com/mydb').ssl, false);
  assert.equal(
    createPoolConfig('postgres://user:pass@example.com/mydb?sslmode=disable').ssl,
    false
  );
});

test('createPoolConfig enables SSL without strict verification for sslmode=require', () => {
  assert.deepEqual(
    createPoolConfig('postgres://user:pass@example.com/mydb?sslmode=require').ssl,
    { rejectUnauthorized: false }
  );
});

test('createPoolConfig enables strict SSL verification for verify-ca and verify-full', () => {
  assert.deepEqual(
    createPoolConfig('postgres://user:pass@example.com/mydb?sslmode=verify-ca').ssl,
    { rejectUnauthorized: true }
  );
  assert.deepEqual(
    createPoolConfig('postgres://user:pass@example.com/mydb?sslmode=verify-full').ssl,
    { rejectUnauthorized: true }
  );
});

test('createPoolConfig only enables channel binding when explicitly required', () => {
  assert.equal(
    createPoolConfig('postgres://user:pass@example.com/mydb?channel_binding=require')
      .enableChannelBinding,
    true
  );
  assert.equal(
    createPoolConfig('postgres://user:pass@example.com/mydb').enableChannelBinding,
    undefined
  );
});

test('createPoolConfig decodes percent-encoded credentials', () => {
  const config = createPoolConfig('postgres://user%40host:p%40ss@example.com/mydb');
  assert.equal(config.user, 'user@host');
  assert.equal(config.password, 'p@ss');
});

test('isConcurrentInitializationRace recognizes a concurrent catalog insert race', () => {
  assert.equal(
    isConcurrentInitializationRace({ code: '23505', table: 'pg_extension' }),
    true
  );
});

test('isConcurrentInitializationRace ignores unrelated unique-violation errors', () => {
  assert.equal(isConcurrentInitializationRace({ code: '23505', table: 'users' }), false);
});

test('isConcurrentInitializationRace ignores errors with a different code', () => {
  assert.equal(isConcurrentInitializationRace({ code: '42P01', table: 'pg_extension' }), false);
});

test('isConcurrentInitializationRace handles missing error details safely', () => {
  assert.equal(isConcurrentInitializationRace(null), false);
  assert.equal(isConcurrentInitializationRace({}), false);
});
