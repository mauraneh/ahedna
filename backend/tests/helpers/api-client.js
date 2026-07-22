const { pool } = require('../../lib/db');
const { handleOptions, handleGet, handlePost, handlePut, handleDelete } = require('../../lib/api-handler');

const ORIGIN = 'http://localhost:4200';

const handlers = {
  OPTIONS: handleOptions,
  GET: handleGet,
  POST: handlePost,
  PUT: handlePut,
  DELETE: handleDelete,
};

function apiRequest(method, path, { body, token, origin = ORIGIN } = {}) {
  const headers = new Headers({ origin });

  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  if (body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  return new Request(`http://localhost/api/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function call(method, path, options) {
  const response = await handlers[method](apiRequest(method, path, options));
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : null,
  };
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.org`;
}

async function registerAndLogin(prefix, role) {
  const email = uniqueEmail(prefix);
  await call('POST', 'auth/register', { body: { email, password: 'longenoughpassword' } });

  if (role && role !== 'membre') {
    await pool.query('UPDATE users SET role = $1 WHERE email = $2', [role, email]);
  }

  const login = await call('POST', 'auth/login', { body: { email, password: 'longenoughpassword' } });
  return { token: login.body.token, user: login.body.user };
}

module.exports = {
  ORIGIN,
  apiRequest,
  call,
  uniqueEmail,
  registerAndLogin,
};
