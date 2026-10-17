import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSchedule, validateBoard } from '../public/core.js';
import { createApp } from '../server.js';

const base = () => ({
  event: { title: 'Saturday repair day', place: 'Community room', date: '2026-10-22', start: '10:00', duration: 120 },
  requests: [
    { id: 'a', item: 'Blue bike', issue: 'Flat tyre', category: 'bikes', minutes: 40, grams: 8000, urgent: true, safety: false, outcome: 'pending', sample: false },
    { id: 'b', item: 'Coat', issue: 'Loose seam', category: 'textiles', minutes: 20, grams: 900, urgent: false, safety: false, outcome: 'pending', sample: false }
  ],
  volunteers: [
    { id: 'v', alias: 'Alex', skills: ['bikes'], capacity: 60, sample: false }
  ]
});

test('assigns by skill and leaves unmatched requests waiting', () => {
  const plan = makeSchedule(base());
  assert.equal(plan.assignments.length, 1);
  assert.equal(plan.assignments[0].start, '10:00');
  assert.equal(plan.assignments[0].end, '10:40');
  assert.equal(plan.waitlist[0].id, 'b');
  assert.equal(plan.waitlist[0].reason, 'skill');
});

test('holds safety cases, even with qualified category volunteer', () => {
  const board = base();
  board.requests[0].safety = true;
  const plan = makeSchedule(board);
  assert.equal(plan.assignments.length, 0);
  assert.equal(plan.safetyReview[0].id, 'a');
});

test('does not exceed volunteer capacity', () => {
  const board = base();
  board.requests.push({ ...board.requests[0], id: 'c', urgent: false });
  const plan = makeSchedule(board);
  assert.equal(plan.assignments.length, 1);
  assert.equal(plan.waitlist.length, 2);
  assert.equal(plan.waitlist.find(item => item.id === 'c').reason, 'capacity');
});

test('reported outcomes exclude sample cards', () => {
  const board = base();
  board.requests[0].outcome = 'repaired';
  board.requests[1].outcome = 'repaired';
  board.requests[1].sample = true;
  const plan = makeSchedule(board);
  assert.equal(plan.summary.reportedRepairedItems, 1);
  assert.equal(plan.summary.reportedRepairedGrams, 8000);
});

test('rejects invalid dates and duplicate IDs', () => {
  const board = base();
  board.event.date = '2026-02-30';
  assert.throws(() => validateBoard(board), /valid event date/);
  board.event.date = '2026-10-22';
  board.requests[1].id = 'a';
  assert.throws(() => validateBoard(board), /IDs must be unique/);
});

test('rejects inherited object keys as categories', () => {
  const board = base();
  board.requests[0].category = 'toString';
  assert.throws(() => validateBoard(board), /needs a category/);
});

test('HTTP API returns a schedule and reports invalid input', async () => {
  const server = createApp();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    const url = 'http://127.0.0.1:' + address.port + '/api/schedule';
    const ok = await fetch(url, { method: 'POST', body: JSON.stringify(base()) });
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).assignments.length, 1);
    const bad = await fetch(url, { method: 'POST', body: '{"bad":true}' });
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error, /Start time/);
    const videoPage = await fetch(url.replace('/api/schedule', '/video.html'));
    assert.equal(videoPage.status, 200);
    assert.match(await videoPage.text(), /Repair Relay demo video/);
    const video = await fetch(url.replace('/api/schedule', '/demo.webm'));
    assert.equal(video.status, 200);
    assert.match(video.headers.get('content-type'), /video\/webm/);
    await video.arrayBuffer();
    const unknown = await fetch(url.replace('/api/schedule', '/private.txt'));
    assert.equal(unknown.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});


