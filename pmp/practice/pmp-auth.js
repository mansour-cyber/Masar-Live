(async()=>{
  'use strict';
  const endpoint='https://anaylxsgsucyadkrawkq.supabase.co/functions/v1/pmp-practice-api';
  const loginEndpoint='https://anaylxsgsucyadkrawkq.supabase.co/functions/v1/pmp-api';
  const sessionKey='pmp_auth_session_v1';
  let session;try{session=JSON.parse(localStorage.getItem(sessionKey)||'null');}catch{}
  const goLogin=()=>location.replace('../?return_to=practice');
  if(!session?.token){goLogin();return;}
  window.PMP_REQUEST=options=>fetch(endpoint,{...options,headers:{...options?.headers,Authorization:'Bearer '+session.token}});
  window.PMP_SIGNOUT=async()=>{
    try{await fetch(loginEndpoint+'?action=logout',{method:'POST',headers:{Authorization:'Bearer '+session.token}});}catch{}
    localStorage.removeItem(sessionKey);location.assign('../');
  };
  try{
    const response=await window.PMP_REQUEST({method:'GET',cache:'no-store'});
    if(response.status===401){localStorage.removeItem(sessionKey);goLogin();return;}
    if(!response.ok)throw new Error('load');
    const initial=await response.json();
    window.PMP_INITIAL_PROGRESS=initial;
    window.PMP_USER={userId:initial.userId,displayName:initial.user.display_name||initial.user.username};
    document.getElementById('account-name').textContent=window.PMP_USER.displayName;
    for(const name of ['pmp-account.js','pmp-data.js','pmp-app.js'])await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./'+name+'?v=5';script.onload=resolve;script.onerror=reject;document.body.appendChild(script);});
  }catch{
    document.getElementById('app').innerHTML='<section class="panel login-page"><h2>تعذر تحميل تقدمك</h2><p>تحقق من اتصال الإنترنت ثم أعد المحاولة.</p><button onclick="location.reload()">إعادة المحاولة</button><br><a href="../">العودة إلى رحلة PMP</a></section>';
  }
})();
