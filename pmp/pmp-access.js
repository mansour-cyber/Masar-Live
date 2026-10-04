(()=>{
  const key='pmp_auth_session_v1',endpoint='https://anaylxsgsucyadkrawkq.supabase.co/functions/v1/pmp-api';
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
  const language=()=>document.documentElement.lang==='en'?'en':'ar';
  const t=(ar,en)=>language()==='en'?en:ar;
  const request=(action,options={})=>fetch(endpoint+'?action='+action,{...options,headers:{...options.headers,...read()?.token?{Authorization:'Bearer '+read().token}:{}}});
  function saveSession(data){localStorage.setItem(key,JSON.stringify({token:data.token,expires_at:data.expires_at,user:data.user}));}
  const rootPath=()=>location.pathname.includes('/admin/')||location.pathname.includes('/practice/')?'../':'./';
  function destination(){const next=new URLSearchParams(location.search).get('return_to');return next==='admin'?rootPath()+'admin/?v=6':next==='practice'?rootPath()+'practice/?v=6':rootPath();}
  function showPasswordChange(){
    document.body.classList.add('password-locked');let gate=document.getElementById('passwordGate');if(!gate){gate=document.createElement('section');gate.id='passwordGate';document.body.appendChild(gate);}
    gate.hidden=false;gate.style.display='grid';gate.innerHTML=`<form id="passwordForm" class="pmp-auth-card"><div class="row"><span class="eyebrow">${t('تأمين حسابك','Secure your account')}</span><b>PMP</b></div><h1>${t('غيّر كلمة المرور للمتابعة','Change your password to continue')}</h1><p>${t('هذا أول دخول بكلمة مرور مؤقتة. اختر كلمة مرور خاصة بك قبل الدخول إلى المنصة أو لوحة التحكم.','This is your first sign-in with a temporary password. Choose your own password before using the platform or admin dashboard.')}</p><label for="currentPassword">${t('كلمة المرور الحالية','Current password')}</label><input id="currentPassword" type="password" autocomplete="current-password" required maxlength="128"><label for="newPassword">${t('كلمة المرور الجديدة','New password')}</label><input id="newPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128"><p>${t('٨ أحرف على الأقل، وتختلف عن كلمة المرور المؤقتة.','At least 8 characters, different from the temporary password.')}</p><label for="confirmPassword">${t('تأكيد كلمة المرور الجديدة','Confirm new password')}</label><input id="confirmPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128"><div id="passwordError" class="error" role="alert"></div><button id="passwordSubmit" class="primary" type="submit">${t('حفظ كلمة المرور والمتابعة','Save password and continue')}</button><button id="passwordLogout" class="secondary" type="button" style="margin-top:12px">${t('تسجيل الخروج','Sign out')}</button></form>`;
    gate.querySelector('#passwordLogout').onclick=signout;
    gate.querySelector('#passwordForm').onsubmit=async event=>{
      event.preventDefault();const error=gate.querySelector('#passwordError'),button=gate.querySelector('#passwordSubmit');error.textContent='';const currentPassword=gate.querySelector('#currentPassword').value,newPassword=gate.querySelector('#newPassword').value;
      if(newPassword!==gate.querySelector('#confirmPassword').value){error.textContent=t('كلمتا المرور غير متطابقتين.','Passwords do not match.');return;}
      if(newPassword.trim().length<8||newPassword===currentPassword){error.textContent=t('اختر كلمة مرور جديدة من ٨ أحرف على الأقل.','Choose a different password with at least 8 characters.');return;}
      button.disabled=true;
      try{const r=await request('change_password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newPassword})}),data=await r.json();if(r.status===401){localStorage.removeItem(key);location.assign(rootPath()+'?return_to='+new URLSearchParams(location.search).get('return_to'));return;}if(!r.ok){error.textContent=data.error==='incorrect_current_password'?t('كلمة المرور الحالية غير صحيحة.','Current password is incorrect.'):data.error==='too_many_attempts'?t('محاولات كثيرة. أعد المحاولة بعد ١٠ دقائق.','Too many attempts. Try again in 10 minutes.'):t('تعذر حفظ كلمة المرور. أعد المحاولة.','Could not save your password. Please try again.');return;}saveSession(data);location.replace(destination());}
      catch{error.textContent=t('تعذر الاتصال. تحقق من الإنترنت وأعد المحاولة.','Connection failed. Check your internet connection and retry.');}finally{button.disabled=false;}
    };
  }
  async function signout(){try{await request('logout',{method:'POST'});}catch{}localStorage.removeItem(key);location.assign(rootPath());}
  window.PMP_ACCOUNT={read,request,saveSession,showPasswordChange,signout,t};
})();
