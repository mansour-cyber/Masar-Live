(()=>{
  const key='pmp_auth_session_v1',endpoint='https://anaylxsgsucyadkrawkq.supabase.co/functions/v1/pmp-api';
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
  const language=()=>document.documentElement.lang==='en'?'en':'ar';
  const t=(ar,en)=>language()==='en'?en:ar;
  const request=(action,options={})=>fetch(endpoint+'?action='+action,{...options,headers:{...options.headers,...read()?.token?{Authorization:'Bearer '+read().token}:{}}});
  function saveSession(data){localStorage.setItem(key,JSON.stringify({token:data.token,expires_at:data.expires_at,user:data.user}));}
  const rootPath=()=>location.pathname.includes('/admin/')||location.pathname.includes('/practice/')?'../':'./';
  function destination(){const next=new URLSearchParams(location.search).get('return_to');return rootPath()+(next==='admin'?'?return_to=admin':next==='practice'?'?return_to=practice':'');}
  function showPasswordChange(){
    document.body.classList.add('password-locked');let gate=document.getElementById('passwordGate');if(!gate){gate=document.createElement('section');gate.id='passwordGate';document.body.appendChild(gate);}
    gate.hidden=false;gate.style.display='grid';window.PMP_ENTRY.security(gate);
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
