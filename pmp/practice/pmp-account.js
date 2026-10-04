(() => {
  'use strict';
  let lang;try{lang=localStorage.getItem('pmp-language');}catch{}
  lang=lang==='en'?'en':'ar';
  window.PMP_LANGUAGE=lang;
  const manual={ar:{signout:'تسجيل الخروج',account:'مساحة تدريب PMP',course:'رحلة PMP',loading:'جارٍ تحميل تقدمك…',saved:'تم حفظ تقدمك في حسابك',saving:'جارٍ الحفظ…',offline:'محفوظ على هذا الجهاز؛ المزامنة عند عودة الاتصال',changed:'تغير الحساب. أعد تحميل الصفحة.'},en:{signout:'Sign out',account:'PMP Practice',course:'PMP Journey',loading:'Loading your progress…',saved:'Progress saved to your account',saving:'Saving…',offline:'Saved on this device; sync resumes when online',changed:'Account changed. Reload this page.'}};
  let statusKey='loading';
  function status(key,error=false){statusKey=key;const e=document.getElementById('sync-status');if(e){e.textContent=manual[lang][key]||key;e.dataset.error=String(error);}}
  function setLanguage(value,notify=true){
    lang=value;window.PMP_LANGUAGE=value;document.documentElement.lang=value;document.documentElement.dir=value==='ar'?'rtl':'ltr';
    document.getElementById('language-ar').setAttribute('aria-pressed',String(value==='ar'));
    document.getElementById('language-en').setAttribute('aria-pressed',String(value==='en'));
    const out=document.getElementById('signout');if(out)out.textContent=manual[value].signout;
    const course=document.getElementById('course-link');if(course&&!course.closest('.workspace-shell'))course.textContent=manual[value].course;window.PMP_SHELL?.updateLanguage(value);
    const label=document.getElementById('account-label');if(label)label.textContent=manual[value].account;
    status(statusKey);try{localStorage.setItem('pmp-language',value);}catch{}
    if(notify)window.dispatchEvent(new CustomEvent('pmp-language-change',{detail:value}));
    if(window.doGTranslate){if(window.gt_translate_script&&!window.__GT?.translator)window.gt_translate_script.addEventListener('load',()=>window.doGTranslate('ar|'+lang),{once:true});else window.doGTranslate('ar|'+value);}
    else if(value==='en'){
      let attempts=0;const poll=setInterval(()=>{if(window.doGTranslate){clearInterval(poll);if(window.gt_translate_script&&!window.__GT?.translator)window.gt_translate_script.addEventListener('load',()=>window.doGTranslate('ar|'+lang),{once:true});else window.doGTranslate('ar|'+lang);}else if(++attempts>60){clearInterval(poll);status('تعذر تحميل الترجمة. تحقق من اتصال الإنترنت.',true);}},250);
    }
  }
  document.getElementById('language-ar').addEventListener('click',()=>setLanguage('ar'));
  document.getElementById('language-en').addEventListener('click',()=>setLanguage('en'));
  setLanguage(lang,false);
  new MutationObserver(()=>{if(document.documentElement.lang!==lang)document.documentElement.lang=lang;const dir=lang==='ar'?'rtl':'ltr';if(document.documentElement.dir!==dir)document.documentElement.dir=dir;}).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  // GTranslate observes new question DOM; keep page and question direction aligned.
  window.addEventListener('pmp-language-change',()=>{document.documentElement.dir=lang==='ar'?'rtl':'ltr';});
  function merge(remote,local){
    if(!remote)return local;if(!local)return remote;
    const newer=(remote._updatedAt||'')>(local._updatedAt||'')?remote:local;
    const progress={...remote.progress};
    for(const [id,p] of Object.entries(local.progress||{})){const r=progress[id];if(!r||(p.lastAt||'')>=(r.lastAt||''))progress[id]=p;}
    const histories=new Map();for(const r of [...(remote.history||[]),...(local.history||[])])histories.set(r.id,r);
    return {...newer,version:1,progress,flags:{...(newer===local?remote.flags:local.flags),...newer.flags},history:[...histories.values()].sort((a,b)=>(b.finishedAt||'').localeCompare(a.finishedAt||''))};
  }
  function readCache(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
  function connect(key,getState,initialRevision){
    let revision=initialRevision,timer,inflight=false,queued=false,blocked=false;
    function cache(dirty){try{localStorage.setItem(key,JSON.stringify({state:getState(),dirty}));}catch{status('تعذر الحفظ على هذا الجهاز. احتفظ بنسخة احتياطية.',true);}}
    async function flush(){
      if(blocked)return;if(inflight){queued=true;return;}clearTimeout(timer);inflight=true;queued=false;const snapshot=JSON.stringify(getState());status('saving');
      try{
        const response=await window.PMP_REQUEST({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedUserId:window.PMP_USER.userId,revision,state:JSON.parse(snapshot)}),keepalive:new TextEncoder().encode(snapshot).length<50000});
        const result=await response.json();
        if(response.status===401||result.error==='account_changed'||(result.userId&&result.userId!==window.PMP_USER.userId)){blocked=true;status('changed',true);document.getElementById('app').inert=true;return;}
        if(response.status===409&&result.error==='revision_conflict'){revision=result.revision;Object.assign(getState(),merge(result.state,getState()));queued=true;cache(true);}
        else if(!response.ok)throw new Error(result.error);
        else{revision=result.revision;const changed=JSON.stringify(getState())!==snapshot;cache(changed);status('saved');queued ||= changed;}
      }catch{cache(true);status('offline',true);}
      finally{inflight=false;if(queued&&!blocked)timer=setTimeout(flush,250);}
    }
    function save(){getState()._updatedAt=new Date().toISOString();cache(true);status('saving');clearTimeout(timer);timer=setTimeout(flush,600);}
    window.addEventListener('online',flush);
    document.getElementById('signout')?.addEventListener('click',async event=>{event.preventDefault();if(readCache(key)?.dirty)await flush();await window.PMP_SIGNOUT();});
    if(statusKey==='loading')status('saved');return {save,flush};
  }
  window.PMP_SYNC={status,merge,readCache,connect};
})();
