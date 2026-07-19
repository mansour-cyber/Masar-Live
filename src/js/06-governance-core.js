(function attachMasarGovernanceCore(root){
  'use strict';

  const projectCore=root.MasarProjectCore;
  if(!projectCore)throw new Error('Masar project core is required');

  function parseRoles(value){
    return projectCore.roleList(value);
  }
  function laneContainsNode(node,lane){
    if(!node||!lane)return false;
    const cx=Number(node.x)+Number(node.w)/2;
    const cy=Number(node.y)+Number(node.h)/2;
    return cx>=lane.x&&cx<=lane.x+lane.w&&cy>=lane.y&&cy<=lane.y+lane.h;
  }
  function resolveLaneId(node,lanes){
    const matches=(Array.isArray(lanes)?lanes:[]).filter(lane=>laneContainsNode(node,lane));
    if(!matches.length)return null;
    matches.sort((a,b)=>(a.w*a.h)-(b.w*b.h));
    return matches[0].id;
  }
  function syncNodeLane(node,lanes){
    const laneId=resolveLaneId(node,lanes);
    node.laneId=laneId;
    return laneId;
  }
  function translateLane(state,laneId,dx,dy){
    const lane=(state.lanes||[]).find(item=>item.id===laneId);
    if(!lane)return false;
    lane.x+=dx; lane.y+=dy;
    (state.nodes||[]).filter(node=>node.laneId===laneId).forEach(node=>{node.x+=dx;node.y+=dy;});
    return true;
  }
  function issue(severity,code,message,target={}){
    return {severity,code,message,...target};
  }
  function buildGraph(state){
    const outgoing=new Map();
    const incoming=new Map();
    state.nodes.forEach(node=>{outgoing.set(node.id,[]);incoming.set(node.id,[]);});
    state.edges.forEach(edge=>{
      if(outgoing.has(edge.from))outgoing.get(edge.from).push(edge);
      if(incoming.has(edge.to))incoming.get(edge.to).push(edge);
    });
    return {outgoing,incoming};
  }
  function traverse(seedIds,adjacency,direction){
    const visited=new Set(seedIds);
    const queue=[...seedIds];
    while(queue.length){
      const id=queue.shift();
      const edges=adjacency.get(id)||[];
      edges.forEach(edge=>{
        const next=direction==='forward'?edge.to:edge.from;
        if(!visited.has(next)){visited.add(next);queue.push(next);}
      });
    }
    return visited;
  }
  function analyzeProcess(input){
    const state=projectCore.normalizeState(input);
    const issues=[];
    const laneIds=new Set(state.lanes.map(lane=>lane.id));
    const {outgoing,incoming}=buildGraph(state);
    const flowNodes=state.nodes.filter(node=>node.type!=='note');
    const governable=flowNodes.filter(node=>!['event_start','event_end','connector','terminator'].includes(node.type));
    const starts=flowNodes.filter(node=>node.type==='event_start'||(node.type==='terminator'&&(incoming.get(node.id)||[]).length===0));
    const ends=flowNodes.filter(node=>node.type==='event_end'||(node.type==='terminator'&&(outgoing.get(node.id)||[]).length===0));

    if(!starts.length)issues.push(issue('error','missing-start','لا توجد نقطة بداية واضحة في المخطط.'));
    if(!ends.length)issues.push(issue('error','missing-end','لا توجد نقطة نهاية واضحة في المخطط.'));

    flowNodes.forEach(node=>{
      const ins=incoming.get(node.id)||[];
      const outs=outgoing.get(node.id)||[];
      if(!ins.length&&!outs.length)issues.push(issue('error','orphan-node',`العنصر «${node.label||node.id}» غير مرتبط بأي مسار.`,{nodeId:node.id}));
      if(['decision','gateway'].includes(node.type)){
        if(outs.length<2)issues.push(issue('error','gateway-branches',`البوابة «${node.label||node.id}» تحتاج مسارين خارجين على الأقل.`,{nodeId:node.id}));
        outs.filter(edge=>!String(edge.label||'').trim()).forEach(edge=>issues.push(issue('warning','gateway-condition','يوجد مسار خارج من بوابة بدون شرط مكتوب.',{nodeId:node.id,edgeId:edge.id})));
      }
      if(state.lanes.length){
        if(!node.laneId)issues.push(issue('warning','missing-lane',`العنصر «${node.label||node.id}» غير مرتبط بأي قسم.`,{nodeId:node.id}));
        else if(!laneIds.has(node.laneId))issues.push(issue('error','broken-lane',`العنصر «${node.label||node.id}» مرتبط بقسم غير موجود.`,{nodeId:node.id,laneId:node.laneId}));
        else {
          const lane=state.lanes.find(item=>item.id===node.laneId);
          if(!laneContainsNode(node,lane))issues.push(issue('warning','outside-lane',`العنصر «${node.label||node.id}» مرتبط بقسم لكنه موجود بصريًا خارجه.`,{nodeId:node.id,laneId:lane.id}));
        }
      }
    });

    governable.forEach(node=>{
      const attrs=node.attrs||projectCore.normalizeAttrs({});
      const raci=attrs.raci||projectCore.normalizeRaci({},attrs.role);
      if(!raci.responsible.length)issues.push(issue('warning','missing-responsible',`الخطوة «${node.label||node.id}» لا تحتوي Responsible.`,{nodeId:node.id}));
      if(!raci.accountable.length)issues.push(issue('warning','missing-accountable',`الخطوة «${node.label||node.id}» لا تحتوي Accountable.`,{nodeId:node.id}));
      if(raci.accountable.length>1)issues.push(issue('error','many-accountable',`الخطوة «${node.label||node.id}» تحتوي أكثر من Accountable.`,{nodeId:node.id}));
      if(!attrs.risk||attrs.risk==='unassessed')issues.push(issue('warning','unassessed-risk',`مخاطر الخطوة «${node.label||node.id}» غير مقيّمة.`,{nodeId:node.id}));
    });

    if(starts.length){
      const reachable=traverse(starts.map(node=>node.id),outgoing,'forward');
      flowNodes.filter(node=>!reachable.has(node.id)).forEach(node=>issues.push(issue('error','unreachable-node',`العنصر «${node.label||node.id}» غير قابل للوصول من البداية.`,{nodeId:node.id})));
    }
    if(ends.length){
      const reachesEnd=traverse(ends.map(node=>node.id),incoming,'reverse');
      flowNodes.filter(node=>!reachesEnd.has(node.id)).forEach(node=>issues.push(issue('warning','dead-end',`العنصر «${node.label||node.id}» لا يقود إلى نهاية معروفة.`,{nodeId:node.id})));
    }

    const summary={
      errors:issues.filter(item=>item.severity==='error').length,
      warnings:issues.filter(item=>item.severity==='warning').length,
      total:issues.length,
      valid:!issues.some(item=>item.severity==='error'),
    };
    return {summary,issues,starts:starts.map(node=>node.id),ends:ends.map(node=>node.id)};
  }

  root.MasarGovernanceCore={parseRoles,laneContainsNode,resolveLaneId,syncNodeLane,translateLane,analyzeProcess};
})(globalThis);
