// ---------- process validation UI ----------
const governanceStyles=document.createElement('link');
governanceStyles.rel='stylesheet';
governanceStyles.href=new URL('../styles/governance.css',document.currentScript.src).href;
document.head.appendChild(governanceStyles);

const validationPanel=document.getElementById('validationPanel');
const validationBody=document.getElementById('validationBody');
const validationBadge=document.getElementById('validationBadge');

function focusValidationIssue(item){
  validationPanel.classList.remove('show');
  if(item.nodeId){
    const target=node(item.nodeId);
    if(!target)return;
    sel=new Set([target.id]);selEdge=null;selLane=null;
    const bounds=stage.getBoundingClientRect();
    view.x=bounds.width/2-(target.x+target.w/2)*view.z;
    view.y=bounds.height/2-(target.y+target.h/2)*view.z;
    applyView();render();
    toast('تم الانتقال إلى العنصر المتأثر');
    return;
  }
  if(item.edgeId){pickEdge(item.edgeId);toast('تم تحديد المسار المتأثر');return;}
  if(item.laneId){selLane=item.laneId;sel.clear();selEdge=null;render();toast('تم تحديد القسم المتأثر');}
}
function validationIcon(severity){return severity==='error'?'!':'⚠';}
function runValidation(){
  const result=GOV.analyzeProcess(state);
  const {errors,warnings,total}=result.summary;
  validationBadge.textContent=total?String(total):'✓';
  validationBadge.className=errors?'bad':warnings?'warn':'good';
  const headline=errors?'المخطط يحتاج تصحيحًا':warnings?'المخطط يعمل مع ملاحظات':'المخطط سليم';
  const intro=total?`${errors} خطأ · ${warnings} تحذير`:'لم يكتشف الفحص أخطاء أو تحذيرات.';
  const items=result.issues.map((item,index)=>`<button class="validation-item ${item.severity}" data-validation-index="${index}">
      <span class="validation-icon">${validationIcon(item.severity)}</span>
      <span><b>${item.severity==='error'?'خطأ':'تحذير'}</b><small>${escapeHtml(item.message)}</small></span>
      ${(item.nodeId||item.edgeId||item.laneId)?'<em>فتح ↗</em>':''}
    </button>`).join('');
  validationBody.innerHTML=`<div class="validation-head">
      <p class="k">فحص سلامة العملية</p><h2>${headline}</h2><p>${intro}</p>
      <div class="validation-stats"><span class="error-stat"><b>${errors}</b> أخطاء</span><span class="warning-stat"><b>${warnings}</b> تحذيرات</span><span><b>${state.nodes.length}</b> عناصر</span><span><b>${state.lanes.length}</b> أقسام</span></div>
    </div>
    <div class="validation-list">${items||'<div class="validation-empty">✓ جاهز للتوثيق والتصدير</div>'}</div>`;
  validationBody.querySelectorAll('[data-validation-index]').forEach(button=>{
    const item=result.issues[Number(button.dataset.validationIndex)];
    if(item.nodeId||item.edgeId||item.laneId)button.addEventListener('click',()=>focusValidationIssue(item));
  });
  validationPanel.classList.add('show');
  return result;
}
document.getElementById('validateBtn').onclick=runValidation;
document.getElementById('validationClose').onclick=()=>validationPanel.classList.remove('show');
validationPanel.addEventListener('click',event=>{if(event.target===validationPanel)validationPanel.classList.remove('show');});
