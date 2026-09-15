const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/test';

const { stringifyApiJson } = require('../lib/api-handler');

test('stringifyApiJson preserves the local hour of an event date', () => {
  const eventDate = new Date(2027, 0, 5, 10, 30, 0);
  const serialized = JSON.parse(stringifyApiJson({ event_date: eventDate }));

  assert.equal(serialized.event_date, '2027-01-05T10:30:00');
});

test('stringifyApiJson preserves nested event dates without changing other dates', () => {
  const eventDate = new Date(2027, 6, 12, 18, 45, 0);
  const createdAt = new Date('2027-07-12T16:45:00.000Z');
  const serialized = JSON.parse(
    stringifyApiJson({ events: [{ event_date: eventDate, created_at: createdAt }] })
  );

  assert.equal(serialized.events[0].event_date, '2027-07-12T18:45:00');
  assert.equal(serialized.events[0].created_at, createdAt.toISOString());
});
