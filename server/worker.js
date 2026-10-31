import {validate, STATUSES} from '../public/shared.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}});
const configured=e=>Boolean(e.APPS_SCRIPT_URL);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
async function body(request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('نوع الطلب غير مدعوم.');if(Number(request.headers.get('content-length'))>16000)throw Error('الطلب كبير جداً.');const reader=request.body?.getReader();if(!reader)throw Error('الطلب فارغ.');let size=0,parts=[];while(true){const{done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();throw Error('الطلب كبير جداً.');}parts.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return JSON.parse(new TextDecoder().decode(bytes));}
async function sheets(env,action,data){if(!env.APPS_SCRIPT_URL)return {ok:false,error:'خدمة حفظ الطلبات لم تُربط بعد.'};try{const url=new URL(env.APPS_SCRIPT_URL);if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec'))throw Error();const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data}),redirect:'follow',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();const result=await response.json();if(typeof result.ok!=='boolean')throw Error();return result;}catch{return {ok:false,error:'تعذر تأكيد الحفظ أو تحميل البيانات من Google Sheets. أعد المحاولة بنفس رقم الطلب.'};}}
export async function handle(request,env){const url=new URL(request.url),path=url.pathname;
if(path.startsWith('/api/')||path==='/admin'||path.startsWith('/admin/')){
 if(path==='/api/config'&&request.method==='GET')return json({storage:configured(env)});
 if(path==='/admin'||path.startsWith('/admin/')||path.startsWith('/api/admin/'))return json({ok:false,error:'إدارة الطلبات من جدول Google Sheets الخاص بصاحب الخدمة.'},404);
 if(request.method!=='GET'&&request.method!=='HEAD'){if(request.headers.get('origin')!==url.origin)return json({ok:false,error:'مصدر الطلب غير مسموح.'},403);}
 if(path==='/api/orders'&&request.method==='POST'){
  if(!configured(env))return json({ok:false,error:'الحفظ المباشر غير مفعّل. استخدم واتساب.'},503);
  let raw,data;try{raw=await body(request);data=validate(raw);if(!uuid(raw.id))throw Error('رقم الطلب غير صالح.');}catch(e){return json({ok:false,error:e.message},400);}
  const result=await sheets(env,'submit',{order:{...data,id:raw.id}});if(!result.ok||!uuid(result.id))return json({ok:false,error:result.error||'لم يتم تأكيد حفظ الطلب.'},502);return json({ok:true,id:result.id,duplicate:!!result.duplicate});
 }
 return json({ok:false,error:'المسار أو طريقة الطلب غير مدعومة.'},404);
}
return env.ASSETS.fetch(request);
}
export default {fetch:handle};
