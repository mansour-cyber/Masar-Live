import {cors,json,database,checkOrigin,authenticate,requirePasswordChange,userPublic,credentialFor,verifyPassword,createCredential,passwordValid,hashToken,newToken,readBody} from '../_shared/auth.js';
export async function handler(request){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});const originError=checkOrigin(request);if(originError)return originError;
  const action=new URL(request.url).searchParams.get('action')||'health';
  if(request.method==='GET'&&action==='health')return json({ok:true,service:'pmp-api'});
  try{
    if(request.method==='POST'&&action==='login'){
      const input=await readBody(request);if(input.error)return input.error;const username=String(input.body?.username||'').trim().toLowerCase(),password=String(input.body?.password??input.body?.pin??'');
      if(!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username)||!password||password.length>128)return json({error:'invalid_credentials'},401);
      const ip=(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').trim().slice(0,100),since=new Date(Date.now()-600000).toISOString();
      const attempts=await database('pmp_auth_attempts',{username:'eq.'+username,ip:'eq.'+ip,success:'eq.false',created_at:'gte.'+since,select:'id'},{method:'HEAD',headers:{Prefer:'count=exact'}});if(!attempts.ok)throw new Error('storage');if(attempts.count>=5)return json({error:'too_many_attempts'},429);
      const users=await database('pmp_users',{username:'eq.'+username,select:'id,username,display_name,active,role',limit:1});if(!users.ok)throw new Error('storage');const user=users.data?.[0],credential=user?await credentialFor(user.id):null;
      const ok=!!user?.active&&!!credential&&await verifyPassword(password,credential);
      const recorded=await database('pmp_auth_attempts',{}, {method:'POST',body:JSON.stringify({username,ip,success:ok})});if(!recorded.ok)throw new Error('storage');if(!ok)return json({error:'invalid_credentials'},401);
      await database('pmp_auth_attempts',{username:'eq.'+username,ip:'eq.'+ip,success:'eq.false'},{method:'DELETE'});
      user.must_change_password=credential.must_change_password;const token=newToken(),expiresAt=new Date(Date.now()+(credential.must_change_password?600000:30*86400000)).toISOString();
      const saved=await database('pmp_sessions',{}, {method:'POST',body:JSON.stringify({token_hash:await hashToken(token),user_id:user.id,expires_at:expiresAt})});if(!saved.ok)throw new Error('storage');
      let progress=null,updatedAt=null;if(!credential.must_change_password){const r=await database('pmp_progress',{user_id:'eq.'+user.id,select:'state,updated_at',limit:1});if(!r.ok)throw new Error('storage');progress=r.data?.[0]?.state||null;updatedAt=r.data?.[0]?.updated_at||null;}
      return json({token,expires_at:expiresAt,user:userPublic(user),requiresPasswordChange:!!credential.must_change_password,progress,updated_at:updatedAt});
    }
    const s=await authenticate(request);if(!s)return json({error:'unauthorized'},401);
    if(request.method==='POST'&&action==='logout'){await database('pmp_sessions',{token_hash:'eq.'+s.tokenHash},{method:'DELETE'});return json({ok:true});}
    if(request.method==='GET'&&action==='profile')return json({user:userPublic(s.user)});
    if(request.method==='POST'&&action==='change_password'){
      const input=await readBody(request);if(input.error)return input.error;const {currentPassword,newPassword}=input.body||{};
      if(!passwordValid(newPassword)||newPassword===currentPassword)return json({error:'password_policy'},400);
      const since=new Date(Date.now()-600000).toISOString(),ip='password-change';
      const attempts=await database('pmp_auth_attempts',{username:'eq.'+s.user.username,ip:'eq.'+ip,success:'eq.false',created_at:'gte.'+since,select:'id'},{method:'HEAD',headers:{Prefer:'count=exact'}});if(!attempts.ok)throw new Error('storage');if(attempts.count>=5)return json({error:'too_many_attempts'},429);
      if(typeof currentPassword!=='string'||currentPassword.length>128||!await verifyPassword(currentPassword,s.credential)){await database('pmp_auth_attempts',{}, {method:'POST',body:JSON.stringify({username:s.user.username,ip,success:false})});return json({error:'incorrect_current_password'},400);}
      const credential=await createCredential(newPassword),token=newToken(),expiresAt=new Date(Date.now()+30*86400000).toISOString();
      const result=await database('rpc/pmp_change_password',{}, {method:'POST',body:JSON.stringify({p_user_id:s.user.id,p_current_hash:s.credential.hash,p_revision:s.credential.revision,p_salt:credential.salt,p_hash:credential.hash,p_iterations:credential.iterations,p_token_hash:await hashToken(token),p_expires_at:expiresAt})});
      if(!result.ok)return json({error:result.data?.code==='40001'?'password_changed_elsewhere':'save_failed'},result.data?.code==='40001'?409:503);
      await database('pmp_auth_attempts',{username:'eq.'+s.user.username,ip:'eq.'+ip,success:'eq.false'},{method:'DELETE'});
      s.user.must_change_password=false;return json({ok:true,token,expires_at:expiresAt,user:userPublic(s.user)});
    }
    const passwordError=requirePasswordChange(s);if(passwordError)return passwordError;
    if(request.method==='GET'&&action==='progress'){const r=await database('pmp_progress',{user_id:'eq.'+s.user.id,select:'state,updated_at',limit:1});if(!r.ok)throw new Error('storage');return json({user:userPublic(s.user),progress:r.data?.[0]?.state||null,updated_at:r.data?.[0]?.updated_at||null});}
    if(request.method==='POST'&&action==='progress'){const input=await readBody(request,500000);if(input.error)return input.error;if(input.body?.expectedUserId&&input.body.expectedUserId!==s.user.id)return json({error:'account_changed'},409);const state=input.body?.state;if(!state||typeof state!=='object'||Array.isArray(state))return json({error:'invalid_state'},400);const updatedAt=new Date().toISOString();const r=await database('pmp_progress',{}, {method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({user_id:s.user.id,state,updated_at:updatedAt})});if(!r.ok)throw new Error('storage');return json({ok:true,updated_at:updatedAt});}
    return json({error:'not_found'},404);
  }catch{return json({error:'storage_unavailable'},503);}
}
Deno.serve(handler);
