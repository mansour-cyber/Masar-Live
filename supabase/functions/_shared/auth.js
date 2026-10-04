const databaseUrl=Deno.env.get('SUPABASE_URL');
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
export const siteOrigin='https://mansour-cyber.github.io';
export const cors={'access-control-allow-origin':siteOrigin,'access-control-allow-headers':'authorization, content-type','access-control-allow-methods':'GET, POST, OPTIONS','content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'Origin'};
export const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
export function checkOrigin(request){const origin=request.headers.get('origin');return origin&&!allowedOrigins.has(origin)?json({error:'invalid_origin'},403):null;}
export async function database(table,query={},options={}){
  const url=new URL(databaseUrl+'/rest/v1/'+table);for(const [key,value] of Object.entries(query))url.searchParams.set(key,String(value));
  const response=await fetch(url,{...options,headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json',...options.headers}});
  const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{throw new Error('storage_response');}
  return {ok:response.ok,status:response.status,data,count:Number(response.headers.get('content-range')?.split('/')[1]||0)};
}
export const bytesToB64=bytes=>btoa(String.fromCharCode(...bytes));
const b64ToBytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export async function hashToken(token){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function newToken(){return bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
async function derive(password,salt,iterations){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:b64ToBytes(salt),iterations,hash:'SHA-256'},key,256));}
export async function verifyPassword(password,credential){if(!credential)return false;const a=await derive(password,credential.salt,credential.iterations),b=b64ToBytes(credential.hash);if(a.length!==b.length)return false;let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;}
export async function createCredential(password){const salt=bytesToB64(crypto.getRandomValues(new Uint8Array(16))),iterations=600000;return {salt,hash:bytesToB64(await derive(password,salt,iterations)),iterations};}
export const passwordValid=password=>typeof password==='string'&&password.length>=8&&password.length<=128&&password.trim().length>=8;
export async function credentialFor(userId){const r=await database('pmp_credentials',{user_id:'eq.'+userId,select:'salt,hash,iterations,must_change_password,revision',limit:1});if(!r.ok)throw new Error('storage');return r.data?.[0]||null;}
export const userPublic=user=>({id:user.id,username:user.username,display_name:user.display_name,role:user.role,must_change_password:!!user.must_change_password});
export async function authenticate(request){
  const match=/^Bearer ([A-Za-z0-9_-]{32,256})$/i.exec(request.headers.get('authorization')||'');if(!match)return null;
  const tokenHash=await hashToken(match[1]);const sessions=await database('pmp_sessions',{token_hash:'eq.'+tokenHash,select:'user_id,expires_at',limit:1});
  if(!sessions.ok)throw new Error('storage');const s=sessions.data?.[0],expiry=new Date(s?.expires_at).getTime();if(!s||!Number.isFinite(expiry)||expiry<=Date.now())return null;
  const result=await database('pmp_users',{id:'eq.'+s.user_id,select:'id,username,display_name,active,role',limit:1});if(!result.ok)throw new Error('storage');const user=result.data?.[0];if(!user?.active)return null;
  const credential=await credentialFor(user.id);if(!credential)return null;user.must_change_password=credential.must_change_password;
  return {user,credential,tokenHash};
}
export function requirePasswordChange(s){return s.user.must_change_password?json({error:'password_change_required',user:userPublic(s.user)},403):null;}
export async function readBody(request,max=4096){if(!request.headers.get('content-type')?.startsWith('application/json'))return {error:json({error:'invalid_content_type'},415)};const raw=await request.text();if(new TextEncoder().encode(raw).length>max)return {error:json({error:'request_too_large'},413)};try{return {body:JSON.parse(raw)};}catch{return {error:json({error:'invalid_request'},400)};}}

export const allowedOrigins=new Set([siteOrigin,'https://atqn.tech','https://www.atqn.tech']);
export function withCors(handler){return async request=>{
  const origin=request.headers.get('origin');
  if(origin&&!allowedOrigins.has(origin))return json({error:'invalid_origin'},403);
  const response=await handler(request),headers=new Headers(response.headers);
  headers.set('access-control-allow-origin',origin||siteOrigin);
  headers.set('vary','Origin');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
};}
