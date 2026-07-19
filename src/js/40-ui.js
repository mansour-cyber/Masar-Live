// ---------- toolbar wiring ----------
const strip=document.getElementById('strip');
PALETTE.forEach(p=>{ const b=document.createElement('button'); b.className='shape-chip';
  b.innerHTML=chipSVG(p.t)+`<span>${p.n}</span>`; b.onclick=()=>addNode(p.t); strip.appendChild(b); });

document.getElementById('undo').onclick=undo;
document.getElementById('redo').onclick=redo;
document.getElementById('zin').onclick=()=>{view.z=Math.min(2.6,view.z*1.15);applyView();};
document.getElementById('zout').onclick=()=>{view.z=Math.max(0.3,view.z*0.87);applyView();};
document.getElementById('zfit').onclick=fit;
document.getElementById('snap').onclick=e=>{snap=!snap;e.currentTarget.classList.toggle('on',snap);toast(snap?'المحاذاة مفعّلة':'المحاذاة موقفة');};
document.getElementById('snap').classList.add('on');
document.getElementById('dup').onclick=duplicate;
document.getElementById('del').onclick=delSel;
document.getElementById('addLane').onclick=addLane;
document.getElementById('help').onclick=()=>document.getElementById('overlay').classList.add('show');

function togglePop(btn,pop){ document.querySelectorAll('.pop').forEach(p=>{if(p!==pop)p.classList.remove('show')});
  pop.classList.toggle('show'); }
document.getElementById('tplBtn').onclick=()=>togglePop(0,document.getElementById('tplPop'));
document.getElementById('expBtn').onclick=()=>togglePop(0,document.getElementById('expPop'));
document.getElementById('bgBtn').onclick=()=>togglePop(0,document.getElementById('bgPop'));
document.getElementById('sesBtn').onclick=()=>{ renderSessionList(); togglePop(0,document.getElementById('sesPop')); };

(function(){
  const cw=document.getElementById('bgColors');
  BG_COLORS.forEach(c=>{ const s=document.createElement('span'); s.className='sw'; s.style.background=c;
    s.onclick=()=>{ board.bgColor=c; applyBoard(); syncBgSel(); autosave(); }; s.dataset.c=c; cw.appendChild(s); });
  const pw=document.getElementById('bgPatterns');
  BG_PATTERNS.forEach(([p,lbl])=>{ const b=document.createElement('button'); b.className='mini'; b.textContent=lbl; b.style.flex='0 0 46%'; b.dataset.p=p;
    b.onclick=()=>{ board.pattern=p; applyBoard(); syncBgSel(); autosave(); }; pw.appendChild(b); });
})();
function syncBgSel(){
  document.querySelectorAll('#bgColors .sw').forEach(s=>s.classList.toggle('sel',s.dataset.c===board.bgColor));
  document.querySelectorAll('#bgPatterns .mini').forEach(b=>b.classList.toggle('on',b.dataset.p===board.pattern));
}

document.getElementById('sesNew').onclick=()=>{ const n=prompt('اسم الجلسة:',currentSession||'جلسة '+new Date().toLocaleDateString('ar')); if(n&&n.trim())saveSession(n.trim()); };
document.getElementById('sesSave').onclick=()=>{ if(currentSession)saveSession(currentSession); };
document.addEventListener('click',e=>{ if(!e.target.closest('.menu'))document.querySelectorAll('.pop').forEach(p=>p.classList.remove('show')); });
document.querySelectorAll('#tplPop button').forEach(b=>b.onclick=()=>{ if(loadTemplate(b.dataset.tpl))document.getElementById('tplPop').classList.remove('show'); });
document.getElementById('exPng').onclick=()=>{exportPNG();document.getElementById('expPop').classList.remove('show');};
document.getElementById('exSvg').onclick=()=>{exportSVG();document.getElementById('expPop').classList.remove('show');};
document.getElementById('exJson').onclick=()=>{exportJSON();document.getElementById('expPop').classList.remove('show');};
document.getElementById('exReport').onclick=()=>{exportReport();document.getElementById('expPop').classList.remove('show');};
document.getElementById('imJson').onclick=()=>{importJSON();document.getElementById('expPop').classList.remove('show');};
document.getElementById('restore').onclick=()=>{restore();document.getElementById('expPop').classList.remove('show');};

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')return;
  const ctrl=e.ctrlKey||e.metaKey;
  if(ctrl&&e.key==='z'){e.preventDefault();undo();}
  else if(ctrl&&(e.key==='y'||(e.shiftKey&&e.key==='Z'))){e.preventDefault();redo();}
  else if(ctrl&&e.key==='d'){e.preventDefault();duplicate();}
  else if(ctrl&&e.key==='c'){copy();}
  else if(ctrl&&e.key==='v'){paste();}
  else if(e.key==='Delete'||e.key==='Backspace'){ if(sel.size||selEdge){e.preventDefault();delSel();} }
});
function illus(t,w,h){ return `<svg viewBox="0 0 ${w} ${h}">${shapeMarkup(t,w,h,'#efeaf7','#6a4d9c')}</svg>`; }
const GUIDE_SHAPES=[
 {t:'event_start',bp:'Start Event',n:'حدث بداية',d:'نقطة انطلاق العملية — دائرة رفيعة. مثال: «استلام الطلب».'},
 {t:'process',bp:'Task / Activity',n:'مهمة / نشاط',d:'خطوة عمل تُنفَّذ. مستطيل بحواف دائرية. مثال: «التحقق من الهوية».'},
 {t:'decision',bp:'Gateway',n:'بوابة قرار',d:'نقطة تفرّع بشرط، تخرج منها مسارات (نعم/لا). مثال: «مكتمل؟».'},
 {t:'gateway',bp:'Exclusive Gateway',n:'بوابة حصرية (×)',d:'يُتّبع مسار واحد فقط حسب الشرط — علامة × في المنتصف.'},
 {t:'io',bp:'Data Input/Output',n:'إدخال / إخراج',d:'بيانات تدخل أو تخرج. متوازي أضلاع. مثال: «إدخال رقم الهوية».'},
 {t:'subprocess',bp:'Sub-Process',n:'عملية فرعية',d:'عملية مركّبة تحتوي خطوات داخلية — خطّان جانبيّان.'},
 {t:'document',bp:'Document',n:'مستند',d:'وثيقة أو تقرير مرتبط بالعملية. مثال: «نموذج الطلب».'},
 {t:'database',bp:'Data Store',n:'قاعدة بيانات',d:'مخزن بيانات دائم — أسطوانة. مثال: «سجل الأحوال».'},
 {t:'manual',bp:'Manual Task',n:'إجراء يدوي',d:'خطوة تُنفَّذ يدوياً بدون نظام. مثال: «توقيع ورقي».'},
 {t:'event_end',bp:'End Event',n:'حدث نهاية',d:'نهاية المسار — دائرة سميكة. مثال: «إصدار الخدمة».'},
 {t:'terminator',bp:'Terminator',n:'طرفية (Flowchart)',d:'بداية/نهاية بأسلوب المخططات التقليدية.'},
 {t:'connector',bp:'Connector',n:'وصلة',d:'نقطة ربط بين أجزاء المخطط.'},
 {t:'note',bp:'Annotation',n:'ملاحظة',d:'تعليق توضيحي لا يؤثّر على التدفّق.'},
];
const GUIDE_ATTRS=[
 ['مالك العملية','الجهة/الإدارة المسؤولة عن الخطوة.'],
 ['الدور المسؤول (RACI)','الشخص أو الدور المنفِّذ — يُستخدم في مصفوفة المسؤوليات.'],
 ['النظام المستخدم','النظام أو المنصة التي تُنفَّذ عليها الخطوة (نفاذ، CRM…).'],
 ['الزمن (دقيقة)','المدة المتوقعة — يُجمَع لحساب زمن العملية الكلي.'],
 ['التكلفة (ر.س)','تكلفة الخطوة — تُجمَع في تقرير الحوكمة.'],
 ['مستوى المخاطر','منخفض / متوسط / مرتفع — يظهر ملوّناً في التقرير.'],
 ['نوع BPMN','تصنيف الخطوة حسب المعيار (مهمة، بوابة، حدث…).'],
 ['وصف / ملاحظات','تفاصيل إضافية عن الخطوة.'],
];
function buildGuide(){
  const cards=GUIDE_SHAPES.map(s=>`<div class="g-card">
    <div class="g-illus">${illus(s.t,90,54)}</div>
    <div><p class="t">${s.n}</p><span class="bp">${s.bp}</span><p class="d">${s.d}</p></div></div>`).join('');
  const attrs=GUIDE_ATTRS.map(a=>`<li><b>${a[0]}:</b> ${a[1]}</li>`).join('');
  const connDemo=`<svg viewBox="0 0 300 70" style="max-width:300px">
    <rect x="6" y="18" width="90" height="34" rx="9" fill="#efeaf7" stroke="#6a4d9c" stroke-width="2"/>
    <rect x="204" y="18" width="90" height="34" rx="9" fill="#e8f4e9" stroke="#2e7d32" stroke-width="2"/>
    <defs><marker id="ga" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8f96ab"/></marker></defs>
    <path d="M198,35 L100,35" fill="none" stroke="#8f96ab" stroke-width="2.4" marker-end="url(#ga)"/>
    <rect x="120" y="24" width="60" height="20" rx="10" fill="#fff" stroke="#8f96ab" stroke-width="1.2"/>
    <text x="150" y="38" text-anchor="middle" font-family="Tajawal" font-size="11" font-weight="700" fill="#697089" direction="rtl">نعم</text>
  </svg>`;
  document.getElementById('gBody').innerHTML=`
  <div class="g-hd"><p class="k">الدليل الشامل · مسار</p>
    <h2>كيف تبني مخطط عملية احترافي</h2>
    <p>«مسار» أداة نمذجة عمليات تعمل بالكامل في متصفحك بلا خادم، وتتبع معيار <b>BPMN</b> العالمي (Business Process Model and Notation) — لغة الرسم الموحّدة التي تجعل مخططك مفهوماً لأي جهة مؤسسية.</p></div>

  <div class="g-sec"><h3><i>◆</i>رموز BPMN والأشكال</h3>
    <p style="color:var(--sub);font-size:13px;margin:0 0 12px;font-weight:500">في BPMN شكل الرمز يعطيك معناه فوراً. هذه مكتبة الأشكال المتاحة:</p>
    <div class="g-grid">${cards}</div></div>

  <div class="g-sec"><h3><i>↔</i>الروابط والتدفّق</h3>
    <div class="g-card" style="align-items:center"><div class="g-illus" style="flex-basis:170px;width:170px">${connDemo}</div>
      <div><p class="t">سهم التدفّق (Sequence Flow)</p><p class="d">يربط الخطوات ويحدّد اتجاه سير العملية.</p></div></div>
    <ol class="g-steps" style="margin-top:12px">
      <li><b>الربط:</b> مرّر المؤشر على أي عنصر فتظهر نقاط على حوافه الأربع، اسحب من نقطة إلى عنصر آخر ليتكوّن سهم.</li>
      <li><b>تسمية المسار:</b> انقر نقراً مزدوجاً على السهم لكتابة شرط عليه (مثل «نعم» / «لا»).</li>
      <li><b>نمط متقطّع:</b> حدّد السهم ثم اختر «متقطّع» — يُستخدم عادةً لمسار الاستثناء أو التدفّق غير الرئيسي.</li>
    </ol></div>

  <div class="g-sec"><h3><i>▤</i>مسارات الأقسام (Swimlanes)</h3>
    <ol class="g-steps">
      <li>اضغط زر <b>«▤ قسم»</b> في الشريط العلوي لإضافة نطاق معنون.</li>
      <li>اسحب <b>الشريط العلوي</b> للقسم لتحريكه، واسحب الزاوية لتغيير حجمه.</li>
      <li>نقر مزدوج على الشريط <b>لتسميته</b> (مثل «إدارة العمليات»)، وغيّر لونه من لوحة الخصائص.</li>
      <li>ضع الخطوات المتعلّقة بكل جهة داخل قسمها لتوضيح المسؤوليات بصرياً.</li>
    </ol></div>

  <div class="g-sec"><h3><i>▦</i>سمات المؤسسة لكل خطوة</h3>
    <p style="color:var(--sub);font-size:13px;margin:0 0 10px;font-weight:500">حدّد أي عنصر ثم افتح تبويب «سمات المؤسسة» لإدخال البيانات التي تحوّل المخطط من رسم إلى نموذج حوكمة:</p>
    <ul class="g-steps" style="counter-reset:none">${attrs.replace(/<li>/g,'<li style="padding-inline-start:0;padding-inline-end:14px">').replace(/::before/g,'')}</ul>
    <div class="g-tip">💡 بعد تعبئة السمات، صدّر <b>«تقرير حوكمة (RACI/سمات)»</b> من قائمة تصدير — يولّد جدولاً احترافياً بالمالك والدور والنظام والزمن والتكلفة والمخاطر، مع الإجماليات، جاهزاً للطباعة أو الإرسال للإدارة.</div></div>

  <div class="g-sec"><h3><i>⬇︎</i>التصدير والحفظ</h3>
    <div class="g-kb">
      <div class="r"><span>صورة PNG</span><b>للعرض والمشاركة</b></div>
      <div class="r"><span>متجه SVG</span><b>طباعة عالية الجودة</b></div>
      <div class="r"><span>ملف JSON</span><b>مشروع يُفتح ويُعدّل لاحقاً</b></div>
      <div class="r"><span>تقرير حوكمة</span><b>جدول RACI/سمات</b></div>
      <div class="r"><span>الجلسات</span><b>حفظ بأسماء داخل المتصفح</b></div>
      <div class="r"><span>الخلفية</span><b>لون + نمط (شبكة/نقاط/خطوط)</b></div>
    </div></div>

  <div class="g-sec"><h3><i>⌘</i>اختصارات لوحة المفاتيح</h3>
    <div class="g-kb">
      <div class="r"><span>تحديد متعدد</span><b>Shift + نقر</b></div>
      <div class="r"><span>تحديد بإطار</span><b>Shift + سحب</b></div>
      <div class="r"><span>حذف</span><b>Delete</b></div>
      <div class="r"><span>تكرار</span><b>Ctrl + D</b></div>
      <div class="r"><span>نسخ / لصق</span><b>Ctrl + C / V</b></div>
      <div class="r"><span>تراجع / إعادة</span><b>Ctrl + Z / Y</b></div>
      <div class="r"><span>تكبير / تصغير</span><b>عجلة الماوس</b></div>
      <div class="r"><span>تحريك اللوحة</span><b>سحب الخلفية</b></div>
    </div></div>

  <div class="g-sec"><h3><i>✓</i>نصائح لمخطط سليم</h3>
    <ol class="g-steps">
      <li>ابدأ بـ <b>حدث بداية</b> واحد وانتهِ بـ <b>حدث نهاية</b> واضح.</li>
      <li>كل <b>بوابة قرار</b> يجب أن يخرج منها مساران على الأقل، وكل مسار يحمل شرطه.</li>
      <li>لا تترك أي عنصر <b>معلّقاً</b> بلا رابط دخول أو خروج.</li>
      <li>استخدم <b>الأقسام</b> لفصل المسؤوليات، و<b>السمات</b> لتوثيق المالك والزمن لكل خطوة.</li>
      <li>احفظ عملك كـ <b>جلسة</b> باسم، وصدّر <b>JSON</b> كنسخة احتياطية.</li>
    </ol></div>`;
}
function openGuide(){ buildGuide(); document.getElementById('guide').classList.add('show'); }
document.getElementById('guideBtn').onclick=openGuide;
document.getElementById('gClose').onclick=()=>document.getElementById('guide').classList.remove('show');
document.getElementById('guide').addEventListener('click',e=>{ if(e.target.id==='guide')document.getElementById('guide').classList.remove('show'); });
let tT; const toastEl=document.getElementById('toast');
function toast(m){ toastEl.textContent=m; toastEl.classList.add('show'); clearTimeout(tT); tT=setTimeout(()=>toastEl.classList.remove('show'),1600); }
applyView(); applyBoard();
if(!bootProject())loadTemplate('stc',{force:true,markAsDirty:false,persist:true});
syncBgSel();
document.getElementById('status').textContent='اسحب من نقاط الحواف للربط · Shift+سحب للتحديد المتعدد · ؟ للاختصارات';
