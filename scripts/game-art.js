(function installArt(){
'use strict';
const line='stroke="#35443b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"';
const crops={
radish:`<path d="M30 26 Q15 18 16 9 Q33 12 35 25 M35 26 Q39 10 52 10 Q51 24 35 29" fill="#69af6b" ${line}/><path d="M20 26 Q33 21 46 29 Q49 43 35 56 Q21 51 17 42 Q14 32 20 26Z" fill="#f7e9df" ${line}/><path d="M20 37 Q30 40 46 34" stroke="#d8bbae" stroke-width="3"/>`,
corn:`<path d="M24 48 Q9 32 17 20 L31 39 M43 48 Q55 28 47 19 L36 40" fill="#5aa269" ${line}/><rect x="23" y="13" width="22" height="40" rx="10" fill="#f3c45b" ${line}/><path d="M23 25 H45 M23 37 H45 M30 14 V51 M38 14 V51" stroke="#d79544" stroke-width="2"/>`,
tomato:`<path d="M13 36 Q13 21 27 21 Q39 14 49 25 Q56 43 41 53 Q19 60 13 36Z" fill="#e66b56" ${line}/><path d="M31 22 L22 14 L35 17 L43 11 L42 21 L50 25 L35 27Z" fill="#75aa67" ${line}/><ellipse cx="23" cy="36" rx="5" ry="9" fill="#fcb29f" opacity=".65"/>`,
watermelon:`<ellipse cx="33" cy="37" rx="23" ry="18" fill="#348a61" ${line}/><path d="M20 23 Q15 38 21 50 M32 19 Q27 36 33 55 M45 22 Q39 36 45 50" stroke="#9bd47c" fill="none" stroke-width="4"/>`,
sunflower:`<path d="M33 30 V57" stroke="#54895b" stroke-width="5"/><path d="M33 47 Q17 30 11 45 Q21 56 33 47 M33 43 Q47 29 54 42 Q46 53 33 43" fill="#72b470" ${line}/>${[0,45,90,135,180,225,270,315].map(a=>`<ellipse cx="33" cy="12" rx="7" ry="12" transform="rotate(${a} 33 29)" fill="#f5c75f" stroke="#be9144" stroke-width="1.5"/>`).join('')}<circle cx="33" cy="29" r="12" fill="#906343" ${line}/>`
};
const tools={
plow:`<path d="M15 56 L44 17" stroke="#9a6846" stroke-width="7" stroke-linecap="round"/><path d="M34 16 L47 27 L57 16 L43 7Z" fill="#b3c6c7" ${line}/>`,
seed:`<path d="M14 45 Q12 29 33 24 Q51 29 50 45 Q46 58 31 57 Q17 54 14 45Z" fill="#cda16e" ${line}/><path d="M18 43 H47" stroke="#a27749" stroke-width="3"/><path d="M30 28 Q20 13 14 12 Q14 23 31 29 M32 27 Q35 12 49 10 Q47 23 32 30" fill="#79ab69" ${line}/>`,
water:`<path d="M21 18 H48 L44 51 H24Z" fill="#84c0c5" ${line}/><path d="M24 25 H46" stroke="#e0f4e7" stroke-width="3"/><path d="M45 20 L54 16 L58 22 L47 28" fill="#acc6c3" ${line}/><path d="M20 28 L9 27 L9 36 L20 39" stroke="#567d80" stroke-width="4" fill="none"/>`,
care:`<ellipse cx="33" cy="38" rx="18" ry="15" fill="#89bd69" ${line}/><path d="M27 23 Q26 12 19 12 M38 23 Q39 11 46 13 M18 38 L10 36 M47 38 L56 35" fill="none" stroke="#568e55" stroke-width="3"/><circle cx="27" cy="34" r="3" fill="#304338"/><circle cx="39" cy="34" r="3" fill="#304338"/>`,
fertilizer:`<path d="M22 11 H42 L46 22 L51 54 H14 L19 22Z" fill="#f2dcb4" ${line}/><path d="M21 32 H46" stroke="#bba071" stroke-width="3"/><path d="M33 23 V46 M23 36 H43" stroke="#7aac7a" stroke-width="5"/>`,
harvest:`<path d="M11 29 L19 54 H49 L56 29" fill="#c28c55" ${line}/><path d="M10 28 H57" stroke="#885d3c" stroke-width="5"/><circle cx="32" cy="25" r="9" fill="#e06d58" ${line}/><path d="M32 18 Q24 9 16 14 M33 17 Q41 7 49 13" fill="#80bd76" ${line}/><path d="M20 39 H49 M23 47 H46" stroke="#91603e" stroke-width="3"/>`
};
const food={
banhmi_trung:`<path d="M10 38 Q12 22 31 18 Q51 15 57 29 Q58 43 38 47 L22 51 Q9 49 10 38Z" fill="#dfa568" ${line}/><path d="M15 36 Q32 25 54 30" stroke="#fff0bd" stroke-width="5" fill="none"/><path d="M20 41 Q29 34 48 35" stroke="#6e9b62" stroke-width="4" fill="none"/><circle cx="39" cy="34" r="5" fill="#f8eacb"/>`,
tra_da:`<path d="M20 18 H48 L44 52 H25Z" fill="#c9a778" ${line}/><path d="M24 18 L28 50 M36 18 V50" stroke="#efe7ce" stroke-width="4"/><path d="M18 16 H50 M36 17 L46 5 H53" stroke="#6b8a79" stroke-width="3"/>`,
keo_lac:`<rect x="11" y="19" width="44" height="34" rx="7" fill="#bf8e5d" ${line}/><path d="M12 32 H54 M12 42 H54" stroke="#e4bc85" stroke-width="2"/><ellipse cx="24" cy="29" rx="7" ry="4" fill="#f2d7aa"/><ellipse cx="41" cy="41" rx="7" ry="4" fill="#f2d7aa"/>`,
cavien_chien:`<path d="M12 55 L49 14" stroke="#a67e52" stroke-width="4"/><circle cx="24" cy="43" r="10" fill="#daa066" ${line}/><circle cx="40" cy="27" r="10" fill="#d98e50" ${line}/>`,
nuoc_mia:`<path d="M18 19 H49 L45 52 H23Z" fill="#bbce79" ${line}/><path d="M30 20 V50 M40 20 V50" stroke="#e4edb9" stroke-width="4"/><path d="M16 18 H51 M38 20 L47 7 H54" stroke="#647a5d" stroke-width="3"/>`,
banhtrang_nuong:`<ellipse cx="33" cy="36" rx="25" ry="17" fill="#edb672" ${line}/><ellipse cx="33" cy="35" rx="20" ry="12" fill="#f6d592" stroke="#c99156" stroke-width="2"/><circle cx="25" cy="31" r="4" fill="#d75f49"/><circle cx="42" cy="37" r="4" fill="#e07555"/>`,
nemchua_ran:`<path d="M11 25 Q12 17 22 18 H50 Q59 19 55 32 L45 49 Q41 54 32 49 L14 40 Q9 36 11 25Z" fill="#e0aa69" ${line}/><path d="M16 25 L44 42 M26 22 L51 33" stroke="#c1864c" stroke-width="4"/>`,
tra_chanh:`<path d="M19 18 H47 L43 52 H24Z" fill="#c1c47e" ${line}/><circle cx="45" cy="18" r="11" fill="#f1db68" ${line}/><path d="M45 9 V27 M36 18 H54" stroke="#fff1b5" stroke-width="2"/>`,
trasua_topping:`<path d="M18 17 H48 L45 52 H22Z" fill="#cba481" ${line}/><path d="M16 16 H50 M39 17 L44 5" stroke="#e9d4b4" stroke-width="4"/><circle cx="29" cy="45" r="3.5" fill="#4f4037"/><circle cx="39" cy="44" r="3.5" fill="#4f4037"/>`,
lau_ly:`<path d="M14 25 H52 L46 54 H20 Z" fill="#d8775b" ${line}/><path d="M11 24 H55" stroke="#856249" stroke-width="4"/><path d="M24 20 Q19 14 24 7 M35 20 Q30 12 35 6 M45 20 Q40 14 46 8" stroke="#d4d6bf" stroke-width="3" fill="none"/>`
};
const ing={bread:'banhmi_trung',egg_pate:'banhmi_trung',skewer:'cavien_chien',sugarcane:'nuoc_mia',ricepaper:'banhtrang_nuong',tea_milk:'tra_da',sausage:'nemchua_ran'};
const upgrades={extraChair:'harvest',fastStove:'fertilizer',umbrella:'water',speaker:'care',cooler:'seed'};
const ids=['pikachu','bulbasaur','charmander','squirtle','jigglypuff','psyduck','snorlax','gengar','meowth','togepi','eevee','clefairy','poliwag','diglett','geodude','mew'];
const colors=['#f2cb69','#7ac5a5','#ef9b79','#82bed7','#e4accc','#e9c580','#a0d0c3','#aaa0d6','#dab688','#e6d5d6','#cda583','#eec7db','#9acbd1','#d2c0a9','#9cacc4','#d2b5dc'];
function creature(id){
const n=Math.max(0,ids.indexOf(id)),c=colors[n];
const earSets=[
`M20 24 L11 5 L28 19 M43 24 L54 5 L39 20`,
`M21 24 Q9 8 15 6 Q26 6 29 23 M40 23 Q45 5 55 6 Q59 18 43 23`,
`M20 23 L17 6 L29 18 M41 23 L49 8 L46 24`,
`M18 24 Q11 8 15 5 Q29 7 29 23 M40 23 Q45 8 54 6 Q57 15 44 26`,
`M22 24 Q8 9 16 9 Q28 7 29 24 M40 24 Q44 7 53 9 Q59 16 44 25`,
`M27 23 L33 6 L40 23`, `M19 24 Q15 5 24 9 L30 24 M38 23 L46 9 Q55 10 47 26`,
`M16 29 L9 17 L21 17 L20 6 L32 19 L44 6 L45 19 L57 16 L49 30`,
`M20 24 L10 5 L28 14 M42 24 L55 5 L43 14`,
`M20 25 Q20 9 33 7 Q46 10 46 25`,
`M20 24 L10 5 L27 14 M43 24 L55 5 L39 14`,
`M19 24 Q10 5 18 5 Q29 12 30 24 M40 24 Q43 9 53 6 Q58 16 46 26`,
`M21 24 Q26 10 34 12 Q44 16 46 25`,
`M23 24 Q23 8 33 9 Q43 8 43 24`,
`M16 29 L17 14 L29 18 L34 7 L43 17 L52 17 L53 30`,
`M19 24 L12 6 L28 19 M41 23 L53 8 L44 26`
];
const motif=[
`<path d="M16 39 L23 43 L17 46" fill="#d59645"/>`,
`<path d="M25 22 Q33 14 40 22" stroke="#4b9479" stroke-width="3" fill="none"/>`,
`<path d="M31 23 L36 17 L40 23" fill="#f6df9b"/>`,
`<path d="M24 45 Q33 40 43 45" stroke="#4d90a9" stroke-width="3" fill="none"/>`,
`<circle cx="19" cy="40" r="5" fill="#f7c8df"/>`,
`<path d="M29 22 Q35 17 42 23" stroke="#e0b16b" stroke-width="3" fill="none"/>`,
`<path d="M19 45 Q32 40 47 45" stroke="#5d9484" stroke-width="3" fill="none"/>`,
`<path d="M24 21 L33 26 L42 21" stroke="#7060a1" stroke-width="3" fill="none"/>`,
`<path d="M18 41 H48" stroke="#a07850" stroke-width="3"/>`,
`<path d="M22 26 L33 16 L44 26" stroke="#c89da1" stroke-width="3" fill="none"/>`,
`<path d="M19 42 Q33 35 47 42" stroke="#a77b5a" stroke-width="3" fill="none"/>`,
`<path d="M27 17 L33 11 L40 17" stroke="#c28eb8" stroke-width="3" fill="none"/>`,
`<path d="M24 46 Q33 51 42 46" stroke="#639ca7" stroke-width="3" fill="none"/>`,
`<path d="M16 34 Q33 27 50 34" stroke="#977c63" stroke-width="3" fill="none"/>`,
`<path d="M20 25 H47" stroke="#7b91ad" stroke-width="4"/>`,
`<path d="M25 24 Q33 13 41 24" stroke="#a47db5" stroke-width="3" fill="none"/>`
];
return `<path d="${earSets[n]}" fill="${c}" ${line}/><path d="M12 37 Q12 18 33 19 Q55 18 55 39 Q55 57 33 57 Q11 58 12 37Z" fill="${c}" ${line}/>${motif[n]}<ellipse cx="24" cy="35" rx="3" ry="4" fill="#2e3d36"/><ellipse cx="42" cy="35" rx="3" ry="4" fill="#2e3d36"/><circle cx="25" cy="34" r="1.2" fill="white"/><circle cx="43" cy="34" r="1.2" fill="white"/><path d="M30 44 Q33 47 36 44" stroke="#304338" stroke-width="2.5" fill="none"/>`;
}
function svg(kind,id,classes=''){
const drawing=kind==='crop'?crops[id]:kind==='tool'?tools[id]:kind==='dish'?food[id]:kind==='ingredient'?food[ing[id]]:kind==='upgrade'?tools[upgrades[id]]:kind==='creature'?creature(id):null;
const cls=String(classes).replace(/[^a-z0-9_ -]/gi,'');
return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 66" class="${cls}" fill="none" aria-hidden="true" focusable="false">${drawing||crops.radish}</svg>`;
}
window.NP_GameArt=Object.freeze({svg,creatureIds:Object.freeze([...ids])});
})();