/* Original short-session garden loop; no copied farm catalog or social-game rules. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_SunGardenModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const PLOTS=9,DAY_MS=45000,TARGET=108;
 const CROPS={
  bean:{id:'bean',name:'Đậu',icon:'🫛',growMs:3000,yield:1},
  berry:{id:'berry',name:'Dâu',icon:'🍓',growMs:5000,yield:2},
  bloom:{id:'bloom',name:'Hoa',icon:'🌻',growMs:7000,yield:3}
 };
 const clone=value=>JSON.parse(JSON.stringify(value));
 function create(){
  const state={version:1,elapsedMs:0,baskets:0,status:'playing',plants:Array(PLOTS).fill(null)};
  const events=[];const emit=(kind,extra={})=>events.push({kind,...extra});
  function plant(plot,cropId){if(state.status!=='playing'||!Number.isInteger(plot)||plot<0||plot>=PLOTS||state.plants[plot]||!Object.hasOwn(CROPS,cropId))return false;state.plants[plot]={cropId,grownMs:0};emit('planted',{plot,cropId});return true;}
  function advance(ms){
   if(state.status!=='playing'||!Number.isFinite(ms)||ms<0||ms>30000)return[];
   const dt=Math.min(ms,DAY_MS-state.elapsedMs);state.elapsedMs+=dt;
   for(let i=0;i<PLOTS;i++){const crop=state.plants[i];if(!crop)continue;crop.grownMs=Math.min(CROPS[crop.cropId].growMs,crop.grownMs+dt);if(crop.grownMs>=CROPS[crop.cropId].growMs){const info=CROPS[crop.cropId];state.plants[i]=null;state.baskets+=info.yield;emit('harvested',{plot:i,cropId:info.id,amount:info.yield,baskets:state.baskets});}}
   if(state.baskets>=TARGET){state.status='won';emit('won',{baskets:state.baskets});}
   else if(state.elapsedMs>=DAY_MS){state.status='lost';emit('day-ended',{baskets:state.baskets});}
   return events.splice(0);
  }
  function view(){return{...clone(state),remainingMs:Math.max(0,DAY_MS-state.elapsedMs),plots:state.plants.map((p,i)=>p?{index:i,crop:clone(CROPS[p.cropId]),grownMs:p.grownMs,progress:Math.min(100,Math.floor(p.grownMs/CROPS[p.cropId].growMs*100))}:{index:i,crop:null,grownMs:0,progress:0})};}
  return{plant,advance,view,serialize:()=>clone(state)};
 }
 return{PLOTS,DAY_MS,TARGET,CROPS:clone(CROPS),create};
});
