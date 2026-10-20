const assert=require('node:assert/strict'), T=require('../../mobile/session-model.js');
const shot=(eid,t,set=1)=>({kind:'shot',sid:'X-trace',eid,t,set,score:90,peak:4000,instab:100,dt:50});

// La sesión abierta del sid sigue recibiendo; una cerrada con el mismo sid no reabre.
let A=T.create({sid:'X-trace'},1000);
A=T.apply(A,shot(0,1000));
assert.equal(T.route([A],shot(1,5000)),0);
T.seal(A);
assert.equal(A.finished,true); assert.equal(A.live,false);
assert.deepEqual(A.awaiting,{sid:'X-trace',eid:0});
// eco viejo (eid <= corte): va a la sellada, que lo descarta por lastEvent
assert.equal(T.route([A],shot(0,1000)),0);
assert.equal(T.apply(A,shot(0,1000)).shots.length,1);
// tiro nuevo sin sesión preparada: que cree la suya
assert.equal(T.route([A],shot(1,5000)),-1);

// Nueva sesión preparada: hereda el corte y adopta el sensor con el primer tiro nuevo.
let B=T.newSession([A],2000);
assert.equal(B.prepared,true); assert.equal(B.sensorId,null); assert.equal(B.live,true);
assert.equal(B.finished,undefined);
assert.equal(Math.max(...[A,B].map(s=>s.id)),2000);
B.awaiting=A.awaiting;
let L=[A,B];
assert.equal(T.route(L,shot(1,5000)),1);  // eid 1 > corte 0 -> tiro nuevo de la preparada
// eco viejo (eid <= corte): no adopta y cae en la cerrada, que lo descarta
assert.equal(T.route(L,shot(0,1000)),0);

// El sensor arranca sid nuevo tras el end: el start adopta la preparada.
const start={kind:'start',sid:'Y-trace',eid:0,build:1};
assert.equal(T.route(L,start),1);
B=T.apply(B,start); assert.equal(B.build,1);
L=[A,B];
B.sensorId='Y-trace'; delete B.prepared; B.awaiting=null;
assert.equal(T.route(L,{...shot(1,9000),sid:'Y-trace'}),1);

// Sin sesión preparada, un sid desconocido crea la suya.
assert.equal(T.route([A],shot(5,9000)),-1);
assert.equal(T.route([A],{kind:'end',sid:'Z-trace',eid:1}),-1);

// Un end tardío va a la cerrada del mismo sid, no a la preparada.
const endEcho={kind:'end',sid:'X-trace',eid:2};
assert.equal(T.route(L,endEcho),0);
const afterEnd=T.apply(A,endEcho);
assert.equal(afterEnd.finished,true); assert.equal(afterEnd.live,false);

// seal es idempotente y no deja awaiting sin sid.
T.seal(afterEnd); assert.deepEqual(afterEnd.awaiting,{sid:'X-trace',eid:2});
const manual=T.create({sid:''},9000); T.seal(manual);
assert.equal(manual.awaiting,null);

// Cerrar una sesión sin sid no inventa corte.
const noSid=T.newSession([],11000); noSid.sensorId=null;
T.seal(noSid); assert.equal(noSid.awaiting,null);

console.log('Sessions: seal/route, prepared adoption, retransmit guard, end echo, new sid PASS');
