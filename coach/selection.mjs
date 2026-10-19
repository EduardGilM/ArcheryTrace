import Agent from '../mobile/coach-agent.js';

const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/^[¿¡]+|[?!.,;]+$/g,'').trim();
const action='(?:mira|revisa|revisame|analiza|analizame|evalua|evaluame|estudia)';
const observation='(?:dime|cuentame|muestrame|destaca|encuentra)\\s+(?:algo(?:\\s+(?:interesante|curioso|util|destacable))?|(?:un|algun)\\s+(?:dato|patron|detalle|hallazgo|resultado)(?:\\s+(?:interesante|curioso|util|destacable))?)\\s+(?:de|sobre|en)';
const inquiry='(?:'+action+'|'+observation+')';
const records='(?:(?:todos|todas)\\s+)?(?:(?:mi|mis|la|las|el|los)\\s+)?(?:sesion|sesiones|entrenamiento|entrenamientos|tiros|flechas)';
const request=new RegExp('^(?:'+inquiry+'\\s+)?'+records+'\\s+(?:de\\s+)?(hoy|ayer|anteayer)(?:\\s*,?\\s+(?:a\\s+las?\\s+)?(\\d{1,2}:\\d{2}))?(?:\\s+y\\s+(?:analizal[ao]s?|revisal[ao]s?|evalual[ao]s?))?$');
const allRequest=new RegExp('^'+inquiry+'\\s+(?:(?:todos|todas)\\s+)?(?:(?:mis|los|las)\\s+)?(?:sesiones|entrenamientos|tiros|flechas)$');
const allScope=/^(?:(?:de|sobre|en|con)\s+)?(?:todos mis (?:tiros|entrenamientos|resultados|datos)|todas mis (?:sesiones|flechas)|todo (?:mi|el) historial)$/;
const correction=/^(?:(?:si(?: que)?(?: la| las| lo| los)? hay|si|es|era|fue|la de|me refiero a(?: la de)?)\s*,?\s*)?(?:a\s+las?\s+|las?\s+)?(\d{1,2}:\d{2})$/;
const confirmation=/^si(?: que)?(?: la| las| lo| los)? hay$/;
const validTime=time=>/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(time);
function explicit(text,today) {
  const q=normalize(text),m=q.match(request);
  if(m){
    if(m[2]&&!validTime(m[2]))return null;
    const ago={hoy:0,ayer:1,anteayer:2}[m[1]],day=new Date(Date.parse(today+'T12:00:00Z')-ago*864e5).toISOString().slice(0,10);
    return {day,time:m[2]?.padStart(5,'0')||''};
  }
  return allRequest.test(q)||allScope.test(q)?{all:true}:null;
}
function personalOverview(text) {
  const q=normalize(text);
  const personal=/\b(?:mis (?:tiros|sesiones|entrenamientos|resultados|datos)|mi (?:rendimiento|evolucion|precision|progreso|estabilidad|puntuacion))(?: en general| en conjunto)?$/.test(q);
  const analysis=/\b(?:analiz\w*|revis\w*|evalua\w*|interesan\w*|curios\w*|llamativ\w*|destac\w*|patron\w*|tendenc\w*|opin\w*|ves|van|resumen|conclusion\w*|hallazgo\w*|evolucion|progreso|rendimiento)\b/.test(q);
  const constrained=/\d|\b(?:hoy|ayer|anteayer|actual|ultim[ao]s?|esas?|esos?|semana|mes|ano|lunes|martes|miercoles|jueves|viernes|sabado|domingo|verano|invierno|primavera|otono|con|usando)\b/.test(q);
  return personal&&analysis&&!constrained;
}
// Only complete, unambiguous session requests are resolved here. Other requests,
// including mixed subjects and instructions to change roles, retain the model's plan.
export function resolveSelection(plan,input) {
  let selected=explicit(input.question,input.catalog.today);
  if(!selected&&plan.scope!=='refuse'&&personalOverview(input.question))selected={all:true};
  if(!selected){
    const q=normalize(input.question),time=q.match(correction)?.[1],follow=!!time||confirmation.test(q);
    if(follow&&(!time||validTime(time))){
      const users=input.messages.filter(m=>m.role==='user').slice().reverse();
      for(const message of users){
        const text=message.content.replace(/^Sobre .*?: /,''),origin=explicit(text,input.catalog.today);
        if(origin){
          if(!origin.all){
            const savedDay=message.content.match(/^Sobre (\d{4}-\d{2}-\d{2})(?: a (\d{4}-\d{2}-\d{2}))?: /);
            const day=savedDay&&Agent.day(savedDay[1])&&(!savedDay[2]||savedDay[2]===savedDay[1])?savedDay[1]:origin.day;
            selected={...origin,day,time:time?.padStart(5,'0')||origin.time};
          }
          break;
        }
        if(!correction.test(normalize(text))&&!confirmation.test(normalize(text)))break;
      }
    }
  }
  if(!selected)return Agent.resolvePlan(plan,input.question,input.catalog);
  const scope=selected.all?'all':selected.time?'sessions':'dates';
  const ids=scope==='sessions'?input.catalog.sessions.filter(s=>s.day===selected.day&&s.time===selected.time).map(s=>s.id):[];
  const resolved={...plan,scope,start:scope==='dates'?selected.day:'',end:scope==='dates'?selected.day:'',ids,count:1,detail:plan.scope==='refuse'?false:plan.detail};
  if(Object.hasOwn(resolved,'reads')){const allowed=Agent.select(resolved,input.catalog,input.previous);resolved.reads=resolved.reads.filter(r=>allowed.includes(r.session));}
  return resolved;
}
