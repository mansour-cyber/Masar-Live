(()=>{
  let selected='ar';
  function set(value){
    selected=value==='en'?'en':'ar';document.documentElement.lang=selected;document.documentElement.dir=selected==='ar'?'rtl':'ltr';
    if(window.doGTranslate){if(window.gt_translate_script&&!window.__GT?.translator)window.gt_translate_script.addEventListener('load',()=>window.doGTranslate('ar|'+selected),{once:true});else window.doGTranslate('ar|'+selected);}
    else if(selected==='en'){let attempts=0;const poll=setInterval(()=>{if(window.doGTranslate){clearInterval(poll);set(selected);}else if(++attempts>60)clearInterval(poll);},250);}
  }
  new MutationObserver(()=>{if(document.documentElement.lang!==selected)document.documentElement.lang=selected;const dir=selected==='ar'?'rtl':'ltr';if(document.documentElement.dir!==dir)document.documentElement.dir=dir;}).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  window.PMP_TRANSLATE={set};
  let saved;try{saved=localStorage.getItem('pmp-language');}catch{}
  if(saved==='en')window.setCourseLanguage('en');else set('ar');
})();
