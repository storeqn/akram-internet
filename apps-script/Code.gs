// نسخة مبسطة: إضافة طلبات فقط. لا قراءة عامة ولا لوحة إدارة ولا API_SECRET.
var SHEET_ID = '11-YFvu-oWbcd0fxQf893XM1vWYNmrSV8XlVFickWPlo';
var HEADERS = ['رقم الطلب','تاريخ الطلب','الاسم الثلاثي','رقم الهاتف','المحافظة','القضاء أو الناحية','المنطقة','أقرب نقطة دالة','نوع الخدمة','ملاحظات الزبون','رابط الموقع','خط العرض','خط الطول','حالة الطلب','ملاحظات داخلية','آخر تحديث','بصمة منع التكرار'];
var FIELDS = ['name','phone','province','district','area','landmark','service','notes','maps'];
var STATUSES = ['جديد','تم التواصل','قيد التجهيز','مكتمل','ملغي'];
function output_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return output_({ok:false,error:'هذا الرابط لاستقبال الطلبات فقط. إدارة الطلبات من جدولك الخاص.'}); }
function safe_(v) { var s=v==null?'':String(v); return /^[=+\-@\t\r\n]/.test(s)?"'"+s:s; }
function hash_(v) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,v).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join(''); }
function valid_(o) {
  if (!o || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(o.id)) throw Error('رقم الطلب غير صالح');
  var limits={name:120,phone:20,province:60,district:80,area:120,landmark:200,service:100,notes:1000,maps:1000};
  FIELDS.forEach(function(k){if(typeof o[k]!=='string'||o[k].length>limits[k])throw Error('حقل غير صالح');o[k]=o[k].trim();});
  if(o.name.split(/\s+/).length<3||!/^07[3-9]\d{8}$/.test(o.phone)||!o.province||!o.district||!o.area||!o.landmark)throw Error('أكمل البيانات المطلوبة');
  if(['إنترنت منزلي','إنترنت ضوئي','مؤسسات وشركات ودوائر حكومية'].indexOf(o.service)<0)throw Error('نوع خدمة غير صالح');
  if(o.maps&&!/^https:\/\/(?:maps\.app\.goo\.gl\/|goo\.gl\/maps(?:[/?#]|$)|maps\.google\.com(?:[/?#]|$)|(?:www\.)?google\.com\/maps(?:[/?#]|$))[^\s]*$/.test(o.maps))throw Error('رابط الخريطة غير صالح');
  if((o.lat!==null||o.lng!==null)&&(typeof o.lat!=='number'||typeof o.lng!=='number'||!isFinite(o.lat)||!isFinite(o.lng)||Math.abs(o.lat)>90||Math.abs(o.lng)>180))throw Error('موقع غير صالح');
  return o;
}
function sheet_() {
  var s=SpreadsheetApp.openById(SHEET_ID).getSheetByName('Orders');
  if(!s){s=SpreadsheetApp.openById(SHEET_ID).insertSheet('Orders');}
  if(s.getLastRow()===0){
    s.appendRow(HEADERS);s.setFrozenRows(1);s.setRightToLeft(true);
    s.getRange(1,1,1,HEADERS.length).setBackground('#071d36').setFontColor('#ffffff').setFontWeight('bold');
    s.setColumnWidths(1,HEADERS.length,160);s.setColumnWidth(1,280);s.setColumnWidth(8,230);s.hideColumns(17);
    var rule=SpreadsheetApp.newDataValidation().requireValueInList(STATUSES,true).setAllowInvalid(false).build();
    s.getRange(2,14,s.getMaxRows()-1,1).setDataValidation(rule);
  }
  if(s.getRange(1,1,1,HEADERS.length).getValues()[0].join('|')!==HEADERS.join('|'))throw Error('أسماء الأعمدة مختلفة. استخدم ورقة Orders فارغة أو استعد العناوين الصحيحة.');
  return s;
}
function doPost(e) {
  var lock=LockService.getScriptLock();
  try {
    if(!e||!e.postData||e.postData.contents.length>16000)throw Error('طلب غير صالح');
    var input=JSON.parse(e.postData.contents);
    if(input.action!=='submit')return output_({ok:false,error:'إضافة الطلبات فقط. لا يمكن قراءة بيانات العملاء من هذا الرابط.'});
    var o=valid_(input.order);
    var fingerprint=hash_(JSON.stringify(FIELDS.map(function(k){return o[k];}).concat([o.lat,o.lng])));
    lock.waitLock(20000);
    var s=sheet_(),count=s.getLastRow()-1;
    if(count){
      var ids=s.getRange(2,1,count,1).getValues();
      for(var i=0;i<ids.length;i++)if(ids[i][0]===o.id){
        if(s.getRange(i+2,17).getValue()!==fingerprint)return output_({ok:false,error:'تعارض رقم الطلب. أعد تحميل الصفحة.'});
        return output_({ok:true,id:o.id,duplicate:true});
      }
      var recent=s.getRange(Math.max(2,s.getLastRow()-99),1,Math.min(count,100),HEADERS.length).getValues();
      for(var j=recent.length-1;j>=0;j--)if(recent[j][16]===fingerprint&&Date.now()-new Date(recent[j][1]).getTime()<300000)return output_({ok:true,id:recent[j][0],duplicate:true});
    }
    var now=new Date().toISOString();
    var row=[o.id,now,o.name,o.phone,o.province,o.district,o.area,o.landmark,o.service,o.notes,(o.lat!==null?'https://www.google.com/maps?q='+o.lat+','+o.lng:o.maps),o.lat,o.lng,'جديد','',now,fingerprint];
    var range=s.getRange(s.getLastRow()+1,1,1,HEADERS.length);range.setNumberFormat('@');range.setValues([row.map(safe_)]);SpreadsheetApp.flush();
    return output_({ok:true,id:o.id,duplicate:false});
  }catch(error){return output_({ok:false,error:'لم يتم تأكيد الحفظ. تحقق من نشر السكربت وصلاحيات الجدول ثم أعد المحاولة.'});}
  finally{if(lock.hasLock())lock.releaseLock();}
}
