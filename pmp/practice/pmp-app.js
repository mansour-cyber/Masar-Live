(async () => {
 'use strict';
 const data=window.PMP_DATA;
 if(!data){document.getElementById('app').textContent='تعذر تحميل الأسئلة. تحقق من اتصال الإنترنت ثم أعد تحميل الصفحة.';return;}
 const KEY='pmp-practice-v2:'+window.PMP_USER.userId, byId=new Map(data.questions.map(q=>[q.id,q])), sources=new Map(data.sources.map(s=>[s.id,s]));
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=x=>new Intl.NumberFormat('en-US').format(x);
 const arrayEqual=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
 let store;let revision=0;const cached=window.PMP_SYNC.readCache(KEY);try{const result=window.PMP_INITIAL_PROGRESS;if(!result)throw new Error('load');if(result.userId!==window.PMP_USER.userId){document.getElementById('app').textContent='تغير الحساب. أعد تحميل الصفحة.';return;}revision=result.revision;store=result.state;if(cached?.dirty){store=window.PMP_SYNC.merge(store,cached.state);}}catch{if(!cached?.state){appLoadingError();return;}store=cached.state;window.PMP_SYNC.status('تعذر الاتصال. تقدمك محفوظ على هذا الجهاز وسيُزامن عند عودة الاتصال.',true);}
 function appLoadingError(){document.getElementById('app').innerHTML='<section class="panel login-page"><h2>تعذر تحميل تقدمك</h2><p>تحقق من اتصال الإنترنت، ثم أعد المحاولة.</p><button onclick="location.reload()">إعادة المحاولة</button></section>';}
 store=store?.version===1?store:{version:1,progress:{},flags:{},history:[],session:null};
 store.progress ||= {};store.flags ||= {};store.history ||= [];
 if(store.session){store.session.ids=store.session.ids.filter(id=>byId.has(id));store.session.paused=true;if(!store.session.ids.length)store.session=null;}
 let view=location.hash.slice(1)||'home', category='all', bankFilter='all', sourceFilter='all', query='', page=0, language=window.PMP_LANGUAGE||'ar', pendingFinish=false;
 let tickAt=Date.now(), saveWarning=false;
 const app=document.getElementById('app');
 const sync=window.PMP_SYNC.connect(KEY,()=>store,revision);
 const save=()=>sync.save();
 const toast=text=>{const el=document.getElementById('toast');el.textContent=text;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),3200);};
 const shuffle=list=>{let a=[...list];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const grade=(q,answer)=>q.type==='matching'?q.pairs.every((p,i)=>arrayEqual(answer?.[i]||[],p.answers)):arrayEqual(answer||[],q.correct);
 const hasAnswer=(q,answer)=>q.type==='matching'?q.pairs.every((p,i)=>(answer?.[i]||[]).length>0):(answer||[]).length>0;
 const checked=(session,id)=>Object.prototype.hasOwnProperty.call(session.checked,id);
 const sessionQuestion=()=>byId.get(store.session?.ids[store.session.index]);
 const currentText=q=>({question:q.question,options:q.options,explanation:q.explanation});
 const issue=q=>q.sourceIssue?`<div class="notice small">${esc(q.sourceIssue)}</div>`:'';
 const caseText=q=>q.caseStudy?`<details class="case-study" open><summary>سياق الحالة الدراسية</summary><div>${esc(q.caseStudy)}</div></details>`:'';
 function englishReference(){return '';}
 const direction=q=>language==='en'?'ltr':'rtl';
 const formatTime=sec=>`${String(Math.floor(Math.max(0,sec)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,sec)%60)).padStart(2,'0')}`;
 function exportQuestions(format){
  const cell=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
  const rows=[['القسم','رقم السؤال','السؤال','الحالة الدراسية','الخيارات','الإجابة الصحيحة','الشرح','ملاحظة المصدر'],...data.questions.map(q=>[sources.get(q.sources[0].sourceId)?.title,q.sources[0].number,q.question,q.caseStudy,q.options.map((o,i)=>`${String.fromCharCode(65+i)}. ${o}`).join('\n'),q.type==='matching'?q.pairs.map(p=>`${p.target} ← ${p.answers.join(' + ')}`).join('\n'):q.correct.map(i=>`${String.fromCharCode(65+i)}. ${q.options[i]}`).join('\n'),q.explanation,q.sourceIssue])];
  const content=format==='csv'?'\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n'):JSON.stringify(data,null,2);
  const url=URL.createObjectURL(new Blob([content],{type:format==='csv'?'text/csv;charset=utf-8':'application/json'}));const link=document.createElement('a');link.href=url;link.download='pmp-questions.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 const countAnswers=session=>session.ids.filter(id=>hasAnswer(byId.get(id),session.answers[id])).length;
 const nav=(id,label)=>`<button class="nav-btn ${view===id?'active':''}" data-action="nav" data-view="${id}">${label}</button>`;
 function layout(content){
  app.innerHTML=`<header class="header"><div class="brand"><span class="brand-mark" aria-hidden="true">PMP</span><div><strong>مساحة تدريب PMP</strong><span class="small">تدرّب، افهم السبب، وراجع أخطاءك</span></div></div><div class="actions"><span class="tag blue">${n(data.questionCount)} سؤالًا</span><button data-action="backup">حفظ نسخة من تقدمي</button></div></header><div class="shell"><nav class="sidebar" aria-label="القائمة الرئيسية">${nav('home','مساحة التدريب')}${nav('bank','بنك الأسئلة')}${nav('mistakes','مراجعة الأخطاء')}${nav('flags','الأسئلة المحفوظة')}${nav('history','نتائجي')}<div class="side-label">تقدمك</div><div class="note">التقدم والنتائج محفوظة في حسابك، ويمكنك متابعتها من أي جهاز.<br><br><a href="questions.json" data-action="download-data" data-format="json" download>تنزيل الأسئلة JSON</a><br><a href="questions.csv" data-action="download-data" data-format="csv" download>تنزيل الأسئلة CSV</a></div></nav><main id="main" class="main" tabindex="-1">${content}</main></div>`;
 }
 function render(){if(view==='session'&&!store.session)view='home';if(view==='result'&&!store.history.length)view='home';if(view==='session')renderSession();else if(view==='result')renderResult();else if(['bank','mistakes','flags'].includes(view))renderBank();else if(view==='history')renderHistory();else renderHome();}
 function navigate(next){if(store.session&&!store.session.finished){store.session.paused=true;save();}view=next;pendingFinish=false;location.hash=next;render();}
 function stats(){let values=Object.values(store.progress);return `<div class="stats"><div class="stat"><span class="small muted">أسئلة جاهزة للتدريب</span><strong>${n(data.readyCount)}</strong></div><div class="stat"><span class="small muted">أسئلة تدرّبت عليها</span><strong>${n(values.length)}</strong></div><div class="stat"><span class="small muted">تحتاج إلى مراجعة</span><strong>${n(values.filter(p=>!p.lastCorrect).length)}</strong></div></div>`;}
 function renderHome(){
  const list=data.sources.filter(s=>category==='all'||s.kind===category);
  const resume=store.session&&!store.session.finished?`<section class="panel row" style="margin-bottom:24px"><div><h3>أكمل جلستك</h3><p class="muted small">${esc(store.session.title)} · ${n(countAnswers(store.session))} من ${n(store.session.ids.length)} إجابة محفوظة</p></div><button class="primary" data-action="resume">متابعة التدريب</button></section>`:'';
  const notice=data.complete?`<div class="notice small">اكتمل حفظ ${n(data.questionCount)} سؤالًا عبر ${n(data.sources.length)} قسمًا، دون حذف التكرار. بندان تجريبيان غير مكتملين في المصدر محفوظان في بنك الأسئلة، ولا يدخلان في الدرجة.</div>`:`<div class="notice small">النسخة المتاحة الآن: ${n(data.extractedOccurrences)} من ${n(data.expectedOccurrences)} سؤالًا عبر الأقسام، مع الحفاظ على التكرار وترتيب كل اختبار.</div>`;
  layout(`<div class="intro"><h1>اختر موضوعك وابدأ التدريب</h1><p>خذ وقتك في فهم السؤال. ستجد الإجابة الصحيحة وشرحها بعد التصحيح.</p></div>${stats()}${resume}${notice}<div class="tools"><label>مجموعة الأسئلة<select id="category"><option value="all">جميع الأقسام</option><option value="exam" ${category==='exam'?'selected':''}>الاختبارات الكاملة</option><option value="process" ${category==='process'?'selected':''}>النطاقات الثلاثة</option><option value="chapter" ${category==='chapter'?'selected':''}>الفصول</option></select></label><label>عدد أسئلة التدريب<select id="session-count"><option value="20">20 سؤالًا</option><option value="10">10 أسئلة</option><option value="40">40 سؤالًا</option><option value="all">كل أسئلة القسم</option></select></label><label>ترتيب الأسئلة<select id="order"><option value="source">ترتيب الموقع</option><option value="random">ترتيب عشوائي</option></select></label><button data-action="start-all" class="primary" ${data.questions.length?'':'disabled'}>تدريب من جميع الأسئلة</button></div><div class="source-list">${list.map(s=>`<section class="source-card"><div><div class="actions"><h3>${esc(s.title)}</h3>${s.status==='complete'?'<span class="tag green">جاهز</span>':s.status==='partial'?'<span class="tag blue">متاح جزئيًا</span>':'<span class="tag">بانتظار النسخ</span>'}</div><p class="small muted">${n(s.expectedCount)} سؤالًا · ${n(s.durationMinutes)} دقيقة للاختبار الكامل ${s.extractedCount&&s.status!=='complete'?`· ${n(s.extractedCount)} سؤالًا محفوظًا`:''}${s.extractedCount>s.readyCount?` · ${n(s.readyCount)} صالحًا للتدريب · ${n(s.extractedCount-s.readyCount)} بندًا به خلل في المصدر`:''}</p></div><div class="actions"><button class="primary" data-action="start" data-source="${s.id}" data-mode="practice" ${s.questionIds.length?'':'disabled'}>تدريب</button><button data-action="start" data-source="${s.id}" data-mode="exam" ${s.questionIds.length?'':'disabled'}>اختبار مؤقت</button></div></section>`).join('')}</div>`);
 }
 function startSession(sourceId,mode='practice',explicitIds){
  const source=sources.get(sourceId);
  let ids=explicitIds||source?.questionIds||data.questions.map(q=>q.id);
  ids=[...new Set(ids)].filter(id=>byId.get(id)?.trainingReady);
  const requested=mode==='exam'&&source?'all':document.getElementById('session-count')?.value||'20';
  const randomized=document.getElementById('order')?.value==='random';
  if(randomized||!source)ids=shuffle(ids);
  if(requested!=='all'&&!explicitIds)ids=ids.slice(0,Number(requested));
  if(!ids.length){toast('لا توجد أسئلة متاحة لهذا الاختيار.');return;}
  if(store.session&&!store.session.finished&&!confirm('توجد جلسة محفوظة. هل تريد بدء جلسة جديدة بدلًا منها؟ ستبقى نتائج جلساتك السابقة محفوظة.'))return;
  const minutes=source?(mode==='exam'?source.durationMinutes:Math.max(1,Math.ceil(source.durationMinutes*ids.length/source.expectedCount))):Math.ceil(ids.length*1.28);
  store.session={id:Date.now().toString(36),title:source?.title||'تدريب متنوع',sourceId:sourceId||null,mode,ids,index:0,answers:{},checked:{},paused:false,finished:false,timeRemaining:minutes*60,elapsed:0,startedAt:new Date().toISOString(),passPercent:source?.passPercent||75};
  pendingFinish=false;tickAt=Date.now();save();view='session';location.hash=view;render();
 }
 function renderSession(){
  const s=store.session,q=sessionQuestion(),text=currentText(q),dir=direction(q),answer=s.answers[q.id],isChecked=checked(s,q.id),reveal=s.mode==='practice'&&isChecked;
  const completed=countAnswers(s),pct=Math.round(completed/s.ids.length*100);
  const top=`<div class="session-top"><div class="row"><div><span class="tag blue">${s.mode==='exam'?'اختبار مؤقت':'وضع التدريب'}</span><h1 style="margin-top:8px">${esc(s.title)}</h1></div><div class="actions"><div><span class="small muted">${s.mode==='exam'?'الوقت المتبقي':'وقت التدريب'}</span><span id="timer" class="timer">${formatTime(s.mode==='exam'?s.timeRemaining:s.elapsed)}</span></div><button data-action="pause">إيقاف مؤقت</button><button data-action="finish-prompt">إنهاء الجلسة</button></div></div><div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="الأسئلة المجابة"><div style="width:${pct}%"></div></div><p class="small muted">${n(completed)} من ${n(s.ids.length)} إجابة محفوظة</p></div>`;
  const finishPrompt=pendingFinish?`<div class="notice"><h3>إنهاء الجلسة وعرض النتيجة؟</h3><p class="small">بقي ${n(s.ids.length-completed)} سؤالًا بلا إجابة. ستُحسب الأسئلة المتروكة ضمن الدرجة.</p><div class="actions" style="margin-top:12px"><button class="primary" data-action="finish">إنهاء وعرض النتيجة</button><button data-action="cancel-finish">مواصلة التدريب</button></div></div>`:'';
  if(s.paused){layout(`${top}${finishPrompt}<div class="paused"><h2>جلستك محفوظة</h2><p class="muted">توقف المؤقت. يمكنك متابعة السؤال نفسه وقتما تشاء.</p><div class="actions" style="justify-content:center"><button class="primary" data-action="resume">متابعة الجلسة</button><button data-action="nav" data-view="home">العودة إلى الأقسام</button></div></div>`);return;}
  const opts=q.type==='matching'?renderMatching(q,answer,reveal):text.options.map((o,i)=>{
   const selected=(answer||[]).includes(i);const good=reveal&&q.correct.includes(i),bad=reveal&&selected&&!q.correct.includes(i);
   return `<label class="option ${selected?'selected':''} ${good?'correct':''} ${bad?'incorrect':''}" dir="${dir}"><input type="${q.type==='multiple'?'checkbox':'radio'}" name="answer" value="${i}" ${selected?'checked':''} ${reveal?'disabled':''}><span class="letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span class="option-text">${esc(o)}</span>${good?'<span class="small">✓</span>':bad?'<span class="small">✕</span>':''}</label>`;
  }).join('');
  const feedback=reveal?`<section class="feedback ${s.checked[q.id]?'ok':'no'}" role="status"><h3>${s.checked[q.id]?'إجابة صحيحة ✓':'تحتاج إلى مراجعة'}</h3>${!s.checked[q.id]?`<div class="key-list" dir="${dir}"><strong>مفتاح الإجابة في المصدر:</strong><br>${answerKey(q,language)}</div>`:''}<div class="explanation" dir="${dir}"><strong>الشرح</strong><br>${esc(text.explanation||'لا يتوفر شرح إضافي لهذا السؤال في المصدر.')}</div></section>`:'';
  const origin=q.sources.find(a=>a.sourceId===s.sourceId)||q.sources[0];
  const map=`<aside class="panel map"><h3>خريطة الأسئلة</h3><div class="question-map">${s.ids.map((id,i)=>`<button data-action="jump" data-index="${i}" aria-label="السؤال ${i+1}${store.flags[id]?'، محفوظ':''}" class="qnum ${i===s.index?'current':''} ${hasAnswer(byId.get(id),s.answers[id])?'answered':''} ${s.mode==='practice'&&checked(s,id)?s.checked[id]?'correct':'wrong':''} ${store.flags[id]?'flagged':''}">${i+1}</button>`).join('')}</div><div class="legend">أزرق: تمت الإجابة<br>أخضر: صحيح · أحمر: خطأ<br>● محفوظ للمراجعة</div><button class="full" style="margin-top:16px" data-action="jump-unanswered">أول سؤال بلا إجابة</button></aside>`;
  layout(`${top}${finishPrompt}<div class="quiz-layout"><section class="panel"><div class="row"><span class="small muted">السؤال ${n(s.index+1)} من ${n(s.ids.length)} · ${q.type==='matching'?'مطابقة':q.type==='multiple'?`اختر ${n(q.correct.length)} إجابات`:'اختر إجابة واحدة'}</span><div class="actions"><button data-action="flag" aria-pressed="${!!store.flags[q.id]}">${store.flags[q.id]?'★ محفوظ':'☆ حفظ للمراجعة'}</button></div></div>${reveal?issue(q):q.sourceIssue?'<div class="notice small">توجد ملاحظة على هذا السؤال في المصدر، ستظهر بعد التصحيح أو إنهاء الاختبار.</div>':''}${caseText(q)}<div class="question" dir="${dir}">${esc(text.question)}</div>${englishReference(q,reveal)}${renderImages(q)}${opts}${feedback}<div class="quiz-footer row"><div class="actions"><button data-action="previous" ${s.index?'':'disabled'}>السابق</button><button data-action="next">${s.index===s.ids.length-1?'مراجعة وإنهاء':'التالي'}</button></div>${s.mode==='practice'?`<button class="primary" data-action="check" ${reveal||!hasAnswer(q,answer)?'disabled':''}>تصحيح الإجابة</button>`:'<span class="small muted">ستظهر الإجابات الصحيحة عند إنهاء الاختبار</span>'}</div><p class="small muted" style="margin-top:20px">${esc(sources.get(origin.sourceId)?.title)} · رقم المصدر ${n(origin.number)}</p></section>${map}</div>`);
 }
 function renderImages(q){return `<div class="images">${q.images.map(img=>`<img src="${esc(img.local||img.url)}" alt="${esc(img.alt||'رسم توضيحي للسؤال')}" loading="lazy">`).join('')}</div>`;}
 function renderMatching(q,answer,reveal){
  return `<div class="study-tip">اختر العنصر المناسب أمام كل وصف.</div><div class="matching">${q.pairs.map((p,i)=>{let values=answer?.[i]||[],correct=arrayEqual(values,p.answers);const control=p.answers.length>1?`<fieldset class="match-choices"><legend>اختر ${p.answers.length} عناصر</legend>${q.choices.map(choice=>`<label><input type="checkbox" data-match="${i}" value="${esc(choice)}" ${values.includes(choice)?'checked':''} ${reveal?'disabled':''}>${esc(choice)}</label>`).join('')}</fieldset>`:`<select id="match-${i}" data-match="${i}" aria-label="${esc(p.target)}" ${reveal?'disabled':''}><option value="" ${values.length?'':'selected'}>اختر الإجابة…</option>${q.choices.map(choice=>`<option value="${esc(choice)}" ${values.includes(choice)?'selected':''}>${esc(choice)}</option>`).join('')}</select>`;return `<div class="match-row ${reveal?correct?'correct':'incorrect':''}"><div>${esc(p.target)}</div><div>${control}${reveal&&!correct?`<div class="small" style="margin-top:8px">الصحيح: ${esc(p.answers.join(' + '))}</div>`:''}</div></div>`;}).join('')}</div>`;
 }
 function answerKey(q,lang='ar'){if(q.type==='matching')return q.pairs.map(p=>`${esc(p.target)} ← ${esc(p.answers.join(' + '))}`).join('<br>');return q.correct.map(i=>`${String.fromCharCode(65+i)}. ${esc(currentText(q).options[i])}`).join('<br>');}
 function record(q,correct){let p=store.progress[q.id]||{attempts:0,correct:0,wrong:0};p.attempts++;p[correct?'correct':'wrong']++;p.lastCorrect=correct;p.lastAt=new Date().toISOString();store.progress[q.id]=p;}
 function finish(){
  const s=store.session;if(!s||s.finished)return;
  for(const id of s.ids){const q=byId.get(id);if(!checked(s,id)){const answer=s.answers[id];s.checked[id]=hasAnswer(q,answer)&&grade(q,answer);record(q,s.checked[id]);}}
  const score=s.ids.filter(id=>s.checked[id]).length,skipped=s.ids.filter(id=>!hasAnswer(byId.get(id),s.answers[id])).length;
  s.finished=true;s.paused=true;const result={id:s.id,title:s.title,mode:s.mode,sourceId:s.sourceId,ids:s.ids,answers:s.answers,checked:s.checked,correct:score,total:s.ids.length,skipped,percent:Math.round(score/s.ids.length*1000)/10,passPercent:s.passPercent,elapsed:s.elapsed,finishedAt:new Date().toISOString()};
  store.history.unshift(result);save();view='result';location.hash=view;pendingFinish=false;render();
 }
 function renderResult(){
  const r=store.history[0],wrong=r.ids.filter(id=>!r.checked[id]),passed=r.correct/r.total*100>=r.passPercent;
  layout(`<div class="intro"><h1>نتيجة جلستك</h1><p>${esc(r.title)}</p></div><section class="panel"><div class="row"><div><div class="result-number">${r.percent}%</div><span class="tag ${passed?'green':'blue'}">${passed?'اجتزت هدف الجلسة':'واصل التدريب'} · الهدف ${r.passPercent}%</span></div><div><p><strong>${r.correct}</strong> إجابات صحيحة من ${r.total}</p><p class="muted">${r.skipped} بلا إجابة · مدة الجلسة ${formatTime(r.elapsed)}</p></div></div><div class="actions" style="margin-top:24px"><button class="primary" data-action="review-result">مراجعة جميع الإجابات</button><button data-action="retry-wrong" ${wrong.length?'':'disabled'}>تدريب على الأخطاء (${wrong.length})</button><button data-action="nav" data-view="home">اختيار موضوع آخر</button></div></section><div class="study-tip">مفتاح التصحيح هو المفتاح المعروض في الموقع الأصلي. النتيجة هنا للتدريب الشخصي.</div><h2 style="margin-top:24px">ابدأ بالمراجعة</h2>${wrong.slice(0,5).map(id=>bankCard(byId.get(id),r)).join('')}${wrong.length>5?`<p class="muted small">توجد ${wrong.length-5} أسئلة إضافية في مراجعة الجلسة.</p>`:''}`);
 }
 function filteredQuestions(){let list=data.questions;if(view==='mistakes')list=list.filter(q=>store.progress[q.id]&&!store.progress[q.id].lastCorrect);if(view==='flags')list=list.filter(q=>store.flags[q.id]);if(sourceFilter!=='all')list=list.filter(q=>q.sources.some(a=>a.sourceId===sourceFilter));if(bankFilter==='matching')list=list.filter(q=>q.type==='matching');if(bankFilter==='multiple')list=list.filter(q=>q.type==='multiple');if(bankFilter==='single')list=list.filter(q=>q.type==='single');if(query.trim()){let term=query.trim().toLocaleLowerCase();list=list.filter(q=>[q.question,...q.options,q.explanation,...q.pairs.flatMap(p=>[p.target,...p.answers])].concat(q.english?[q.english.question,...q.english.options,q.english.explanation]:[]).join(' ').toLocaleLowerCase().includes(term));}return list;}
 function renderBank(){
  const resultMode=bankFilter==='result';let list=resultMode?store.history[0].ids.map(id=>byId.get(id)):filteredQuestions();
  const title=resultMode?'مراجعة الجلسة':view==='mistakes'?'مراجعة الأخطاء':view==='flags'?'الأسئلة المحفوظة':'بنك الأسئلة';
  const pages=Math.max(1,Math.ceil(list.length/12));page=Math.min(page,pages-1);
  const controls=resultMode?'':`<div class="tools"><label class="grow">ابحث في السؤال أو الشرح<input id="search" type="search" value="${esc(query)}" placeholder="مصطلح أو عبارة من السؤال…"></label><label>القسم<select id="source-filter"><option value="all">جميع الأقسام المتاحة</option>${data.sources.filter(s=>s.questionIds.length).map(s=>`<option value="${s.id}" ${sourceFilter===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select></label><label>نوع السؤال<select id="bank-type"><option value="all">كل الأنواع</option>${[['single','اختيار واحد'],['multiple','اختيارات متعددة'],['matching','مطابقة']].map(([v,t])=>`<option value="${v}" ${bankFilter===v?'selected':''}>${t}</option>`).join('')}</select></label><button class="primary" data-action="start-filtered" ${list.length?'':'disabled'}>تدريب على هذه المجموعة</button></div>`;
  layout(`<div class="intro row"><div><h1>${title}</h1><p>${n(list.length)} سؤالًا. افتح أي سؤال لعرض مفتاح الإجابة والشرح.</p></div>${resultMode?'<button data-action="nav" data-view="result">العودة للنتيجة</button>':''}</div>${controls}${list.length?list.slice(page*12,(page+1)*12).map(q=>bankCard(q,resultMode?store.history[0]:null)).join(''):`<div class="panel empty">${view==='mistakes'?'لا توجد أخطاء مسجلة بعد. ابدأ جلسة تدريب لتظهر هنا.':view==='flags'?'احفظ الأسئلة التي تريد الرجوع إليها أثناء التدريب.':'لا توجد أسئلة تطابق هذا البحث.'}</div>`}<div class="pagination"><button data-action="bank-prev" ${page?'':'disabled'}>السابق</button><span class="small">الصفحة ${page+1} من ${pages}</span><button data-action="bank-next" ${page+1<pages?'':'disabled'}>التالي</button></div>`);
 }
 function bankCard(q,result){
  const text=currentText(q),dir=direction(q),membership=[...new Set(q.sources.map(a=>sources.get(a.sourceId)?.title))];
  const yours=result?.answers[q.id];
  return `<details class="bank-item"><summary dir="${dir}">${esc(text.question)}</summary>${issue(q)}${caseText(q)}<div class="small muted" style="margin-top:12px">${esc(membership.join(' · '))}</div>${renderImages(q)}${q.type==='matching'?`<div class="study-tip"><strong>عناصر المطابقة:</strong> ${q.choices.map(esc).join(' · ')}</div>`:`<div dir="${dir}" style="margin-top:16px">${text.options.map((o,i)=>`<p style="margin:8px 0"><strong>${String.fromCharCode(65+i)}.</strong> ${esc(o)} ${result&&yours?.includes(i)?'<span class="tag blue">اختيارك</span>':''}</p>`).join('')}</div>`}<div class="answers" dir="${dir}"><strong>مفتاح الإجابة في المصدر</strong><br>${answerKey(q,language)}</div>${result?`<span class="tag ${result.checked[q.id]?'green':'red'}">${result.checked[q.id]?'صحيح':hasAnswer(q,yours)?'خطأ':'بلا إجابة'}</span>`:''}<p class="explanation" dir="${dir}"><strong>الشرح</strong><br>${esc(text.explanation||'لا يوجد شرح إضافي في المصدر.')}</p><div class="actions" style="margin-top:16px"><button data-action="bank-flag" data-id="${q.id}">${store.flags[q.id]?'إلغاء الحفظ':'حفظ للمراجعة'}</button></div></details>`;
 }
 function renderHistory(){layout(`<div class="intro"><h1>نتائجك وتقدمك</h1><p>سجل جلساتك محفوظ في حسابك ويمكنك متابعته من أي جهاز.</p></div>${stats()}<section class="panel">${store.history.length?store.history.map((r,i)=>`<div class="history-item row"><div><h3>${esc(r.title)}</h3><p class="small muted">${new Date(r.finishedAt).toLocaleString(language==='en'?'en-US':'ar-SA')} · ${r.mode==='exam'?'اختبار مؤقت':'تدريب'} · ${r.total} سؤالًا</p></div><div class="actions"><strong>${r.percent}%</strong><button data-action="open-history" data-index="${i}">عرض النتيجة</button></div></div>`).join(''):'<div class="empty">ستظهر نتائجك هنا بعد إنهاء أول جلسة.</div>'}</section><div class="tools"><button data-action="backup">تنزيل نسخة احتياطية من التقدم</button><label>استعادة تقدم محفوظ<input id="restore" type="file" accept="application/json,.json"></label></div>`);}
 app.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const a=button.dataset.action,s=store.session,q=sessionQuestion();
  if(a==='download-data'){event.preventDefault();exportQuestions(button.dataset.format);}
  else if(a==='nav'){bankFilter='all';page=0;navigate(button.dataset.view);}
  else if(a==='start')startSession(button.dataset.source,button.dataset.mode);
  else if(a==='start-all')startSession(null);
  else if(a==='resume'){if(!s)return;s.paused=false;tickAt=Date.now();save();view='session';location.hash=view;render();}
  else if(a==='pause'){s.paused=true;save();render();}
  else if(a==='flag'||a==='bank-flag'){const id=a==='flag'?q.id:button.dataset.id;store.flags[id]=!store.flags[id];save();if(a==='flag')render();else{button.textContent=store.flags[id]?'إلغاء الحفظ':'حفظ للمراجعة';toast(store.flags[id]?'حُفظ السؤال للمراجعة.':'أُلغي حفظ السؤال.');}}
  else if(a==='language'){language=language==='ar'?'en':'ar';render();}
  else if(a==='check'){if(!hasAnswer(q,s.answers[q.id])||checked(s,q.id))return;s.checked[q.id]=grade(q,s.answers[q.id]);record(q,s.checked[q.id]);save();render();}
  else if(a==='previous'){if(s.index)s.index--;save();render();}
  else if(a==='next'){if(s.index<s.ids.length-1){s.index++;save();render();}else{pendingFinish=true;render();}}
  else if(a==='jump'){s.index=Number(button.dataset.index);save();render();}
  else if(a==='jump-unanswered'){const i=s.ids.findIndex(id=>!hasAnswer(byId.get(id),s.answers[id]));if(i>=0){s.index=i;save();render();}else toast('تمت الإجابة عن جميع الأسئلة.');}
  else if(a==='finish-prompt'){pendingFinish=true;render();}
  else if(a==='cancel-finish'){pendingFinish=false;render();}
  else if(a==='finish')finish();
  else if(a==='review-result'){bankFilter='result';page=0;view='bank';location.hash='bank';render();}
  else if(a==='retry-wrong'){startSession(null,'practice',store.history[0].ids.filter(id=>!store.history[0].checked[id]));}
  else if(a==='start-filtered')startSession(null,'practice',filteredQuestions().map(q=>q.id));
  else if(a==='bank-prev'){if(page)page--;render();}
  else if(a==='bank-next'){page++;render();}
  else if(a==='open-history'){const r=store.history.splice(Number(button.dataset.index),1)[0];store.history.unshift(r);save();view='result';location.hash=view;render();}
  else if(a==='backup'){const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='pmp-progress-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تجهيز نسخة تقدمك للتنزيل.');}
 });
 app.addEventListener('change',event=>{
  const el=event.target,s=store.session,q=sessionQuestion();
  if(el.name==='answer'){
   if(!s||s.paused||checked(s,q.id))return;
   s.answers[q.id]=[...app.querySelectorAll('input[name="answer"]:checked')].map(e=>Number(e.value));save();render();
  }else if(el.dataset.match!==undefined){if(!s||s.paused||checked(s,q.id))return;s.answers[q.id] ||= {};s.answers[q.id][el.dataset.match]=el.type==='checkbox'?[...app.querySelectorAll(`input[data-match="${el.dataset.match}"]:checked`)].map(o=>o.value):[...el.selectedOptions].map(o=>o.value).filter(Boolean);save();render();}
  else if(el.id==='category'){category=el.value;render();}
  else if(el.id==='source-filter'){sourceFilter=el.value;page=0;render();}
  else if(el.id==='bank-type'){bankFilter=el.value;page=0;render();}
  else if(el.id==='search'){query=el.value;page=0;render();}
  else if(el.id==='restore'){
   const file=el.files[0];if(!file)return;
   if(file.size>10*1024*1024){toast('الملف أكبر من الحجم المسموح.');return;}
   file.text().then(text=>{try{const imported=JSON.parse(text);if(imported.version!==1||!imported.progress||!Array.isArray(imported.history))throw new Error();if(!confirm('استعادة هذه النسخة ستستبدل تقدمك الحالي. هل تريد المتابعة؟'))return;store=imported;store.flags ||= {};if(store.session)store.session.paused=true;save();render();toast('استُعيد تقدمك بنجاح.');}catch{toast('هذا الملف ليس نسخة صالحة من تقدم PMP.');}});
  }
 });
 app.addEventListener('keydown',event=>{if(event.target.id==='search'&&event.key==='Enter'){query=event.target.value;page=0;render();}});
 window.addEventListener('hashchange',()=>{const next=location.hash.slice(1)||'home';if(next!==view){if(store.session)store.session.paused=true;view=next;pendingFinish=false;render();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&store.session&&!store.session.finished){store.session.paused=true;save();if(view==='session')render();}});
 window.addEventListener('pagehide',()=>sync.flush());
 window.addEventListener('pmp-language-change',event=>{language=event.detail;render();});
 setInterval(()=>{let s=store.session;const now=Date.now(),elapsed=Math.max(0,Math.floor((now-tickAt)/1000));if(elapsed<1)return;tickAt=now;if(!s||s.paused||s.finished||view!=='session')return;s.elapsed+=elapsed;s.timeRemaining=Math.max(0,s.timeRemaining-elapsed);const timer=document.getElementById('timer');if(timer)timer.textContent=formatTime(s.mode==='exam'?s.timeRemaining:s.elapsed);if(s.mode==='exam'&&s.timeRemaining===0){finish();toast('انتهى الوقت وحُفظت نتيجتك.');}else if(s.elapsed%5===0)save();},1000);
 render();if(cached?.dirty)save();
})();
