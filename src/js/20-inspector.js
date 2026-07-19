// ---------- inspector ----------
function rolesText(value){return GOV.parseRoles(value).join('، ');}
function buildInspector(){
  if(selLane){
    const L=(state.lanes||[]).find(x=>x.id===selLane);
    const members=state.nodes.filter(node=>node.laneId===L.id).length;
    inspector.innerHTML=`<h4>خصائص القسم<button onclick="deselect()">✕</button></h4>
      <div class="lane-meta">${members} عنصر مرتبط بهذا القسم</div>
      <div class="field"><label>الاسم</label><textarea class="tf" id="laneTitle">${escapeHtml(L.title)}</textarea></div>
      <div class="field"><label>اللون</label><div class="swatches" id="laneSw"></div></div>
      <div class="field"><button class="mini" style="width:100%;color:#c62828" onclick="delSel()">🗑 حذف القسم</button></div>`;
    document.getElementById('laneTitle').addEventListener('change',e=>{push();L.title=e.target.value.trim()||L.title;render();autosave();});
    const sw=inspector.querySelector('#laneSw');
    LANE_COLORS.forEach(c=>{const b=document.createElement('span');b.className='sw'+(L.color===c.id?' sel':'');b.style.background=c.f;b.style.boxShadow='0 0 0 1px '+c.s;b.onclick=()=>{push();L.color=c.id;render();autosave();};sw.appendChild(b);});
    return;
  }
  if(selEdge){
    const ed=state.edges.find(e=>e.id===selEdge);
    inspector.innerHTML=`<h4>خصائص المسار<button onclick="deselect()">✕</button></h4>
      <div class="field"><label>الشرط / النص</label><textarea class="tf" id="edLabel">${escapeHtml(ed.label)}</textarea></div>
      <div class="field"><label>النمط</label><div class="row">
        <button class="mini ${!ed.dashed?'on':''}" onclick="setDash(false)">─ متصل</button>
        <button class="mini ${ed.dashed?'on':''}" onclick="setDash(true)">┈ متقطّع</button></div></div>
      <div class="field"><button class="mini" style="width:100%;color:#c62828" onclick="delSel()">🗑 حذف المسار</button></div>`;
    document.getElementById('edLabel').addEventListener('change',e=>{push();ed.label=e.target.value.trim();render();autosave();});
    return;
  }
  const single=sel.size===1?node([...sel][0]):null;
  const tabs=single?`<div class="tabs">
      <button class="tab ${inspTab==='format'?'on':''}" onclick="setTab('format')">تنسيق</button>
      <button class="tab ${inspTab==='attr'?'on':''}" onclick="setTab('attr')">الحوكمة وRACI</button></div>`:'';
  inspector.innerHTML=`<h4>${single?'خصائص العنصر':sel.size+' عناصر محددة'}<button onclick="deselect()">✕</button></h4>${tabs}<div id="tabBody"></div>`;
  const body=inspector.querySelector('#tabBody');

  if(single&&inspTab==='attr'){
    const a=single.attrs=CORE.normalizeAttrs(single.attrs);
    const laneOptions=[`<option value="">— غير مرتبط بقسم —</option>`,...state.lanes.map(lane=>`<option value="${escapeAttr(lane.id)}" ${single.laneId===lane.id?'selected':''}>${escapeHtml(lane.title)}</option>`)].join('');
    body.innerHTML=`
      <div class="attr"><label>القسم / Swimlane</label><select id="a_lane">${laneOptions}</select></div>
      <div class="attr"><label>مالك العملية</label><input id="a_owner" value="${escapeAttr(a.owner)}" placeholder="مثال: إدارة العمليات"></div>
      <div class="raci-box">
        <div class="raci-title">مصفوفة RACI <span>افصل الأدوار بفاصلة</span></div>
        <div class="attr"><label><b>R</b> Responsible — المنفذ</label><input id="r_responsible" value="${escapeAttr(rolesText(a.raci.responsible))}" placeholder="مثال: أخصائي الخدمة"></div>
        <div class="attr"><label><b>A</b> Accountable — المعتمد النهائي</label><input id="r_accountable" value="${escapeAttr(rolesText(a.raci.accountable))}" placeholder="دور واحد فقط"></div>
        <div class="attr"><label><b>C</b> Consulted — المستشارون</label><input id="r_consulted" value="${escapeAttr(rolesText(a.raci.consulted))}" placeholder="مثال: الشؤون القانونية، الأمن السيبراني"></div>
        <div class="attr"><label><b>I</b> Informed — المطلعون</label><input id="r_informed" value="${escapeAttr(rolesText(a.raci.informed))}" placeholder="مثال: مدير القطاع"></div>
      </div>
      <div class="attr"><label>النظام المستخدم</label><input id="a_system" value="${escapeAttr(a.system)}" placeholder="مثال: نفاذ / CRM"></div>
      <div class="two">
        <div class="attr"><label>الزمن (دقيقة)</label><input id="a_dur" type="number" min="0" value="${escapeAttr(a.dur)}"></div>
        <div class="attr"><label>التكلفة (ر.س)</label><input id="a_cost" type="number" min="0" value="${escapeAttr(a.cost)}"></div>
      </div>
      <div class="two">
        <div class="attr"><label>مستوى المخاطر</label><select id="a_risk">${Object.entries(RISK).map(([k,v])=>`<option value="${k}" ${a.risk===k?'selected':''}>${v.t}</option>`).join('')}</select></div>
        <div class="attr"><label>نوع BPMN</label><select id="a_bpmn">${BPMN_TYPES.map(([k,v])=>`<option value="${k}" ${a.bpmn===k?'selected':''}>${v}</option>`).join('')}</select></div>
      </div>
      <div class="attr"><label>وصف / ملاحظات</label><textarea class="tf" id="a_desc" style="min-height:44px">${escapeHtml(a.desc)}</textarea></div>`;

    document.getElementById('a_lane').addEventListener('change',event=>{push();single.laneId=event.target.value||null;render();autosave();});
    const bind=(id,key)=>{const el=document.getElementById(id);el.addEventListener('change',()=>{push();single.attrs=CORE.normalizeAttrs(single.attrs);single.attrs[key]=el.value;autosave();});};
    ['owner','system','dur','cost','risk','bpmn','desc'].forEach(key=>bind('a_'+key,key));
    const bindRaci=(id,key,singleOnly=false)=>{
      const el=document.getElementById(id);
      el.addEventListener('change',()=>{
        let roles=GOV.parseRoles(el.value);
        if(singleOnly&&roles.length>1){roles=roles.slice(0,1);toast('يسمح بدور Accountable واحد فقط');}
        push();single.attrs=CORE.normalizeAttrs(single.attrs);single.attrs.raci[key]=roles;el.value=rolesText(roles);autosave();
      });
    };
    bindRaci('r_responsible','responsible');
    bindRaci('r_accountable','accountable',true);
    bindRaci('r_consulted','consulted');
    bindRaci('r_informed','informed');
    return;
  }

  body.innerHTML=`<div class="field"><label>اللون</label><div class="swatches" id="sw"></div></div>
    ${single?`<div class="field"><label>الشكل</label><div class="row" id="shrow" style="flex-wrap:wrap;gap:5px"></div></div>
      <div class="field"><label>النص</label><textarea class="tf" id="ndLabel">${escapeHtml(single.label)}</textarea></div>`:''}
    <div class="field"><button class="mini" style="width:100%;color:#c62828" onclick="delSel()">🗑 حذف</button></div>`;
  const sw=body.querySelector('#sw');
  COLORS.forEach(c=>{const b=document.createElement('span');b.className='sw'+(single&&single.color===c.id?' sel':'');b.style.background=c.f;b.style.boxShadow='0 0 0 1px '+c.s;b.onclick=()=>{push();sel.forEach(id=>node(id).color=c.id);render();autosave();};sw.appendChild(b);});
  if(single){
    const row=body.querySelector('#shrow');
    PALETTE.forEach(p=>{const b=document.createElement('button');b.className='mini'+(single.type===p.t?' on':'');b.style.flex='0 0 46%';b.innerHTML=p.n;b.onclick=()=>{push();single.type=p.t;render();autosave();};row.appendChild(b);});
    body.querySelector('#ndLabel').addEventListener('change',e=>{push();single.label=e.target.value.trim()||single.label;render();autosave();});
  }
}
function setTab(t){inspTab=t;buildInspector();}
function escapeAttr(s){return String(s==null?'':s).replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function deselect(){sel.clear();selEdge=null;selLane=null;render();}
function setDash(v){const ed=state.edges.find(e=>e.id===selEdge);push();ed.dashed=v;render();autosave();}
function addNode(type){
  push();const s=defaultSize(type),c=stage.getBoundingClientRect(),p=toModel(c.left+c.width/2,c.top+c.height/2);
  const n={id:nextId('N'),type,color:'purple',label:PALETTE.find(x=>x.t===type).n,x:snapv(p.x-s.w/2),y:snapv(p.y-s.h/2),w:s.w,h:s.h,laneId:null,attrs:defaultAttrs()};
  syncNodeLane(n);state.nodes.push(n);sel=new Set([n.id]);selEdge=null;selLane=null;render();autosave();toast('أُضيف عنصر — عدّل الحوكمة وRACI من لوحة الخصائص');
}
function delSel(){
  if(selLane){push();state.nodes.filter(node=>node.laneId===selLane).forEach(node=>{node.laneId=null;});state.lanes=state.lanes.filter(l=>l.id!==selLane);selLane=null;render();autosave();return;}
  if(selEdge){push();state.edges=state.edges.filter(e=>e.id!==selEdge);selEdge=null;render();autosave();return;}
  if(sel.size){push();state.nodes=state.nodes.filter(n=>!sel.has(n.id));state.edges=state.edges.filter(e=>!sel.has(e.from)&&!sel.has(e.to));sel.clear();render();autosave();}
}
function duplicate(){
  if(!sel.size)return;push();const map={},ns=[];
  sel.forEach(id=>{const n=node(id),nn=structuredClone(n);nn.id=nextId('N');nn.x+=24;nn.y+=24;syncNodeLane(nn);map[id]=nn.id;ns.push(nn);});
  state.nodes.push(...ns);[...state.edges].forEach(e=>{if(map[e.from]&&map[e.to])state.edges.push({...e,id:nextId('E'),from:map[e.from],to:map[e.to]});});sel=new Set(ns.map(n=>n.id));render();autosave();
}
function copy(){if(sel.size)clip=structuredClone(state.nodes.filter(n=>sel.has(n.id)));}
function paste(){if(!clip)return;push();const ns=clip.map(n=>{const item={...structuredClone(n),id:nextId('N'),x:n.x+30,y:n.y+30};syncNodeLane(item);return item;});state.nodes.push(...ns);sel=new Set(ns.map(n=>n.id));render();autosave();}
let panning=null,marquee=null;
svg.addEventListener('pointerdown',e=>{
  if(e.target.closest('.node')||e.target.closest('.edge-hit')||e.target.closest('.handle')||e.target.closest('.anchor')||e.target.closest('.strip'))return;
  if(e.shiftKey){const p=toModel(e.clientX,e.clientY);marquee={x0:p.x,y0:p.y,el:document.createElementNS(SVGNS,'rect')};marquee.el.setAttribute('class','marquee');gOver.appendChild(marquee.el);}else{panning={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};deselect();}
});
svg.addEventListener('pointermove',e=>{
  if(panning){view.x=panning.vx+(e.clientX-panning.x);view.y=panning.vy+(e.clientY-panning.y);applyView();}
  else if(marquee){const p=toModel(e.clientX,e.clientY),x=Math.min(p.x,marquee.x0),y=Math.min(p.y,marquee.y0),w=Math.abs(p.x-marquee.x0),h=Math.abs(p.y-marquee.y0);marquee.el.setAttribute('x',x);marquee.el.setAttribute('y',y);marquee.el.setAttribute('width',w);marquee.el.setAttribute('height',h);marquee.rect={x,y,w,h};}
});
svg.addEventListener('pointerup',()=>{if(marquee){if(marquee.rect){sel=new Set(state.nodes.filter(n=>n.x+n.w>marquee.rect.x&&n.x<marquee.rect.x+marquee.rect.w&&n.y+n.h>marquee.rect.y&&n.y<marquee.rect.y+marquee.rect.h).map(n=>n.id));selEdge=null;}marquee.el.remove();marquee=null;render();}panning=null;});
stage.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,before={x:(mx-view.x)/view.z,y:(my-view.y)/view.z};view.z=Math.min(2.6,Math.max(0.3,view.z*(e.deltaY<0?1.12:0.9)));view.x=mx-before.x*view.z;view.y=my-before.y*view.z;applyView();},{passive:false});
function fit(){
  if(!state.nodes.length){view={x:60,y:20,z:1};applyView();return;}
  const xs=state.nodes.map(n=>n.x),ys=state.nodes.map(n=>n.y),xe=state.nodes.map(n=>n.x+n.w),ye=state.nodes.map(n=>n.y+n.h),minx=Math.min(...xs),miny=Math.min(...ys),maxx=Math.max(...xe),maxy=Math.max(...ye),r=stage.getBoundingClientRect(),pad=50,z=Math.min((r.width-pad*2)/(maxx-minx),(r.height-pad*2)/(maxy-miny),1.4);view.z=Math.max(0.3,z);view.x=pad-minx*view.z;view.y=pad-miny*view.z;applyView();
}
