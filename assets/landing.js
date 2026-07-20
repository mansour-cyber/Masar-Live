const menuToggle=document.querySelector('[data-menu-toggle]');
const navLinks=document.querySelector('[data-nav-links]');

menuToggle?.addEventListener('click',()=>{
  const open=navLinks?.classList.toggle('open')??false;
  menuToggle.setAttribute('aria-expanded',String(open));
  menuToggle.textContent=open?'×':'☰';
});

navLinks?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
  navLinks.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded','false');
  if(menuToggle)menuToggle.textContent='☰';
}));

document.querySelectorAll('.faq-question').forEach(button=>{
  button.addEventListener('click',()=>{
    const item=button.closest('.faq-item');
    const wasOpen=item?.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach(openItem=>{
      openItem.classList.remove('open');
      openItem.querySelector('.faq-question')?.setAttribute('aria-expanded','false');
    });

    if(item&&!wasOpen){
      item.classList.add('open');
      button.setAttribute('aria-expanded','true');
    }
  });
});

const diagnosisItems=[...document.querySelectorAll('.diagnosis-item')];
const diagnosisResult=document.querySelector('[data-diagnosis-result]');

const diagnosisMessages={
  0:{level:'none',title:'لم تبدأ التشخيص بعد',body:'اختر أي عبارة تنطبق على واقع العمل.'},
  1:{level:'low',title:'إشارة مبكرة، لا تهملها',body:'المشكلة ما زالت محدودة. وثّق الإجراء قبل أن تتحول إلى اعتماد دائم على أشخاص.'},
  2:{level:'medium',title:'لديك احتكاك تشغيلي واضح',body:'ابدأ بإجراء واحد متكرر، وحدد مالكه وتسلسله ونقاط اعتماده.'},
  3:{level:'medium',title:'العمل أصبح يعتمد على الاجتهاد',body:'التوثيق لم يعد تحسينًا شكليًا. تحتاج مرجعًا تشغيليًا مشتركًا بين الإدارات.'},
  4:{level:'high',title:'التعطل أصبح نمط تشغيل',body:'ابدأ فورًا بالعملية الأعلى تكلفة أو تأخيرًا، ولا تحاول توثيق كل شيء دفعة واحدة.'},
  5:{level:'high',title:'لديك مخاطرة تشغيلية مرتفعة',body:'المعرفة والمسؤوليات والقنوات متفرقة. ابنِ مسارًا واحدًا واعتمده كنقطة بداية.'},
  6:{level:'high',title:'شركتك تعمل بلا مرجع موحد',body:'هذه ليست مشكلة موظف. هي مشكلة نظام تشغيل، ومسار صُمم ليكشفها ويجعلها قابلة للقرار.'}
};

function updateDiagnosis(){
  if(!diagnosisResult)return;
  const selected=diagnosisItems.filter(item=>item.getAttribute('aria-pressed')==='true').length;
  const message=diagnosisMessages[selected];
  diagnosisResult.dataset.level=message.level;
  diagnosisResult.innerHTML=`<span>النتيجة الحالية، ${selected} من ${diagnosisItems.length}</span><strong>${message.title}</strong><p>${message.body}</p>`;
}

diagnosisItems.forEach(item=>{
  item.addEventListener('click',()=>{
    const selected=item.getAttribute('aria-pressed')==='true';
    item.setAttribute('aria-pressed',String(!selected));
    updateDiagnosis();
  });
});

const revealItems=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.1});
  revealItems.forEach(item=>observer.observe(item));
}else{
  revealItems.forEach(item=>item.classList.add('visible'));
}

const mobileCta=document.querySelector('[data-mobile-cta]');
let previousScroll=window.scrollY;
window.addEventListener('scroll',()=>{
  if(!mobileCta)return;
  const currentScroll=window.scrollY;
  const nearTop=currentScroll<260;
  const scrollingDown=currentScroll>previousScroll;
  mobileCta.classList.toggle('hidden',nearTop||scrollingDown);
  previousScroll=currentScroll;
},{passive:true});

const year=document.querySelector('[data-year]');
if(year)year.textContent=new Date().getFullYear();
