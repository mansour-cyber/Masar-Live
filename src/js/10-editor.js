// ---------- swimlanes ----------
function laneColor(id){ return LANE_COLORS.find(c=>c.id===id)||LANE_COLORS[0]; }
function renderLanes(){
  const g=document.getElementById('lanes'); g.innerHTML='';
  (state.lanes||[]).forEach(L=>{
    const c=laneColor(L.color);
    const count=state.nodes.filter(node=>node.laneId===L.id).length;
    const grp=document.createElementNS(SVGNS,'g'); grp.setAttribute('class','lane'); grp.dataset.id=L.id;
    grp.innerHTML=
      `<rect class="lane-body" x="${L.x}" y="${L.y}" width="${L.w}" height="${L.h}" rx="10" fill="${c.f}" fill-opacity="0.4" stroke="${c.s}" stroke-width="1.5" style="pointer-events:none"/>`
     +`<rect class="strip" x="${L.x}" y="${L.y}" width="${L.w}" height="28" rx="10" fill="${c.s}" fill-opacity="0.92"/>`
     +`<text class="ttl" x="${L.x+14}" y="${L.y+19}" fill="#fff" direction="rtl">${escapeHtml(L.title)} · ${count}</text>`;
    bindLane(grp,L);
    g.appendChild(grp);
  });
}
function updateLaneGroup(grp,L){
  const body=grp.querySelector('.lane-body'),strip=grp.querySelector('.strip'),ttl=grp.querySelector('.ttl');
  body.setAttribute('x',L.x);body.setAttribute('y',L.y);body.setAttribute('width',L.w);body.setAttribute('height',L.h);
  strip.setAttribute('x',L.x);strip.setAttribute('y',L.y);strip.setAttribute('width',L.w);
  ttl.setAttribute('x',L.x+14);ttl.setAttribute('y',L.y+19);
}
function bindLane(grp,L){
  const strip=grp.querySelector('.strip');
  let start,orig,moved,memberOrigins;
  const down=e=>{
    e.stopPropagation();selLane=L.id;sel.clear();selEdge=null;
    push();start=toModel(e.clientX,e.clientY);orig={x:L.x,y:L.y};moved=false;
    memberOrigins=new Map(state.nodes.filter(node=>node.laneId===L.id).map(node=>[node.id,{x:node.x,y:node.y}]));
    strip.setPointerCapture?.(e.pointerId);drawOverlay();inspector.classList.add('show');buildInspector();
  };
  const move=e=>{
    if(!start)return;
    const p=toModel(e.clientX,e.clientY);
    const nextX=snapv(orig.x+p.x-start.x),nextY=snapv(orig.y+p.y-start.y);
    const dx=nextX-orig.x,dy=nextY-orig.y;
    if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
    L.x=nextX;L.y=nextY;
    memberOrigins.forEach((position,id)=>{const item=node(id);if(item){item.x=position.x+dx;item.y=position.y+dy;document.getElementById('nd-'+id)?.setAttribute('transform',`translate(${item.x},${item.y})`);}});
    updateLaneGroup(grp,L);drawEdges();drawOverlay();
  };
  const up=()=>{
    if(!start)return;
    if(!moved)hist.pop();
    start=null;memberOrigins=null;render();autosave();
  };
  strip.addEventListener('pointerdown',down);
  strip.addEventListener('pointermove',move);
  strip.addEventListener('pointerup',up);
  strip.addEventListener('pointercancel',up);
  strip.addEventListener('dblclick',e=>{ e.stopPropagation(); const t=prompt('اسم القسم:',L.title); if(t!==null){push();L.title=t.trim()||L.title;render();autosave();} });
}
function reSelectLane(){ return document.querySelector('#lanes .lane[data-id="'+CSS.escape(selLane)+'"]'); }
function addLane(){
  push(); const c=stage.getBoundingClientRect(); const p=toModel(c.left+c.width/2,c.top+c.height*0.4);
  const L={id:nextId('L'),x:snapv(p.x-350),y:snapv(p.y-90),w:700,h:200,title:'مسار قسم',color:LANE_COLORS[state.lanes.length%LANE_COLORS.length].id};
  state.lanes.push(L); selLane=L.id; sel.clear(); selEdge=null; syncAllNodeLanes(); render(); autosave();
  toast('أُضيف قسم — العناصر داخله ترتبط به تلقائيًا');
}
function anchorsMarkup(n){
  const pts=anchorLocals(n);
  return Object.entries(pts).map(([k,p])=>`<circle class="anchor" data-anchor="${k}" cx=${p.x} cy=${p.y} r=6></circle>`).join('');
}
function anchorLocals(n){ return {n:{x:n.w/2,y:0},s:{x:n.w/2,y:n.h},e:{x:n.w,y:n.h/2},w:{x:0,y:n.h/2}}; }
function anchorPoint(n,a){ const l=anchorLocals(n)[a]; return {x:n.x+l.x,y:n.y+l.y}; }
function routeEdge(a,b){
  const ca={x:a.x+a.w/2,y:a.y+a.h/2}, cb={x:b.x+b.w/2,y:b.y+b.h/2};
  const dx=cb.x-ca.x, dy=cb.y-ca.y, AL=22;
  if(Math.abs(dx)<=AL){
    const x=(ca.x+cb.x)/2;
    const p1={x, y: dy>=0 ? a.y+a.h : a.y};
    const p2={x, y: dy>=0 ? b.y : b.y+b.h};
    return {p1,p2,d:`M${p1.x},${p1.y} L${p2.x},${p2.y}`, mid:{x,y:(p1.y+p2.y)/2}};
  }
  if(Math.abs(dy)<=AL){
    const y=(ca.y+cb.y)/2;
    const p1={x: dx>=0 ? a.x+a.w : a.x, y};
    const p2={x: dx>=0 ? b.x : b.x+b.w, y};
    return {p1,p2,d:`M${p1.x},${p1.y} L${p2.x},${p2.y}`, mid:{x:(p1.x+p2.x)/2,y}};
  }
  if(Math.abs(dy)>=Math.abs(dx)){
    const p1={x:ca.x, y: dy>0 ? a.y+a.h : a.y};
    const p2={x:cb.x, y: dy>0 ? b.y : b.y+b.h};
    const my=(p1.y+p2.y)/2;
    return {p1,p2,d:`M${p1.x},${p1.y} L${p1.x},${my} L${p2.x},${my} L${p2.x},${p2.y}`, mid:{x:(p1.x+p2.x)/2,y:my}};
  }
  const p1={x: dx>0 ? a.x+a.w : a.x, y:ca.y};
  const p2={x: dx>0 ? b.x : b.x+b.w, y:cb.y};
  const mx=(p1.x+p2.x)/2;
  return {p1,p2,d:`M${p1.x},${p1.y} L${mx},${p1.y} L${mx},${p2.y} L${p2.x},${p2.y}`, mid:{x:mx,y:(p1.y+p2.y)/2}};
}
function drawEdges(){
  gEdges.innerHTML='';
  state.edges.forEach(ed=>{
    const a=node(ed.from), b=node(ed.to); if(!a||!b)return;
    const rt=routeEdge(a,b),d=rt.d,col=colorOf(a.color).s;
    const hit=document.createElementNS(SVGNS,'path'); hit.setAttribute('d',d); hit.setAttribute('class','edge-hit');
    const path=document.createElementNS(SVGNS,'path'); path.setAttribute('d',d);
    path.setAttribute('class','edge'+(selEdge===ed.id?' sel':''));
    path.setAttribute('stroke',selEdge===ed.id?'#00a984':col);
    if(ed.dashed)path.setAttribute('stroke-dasharray','7 5');
    const g=document.createElementNS(SVGNS,'g');
    hit.addEventListener('pointerdown',e=>{e.stopPropagation();pickEdge(ed.id);});
    hit.addEventListener('dblclick',e=>{e.stopPropagation();editEdge(ed);});
    g.appendChild(hit);g.appendChild(path);
    if(ed.label){
      const mx=rt.mid.x,my=rt.mid.y,bw=ed.label.length*8+16;
      const lg=document.createElementNS(SVGNS,'g');lg.setAttribute('class','elabel');
      const r=document.createElementNS(SVGNS,'rect');
      r.setAttribute('x',mx-bw/2);r.setAttribute('y',my-11);r.setAttribute('width',bw);r.setAttribute('height',22);r.setAttribute('rx',11);r.setAttribute('class','box');r.setAttribute('stroke',col);
      const t=document.createElementNS(SVGNS,'text');t.setAttribute('x',mx);t.setAttribute('y',my+4);t.setAttribute('text-anchor','middle');t.setAttribute('fill',col);t.setAttribute('direction','rtl');t.textContent=ed.label;
      lg.appendChild(r);lg.appendChild(t);
      lg.addEventListener('dblclick',e=>{e.stopPropagation();editEdge(ed);});lg.addEventListener('pointerdown',e=>{e.stopPropagation();pickEdge(ed.id);});g.appendChild(lg);
    }
    gEdges.appendChild(g);
  });
}
function drawOverlay(){
  gOver.innerHTML='';
  if(selLane){
    const L=(state.lanes||[]).find(x=>x.id===selLane); if(!L)return;
    const box=document.createElementNS(SVGNS,'rect');box.setAttribute('x',L.x-2);box.setAttribute('y',L.y-2);box.setAttribute('width',L.w+4);box.setAttribute('height',L.h+4);box.setAttribute('class','selbox');box.setAttribute('rx',10);gOver.appendChild(box);
    const hnd=document.createElementNS(SVGNS,'rect');hnd.setAttribute('x',L.x+L.w-6);hnd.setAttribute('y',L.y+L.h-6);hnd.setAttribute('width',12);hnd.setAttribute('height',12);hnd.setAttribute('rx',2);hnd.setAttribute('class','handle');hnd.addEventListener('pointerdown',e=>startResizeLane(e,L));gOver.appendChild(hnd);return;
  }
  if(sel.size!==1)return;
  const n=node([...sel][0]);if(!n)return;
  const pad=3,box=document.createElementNS(SVGNS,'rect');box.setAttribute('x',n.x-pad);box.setAttribute('y',n.y-pad);box.setAttribute('width',n.w+pad*2);box.setAttribute('height',n.h+pad*2);box.setAttribute('class','selbox');box.setAttribute('rx',8);gOver.appendChild(box);
  [['nw',n.x,n.y],['ne',n.x+n.w,n.y],['sw',n.x,n.y+n.h],['se',n.x+n.w,n.y+n.h]].forEach(([c,hx,hy])=>{const h=document.createElementNS(SVGNS,'rect');h.setAttribute('x',hx-5);h.setAttribute('y',hy-5);h.setAttribute('width',10);h.setAttribute('height',10);h.setAttribute('rx',2);h.setAttribute('class','handle');h.dataset.corner=c;h.addEventListener('pointerdown',e=>startResize(e,n,c));gOver.appendChild(h);});
}
function startResizeLane(e,L){
  e.stopPropagation();push();const s=toModel(e.clientX,e.clientY),o={w:L.w,h:L.h};
  const mv=ev=>{const p=toModel(ev.clientX,ev.clientY);L.w=Math.max(160,Math.round(o.w+(p.x-s.x)));L.h=Math.max(90,Math.round(o.h+(p.y-s.y)));render();};
  const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);syncAllNodeLanes();render();autosave();};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
}
function escapeHtml(s){return String(s??'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
function push(){hist.push(structuredClone(state));if(hist.length>60)hist.shift();future=[];}
function undo(){if(!hist.length)return;future.push(structuredClone(state));state=hist.pop();sel.clear();selEdge=null;render();autosave();}
function redo(){if(!future.length)return;hist.push(structuredClone(state));state=future.pop();sel.clear();selEdge=null;render();autosave();}
function bindNode(g){
  let start,orig,mode,moved=false;
  g.addEventListener('pointerdown',e=>{
    const anchorEl=e.target.closest('.anchor');if(anchorEl){startConnect(e,g.dataset.id,anchorEl.dataset.anchor);return;}
    e.stopPropagation();const id=g.dataset.id;
    if(e.shiftKey){sel.has(id)?sel.delete(id):sel.add(id);selEdge=null;render();return;}
    if(!sel.has(id)){sel=new Set([id]);selEdge=null;render();}
    push();mode='move';start=toModel(e.clientX,e.clientY);orig=new Map();sel.forEach(sid=>{const item=node(sid);orig.set(sid,{x:item.x,y:item.y});});g.setPointerCapture(e.pointerId);moved=false;
  });
  g.addEventListener('pointermove',e=>{
    if(mode!=='move')return;const p=toModel(e.clientX,e.clientY),dx=p.x-start.x,dy=p.y-start.y;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
    sel.forEach(sid=>{const item=node(sid),o=orig.get(sid);item.x=snapv(o.x+dx);item.y=snapv(o.y+dy);document.getElementById('nd-'+sid)?.setAttribute('transform',`translate(${item.x},${item.y})`);});drawEdges();drawOverlay();
  });
  g.addEventListener('pointerup',()=>{if(mode==='move'){if(!moved)hist.pop();else sel.forEach(id=>syncNodeLane(node(id)));mode=null;render();autosave();}});
  g.addEventListener('dblclick',e=>{e.stopPropagation();editNode(node(g.dataset.id));});
}
function startResize(e,n,corner){
  e.stopPropagation();push();const s=toModel(e.clientX,e.clientY),o={x:n.x,y:n.y,w:n.w,h:n.h};
  const mv=ev=>{const p=toModel(ev.clientX,ev.clientY),dx=p.x-s.x,dy=p.y-s.y;let x=o.x,y=o.y,w=o.w,h=o.h;if(corner.includes('e'))w=Math.max(60,o.w+dx);if(corner.includes('s'))h=Math.max(40,o.h+dy);if(corner.includes('w')){w=Math.max(60,o.w-dx);x=o.x+(o.w-w);}if(corner.includes('n')){h=Math.max(40,o.h-dy);y=o.y+(o.h-h);}n.x=snapv(x);n.y=snapv(y);n.w=Math.round(w);n.h=Math.round(h);render();};
  const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);syncNodeLane(n);render();autosave();};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
}
let connecting=null,tempPath=null;
function startConnect(e,fromId,fromAnchor){
  e.stopPropagation();connecting={from:fromId,fromAnchor};tempPath=document.createElementNS(SVGNS,'path');tempPath.setAttribute('class','temp-edge');gOver.appendChild(tempPath);
  const mv=ev=>{const p=toModel(ev.clientX,ev.clientY),sp=anchorPoint(node(fromId),fromAnchor);tempPath.setAttribute('d',`M${sp.x},${sp.y} L${p.x},${p.y}`);};
  const up=ev=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);const p=toModel(ev.clientX,ev.clientY),hit=nodeAt(p.x,p.y,fromId);if(hit){push();state.edges.push({id:nextId('E'),from:fromId,to:hit.id,label:'',dashed:false});toast('تم إنشاء رابط');autosave();}connecting=null;if(tempPath){tempPath.remove();tempPath=null;}render();};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);
}
function nodeAt(x,y,exclude){for(let i=state.nodes.length-1;i>=0;i--){const n=state.nodes[i];if(n.id===exclude)continue;if(x>=n.x&&x<=n.x+n.w&&y>=n.y&&y<=n.y+n.h)return n;}return null;}
function pickEdge(id){selEdge=id;sel.clear();render();}
function editEdge(ed){const v=prompt('نص المسار (فارغ = بدون):',ed.label||'');if(v!==null){push();ed.label=v.trim();render();autosave();}}
function editNode(n){
  const fo=document.querySelector('#nd-'+CSS.escape(n.id)+' foreignObject'),ta=document.createElement('textarea');ta.value=n.label;ta.style.cssText='width:100%;height:100%;border:none;text-align:center;font:600 14px Tajawal;background:transparent;resize:none;outline:none;direction:rtl;padding:5px';
  const div=fo.querySelector('.lbl');div.innerHTML='';div.appendChild(ta);ta.focus();ta.select();
  const done=()=>{push();n.label=ta.value.trim()||n.label;render();autosave();};ta.addEventListener('blur',done);ta.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();ta.blur();}if(ev.key==='Escape'){render();}});
}
