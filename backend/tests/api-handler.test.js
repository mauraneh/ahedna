const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.CORS_ORIGINS = 'http://localhost:4200';
process.env.NODE_ENV = 'test';

const { pool, initDatabase } = require('../lib/db');
const { ORIGIN, call, uniqueEmail, registerAndLogin } = require('./helpers/api-client');

test.before(async () => {
  await initDatabase();
});

test.after(async () => {
  await pool.end();
});

test('handleOptions returns CORS headers for an allowed origin and rejects unknown origins', async () => {
  const allowed = await call('OPTIONS', 'news');
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN);

  const rejected = await call('OPTIONS', 'news', { origin: 'https://evil.example' });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.body.error, 'Origin not allowed');
});

test('unknown routes fall back to a 404 without touching the database', async () => {
  const result = await call('GET', 'this-route-does-not-exist');
  assert.equal(result.status, 404);
  assert.equal(result.body.error, 'Endpoint not found');
});

test('protected routes reject requests without a valid token', async () => {
  const result = await call('GET', 'auth/me');
  assert.equal(result.status, 401);
  assert.equal(result.body.error, 'Authentication required');
});

test('auth/register enforces password length and email uniqueness', async () => {
  const email = uniqueEmail('register');

  const tooShort = await call('POST', 'auth/register', {
    body: { email, password: 'short' },
  });
  assert.equal(tooShort.status, 400);
  assert.match(tooShort.body.error, /at least 8 characters/);

  const created = await call('POST', 'auth/register', {
    body: { email, password: 'longenoughpassword', first_name: 'Test', last_name: 'User' },
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.user.role, 'membre');
  assert.ok(created.body.token);

  const duplicate = await call('POST', 'auth/register', {
    body: { email, password: 'longenoughpassword' },
  });
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.body.error, 'Email already registered');
});

test('auth/login rejects invalid credentials and accepts a registered user', async () => {
  const email = uniqueEmail('login');
  await call('POST', 'auth/register', {
    body: { email, password: 'longenoughpassword' },
  });

  const wrongPassword = await call('POST', 'auth/login', {
    body: { email, password: 'incorrect' },
  });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.body.error, 'Invalid credentials');

  const success = await call('POST', 'auth/login', {
    body: { email, password: 'longenoughpassword' },
  });
  assert.equal(success.status, 200);
  assert.ok(success.body.token);
  assert.equal(success.body.user.password_hash, undefined);
});

test('news creation requires the auteur or admin role', async () => {
  const membre = await registerAndLogin('membre', 'membre');
  const forbidden = await call('POST', 'news', {
    token: membre.token,
    body: { title: 'Titre', content: 'Contenu' },
  });
  assert.equal(forbidden.status, 403);

  const auteur = await registerAndLogin('auteur', 'auteur');
  const missingFields = await call('POST', 'news', {
    token: auteur.token,
    body: { title: '' },
  });
  assert.equal(missingFields.status, 400);
  assert.equal(missingFields.body.error, 'Title and content required');

  const created = await call('POST', 'news', {
    token: auteur.token,
    body: { title: 'Une actualite', content: 'Le contenu complet', published: false },
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.news.published, false);

  const draftId = created.body.news.id;

  const otherAuteur = await registerAndLogin('auteur2', 'auteur');
  const hiddenFromOthers = await call('GET', `news/${draftId}`, { token: otherAuteur.token });
  assert.equal(hiddenFromOthers.status, 404);

  const visibleToAuthor = await call('GET', `news/${draftId}`, { token: auteur.token });
  assert.equal(visibleToAuthor.status, 200);
  assert.equal(visibleToAuthor.body.news.id, draftId);
});

test('events require the admin role and participation status is validated', async () => {
  const auteur = await registerAndLogin('auteur-event', 'auteur');
  const forbidden = await call('POST', 'events', {
    token: auteur.token,
    body: { title: 'Un evenement', event_date: '2027-01-01T10:00:00.000Z' },
  });
  assert.equal(forbidden.status, 403);

  const admin = await registerAndLogin('admin-event', 'admin');
  const created = await call('POST', 'events', {
    token: admin.token,
    body: { title: 'Assemblee generale', event_date: '2027-01-01T10:00:00.000Z' },
  });
  assert.equal(created.status, 200);
  const eventId = created.body.event.id;

  const membre = await registerAndLogin('membre-event', 'membre');
  const invalidStatus = await call('POST', `events/${eventId}/participation`, {
    token: membre.token,
    body: { status: 'maybe' },
  });
  assert.equal(invalidStatus.status, 400);
  assert.equal(invalidStatus.body.error, 'Invalid participation status');

  const attending = await call('POST', `events/${eventId}/participation`, {
    token: membre.token,
    body: { status: 'attending' },
  });
  assert.equal(attending.status, 200);

  const eventDetail = await call('GET', `events/${eventId}`, { token: membre.token });
  assert.equal(eventDetail.body.event.participant_count, 1);
});

test('forum topics require authentication and non-empty content', async () => {
  const membre = await registerAndLogin('forum-membre', 'membre');

  const empty = await call('POST', 'forum/topics', {
    token: membre.token,
    body: { title: 'Sujet', content: '' },
  });
  assert.equal(empty.status, 400);

  const created = await call('POST', 'forum/topics', {
    token: membre.token,
    body: { title: 'Un sujet', content: 'Un premier message' },
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.topic.validated, false);

  const other = await registerAndLogin('forum-other', 'membre');
  const hidden = await call('GET', `forum/topics/${created.body.topic.id}/messages`, {
    token: other.token,
  });
  assert.equal(hidden.status, 404);
});

test('profile update rejects duplicate emails and account deletion requires email confirmation', async () => {
  const first = await registerAndLogin('profile-a', 'membre');
  const second = await registerAndLogin('profile-b', 'membre');

  const duplicateEmail = await call('PUT', 'profile/me', {
    token: second.token,
    body: { email: first.user.email },
  });
  assert.equal(duplicateEmail.status, 400);
  assert.equal(duplicateEmail.body.error, 'Email already registered');

  const wrongConfirmation = await call('DELETE', 'profile/me', {
    token: second.token,
    body: { confirm_email: 'not-the-right-email@example.org' },
  });
  assert.equal(wrongConfirmation.status, 400);

  const confirmedDeletion = await call('DELETE', 'profile/me', {
    token: second.token,
    body: { confirm_email: second.user.email },
  });
  assert.equal(confirmedDeletion.status, 200);

  const meAfterDeletion = await call('GET', 'auth/me', { token: second.token });
  assert.equal(meAfterDeletion.status, 404);
});

test('admin can update a user role but cannot be bypassed by a non-admin', async () => {
  const admin = await registerAndLogin('admin-role', 'admin');
  const membre = await registerAndLogin('membre-role', 'membre');

  const forbidden = await call('PUT', `users/${membre.user.id}/role`, {
    token: membre.token,
    body: { role: 'admin' },
  });
  assert.equal(forbidden.status, 403);

  const invalidRole = await call('PUT', `users/${membre.user.id}/role`, {
    token: admin.token,
    body: { role: 'superadmin' },
  });
  assert.equal(invalidRole.status, 400);

  const updated = await call('PUT', `users/${membre.user.id}/role`, {
    token: admin.token,
    body: { role: 'auteur' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.role, 'auteur');
});

test('only admins can list all users or read the admin overview', async () => {
  const membre = await registerAndLogin('users-list-membre', 'membre');
  const admin = await registerAndLogin('users-list-admin', 'admin');

  const forbiddenUsers = await call('GET', 'users', { token: membre.token });
  assert.equal(forbiddenUsers.status, 403);

  const users = await call('GET', 'users', { token: admin.token });
  assert.equal(users.status, 200);
  assert.ok(Array.isArray(users.body.users));

  const forbiddenOverview = await call('GET', 'admin/overview', { token: membre.token });
  assert.equal(forbiddenOverview.status, 403);

  const overview = await call('GET', 'admin/overview', { token: admin.token });
  assert.equal(overview.status, 200);
  assert.ok('users' in overview.body.stats);
});

test('gallery photo uploads require an active membership or admin role', async () => {
  const admin = await registerAndLogin('gallery-admin', 'admin');
  const event = await call('POST', 'events', {
    token: admin.token,
    body: {
      title: 'Sortie memoire',
      event_date: '2027-03-01T10:00:00.000Z',
      gallery_enabled: true,
    },
  });
  assert.equal(event.status, 200);
  const eventId = event.body.event.id;

  const membre = await registerAndLogin('gallery-membre', 'membre');
  const rejected = await call('POST', `gallery/events/${eventId}/photos`, {
    token: membre.token,
    body: { photo_url: '/api/uploads/images/photo.png' },
  });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.body.error, 'Active membership required to upload photos');

  await pool.query(
    `INSERT INTO memberships (user_id, status) VALUES ($1, 'active')`,
    [membre.user.id]
  );

  const uploaded = await call('POST', `gallery/events/${eventId}/photos`, {
    token: membre.token,
    body: { photo_url: '/api/uploads/images/photo.png', description: 'Une photo' },
  });
  assert.equal(uploaded.status, 200);
  assert.equal(uploaded.body.photo.validated, false);
  assert.equal(uploaded.body.message, 'Photo uploaded, awaiting validation');

  const photoId = uploaded.body.photo.id;

  const pendingForMembre = await call('GET', 'gallery/event-photos', { token: membre.token });
  assert.equal(pendingForMembre.status, 403);

  const pendingForAdmin = await call('GET', 'gallery/event-photos', { token: admin.token });
  assert.equal(pendingForAdmin.status, 200);
  assert.ok(pendingForAdmin.body.photos.some((photo) => photo.id === photoId));

  const validated = await call('PUT', `gallery/event-photos/${photoId}/validate`, {
    token: admin.token,
    body: { validated: true },
  });
  assert.equal(validated.status, 200);
  assert.equal(validated.body.photo.validated, true);

  const publicGallery = await call('GET', `gallery/events`);
  assert.equal(publicGallery.status, 200);
  const galleryEvent = publicGallery.body.events.find((item) => item.id === eventId);
  assert.ok(galleryEvent);
  assert.equal(galleryEvent.photo_count, 1);

  const deleted = await call('DELETE', `gallery/event-photos/${photoId}`, { token: admin.token });
  assert.equal(deleted.status, 200);
});

test('an admin uploading a gallery photo is auto-validated', async () => {
  const admin = await registerAndLogin('gallery-admin-auto', 'admin');
  const event = await call('POST', 'events', {
    token: admin.token,
    body: {
      title: 'Assemblee',
      event_date: '2027-04-01T10:00:00.000Z',
      gallery_enabled: true,
    },
  });

  const uploaded = await call('POST', `gallery/events/${event.body.event.id}/photos`, {
    token: admin.token,
    body: { photo_url: '/api/uploads/images/photo.png' },
  });

  assert.equal(uploaded.status, 200);
  assert.equal(uploaded.body.photo.validated, true);
  assert.equal(uploaded.body.message, 'Photo uploaded successfully');
});

test('the standalone gallery endpoint stores photos pending validation', async () => {
  const membre = await registerAndLogin('gallery-standalone', 'membre');

  const missingUrl = await call('POST', 'gallery', {
    token: membre.token,
    body: {},
  });
  assert.equal(missingUrl.status, 400);

  const created = await call('POST', 'gallery', {
    token: membre.token,
    body: { photo_url: '/api/uploads/images/photo.png', description: 'Photo libre' },
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.photo.validated, false);

  const photoId = created.body.photo.id;

  const admin = await registerAndLogin('gallery-standalone-admin', 'admin');
  const validated = await call('PUT', `gallery/${photoId}/validate`, {
    token: admin.token,
    body: { validated: true },
  });
  assert.equal(validated.status, 200);

  const deleted = await call('DELETE', `gallery/${photoId}`, { token: admin.token });
  assert.equal(deleted.status, 200);
});

test('history chapters are readable by anyone and writable only by admins', async () => {
  const membre = await registerAndLogin('history-membre', 'membre');
  const admin = await registerAndLogin('history-admin', 'admin');

  const forbidden = await call('POST', 'history/chapters', {
    token: membre.token,
    body: { title: 'Chapitre', content: 'Contenu', chapter_order: 1 },
  });
  assert.equal(forbidden.status, 403);

  const missingFields = await call('POST', 'history/chapters', {
    token: admin.token,
    body: { title: 'Chapitre incomplet' },
  });
  assert.equal(missingFields.status, 400);

  const created = await call('POST', 'history/chapters', {
    token: admin.token,
    body: {
      title: 'Les origines',
      content: 'Contenu du chapitre',
      chapter_order: 1,
      year_start: 1962,
      year_end: 1962,
    },
  });
  assert.equal(created.status, 200);

  const publicList = await call('GET', 'history/chapters');
  assert.equal(publicList.status, 200);
  assert.ok(publicList.body.chapters.some((chapter) => chapter.id === created.body.chapter.id));
});

test('member documents are filtered according to the requesting user role', async () => {
  const membre = await registerAndLogin('documents-membre', 'membre');
  const admin = await registerAndLogin('documents-admin', 'admin');

  const membreDocs = await call('GET', 'profile/documents', { token: membre.token });
  assert.equal(membreDocs.status, 200);
  assert.ok(membreDocs.body.documents.every((doc) => doc.minimum_role === 'membre'));

  const adminDocs = await call('GET', 'profile/documents', { token: admin.token });
  assert.equal(adminDocs.status, 200);
  assert.ok(adminDocs.body.documents.length >= membreDocs.body.documents.length);
});

test('membership status reflects the latest membership row for the user', async () => {
  const membre = await registerAndLogin('membership-status', 'membre');

  const noMembership = await call('GET', 'memberships/my-status', { token: membre.token });
  assert.equal(noMembership.status, 200);
  assert.equal(noMembership.body.membership, null);

  await pool.query(`INSERT INTO memberships (user_id, status) VALUES ($1, 'pending')`, [
    membre.user.id,
  ]);

  const withMembership = await call('GET', 'memberships/my-status', { token: membre.token });
  assert.equal(withMembership.status, 200);
  assert.equal(withMembership.body.membership.status, 'pending');
});

test('news/import-public is restricted to admins', async () => {
  const membre = await registerAndLogin('import-news-membre', 'membre');

  const forbidden = await call('POST', 'news/import-public', {
    token: membre.token,
    body: { max_records: 1 },
  });
  assert.equal(forbidden.status, 403);
});

test('deleting an event also removes it from the events list', async () => {
  const admin = await registerAndLogin('event-delete-admin', 'admin');
  const created = await call('POST', 'events', {
    token: admin.token,
    body: { title: 'Evenement temporaire', event_date: '2027-05-01T10:00:00.000Z' },
  });

  const deleted = await call('DELETE', `events/${event_id_of(created)}`, { token: admin.token });
  assert.equal(deleted.status, 200);

  const list = await call('GET', 'events');
  assert.ok(!list.body.events.some((item) => item.id === event_id_of(created)));
});

test('news can be updated and deleted by their author, but not by other authors', async () => {
  const author = await registerAndLogin('news-owner', 'auteur');
  const otherAuthor = await registerAndLogin('news-other', 'auteur');
  const admin = await registerAndLogin('news-admin-crud', 'admin');

  const created = await call('POST', 'news', {
    token: author.token,
    body: { title: 'Titre original', content: 'Contenu original' },
  });
  const newsId = created.body.news.id;

  const forbiddenUpdate = await call('PUT', `news/${newsId}`, {
    token: otherAuthor.token,
    body: { title: 'Titre pirate', content: 'Contenu', published: false },
  });
  assert.equal(forbiddenUpdate.status, 404);

  const ownUpdate = await call('PUT', `news/${newsId}`, {
    token: author.token,
    body: { title: 'Titre modifie', content: 'Contenu modifie', published: true },
  });
  assert.equal(ownUpdate.status, 200);
  assert.equal(ownUpdate.body.news.title, 'Titre modifie');

  const forbiddenDelete = await call('DELETE', `news/${newsId}`, { token: otherAuthor.token });
  assert.equal(forbiddenDelete.status, 404);

  const adminUpdate = await call('PUT', `news/${newsId}`, {
    token: admin.token,
    body: { title: 'Titre admin', content: 'Contenu admin', published: true },
  });
  assert.equal(adminUpdate.status, 200);

  const deleted = await call('DELETE', `news/${newsId}`, { token: author.token });
  assert.equal(deleted.status, 200);

  const missing = await call('GET', `news/${newsId}`, { token: author.token });
  assert.equal(missing.status, 404);
});

test('events can be updated by an admin', async () => {
  const admin = await registerAndLogin('event-update-admin', 'admin');
  const created = await call('POST', 'events', {
    token: admin.token,
    body: { title: 'Avant', event_date: '2027-06-01T10:00:00.000Z' },
  });
  const eventId = created.body.event.id;

  const updated = await call('PUT', `events/${eventId}`, {
    token: admin.token,
    body: {
      title: 'Apres',
      event_date: '2027-06-02T10:00:00.000Z',
      type: 'upcoming',
      price_amount: 15,
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.event.title, 'Apres');

  const missing = await call('PUT', 'events/00000000-0000-0000-0000-000000000000', {
    token: admin.token,
    body: { title: 'X', event_date: '2027-06-02T10:00:00.000Z', type: 'upcoming' },
  });
  assert.equal(missing.status, 404);
});

test('forum topics can be posted to, validated and deleted by an admin', async () => {
  const membre = await registerAndLogin('forum-crud-membre', 'membre');
  const admin = await registerAndLogin('forum-crud-admin', 'admin');

  const topic = await call('POST', 'forum/topics', {
    token: membre.token,
    body: { title: 'Un sujet', content: 'Premier message' },
  });
  const topicId = topic.body.topic.id;

  const emptyMessage = await call('POST', `forum/topics/${topicId}/messages`, {
    token: membre.token,
    body: { content: '' },
  });
  assert.equal(emptyMessage.status, 400);

  const message = await call('POST', `forum/topics/${topicId}/messages`, {
    token: membre.token,
    body: { content: 'Un message de reponse' },
  });
  assert.equal(message.status, 200);

  const forbiddenValidate = await call('PUT', `forum/topics/${topicId}/validate`, {
    token: membre.token,
    body: { validated: true },
  });
  assert.equal(forbiddenValidate.status, 403);

  const validated = await call('PUT', `forum/topics/${topicId}/validate`, {
    token: admin.token,
    body: { validated: true },
  });
  assert.equal(validated.status, 200);
  assert.equal(validated.body.topic.validated, true);

  const publicTopics = await call('GET', 'forum/topics?validated=true');
  assert.ok(publicTopics.body.topics.some((item) => item.id === topicId));

  const deleted = await call('DELETE', `forum/topics/${topicId}`, { token: admin.token });
  assert.equal(deleted.status, 200);
});

test('a member can change their password with the correct current password', async () => {
  const membre = await registerAndLogin('password-change', 'membre');

  const wrongCurrent = await call('PUT', 'profile/password', {
    token: membre.token,
    body: { current_password: 'wrongpassword', new_password: 'brandnewpassword' },
  });
  assert.equal(wrongCurrent.status, 400);

  const tooShort = await call('PUT', 'profile/password', {
    token: membre.token,
    body: { current_password: 'longenoughpassword', new_password: 'short' },
  });
  assert.equal(tooShort.status, 400);

  const changed = await call('PUT', 'profile/password', {
    token: membre.token,
    body: { current_password: 'longenoughpassword', new_password: 'brandnewpassword' },
  });
  assert.equal(changed.status, 200);

  const loginWithNewPassword = await call('POST', 'auth/login', {
    body: { email: membre.user.email, password: 'brandnewpassword' },
  });
  assert.equal(loginWithNewPassword.status, 200);
});

test('auth/login and auth/register validate required fields', async () => {
  const missingLogin = await call('POST', 'auth/login', { body: { email: '' } });
  assert.equal(missingLogin.status, 400);
  assert.equal(missingLogin.body.error, 'Email and password required');

  const email = uniqueEmail('want-membership');
  const registered = await call('POST', 'auth/register', {
    body: { email, password: 'longenoughpassword', want_membership: true },
  });
  assert.equal(registered.status, 200);

  const login = await call('POST', 'auth/login', { body: { email, password: 'longenoughpassword' } });
  const status = await call('GET', 'memberships/my-status', { token: login.body.token });
  assert.equal(status.body.membership.status, 'pending');
});

test('GET news exposes drafts to their author and to admins, but not to the public', async () => {
  const auteur = await registerAndLogin('news-visibility-auteur', 'auteur');
  const admin = await registerAndLogin('news-visibility-admin', 'admin');

  const draft = await call('POST', 'news', {
    token: auteur.token,
    body: { title: 'Brouillon', content: 'Contenu du brouillon', published: false },
  });
  const draftId = draft.body.news.id;

  // Deliberately omits `published=true`: that flag triggers the live external
  // news-aggregation fallback (already covered by news-aggregation.test.js), which
  // would make this test slow and network-dependent for no added assertion value.
  const asPublic = await call('GET', 'news');
  assert.ok(!asPublic.body.news.some((item) => item.id === draftId));

  const asAuthor = await call('GET', 'news', { token: auteur.token });
  assert.ok(asAuthor.body.news.some((item) => item.id === draftId));

  const asAdmin = await call('GET', 'news', { token: admin.token });
  assert.ok(asAdmin.body.news.some((item) => item.id === draftId));
});

test('GET gallery only reveals unvalidated photos to admins', async () => {
  const membre = await registerAndLogin('gallery-visibility-membre', 'membre');
  const admin = await registerAndLogin('gallery-visibility-admin', 'admin');

  const created = await call('POST', 'gallery', {
    token: membre.token,
    body: { photo_url: '/api/uploads/images/pending.png' },
  });
  const photoId = created.body.photo.id;

  const asMembre = await call('GET', 'gallery', { token: membre.token });
  assert.ok(!asMembre.body.photos.some((photo) => photo.id === photoId));

  const asAdmin = await call('GET', 'gallery', { token: admin.token });
  assert.ok(asAdmin.body.photos.some((photo) => photo.id === photoId));
});

test('GET forum/topics without a validated filter shows everything only to admins', async () => {
  const membre = await registerAndLogin('forum-visibility-membre', 'membre');
  const admin = await registerAndLogin('forum-visibility-admin', 'admin');

  const created = await call('POST', 'forum/topics', {
    token: membre.token,
    body: { title: 'Sujet en attente', content: 'Contenu' },
  });
  const topicId = created.body.topic.id;

  const asMembre = await call('GET', 'forum/topics', { token: membre.token });
  assert.ok(!asMembre.body.topics.some((topic) => topic.id === topicId));

  const asAdmin = await call('GET', 'forum/topics', { token: admin.token });
  assert.ok(asAdmin.body.topics.some((topic) => topic.id === topicId));
});

test('GET profile/me returns the caller profile and their membership', async () => {
  const membre = await registerAndLogin('profile-me-get', 'membre');
  const result = await call('GET', 'profile/me', { token: membre.token });

  assert.equal(result.status, 200);
  assert.equal(result.body.profile.id, membre.user.id);
  assert.equal(result.body.membership, null);
});

test('PUT profile/me updates the caller profile and returns a refreshed token', async () => {
  const membre = await registerAndLogin('profile-me-put', 'membre');

  const updated = await call('PUT', 'profile/me', {
    token: membre.token,
    body: {
      email: membre.user.email,
      first_name: 'Prenom',
      last_name: 'Nom',
      city: 'Perigueux',
    },
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.profile.first_name, 'Prenom');
  assert.equal(updated.body.profile.city, 'Perigueux');
  assert.ok(updated.body.token);
});

test('event participation and gallery event photo uploads reject a non-existent event', async () => {
  const membre = await registerAndLogin('missing-event-membre', 'membre');
  const missingId = '00000000-0000-0000-0000-000000000000';

  const participation = await call('POST', `events/${missingId}/participation`, {
    token: membre.token,
    body: { status: 'attending' },
  });
  assert.equal(participation.status, 404);

  const upload = await call('POST', `gallery/events/${missingId}/photos`, {
    token: membre.token,
    body: { photo_url: '/api/uploads/images/photo.png' },
  });
  assert.equal(upload.status, 404);
});

test('gallery event photo uploads require an open gallery and a photo URL', async () => {
  const admin = await registerAndLogin('gallery-closed-admin', 'admin');
  const membre = await registerAndLogin('gallery-closed-membre', 'membre');

  const event = await call('POST', 'events', {
    token: admin.token,
    body: { title: 'Galerie fermee', event_date: '2027-07-01T10:00:00.000Z' },
  });
  const eventId = event.body.event.id;

  const galleryClosed = await call('POST', `gallery/events/${eventId}/photos`, {
    token: membre.token,
    body: { photo_url: '/api/uploads/images/photo.png' },
  });
  assert.equal(galleryClosed.status, 400);
  assert.equal(galleryClosed.body.error, 'Gallery is not open for this event');

  const missingUrl = await call('POST', `gallery/events/${eventId}/photos`, {
    token: admin.token,
    body: {},
  });
  assert.equal(missingUrl.status, 400);
});

test('validation endpoints are admin-only and reject unknown ids', async () => {
  const membre = await registerAndLogin('validate-membre', 'membre');
  const admin = await registerAndLogin('validate-admin', 'admin');
  const missingId = '00000000-0000-0000-0000-000000000000';

  const forbiddenEventPhoto = await call('PUT', `gallery/event-photos/${missingId}/validate`, {
    token: membre.token,
    body: { validated: true },
  });
  assert.equal(forbiddenEventPhoto.status, 403);

  const missingEventPhoto = await call('PUT', `gallery/event-photos/${missingId}/validate`, {
    token: admin.token,
    body: { validated: true },
  });
  assert.equal(missingEventPhoto.status, 404);

  const forbiddenGalleryPhoto = await call('PUT', `gallery/${missingId}/validate`, {
    token: membre.token,
    body: { validated: true },
  });
  assert.equal(forbiddenGalleryPhoto.status, 403);

  const missingGalleryPhoto = await call('PUT', `gallery/${missingId}/validate`, {
    token: admin.token,
    body: { validated: true },
  });
  assert.equal(missingGalleryPhoto.status, 404);

  const missingTopic = await call('PUT', `forum/topics/${missingId}/validate`, {
    token: admin.token,
    body: { validated: true },
  });
  assert.equal(missingTopic.status, 404);
});

test('PUT users/:id/role rejects an unknown user id', async () => {
  const admin = await registerAndLogin('role-missing-admin', 'admin');
  const missingId = '00000000-0000-0000-0000-000000000000';

  const result = await call('PUT', `users/${missingId}/role`, {
    token: admin.token,
    body: { role: 'auteur' },
  });
  assert.equal(result.status, 404);
});

test('PUT news/:id and events/:id enforce role checks before validating input', async () => {
  const membre = await registerAndLogin('news-role-membre', 'membre');
  const auteur = await registerAndLogin('event-role-auteur', 'auteur');
  const admin = await registerAndLogin('news-events-admin', 'admin');

  const news = await call('POST', 'news', {
    token: admin.token,
    body: { title: 'Titre', content: 'Contenu' },
  });
  const forbiddenNewsUpdate = await call('PUT', `news/${news.body.news.id}`, {
    token: membre.token,
    body: { title: 'X', content: 'Y', published: false },
  });
  assert.equal(forbiddenNewsUpdate.status, 403);

  const event = await call('POST', 'events', {
    token: admin.token,
    body: { title: 'Titre', event_date: '2027-08-01T10:00:00.000Z' },
  });
  const forbiddenEventUpdate = await call('PUT', `events/${event.body.event.id}`, {
    token: auteur.token,
    body: { title: 'X', event_date: '2027-08-02T10:00:00.000Z', type: 'upcoming' },
  });
  assert.equal(forbiddenEventUpdate.status, 403);
});

test('DELETE endpoints enforce admin-only access and reject unknown ids', async () => {
  const membre = await registerAndLogin('delete-checks-membre', 'membre');
  const admin = await registerAndLogin('delete-checks-admin', 'admin');
  const missingId = '00000000-0000-0000-0000-000000000000';

  const forbiddenEventDelete = await call('DELETE', `events/${missingId}`, {
    token: membre.token,
  });
  assert.equal(forbiddenEventDelete.status, 403);

  const missingEventDelete = await call('DELETE', `events/${missingId}`, { token: admin.token });
  assert.equal(missingEventDelete.status, 404);

  const forbiddenTopicDelete = await call('DELETE', `forum/topics/${missingId}`, {
    token: membre.token,
  });
  assert.equal(forbiddenTopicDelete.status, 403);

  const missingTopicDelete = await call('DELETE', `forum/topics/${missingId}`, {
    token: admin.token,
  });
  assert.equal(missingTopicDelete.status, 404);

  const forbiddenGalleryDelete = await call('DELETE', `gallery/${missingId}`, {
    token: membre.token,
  });
  assert.equal(forbiddenGalleryDelete.status, 403);

  const missingGalleryDelete = await call('DELETE', `gallery/${missingId}`, { token: admin.token });
  assert.equal(missingGalleryDelete.status, 404);

  const missingEventPhotoDelete = await call('DELETE', `gallery/event-photos/${missingId}`, {
    token: admin.token,
  });
  assert.equal(missingEventPhotoDelete.status, 404);
});

test('DELETE users/:id lets an admin remove another account but not their own via this route', async () => {
  const admin = await registerAndLogin('delete-user-admin', 'admin');
  const membre = await registerAndLogin('delete-user-target', 'membre');
  const missingId = '00000000-0000-0000-0000-000000000000';

  const forbidden = await call('DELETE', `users/${membre.user.id}`, { token: membre.token });
  assert.equal(forbidden.status, 403);

  const selfDelete = await call('DELETE', `users/${admin.user.id}`, { token: admin.token });
  assert.equal(selfDelete.status, 400);
  assert.equal(selfDelete.body.error, 'Use your profile page to delete your own account');

  const missing = await call('DELETE', `users/${missingId}`, { token: admin.token });
  assert.equal(missing.status, 404);

  const deleted = await call('DELETE', `users/${membre.user.id}`, { token: admin.token });
  assert.equal(deleted.status, 200);
});

function event_id_of(response) {
  return response.body.event.id;
}
