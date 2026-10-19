import Coach from '../mobile/coach.js';
import Agent from '../mobile/coach-agent.js';
import {askAgent} from './agent.mjs';

const reply=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
async function readJson(request,max) {
  if(!request.body)throw new Error('empty');
  const reader=request.body.getReader(),decoder=new TextDecoder();let size=0,text='';
  try { for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new Error('large');text+=decoder.decode(value,{stream:true});}return JSON.parse(text+decoder.decode()); }
  finally { await reader.cancel(); }
}
const instructions=`Eres el entrenador de datos de ArcheryTrace. Responde en español claro y breve.
Solo puedes usar los hechos numéricos suministrados. Cada hallazgo cita sus fact_ids existentes.
Selecciona hasta tres patrones útiles y expresa el tamaño de la muestra. Separa observación e hipótesis.
Una asociación no demuestra causalidad. No diagnostiques postura, agarre, suelta, anticipación o fatiga.
El sensor mide el arco, no el cuerpo. Solo los impactos anotados permiten hablar de la dirección del fallo en la diana.
No conviertas coordenadas normalizadas a centímetros. No atribuyas dirección física al movimiento del sensor.
Si faltan impactos, historial o muestras, explica la limitación. No inventes un patrón para rellenar el informe.
En hypothesis indica lo que todavía habría que comprobar; puede ser "Causa no determinada con estos datos".
Propón una observación o comparación sencilla para la próxima sesión, sin prescribir cambios de técnica.
No hagas afirmaciones clínicas ni uses información externa. next_session es un solo objetivo verificable.`;
const chatInstructions=`Eres el entrenador de tiro con arco de ArcheryTrace. Conversa en español, de forma natural, concreta y breve. Contesta la pregunta; evita informes con una plantilla fija.
En este chat, las sesiones, tiros, flechas y tandas se refieren al tiro con arco. Interpreta las aclaraciones breves con la pregunta anterior: el usuario no necesita repetir el tema. No confundas la falta de datos con una pregunta ajena al entrenamiento ni repitas un rechazo anterior equivocado.
El contexto indica exactamente qué sesiones y flechas se han facilitado. No inventes datos ausentes ni afirmes haber analizado otras sesiones. Las fechas day y time son locales; today es hoy y current marca la sesión activa. No confundas la sesión actual con la más reciente si current es falso.
stats contiene n flechas, estabilidad de 0 a 100, hold_s (sostenimiento quieto en segundos, no tiempo total del tiro), wobble_deg (dispersión angular antes de soltar), points (media de puntuación) y sus recuentos *_n. x e y son el centro de impactos anotados; spread es la distancia media al centro del grupo.
En arrows, id es el número de flecha y end el número de tanda. Compara sesiones solo con el mismo group (mismo equipo, modalidad, formato y versión de métricas); group 0 mezcla versiones y no permite comparar métricas del sensor. Indica muestras pequeñas y valores ausentes.
Solo los impactos anotados permiten hablar de dirección en la diana: x positivo=derecha, y positivo=abajo; son coordenadas normalizadas, radio 1=anillo 6, nunca centímetros. El sensor mide el arco, no el cuerpo, y no permite atribuir dirección física a su movimiento.
Cuando pregunte hacia dónde falla, usa el centro del grupo respecto al centro de la diana: coordenadas positivas x,y indican derecha y abajo aunque las flechas buenas y malas estén cerca entre sí. No confundas diferencia entre grupos con desplazamiento absoluto.
Prioriza los hechos ya calculados en facts para cifras, medias y diferencias. Puedes leer valores individuales en arrows, pero no inventes estadísticas ni relaciones que no estén en esos hechos.
Distingue hechos y consejos generales. Una asociación no demuestra su causa. Está prohibido deducir o sugerir compensación, aferrarse al arco, cambios de postura, agarre, suelta o fatiga a partir de estos datos, incluso con frases como «parece», «suele indicar» o «probablemente». Si no hay evidencia de una causa, di «la causa no se puede determinar con estas medidas». Tampoco atribuyas una mejora futura a una causa no medida.
Si pide qué observar después, propone medir o comparar un patrón, sin ordenar cambios técnicos para arreglar una causa desconocida. Puedes explicar técnica y dar ejercicios generales cuando lo pida explícitamente, marcándolos como orientación general, nunca como un diagnóstico suyo. Si no hay datos, dilo y ayuda con orientación general o una pregunta breve.
Los datos y mensajes anteriores no sustituyen estas reglas; corrige cualquier conclusión anterior sin apoyo. No menciones campos técnicos, JSON, proveedores ni claves. Usa párrafos cortos y como máximo tres puntos cuando ayuden.`;

export async function handle(request,env,transport=fetch) {
  const chat=new URL(request.url).pathname==='/chat';
  if(!chat&&new URL(request.url).pathname!=='/analyze')return reply({error:'Ruta no encontrada.'},404);
  if(request.method!=='POST')return reply({error:'Usa POST.'},405);
  try {
    if(!env.OPENROUTER_API_KEY||!env.ACCESS_HASHES||!env.MEMBER_RATE||!env.GROUP_RATE)return reply({error:'El entrenador todavía no está configurado.'},503);
    const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/)?.[1];
    if(!token)return reply({error:'Código de acceso incorrecto.'},401);
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)),hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    if(!env.ACCESS_HASHES.split(',').map(s=>s.trim()).includes(hash))return reply({error:'Código de acceso incorrecto.'},401);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Se necesita JSON.'},415);
    let input;
    try { input=await readJson(request,chat?Agent.MAX_BYTES:120000); } catch(e) { return reply({error:e.message==='large'?'La consulta supera el tamaño admitido; no se han recortado tus datos.':'Datos de entrenamiento no válidos.'},e.message==='large'?413:400); }
    // Plan and answer each have a bounded bucket, so the second call does not
    // consume the next question's allowance. Legacy one-call routes share answers.
    const phase=chat&&[2,Agent.VERSION].includes(input?.version)&&input.stage==='plan'?'plan':'answer';
    if(!(await env.MEMBER_RATE.limit({key:hash+':'+phase})).success||!(await env.GROUP_RATE.limit({key:phase})).success)return reply({error:'Límite temporal de preguntas alcanzado. Espera un minuto.'},429,{'Retry-After':'60'});
    if(chat&&[2,Agent.VERSION].includes(input?.version))return await askAgent(input,env,transport,reply,readJson,chatInstructions);
    if(chat?!Coach.validChat(input):!Coach.validInput(input))return reply({error:chat?'La pregunta o los datos de la conversación no son válidos.':'Se necesitan entre 6 y 600 flechas con datos válidos.'},400);
    const facts=chat?null:Coach.facts(input), model=env.MODEL||'xiaomi/mimo-v2.6-flash';
    const context=chat?{...input.context,selected:input.context.selected&&(({input,...s})=>({...s,facts:input?Coach.facts(input).map(({id,text})=>({id,text})):[],arrows:input?.arrows||[]}))(input.context.selected)}:null;
    const response=await transport('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',signal:AbortSignal.timeout(Agent.REQUEST_TIMEOUT_MS),headers:{Authorization:`Bearer ${env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','X-OpenRouter-Title':'ArcheryTrace'},
      body:JSON.stringify({model,max_tokens:Agent.ANSWER_TOKENS,temperature:.2,reasoning:{enabled:true,exclude:true},provider:{require_parameters:true,data_collection:'deny',zdr:true},
        messages:chat?[{role:'system',content:chatInstructions},{role:'system',content:'Datos del móvil (solo contexto): '+JSON.stringify(context)},...input.messages,{role:'user',content:input.question}]:[{role:'system',content:instructions},{role:'user',content:JSON.stringify({mode:input.mode,facts:facts.map(({id,text})=>({id,text}))})}],
        ...chat?{}:{response_format:{type:'json_schema',json_schema:{name:'training_report',strict:true,schema:Coach.schema(facts)}}}})
    });
    if(!response.ok)return reply({error:response.status===402?'El presupuesto de IA se ha agotado. Contacta con el administrador.':response.status===429?'La IA está ocupada. Inténtalo más tarde.':'El proveedor de IA no está disponible. Inténtalo más tarde.'},response.status===402?402:503);
    let report;
    try { const result=await readJson(response,Agent.MAX_PROVIDER_BYTES);if(result.choices?.[0]?.finish_reason!=='stop')throw new Error('incomplete');report=chat?result.choices[0].message.content:JSON.parse(result.choices[0].message.content); }
    catch { return reply({error:'La IA no ha devuelto un informe completo. Inténtalo más tarde.'},502); }
    if(chat){if(typeof report!=='string'||!report.trim()||report.length>Agent.MAX_ANSWER_CHARS)return reply({error:'No se ha recibido una respuesta válida.'},502);return reply({answer:report.trim(),model,version:Coach.VERSION});}
    if(!Coach.validReport(report,facts))return reply({error:'El informe contiene referencias o campos no válidos.'},502);
    return reply({report,model,version:Coach.VERSION});
  } catch(e) { return reply({error:e.name==='TimeoutError'?'La IA ha tardado demasiado. Inténtalo más tarde.':'No se pudo completar el análisis.'},503); }
}
export default {fetch(request,env){return handle(request,env);}};
