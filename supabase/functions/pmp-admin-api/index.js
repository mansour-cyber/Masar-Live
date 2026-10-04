import {withCors,cors,json,database,checkOrigin,authenticate,requirePasswordChange,userPublic,createCredential,passwordValid,readBody} from '../_shared/auth.js';
import {CATALOG,percent,score,summarizeJourney} from '../_shared/journey.js';
export async function handler(request){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});const originError=checkOrigin(request);if(originError)return originError;
  try{
    const s=await authenticate(request);if(!s)return json({error:'unauthorized'},401);const passwordError=requirePasswordChange(s);if(passwordError)return passwordError;if(s.user.role!=='admin')return json({error:'admin_required'},403);
    const url=new URL(request.url),action=url.searchParams.get('action')||'users';
    if(request.method==='GET'&&action==='users'){
      const offset=Math.max(0,Number(url.searchParams.get('offset')||0));if(!Number.isSafeInteger(offset))return json({error:'invalid_request'},400);
      const r=await database('pmp_admin_user_overview',{select:'*',order:'created_at.desc,id.asc',offset,limit:50});if(!r.ok)throw new Error('storage');
      const users=r.data.map(u=>({...u,coursePercent:percent(u.lessons_completed,CATALOG.lessons.length),bankPercent:percent(u.bank_practiced,CATALOG.bankTotal),levelScore:score(u.level_latest_score),mockScore:score(u.mock_latest_score),currentLesson:CATALOG.lessons.find(x=>x.id===u.current_lesson)||null}));
      return json({user:userPublic(s.user),users,nextOffset:users.length===50?offset+50:null});
    }
    if(request.method==='GET'&&action==='journey'){
      const id=url.searchParams.get('userId')||'';if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:'invalid_request'},400);
      const target=await database('pmp_users',{id:'eq.'+id,select:'id,username,display_name,active,role',limit:1});if(!target.ok)throw new Error('storage');if(!target.data?.[0])return json({error:'not_found'},404);
      const [course,bank]=await Promise.all([database('pmp_progress',{user_id:'eq.'+id,select:'state,updated_at',limit:1}),database('pmp_practice_progress',{user_id:'eq.'+id,select:'state,updated_at',limit:1})]);if(!course.ok||!bank.ok)throw new Error('storage');
      return json({user:target.data[0],updatedAt:[course.data?.[0]?.updated_at,bank.data?.[0]?.updated_at].filter(Boolean).sort().at(-1)||null,journey:summarizeJourney(course.data?.[0]?.state,bank.data?.[0]?.state)});
    }
    if(request.method==='POST'&&action==='create_user'){
      const input=await readBody(request);if(input.error)return input.error;const username=String(input.body?.username||'').trim().toLowerCase(),displayName=String(input.body?.displayName||'').trim(),password=input.body?.temporaryPassword;
      if(!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username)||!displayName||displayName.length>60||!passwordValid(password))return json({error:'invalid_user'},400);
      const credential=await createCredential(password),r=await database('rpc/pmp_create_user',{}, {method:'POST',body:JSON.stringify({p_username:username,p_display_name:displayName,p_salt:credential.salt,p_hash:credential.hash,p_iterations:credential.iterations})});
      if(!r.ok)return json({error:r.data?.code==='23505'?'username_exists':'save_failed'},r.data?.code==='23505'?409:503);
      return json({ok:true,user:{id:r.data,username,display_name:displayName,role:'learner',must_change_password:true}},201);
    }
    return json({error:'not_found'},404);
  }catch{return json({error:'storage_unavailable'},503);}
}
Deno.serve(withCors(handler));
