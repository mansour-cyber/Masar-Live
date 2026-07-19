(function attachMasarProjectCore(root){
  'use strict';

  const SCHEMA_VERSION=2;
  const APP_VERSION='0.3.0';
  const DEFAULT_VIEW={x:60,y:20,z:1};
  const DEFAULT_BOARD={bgColor:'#eef0f5',pattern:'grid'};

  function clone(value){
    if(typeof structuredClone==='function')return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
  function finite(value,fallback){
    const number=Number(value);
    return Number.isFinite(number)?number:fallback;
  }
  function text(value,fallback=''){
    return value==null?fallback:String(value);
  }
  function roleList(value){
    if(Array.isArray(value))return [...new Set(value.map(item=>text(item).trim()).filter(Boolean))];
    if(value==null)return [];
    return [...new Set(String(value).split(/[،,;\n]+/).map(item=>item.trim()).filter(Boolean))];
  }
  function normalizeRaci(raci,legacyRole=''){
    const source=raci&&typeof raci==='object'?raci:{};
    const responsible=roleList(source.responsible);
    if(!responsible.length&&legacyRole)responsible.push(...roleList(legacyRole));
    return {
      responsible,
      accountable:roleList(source.accountable).slice(0,1),
      consulted:roleList(source.consulted),
      informed:roleList(source.informed),
    };
  }
  function normalizeAttrs(attrs){
    const source=attrs&&typeof attrs==='object'?attrs:{};
    return {
      owner:text(source.owner),
      role:text(source.role),
      system:text(source.system),
      dur:text(source.dur),
      cost:text(source.cost),
      risk:text(source.risk,'unassessed'),
      bpmn:text(source.bpmn),
      desc:text(source.desc),
      raci:normalizeRaci(source.raci,source.role),
    };
  }
  function normalizeState(input){
    const source=input&&typeof input==='object'?input:{};
    const lanes=Array.isArray(source.lanes)?source.lanes.map((item,index)=>{
      const lane=item&&typeof item==='object'?clone(item):{};
      return {...lane,id:text(lane.id,`legacy-lane-${index}`),x:finite(lane.x,0),y:finite(lane.y,0),
        w:Math.max(1,finite(lane.w,700)),h:Math.max(1,finite(lane.h,200)),title:text(lane.title,'مسار قسم'),color:text(lane.color,'purple')};
    }):[];
    const laneIds=new Set(lanes.map(lane=>lane.id));
    const nodes=Array.isArray(source.nodes)?source.nodes.map((item,index)=>{
      const n=item&&typeof item==='object'?clone(item):{};
      const laneId=n.laneId&&laneIds.has(text(n.laneId))?text(n.laneId):null;
      return {...n,id:text(n.id,`legacy-node-${index}`),type:text(n.type,'process'),color:text(n.color,'purple'),
        label:text(n.label),x:finite(n.x,0),y:finite(n.y,0),w:Math.max(1,finite(n.w,180)),h:Math.max(1,finite(n.h,66)),
        laneId,attrs:normalizeAttrs(n.attrs)};
    }):[];
    const edges=Array.isArray(source.edges)?source.edges.map((item,index)=>{
      const e=item&&typeof item==='object'?clone(item):{};
      return {...e,id:text(e.id,`legacy-edge-${index}`),from:text(e.from),to:text(e.to),label:text(e.label),dashed:Boolean(e.dashed)};
    }):[];
    return {nodes,edges,lanes};
  }
  function normalizeView(input){
    const source=input&&typeof input==='object'?input:{};
    return {x:finite(source.x,DEFAULT_VIEW.x),y:finite(source.y,DEFAULT_VIEW.y),z:Math.min(2.6,Math.max(.3,finite(source.z,DEFAULT_VIEW.z)))};
  }
  function normalizeBoard(input){
    const source=input&&typeof input==='object'?input:{};
    return {bgColor:text(source.bgColor,DEFAULT_BOARD.bgColor),pattern:text(source.pattern,DEFAULT_BOARD.pattern)};
  }
  function collectIds(state){
    return [...state.nodes,...state.edges,...state.lanes].map(item=>text(item.id));
  }
  function validateState(state){
    const ids=collectIds(state);
    const seen=new Set();
    const duplicates=[];
    ids.forEach(id=>{if(seen.has(id))duplicates.push(id);else seen.add(id);});
    if(duplicates.length)throw new Error(`معرّفات مكررة: ${[...new Set(duplicates)].join(', ')}`);
    const nodeIds=new Set(state.nodes.map(n=>n.id));
    const laneIds=new Set(state.lanes.map(lane=>lane.id));
    const broken=state.edges.filter(edge=>!nodeIds.has(edge.from)||!nodeIds.has(edge.to));
    if(broken.length)throw new Error(`روابط تشير إلى عناصر غير موجودة: ${broken.map(edge=>edge.id).join(', ')}`);
    const brokenLanes=state.nodes.filter(node=>node.laneId&&!laneIds.has(node.laneId));
    if(brokenLanes.length)throw new Error(`عناصر تشير إلى أقسام غير موجودة: ${brokenLanes.map(node=>node.id).join(', ')}`);
    const manyAccountable=state.nodes.filter(node=>(node.attrs?.raci?.accountable||[]).length>1);
    if(manyAccountable.length)throw new Error(`يوجد أكثر من Accountable في العناصر: ${manyAccountable.map(node=>node.id).join(', ')}`);
    return true;
  }
  function migrateProject(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('بنية ملف المشروع غير صالحة');
    const envelope=raw.state?raw:{state:raw};
    const incomingSchema=Number(envelope.schemaVersion||0);
    if(incomingSchema>SCHEMA_VERSION)throw new Error('ملف المشروع صادر من نسخة أحدث من مسار');
    const project={
      schemaVersion:SCHEMA_VERSION,
      appVersion:APP_VERSION,
      savedAt:text(envelope.savedAt,new Date().toISOString()),
      currentSession:envelope.currentSession?text(envelope.currentSession):null,
      state:normalizeState(envelope.state),
      view:normalizeView(envelope.view),
      board:normalizeBoard(envelope.board),
    };
    validateState(project.state);
    return project;
  }
  function createProject({state,view,board,currentSession=null,savedAt=new Date().toISOString()}){
    const project={schemaVersion:SCHEMA_VERSION,appVersion:APP_VERSION,savedAt,currentSession,state:normalizeState(state),view:normalizeView(view),board:normalizeBoard(board)};
    validateState(project.state);
    return project;
  }
  function nextUid(state){
    const normalized=normalizeState(state);
    const ids=collectIds(normalized);
    let max=0;
    ids.forEach(id=>{
      const match=String(id).match(/(\d+)$/);
      if(match)max=Math.max(max,Number(match[1]));
    });
    return Math.max(max+1,ids.length+1,1);
  }
  function nextId(prefix,state,start){
    const used=new Set(collectIds(normalizeState(state)));
    let value=Math.max(1,Number(start)||nextUid(state));
    let id=`${prefix}${value}`;
    while(used.has(id)){value+=1;id=`${prefix}${value}`;}
    return {id,next:value+1};
  }

  root.MasarProjectCore={SCHEMA_VERSION,APP_VERSION,roleList,normalizeRaci,normalizeAttrs,normalizeState,normalizeView,normalizeBoard,validateState,migrateProject,createProject,nextUid,nextId};
})(globalThis);
