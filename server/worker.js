// Retired storage endpoints stay disabled, including for previously cached clients.
export async function handle(request,env){const path=new URL(request.url).pathname;if(path.startsWith('/api/')||path==='/admin'||path.startsWith('/admin/'))return new Response(JSON.stringify({ok:false,storage:false,error:'الطلبات عبر واتساب مباشرة. حدّث الصفحة لاستخدام الاستمارة الجديدة.'}),{status:410,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});return env.ASSETS.fetch(request);}
export default {fetch:handle};
