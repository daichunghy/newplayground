/* NewPlayground arcade presentation. Original SVG illustrations; no copied portal art.
 * This module does not change simulation, scores, saved games or engine priority.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP_ArcadeCore = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const routes = [
    [/hang-rong|ca-pho/, 'launchHangRong'], [/dao-vang|gold-miner/, 'launchDaoVang'],
    [/pac-man/, 'launchPacMan'], [/mario|sonic|subway|paperboy/, 'launchMario'],
    [/gunny|cung|angry-birds/, 'launchGunny'], [/nong-trai|sky-garden|vuon/, 'launchNongTrai'],
    [/feeding|ca-lon|nuot-ca/, 'launchFeedingFrenzy'], [/nuoi-ca|nemo|insaniquarium|dao-rong/, 'launchNuoiCaNemo'],
    [/zuma/, 'launchZuma'], [/diner/, 'launchDinerDash'], [/co-tuong/, 'launchCoTuong'],
    [/ban-bi/, 'launchBanBiVe'], [/danh-bai|uno/, 'launchDanhBaiUno'],
    [/plants|zombie|bloons|thu-thanh/, 'launchPvZ'], [/ban-ga|galaga|ban-ruoi|chicken/, 'launchChickenInvaders'],
    [/pha-gach|dx-ball|arkanoid|peggle/, 'launchDXBall'], [/2048/, 'launchGame2048'],
    [/sokoban|day-thung|ha-noi/, 'launchSokoban'], [/o-an-quan/, 'launchOAnQuan'],
    [/pong|bi-lac|bong-ban/, 'launchPong'], [/line-98/, 'launchLine98'],
    [/ban-trung|dynomite|bobble/, 'launchBanTrung'], [/kim-cuong|bejeweled|chuzzle/, 'launchKimCuong'],
    [/dat-bom|bomberman/, 'launchDatBom'], [/xe-tang|battle-city|tank-1990|heavy-weapon/, 'launchXeTang1990'],
    [/caro/, 'launchCaro'], [/ran-san-moi|snake/, 'launchSnake'], [/xep-gach|tetris|dr-mario/, 'launchTetris'],
    [/flappy/, 'launchFlappyBird'], [/chem-hoa-qua|fruit-ninja/, 'launchFruitNinja'],
    [/do-min|minesweeper/, 'launchDoMin'], [/pikachu|lat-the|noi-hinh/, 'launchPikachu']
  ];
  const retroPattern = /boom-online|audition|road-rash|rockman|mega-man|duck-hunt|street-fighter|bloxorz|age-of-war|bubble-bobble|raft-wars/;
  function routeFor(game, retro) {
    const id = String(game && game.id || '').toLowerCase();
    if (retro ? retro.hasGame(id) : retroPattern.test(id)) return 'retro50';
    return (routes.find(([pattern]) => pattern.test(id)) || [null, 'launchRetroArcade'])[1];
  }
  const featured = ['hang-rong','tro-choi-2048','ran-san-moi-snake','line-98','ban-trung-khung-long','xep-gach-tetris','do-min-minesweeper','co-caro','day-thung-sokoban','pha-gach-dx-ball','flappy-bird','boom-online-bnb'];
  // title, short objective, input hint, illustration, surface colour, accent.
  const definitions = {
    'hang-rong': ['Hàng Rong','Mở bếp nhỏ, phục vụ khách ghé quán.','Chọn món trong bếp, đợi nấu xong rồi chạm khách để giao món.','stall','#f6e9d6','#a95330'],
    'tro-choi-2048': ['2048','Ghép hai ô giống nhau. Tiến tới 2048.','Vuốt trên bàn hoặc dùng phím mũi tên. Hoàn tác để lùi một bước.','2048','#f3e5d4','#a66b33'],
    'ran-san-moi-snake': ['Rắn săn mồi','Ăn thêm một quả, vượt kỷ lục của mình.','Dùng mũi tên hoặc cụm phím bên dưới. Tránh đâm tường và thân rắn.','snake','#e3eddf','#387052'],
    'line-98': ['Line 98','Xếp năm viên cùng màu thành một hàng.','Chọn viên bi rồi chọn ô trống có đường đi tới. Hàng ngang, dọc hoặc chéo đều được.','lines','#e8e8f4','#655f93'],
    'ban-trung-khung-long': ['Bắn trứng','Ngắm thật khéo, ghép trứng cùng màu.','Chạm hoặc kéo để ngắm. Dùng nút Bắn; đổi trứng khi cần.','eggs','#dfefe8','#3e7b66'],
    'xep-gach-tetris': ['Xếp gạch','Lấp đầy hàng. Giữ bàn chơi thật gọn.','Mũi tên để di chuyển và xoay, Space để thả nhanh. Có nút giữ khối và tạm dừng.','blocks','#e5e8f1','#556a99'],
    'do-min-minesweeper': ['Dò mìn','Đọc con số, tìm những ô an toàn.','Chạm để mở ô. Bật chế độ cắm cờ để đánh dấu ô nghi có mìn. Kéo ngang bàn lớn.','mines','#e8ebe5','#607354'],
    'co-caro': ['Cờ Caro','Nối năm quân trước đối thủ.','Chạm ô trống để đặt quân. Dùng Hoàn tác hoặc Ván mới trong bàn chơi.','caro','#e5ecf3','#497495'],
    'day-thung-sokoban': ['Đẩy thùng','Đưa từng chiếc thùng về đúng vị trí.','Dùng mũi tên hoặc cụm phím dưới bàn. Chỉ đẩy được thùng, không kéo được.','crates','#eee7da','#8b714e'],
    'pha-gach-dx-ball': ['Phá gạch','Đỡ bóng, dọn sạch bức tường màu.','Di chuyển thanh đỡ bằng chuột, cảm ứng hoặc phím điều khiển hiển thị trong game.','bricks','#e6eafa','#5c6eb0'],
    'flappy-bird': ['Flappy Bird','Bay qua thêm một cặp ống nữa.','Chạm Nhảy hoặc nhấn Space để vỗ cánh. Giữ nhịp ngắn và đều.','bird','#e2eff2','#398394'],
    'boom-online-bnb': ['Boom Online','Đặt bom, mở đường, né vụ nổ.','Dùng mũi tên hoặc cụm phím cảm ứng để di chuyển. Đặt bom rồi rời khỏi vùng nổ.','bomb','#e5e9f0','#4c6896'],
    'dao-vang': ['Đào vàng','Canh góc móc, kéo được món thật giá trị.','Chọn Bắt đầu rồi thả móc khi ngắm đúng vàng. Dùng vật phẩm theo hướng dẫn trong ván.','gold','#f4e9c9','#9a7730'],
    'nong-trai-vui-ve': ['Nông trại','Gieo hạt, chăm cây, thu hoạch khu vườn.','Chọn hạt giống và luống đất. Theo dõi cây, thu hoạch rồi mở rộng trang trại.','farm','#e5ecd8','#6a7f40'],
    'kim-cuong-bejeweled': ['Kim cương','Đổi chỗ để ghép những viên cùng màu.','Chọn hai viên cạnh nhau. Tạo hàng ít nhất ba viên cùng màu.','gems','#f1e1eb','#9c507c'],
    'pac-man': ['Pac-Man','Ăn những chấm nhỏ, tránh ma đuổi theo.','Dùng mũi tên hoặc cụm phím dưới mê cung.','maze','#e3e6f4','#5268aa'],
    'pong-1972': ['Pong','Giữ bóng trên sân, đánh bại đối thủ.','Di chuyển thanh đỡ bằng chuột hoặc kéo trên sân. Tạm dừng khi cần nghỉ.','pong','#e0eae7','#3e7966'],
    'co-tuong': ['Cờ tướng','Quan sát thế cờ, chọn nước đi tiếp theo.','Chọn quân của mình, sau đó chọn vị trí muốn đi.','chess','#f1e7d6','#8d613f'],
    'lat-the-tri-nho': ['Nối hình','Tìm hai hình giống nhau có đường nối.','Chọn hai hình giống nhau. Dùng Gợi ý hoặc Phóng to khi bàn chơi nhỏ.','pairs','#f0e4da','#a76c47']
  };
  const family = {
    'Quản lý':['stall','#f6e9d6','#a95330'], 'Giải đố':['pairs','#e8e8f4','#655f93'],
    'Hành động':['ship','#e5e8f1','#556a99'], 'Kỹ năng':['bricks','#e2eff2','#398394'],
    'Chiến thuật':['chess','#e3eddf','#387052'], 'Trí tuệ':['pairs','#e8e8f4','#655f93'],
    'Chill':['farm','#e5ecd8','#6a7f40'], 'Đối kháng':['bomb','#f0e4da','#a76c47']
  };
  function profile(game) {
    const d = definitions[game.id];
    const f = family[game.category] || ['ship','#e5e8f1','#556a99'];
    return { title:d ? d[0] : game.title, objective:d ? d[1] : game.tagline || game.category,
      help:d ? d[2] : 'Xem hướng dẫn và các nút điều khiển trong bàn chơi.',
      art:d ? d[3] : f[0], surface:d ? d[4] : f[1], accent:d ? d[5] : f[2],
      experimental:routeFor(game) === 'launchRetroArcade' && game.id !== 'typer-shark' };
  }
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function read(storage, key, fallback) { try { const value = storage.getItem(key); return value == null ? fallback : JSON.parse(value); } catch (_) { return fallback; } }
  function write(storage, key, value) { try { storage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  function cleanIds(values, catalog, limit = 150) {
    const allowed = new Set(catalog.map(g=>g.id));
    return [...new Set(Array.isArray(values) ? values.filter(id=>typeof id==='string' && allowed.has(id)) : [])].slice(0,limit);
  }
  function remember(values, id, catalog) { return cleanIds([id,...(Array.isArray(values)?values:[])],catalog,12); }
  function select(catalog, query, filter, favorites, history) {
    const q = normalize(query), rank = new Map(featured.map((id,i)=>[id,i]));
    let result = catalog.filter(g => !q || normalize([g.title,g.tagline,g.category,profile(g).title].join(' ')).includes(q));
    if (filter==='favorites') result=result.filter(g=>favorites.includes(g.id));
    else if (filter==='recent') result=result.filter(g=>history.includes(g.id));
    else if (filter==='experimental') result=result.filter(g=>profile(g).experimental);
    else if (filter!=='all') result=result.filter(g=>g.category===filter);
    return result.slice().sort((a,b)=>filter==='recent' ? history.indexOf(a.id)-history.indexOf(b.id) : (rank.get(a.id)??999)-(rank.get(b.id)??999));
  }
  const icons = {
    play:'<path d="m9 5 11 7-11 7Z"/>', arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    back:'<path d="M19 12H5m6-6-6 6 6 6"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    heart:'<path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>', moon:'<path d="M20 14A8.5 8.5 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    sound:'<path d="M10 5 5 9H2v6h3l5 4Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute:'<path d="M10 5 5 9H2v6h3l5 4Zm5 4 6 6m0-6-6 6"/>',
    expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    dice:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    link:'<path d="m10 14 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 0 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
    pad:'<path d="M7 6h10a4 4 0 0 1 4 3l1 8a2 2 0 0 1-3 2l-4-3H9l-4 3a2 2 0 0 1-3-2l1-8a4 4 0 0 1 4-3Z"/><path d="M6 11h5m-2.5-2.5v5M16 10h.01M18 13h.01"/>'
  };
  function icon(name) { return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.play}</svg>`; }
  function cover(game) {
    const p = profile(game), ink='#34433e', colours=['#e5aa65','#789ecd','#c47f90','#80a894','#b19ac8','#f0cb6f'];
    const rect=(x,y,w,h,fill,r=8)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
    const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
    const line=(x1,y1,x2,y2,stroke,width=3)=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`;
    let art='';
    if (p.art==='2048') {
      art=rect(84,19,232,222,'#b9a894',15);
      const nums=[2,4,8,16,4,8,16,32,8,16,64,128,16,32,128,256];
      nums.forEach((n,i)=>{ const x=94+(i%4)*55,y=29+Math.floor(i/4)*53;art+=rect(x,y,47,45,['#f7efdf','#eed0a2','#e7a75f','#b87b4c'][Math.floor(i/4)],7)+`<text x="${x+23.5}" y="${y+29}" text-anchor="middle" font-size="22" font-weight="700" fill="${i>10?'#fff7e8':'#6f503b'}">${n}</text>`; });
    } else if (p.art==='snake') {
      art=rect(60,27,280,205,'#edf4e8',16);
      for(let y=40;y<225;y+=22) for(let x=72;x<330;x+=22) art+=circle(x,y,1,'#c7d7c1');
      art+='<path d="M104 191V147H192V103H258V59" fill="none" stroke="#48815e" stroke-width="21" stroke-linejoin="round" stroke-linecap="round"/>';
      art+=circle(254,56,2.5,'white')+circle(262,56,2.5,'white')+circle(301,164,11,'#c96748')+line(301,151,304,145,'#528257',4);
    } else if (p.art==='blocks') {
      art=rect(105,14,190,232,'#283b4e',13);
      const rows=['00000000','00011000','00011000','00000000','00000000','00000000','30000322','33004422','35504466','55544666'];
      rows.forEach((row,y)=>[...row].forEach((v,x)=>{art+=rect(117+x*21,27+y*21,18,18,v==='0'?'#304758':colours[Number(v)-1],3);}));
    } else if (p.art==='mines' || p.art==='caro' || p.art==='lines') {
      art=rect(87,16,226,228,p.art==='mines'?'#b9c6b4':'#f8faf6',13);
      for(let y=0;y<6;y++) for(let x=0;x<6;x++) { const cx=99+x*34,cy=29+y*34;art+=rect(cx,cy,30,30,p.art==='mines' && x>3 ?'#dce6d5':'#f4f7ed',5);
        if(p.art==='mines' && x<4 && (x+y)%3)art+=`<text x="${cx+15}" y="${cy+22}" fill="${(x+y)%2?'#668ca9':'#5e8654'}" text-anchor="middle" font-size="23" font-weight="700">${(x+y)%3+1}</text>`;
        if(p.art==='caro' && (x+y)%3===0) art+=line(cx+8,cy+8,cx+22,cy+22,'#517e99',4)+line(cx+22,cy+8,cx+8,cy+22,'#517e99',4);
        if(p.art==='caro' && (x*2+y)%5===0)art+=`<circle cx="${cx+15}" cy="${cy+15}" r="8" fill="none" stroke="#b87860" stroke-width="4"/>`;
        if(p.art==='lines' && (x+2*y)%4===0)art+=circle(cx+15,cy+15,11,colours[(x+y)%6])+circle(cx+12,cy+11,3,'#ffffff99');
      }
      if(p.art==='mines') art+=line(259,95,259,116,ink,3)+'<path d="m259 95 16 6-16 6Z" fill="#c57255"/>';
    } else if (p.art==='eggs' || p.art==='gems' || p.art==='pairs') {
      art=rect(70,17,260,226,'#f7faf5',17);
      for(let y=0;y<4;y++)for(let x=0;x<6;x++){const cx=91+x*43+(y%2?4:0),cy=40+y*43,c=colours[(x+2*y)%6];
        art+=p.art==='gems'?`<path d="m${cx} ${cy-16} 15 16-15 16-15-16Z" fill="${c}"/>`:p.art==='pairs'?rect(cx-16,cy-16,34,34,c,8)+circle(cx,cy,7,'#ffffffa6'):circle(cx,cy,17,c)+circle(cx-4,cy-5,4,'#ffffffaa');
      }
      art+=circle(200,220,14,'#80a894')+line(200,199,214,181,'#6e9684',3);
    } else if (p.art==='crates' || p.art==='bomb' || p.art==='maze' || p.art==='chess') {
      art=rect(58,23,284,214,p.art==='maze'?'#293c53':'#fbf7eb',15);
      for(let y=0;y<5;y++)for(let x=0;x<7;x++){const cx=71+x*37,cy=35+y*38;
        const wall=y===0||y===4||x===0||x===6;
        art+=rect(cx,cy,34,34,wall?(p.art==='maze'?'#788bc1':'#bbc7b1'):'#e8e4d5',5);
        if(!wall && (x+y)%3===0)art+=p.art==='bomb'?circle(cx+17,cy+19,11,'#48566a'):p.art==='maze'?circle(cx+17,cy+17,3,'#f3cc6a'):rect(cx+3,cy+3,28,28,'#b88d58',5)+line(cx+7,cy+7,cx+27,cy+27,'#dbc195',3);
      }
      art+=circle(165,128,12,p.art==='maze'?'#f3cc6a':'#6284a5');
    } else if(p.art==='bricks' || p.art==='pong' || p.art==='ship') {
      art=rect(49,25,302,210,'#2d4556',17);
      if(p.art==='bricks')for(let y=0;y<3;y++)for(let x=0;x<6;x++)art+=rect(65+x*46,42+y*24,40,17,colours[y],4);
      if(p.art==='pong') {art+=rect(74,75,9,59,'#bfdcc8',4)+rect(317,129,9,59,'#bfdcc8',4);for(let y=39;y<220;y+=20)art+=rect(198,y,3,9,'#759394',1);}
      else if(p.art==='ship'){for(let y=0;y<3;y++)for(let x=0;x<6;x++)art+=rect(79+x*41,47+y*30,23,15,colours[y],4);art+='<path d="m200 183 16 26h-32Z" fill="#b5d7c9"/>';}
      else art+=rect(157,203,87,10,'#bfdcc8',5);
      art+=circle(222,156,7,'#f9e7a1')+line(242,132,231,145,'#96afbf',3);
    } else if(p.art==='bird') {
      art=rect(40,23,320,215,'#b7d8db',19)+rect(270,23,44,73,'#60917e',4)+rect(270,169,44,69,'#60917e',4)+rect(263,87,58,16,'#407260',4)+rect(263,164,58,16,'#407260',4);
      art+=circle(172,127,24,'#e6ba66')+circle(185,119,7,'#fff9ee')+circle(188,119,2.8,ink)+rect(192,133,20,8,'#bd7854',4)+'<ellipse cx="156" cy="133" rx="16" ry="10" fill="#f3d38c"/>';
      art+=rect(40,224,320,14,'#92b09a',0);
    } else if(p.art==='farm') {
      art=rect(46,24,308,210,'#e0e9ca',19);
      for(let y=0;y<3;y++)for(let x=0;x<5;x++){const cx=91+x*54,cy=83+y*53;art+=rect(cx-20,cy-9,39,26,'#b2946f',8)+line(cx,cy+1,cx,cy-19,'#607b41',4)+`<ellipse cx="${cx-7}" cy="${cy-20}" rx="11" ry="5" fill="#7d9754" transform="rotate(27 ${cx-7} ${cy-20})"/><ellipse cx="${cx+7}" cy="${cy-25}" rx="11" ry="5" fill="#607d42" transform="rotate(-27 ${cx+7} ${cy-25})"/>`;}
    } else if(p.art==='gold') {
      art=rect(40,28,320,205,'#cfb68b',17)+rect(40,28,320,54,'#f6e8c2',17)+line(196,66,243,153,'#736346',3)+'<path d="M234 150q7 27 25 7" fill="none" stroke="#61503d" stroke-width="5"/>';
      [110,177,275].forEach((x,i)=>{art+=`<path d="m${x} ${160+i*14} 11-16 20 4 9 24-21 7Z" fill="#efcc6b"/>`;});
    } else {
      art=rect(43,27,314,208,'#eed7b3',20)+rect(94,78,219,147,'#f8edcc',3)+rect(86,67,235,22,'#9f5540',3);
      for(let x=89;x<312;x+=46)art+=rect(x,88,24,36,'#ce8060',0);
      art+=rect(81,170,243,16,'#a87850',5)+rect(92,186,9,40,'#80583e',2)+rect(302,186,9,40,'#80583e',2);
      [130,195,260].forEach((x,i)=>{art+=`<ellipse cx="${x}" cy="162" rx="24" ry="7" fill="#fff9e9"/>`+circle(x,152,12,colours[i]);});
      art+=line(191,140,191,128,'#fff9e9',3)+line(203,140,203,128,'#fff9e9',3);
    }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><rect width="400" height="260" fill="${p.surface}"/><g font-family="Calibri,Arial,sans-serif">${art}</g></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  return { featured, definitions, routeFor, profile, normalize, escape, read, write, cleanIds, remember, select, icon, cover };
}));
