const test = require('node:test');
const assert = require('node:assert/strict');
const Backup = require('../../mobile/backup.js');

function storage(entries) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: key => map.has(key) ? map.get(key) : null,
    key: index => [...map.keys()][index] ?? null,
    get length() { return map.size; }
  };
}

test('the backup keeps every at* value and the export metadata', () => {
  const saved = storage({
    atSessions: JSON.stringify([{id: 1, shots: [{t_ms: 5, yaw_c: [179, -179]}]}]),
    atGear: JSON.stringify({bows: ['Recurvo'], arrows: []}),
    atCalibration: JSON.stringify({status: 'applied', profile: 'Recurvo'}),
    atPrefs: JSON.stringify({trace: 'deg', armM: 0.65}),
    atReceipt: '4',
    theme: 'dark',
    atBroken: '{no es json'
  });
  const copy = Backup.build(saved, {exportedAt: '2026-10-11T08:34:00.000Z', app: '4.13'});
  assert.equal(copy.format, 1);
  assert.equal(copy.exportedAt, '2026-10-11T08:34:00.000Z');
  assert.equal(copy.app, '4.13');
  assert.deepEqual(Object.keys(copy.storage), ['atBroken', 'atCalibration', 'atGear', 'atPrefs', 'atReceipt', 'atSessions']);
  assert.equal(copy.storage.atReceipt, '4');
  assert.equal(copy.storage.atBroken, '{no es json');
  assert.equal(copy.storage.atSessions[0].shots[0].yaw_c[1], -179);
  assert.equal(copy.storage.atGear.bows[0], 'Recurvo');
  assert.equal(copy.storage.atCalibration.status, 'applied');
  assert.equal(copy.storage.atPrefs.armM, 0.65);
  assert.equal(saved.getItem('theme'), 'dark');
  assert.equal(Backup.build(storage({}), {app: ''}).app, null);
});
