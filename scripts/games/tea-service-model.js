/* Original Tiệm Lá Trà service-loop rules; no copied Diner Dash code/assets. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NP_TeaServiceModel=api;})(typeof window==='object'?window:null,function(){
 'use strict';
 const STEP=16,TABLE_CAPACITIES=[2,2,3],RECIPES=[{name:'Trà sen',cook:80},{name:'Bánh lá',cook:112},{name:'Nước quả',cook:64}];
 const SHIFTS=[
  {name:'Bàn sớm',target:320,duration:1750,schedule:[[0,1,540,0],[150,2,620,1],[345,1,500,2],[530,2,600,0]]},
  {name:'Giữa trưa',target:480,duration:2050,schedule:[[0,2,600,1],[145,1,520,0],[300,3,690,2],[500,2,600,0],[700,1,500,1]]},
  {name:'Chiều mát',target:640,duration:2300,schedule:[[0,2,620,2],[120,3,680,0],[285,1,520,1],[430,2,650,2],[620,3,720,1],[820,2,620,0]]}
 ];
 const clone=x=>JSON.parse(JSON.stringify(x)),safe=n=>Number.isSafeInteger(n)&&n>=0,finite=n=>Number.isFinite(n);
 const tableTemplate=()=>TABLE_CAPACITIES.map((capacity,index)=>({index,capacity,state:'empty',customerId:null,ticketId:null,eatLeft:0}));
 function create({saved=null,shift=0,score=0}={}){
  if(saved&&!validSave(saved))return null;
  if(!saved&&(!Number.isInteger(shift)||shift<0||shift>=SHIFTS.length||!safe(score)||score>1e9))throw new RangeError('Invalid shift');
  let s=saved?clone(saved):{version:1,shift,ticks:0,remainder:0,score,bankScore:score,status:'playing',scheduleIndex:0,nextId:1,missed:0,customers:[],queue:[],tables:tableTemplate(),tickets:[],cookingId:null,cookingLeft:0,heldTicketId:null,selectedCustomerId:null};
  let events=[];const emit=(kind,extra={})=>events.push({kind,...extra});
  const config=()=>SHIFTS[s.shift],table=i=>s.tables[i],customer=id=>s.customers.find(x=>x.id===id),ticket=id=>s.tickets.find(x=>x.id===id);
  function dropTicket(id){const order=ticket(id);if(!order)return;s.tickets=s.tickets.filter(x=>x.id!==id);if(s.cookingId===id){s.cookingId=null;s.cookingLeft=0;}if(s.heldTicketId===id)s.heldTicketId=null;startCooking();}
  function resetTable(t){if(t.ticketId)dropTicket(t.ticketId);if(t.customerId){s.customers=s.customers.filter(x=>x.id!==t.customerId);if(s.selectedCustomerId===t.customerId)s.selectedCustomerId=null;}t.state='empty';t.customerId=null;t.ticketId=null;t.eatLeft=0;}
  function startCooking(){if(s.cookingId!==null)return;const next=s.tickets.find(x=>x.status==='queued');if(!next)return;next.status='cooking';s.cookingId=next.id;s.cookingLeft=RECIPES[next.recipe].cook;emit('cook-start',{ticketId:next.id});}
  function leave(c,where){if(!c)return;const t=c.tableIndex===null?null:table(c.tableIndex);if(t&&t.customerId===c.id)resetTable(t);else{s.customers=s.customers.filter(x=>x.id!==c.id);s.queue=s.queue.filter(id=>id!==c.id);}if(s.selectedCustomerId===c.id)s.selectedCustomerId=null;s.missed++;emit('leave',{customerId:c.id,where,missed:s.missed});if(s.missed>=3&&s.status==='playing'){s.status='lost';emit('lost',{reason:'missed'});}}
  function seat(customerId,tableIndex){const c=customer(customerId),t=table(tableIndex);if(!c||c.status!=='queue'||!t||t.state!=='empty')return false;if(c.size>t.capacity){emit('blocked',{reason:'capacity',customerId,tableIndex});return false;}s.queue=s.queue.filter(id=>id!==c.id);c.status='seated';c.tableIndex=t.index;t.state='order';t.customerId=c.id;s.selectedCustomerId=null;emit('seat',{customerId:c.id,tableIndex:t.index});return true;}
  function finishMeal(t,c){const tip=Math.floor((c.patience/c.maxPatience)*40*c.size),amount=90*c.size+tip;s.score+=amount;const tableIndex=t.index,customerId=c.id;s.customers=s.customers.filter(x=>x.id!==customerId);t.state='empty';t.customerId=null;t.ticketId=null;t.eatLeft=0;emit('payment',{tableIndex,customerId,amount,tip,score:s.score});}
  function tableAction(tableIndex){if(s.status!=='playing')return false;const t=table(tableIndex);if(!t)return false;
   if(t.state==='empty'){if(!s.selectedCustomerId){emit('blocked',{reason:'choose-customer'});return false;}return seat(s.selectedCustomerId,t.index);}
   const c=customer(t.customerId);if(!c)return false;
   if(t.state==='order'){
    const id=s.nextId++,order={id,customerId:c.id,tableIndex:t.index,recipe:c.recipe,status:'queued'};s.tickets.push(order);t.ticketId=id;t.state='ordered';c.status='ordered';startCooking();emit('order',{ticketId:id,tableIndex:t.index,recipe:c.recipe});return true;
   }
   if(t.state==='ordered'&&s.heldTicketId===t.ticketId){const order=ticket(t.ticketId);if(!order||order.status!=='carried')return false;order.status='served';s.tickets=s.tickets.filter(x=>x.id!==order.id);s.heldTicketId=null;t.state='eating';t.ticketId=null;t.eatLeft=92+32*c.size;c.status='eating';emit('serve',{tableIndex:t.index,customerId:c.id});return true;}
   return false;
  }
  function kitchenAction(){if(s.status!=='playing'||s.heldTicketId!==null)return false;const ready=s.tickets.find(x=>x.status==='ready');if(!ready){emit('blocked',{reason:'not-ready'});return false;}ready.status='carried';s.heldTicketId=ready.id;emit('pickup',{ticketId:ready.id,tableIndex:ready.tableIndex,recipe:ready.recipe});return true;}
  function act(action,index){if(action==='queue'){const c=customer(index);if(!c||c.status!=='queue')return false;s.selectedCustomerId=s.selectedCustomerId===c.id?null:c.id;emit('select',{customerId:s.selectedCustomerId});return true;}if(action==='table')return tableAction(index);if(action==='kitchen')return kitchenAction();return false;}
  function checkFinish(){if(s.status!=='playing'||s.scheduleIndex<config().schedule.length||s.queue.length||s.tables.some(t=>t.state!=='empty')||s.tickets.length||s.heldTicketId!==null||s.cookingId!==null)return;const earned=s.score-s.bankScore;if(earned>=config().target){s.status=s.shift===SHIFTS.length-1?'won':'cleared';emit(s.status,{earned,target:config().target});}else{s.status='lost';emit('lost',{reason:'target',earned,target:config().target});}}
  function tick(){s.ticks++;const C=config();while(s.scheduleIndex<C.schedule.length&&C.schedule[s.scheduleIndex][0]<=s.ticks){const [at,size,patience,recipe]=C.schedule[s.scheduleIndex++];const id=s.nextId++;s.customers.push({id,size,patience,maxPatience:patience,recipe,status:'queue',tableIndex:null,arrivedAt:at});s.queue.push(id);emit('arrive',{customerId:id,size,recipe});}
   for(const id of [...s.queue]){const c=customer(id);if(!c)continue;c.patience--;if(c.patience<=0){leave(c,'queue');if(s.status!=='playing')return;}}
   for(const t of s.tables){if(t.customerId===null)continue;const c=customer(t.customerId);if(!c)continue;if(t.state==='order'||t.state==='ordered'){c.patience--;if(c.patience<=0){leave(c,'table');if(s.status!=='playing')return;}}else if(t.state==='eating'){t.eatLeft--;if(t.eatLeft<=0)finishMeal(t,c);}}
   if(s.cookingId!==null){s.cookingLeft--;if(s.cookingLeft<=0){const order=ticket(s.cookingId);if(order){order.status='ready';emit('ready',{ticketId:order.id,tableIndex:order.tableIndex,recipe:order.recipe});}s.cookingId=null;s.cookingLeft=0;startCooking();}}
   if(s.status==='playing'&&s.ticks>=C.duration){s.status='lost';emit('lost',{reason:'time',earned:s.score-s.bankScore,target:C.target});return;}
   checkFinish();
  }
  function drain(){const out=events;events=[];return out;}
  function advance(ms){if(s.status!=='playing'||!finite(ms)||ms<0||ms>60000)return[];s.remainder+=ms;while(s.remainder+1e-7>=STEP&&s.status==='playing'){s.remainder=Math.max(0,s.remainder-STEP);tick();}return drain();}
  function next(){return s.status==='cleared'?create({shift:s.shift+1,score:s.score}):null;}
  function retry(){return s.status==='lost'?create({shift:s.shift,score:s.bankScore}):null;}
  function view(){return{...clone(s),shiftInfo:clone(config()),customers:clone(s.customers),queue:clone(s.queue.map(id=>customer(id)).filter(Boolean)),tables:clone(s.tables),tickets:clone(s.tickets),heldTicket:s.heldTicketId===null?null:clone(ticket(s.heldTicketId)),cooking:s.cookingId===null?null:{ticketId:s.cookingId,remaining:s.cookingLeft},remainingArrivals:config().schedule.length-s.scheduleIndex};}
  return{act,advance,drain,view,serialize:()=>clone(s),next,retry};
 }
 function validSave(s){
  if(!s||s.version!==1||!Number.isInteger(s.shift)||s.shift<0||s.shift>=SHIFTS.length||!['playing','cleared','won','lost'].includes(s.status))return false;
  for(const k of ['ticks','score','bankScore','nextId','missed'])if(!safe(s[k]))return false;
  const config=SHIFTS[s.shift];
  if(s.score<s.bankScore||s.score>1e9||s.bankScore>1e9||s.nextId<1||s.missed>config.schedule.length||!finite(s.remainder)||s.remainder<0||s.remainder>=STEP||!Number.isInteger(s.scheduleIndex)||s.scheduleIndex<0||s.scheduleIndex>config.schedule.length||s.ticks>config.duration)return false;
  const scheduleCutoff=s.ticks===0?-1:s.ticks;
  if(config.schedule.slice(0,s.scheduleIndex).some(row=>row[0]>scheduleCutoff)||config.schedule.slice(s.scheduleIndex).some(row=>row[0]<=scheduleCutoff))return false;
  if(!Array.isArray(s.queue)||!Array.isArray(s.tables)||s.tables.length!==TABLE_CAPACITIES.length||!Array.isArray(s.customers)||s.customers.length>SHIFTS[s.shift].schedule.length||!Array.isArray(s.tickets)||s.tickets.length>TABLE_CAPACITIES.length)return false;
  if(s.selectedCustomerId!==null&&(!Number.isInteger(s.selectedCustomerId)||!s.customers.some(c=>c.id===s.selectedCustomerId&&c.status==='queue')))return false;
  const ids=new Set();for(const c of s.customers){if(!c||!Number.isInteger(c.id)||c.id<1||c.id>=s.nextId||ids.has(c.id)||![1,2,3].includes(c.size)||!Number.isInteger(c.patience)||c.patience<0||!Number.isInteger(c.maxPatience)||c.maxPatience<1||c.patience>c.maxPatience||!Number.isInteger(c.recipe)||c.recipe<0||c.recipe>=RECIPES.length||!['queue','seated','ordered','eating'].includes(c.status)||!Number.isInteger(c.arrivedAt)||c.arrivedAt<0)return false;ids.add(c.id);if(c.status==='queue'?(c.tableIndex!==null):(!Number.isInteger(c.tableIndex)||c.tableIndex<0||c.tableIndex>=TABLE_CAPACITIES.length))return false;}
  if(new Set(s.queue).size!==s.queue.length||s.queue.some(id=>!s.customers.some(c=>c.id===id&&c.status==='queue'))||s.queue.length!==s.customers.filter(c=>c.status==='queue').length)return false;
  const tableStates=['empty','order','ordered','eating'],tableCustomerIds=new Set();
  const customerById=new Map(s.customers.map(c=>[c.id,c]));
  const customerState={order:'seated',ordered:'ordered',eating:'eating'};
  for(let i=0;i<s.tables.length;i++){const t=s.tables[i];if(!t||t.index!==i||t.capacity!==TABLE_CAPACITIES[i]||!tableStates.includes(t.state)||!Number.isInteger(t.eatLeft)||t.eatLeft<0||t.eatLeft>188)return false;if(t.state==='empty'?(t.customerId!==null||t.ticketId!==null):(typeof t.customerId!=='number'||!customerById.has(t.customerId)||customerById.get(t.customerId).tableIndex!==i||customerById.get(t.customerId).status!==customerState[t.state]))return false;if(t.customerId!==null){if(tableCustomerIds.has(t.customerId))return false;tableCustomerIds.add(t.customerId);}if(t.state==='ordered'?(typeof t.ticketId!=='number'||!s.tickets.some(x=>x.id===t.ticketId&&x.tableIndex===i&&x.customerId===t.customerId)):(t.ticketId!==null))return false;}
  if(s.customers.some(c=>c.status!=='queue'&&!tableCustomerIds.has(c.id)))return false;
  const ticketIds=new Set(),ticketTables=new Set();for(const x of s.tickets){if(!x||!Number.isInteger(x.id)||x.id<1||x.id>=s.nextId||ids.has(x.id)||ticketIds.has(x.id)||!Number.isInteger(x.customerId)||!customerById.has(x.customerId)||!Number.isInteger(x.tableIndex)||x.tableIndex<0||x.tableIndex>=TABLE_CAPACITIES.length||ticketTables.has(x.tableIndex)||!Number.isInteger(x.recipe)||x.recipe<0||x.recipe>=RECIPES.length||!['queued','cooking','ready','carried'].includes(x.status))return false;const t=s.tables[x.tableIndex];if(t.customerId!==x.customerId||t.ticketId!==x.id||t.state!=='ordered')return false;ticketIds.add(x.id);ticketTables.add(x.tableIndex);ids.add(x.id);}
  if(s.cookingId===null? s.cookingLeft!==0||s.tickets.some(x=>x.status==='cooking') : !s.tickets.some(x=>x.id===s.cookingId&&x.status==='cooking')||s.tickets.filter(x=>x.status==='cooking').length!==1||!Number.isInteger(s.cookingLeft)||s.cookingLeft<0||s.cookingLeft>Math.max(...RECIPES.map(x=>x.cook)))return false;
  if(s.heldTicketId===null?s.tickets.some(x=>x.status==='carried'):!s.tickets.some(x=>x.id===s.heldTicketId&&x.status==='carried'))return false;
  if(s.status==='won'&&s.shift!==SHIFTS.length-1||s.status==='cleared'&&s.shift>=SHIFTS.length-1)return false;
  if(s.status==='playing'&&s.ticks>=config.duration)return false;
  if((s.status==='cleared'||s.status==='won')&&(s.scheduleIndex!==config.schedule.length||s.queue.length||s.tables.some(t=>t.state!=='empty')||s.tickets.length||s.heldTicketId!==null||s.score-s.bankScore<config.target))return false;
  if(s.status==='lost'&&s.missed<3&&s.ticks<config.duration)return false;
  return true;
 }
 return{STEP,SHIFTS:clone(SHIFTS),TABLE_CAPACITIES:clone(TABLE_CAPACITIES),RECIPES:clone(RECIPES),validSave,create,restore:s=>validSave(s)?create({saved:s}):null};
});
