const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

function page() {
  const elements = new Map(), storage = new Map(), frames = new Map(), created=[];
  let frameId = 0;
  const element = () => {
    const calls = [];
    const context = new Proxy({calls, createRadialGradient: () => ({addColorStop() {}})}, {
      get: (target, key) => key in target ? target[key] : (...args) => calls.push([key, ...(key==='stroke'?[target.strokeStyle]:args)])
    });
    return {style: {}, dataset: {}, width: 320, height: 320, clientWidth: 320, textContent: '', value: '', hidden: false,
      classList: {toggle() {}}, setAttribute() {}, insertAdjacentHTML() {}, appendChild() {}, addEventListener() {},
      querySelectorAll: () => [], querySelector: () => element(), classList: {toggle() {}, add() {}, remove() {}}, getContext: () => context, parentElement: {style: {}}, click() {}, remove() {}};
  };
  const document = {getElementById: id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  }, createElement: () => {const e=element();created.push(e);return e;}, head: element(), body: element(), visibilityState: 'visible'};
  const sandbox = {document, console, devicePixelRatio: 1, performance: {now: () => 0},
    localStorage: {getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k),
      key: i => [...storage.keys()][i] ?? null, get length() { return storage.size; }},
    addEventListener() {}, setTimeout: () => 1, clearTimeout() {},
    requestAnimationFrame: f => {frames.set(++frameId, f); return frameId;}, cancelAnimationFrame: id => frames.delete(id)};
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox), run = script => vm.runInContext(script, ctx);
  run(fs.readFileSync(path.join(root, 'mobile/session-model.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'mobile/trace-geom.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'mobile/backup.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'mobile/score.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'mobile/compare.js'), 'utf8'));
  run(fs.readFileSync(path.join(root, 'mobile/goals.js'), 'utf8'));
  const html = fs.readFileSync(path.join(root, 'mobile/index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
  scripts.forEach(s => new vm.Script(s));
  run(scripts[0]);
  run(fs.readFileSync(path.join(root, 'mobile/training.js'), 'utf8'));
  run(`const fixture = {t_ms:1000,set_id:1,aim_score:80,peak_mg:1200,tilt_x:[0,100,200,300],tilt_y:[0,20,40,60],trace_t:[-1500,-1000,-500,-50]};
    curSess={id:1,sensorId:'test',profile:'Recurvo',live:true,lastEvent:1,shots:[fixture]};store.save([curSess]);data={shots:curSess.shots};view='Shot';cur=0;render();`);
  return {run, elements, frames, created};
}

test('calibration action is visible for a recorded historical shot', () => {
  const p = page();
  p.run("historyMode=true;histId=1;curSess=null;render()");
  assert.equal(p.elements.get('calibrationPanel').hidden, false);
});

test('small displacement still animates when it spans visible pixels', () => {
  const p = page();
  p.run("fixture.pos_x=[0,0.15,0.3,0.45];fixture.pos_y=[0,0,0,0];render();play()");
  assert.equal(p.frames.size, 1, p.elements.get('tip').textContent);
});

test('incoming state does not cancel playback of the same shot', () => {
  const p = page();
  p.run('play()');
  assert.equal(p.frames.size, 1);
  p.run("liveEvent({sid:'test',eid:2,kind:'state',state:{currentSet:1}})");
  assert.equal(p.frames.size, 1, 'state refresh cancelled animation');
  assert.equal(p.elements.get('play').textContent, 'Detener');
});

test('switching sessions with equal shot timestamps repaints the canvas', () => {
  const p = page(), calls = p.elements.get('aim').getContext('2d').calls;
  const before = calls.length;
  p.run("historyMode=true;histId=2;store.save([...store.list(),{id:2,shots:[{...fixture,tilt_x:[100,0,-100,-200]}]}]);data={shots:store.list()[1].shots};render()");
  assert.ok(calls.length > before, 'cached canvas from a different session');
});

test('native command errors are not reported as calibration success', async () => {
  const p = page();
  p.run("askConfirm=async()=>true;window.Native={command:()=> 'Conecta el sensor'}");
  await p.run('calibrateFromShot()');
  assert.match(p.elements.get('notice').textContent, /Conecta el sensor/);
  assert.equal(p.run("JSON.parse(localStorage.getItem('atCalibration')).status"), 'error');
});

test('invalid calibration peaks cannot be sent to the sensor', async () => {
  for (const value of ['NaN', 'Infinity', 'null', '-1', '0', '100001']) {
    const p = page();
    p.run(`let sent=0;askConfirm=async()=>true;window.Native={command:()=>{sent++;return ''}};fixture.peak_mg=${value}`);
    await p.run('calibrateFromShot()');
    assert.equal(p.run('sent'), 0, value);
  }
});

test('calibration lists the user bows and retains the chosen one', async () => {
  const p = page();
  p.run("let sent;window.Native={command:json=>{sent=JSON.parse(json);return ''}};historyMode=true;histId=1;" +
    "localStorage.setItem('atGear',JSON.stringify({bows:['Olímpico 38','Poleas']}));render()");
  assert.match(p.elements.get('calibrationProfile').innerHTML, /Olímpico 38/);
  assert.match(p.elements.get('calibrationProfile').innerHTML, /Poleas/);
  p.run("document.getElementById('calibrationProfile').value='Poleas'");
  const pending = p.run('calibrateFromShot()');
  assert.equal(p.run('sent'), undefined);
  assert.match(p.elements.get('askMsg').textContent, /Poleas/);
  assert.match(p.elements.get('askMsg').textContent, /420/);
  p.run('data.shots.push({...fixture,t_ms:2000,peak_mg:5000});cur=1');
  p.elements.get('askYes').onclick(); await pending;
  assert.equal(p.run('sent.action'), 'calibrateShot');
  assert.equal(p.run('sent.value'), 1200);
  assert.equal(p.run('sent.profile'), 'Poleas');
  assert.match(p.elements.get('notice').textContent, /enviado/);
  assert.equal(p.run("JSON.parse(localStorage.getItem('atCalibration')).status"), 'pending');
  p.run("render();liveEvent({sid:'other',eid:1,kind:'calibration',requestId:'unrelated',applied:true,result:'Otro ajuste'})");
  assert.equal(p.run("JSON.parse(localStorage.getItem('atCalibration')).status"), 'pending');
  p.run("liveEvent({sid:'other',eid:2,kind:'calibration',requestId:sent.requestId,applied:true,threshold:420,profile:'Poleas',result:'Calibración aplicada'})");
  assert.equal(p.run("JSON.parse(localStorage.getItem('atCalibration')).status"), 'applied');
  assert.match(p.elements.get('notice').textContent, /aplicada/);
});

test('cancelling calibration does not send or queue a command', async () => {
  const p = page();
  p.run("let sent=0;window.Native={command:()=>{sent++;return ''}}");
  const pending = p.run('calibrateFromShot()');
  p.elements.get('askNo').onclick(); await pending;
  assert.equal(p.run('sent'), 0);
  assert.equal(p.run("localStorage.getItem('atCalibration')"), null);
});
test('weak calibration candidates preserve posture and can be chosen on the phone', async () => {
  const p=page();p.run("let sent;askConfirm=async()=>true;window.Native={command:json=>{sent=JSON.parse(json);return ''}};liveEvent({sid:'test',eid:2,kind:'shot',candidate:true,t:2000,set:-1,score:80,peak:250,instab:10,pose:[0,0,1000],state:{calibrating:true,calibrationCount:1,profile:'Recurvo'}});show('Shot')");
  assert.equal(p.elements.get('calibrationPanel').hidden,false);assert.equal(p.elements.get('mScore').textContent,'–');assert.match(p.elements.get('title').textContent,/Candidato/);
  await p.run('calibrateFromShot()');assert.equal(p.run('sent.value'),250);assert.equal(p.run('sent.profile'),'Recurvo');assert.equal(p.run('JSON.stringify(sent.pose)'),'[0,0,1000]');
  p.run("show('Session')");assert.equal(p.elements.get('sTotal').textContent,1);assert.equal(p.elements.get('sSets').textContent,1);
});
test('calibration forwards learned aiming variance and explains unscored candidates',async()=>{
  const p=page();p.run("let sent;askConfirm=async()=>true;window.Native={command:json=>{sent=JSON.parse(json);return ''}};liveEvent({sid:'test',eid:2,kind:'shot',candidate:true,t:2000,set:-1,score:80,peak:3000,instab:10,pose:[0,0,1000,25]});show('Shot')");
  assert.match(p.elements.get('calibrationInfo').textContent,/Candidato sin puntuar.*3000 mG/);await p.run('calibrateFromShot()');assert.equal(p.run('JSON.stringify(sent.pose)'),'[0,0,1000,25]');assert.equal(p.run('calibrationState().threshold'),1050);
});
test('bow preset delete button removes saved gear and queues the named sensor deletion', () => {
  const p=page();p.run("let sent;window.Native={command:json=>{sent=JSON.parse(json);return ''}};gear.save({bows:['Equipo A','Equipo B'],arrows:['X10']});curSess.bow=curSess.profile='Equipo A';saveSession(curSess);store.save([...store.list(),{id:2,bow:'Equipo A',profile:'Equipo A',shots:[fixture]}]);render()");
  assert.match(p.elements.get('bowList').innerHTML,/aria-label="Eliminar preset Equipo A"/);
  p.run("document.getElementById('bowSheet').onclick({target:{closest:selector=>selector==='[data-delete-bow]'?{dataset:{deleteBow:'Equipo A'}}:null}})");
  assert.equal(p.run('JSON.stringify(gear.get())'),'{"bows":["Equipo B"],"arrows":["X10"]}');assert.equal(p.run('sent.action'),'deleteProfile');assert.equal(p.run('sent.value'),'Equipo A');assert.equal(p.run('sent.sid'),'test');
  assert.equal(p.run('displayedSession().profile'),'Recurvo');assert.equal(p.run('store.list().find(s=>s.id===2).bow'),'Equipo A');assert.doesNotMatch(p.elements.get('calibrationProfile').innerHTML,/Equipo A/);
});
test('deleting a bow reports a native failure without discarding the preset', () => {
  const p=page();p.run("gear.save({bows:['Equipo A'],arrows:[]});window.Native={command:()=> 'Sin conexión'};deleteBow('Equipo A')");
  assert.equal(p.run("gear.get().bows[0]"),'Equipo A');assert.match(p.elements.get('notice').textContent,/Sin conexión/);
});
test('adding a named bow sends its profile and calibration can start from the phone', () => {
  const p=page();p.run("let sent;window.Native={command:json=>{sent=JSON.parse(json);return ''}};document.getElementById('bowName').value='Equipo A';document.getElementById('bowAdd').onclick()");
  assert.equal(p.run('sent.action'),'profile');assert.equal(p.run('sent.value'),'Equipo A');assert.equal(p.elements.get('calibrationMode').hidden,false);
  p.run("sendCmd('calibrate',0)");assert.equal(p.run('sent.action'),'calibrate');
});

test('degrees are drawn even when the shot includes integrated centimeters', () => {
  const p = page();
  const before = p.run('localStorage.getItem("atSessions")');
  p.run('fixture.tilt_x=[0,0,0];fixture.tilt_y=[0,0,0];fixture.yaw_c=[0,90,10];fixture.pitch_deg=[0,0,0];fixture.pos_x=[0,40,5];fixture.pos_y=[0,0,0];fixture.trace_t=[-100,-50,0];aimDrawnKey="";render()');
  const deg = JSON.parse(p.run('JSON.stringify(proj(fixture).pts.map(p=>p[0]))'));
  assert.ok(Math.abs(deg[1] - 80) < 1e-6, JSON.stringify(deg));
  assert.equal(p.run('proj(fixture).unit'), 'deg');
  assert.match(p.elements.get('aimCaption').textContent, /Grados/);
  assert.equal(p.elements.get('tracebar'), undefined);
  assert.equal(p.run('localStorage.getItem("atSessions")'), before);
  assert.equal(p.run('JSON.stringify(fixture.pos_x)'), '[0,40,5]');
});

test('a yaw that crosses ±180° is drawn on the short arc', () => {
  const p = page();
  p.run('fixture.tilt_x=[0,0,0];fixture.tilt_y=[0,0,0];fixture.yaw_c=[179,-179,178];fixture.pitch_deg=[0,0,0];fixture.pos_x=[0,80,0];fixture.pos_y=[0,0,0];fixture.trace_t=[-100,-50,0];aimDrawnKey="";render()');
  const xs = JSON.parse(p.run('JSON.stringify(proj(fixture).pts.map(p=>p[0]))'));
  assert.ok(Math.abs(xs[0] - 1) < 1e-6 && Math.abs(xs[1] - 3) < 1e-6, JSON.stringify(xs));
  assert.ok(xs.every(v => Math.abs(v) < 10), JSON.stringify(xs));
});

test('a shot without compass still opens, and stored centimeters are left alone', () => {
  const p = page();
  p.run("fixture.yaw_c=[]; fixture.yaw_deg=[]; fixture.pitch_deg=[]; fixture.pos_x=[1,8,3]; fixture.pos_y=[2,2,9]; aimDrawnKey=''; render()");
  assert.match(p.elements.get('aimCaption').textContent, /Sin brújula/);
  assert.equal(p.run('proj(fixture).unit'), 'tilt');
  p.run("fixture.yaw_c=[0,10,0]; fixture.pitch_deg=[0,0,0]; aimDrawnKey=''; render()");
  assert.equal(p.run('proj(fixture).unit'), 'deg');
  assert.equal(p.run('JSON.stringify(fixture.pos_x)'), '[1,8,3]');
});

test('the drawn trajectory reaches the release point', () => {
  const p = page(), calls = p.elements.get('aim').getContext('2d').calls;
  const end = calls.filter(c => c[0] === 'quadraticCurveTo').at(-1).slice(-2);
  const release = JSON.parse(p.run('JSON.stringify(proj(fixture).P(proj(fixture).pts.at(-1)))'));
  assert.deepEqual(end, release);
});

test('the playback marker moves across frames and finishes', () => {
  const p = page(), calls = p.elements.get('aim').getContext('2d').calls;
  p.run('play()');
  const positions = [];
  for (const time of [1000, 2000, 3000, 11000]) {
    const [id, callback] = p.frames.entries().next().value;
    p.frames.delete(id); callback(time);
    if (time < 11000) positions.push(calls.filter(c => c[0] === 'arc' && c[3] === 3).at(-1).slice(1, 3));
  }
  assert.notDeepEqual(positions[0], positions[1]);
  assert.notDeepEqual(positions[1], positions[2]);
  assert.equal(p.frames.size, 0);
  assert.equal(p.elements.get('play').textContent, 'Reproducir');
});

test('changing the selected shot stops playback', () => {
  const p = page();
  p.run('play();data.shots.push({...fixture,t_ms:2000});step(1)');
  assert.equal(p.frames.size, 0);
});

test('flat trajectories retain their static canvas and explain why playback is unavailable', () => {
  const p = page();
  p.run('fixture.pos_x=[0,0,0,0];fixture.pos_y=[0,0,0,0];fixture.tilt_x=[0,0,0,0];fixture.tilt_y=[0,0,0,0];render()');
  const calls = p.elements.get('aim').getContext('2d').calls, before = calls.length;
  p.run('play()');
  assert.equal(p.frames.size, 0);
  assert.equal(calls.length, before, 'failed playback cleared the static canvas');
  assert.match(p.elements.get('tip').textContent, /plana|movimiento|Camino/);
});

test('recorded calibration candidates show orientation when integrated position is flat', () => {
  const p=page(), shots=require('./fixtures/candidates-20261002.json');
  p.run(`data={shots:${JSON.stringify(shots)}}`);
  for(let i=0;i<shots.length;i++) {
    p.run(`stopPlayback();cur=${i};render();play()`);
    assert.equal(p.frames.size,1,'candidate '+(i+1)+': '+p.elements.get('tip').textContent);
  }
  assert.match(p.elements.get('aimCaption').textContent,/Grados.*esta flecha/);
});

test('calibration bars compare impulse peaks instead of missing stability scores', () => {
  const p=page(), shots=require('./fixtures/candidates-20261002.json');
  p.run(`data={shots:[${JSON.stringify(shots[3])},${JSON.stringify(shots[4])}]};cur=0;show('Session')`);
  const widths=[...p.elements.get('trend').innerHTML.matchAll(/width:([\d.]+)%/g)].map(m=>+m[1]);
  assert.equal(widths.length,2);
  assert.ok(widths[0]>widths[1]*5,JSON.stringify(widths));
});

test('the visual onset does not interpolate aiming coordinates through the impulse', () => {
  const p=page();
  assert.equal(p.run('JSON.stringify(releasePath([[10,20,-50],[900,800,50]],0))'),'[[10,20,-50],[10,20,0],[900,800,50]]');
  assert.equal(p.run('JSON.stringify(releasePath([[10,20,-50],[900,800,0]],0))'),'[[10,20,-50],[10,20,0],[900,800,0]]');
});

test('the release marker stays at the last recorded aiming position instead of following the later impulse', () => {
  const p=page(), shots=require('./fixtures/release-paint-20261002.json'), context=p.elements.get('aim').getContext('2d');
  p.run(`const paintingShots=${JSON.stringify(shots)};data={shots:paintingShots}`);
  const before=p.run('JSON.stringify(paintingShots)');
  for(let i=0;i<shots.length;i++) {
    context.calls.length=0;p.run(`cur=${i};aimDrawnKey='';drawAim(data.shots[cur])`);
    const expected=JSON.parse(p.run('JSON.stringify((()=>{const {pts,P}=proj(data.shots[cur]);return P(pts.filter(p=>p[2]<0).at(-1))})())'));
    assert.deepEqual(context.calls.filter(c=>c[0]==='arc'&&c[3]===5).at(-1).slice(1,3),expected,'release point '+(i+1));
    assert.ok(context.calls.some(c=>c[0]==='stroke'&&c[1]===p.run('C.acc')),'missing follow-through '+(i+1));
  }
  assert.equal(p.run('JSON.stringify(paintingShots)'),before,'painting changed captured data');
});

test('playback paints follow-through after the recorded release', () => {
  const p=page();p.run(`data={shots:${JSON.stringify(require('./fixtures/release-paint-20261002.json'))}};cur=0;play()`);
  assert.equal(p.frames.size,1);p.created.forEach(e=>e.getContext('2d').calls.length=0);
  const [id,callback]=p.frames.entries().next().value;p.frames.delete(id);callback(9900);
  assert.ok(p.created.some(e=>e.getContext('2d').calls.some(c=>c[0]==='stroke'&&c[1]===p.run('C.acc'))),'animation omits follow-through');
});

test('the trajectory changes from aiming to follow-through at the recorded release, reserving red for the marker', () => {
  const p=page(), calls=p.elements.get('aim').getContext('2d').calls;calls.length=0;
  p.run("aimPath(document.getElementById('aim').getContext('2d'),[[0,0,-1000],[10,0,-50],[50,0,50],[100,0,100],[130,0,150],[200,0,400]],p=>p,1000,100)");
  const aim=calls.findIndex(c=>c[0]==='stroke'&&c[1]===p.run('C.aim'));
  assert.deepEqual(calls.slice(0,aim).filter(c=>c[0]==='quadraticCurveTo').at(-1).slice(-2),[100,0]);
  assert.deepEqual(calls.slice(aim).find(c=>c[0]==='moveTo').slice(1),[100,0]);
  assert.ok(calls.slice(aim).some(c=>c[0]==='stroke'&&c[1]===p.run('C.acc')));
  assert.ok(!calls.some(c=>c[0]==='stroke'&&c[1]===p.run('C.rel')));
});

test('an impulse sampled at zero cannot move the labelled aiming point or change captured data', () => {
  const p=page(), calls=p.elements.get('aim').getContext('2d').calls;
  p.run("fixture.window={pre:[-50],mag_pre:[1],post:[25,50],mag_post:[100,0]};fixture.traj_x=[400,500];fixture.traj_y=[80,100];fixture.post_t=[0,50]");
  const before=p.run('JSON.stringify(fixture)'), expected=JSON.parse(p.run('JSON.stringify((()=>{const {pts,P}=proj(fixture);return P(pts.filter(p=>p[2]<0).at(-1))})())'));
  calls.length=0;p.run("aimDrawnKey='';drawAim(fixture)");
  assert.deepEqual(calls.filter(c=>c[0]==='arc'&&c[3]===5).at(-1).slice(1,3),expected);
  assert.ok(calls.some(c=>c[0]==='arc'&&c[3]===7.5),'marcador de suelta');
  assert.doesNotMatch(p.elements.get('aimCaption').textContent,/Punto rojo|Suelta estimada|ocupa la diana/);
  assert.equal(p.run('JSON.stringify(fixture)'),before);
});

test('playback pauses at the marked release before drawing follow-through and then finishes', () => {
  const shots=require('./fixtures/release-paint-20261002.json');
  for(let i=0;i<shots.length;i++){
    const p=page(), calls=p.elements.get('aim').getContext('2d').calls;
    p.run(`data={shots:${JSON.stringify(shots)}};cur=${i};play()`);
    const orange=p.run('C.acc'), paused=[];let followed=false;
    for(let time=0;p.frames.size&&time<=11000;time+=50){
      calls.length=0;const [id,callback]=p.frames.entries().next().value;p.frames.delete(id);callback(time);
      followed=p.created.some(e=>e.getContext('2d').calls.some(c=>c[0]==='stroke'&&c[1]===orange));
      if(!followed&&calls.some(c=>c[0]==='arc'&&c[3]===5))paused.push(time);
    }
    assert.ok(paused.at(-1)-paused[0]>=500,'arrow '+(i+1)+': '+JSON.stringify(paused));
    assert.ok(followed,'missing follow-through after pause');
    assert.equal(p.frames.size,0);assert.equal(p.elements.get('play').textContent,'Reproducir');
  }
});

test('export packs the at* storage for Android and reports a failed download', () => {
  const p = page();
  p.run("localStorage.setItem('atGear', JSON.stringify({bows:['Recurvo'],arrows:[]})); localStorage.setItem('atReceipt','4'); localStorage.setItem('theme','dark')");
  const sent = p.run("let captured; window.Native={export(json){captured=json}}; exportBackup(); captured");
  const copy = JSON.parse(sent);
  assert.equal(copy.format, 1);
  assert.equal(copy.app, null);
  assert.equal(copy.storage.atSessions[0].id, 1);
  assert.equal(copy.storage.atGear.bows[0], 'Recurvo');
  assert.equal(copy.storage.atCalibration, undefined);
  assert.equal(copy.storage.atReceipt, '4');
  assert.equal(Object.hasOwn(copy.storage, 'theme'), false);
  assert.equal(p.run("window.Native={}; exportBackup(); document.getElementById('notice').textContent"), 'No se pudo exportar la copia: Blob is not defined');
  const downloaded = p.run("document.getElementById('notice').hidden=true; document.getElementById('notice').textContent=''; window.Native=undefined; const files=[]; Blob=function(parts){this.parts=parts}; URL={createObjectURL(blob){files.push(blob.parts[0]); return 'blob:at'}, revokeObjectURL(){}}; exportBackup(); files[0]");
  assert.equal(JSON.parse(downloaded).storage.atReceipt, '4');
  assert.equal(p.run("document.getElementById('notice').textContent"), '');
});

test('a closed end opens the score pad once and a repeat does not', () => {
  const p = page();
  p.run(`curSess.ends=[];curSess.target=0;curSess.mode='Libre';curSess.live=true;curSess.lastEvent=1;store.save([curSess]);view='Shot';
    liveEvent({sid:'test',eid:2,kind:'set',reason:'walk',state:{resting:true,currentSet:1,target:0,paused:false,mode:'Libre',ends:[{id:1,reason:'walk'}]}})`);
  assert.equal(p.run('view'), 'Set');
  assert.match(p.elements.get('notice').textContent, /Tanda cerrada/);
  assert.match(p.elements.get('notice').textContent, /valor de las flechas/);
  assert.match(p.elements.get('setScore').innerHTML, /Flecha 1/);
  assert.equal(p.run("store.list()[0].ends[0].reason"), 'walk');
  assert.equal(p.run("store.list()[0].shots[0].t_ms"), 1000);
  p.run("view='Shot';liveEvent({sid:'test',eid:3,kind:'state',state:{resting:true,currentSet:1,target:0,paused:false,ends:[{id:1,reason:'walk'}]}})");
  assert.equal(p.run('view'), 'Shot');
  p.run("historyMode=true;histId=1;view='History';liveEvent({sid:'test',eid:4,kind:'set',reason:'walk',state:{resting:false,currentSet:2,target:0,paused:false,ends:[{id:1,reason:'walk'},{id:2,reason:'walk'}]}})");
  assert.equal(p.run('view'), 'History');
});

test('history compares two sessions with the score pad metrics and degree traces', () => {
  const p = page();
  const now = Date.now(), older = now - 3 * 864e5;
  p.run(`const yaw=(base)=>[10,12,14,16,18].map(v=>v+base);
    const shot=(t,aim,value,set_id,base)=>({t_ms:t,set_id,aim_score:aim,draw_ms:2000,settle_ms:180,hr_bpm:80,candidate:false,result:{value},yaw_c:yaw(base),pitch_deg:[0,1,0,1,0],trace_t:[-400,-300,-200,-100,-40]});
    store.save([
      {id:${older},mode:'Indoor',bow:'Recurvo',arrows:'X10',shots:[shot(1000,70,'8',1,0),shot(4000,60,'7',2,0)]},
      {id:${now},mode:'Indoor',bow:'Recurvo',arrows:'ACE',shots:[shot(1000,90,'X',1,5),shot(2000,88,'10',1,5),shot(5000,84,'9',2,5)]}
    ]);
    show('History');openCompare();`);
  const table = p.elements.get('cmpTable').innerHTML;
  assert.match(table, /Flechas/);
  assert.match(table, /Puntos/);
  assert.match(table, />15</);
  assert.match(table, />29</);
  assert.match(table, /Estabilidad/);
  assert.match(p.elements.get('cmpGear').innerHTML, /Recurvo/);
  assert.match(p.elements.get('cmpAimCap').textContent, /grados/);
  assert.equal(p.elements.get('compareCard').hidden, false);
  const strokes = p.elements.get('cmpAim').getContext('2d').calls.filter(c => c[0] === 'stroke').map(c => c[1]);
  assert.ok(strokes.includes('#5ab0f0') && strokes.includes('#ff7a1a'), JSON.stringify(strokes));
  p.run("cmpArrowSet('1');cmpMetricSet('score');cmpQuick('aim')");
  assert.match(p.elements.get('cmpAimCap').textContent, /Flecha 2/);
  assert.equal(p.run('cmpMetric'), 'score');
  assert.notEqual(p.run('cmpA'), p.run('cmpB'));
});

test('the link chip shows whether the sensor is connected, the last event and the queue', () => {
  const p = page();
  assert.deepEqual(JSON.parse(p.run('JSON.stringify(linkLabel(null))')), {state: 'off', text: 'Sin sensor'});
  const on = JSON.parse(p.run("JSON.stringify(linkLabel({connected:true, status:'Receptor listo', pending:2, commands:1, receivedAt:0}))"));
  assert.equal(on.state, 'on');
  assert.match(on.text, /^Sensor/);
  assert.match(on.text, /3 pend\./);
  const off = JSON.parse(p.run("JSON.stringify(linkLabel({connected:false, status:'Sensor sin conexión', pending:0, receivedAt:0}))"));
  assert.equal(off.state, 'off');
  assert.match(off.text, /Desconectado/);
  const wait = JSON.parse(p.run("JSON.stringify(linkLabel({status:'Receptor listo', pending:16, commands:0, receivedAt:0}))"));
  assert.equal(wait.state, 'wait');
  assert.match(wait.text, /16 pend\./);
  p.run("window.Native={diagnostics:()=>JSON.stringify({connected:true,status:'Receptor listo',pending:0,commands:0,receivedAt:0})}; refreshLink();");
  assert.equal(p.elements.get('link').textContent, 'Sensor');
  assert.equal(p.elements.get('link').dataset.state, 'on');
});

test('progress shows the current week bar and keeps the goal in atGoals', () => {
  const p = page();
  p.run(`localStorage.setItem('atGoals', JSON.stringify({arrows:10, sessions:null, average:null, stability:null}));
    store.save([{id:Date.now(), shots:[0,1,2,3].map(t => ({t_ms:t, aim_score:80, candidate:false}))}]);
    show('Progress');`);
  assert.match(p.elements.get('goalBars').innerHTML, /<b>4\/10<\/b>/);
  assert.doesNotMatch(p.elements.get('goalBars').innerHTML, /40%</);
  assert.match(p.elements.get('goalBars').innerHTML, /width:40%/);
  assert.match(p.elements.get('goalStreak').textContent, /1 día seguido/);
  assert.match(p.elements.get('title').textContent, /Perfil/);
  p.run("document.getElementById('goalArrows').value='12'; document.getElementById('goalAverage').value='8,5'; saveGoals();");
  assert.deepEqual(JSON.parse(p.run("localStorage.getItem('atGoals')")), {arrows: 12, sessions: null, average: 8.5, stability: null});
  assert.match(p.elements.get('notice').textContent, /Objetivos guardados/);
  assert.match(p.elements.get('goalBars').innerHTML, /Media/);
});

test('scoring the set stores the value and a repeated sensor event leaves it', () => {
  const p = page();
  p.run(`fixture.draw_ms=3000;fixture.settle_ms=180;fixture.hr_bpm=90;fixture.set_id=1;
    const second={...fixture,t_ms:2000,aim_score:70,draw_ms:2800};const third={...fixture,t_ms:3000,aim_score:60,draw_ms:5000};
    curSess.sensorId='test';curSess.lastEvent=1;curSess.shots=[fixture,second,third];data={shots:curSess.shots};store.save([curSess]);
    scoreArrow(1000,'X');scoreArrow(2000,'9');scoreArrow(3000,'M');view='Set';cur=0;render()`);
  assert.match(p.elements.get('setScore').innerHTML, /data-score="X"/);
  assert.match(p.elements.get('setScore').innerHTML, />X</);
  assert.doesNotMatch(p.elements.get('setScore').innerHTML, /puntos|media/);
  assert.equal(p.elements.get('setHead').hidden, false);
  assert.equal(String(p.elements.get('setHeadScore').textContent), '19');
  assert.equal(String(p.elements.get('setHeadStab').textContent), '70');
  assert.doesNotMatch(p.elements.get('subtitle').textContent, /puntos|media/);
  p.run("view='Shot';cur=0;render()");
  assert.doesNotMatch(p.elements.get('shotScore').innerHTML, /puntos|media/);
  assert.equal(p.elements.get('setHead').hidden, true);
  p.run("view='Set';cur=0;render()");
  p.run("liveEvent({sid:'test',kind:'shot',eid:4,t:1000,set:1,score:11,peak:1000,instab:10,dt:50})");
  const kept = p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value");
  assert.equal(kept, 'X');
  p.run("view='Session';render()");
  assert.equal(String(p.elements.get('scoreTotal').textContent), '19');
  assert.equal(p.elements.get('scoreAvg').textContent, '6,3');
  assert.equal(String(p.elements.get('scoreX').textContent), '1');
  assert.equal(String(p.elements.get('scoreTen').textContent), '0');
  assert.match(p.elements.get('sessionScoreInsight').textContent, /al menos 4/);
  assert.match(p.elements.get('setList').innerHTML, /<details/);
  assert.match(p.elements.get('setList').innerHTML, /class="setPts on"><b>19<\/b><small>pts<\/small>/);
  assert.doesNotMatch(p.elements.get('setList').innerHTML, /class="chip"/);
  assert.match(p.elements.get('trend').innerHTML, /class="trendScore"[^>]*>X</);
  assert.match(p.elements.get('trend').innerHTML, /class="trendScore"[^>]*>9</);
  assert.match(p.elements.get('trend').innerHTML, /class="trendScore"[^>]*>M</);
  assert.match(p.elements.get('trend').innerHTML, /class="trendValue"[^>]*>80</);
  p.run("scoreArrow(1000,null)");
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result"), undefined);
  p.run("historyMode=true;histId=curSess.id;curSess=null;scoreArrow(2000,'8')");
  assert.equal(p.run("historyMode && store.list()[0].shots.find(s=>s.t_ms===2000).result.value"), '8');
});

test('the session view stays hidden under other tabs and visible when it is empty', () => {
  const p = page();
  p.run("document.getElementById('trend');document.getElementById('vSession')");
  const session = p.elements.get('vSession');
  p.elements.get('trend').parentElement = session;
  p.run("show('Shot')");
  assert.equal(session.style.display, 'none');
  p.run("show('Progress')");
  assert.equal(session.style.display, 'none');
  p.run("data={shots:[]};show('Session')");
  assert.equal(session.style.display, 'flex');
});

test('a tanda keeps set progress and an old session stays free', () => {
  const p = page();
  p.run(`window.Native={command:v=>{window.sent=v;return '';}};
    document.getElementById('modeSheet').onclick({target:{closest:s=>s==='[data-v]'?{dataset:{v:'TandaIndoor'}}:null}});`);
  assert.equal(p.run('curSess.tanda'), true);
  assert.equal(p.run('curSess.mode'), 'Indoor');
  assert.equal(p.run('curSess.target'), 3);
  assert.match(p.run('sent'), /"action":"mode"/);
  assert.match(p.run('sent'), /"value":"Indoor"/);
  assert.doesNotMatch(p.run('sent'), /Tanda/);
  p.run("curSess.currentSet=1;view='Session';render()");
  assert.equal(p.elements.get('sSets').textContent, '1/10');
  assert.doesNotMatch(p.elements.get('subtitle').textContent, /Tanda|1\/10/);
  assert.match(p.elements.get('setList').innerHTML, /class="setPts"/);
  p.run("document.getElementById('modeSheet').onclick({target:{closest:s=>s==='[data-v]'?{dataset:{v:'Libre'}}:null}});");
  assert.equal(p.run('curSess.tanda'), false);
  assert.equal(p.run('curSess.target'), 0);
  p.run("view='Session';render()");
  assert.equal(String(p.elements.get('sSets').textContent), '1');
  p.run("const old={id:9,mode:'Indoor',shots:[{t_ms:1,set_id:1,aim_score:70}]};store.save([old]);data={shots:old.shots};historyMode=true;histId=9;curSess=null;show('History');");
  assert.match(p.elements.get('histList').innerHTML, /Indoor/);
  assert.doesNotMatch(p.elements.get('histList').innerHTML, /Tanda/);
});

test('the session has no category filters and a new arrow arrives without a category', () => {
  const html = fs.readFileSync(path.join(root, 'mobile/index.html'), 'utf8');
  assert.ok(!/data-lens=|data-round=/.test(html), 'the session view still shows category filter bars');
  const p = page();
  p.run("curSess.phase='score';store.save([curSess]);view='Session';liveEvent({sid:'test',eid:2,kind:'shot',t:2000,set:1,score:80,peak:1200,instab:10})");
  assert.equal(p.run("store.list()[0].shots.length"), 2);
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===2000).phase"), undefined);
});

test('a stretched aim box is stored as a square bitmap', () => {
  const p = page();
  const aim = p.elements.get('aim');
  aim.clientWidth = 300;
  aim.clientHeight = 180;
  p.run("aimDrawnKey='';render()");
  assert.equal(aim.width, aim.height);
  assert.equal(aim.style.height, '300px');
});

test('tapping the face stores the ring and a button can correct it without dropping the point', () => {
  const p = page();
  p.run("fixture.draw_ms=1800;const second={...fixture,t_ms:2000,aim_score:70};curSess.shots=[fixture,second];data={shots:curSess.shots};store.save([curSess]);view='Shot';cur=0;render()");
  const face = p.elements.get('faceShot');
  face.getContext('2d').calls.length = 0;
  face.clientWidth = 300;
  face.clientHeight = 160;
  p.run("render()");
  assert.equal(face.width, face.height);
  assert.equal(face.style.height, '300px');
  const arcs = face.getContext('2d').calls.filter(c => c[0] === 'arc');
  const rings = arcs.filter(a => a[1] === arcs[0][1] && a[2] === arcs[0][2] && a[4] === 0 && Math.abs(a[5] - Math.PI * 2) < 1e-9);
  const radii = rings.map(a => a[3]).sort((a, b) => a - b);
  const outer = radii[radii.length - 1];
  for (const k of [0.1, 0.2, 0.4, 0.6, 0.8, 1]) assert.ok(radii.some(r => Math.abs(r - outer * k) < 0.8), k + ' ' + radii.join(','));
  assert.ok(Math.abs(radii[0] / outer - 0.1) < 0.02, radii.join(','));
  p.run("scoreFaceTap(document.getElementById('faceShot'), 150, 150)");
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value"), 'X');
  assert.deepEqual(JSON.parse(p.run("JSON.stringify(store.list()[0].shots.find(s=>s.t_ms===1000).result.impact)")), {x: 0, y: 0});
  p.run("scoreArrow(1000,'8')");
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value"), '8');
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.impact.x"), 0);
  p.run("scoreArrow(1000,null)");
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value"), undefined);
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.impact.y"), 0);
  p.run("placeArrow(2000,0.15,0);view='Set';cur=0;render()");
  assert.match(p.elements.get('setScore').innerHTML, /id="faceSet"/);
  assert.deepEqual([...p.elements.get('setScore').innerHTML.matchAll(/data-score="([^"]+)"/g)].map(m => m[1]), ['X', '10', '9', '8', '7', '6', 'M', 'clear']);
  p.run("view='Session';render()");
  assert.equal(p.elements.get('sessionGroupWrap').hidden, false);
  assert.equal(p.elements.get('sessionGroup').width, p.elements.get('sessionGroup').height);
  assert.equal(p.run('Score.impacts(data.shots).length'), 1);
});

test('pinch zoom keeps target coordinates and numbered dots at a constant size', () => {
  const p = page();
  const face = p.elements.get('faceShot');
  face.clientWidth = 300;
  p.run("render()");
  const center = JSON.parse(p.run("faceView.faceShot={z:2,tx:0.25,ty:-0.1};JSON.stringify(faceScreenToTarget(document.getElementById('faceShot'),150,150))"));
  assert.ok(Math.abs(center.x - 0.25) < 1e-9 && Math.abs(center.y + 0.1) < 1e-9, JSON.stringify(center));
  const clamped = JSON.parse(p.run("faceClampView(v={z:8,tx:2,ty:2});JSON.stringify(v)"));
  assert.equal(clamped.z, 4);
  assert.ok(Math.hypot(clamped.tx, clamped.ty) <= 1.04 + 1e-9);
  const home = JSON.parse(p.run("faceClampView(v={z:1,tx:0.4,ty:-0.2});JSON.stringify(v)"));
  assert.deepEqual(home, {z: 1, tx: 0, ty: 0});
  p.run(`faceView.faceShot={z:3,tx:0.1,ty:0};
    c=document.getElementById('faceShot');
    c.getContext('2d').calls.length=0;
    drawFace(c,[{t_ms:5,result:{value:'10',impact:{x:0.2,y:0.1}}},{t_ms:6,result:{value:'6',impact:{x:0.9,y:0}}}], null)`);
  const ctx = face.getContext('2d');
  assert.equal(ctx.lineWidth, 1);
  assert.match(ctx.font, /13px/);
  const arcs = ctx.calls.filter(c => c[0] === 'arc');
  const outer = 300 * 0.46 * 3;
  assert.ok(arcs.some(a => Math.abs(a[3] - outer) < 0.8), arcs.map(a => a[3]).join(','));
  assert.ok(arcs.some(a => a[3] === 11), 'dot radius stays 11');
  assert.ok(!arcs.some(a => a[3] === 33), 'dots are not scaled with zoom');
  const texts = ctx.calls.filter(c => c[0] === 'fillText').map(c => c[1]);
  assert.ok(texts.includes('1') && texts.includes('2'), texts.join(','));
  p.run("faceView.faceShot={z:2,tx:0,ty:0};scoreFaceTap(document.getElementById('faceShot'),150,150+(-0.3)*300*0.46*2)");
  const hit = JSON.parse(p.run("JSON.stringify(store.list()[0].shots.find(s=>s.t_ms===1000).result)"));
  assert.equal(hit.value, '9');
  assert.ok(Math.abs(hit.impact.y + 0.3) < 1e-9 && Math.abs(hit.impact.x) < 1e-9, JSON.stringify(hit));
  const ev = (id, x, y) => `{pointerId:${id},offsetX:${x},offsetY:${y},preventDefault(){},stopPropagation(){}}`;
  p.run("scoreArrow(1000,null);faceView.faceShot={z:1,tx:0,ty:0};render()");
  p.run(`faceDown(document.getElementById('faceShot'),${ev(1, 100, 150)});faceDown(document.getElementById('faceShot'),${ev(2, 200, 150)});
    faceMove(document.getElementById('faceShot'),${ev(1, 50, 150)});faceMove(document.getElementById('faceShot'),${ev(2, 250, 150)})`);
  const zoomed = JSON.parse(p.run("JSON.stringify(faceView.faceShot)"));
  assert.ok(Math.abs(zoomed.z - 2) < 1e-9 && Math.abs(zoomed.tx) < 1e-9 && Math.abs(zoomed.ty) < 1e-9, JSON.stringify(zoomed));
  p.run(`faceMove(document.getElementById('faceShot'),${ev(1, 80, 150)});faceMove(document.getElementById('faceShot'),${ev(2, 280, 150)});
    faceUp(document.getElementById('faceShot'),${ev(1, 80, 150)});faceUp(document.getElementById('faceShot'),${ev(2, 280, 150)});faceFlush(document.getElementById('faceShot'))`);
  const panned = JSON.parse(p.run("JSON.stringify(faceView.faceShot)"));
  assert.ok(Math.abs(panned.z - 2) < 1e-9 && Math.abs(panned.tx + 30 / 276) < 1e-9, JSON.stringify(panned));
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value"), undefined);
  p.run("faceView.faceShot={z:2.5,tx:0.2,ty:-0.1}");
  p.run(`c=document.getElementById('faceShot');faceDown(c,${ev(1, 40, 40)});faceUp(c,${ev(1, 40, 40)});faceDown(c,${ev(1, 48, 46)});faceUp(c,${ev(1, 48, 46)})`);
  const back = JSON.parse(p.run("JSON.stringify(faceView.faceShot)"));
  assert.deepEqual(back, {z: 1, tx: 0, ty: 0});
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value"), undefined);
});

test('dragging a numbered impact updates that arrow and a pinch does not score another', () => {
  const p = page();
  const ev = (id, x, y) => `{pointerId:${id},offsetX:${x},offsetY:${y},preventDefault(){},stopPropagation(){}}`;
  p.run(`second={...fixture,t_ms:2000,aim_score:70};curSess.shots=[fixture,second];data={shots:curSess.shots};store.save([curSess]);
    placeArrow(1000,0,0);view='Shot';cur=0;scoreFocus=2000;render()`);
  const face = p.elements.get('faceShot');
  face.clientWidth = 300;
  p.run("render()");
  const y9 = 150 + (-0.3) * 300 * 0.46;
  p.run(`c=document.getElementById('faceShot');faceDown(c,${ev(1, 150, 150)});faceMove(c,${ev(1, 150, y9)})`);
  assert.equal(p.run("data.shots.find(s=>s.t_ms===1000).result.value"), '9');
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value"), 'X');
  assert.equal(p.run("data.shots.find(s=>s.t_ms===2000).result"), undefined);
  p.run(`faceUp(document.getElementById('faceShot'),${ev(1, 150, y9)})`);
  const moved = JSON.parse(p.run("JSON.stringify(store.list()[0].shots.find(s=>s.t_ms===1000).result)"));
  assert.equal(moved.value, '9');
  assert.ok(Math.abs(moved.impact.y + 0.3) < 1e-6 && Math.abs(moved.impact.x) < 1e-6, JSON.stringify(moved));
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===2000).result"), undefined);
  p.run("placeArrow(1000,0,0);scoreFocus=2000;render()");
  p.run(`c=document.getElementById('faceShot');faceDown(c,${ev(1, 150, 150)});faceUp(c,${ev(1, 150, 150)});faceFlush(c)`);
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value"), 'X');
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===2000).result"), undefined);
  assert.equal(p.run("scoreFocus"), 1000);
  p.run("scoreFocus=2000;render()");
  p.run(`c=document.getElementById('faceShot');faceDown(c,${ev(1, 150, y9)});faceMove(c,${ev(1, 150, y9 - 30)});faceUp(c,${ev(1, 150, y9 - 30)});faceFlush(c)`);
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===2000).result"), undefined);
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value"), 'X');
  p.run(`c=document.getElementById('faceShot');faceDown(c,${ev(1, 150, y9)});faceUp(c,${ev(1, 150, y9)});faceFlush(c)`);
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===2000).result.value"), '9');
  p.run("placeArrow(1000,0,0);scoreArrow(2000,null);scoreFocus=2000;render()");
  p.run(`c=document.getElementById('faceShot');faceDown(c,${ev(1, 150, 150)});faceMove(c,${ev(1, 150, y9)});faceDown(c,${ev(2, 210, 150)})`);
  assert.equal(p.run("data.shots.find(s=>s.t_ms===1000).result.value"), 'X');
  assert.equal(p.run("data.shots.find(s=>s.t_ms===1000).result.impact.x"), 0);
  p.run(`c=document.getElementById('faceShot');faceMove(c,${ev(2, 260, 160)});faceUp(c,${ev(1, 150, y9)});faceUp(c,${ev(2, 260, 160)});faceFlush(c)`);
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.value"), 'X');
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===1000).result.impact.y"), 0);
  assert.equal(p.run("store.list()[0].shots.find(s=>s.t_ms===2000).result.value"), undefined);
  assert.ok(p.run("faceView.faceShot.z") > 1);
});

test('progress hides the stability chart until twenty arrows are scored', () => {
  const p = page();
  p.run(`document.getElementById('progressProfile').value='Sin equipo · v1';store.save([{id:1,shots:Array.from({length:8},(_,i)=>({t_ms:i+1,aim_score:80,draw_ms:2000,result:{value:'9'}}))}]);show('Progress')`);
  assert.equal(p.elements.get('splitNeed').textContent, 'Faltan 12');
  assert.equal(p.elements.get('splitBody').hidden, true);
  assert.equal(p.elements.get('splitNeed').textContent.split('\\n').length, 1);
  p.run(`store.save([{id:1,shots:Array.from({length:20},(_,i)=>({t_ms:i+1,aim_score:i<12?90:70,draw_ms:i<12?1800:3800,result:{value:i<12?'X':'8'}}))}]);show('Progress')`);
  assert.equal(p.elements.get('splitNeed').textContent, '');
  assert.equal(p.elements.get('splitBody').hidden, false);
  assert.equal(p.elements.get('splitHighAim').textContent, '90');
  assert.equal(p.elements.get('splitLowAim').textContent, '70');
  assert.equal(p.elements.get('splitHighTime').textContent, '3,0 s');
  assert.equal(p.elements.get('splitLowTime').textContent, '5,0 s');
  assert.ok(p.elements.get('splitPlot').getContext('2d').calls.some(c => c[0] === 'arc'));
});

test('exported shots without a position still open every scoring view', () => {
  const p = page();
  const shots = require('./fixtures/release-paint-20261002.json');
  p.run(`const exported=${JSON.stringify(shots)};curSess={id:3,shots:exported};data={shots:exported};store.save([curSess]);historyMode=false;show('Shot');show('Set');show('Session');show('Progress')`);
  assert.match(p.elements.get('shotScore').innerHTML, /id="faceShot"/);
  assert.match(p.elements.get('setScore').innerHTML, /id="faceSet"/);
  assert.match(p.elements.get('setScore').innerHTML, /data-score="M"/);
  assert.equal(p.elements.get('sessionGroupWrap').hidden, true);
  assert.equal(p.run('Score.impacts(data.shots).length'), 0);
  assert.equal(p.elements.get('splitNeed').textContent, 'Faltan 20');
  assert.equal(String(p.elements.get('scoreTotal').textContent), '–');
});
