// ---------- export / persist ----------
const STORAGE_KEY='masar_doc';
const SESSIONS_KEY='masar_sessions';
function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);}
function projectEnvelope(){return CORE.createProject({state,view,board,currentSession});}
function applyProject(project,{clean=true,persist=true,message=''}={}){
  state=structuredClone(project.state);view=structuredClone(project.view);board=structuredClone(project.board);currentSession=project.currentSession||null;
  normalize();recalculateUid();sel.clear();selEdge=null;selLane=null;hist=[];future=[];render();applyView();applyBoard();syncBgSel();
  if(persist)autosave({markDirty:false});clean?markClean():markDirty();if(message)toast(message);
}
function exportJSON(){
  const payload=projectEnvelope();download('masar-project.json',new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));markClean();toast('تم حفظ ملف المشروع');
}
function importJSON(){document.getElementById('fileIn').click();}
document.getElementById('fileIn').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const project=CORE.migrateProject(JSON.parse(r.result));if(!confirmProjectReplacement('فتح المشروع المستورد'))return;applyProject(project,{clean:true,persist:true,message:'تم فتح المشروع'});}catch(error){toast(error&&error.message?error.message:'ملف غير صالح');}};r.readAsText(f);e.target.value='';});

function reportRoles(value){const list=GOV.parseRoles(value);return list.length?escapeHtml(list.join('، ')):'<span class="m">—</span>';}
function exportReport(){
  const rows=state.nodes.filter(n=>!['note','connector','event_start','event_end'].includes(n.type));
  const validation=GOV.analyzeProcess(state);
  let totDur=0,totCost=0;
  const trs=rows.map((n,i)=>{
    const a=CORE.normalizeAttrs(n.attrs),raci=a.raci,lane=state.lanes.find(item=>item.id===n.laneId);
    totDur+=Number(a.dur)||0;totCost+=Number(a.cost)||0;
    const rk=RISK[a.risk]||RISK.unassessed;
    return `<tr>
      <td class="c">${i+1}</td><td>${escapeHtml(n.label)}</td><td>${lane?escapeHtml(lane.title):'<span class="m">—</span>'}</td>
      <td>${escapeHtml(a.owner)||'<span class="m">—</span>'}</td><td>${reportRoles(raci.responsible)}</td><td>${reportRoles(raci.accountable)}</td>
      <td>${reportRoles(raci.consulted)}</td><td>${reportRoles(raci.informed)}</td><td>${escapeHtml(a.system)||'<span class="m">—</span>'}</td>
      <td class="c">${a.dur?a.dur+' د':'<span class="m">—</span>'}</td><td class="c">${a.cost?Number(a.cost).toLocaleString('en'):'<span class="m">—</span>'}</td>
      <td class="c"><span class="risk" style="background:${rk.c}">${rk.t}</span></td></tr>`;
  }).join('');
  const title=currentSession||'مخطط سير العملية';
  const html=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير حوكمة — ${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
  <style>@page{size:A3 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Tajawal,sans-serif;color:#202938;margin:0;padding:24px;background:#fff}
  .hd{border-bottom:3px solid #00a984;padding-bottom:12px;margin-bottom:16px}.k{color:#00866a;font-weight:800;font-size:12px;margin:0 0 5px}h1{margin:0;font-size:22px;font-weight:800}
  .meta{color:#657286;font-size:12px;font-weight:600;margin-top:6px}table{width:100%;border-collapse:collapse;font-size:10.5px}th,td{border:1px solid #dfe6e9;padding:6px 7px;text-align:start;vertical-align:middle}
  th{background:#edf8f5;color:#007b61;font-weight:800;font-size:10px}td.c{text-align:center}.m{color:#a8b0ba}tbody tr:nth-child(even){background:#fafcfc}.risk{color:#fff;font-weight:800;font-size:9px;padding:2px 7px;border-radius:20px;display:inline-block}
  tfoot td{background:#edf8f5;font-weight:800}.foot{margin-top:14px;color:#657286;font-size:10.5px;display:flex;justify-content:space-between}</style></head><body>
  <div class="hd"><p class="k">تقرير حوكمة العملية · الأقسام ومصفوفة RACI</p><h1>${escapeHtml(title)}</h1>
  <div class="meta">${rows.length} خطوة · ${state.lanes.length} قسم · ${validation.summary.errors} خطأ · ${validation.summary.warnings} تحذير · إجمالي الزمن ${totDur} دقيقة · إجمالي التكلفة ${totCost.toLocaleString('en')} ر.س</div></div>
  <table><thead><tr><th>#</th><th>الخطوة</th><th>القسم</th><th>مالك العملية</th><th>R — المنفذ</th><th>A — المعتمد</th><th>C — المستشار</th><th>I — المطلع</th><th>النظام</th><th>الزمن</th><th>التكلفة</th><th>المخاطر</th></tr></thead>
  <tbody>${trs}</tbody><tfoot><tr><td class="c" colspan="9">الإجمالي</td><td class="c">${totDur} د</td><td class="c">${totCost.toLocaleString('en')}</td><td></td></tr></tfoot></table>
  <div class="foot"><span>مسار · تقرير حوكمة</span><span>${new Date().toLocaleDateString('ar-SA')}</span></div></body></html>`;
  download('masar-governance-report.html',new Blob([html],{type:'text/html'}));toast('تم إنشاء تقرير الحوكمة');
}

function svgString(scale){
  const xs=state.nodes.map(n=>n.x),ys=state.nodes.map(n=>n.y),xe=state.nodes.map(n=>n.x+n.w),ye=state.nodes.map(n=>n.y+n.h);
  const pad=30,minx=Math.min(...xs)-pad,miny=Math.min(...ys)-pad,maxx=Math.max(...xe)+pad,maxy=Math.max(...ye)+pad,W=maxx-minx,H=maxy-miny;
  const clone=vp.cloneNode(true);clone.querySelectorAll('.anchor,.selbox,.handle,.temp-edge,.marquee,.edge-hit').forEach(el=>el.remove());clone.setAttribute('transform',`translate(${-minx},${-miny})`);
  const font='<style>.lbl{display:flex;align-items:center;justify-content:center;text-align:center;font-family:Tajawal,sans-serif;font-weight:600;font-size:14px;color:#141824;padding:5px 9px;height:100%;direction:rtl}.elabel text{font-family:Tajawal,sans-serif;font-size:12px;font-weight:700}</style>';
  return {str:`<svg xmlns="http://www.w3.org/2000/svg" width="${W*(scale||1)}" height="${H*(scale||1)}" viewBox="0 0 ${W} ${H}"><defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>${font}<rect width="${W}" height="${H}" fill="${board.bgColor}"/>${clone.outerHTML}</svg>`,W,H};
}
function exportSVG(){const {str}=svgString(1);download('masar-diagram.svg',new Blob([str],{type:'image/svg+xml'}));}
function exportPNG(){
  const {str,W,H}=svgString(2),img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=W*2;c.height=H*2;const ctx=c.getContext('2d');ctx.fillStyle=board.bgColor;ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0);c.toBlob(b=>{if(b){download('masar-diagram.png',b);toast('تم حفظ PNG');}else toast('تعذّر التصدير — جرّب SVG');});};img.onerror=()=>toast('تعذّر تصدير PNG — استخدم SVG');img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(str);
}
function autosave(options={}){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(projectEnvelope()));if(options.markDirty!==false)markDirty();return true;}catch{toast('تعذّر الحفظ المحلي');return false;}}
function readAutosave(){const raw=localStorage.getItem(STORAGE_KEY);return raw?CORE.migrateProject(JSON.parse(raw)):null;}
function restore(options={}){try{if(!options.force&&!confirmProjectReplacement('استعادة آخر حفظ'))return false;const project=readAutosave();if(!project){toast('لا يوجد حفظ سابق');return false;}applyProject(project,{clean:true,persist:false,message:options.silent?'':'تم الاسترجاع'});return true;}catch(error){toast(error&&error.message?error.message:'لا يوجد حفظ سابق');return false;}}
function bootProject(){try{const project=readAutosave();if(!project)return false;applyProject(project,{clean:true,persist:false});return true;}catch{return false;}}
function getSessions(){try{return JSON.parse(localStorage.getItem(SESSIONS_KEY))||{};}catch{return {};}}
function putSessions(o){try{localStorage.setItem(SESSIONS_KEY,JSON.stringify(o));}catch{toast('تعذّر الحفظ محلياً');}}
function saveSession(name){if(!name)return;const sessions=getSessions(),project=projectEnvelope();project.currentSession=name;project.ts=Date.now();sessions[name]=project;putSessions(sessions);currentSession=name;autosave({markDirty:false});markClean();toast('حُفظت الجلسة: '+name);renderSessionList();}
function loadSession(name){const sessions=getSessions(),saved=sessions[name];if(!saved)return false;if(!confirmProjectReplacement('فتح الجلسة'))return false;try{const project=CORE.migrateProject(saved);project.currentSession=name;applyProject(project,{clean:true,persist:true,message:'فُتحت الجلسة: '+name});return true;}catch(error){toast(error&&error.message?error.message:'تعذّر فتح الجلسة');return false;}}
function deleteSession(name){const sessions=getSessions();delete sessions[name];putSessions(sessions);if(currentSession===name)currentSession=null;renderSessionList();toast('حُذفت الجلسة');}
function renderSessionList(){
  const el=document.getElementById('sesList'),sessions=getSessions(),names=Object.keys(sessions).sort((a,b)=>(sessions[b].ts||0)-(sessions[a].ts||0));document.getElementById('sesSave').style.display=currentSession?'flex':'none';
  if(!names.length){el.innerHTML='<div style="padding:10px 8px;font-size:12px;color:var(--sub)">لا توجد جلسات محفوظة بعد.</div>';return;}el.innerHTML='';
  names.forEach(name=>{const saved=sessions[name];let count=0;try{count=CORE.migrateProject(saved).state.nodes.length;}catch{}const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:4px;padding:2px 0';const load=document.createElement('button');load.style.cssText='flex:1;border:none;background:transparent;text-align:start;font-weight:700;font-size:13px;padding:8px 10px;border-radius:8px;cursor:pointer;color:var(--ink)';load.innerHTML=(name===currentSession?'● ':'')+escapeHtml(name)+`<span style="display:block;font-size:10px;color:var(--sub);font-weight:600">${new Date(saved.ts||saved.savedAt||Date.now()).toLocaleDateString('ar')} · ${count} عنصر</span>`;load.onmouseenter=()=>load.style.background='#f3f0fa';load.onmouseleave=()=>load.style.background='transparent';load.onclick=()=>{if(loadSession(name))document.getElementById('sesPop').classList.remove('show');};const del=document.createElement('button');del.textContent='✕';del.style.cssText='border:none;background:#f3f0fa;color:#c62828;border-radius:7px;width:26px;height:26px;cursor:pointer;font-weight:800;flex:0 0 auto';del.onclick=ev=>{ev.stopPropagation();if(confirm('حذف الجلسة «'+name+'»؟'))deleteSession(name);};row.appendChild(load);row.appendChild(del);el.appendChild(row);});
}
