const Fastify = require('fastify');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const backendPackage = require('./package.json');

for (const envPath of [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../.env.local'),
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const {
  handleOptions,
  handleGet,
  handlePost,
  handlePut,
  handleDelete,
} = require('./lib/api-handler');
const { verifyToken } = require('./lib/auth');
const { checkDatabaseHealth } = require('./lib/db');
const { createMonitoringState } = require('./lib/monitoring');
const {
  ensureUploadDirectory,
  saveBase64Image,
  resolveUploadPath,
  getMimeType,
} = require('./lib/uploads');

function normalizeHeaders(headers) {
  const normalized = {};

  for (const [key, value] of Object.entries(headers || {})) {
    if (value === undefined) {
      continue;
    }

    normalized[key] = Array.isArray(value) ? value.join(', ') : String(value);
  }

  return normalized;
}

function toAbsoluteUrl(request) {
  const protocol = request.headers['x-forwarded-proto'] || 'http';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost:3000';
  return `${protocol}://${host}${request.raw.url}`;
}

function toRequestInit(request) {
  const method = request.method.toUpperCase();
  const init = {
    method,
    headers: normalizeHeaders(request.headers),
  };

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && request.body !== undefined) {
    init.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
  }

  return init;
}

function createWebRequest(request) {
  return new Request(toAbsoluteUrl(request), toRequestInit(request));
}

async function sendWebResponse(reply, response) {
  reply.code(response.status);

  response.headers.forEach((value, key) => {
    reply.header(key, value);
  });

  const contentType = response.headers.get('content-type') || '';
  const bodyText = await response.text();

  if (!bodyText) {
    return reply.send();
  }

  if (contentType.includes('application/json')) {
    return reply.send(JSON.parse(bodyText));
  }

  return reply.send(bodyText);
}

async function dispatchApiRequest(request, reply) {
  const webRequest = createWebRequest(request);
  const method = request.method.toUpperCase();

  let response;

  switch (method) {
    case 'OPTIONS':
      response = await handleOptions(webRequest);
      break;
    case 'GET':
      response = await handleGet(webRequest);
      break;
    case 'POST':
      response = await handlePost(webRequest);
      break;
    case 'PUT':
      response = await handlePut(webRequest);
      break;
    case 'DELETE':
      response = await handleDelete(webRequest);
      break;
    default:
      response = new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      });
      break;
  }

  return sendWebResponse(reply, response);
}

function buildServer() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    bodyLimit: Number(process.env.BODY_LIMIT_BYTES || 10 * 1024 * 1024),
  });
  const monitoring = createMonitoringState({
    serviceName: 'AHEDNA API',
    version: backendPackage.version,
  });

  ensureUploadDirectory();

  fastify.addHook('onRequest', async (request, reply) => {
    monitoring.onRequestStart();
    reply.header('X-Request-Id', request.id);
  });

  fastify.addHook('onResponse', async (_request, reply) => {
    monitoring.onRequestComplete({ statusCode: reply.statusCode });
  });

  fastify.get('/', async (_request, reply) => {
    return reply.send({
      name: 'AHEDNA API',
      status: 'ok',
    });
  });

  fastify.get('/api/health/live', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');

    return reply.send({
      status: 'ok',
      service: 'AHEDNA API',
      version: backendPackage.version,
      timestamp: new Date().toISOString(),
    });
  });

  fastify.get('/api/health/ready', async (_request, reply) => {
    const database = await checkDatabaseHealth();

    reply.header('Cache-Control', 'no-store');

    if (!database.ok) {
      reply.code(503);
    }

    return reply.send({
      status: database.ok ? 'ready' : 'not_ready',
      service: 'AHEDNA API',
      version: backendPackage.version,
      timestamp: new Date().toISOString(),
      database,
    });
  });

  fastify.get('/api/health', async (_request, reply) => {
    const database = await checkDatabaseHealth();
    const snapshot = monitoring.getSnapshot({ database });

    reply.header('Cache-Control', 'no-store');

    if (!database.ok) {
      reply.code(503);
    }

    return reply.send(snapshot);
  });

  fastify.get('/api/metrics', async (_request, reply) => {
    const database = await checkDatabaseHealth();

    reply.header('Cache-Control', 'no-store');
    reply.type('text/plain; version=0.0.4; charset=utf-8');

    return reply.send(monitoring.getMetrics({ database }));
  });

  fastify.get('/api/uploads/*', async (request, reply) => {
    const uploadPath = resolveUploadPath(request.params['*'] || '');

    if (!uploadPath || !fs.existsSync(uploadPath) || !fs.statSync(uploadPath).isFile()) {
      return reply.code(404).send({ error: 'File not found' });
    }

    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    reply.header('X-Content-Type-Options', 'nosniff');
    return reply.type(getMimeType(uploadPath)).send(fs.createReadStream(uploadPath));
  });

  fastify.post('/api/uploads/images', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    try {
      const { file_name, mime_type, data_base64 } = request.body || {};
      const url = saveBase64Image({
        fileName: file_name,
        mimeType: mime_type,
        dataBase64: data_base64,
      });

      return reply.send({ url });
    } catch (error) {
      return reply.code(400).send({ error: error.message || 'Upload failed' });
    }
  });

  fastify.route({
    method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    url: '/api',
    handler: dispatchApiRequest,
  });

  fastify.route({
    method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    url: '/api/*',
    handler: dispatchApiRequest,
  });

  return fastify;
}

async function start() {
  const server = buildServer();

  try {
    await server.listen({
      host: '0.0.0.0',
      port: Number(process.env.PORT || 3000),
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = {
  buildServer,
};
