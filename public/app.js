import { CATEGORIES, makeSchedule, validateBoard } from './core.js';

const KEY = 'repair-relay-board-v1';
const example = {
  event: { title: 'Maple Street Repair Day', place: 'Community room, Maple Street', date: '2026-10-22', start: '10:00', duration: 180 },
  requests: [
    { id: 'ex-1', item: 'Commuter bicycle', issue: 'Flat rear tyre', category: 'bikes', minutes: 40, grams: 9000, urgent: true, safety: false, outcome: 'pending', sample: true },
    { id: 'ex-2', item: 'Winter jacket', issue: 'Loose sleeve seam', category: 'textiles', minutes: 20, grams: 750, urgent: false, safety: false, outcome: 'pending', sample: true },
    { id: 'ex-3', item: 'Table lamp', issue: 'Power cable damage', category: 'electronics', minutes: 40, grams: 900, urgent: false, safety: true, outcome: 'pending', sample: true },
    { id: 'ex-4', item: 'Wooden stool', issue: 'Wobbly leg', category: 'furniture', minutes: 40, grams: 3300, urgent: false, safety: false, outcome: 'pending', sample: true }
  ],
  volunteers: [
    { id: 'ex-v1', alias: 'Ari', skills: ['bikes', 'furniture'], capacity: 120, sample: true },
    { id: 'ex-v2', alias: 'Sam', skills: ['textiles'], capacity: 60, sample: true }
  ]
};

const $ = id => document.getElementById(id);
const empty = () => ({
  event: { title: 'My repair day', place: 'Community space', date: new Date().toISOString().slice(0, 10), start: '10:00', duration: 120 },
  requests: [],
  volunteers: []
});

let board;
try {
  board = validateBoard(JSON.parse(localStorage.getItem(KEY) || 'null'));
} catch {
  board = empty();
}

function hasUserWork() {
  return board.requests.length > 0 || board.volunteers.length > 0 || JSON.stringify(board.event) !== JSON.stringify(empty().event);
}

function uid() {
  return globalThis.crypto?.randomUUID?.() || String(Date.now()) + '-' + String(Math.random()).slice(2);
}
function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = String(content);
  return element;
}
function clear(element) { element.replaceChildren(); }
function chip(value, className = '') { return node('span', 'chip ' + className, value); }
function feedback(message, isError = false) {
  $('feedback').textContent = message;
  $('feedback').style.color = isError ? '#8a3e1b' : '#315749';
}
function save() {
  board = validateBoard(board);
  let persisted = true;
  try { localStorage.setItem(KEY, JSON.stringify(board)); }
  catch { persisted = false; feedback('Browser storage is unavailable. Export your board to keep it.', true); }
  render();
  return persisted;
}
function act(change) {
  const previous = structuredClone(board);
  try { change(); board = validateBoard(board); if (save()) feedback('Board updated.'); return true; }
  catch (error) { board = previous; render(); feedback(error.message || 'Could not update board.', true); return false; }
}
function card(title, detail, chips = []) {
  const article = node('article', 'card');
  const heading = node('div', 'card-head');
  const copy = node('div');
  copy.append(node('h4', '', title), node('p', '', detail));
  heading.append(copy);
  article.append(heading);
  if (chips.length) {
    const row = node('div', 'card-meta');
    chips.forEach(value => row.append(value));
    article.append(row);
  }
  return article;
}
function emptyCard(message) { return node('div', 'empty', message); }

function render() {
  let schedule;
  try { schedule = makeSchedule(board); }
  catch (error) { feedback(error.message, true); return; }
  const { assignments, waitlist, safetyReview, summary, volunteerLoad } = schedule;
  $('event-label').textContent = board.event.title.toUpperCase() + ' · ' + board.event.date;
  $('metric-requests').textContent = summary.requests;
  $('metric-matched').textContent = summary.assigned;
  $('metric-waiting').textContent = summary.waiting;
  $('metric-repaired').textContent = summary.reportedRepairedItems;
  $('metric-weight').textContent = (summary.reportedRepairedGrams / 1000).toFixed(2) + ' kg self-reported repaired item weight · sample cards excluded';
  $('match-count').textContent = assignments.length;
  $('request-count').textContent = board.requests.length;
  $('volunteer-count').textContent = board.volunteers.length;
  for (const [id, value] of Object.entries({ 'event-title': board.event.title, 'event-place': board.event.place, 'event-date': board.event.date, 'event-start': board.event.start, 'event-duration': board.event.duration })) $(id).value = value;
  updateCapacities();
  const assignmentList = $('assignment-list'); clear(assignmentList);
  if (!assignments.length) assignmentList.append(emptyCard('No matches yet. Add repair requests and volunteers with the right skills.'));
  assignments.forEach(entry => assignmentList.append(card(entry.item, entry.start + '–' + entry.end + ' · ' + entry.volunteer, [chip(CATEGORIES[entry.category]), chip(entry.minutes + ' min'), ...(entry.sample ? [chip('FICTIONAL EXAMPLE', 'sample')] : [])])));
  const requestList = $('request-list'); clear(requestList);
  if (!board.requests.length) requestList.append(emptyCard('No requests yet. Add the first item on the left.'));
  board.requests.forEach(request => {
    const article = card(request.item, request.issue || 'No issue description', [
      chip(CATEGORIES[request.category]), chip(request.minutes + ' min'),
      ...(request.urgent ? [chip('PRIORITY')] : []),
      ...(request.safety ? [chip('SAFETY REVIEW', 'safety')] : []),
      ...(request.sample ? [chip('FICTIONAL EXAMPLE', 'sample')] : [])
    ]);
    const actions = node('div', 'card-actions');
    const select = node('select');
    select.setAttribute('aria-label', 'Outcome for ' + request.item);
    for (const [value, label] of Object.entries({ pending: 'Pending', repaired: 'Repaired', unresolved: 'Unresolved', recycled: 'Recycled' })) {
      const option = node('option', '', label); option.value = value; select.append(option);
    }
    select.value = request.outcome;
    select.addEventListener('change', () => act(() => { request.outcome = select.value; }));
    const remove = node('button', 'mini-button', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove ' + request.item);
    remove.addEventListener('click', () => act(() => { board.requests = board.requests.filter(item => item.id !== request.id); }));
    actions.append(select, remove);
    article.append(actions);
    requestList.append(article);
  });
  const volunteerList = $('volunteer-list'); clear(volunteerList);
  if (!board.volunteers.length) volunteerList.append(emptyCard('No volunteers yet. An alias and at least one skill are enough.'));
  board.volunteers.forEach(person => {
    const load = volunteerLoad.find(item => item.id === person.id);
    const article = card(person.alias, load.booked + ' of ' + load.available + ' minutes booked', [
      ...person.skills.map(skill => chip(CATEGORIES[skill])),
      ...(person.sample ? [chip('FICTIONAL EXAMPLE', 'sample')] : [])
    ]);
    const actions = node('div', 'card-actions');
    const remove = node('button', 'mini-button', 'Remove volunteer');
    remove.type = 'button';
    remove.addEventListener('click', () => act(() => { board.volunteers = board.volunteers.filter(item => item.id !== person.id); }));
    actions.append(remove); article.append(actions); volunteerList.append(article);
  });
  const safetyList = $('safety-list'); clear(safetyList);
  safetyList.append(node('p', 'subhead', 'SAFETY REVIEW · ' + safetyReview.length));
  if (!safetyReview.length) safetyList.append(emptyCard('No items are flagged for safety review.'));
  safetyReview.forEach(item => safetyList.append(card(item.item, item.issue || 'Check with a qualified person', [chip('HOLD — NO AUTOMATIC MATCH', 'safety')])));
  const waitList = $('wait-list'); clear(waitList);
  waitList.append(node('p', 'subhead', 'WAITLIST · ' + waitlist.length));
  if (!waitlist.length) waitList.append(emptyCard('No unmatched requests.'));
  waitlist.forEach(item => {
    const detail = item.reason === 'skill'
      ? 'No volunteer lists ' + CATEGORIES[item.category] + ' as a skill · ' + item.minutes + ' min needed'
      : 'No ' + item.minutes + '-minute slot left with a volunteer skilled in ' + CATEGORIES[item.category];
    waitList.append(card(item.item, detail, [chip('WAITING', 'wait')]));
  });
}

function updateCapacities() {
  const select = $('volunteer-capacity');
  const previous = Number(select.value) || 60;
  clear(select);
  for (let minutes = 20; minutes <= Number(board.event.duration); minutes += 20) {
    const option = node('option', '', minutes + ' minutes'); option.value = String(minutes); select.append(option);
  }
  select.value = String(Math.min(previous, Number(board.event.duration)));
}

for (const [key, title] of Object.entries(CATEGORIES)) {
  const option = node('option', '', title); option.value = key; $('request-category').append(option);
  const label = node('label');
  const checkbox = node('input'); checkbox.type = 'checkbox'; checkbox.name = 'skills'; checkbox.value = key;
  label.append(checkbox, document.createTextNode(title)); $('skill-choices').append(label);
}
$('event-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  act(() => {
    const next = { title: data.get('title'), place: data.get('place'), date: data.get('date'), start: data.get('start'), duration: Number(data.get('duration')) };
    board = validateBoard({ ...board, event: next });
  });
});
$('request-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const success = act(() => {
    board.requests.push({ id: uid(), item: data.get('item'), issue: data.get('issue'), category: data.get('category'), minutes: Number(data.get('minutes')), grams: Number(data.get('grams') || 0), urgent: data.has('urgent'), safety: data.has('safety'), outcome: 'pending', sample: false });
  });
  if (success) form.reset();
});
$('volunteer-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const success = act(() => {
    board.volunteers.push({ id: uid(), alias: data.get('alias'), skills: data.getAll('skills'), capacity: Number(data.get('capacity')), sample: false });
  });
  if (success) form.reset();
});
$('load-example').addEventListener('click', () => {
  if (hasUserWork() && !confirm('Replace this board with the fictional example? Export a copy first if needed.')) {
    feedback('Example cancelled. Your board was kept.');
    return;
  }
  board = structuredClone(example); if (save()) feedback('Fictional example loaded. These entries do not count as actual results.');
  $('workspace').scrollIntoView({ behavior: 'smooth' });
});
$('reset-board').addEventListener('click', () => {
  if (confirm('Clear the board stored in this browser? Export a copy first if needed.')) {
    board = empty(); if (save()) feedback('Board cleared.');
  }
});
$('export-json').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(board, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = node('a'); link.href = url; link.download = 'repair-relay-board.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  feedback('Board exported as JSON.');
});
$('import-json').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 100000) throw new Error('Choose a JSON file under 100 KB.');
    const imported = validateBoard(JSON.parse(await file.text()));
    if (hasUserWork() && !confirm('Replace this board with the imported file? Export a copy first if needed.')) {
      feedback('Import cancelled. Your board was kept.');
    } else {
      board = imported;
      if (save()) feedback('Board imported.');
    }
  } catch (error) { feedback(error.message, true); }
  event.target.value = '';
});
$('print-plan').addEventListener('click', () => print());
render();


