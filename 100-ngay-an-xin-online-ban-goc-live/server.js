/**
 * 100 NGÀY ĂN XIN ONLINE — Node.js 22+, không cần npm install.
 * Luôn triển khai qua HTTPS. Khởi chạy: node --env-file=.env server.js
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {URL} = require('node:url');
const ROOT = __dirname;
const STORAGE_ROOT = process.env.STORAGE_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || ROOT;
const DATA_DIR = path.join(STORAGE_ROOT, 'data');
const UPLOAD_DIR = path.join(STORAGE_ROOT, 'uploads');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || '';
const verifiedProvider = SEPAY_API_KEY.length >= 16 && !/^(CHANGE|TEST|YOUR_)/i.test(SEPAY_API_KEY);
const sessions = new Set();
const rate = new Map();
fs.mkdirSync(DATA_DIR,{recursive:true});
fs.mkdirSync(UPLOAD_DIR,{recursive:true});
const month = 'THÁNG '+(new Date().getMonth()+1)+' / '+new Date().getFullYear();
const initialConfig = {month,heroBlurb:'Chúng mình đang thử một câu hỏi hơi kỳ quặc: Liệu người lạ có tự nguyện cho tiền để người khác đi chơi? Mỗi tháng một mục tiêu, mỗi lần trở về một câu chuyện. Không hứa cứu thế giới, chỉ kể thật những gì đã làm.',title:'Một chuyến đi ngẫu hứng!',description:'Đi đâu, làm gì, gặp ai? Chúng mình sẽ cập nhật hành trình và những bức ảnh thú vị ngay trên trang này.',target:3000000,bank:'',account:'',holder:'',tiktok:'',instagram:'',photos:[]};
let store;
try {store=JSON.parse(fs.readFileSync(STORE_FILE,'utf8'))}
catch {store={config:initialConfig,intents:{},transactions:[],createdAt:new Date().toISOString()};persist()}
store.config={...initialConfig,...store.config};
store.intents=store.intents||{};store.transactions=store.transactions||[];
function persist(){const temp=STORE_FILE+'.tmp';fs.writeFileSync(temp,JSON.stringify(store,null,2));fs.renameSync(temp,STORE_FILE)}
function json(res,code,data){const buf=Buffer.from(JSON.stringify(data));res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Content-Length':buf.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(buf)}
function bad(res,msg,status=400){json(res,status,{error:msg})}
function text(x,max=120){return String(x??'').normalize('NFC').trim().slice(0,max).replace(/[\u0000-\u001f\u007f]/g,'')}
function secureEq(a,b){if(!a||!b)return false;const A=Buffer.from(a),B=Buffer.from(b);return A.length===B.length && crypto.timingSafeEqual(A,B)}
function admin(req){const v=req.headers.authorization||'';return ADMIN_TOKEN.length>=20&&!/^(CHANGE|TEST|YOUR_)/i.test(ADMIN_TOKEN)&&secureEq(v,'Bearer '+ADMIN_TOKEN)}
function checkAdmin(req,res){if(!ADMIN_TOKEN||ADMIN_TOKEN.length<20||/^(CHANGE|TEST|YOUR_)/i.test(ADMIN_TOKEN)){bad(res,'Chưa đặt ADMIN_TOKEN tối thiểu 20 ký tự trong .env',503);return false}if(!admin(req)){bad(res,'Sai mã quản trị',401);return false}return true}
function parseBody(req,limit=3_000_000){return new Promise((resolve,reject)=>{let n=0,chunks=[];req.on('data',b=>{n+=b.length;if(n>limit){reject(new Error('Dữ liệu quá lớn'));req.destroy()}else chunks.push(b)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'))}catch{reject(new Error('JSON không hợp lệ'))}});req.on('error',reject)})}
function publicConfig(){const c=store.config;return {month:c.month,heroBlurb:c.heroBlurb,title:c.title,description:c.description,target:c.target,bank:c.bank,account:c.account,holder:c.holder,tiktok:c.tiktok,instagram:c.instagram,photos:c.photos}}
function stats(){const tx=store.transactions.filter(t=>t.campaign===store.config.month);const total=tx.reduce((sum,t)=>sum+t.amount,0);return {total,count:tx.length,donations:tx.filter(t=>t.show&&t.name).slice(-8).reverse().map(t=>({name:t.name,message:t.message||'',amount:t.amount,at:t.at,show:true}))}}
function paymentReady(){return !!(store.config.bank&&store.config.account&&store.config.holder)}
function stateResponse(){return {config:publicConfig(),stats:stats(),connected:verifiedProvider&&paymentReady(),paymentReady:paymentReady()}}
function broadcast(receipt){const payload='event: update\ndata: '+JSON.stringify({receipt:receipt||null})+'\n\n';for(const client of sessions){try{client.write(payload)}catch{sessions.delete(client)}}}
function ipLimited(req){const ip=String(req.socket.remoteAddress||'unknown');const now=Date.now();let e=rate.get(ip);if(!e||now-e.from>3600000)e={from:now,n:0};e.n++;rate.set(ip,e);if(rate.size>2000)for(const [key,val] of rate)if(now-val.from>3600000)rate.delete(key);return e.n>50}
function validUrl(u){return !u||/^https:\/\/[a-z0-9.-]+(?:\:[0-9]+)?(?:[/?#][^\s]*)?$/i.test(u)}
function normalizeConfig(v){const cur=store.config;
 const cfg={...cur,month:text(v.month,45),heroBlurb:text(v.heroBlurb,420),title:text(v.title,100),description:text(v.description,400),target:Math.floor(Number(v.target)),bank:text(v.bank,24).toUpperCase(),account:text(v.account,32).replace(/\s/g,''),holder:text(v.holder,100),tiktok:text(v.tiktok,250),instagram:text(v.instagram,250)};
 if(!cfg.month||!cfg.heroBlurb||!cfg.title||!cfg.description||!Number.isSafeInteger(cfg.target)||cfg.target<1||cfg.target>1e13)throw new Error('Thiếu tháng, tên/mô tả hoặc mục tiêu không hợp lệ');
 if(cfg.bank && !/^[A-Z0-9]{2,24}$/.test(cfg.bank))throw new Error('Mã ngân hàng chỉ gồm chữ và số');
 if(cfg.account && !/^[0-9]{5,32}$/.test(cfg.account))throw new Error('Số tài khoản ngân hàng chỉ gồm 5–32 chữ số');
 if(!validUrl(cfg.tiktok)||!validUrl(cfg.instagram))throw new Error('Link mạng xã hội phải bắt đầu bằng https://');
 return cfg;
}
function serveFile(res,file,mime){try{const body=fs.readFileSync(file);res.writeHead(200,{'Content-Type':mime,'Content-Length':body.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(body)}catch{bad(res,'Không tìm thấy',404)}}
function fileMime(name){const ext=path.extname(name).toLowerCase();return ({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'})[ext]}
function validateImage(buf,type){if(type==='image/png')return buf.length>8&&buf.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));if(type==='image/jpeg')return buf.length>3&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff;if(type==='image/webp')return buf.length>12&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';return false}
async function handler(req,res){
 const pathname=new URL(req.url||'/', 'http://localhost').pathname;
 if(req.method==='GET'&&(pathname==='/'||pathname==='/index.html'))return serveFile(res,path.join(ROOT,'index.html'),'text/html; charset=utf-8');
 if(req.method==='GET'&&(pathname==='/admin'||pathname==='/admin/'||pathname==='/admin.html'))return serveFile(res,path.join(ROOT,'admin.html'),'text/html; charset=utf-8');
 if(req.method==='GET'&&pathname==='/overlay.html')return serveFile(res,path.join(ROOT,'overlay.html'),'text/html; charset=utf-8');
 if(req.method==='GET'&&pathname.startsWith('/uploads/')){const name=pathname.slice('/uploads/'.length);if(!/^[a-f0-9]{24}\.(png|jpg|webp)$/.test(name))return bad(res,'Không tìm thấy',404);return serveFile(res,path.join(UPLOAD_DIR,name),fileMime(name))}
 if(req.method==='GET'&&pathname==='/api/state')return json(res,200,stateResponse());
 if(req.method==='GET'&&pathname==='/api/events'){
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');sessions.add(res);req.on('close',()=>sessions.delete(res));return;
 }
 if(req.method==='POST'&&pathname==='/api/intent'){
   if(!paymentReady())return bad(res,'Chưa cấu hình ngân hàng nhận tiền',503);
   if(!verifiedProvider)return bad(res,'Hệ thống chưa kết nối xác minh giao dịch SePay, chưa thể nhận ủng hộ',503);
   if(ipLimited(req))return bad(res,'Vượt giới hạn tạo mã. Thử lại sau.',429);
   const body=await parseBody(req,10000),amount=Number(body.amount),show=body.show===true,name=show?text(body.name,24):'',message=show?text(body.message,90):'';
   if(!Number.isSafeInteger(amount)||amount<1000||amount>1e12)return bad(res,'Số tiền không hợp lệ');
   if(show&&(!name||/[<>]/.test(name)))return bad(res,'Nickname không hợp lệ');
   if(message&&(/https?:|www\.|[<>]|@/i.test(message)||/[0-9]{9,}/.test(message)))return bad(res,'Lời nhắn không được chứa liên kết hoặc số liên hệ');
   // Nội dung ngắn không dấu, được đối chiếu chính xác trong webhook.
   let code;do{code='X100'+crypto.randomBytes(6).toString('hex').toUpperCase()}while(store.intents[code]);
   store.intents[code]={amount,show,name,message,campaign:store.config.month,createdAt:new Date().toISOString()};
   persist();return json(res,200,{code,amount});
 }
 if(req.method==='POST'&&pathname==='/api/webhooks/sepay'){
   // Header: Authorization: Apikey <SEPAY_API_KEY> (theo tài liệu SePay).
   // Không có key thì luôn từ chối, không mở chế độ giả giao dịch.
   if(!verifiedProvider||!secureEq(req.headers.authorization||'','Apikey '+SEPAY_API_KEY))return bad(res,'Webhook không hợp lệ',401);
   const b=await parseBody(req,100000);
   if(b.transferType!=='in')return json(res,200,{success:true,ignored:'Not incoming'});
   const configured=store.config.account;
   if(!configured||String(b.accountNumber||'').trim()!==configured)return json(res,200,{success:true,ignored:'Another account'});
   const gatewayId=text(b.id,90),ref=text(b.referenceCode,100);
   if(!gatewayId&&!ref)return bad(res,'Thiếu mã định danh giao dịch');
   const unique=gatewayId?'sepay:'+gatewayId:'sepayref:'+ref;
   if(store.transactions.some(t=>t.id===unique))return json(res,200,{success:true,duplicate:true});
   const amount=Number(b.transferAmount);
   if(!Number.isSafeInteger(amount)||amount<=0||amount>1e13)return bad(res,'Số tiền không hợp lệ');
   const memo=String(b.content||b.description||'').toUpperCase();
   // Trích mã theo ranh giới ký tự để tránh khớp nhầm mã gần giống.
   const match=memo.match(/(?:^|[^A-Z0-9])(X100[A-F0-9]{12})(?=$|[^A-Z0-9])/);
   const code=match?.[1];const pending=code&&store.intents[code];
   if(!pending)return json(res,200,{success:true,ignored:'Unknown payment code'});
   const tx={id:unique,code,amount,campaign:pending.campaign||store.config.month,name:pending.show?pending.name:'',message:pending.show?(pending.message||''):'',show:pending.show,at:new Date().toISOString()};
   store.transactions.push(tx);persist();
   broadcast({name:tx.show?tx.name:'',message:tx.show?tx.message:'',show:tx.show,amount:tx.show?amount:null});
   return json(res,200,{success:true});
 }
 if(pathname.startsWith('/api/admin/')){
   if(!checkAdmin(req,res))return;
   if(req.method==='GET'&&pathname==='/api/admin/state')return json(res,200,{config:publicConfig(),transactions:store.transactions.slice(-100).reverse()});
   if(req.method==='POST'&&pathname==='/api/admin/config'){
     const v=await parseBody(req,15000);try{store.config=normalizeConfig(v)}catch(e){return bad(res,e.message)}persist();broadcast();return json(res,200,{config:publicConfig()});
   }
   if(req.method==='POST'&&pathname==='/api/admin/photo'){
     const v=await parseBody(req,3_000_000),m=String(v.dataUrl||'').match(/^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/);
     if(!m)return bad(res,'Ảnh không hợp lệ');const buf=Buffer.from(m[2],'base64'),type=m[1];
     if(buf.length>2*1024*1024||buf.length<100||!validateImage(buf,type))return bad(res,'Ảnh không hợp lệ hoặc vượt 2 MB');
     if(store.config.photos.length>=60)return bad(res,'Đã đạt 60 ảnh; hãy xóa ảnh cũ trước');
     const id=crypto.randomBytes(12).toString('hex'),ext=type==='image/jpeg'?'jpg':type.split('/')[1],name=id+'.'+ext;
     fs.writeFileSync(path.join(UPLOAD_DIR,name),buf,{flag:'wx'});
     store.config.photos.unshift({id,url:'/uploads/'+name,caption:text(v.caption,90)||'Ảnh hoạt động',date:new Date().toLocaleDateString('vi-VN')});
     persist();broadcast();return json(res,200,{config:publicConfig()});
   }
   if(req.method==='DELETE'&&/^\/api\/admin\/photo\/[a-f0-9]{24}$/.test(pathname)){
     const id=pathname.split('/').pop(),p=store.config.photos.find(x=>x.id===id);
     if(!p)return bad(res,'Không thấy ảnh',404);
     store.config.photos=store.config.photos.filter(x=>x.id!==id);
     persist();const file=path.join(UPLOAD_DIR,path.basename(p.url));if(file.startsWith(UPLOAD_DIR+path.sep))fs.rmSync(file,{force:true});broadcast();return json(res,200,{config:publicConfig()});
   }
   if(req.method==='POST'&&/^\/api\/admin\/donation\/[^/]+\/hide$/.test(pathname)){
     const encoded=decodeURIComponent(pathname.split('/')[4]),d=store.transactions.find(x=>x.id===encoded);
     if(!d)return bad(res,'Không thấy giao dịch',404);d.show=false;d.name='';d.message='';persist();broadcast();return json(res,200,{success:true});
   }
 }
 return bad(res,'Không tìm thấy',404);
}
const server=http.createServer((req,res)=>Promise.resolve(handler(req,res)).catch(e=>{console.error('Request error:',e.message);if(!res.headersSent)bad(res,'Yêu cầu thất bại',400);else try{res.end()}catch{}}));
server.keepAliveTimeout=65000;
setInterval(()=>{for(const s of sessions){try{s.write(': ping\n\n')}catch{sessions.delete(s)}}},25000).unref();
server.listen(PORT,'0.0.0.0',()=>{console.log(`100 ngày ăn xin online → http://localhost:${PORT}`);console.log(`Admin: ${(ADMIN_TOKEN.length>=20&&!/^(CHANGE|TEST|YOUR_)/i.test(ADMIN_TOKEN))?'đã đặt mã':'CHƯA ĐẶT ADMIN_TOKEN >= 20 ký tự'}`);console.log(`Webhook SePay: ${verifiedProvider?'đã đặt API key':'CHƯA ĐẶT SEPAY_API_KEY >= 16 ký tự'}`)});
