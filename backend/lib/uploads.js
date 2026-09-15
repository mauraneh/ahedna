const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOAD_ROOT = path.resolve(__dirname, '../uploads');
const IMAGE_FOLDER = 'images';
const EVENT_MEDIA_FOLDER = 'event-media';
const MAX_IMAGE_SIZE_BYTES = Number(process.env.MAX_IMAGE_SIZE_BYTES || 5 * 1024 * 1024);

const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const EVENT_MEDIA_TYPES = {
  ...IMAGE_TYPES,
  'application/pdf': '.pdf',
};

function hasImageSignature(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) {
    return false;
  }

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  if (mimeType === 'image/gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }

  return false;
}

function hasEventMediaSignature(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    return Buffer.isBuffer(buffer) && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  return hasImageSignature(buffer, mimeType);
}

function normalizeBase64(dataBase64, label = 'Image') {
  if (typeof dataBase64 !== 'string') {
    throw new Error(`${label} data is required`);
  }

  const cleaned = dataBase64.replace(/\s/g, '');

  if (!cleaned || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned) || cleaned.length % 4 !== 0) {
    throw new Error(`${label} data is invalid`);
  }

  return cleaned;
}

function ensureUploadDirectory(folder = IMAGE_FOLDER) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true });
}

function sanitizeBaseName(fileName, fallbackName = 'image') {
  const baseName = path.parse(fileName || fallbackName).name;
  const cleaned = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return cleaned || fallbackName;
}

function saveBase64Image({ fileName, mimeType, dataBase64 }) {
  const extension = IMAGE_TYPES[mimeType];

  if (!extension) {
    throw new Error('Unsupported image format');
  }

  const buffer = Buffer.from(normalizeBase64(dataBase64), 'base64');

  if (!buffer.length) {
    throw new Error('Image data is invalid');
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image is too large');
  }

  if (!hasImageSignature(buffer, mimeType)) {
    throw new Error('Image content does not match the declared format');
  }

  ensureUploadDirectory();

  const fileBaseName = sanitizeBaseName(fileName);
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${fileBaseName}${extension}`;
  const absolutePath = path.join(UPLOAD_ROOT, IMAGE_FOLDER, uniqueName);

  fs.writeFileSync(absolutePath, buffer);

  return `/api/uploads/${IMAGE_FOLDER}/${uniqueName}`;
}

function saveBase64EventMedia({ fileName, mimeType, dataBase64 }) {
  const extension = EVENT_MEDIA_TYPES[mimeType];

  if (!extension) {
    throw new Error('Unsupported event media format');
  }

  const buffer = Buffer.from(normalizeBase64(dataBase64, 'Event media'), 'base64');

  if (!buffer.length) {
    throw new Error('Event media data is invalid');
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Event media is too large');
  }

  if (!hasEventMediaSignature(buffer, mimeType)) {
    throw new Error('Event media content does not match the declared format');
  }

  ensureUploadDirectory(EVENT_MEDIA_FOLDER);

  const fileBaseName = sanitizeBaseName(fileName, 'event-document');
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${fileBaseName}${extension}`;
  const absolutePath = path.join(UPLOAD_ROOT, EVENT_MEDIA_FOLDER, uniqueName);

  fs.writeFileSync(absolutePath, buffer);

  return `/api/uploads/${EVENT_MEDIA_FOLDER}/${uniqueName}`;
}

function resolveUploadPath(requestedPath) {
  const cleanPath = requestedPath
    .split('/')
    .filter(Boolean)
    .join(path.sep);

  const absolutePath = path.resolve(UPLOAD_ROOT, cleanPath);
  const uploadRootWithSep = `${UPLOAD_ROOT}${path.sep}`;

  if (absolutePath !== UPLOAD_ROOT && !absolutePath.startsWith(uploadRootWithSep)) {
    return null;
  }

  return absolutePath;
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

module.exports = {
  ensureUploadDirectory,
  saveBase64Image,
  saveBase64EventMedia,
  resolveUploadPath,
  getMimeType,
};
