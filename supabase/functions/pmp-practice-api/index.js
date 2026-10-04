import {cors,json,database,checkOrigin,authenticate,requirePasswordChange} from '../_shared/auth.js';
const validState=s=>!!s&&typeof s==='object'&&!Array.isArray(s)&&s.version===1&&s.progress&&typeof s.progress==='object'&&!Array.isArray(s.progress)&&s.flags&&typeof s.flags==='object'&&!Array.isArray(s.flags)&&Array.isArray(s.history)&&(s.session===null||(typeof s.session==='object'&&!Array.isArray(s.session)));
export async function handler(request){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const originError=checkOrigin(request);if(originError)return originError;
  const action=new URL(request.url).searchParams.get('action');
  if(request.method==='GET'&&action==='health')return json({ok:true,service:'pmp-practice-api'});
  if(request.method!=='GET'&&request.method!=='POST')return json({error:'method_not_allowed'},405);
  try{
    const s=await authenticate(request);if(!s)return json({error:'unauthorized'},401);const passwordError=requirePasswordChange(s);if(passwordError)return passwordError;const user=s.user;
    const read=async()=>{
      const result=await database('pmp_practice_progress',{user_id:'eq.'+user.id,select:'state,revision,updated_at',limit:1});
      if(!result.ok)throw new Error('storage_unavailable');
      const row=result.data?.[0];return {userId:user.id,user:{username:user.username,display_name:user.display_name},state:row?.state||null,revision:row?.revision||0,updatedAt:row?.updated_at||null};
    };
    if(request.method==='GET')return json(await read());
    if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'invalid_content_type'},415);
    const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>1800000)return json({error:'state_too_large'},413);
    let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid_json'},400);}
    if(body.expectedUserId!==user.id)return json({error:'account_changed'},409);
    if(!Number.isSafeInteger(body.revision)||body.revision<0||!validState(body.state))return json({error:'invalid_state'},400);
    const updatedAt=new Date().toISOString();
    const result=body.revision===0
      ?await database('pmp_practice_progress',{}, {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:user.id,state:body.state,revision:1,updated_at:updatedAt})})
      :await database('pmp_practice_progress',{user_id:'eq.'+user.id,revision:'eq.'+body.revision},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({state:body.state,revision:body.revision+1,updated_at:updatedAt})});
    if((result.status===409&&result.data?.code==='23505')||(result.ok&&!result.data?.length))return json({error:'revision_conflict',...await read()},409);
    if(!result.ok)return json({error:'save_failed'},503);
    return json({userId:user.id,revision:body.revision+1,updatedAt});
  }catch{return json({error:'storage_unavailable'},503);}
}
Deno.serve(handler);
