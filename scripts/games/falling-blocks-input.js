/* Time-based held input, independent of browser/OS keyboard repetition. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_FallingBlocksInput=api;})(typeof window==='object'?window:null,function(){
 'use strict';const DAS=160,ARR=45;
 function create(){
  const owners=new Map();let clock=0,next=DAS,last=null,serial=0;
  const horizontal=()=>[...owners.values()].filter(x=>x.action==='left'||x.action==='right').sort((a,b)=>b.serial-a.serial)[0]?.action||null;
  function sync(){const action=horizontal();if(action!==last){last=action;clock=0;next=DAS;return action;}return null;}
  return{
   press(owner,action){if(!['left','right','down'].includes(action)||owners.has(owner))return null;owners.set(owner,{action,serial:++serial});sync();return action;},
   release(owner){owners.delete(owner);return sync();},
   tick(ms){if(!Number.isFinite(ms)||ms<0||ms>1000)return[];const action=horizontal();if(!action)return[];clock+=ms;const result=[];while(clock>=next){result.push(action);next+=ARR;}return result;},
   soft:()=>[...owners.values()].some(x=>x.action==='down'),
   reset(){owners.clear();last=null;clock=0;next=DAS;},
   held:()=>[...owners.keys()]
  };
 }
 return{DAS,ARR,create};
});
