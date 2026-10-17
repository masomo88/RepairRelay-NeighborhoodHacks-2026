export const CATEGORIES = Object.freeze({
  bikes: 'Bikes',
  textiles: 'Clothing & textiles',
  furniture: 'Small furniture',
  electronics: 'Low-voltage electronics',
  household: 'Household items'
});

const OUTCOMES = new Set(['pending', 'repaired', 'unresolved', 'recycled']);
const DURATIONS = new Set([20, 40, 60]);

function text(value, label, limit, required = true) {
  const result = String(value ?? '').trim();
  if ((required && !result) || result.length > limit) throw new Error(label + ' must be ' + (required ? '1–' : '0–') + limit + ' characters.');
  return result;
}

function dateString(value) {
  const date = String(value ?? '');
  const parsed = new Date(date + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Choose a valid event date.');
  return date;
}

function timeMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value ?? ''));
  if (!match) throw new Error('Choose a valid start time.');
  return Number(match[1]) * 60 + Number(match[2]);
}

function array(value, label, maximum) {
  if (!Array.isArray(value) || value.length > maximum) throw new Error(label + ' must be a list of at most ' + maximum + '.');
  return value;
}

function unique(items, label) {
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error(label + ' IDs must be unique.');
}

export function validateBoard(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Provide a repair-day board.');
  const sourceEvent = input.event ?? {};
  const start = text(sourceEvent.start, 'Start time', 5);
  const duration = Number(sourceEvent.duration);
  if (!Number.isInteger(duration) || duration < 60 || duration > 360 || duration % 20 !== 0) throw new Error('Event length must be 60–360 minutes in 20-minute steps.');
  if (timeMinutes(start) + duration > 1440) throw new Error('The event must finish on the same day.');
  const event = {
    title: text(sourceEvent.title, 'Event name', 70),
    place: text(sourceEvent.place, 'Location', 90),
    date: dateString(sourceEvent.date),
    start,
    duration
  };
  const requests = array(input.requests ?? [], 'Requests', 80).map((source, index) => {
    const category = String(source?.category ?? '');
    const minutes = Number(source?.minutes);
    const grams = Number(source?.grams);
    const outcome = String(source?.outcome ?? 'pending');
    if (!Object.hasOwn(CATEGORIES, category)) throw new Error('Request ' + (index + 1) + ' needs a category.');
    if (!DURATIONS.has(minutes)) throw new Error('Request ' + (index + 1) + ' needs a 20, 40 or 60 minute estimate.');
    if (!Number.isInteger(grams) || grams < 0 || grams > 50000) throw new Error('Request ' + (index + 1) + ' needs a valid weight in grams.');
    if (!OUTCOMES.has(outcome)) throw new Error('Request ' + (index + 1) + ' has an invalid outcome.');
    return {
      id: text(source?.id, 'Request ID', 70),
      item: text(source?.item, 'Item', 70),
      issue: text(source?.issue, 'Issue', 200, false),
      category,
      minutes,
      grams,
      urgent: source?.urgent === true,
      safety: source?.safety === true,
      outcome,
      sample: source?.sample === true
    };
  });
  const volunteers = array(input.volunteers ?? [], 'Volunteers', 30).map((source, index) => {
    const skills = array(source?.skills, 'Volunteer ' + (index + 1) + ' skills', 5).map(String);
    if (!skills.length || skills.some(skill => !Object.hasOwn(CATEGORIES, skill))) throw new Error('Volunteer ' + (index + 1) + ' needs a listed skill.');
    const capacity = Number(source?.capacity);
    if (!Number.isInteger(capacity) || capacity < 20 || capacity > duration || capacity % 20 !== 0) throw new Error('Volunteer ' + (index + 1) + ' needs valid available minutes.');
    return {
      id: text(source?.id, 'Volunteer ID', 70),
      alias: text(source?.alias, 'Volunteer alias', 50),
      skills: [...new Set(skills)],
      capacity,
      sample: source?.sample === true
    };
  });
  unique(requests, 'Request');
  unique(volunteers, 'Volunteer');
  return { event, requests, volunteers };
}

function clock(start, offset) {
  const total = timeMinutes(start) + offset;
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

export function makeSchedule(input) {
  const board = validateBoard(input);
  const busy = new Map(board.volunteers.map(person => [person.id, 0]));
  const candidates = board.requests
    .filter(request => request.outcome === 'pending')
    .sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.minutes - b.minutes || a.id.localeCompare(b.id));
  const assignments = [];
  const waitlist = [];
  const safetyReview = [];
  for (const request of candidates) {
    if (request.safety) {
      safetyReview.push(request);
      continue;
    }
    const eligible = board.volunteers
      .filter(person => person.skills.includes(request.category) && busy.get(person.id) + request.minutes <= person.capacity)
      .sort((a, b) => busy.get(a.id) / a.capacity - busy.get(b.id) / b.capacity || a.alias.localeCompare(b.alias));
    const person = eligible[0];
    if (!person) {
      const hasSkill = board.volunteers.some(volunteer => volunteer.skills.includes(request.category));
      waitlist.push({ ...request, reason: hasSkill ? 'capacity' : 'skill' });
      continue;
    }
    const offset = busy.get(person.id);
    assignments.push({
      requestId: request.id,
      item: request.item,
      category: request.category,
      volunteerId: person.id,
      volunteer: person.alias,
      start: clock(board.event.start, offset),
      end: clock(board.event.start, offset + request.minutes),
      minutes: request.minutes,
      sample: request.sample
    });
    busy.set(person.id, offset + request.minutes);
  }
  const outcomes = board.requests.filter(request => !request.sample && request.outcome !== 'pending');
  return {
    board,
    assignments,
    waitlist,
    safetyReview,
    volunteerLoad: board.volunteers.map(person => ({ id: person.id, alias: person.alias, booked: busy.get(person.id), available: person.capacity })),
    summary: {
      requests: board.requests.length,
      assigned: assignments.length,
      waiting: waitlist.length,
      safety: safetyReview.length,
      reportedRepairedItems: outcomes.filter(request => request.outcome === 'repaired').length,
      reportedRepairedGrams: outcomes.filter(request => request.outcome === 'repaired').reduce((sum, request) => sum + request.grams, 0)
    }
  };
}

