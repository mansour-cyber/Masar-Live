const SVGNS='http://www.w3.org/2000/svg';
const CORE=globalThis.MasarProjectCore;
const GOV=globalThis.MasarGovernanceCore;
if(!CORE||!GOV)throw new Error('Masar core modules failed to load');

const PALETTE=[
 {t:'event_start',n:'حدث بداية'},
 {t:'terminator',n:'بداية/نهاية'},
 {t:'process',n:'مهمة / عملية'},
 {t:'decision',n:'بوابة/قرار'},
 {t:'gateway',n:'بوابة BPMN'},
 {t:'io',n:'إدخال/إخراج'},
 {t:'subprocess',n:'عملية فرعية'},
 {t:'document',n:'مستند'},
 {t:'database',n:'قاعدة بيانات'},
 {t:'manual',n:'إجراء يدوي'},
 {t:'event_end',n:'حدث نهاية'},
 {t:'connector',n:'وصلة'},
 {t:'note',n:'ملاحظة'},
];
const COLORS=[
 {id:'purple', f:'#f1ecf8', s:'#6a4d9c'},
 {id:'blue',   f:'#e7f0fb', s:'#2f6bb0'},
 {id:'green',  f:'#e8f4e9', s:'#2e7d32'},
 {id:'amber',  f:'#fdf3e1', s:'#d98a1e'},
 {id:'red',    f:'#fbeaea', s:'#c62828'},
 {id:'teal',   f:'#e4f5f2', s:'#1f9187'},
 {id:'gray',   f:'#f4f5f8', s:'#8a90a0'},
 {id:'ink',    f:'#e9eaf0', s:'#3a4256'},
];

function shapeMarkup(t,w,h,fill,stroke){
  const at=`fill="${fill}" stroke="${stroke}" stroke-width="2" class="shp"`;
  const ln=`stroke="${stroke}" stroke-width="2"`;
  const sk=Math.min(26,w*0.16);
  switch(t){
    case 'terminator': return `<rect x="0" y="0" width="${w}" height="${h}" rx="${h/2}" ${at} />`;
    case 'process':    return `<rect x="0" y="0" width="${w}" height="${h}" rx="12" ${at} />`;
    case 'decision':   return `<polygon points="${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}" ${at} />`;
    case 'io':         return `<polygon points="${sk},0 ${w},0 ${w-sk},${h} 0,${h}" ${at} />`;
    case 'manual':     return `<polygon points="${sk},0 ${w-sk},0 ${w},${h} 0,${h}" ${at} />`;
    case 'subprocess': return `<rect x="0" y="0" width="${w}" height="${h}" rx="8" ${at} />`+
                              `<line x1="9" y1="0" x2="9" y2="${h}" ${ln} />`+
                              `<line x1="${w-9}" y1="0" x2="${w-9}" y2="${h}" ${ln} />`;
    case 'document':   return `<path d="M0,0 H${w} V${h-8} C ${w*0.72},${h+8} ${w*0.28},${h-20} 0,${h-6} Z" ${at} />`;
    case 'database':{ const e=Math.max(8,h*0.16);
                       return `<path d="M0,${e} A ${w/2},${e} 0 0 1 ${w},${e} V ${h-e} A ${w/2},${e} 0 0 1 0,${h-e} Z" ${at} />`+
                              `<path d="M0,${e} A ${w/2},${e} 0 0 0 ${w},${e}" fill="none" ${ln} />`; }
    case 'connector':{ const r=Math.min(w,h)/2; return `<circle cx="${w/2}" cy="${h/2}" r="${r}" ${at} />`; }
    case 'event_start':{ const r=Math.min(w,h)/2-2; return `<circle cx="${w/2}" cy="${h/2}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5" class="shp" />`; }
    case 'event_end':{ const r=Math.min(w,h)/2-2; return `<circle cx="${w/2}" cy="${h/2}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="5" class="shp" />`; }
    case 'gateway':{ const cx=w/2,cy=h/2,m=Math.min(w,h)*0.18;
      return `<polygon points="${cx},0 ${w},${cy} ${cx},${h} 0,${cy}" ${at} />`+
             `<path d="M${cx-m},${cy-m} L${cx+m},${cy+m} M${cx+m},${cy-m} L${cx-m},${cy+m}" fill="none" ${ln} />`; }
    case 'note':       return `<path d="M0,0 H${w-16} L${w},16 V${h} H0 Z" ${at} />`+
                              `<path d="M${w-16},0 V16 H${w}" fill="none" ${ln} />`;
    default:           return `<rect x="0" y="0" width="${w}" height="${h}" rx="12" ${at} />`;
  }
}
function defaultSize(t){
  if(t==='decision')return{w:150,h:96};
  if(t==='connector')return{w:56,h:56};
  if(t==='event_start'||t==='event_end')return{w:62,h:62};
  if(t==='gateway')return{w:84,h:84};
  if(t==='database')return{w:150,h:96};
  if(t==='note')return{w:170,h:80};
  if(t==='terminator')return{w:180,h:56};
  return{w:180,h:66};
}
function chipSVG(t){
  const w=34,h=22; return `<svg viewBox="0 0 ${w} ${h}">${shapeMarkup(t,w,h,'#efeaf7','#6a4d9c')}</svg>`;
}

let state={nodes:[],edges:[],lanes:[]};
let view={x:60,y:20,z:1};
let board={bgColor:'#eef0f5', pattern:'grid'};
let currentSession=null;
let sel=new Set(), selEdge=null, selLane=null, uid=1, snap=true;
let clip=null, hist=[], future=[];
let inspTab='format';
let dirty=false;
const BASE_TITLE='مسار · محرّر مخططات سير العمليات';

function defaultAttrs(){ return CORE.normalizeAttrs({}); }
const RISK={
  unassessed:{t:'غير مقيّمة',c:'#7a8492'},
  low:{t:'منخفض',c:'#2e7d32'},
  med:{t:'متوسط',c:'#d98a1e'},
  high:{t:'مرتفع',c:'#c62828'},
};
const BPMN_TYPES=[['','— غير محدّد —'],['task','مهمة (Task)'],['subprocess','عملية فرعية'],['start','حدث بداية'],['end','حدث نهاية'],['gateway','بوابة قرار'],['data','كائن بيانات'],['manual','إجراء يدوي'],['event','حدث وسطي']];
const LANE_COLORS=[{id:'purple',f:'#e9def5',s:'#6a4d9c'},{id:'blue',f:'#dcebfa',s:'#2f6bb0'},{id:'green',f:'#dcf0dd',s:'#2e7d32'},{id:'amber',f:'#fbeed3',s:'#d98a1e'},{id:'teal',f:'#d6f0eb',s:'#1f9187'},{id:'gray',f:'#e6e8ef',s:'#8a90a0'}];

function normalize(){
  if(!Array.isArray(state.nodes))state.nodes=[];
  if(!Array.isArray(state.edges))state.edges=[];
  if(!Array.isArray(state.lanes))state.lanes=[];
  const laneIds=new Set(state.lanes.map(lane=>lane.id));
  state.nodes.forEach(n=>{
    n.attrs=CORE.normalizeAttrs(n.attrs);
    n.laneId=n.laneId&&laneIds.has(n.laneId)?n.laneId:null;
  });
}
function syncNodeLane(nodeValue){return GOV.syncNodeLane(nodeValue,state.lanes);}
function syncAllNodeLanes(){state.nodes.forEach(syncNodeLane);}
function updateDirtyUI(){
  document.title=(dirty?'● ':'')+BASE_TITLE;
  document.documentElement.dataset.dirty=dirty?'true':'false';
}
function markDirty(){dirty=true;updateDirtyUI();}
function markClean(){dirty=false;updateDirtyUI();}
function confirmProjectReplacement(action){
  return !dirty||confirm(`لديك تعديلات لم تحفظها كجلسة أو ملف JSON. هل تريد ${action} واستبدال المشروع الحالي؟`);
}
function recalculateUid(){uid=CORE.nextUid(state);return uid;}
function nextId(prefix){
  const result=CORE.nextId(prefix,state,uid);
  uid=result.next;
  return result.id;
}
window.addEventListener('beforeunload',event=>{
  if(!dirty)return;
  event.preventDefault();
  event.returnValue='';
});

const svg=document.getElementById('svg');
const vp=document.getElementById('vp');
const gNodes=document.getElementById('nodes');
const gEdges=document.getElementById('edges');
const gOver=document.getElementById('overlay');
const stage=document.getElementById('stage');
const inspector=document.getElementById('inspector');

function T_stc(){
  const cx=300;
  const N=[
   ['s','terminator','purple','طلب إصدار خدمة STC للقاصر',cx-90,20,240,58],
   ['naf','process','gray','التحقق عبر النفاذ الوطني الموحّد',cx-90,110,240,58],
   ['p1','process','purple','١. القاصر يقدّم الطلب عبر قنوات STC',cx-100,200,260,60],
   ['p2','process','purple','٢. النظام يطلب النفاذ ويُدخل هوية القاصر',cx-100,290,260,60],
   ['p3','process','purple','٣. النفاذ يرسل رقماً عشوائياً للقاصر',cx-100,380,260,60],
   ['p4','process','purple','٤. تطبيق نفاذ يُشعِر القاصر بالطلب',cx-100,470,260,60],
   ['p5','process','purple','٥. القاصر يقبل الطلب عبر نفاذ',cx-100,560,260,60],
   ['p6','process','purple','٦. التحقق من هوية القاصر عبر 3FA',cx-100,650,260,60],
   ['d','decision','amber','٧. التحقق من الأهلية عبر «علم» — العمر ١٥–١٨ وحالة ولي الأمر',cx-110,745,340,104],
   ['rej','process','red','رفض الطلب',30,905,190,58],
   ['m1','process','gray','٨. إرسال طلب الموافقة لولي الأمر',cx-100,905,260,60],
   ['m2','process','gray','٩. النفاذ يرسل رقماً عشوائياً لولي الأمر',cx-100,995,260,60],
   ['m3','process','gray','١٠. إشعار ولي الأمر بالطلب',cx-100,1085,260,60],
   ['m4','process','gray','١١. ولي الأمر يقبل الطلب',cx-100,1175,260,60],
   ['m5','process','gray','١٢. التحقق من ولي الأمر عبر 3FA',cx-100,1265,260,60],
   ['x1','subprocess','amber','تحويل الطلب للتحقق من الوصي الشرعي',cx+230,905,260,60],
   ['x2','subprocess','amber','التحقق من الوصي بموجب صك الولاية',cx+230,995,260,60],
   ['x3','subprocess','amber','إعادة الخطوات ٨–١٢ مع الوصي',cx+230,1085,260,60],
   ['iss','terminator','green','إصدار الخدمة',cx-90,1395,240,58],
  ].map(a=>({id:a[0],type:a[1],color:a[2],label:a[3],x:a[4],y:a[5],w:a[6],h:a[7]}));
  const E=[
   ['s','naf'],['naf','p1'],['p1','p2'],['p2','p3'],['p3','p4'],['p4','p5'],['p5','p6'],['p6','d'],
   ['d','rej','عمر < ١٥ أو عدم أهلية'],['d','m1','ولي الأمر على قيد الحياة'],
   ['m1','m2'],['m2','m3'],['m3','m4'],['m4','m5'],['m5','iss'],
   ['d','x1','ولي الأمر متوفّى'],['x1','x2'],['x2','x3'],['x3','iss'],
  ].map((e,i)=>({id:'E'+i,from:e[0],to:e[1],label:e[2]||'',dashed:false}));
  return {nodes:N,edges:E,lanes:[]};
}
function T_approval(){
  return {nodes:[
    {id:'a',type:'terminator',color:'green',label:'تقديم الطلب',x:220,y:30,w:180,h:56},
    {id:'b',type:'process',color:'blue',label:'مراجعة أوّلية',x:220,y:130,w:180,h:62},
    {id:'c',type:'decision',color:'amber',label:'مكتمل المستندات؟',x:230,y:235,w:160,h:96},
    {id:'d',type:'process',color:'red',label:'إعادة للمُقدِّم للاستكمال',x:470,y:250,w:190,h:62},
    {id:'e',type:'process',color:'blue',label:'اعتماد المدير المباشر',x:220,y:380,w:180,h:62},
    {id:'f',type:'terminator',color:'green',label:'اعتماد نهائي',x:220,y:480,w:180,h:56},
  ],edges:[
    {id:'e0',from:'a',to:'b',label:''},{id:'e1',from:'b',to:'c',label:''},
    {id:'e2',from:'c',to:'d',label:'لا',dashed:true},{id:'e3',from:'d',to:'b',label:''},
    {id:'e4',from:'c',to:'e',label:'نعم'},{id:'e5',from:'e',to:'f',label:''},
  ],lanes:[]};
}
function T_onboarding(){
  return {nodes:[
    {id:'a',type:'terminator',color:'purple',label:'قبول العرض الوظيفي',x:220,y:30,w:190,h:56},
    {id:'b',type:'io',color:'blue',label:'استلام المستندات',x:220,y:130,w:190,h:62},
    {id:'c',type:'process',color:'blue',label:'إنشاء الحسابات والصلاحيات',x:220,y:230,w:190,h:62},
    {id:'d',type:'subprocess',color:'teal',label:'برنامج التهيئة (أسبوع)',x:220,y:330,w:190,h:62},
    {id:'e',type:'database',color:'gray',label:'تسجيل في نظام HR',x:220,y:435,w:190,h:88},
    {id:'f',type:'terminator',color:'green',label:'موظف جاهز للعمل',x:220,y:560,w:190,h:56},
  ],edges:[
    {id:'e0',from:'a',to:'b'},{id:'e1',from:'b',to:'c'},{id:'e2',from:'c',to:'d'},
    {id:'e3',from:'d',to:'e'},{id:'e4',from:'e',to:'f'},
  ],lanes:[]};
}
function loadTemplate(name,options={}){
  const {force=false,markAsDirty=true,persist=true}=options;
  if(!force&&!confirmProjectReplacement('فتح القالب'))return false;
  const template=name==='stc'?T_stc():name==='approval'?T_approval():name==='onboarding'?T_onboarding():{nodes:[],edges:[],lanes:[]};
  state=structuredClone(template); normalize(); sel.clear(); selEdge=null; selLane=null; hist=[]; future=[]; currentSession=null;
  recalculateUid(); render(); fit();
  if(persist)autosave({markDirty:false});
  markAsDirty?markDirty():markClean();
  return true;
}

function toModel(cx,cy){ const r=svg.getBoundingClientRect(); return {x:(cx-r.left-view.x)/view.z, y:(cy-r.top-view.y)/view.z}; }
function applyView(){ vp.setAttribute('transform',`translate(${view.x},${view.y}) scale(${view.z})`);
  document.getElementById('bg').setAttribute('transform',`translate(${-view.x/view.z},${-view.y/view.z}) scale(${1/view.z})`);
  document.getElementById('zlbl').textContent=Math.round(view.z*100)+'%'; }
function colorOf(id){ return COLORS.find(c=>c.id===id)||COLORS[6]; }

const BG_COLORS=['#eef0f5','#ffffff','#f6f1e7','#eaf1f8','#eef3ec','#1f2433','#141824'];
const BG_PATTERNS=[['grid','▦ شبكة'],['dots','⋯ نقاط'],['lines','▤ خطوط'],['none','▢ سادة']];
function isDark(hex){ const h=hex.replace('#',''); if(h.length<6)return false;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (0.299*r+0.587*g+0.114*b)<110; }
function applyBoard(){
  document.getElementById('bgfill').setAttribute('fill',board.bgColor);
  document.getElementById('bg').setAttribute('fill', board.pattern==='none'?'none':`url(#${board.pattern})`);
  const dark=isDark(board.bgColor);
  document.documentElement.style.setProperty('--grid', dark?'rgba(255,255,255,.15)':'#dcdfea');
  document.getElementById('stage').style.background=board.bgColor;
}
function node(id){ return state.nodes.find(n=>n.id===id); }
function snapv(v){ return snap?Math.round(v/11)*11:v; }

function render(){
  normalize();
  renderLanes();
  const have=new Set();
  state.nodes.forEach(n=>{
    have.add(n.id);
    let g=document.getElementById('nd-'+n.id);
    if(!g){ g=document.createElementNS(SVGNS,'g'); g.id='nd-'+n.id; g.setAttribute('class','node'); g.dataset.id=n.id; gNodes.appendChild(g); bindNode(g); }
    const c=colorOf(n.color);
    g.setAttribute('transform',`translate(${n.x},${n.y})`);
    g.classList.toggle('sel',sel.has(n.id));
    g.classList.toggle('lane-bound',Boolean(n.laneId));
    g.dataset.laneId=n.laneId||'';
    g.innerHTML = shapeMarkup(n.type,n.w,n.h,c.f,c.s)
      + `<foreignObject x=0 y=0 width=${n.w} height=${n.h}><div xmlns="http://www.w3.org/1999/xhtml" class="lbl" style="width:${n.w}px;height:${n.h}px">${escapeHtml(n.label)}</div></foreignObject>`
      + anchorsMarkup(n);
  });
  [...gNodes.children].forEach(g=>{ if(!have.has(g.dataset.id))g.remove(); });
  drawEdges();
  drawOverlay();
  inspector.classList.toggle('show', sel.size>0||selEdge||selLane);
  if(sel.size||selEdge||selLane) buildInspector();
  document.getElementById('undo').disabled=!hist.length;
  document.getElementById('redo').disabled=!future.length;
}
