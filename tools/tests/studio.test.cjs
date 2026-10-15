const test = require('node:test');
const assert = require('node:assert/strict');
const Studio = require('../../mobile/studio.js');
const Goals = require('../../mobile/goals.js');

test('assigning a phase does not touch the other sets', () => {
  const session = {shots: [{set_id: 1, phase: 'warm'}, {set_id: 2, result: {value: 'X'}}, {set_id: 1}]};
  Studio.tag(session, 'score', {sets: [1]});
  assert.equal(session.shots[0].phase, 'score');
  assert.equal(session.shots[2].phase, 'score');
  assert.equal(session.shots[1].phase, undefined);
  assert.equal(session.shots[1].result.value, 'X');
  Studio.tag(session, '', {sets: [1]});
  assert.equal(session.shots[0].phase, undefined);
  assert.equal(session.shots[1].phase, undefined);
});

test('tagging can mark individual arrows or a whole session', () => {
  const session = {shots: [
    {set_id: 1, t_ms: 10, phase: 'warm'},
    {set_id: 1, t_ms: 20},
    {set_id: 2, t_ms: 30}
  ]};
  Studio.tag(session, 'score', {times: [20]});
  assert.equal(session.shots[0].phase, 'warm');
  assert.equal(session.shots[1].phase, 'score');
  assert.equal(session.shots[2].phase, undefined);
  Studio.tag(session, 'warm', {all: true});
  session.shots.forEach(s => assert.equal(s.phase, 'warm'));
  Studio.tag(session, '', {sets: [2]});
  assert.equal(session.shots[0].phase, 'warm');
  assert.equal(session.shots[2].phase, undefined);
});

test('dayKey uses the local calendar day', () => {
  const ms = Date.UTC(2026, 9, 13, 15, 0, 0);
  const d = new Date(ms);
  assert.equal(Studio.dayKey(ms), d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate());
  assert.equal(Studio.dayKey(NaN), '');
  assert.equal(Studio.dayKey('nope'), '');
});

test('performance shows five plain measures and leaves a thin sample blank', () => {
  const shots = [];
  for (let set = 1; set <= 4; set++) for (let j = 0; j < 3; j++) shots.push({set_id: set, aim_score: 80, result: {value: set % 2 ? 'X' : '9', impact: {x: 0.05 * j, y: 0.05}}});
  const by = Object.fromEntries(Studio.performance([{shots}]).map(a => [a.id, a]));
  assert.deepEqual(Object.keys(by), ['points', 'center', 'group', 'stability', 'steady']);
  assert.equal(by.points.text, '9,5');
  assert.equal(by.points.value, 87.5);
  assert.equal(by.center.text, '50%');
  assert.equal(by.group.text, '0,3 cm');
  assert.equal(by.group.value, 100);
  assert.equal(by.stability.text, '80');
  assert.equal(by.steady.text, '±0,5');
  const thin = Studio.performance([{shots: shots.slice(0, 4)}]);
  thin.forEach(a => { assert.equal(a.value, null); assert.equal(a.thin, true); assert.equal(a.text, '–'); });
  assert.ok(Studio.performance([]).every(a => a.thin));
});

test('a shared format needs every scored session in the same one', () => {
  assert.equal(Studio.sharedFormat([{mode: 'Indoor', shots: [{result: {value: 'X'}}]}]), 'vegas');
  assert.equal(Studio.sharedFormat([{mode: 'Indoor', scoreFormat: 'wa', shots: [{result: {value: '10'}}]}]), 'wa');
  assert.equal(Studio.sharedFormat([
    {mode: 'Indoor', scoreFormat: 'wa', shots: [{result: {value: 'X'}}]},
    {mode: 'Indoor', scoreFormat: 'lancaster', shots: [{result: {value: '11'}}]}
  ]), null);
});

test('the training streak counts days in a row and lays out the week', () => {
  const day = d => new Date(2026, 9, d, 18).getTime();
  const sessions = [5, 6, 12, 13, 14].map(d => ({id: day(d), shots: [{}, {}]}));
  sessions.push({id: day(9), shots: [{candidate: true}]});
  const t = Studio.trainingStreak(sessions, new Date(2026, 9, 14, 20));
  assert.equal(t.current, 3);
  assert.equal(t.best, 3);
  assert.deepEqual(t.week.map(c => c.run), [false, false, false, false, true, true, true]);
  assert.deepEqual(t.week.map(c => c.dow), [3, 4, 5, 6, 0, 1, 2]);
  assert.ok(t.week.every(c => !c.future));
  assert.equal(t.week[6].today, true);
  assert.equal(t.two.length, 14);
  assert.equal(t.two[4].on, true);
  assert.equal(t.two[4].run, false);
  assert.equal(t.two[8].on, false);
  assert.equal(t.weeks.length, 4);
  assert.deepEqual(t.weeks[3].map(c => c.run), [true, true, true, false, false, false, false]);
  const next = Studio.trainingStreak(sessions, new Date(2026, 9, 15, 9));
  assert.equal(next.current, 3);
  assert.equal(next.week[6].today, true);
  assert.equal(next.week[6].run, false);
  assert.deepEqual(next.week.map(c => c.run), [false, false, false, true, true, true, false]);
  const sessionsRun = [10, 11, 12, 13, 14].map(d => ({id: day(d), shots: [{}]}));
  assert.equal(Studio.trainingStreak(sessionsRun, new Date(2026, 9, 14, 20)).week.filter(c => c.run).length, 5);
  assert.equal(Studio.trainingStreak([], new Date(2026, 9, 14)).current, 0);
});

test('the best streak keeps the whole session strip and where it happened', () => {
  const shot = (set, value) => ({set_id: set, result: {value}});
  const run = Studio.arrowStreak([shot(1, '9'), shot(1, 'X'), shot(2, '10'), shot(2, '10'), {set_id: 2, candidate: true, result: {value: '8'}}, shot(3, '8'), shot(3, 'X')]);
  assert.equal(run.best, 3);
  assert.equal(run.start, 1);
  assert.deepEqual([run.from, run.to], [1, 2]);
  assert.deepEqual(run.seq.map(a => a.group), ['98', 'x10', 'x10', 'x10', '98', 'x10']);
  assert.equal(run.current, 1);
});

test('card details default to the edition line only and keep what the user turns on', () => {
  const clean = Studio.sanitizeCard('glass', {photo: 'tall', widgets: [{id: 'score', size: 'small'}], fx: {grain: true, foil: 'yes', nope: true}});
  assert.deepEqual(clean.fx, {foot: true, grain: true, foil: false, mark: false, duo: false});
  assert.deepEqual(Studio.sanitizeCard('obsidian', null).fx, {foot: true, grain: false, foil: false, mark: false, duo: false});
  const both = Studio.sanitizeCard('glass', {widgets: [{id: 'train', size: 'wide', variant: 'month'}, {id: 'streak', size: 'small'}]});
  assert.deepEqual(both.widgets, [{id: 'train', size: 'wide', variant: 'month'}, {id: 'streak', size: 'small'}]);
  assert.equal(Studio.sanitizeCard('glass', {widgets: [{id: 'train', variant: 'year'}]}).widgets[0].variant, 'week');
  for (const style of Object.keys(Studio.CARD_DEFAULTS)) {
    const cfg = {photo: 'short', widgets: [{id: 'streak', size: 'small'}, {id: 'train', size: 'small'}, {id: 'streak', size: 'wide'}, {id: 'train', size: 'wide', variant: 'month'}]};
    assert.equal(Studio.cardRows(style, Studio.sanitizeCard(style, cfg)).fits, true, style);
  }
});

test('the share card is a portrait holographic collectible with a short score line', () => {
  assert.equal(Studio.cardDate(new Date(2026, 9, 13, 12).getTime()), 'MAR 13 OCT 2026');
  const copy = Studio.cardCopy({mode: 'Indoor'}, new Date(2026, 9, 13, 12).getTime());
  assert.equal(copy.brand, 'ARCHERY TRACE');
  assert.equal(copy.kicker, 'SESIÓN INDOOR');
  assert.equal(copy.date, 'MAR 13 OCT 2026');
  const shots = [
    ...Array.from({length: 16}, () => ({result: {value: 'X'}})),
    ...Array.from({length: 11}, () => ({result: {value: '10'}})),
    ...Array.from({length: 3}, () => ({result: {value: '9'}}))
  ];
  assert.equal(Studio.breakdown(shots), '16 X · 11×10 · 3×9');
  const best = Studio.bestSet([
    {set_id: 1, result: {value: '9'}},
    {set_id: 2, result: {value: 'X'}},
    {set_id: 2, result: {value: '10'}}
  ]);
  assert.equal(best.index, 2);
  assert.equal(best.sum, 20);
  assert.deepEqual(Studio.LAYOUTS.map(t => t.id), ['session', 'profile', 'best']);
  assert.deepEqual(Studio.FINISHES.map(t => t.id), ['glass', 'editorial', 'obsidian']);
  assert.deepEqual(Studio.PRESETS.map(t => t.id), ['campo', 'diana', 'visor']);
  assert.equal(Studio.card.finish, 'glass');
  assert.equal(Studio.SIZES.card.w / Studio.SIZES.card.h, 1080 / 1350);
});

test('preset photos ship as data URLs so the card canvas stays exportable from file://', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const sw = fs.readFileSync(path.join(__dirname, '../../mobile/sw.js'), 'utf8');
  Studio.PRESETS.forEach(p => {
    assert.match(p.src, /^photos\/[a-z]+\.js$/);
    const body = fs.readFileSync(path.join(__dirname, '../../mobile', p.src), 'utf8');
    assert.ok(body.startsWith(`(window.ATPhotos = window.ATPhotos || {})['${p.id}'] = 'data:image/jpeg;base64,`));
    assert.ok(sw.includes(`'./${p.src}'`));
  });
});

test('the training calendar counts a day and skips the future', () => {
  const now = new Date(2026, 9, 13, 15);
  const tomorrow = new Date(2026, 9, 14, 15);
  const sessions = [
    {id: now.getTime(), shots: [{}, {candidate: true}, {}]},
    {id: tomorrow.getTime(), shots: [{}, {}]}
  ];
  const heat = Studio.heatmap(sessions, now, 18);
  const today = heat.cells.find(c => c.day === Goals.daySerial(now));
  const ahead = heat.cells.find(c => c.day === Goals.daySerial(tomorrow));
  assert.equal(today.n, 2);
  assert.equal(today.level, 1);
  assert.equal(today.future, false);
  assert.equal(ahead.future, true);
  assert.equal(ahead.n, 0);
  assert.equal(ahead.level, 0);
  assert.ok(heat.cells.filter(c => c.future).every(c => c.n === 0));
});

test('amber stays the default accent', () => {
  assert.equal(Studio.THEMES[0].id, 'amber');
  assert.equal(Studio.theme().id, 'amber');
  assert.equal(Studio.theme().acc, '#FF8A1F');
  assert.ok(Studio.THEMES.length >= 10);
  assert.ok(Studio.THEMES.some(t => t.acc.toLowerCase() === '#2f6bff'));
});

test('default card layouts fit, and so does every distribution chart', () => {
  for (const style of Object.keys(Studio.CARD_DEFAULTS)) {
    for (const variant of ['bar', 'donut', 'columns']) {
      const cfg = Studio.sanitizeCard(style, null);
      cfg.widgets.forEach(w => { if (w.id === 'dist') w.variant = variant; });
      assert.equal(Studio.cardRows(style, cfg).fits, true, style + ' ' + variant);
    }
  }
});

test('sanitizeCard drops unknown and duplicate widgets and checks the chart', () => {
  const cfg = Studio.sanitizeCard('glass', {photo: 'nope', widgets: [
    {id: 'nope', size: 'wide'},
    {id: 'dist', size: 'huge', variant: 'pie'},
    {id: 'dist', size: 'small', variant: 'donut'},
    {id: 'score', size: 'wide'}
  ]});
  assert.equal(cfg.photo, 'tall');
  assert.deepEqual(cfg.widgets.map(w => w.id), ['dist', 'score']);
  assert.equal(cfg.widgets[0].size, 'wide');
  assert.equal(cfg.widgets[0].variant, 'bar');
  assert.equal(cfg.widgets[1].size, 'wide');
  assert.equal(cfg.widgets[1].variant, undefined);
});

test('two small widgets share a row and a small one left alone takes the whole row', () => {
  const rows = Studio.widgetRows([
    {id: 'score', size: 'small'},
    {id: 'group', size: 'small'},
    {id: 'stats', size: 'wide'},
    {id: 'best', size: 'small'}
  ]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0].map(it => it.size), ['small', 'small']);
  assert.deepEqual(rows[1].map(it => it.size), ['wide']);
  assert.deepEqual(rows[2].map(it => [it.widget.id, it.size]), [['best', 'wide']]);
});

test('the card streak is consecutive arrows in the high ring, X 10 and 11', () => {
  const shot = value => ({result: {value}});
  const streak = Studio.arrowStreak([
    shot('X'), shot('10'), shot('11'), shot('9'),
    shot('X'), shot('X'), shot('10'), shot('10'), shot('X'), shot('10'),
    shot('M'),
    shot('10'), shot('X'),
    {candidate: true, result: {value: 'X'}},
    shot('8')
  ]);
  assert.equal(streak.best, 6);
  assert.deepEqual(streak.values, ['X', 'X', '10', '10', 'X', '10']);
  assert.equal(streak.current, 0);
  const open = Studio.arrowStreak([shot('9'), shot('X'), shot('10'), shot('X')]);
  assert.equal(open.best, 3);
  assert.equal(open.current, 3);
  const tie = Studio.arrowStreak([shot('X'), shot('10'), shot('9'), shot('11'), shot('X')]);
  assert.deepEqual(tie.values, ['X', '10']);
  assert.equal(tie.current, 2);
  assert.equal(Studio.arrowStreak([]).best, 0);
  assert.equal(Studio.WIDGETS.find(w => w.id === 'streak').name, 'Mejor racha');
  assert.deepEqual(Studio.WIDGETS.find(w => w.id === 'train').variants.map(v => v.name), ['Semana', 'Mes']);
  for (const style of Object.keys(Studio.CARD_DEFAULTS)) {
    const cfg = {photo: 'short', widgets: [{id: 'streak', size: 'small'}, {id: 'score', size: 'small'}, {id: 'streak', size: 'wide'}]};
    const clean = Studio.sanitizeCard(style, cfg);
    assert.deepEqual(clean.widgets.map(w => w.id), ['streak', 'score']);
    assert.equal(Studio.cardRows(style, clean).fits, true, style);
  }
});

test('the profile banner is a preset, a photo of the user or nothing, and starts on Campo', () => {
  const mem = {};
  const previous = global.localStorage;
  global.localStorage = {
    getItem: key => (key in mem ? mem[key] : null),
    setItem: (key, value) => { mem[key] = value; }
  };
  assert.equal(Studio.profile().banner, 'campo');
  Studio.saveProfile({name: 'Ana', banner: 'diana'});
  assert.equal(Studio.profile().banner, 'diana');
  assert.equal(Studio.profile().name, 'Ana');
  Studio.saveProfile({banner: 'none'});
  assert.equal(Studio.profile().banner, 'none');
  Studio.saveProfile({banner: 'data:image/jpeg;base64,AAAA'});
  assert.equal(Studio.profile().banner, 'data:image/jpeg;base64,AAAA');
  mem.atProfile = JSON.stringify({name: 'Ana', banner: "data:image/png;base64,AA');x:y('"});
  assert.equal(Studio.profile().banner, 'campo');
  if (previous === undefined) delete global.localStorage;
  else global.localStorage = previous;
});

test('the profile card takes the banner and the photo of the user', () => {
  const mem = {};
  const previous = global.localStorage;
  global.localStorage = {
    getItem: key => (key in mem ? mem[key] : null),
    setItem: (key, value) => { mem[key] = value; }
  };
  Studio.saveProfile({name: 'Ana  López', photo: 'data:image/jpeg;base64,BBBB', banner: 'data:image/jpeg;base64,AAAA'});
  const art = Studio.profileArt();
  assert.equal(art.photo, 'data:image/jpeg;base64,AAAA');
  assert.equal(art.avatar, 'data:image/jpeg;base64,BBBB');
  assert.equal(art.initials, 'AL');
  assert.equal(art.focus, 0.5);
  Studio.saveProfile({banner: 'visor'});
  assert.equal(Studio.profileArt().focus, Studio.PRESETS.find(p => p.id === 'visor').focus);
  Studio.saveProfile({banner: 'none'});
  assert.equal(Studio.profileArt().photo, '');
  if (previous === undefined) delete global.localStorage;
  else global.localStorage = previous;
});

test('a layout that does not fit is rejected and the saved one stays', () => {
  const mem = {};
  const previous = global.localStorage;
  global.localStorage = {
    getItem: key => (key in mem ? mem[key] : null),
    setItem: (key, value) => { mem[key] = value; }
  };
  Studio.card.configs = null;
  assert.equal(Studio.setCardConfig('glass', Studio.CARD_DEFAULTS.glass), true);
  const fat = {photo: 'tall', widgets: Studio.WIDGETS.map(w => ({id: w.id, size: 'wide', variant: 'donut'}))};
  assert.equal(Studio.cardRows('glass', Studio.sanitizeCard('glass', fat)).fits, false);
  assert.equal(Studio.setCardConfig('glass', fat), false);
  assert.deepEqual(Studio.cardConfig('glass').widgets.map(w => w.id), Studio.CARD_DEFAULTS.glass.widgets.map(w => w.id));
  Studio.card.configs = null;
  if (previous === undefined) delete global.localStorage;
  else global.localStorage = previous;
});
