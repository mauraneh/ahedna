export function isAdminUser({ req }) {
  return Boolean(req.user);
}

export function never() {
  return false;
}

export function normalizeSlug(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
