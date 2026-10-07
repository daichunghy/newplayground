/**
 * NEWPLAYGROUND PORTAL & RUNTIME ENGINE
 * 100 Curated Games, Responsive UI, Live Search, Audio Unlock & Playable Ca Pho
 */

(function () {
  'use strict';

  // --- STATE ---
  let allGames = [];
  let favorites = JSON.parse(localStorage.getItem('np_favorites') || '[]');
  let currentFilter = 'all';
  let searchQuery = '';

  // --- AUDIO SYNTHESIS FOR ZERO-DEPENDENCY INSTANT SOUND ---
  let audioCtx = null;
  function getAudioContext() {
    if (window.NEWPLAYGROUND_MUTED || (window.NP_Audio && window.NP_Audio.isMuted)) return null;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, gainVal = 0.15) {
    try {
      if (window.NEWPLAYGROUND_MUTED || (window.NP_Audio && window.NP_Audio.isMuted)) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  function playSuccessSound() {
    playTone(523.25, 'sine', 0.1, 0.2); // C5
    setTimeout(() => playTone(659.25, 'sine', 0.15, 0.25), 80); // E5
    setTimeout(() => playTone(783.99, 'sine', 0.25, 0.3), 160); // G5
  }

  function playCoinSound() {
    playTone(987.77, 'triangle', 0.08, 0.2); // B5
    setTimeout(() => playTone(1318.51, 'triangle', 0.15, 0.25), 60); // E6
  }

  function playClickSound() {
    playTone(440, 'sine', 0.04, 0.1);
  }

  function playErrorSound() {
    playTone(220, 'sawtooth', 0.15, 0.2);
    setTimeout(() => playTone(180, 'sawtooth', 0.2, 0.2), 120);
  }

  // --- FETCH / LOAD 100 GAMES ---
  async function loadGames() {
    try {
      const res = await fetch('data/games.json');
      if (!res.ok) throw new Error('Network error');
      allGames = await res.json();
    } catch (e) {
      console.warn('Falling back to embedded dataset or cached storage', e);
      // In case of local file:// restriction
      allGames = window.__NP_GAMES_CACHE__ || [];
    }
    initPortal();
  }

  // --- INIT PORTAL ---
  function initPortal() {
    const allPill = document.querySelector('.filter-pill[data-category="all"]');
    if (allPill) allPill.textContent = `Tất cả (${allGames.length})`;
    updateFavCount();
    renderSections();
    setupEventListeners();
    setupTheme();
    setupSoundControls();
  }

  // --- RENDERING ---
  const COVER_MAP = {
    'ca-pho': 'assets/ca_pho_concept_art.jpg',
    'hang-rong': 'assets/hang_rong_cover.png',
    'dao-vang': 'assets/dao_vang_cover.png',
    'dat-bom': 'assets/dat_bom_cover.png',
    'xe-tang': 'assets/xe_tang_1990_cover.png',
    'gunny': 'assets/gunny_cover.png',
    'lat-the-tri-nho': 'assets/pikachu_cover.png',
    'pikachu': 'assets/pikachu_cover.png',
    'nuoi-ca': 'assets/nuoi_ca_cover.png',
    'nong-trai': 'assets/nong_trai_cover.png',
    'xep-gach': 'assets/tetris_cover.png',
    'tetris': 'assets/tetris_cover.png',
    'plants-vs-zombies': 'assets/pvz_cover.png',
    'feeding': 'assets/ca_lon_nuot_ca_be_cover.png',
    'ban-ga': 'assets/ban_ga_cover.png',
    'ban-trung': 'assets/ban_trung_cover.png',
    'kim-cuong': 'assets/kim_cuong_cover.png',
    'line-98': 'assets/line_98_cover.png',
    'mario': 'assets/mario_cover.png',
    'pac-man': 'assets/pacman_cover.png',
    'zuma': 'assets/zuma_cover.png',
    'diner-dash': 'assets/diner_dash_cover.png',
    'co-tuong': 'assets/co_tuong_cover.png',
    'ban-bi': 'assets/ban_bi_cover.png',
    'danh-bai-uno': 'assets/uno_cover.png',
    'uno': 'assets/uno_cover.png',
    'caro': 'assets/caro_cover.png',
    'co-caro': 'assets/caro_cover.png',
    'do-min': 'assets/do_min_cover.png',
    'minesweeper': 'assets/do_min_cover.png',
    'o-an-quan': 'assets/o_an_quan_cover.png',
    'peggle': 'assets/peggle_cover.png',
    'ran-san-moi': 'assets/snake_cover.png',
    'snake': 'assets/snake_cover.png',
    'boom-online': 'assets/boom_online_cover.jpg',
    'audition': 'assets/audition_cover.jpg',
    'road-rash': 'assets/road_rash_cover.jpg',
    'rockman': 'assets/rockman_cover.jpg',
    'mega-man': 'assets/rockman_cover.jpg',
    'duck-hunt': 'assets/duck_hunt_cover.jpg',
    'street-fighter': 'assets/street_fighter_cover.jpg',
    'bubble-bobble': 'assets/bubble_bobble_cover.jpg',
    'age-of-war': 'assets/age_of_war_cover.jpg',
    'bloxorz': 'assets/bloxorz_cover.jpg'
  };

  function escapeXml(unsafe) {
    return (unsafe || '').replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  // --- PROCEDURAL HIGH-END COVER ART SYSTEM (CALIBRI STANDARD) ---
  function getThumbArt(game) {
    if (COVER_MAP[game.id]) {
      return COVER_MAP[game.id];
    }
    for (const [key, path] of Object.entries(COVER_MAP)) {
      if (game.id.includes(key)) return path;
    }

    const id = (game.id || '').toLowerCase();
    const cat = (game.category || '').toLowerCase();
    const title = game.title || 'Trò Chơi';
    const words = title.split(' ');
    const initials = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();

    // 1. Phân loại Theme Archetype theo từ khóa id và danh mục
    let theme = 'puzzle';
    if (id.includes('ninja') || id.includes('kiem') || id.includes('kung-fu') || id.includes('chem-hoa-qua') || id.includes('rong-den') || id.includes('street-fighter') || id.includes('double-dragon') || id.includes('golden-axe') || id.includes('cadillacs') || id.includes('shinobi') || id.includes('electric-man')) {
      theme = 'ninja';
    } else if (id.includes('dua-xe') || id.includes('excitebike') || id.includes('micro') || id.includes('xe-dung') || id.includes('kart') || id.includes('road-rash')) {
      theme = 'racing';
    } else if (id.includes('ban-sung') || id.includes('heavy-weapon') || id.includes('contra') || id.includes('galaga') || id.includes('rambo') || id.includes('heli') || id.includes('bong-bong-nuoc') || id.includes('ban-ruoi') || id.includes('xe-tang') || id.includes('mega-man') || id.includes('rockman') || id.includes('1942') || id.includes('twinbee') || id.includes('centipede') || id.includes('worms') || id.includes('gun-mayhem')) {
      theme = 'shooter';
    } else if (id.includes('pizza') || id.includes('lemonade') || id.includes('tiem-banh') || id.includes('nau-an') || id.includes('diner') || id.includes('papa')) {
      theme = 'cooking';
    } else if (id.includes('bai') || id.includes('solitaire') || id.includes('freecell') || id.includes('spider') || id.includes('tien-len') || id.includes('co-ca-ngua') || id.includes('co-ty-phu') || id.includes('tam-cuc') || id.includes('bau-cua') || id.includes('uno')) {
      theme = 'cards';
    } else if (id.includes('flappy') || id.includes('angry-birds') || id.includes('typer-shark') || id.includes('dao-rong') || id.includes('cho-qua-duong') || id.includes('ban-ga') || id.includes('duck-hunt') || id.includes('moorhuhn') || id.includes('pooyan') || id.includes('tiny-toon')) {
      theme = 'birds';
    } else if (id.includes('piano') || id.includes('nhac') || id.includes('pinball') || id.includes('audition')) {
      theme = 'music';
    } else if (id.includes('subway') || id.includes('crossy') || id.includes('sonic') || id.includes('chay') || id.includes('giao-bao') || id.includes('mario') || id.includes('adventure-island') || id.includes('fancy-pants') || id.includes('icy-tower') || id.includes('chip-dale')) {
      theme = 'runner';
    } else if (id.includes('nem-lon') || id.includes('tat-lon') || id.includes('keo-co') || id.includes('gap-thu') || id.includes('nem-vong') || id.includes('o-an-quan') || id.includes('ban-bi') || id.includes('snowcraft') || id.includes('bowman')) {
      theme = 'folk';
    } else if (id.includes('among-us') || id.includes('skribbl') || id.includes('bi-lac') || id.includes('dau-vat') || id.includes('dap-chuot') || id.includes('dap-ruoi') || id.includes('boom-online') || id.includes('raft-wars') || id.includes('age-of-war') || id.includes('stick-war') || id.includes('defend-your-castle')) {
      theme = 'party';
    } else if (id.includes('sky-garden') || id.includes('tiem-sach') || id.includes('thoi-bong') || cat.includes('chill') || id.includes('nong-trai') || id.includes('line-rider') || id.includes('bloxorz')) {
      theme = 'chill';
    }

    // 2. Bảng định nghĩa màu sắc và vector minh họa biểu tượng
    const THEME_DEFS = {
      ninja: {
        gradStart: '#991B1B', gradMid: '#4C0519', gradEnd: '#0F172A',
        badgeColor: '#EF4444', badgeText: 'VÕ THUẬT • ACTION',
        accentGlow: 'rgba(239, 68, 68, 0.4)',
        vectorArt: `
          <path d="M 40 160 Q 160 30 290 80" stroke="#FCA5A5" stroke-width="4" fill="none" opacity="0.6"/>
          <path d="M 60 175 Q 180 50 310 95" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.9"/>
          <g transform="translate(230, 75)">
            <path d="M 0 -36 L 9 -9 L 36 0 L 9 9 L 0 36 L -9 9 L -36 0 L -9 -9 Z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2"/>
            <circle cx="0" cy="0" r="7" fill="#1E293B"/>
          </g>
        `
      },
      racing: {
        gradStart: '#C2410C', gradMid: '#7C2D12', gradEnd: '#18181B',
        badgeColor: '#F97316', badgeText: 'TỐC ĐỘ • RACING',
        accentGlow: 'rgba(249, 115, 22, 0.4)',
        vectorArt: `
          <g opacity="0.25">
            <rect x="220" y="20" width="16" height="16" fill="#FFF"/><rect x="236" y="36" width="16" height="16" fill="#FFF"/>
            <rect x="252" y="20" width="16" height="16" fill="#FFF"/><rect x="268" y="36" width="16" height="16" fill="#FFF"/>
          </g>
          <g transform="translate(230, 85)">
            <circle cx="0" cy="0" r="42" fill="none" stroke="#FDBA74" stroke-width="5" stroke-dasharray="180 60"/>
            <line x1="0" y1="0" x2="22" y2="-22" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
            <circle cx="0" cy="0" r="6" fill="#FFF"/>
          </g>
        `
      },
      shooter: {
        gradStart: '#1E293B', gradMid: '#334155', gradEnd: '#0F172A',
        badgeColor: '#38BDF8', badgeText: 'CHIẾN ĐẤU • ARCADE',
        accentGlow: 'rgba(56, 189, 248, 0.4)',
        vectorArt: `
          <g transform="translate(235, 78)">
            <circle cx="0" cy="0" r="38" fill="none" stroke="#38BDF8" stroke-width="2.5" opacity="0.8"/>
            <circle cx="0" cy="0" r="22" fill="none" stroke="#38BDF8" stroke-width="1.5" stroke-dasharray="8 6"/>
            <line x1="-48" y1="0" x2="48" y2="0" stroke="#38BDF8" stroke-width="2"/>
            <line x1="0" y1="-48" x2="0" y2="48" stroke="#38BDF8" stroke-width="2"/>
            <circle cx="0" cy="0" r="4" fill="#EF4444"/>
          </g>
        `
      },
      cooking: {
        gradStart: '#EA580C', gradMid: '#9A3412', gradEnd: '#431407',
        badgeColor: '#FBBF24', badgeText: 'ẨM THỰC • F&B',
        accentGlow: 'rgba(251, 191, 36, 0.4)',
        vectorArt: `
          <g transform="translate(230, 80)">
            <path d="M 0 -38 L 32 30 A 42 42 0 0 1 -32 30 Z" fill="#FBBF24" stroke="#D97706" stroke-width="3"/>
            <circle cx="-6" cy="2" r="5" fill="#DC2626"/>
            <circle cx="12" cy="12" r="5" fill="#DC2626"/>
            <circle cx="-2" cy="20" r="4" fill="#DC2626"/>
            <circle cx="6" cy="-10" r="4" fill="#16A34A"/>
          </g>
        `
      },
      cards: {
        gradStart: '#065F46', gradMid: '#064E3B', gradEnd: '#022C22',
        badgeColor: '#34D399', badgeText: 'BÀI TÂY • BOARD',
        accentGlow: 'rgba(52, 211, 153, 0.4)',
        vectorArt: `
          <g transform="translate(210, 75) rotate(-14)">
            <rect x="-22" y="-32" width="44" height="64" rx="5" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
            <text x="0" y="8" font-family="Calibri, sans-serif" font-weight="900" font-size="28" fill="#DC2626" text-anchor="middle">♥</text>
          </g>
          <g transform="translate(242, 72) rotate(12)">
            <rect x="-22" y="-32" width="44" height="64" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
            <text x="0" y="8" font-family="Calibri, sans-serif" font-weight="900" font-size="28" fill="#1E293B" text-anchor="middle">♠</text>
          </g>
        `
      },
      birds: {
        gradStart: '#CA8A04', gradMid: '#854D0E', gradEnd: '#1C1917',
        badgeColor: '#FACC15', badgeText: 'SINH VẬT • FLYING',
        accentGlow: 'rgba(250, 204, 21, 0.4)',
        vectorArt: `
          <g transform="translate(230, 80)">
            <circle cx="0" cy="0" r="28" fill="#FACC15" stroke="#CA8A04" stroke-width="3"/>
            <circle cx="10" cy="-6" r="9" fill="#FFF"/>
            <circle cx="12" cy="-6" r="4" fill="#000"/>
            <path d="M 18 0 L 34 5 L 18 10 Z" fill="#F97316"/>
            <path d="M -18 2 C -30 -14 -10 -22 -6 -8 Z" fill="#FFFFFF" stroke="#CA8A04" stroke-width="2"/>
          </g>
        `
      },
      music: {
        gradStart: '#6B21A8', gradMid: '#4C1D95', gradEnd: '#1E1B4B',
        badgeColor: '#C084FC', badgeText: 'GIAI ĐIỆU • RHYTHM',
        accentGlow: 'rgba(192, 132, 252, 0.4)',
        vectorArt: `
          <g transform="translate(230, 78)">
            <circle cx="-14" cy="18" r="10" fill="#F472B6"/>
            <circle cx="14" cy="8" r="10" fill="#C084FC"/>
            <path d="M -4 18 L -4 -24 L 24 -34 L 24 8" stroke="#F472B6" stroke-width="4" fill="none"/>
            <path d="M -4 -16 L 24 -26" stroke="#C084FC" stroke-width="4"/>
          </g>
        `
      },
      runner: {
        gradStart: '#1E40AF', gradMid: '#1E3A8A', gradEnd: '#0F172A',
        badgeColor: '#60A5FA', badgeText: 'VƯỢT CHƯỚNG NGẠI',
        accentGlow: 'rgba(96, 165, 250, 0.4)',
        vectorArt: `
          <path d="M 190 120 L 230 40 L 250 40 L 290 120 Z" fill="rgba(255,255,255,0.08)"/>
          <line x1="205" y1="95" x2="275" y2="95" stroke="#FCD34D" stroke-width="3"/>
          <line x1="216" y1="75" x2="264" y2="75" stroke="#FCD34D" stroke-width="3"/>
          <line x1="224" y1="58" x2="256" y2="58" stroke="#FCD34D" stroke-width="2"/>
        `
      },
      folk: {
        gradStart: '#78350F', gradMid: '#451A03', gradEnd: '#1C1917',
        badgeColor: '#F59E0B', badgeText: 'DÂN GIAN TUỔI THƠ',
        accentGlow: 'rgba(245, 158, 11, 0.4)',
        vectorArt: `
          <g transform="translate(230, 80)">
            <ellipse cx="0" cy="-24" rx="20" ry="8" fill="#CBD5E1"/>
            <rect x="-20" y="-24" width="40" height="48" fill="#94A3B8"/>
            <ellipse cx="0" cy="24" rx="20" ry="8" fill="#64748B"/>
            <line x1="-20" y1="0" x2="20" y2="0" stroke="#DC2626" stroke-width="4"/>
          </g>
        `
      },
      party: {
        gradStart: '#991B1B', gradMid: '#4338CA', gradEnd: '#0F172A',
        badgeColor: '#A78BFA', badgeText: 'PARTY • ĐỐI KHÁNG',
        accentGlow: 'rgba(167, 139, 250, 0.4)',
        vectorArt: `
          <g transform="translate(230, 78)">
            <polygon points="0,-32 10,-10 32,-10 14,4 20,26 0,12 -20,26 -14,4 -32,-10 -10,-10" fill="#FBBF24" stroke="#F59E0B" stroke-width="2"/>
            <circle cx="0" cy="2" r="10" fill="#DC2626"/>
          </g>
        `
      },
      chill: {
        gradStart: '#047857', gradMid: '#064E3B', gradEnd: '#022C22',
        badgeColor: '#6EE7B7', badgeText: 'THƯ GIÃN • CHILL',
        accentGlow: 'rgba(110, 231, 183, 0.4)',
        vectorArt: `
          <g transform="translate(230, 85)">
            <ellipse cx="0" cy="18" rx="36" ry="14" fill="#FFFFFF" opacity="0.85"/>
            <path d="M 0 16 Q -2 -14 0 -30 Q 14 -16 0 16" fill="#10B981"/>
            <path d="M 0 -8 Q -16 -18 -8 -2 Z" fill="#34D399"/>
          </g>
        `
      },
      puzzle: {
        gradStart: '#4C1D95', gradMid: '#2563EB', gradEnd: '#0F172A',
        badgeColor: '#60A5FA', badgeText: 'GIẢI ĐỐ • LOGIC',
        accentGlow: 'rgba(96, 165, 250, 0.4)',
        vectorArt: `
          <g transform="translate(230, 78)">
            <rect x="-24" y="-24" width="48" height="48" rx="8" fill="#3B82F6" stroke="#60A5FA" stroke-width="3"/>
            <circle cx="0" cy="-24" r="10" fill="#3B82F6"/>
            <circle cx="24" cy="0" r="10" fill="#3B82F6"/>
          </g>
        `
      }
    };

    const def = THEME_DEFS[theme] || THEME_DEFS.puzzle;

    // 3. Render Procedural SVG (100% Calibri, 320x200, crisp typography & subtle glow)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
        <defs>
          <linearGradient id="bgGrad_${theme}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${def.gradStart}"/>
            <stop offset="60%" stop-color="${def.gradMid}"/>
            <stop offset="100%" stop-color="${def.gradEnd}"/>
          </linearGradient>
          <radialGradient id="centerGlow_${theme}" cx="75%" cy="35%" r="60%">
            <stop offset="0%" stop-color="${def.accentGlow}"/>
            <stop offset="100%" stop-color="transparent"/>
          </radialGradient>
          <linearGradient id="scrimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="transparent"/>
            <stop offset="45%" stop-color="rgba(15, 23, 42, 0.5)"/>
            <stop offset="100%" stop-color="rgba(15, 23, 42, 0.96)"/>
          </linearGradient>
          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
          </pattern>
        </defs>

        <!-- Nền Gradient Đa Tầng -->
        <rect width="320" height="200" fill="url(#bgGrad_${theme})"/>
        <rect width="320" height="200" fill="url(#gridPattern)"/>
        <rect width="320" height="200" fill="url(#centerGlow_${theme})"/>

        <!-- Vòng hào quang trang trí -->
        <circle cx="230" cy="78" r="54" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
        <circle cx="230" cy="78" r="68" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>

        <!-- Vector Art Chủ Đề -->
        ${def.vectorArt}

        <!-- Viết tắt Tiêu Đề Nổi Khối Retro bên trái -->
        <text x="24" y="95" font-family="Calibri, -apple-system, sans-serif" font-weight="900" font-size="48" fill="rgba(255,255,255,0.14)" letter-spacing="-1">${initials}</text>

        <!-- Lớp kính mờ che chân (Scrim Overlay) -->
        <rect y="90" width="320" height="110" fill="url(#scrimGrad)"/>

        <!-- Huy hiệu Phân Loại (Top Badge) -->
        <rect x="18" y="18" width="${Math.min(180, def.badgeText.length * 6.5 + 16)}" height="20" rx="10" fill="rgba(0,0,0,0.5)" stroke="${def.badgeColor}" stroke-width="1"/>
        <circle cx="27" cy="28" r="3.5" fill="${def.badgeColor}"/>
        <text x="36" y="32" font-family="Calibri, -apple-system, sans-serif" font-weight="800" font-size="9.5" fill="#FFFFFF" letter-spacing="0.5">${def.badgeText}</text>

        <!-- Tiêu Đề Trò Chơi Tiếng Việt (Calibri Sắc Nét) -->
        <text x="18" y="162" font-family="Calibri, -apple-system, sans-serif" font-weight="900" font-size="16.5" fill="#FFFFFF">${escapeXml(title)}</text>
        <text x="18" y="182" font-family="Calibri, -apple-system, sans-serif" font-weight="700" font-size="11.5" fill="#94A3B8">NewPlayground Classic • Bấm để chơi</text>
      </svg>
    `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function createGameCard(game) {
    const isLiked = favorites.includes(game.id);
    const card = document.createElement('div');
    card.className = 'game-card';
    card.setAttribute('data-id', game.id);
    card.setAttribute('data-category', game.category);

    card.innerHTML = `
      <div class="game-card-thumb">
        <img src="${getThumbArt(game)}" alt="${game.title}" class="game-thumb-art" loading="lazy">
        <button class="game-card-heart-btn ${isLiked ? 'liked' : ''}" title="${isLiked ? 'Bỏ thích' : 'Yêu thích'}" data-heart-id="${game.id}">
          ${isLiked ? '❤️' : '🤍'}
        </button>
        <span class="game-card-badge">${game.badge || game.category}</span>
      </div>
      <div class="game-card-body">
        <h4 class="game-card-title">${game.title}</h4>
        <p class="game-card-tagline">${game.tagline}</p>
        <div class="game-card-footer">
          <span class="game-card-category">${game.category}</span>
          <span class="game-card-duration">${game.duration}</span>
        </div>
      </div>
    `;

    // Heart click
    const heartBtn = card.querySelector('.game-card-heart-btn');
    heartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(game.id);
    });

    // Card click -> Open Game Modal
    card.addEventListener('click', () => {
      openGameModal(game);
    });

    return card;
  }

  function renderSections() {
    const gridHot = document.getElementById('gridHot');
    const gridQuick = document.getElementById('gridQuick');
    const gridFriends = document.getElementById('gridFriends');
    const gridAll = document.getElementById('gridAll');

    if (gridHot) gridHot.innerHTML = '';
    if (gridQuick) gridQuick.innerHTML = '';
    if (gridFriends) gridFriends.innerHTML = '';
    if (gridAll) gridAll.innerHTML = '';

    // Filter games for hot, quick, friends
    const hotGames = allGames.filter(g => g.section === 'hot').slice(0, 6);
    const quickGames = allGames.filter(g => g.section === 'quick').slice(0, 6);
    const friendsGames = allGames.filter(g => g.section === 'friends').slice(0, 6);

    hotGames.forEach(g => gridHot && gridHot.appendChild(createGameCard(g)));
    quickGames.forEach(g => gridQuick && gridQuick.appendChild(createGameCard(g)));
    friendsGames.forEach(g => gridFriends && gridFriends.appendChild(createGameCard(g)));

    renderFilteredAll();
  }

  function renderFilteredAll() {
    const gridAll = document.getElementById('gridAll');
    const noResultsBlock = document.getElementById('noResultsBlock');
    const resultsCount = document.getElementById('resultsCount');
    const allSectionTitle = document.getElementById('allSectionTitle');
    if (!gridAll) return;

    gridAll.innerHTML = '';

    let filtered = allGames;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(g => 
        g.title.toLowerCase().includes(q) ||
        g.tagline.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        (g.mechanic && g.mechanic.toLowerCase().includes(q))
      );
    }

    // Category / Tag filter
    if (currentFilter === 'hot') {
      filtered = filtered.filter(g => g.section === 'hot');
    } else if (currentFilter === 'quick') {
      filtered = filtered.filter(g => g.section === 'quick');
    } else if (currentFilter === 'friends') {
      filtered = filtered.filter(g => g.section === 'friends');
    } else if (currentFilter === 'fav') {
      filtered = filtered.filter(g => favorites.includes(g.id));
    } else if (currentFilter !== 'all') {
      filtered = filtered.filter(g => g.category.toLowerCase() === currentFilter.toLowerCase());
    }

    if (filtered.length === 0) {
      if (noResultsBlock) noResultsBlock.style.display = 'block';
    } else {
      if (noResultsBlock) noResultsBlock.style.display = 'none';
      filtered.forEach(g => gridAll.appendChild(createGameCard(g)));
    }

    if (resultsCount) resultsCount.textContent = `${filtered.length} game`;
    if (allSectionTitle) {
      if (searchQuery) {
        allSectionTitle.textContent = `Kết quả tìm kiếm cho "${searchQuery}"`;
      } else if (currentFilter === 'fav') {
        allSectionTitle.textContent = `Trò chơi đã thích (${filtered.length})`;
      } else if (currentFilter !== 'all') {
        allSectionTitle.textContent = `Danh mục: ${currentFilter} (${filtered.length})`;
      } else {
        allSectionTitle.textContent = `Tất cả trò chơi (100)`;
      }
    }
  }

  // --- FAVORITES ---
  function toggleFavorite(id) {
    playClickSound();
    if (favorites.includes(id)) {
      favorites = favorites.filter(favId => favId !== id);
      showToast('Đã bỏ khỏi danh sách yêu thích');
    } else {
      favorites.push(id);
      showToast('Đã lưu vào danh sách yêu thích ❤️');
    }
    localStorage.setItem('np_favorites', JSON.stringify(favorites));
    updateFavCount();
    renderSections();
  }

  function updateFavCount() {
    const countEl = document.getElementById('favCount');
    if (countEl) countEl.textContent = favorites.length;
  }

  // --- TOAST ---
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toastBox');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }
  window.showToastNotification = showToast;

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const resetSearchBtn = document.getElementById('resetSearchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (clearSearchBtn) clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderFilteredAll();
        // Auto scroll to results if searching
        if (searchQuery.length === 1) {
          document.getElementById('sectionAll')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderFilteredAll();
      });
    }

    if (resetSearchBtn) {
      resetSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        currentFilter = 'all';
        updateFilterPillsUI('all');
        renderFilteredAll();
      });
    }

    // Filter pills
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        playClickSound();
        const cat = pill.getAttribute('data-category');
        currentFilter = cat;
        updateFilterPillsUI(cat);
        renderFilteredAll();
        document.getElementById('sectionAll')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // View all buttons
    document.querySelectorAll('.section-view-all').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        currentFilter = target;
        updateFilterPillsUI(target);
        renderFilteredAll();
        document.getElementById('sectionAll')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Random Game Picker
    const randomGameBtn = document.getElementById('randomGameBtn');
    if (randomGameBtn) {
      randomGameBtn.addEventListener('click', () => {
        playSuccessSound();
        const randomIndex = Math.floor(Math.random() * allGames.length);
        const randomGame = allGames[randomIndex];
        showToast(`🎲 Đã chọn: ${randomGame.title}!`);
        openGameModal(randomGame);
      });
    }

    // Hero buttons
    document.getElementById('heroPlayBtn')?.addEventListener('click', () => {
      playSuccessSound();
      const hangRong = allGames.find(g => g.id === 'hang-rong') || allGames[0];
      openGameModal(hangRong);
    });

    document.getElementById('heroBrowseBtn')?.addEventListener('click', () => {
      playClickSound();
      document.getElementById('sectionAll')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('playCaPhoBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      playSuccessSound();
      const hangRong = allGames.find(g => g.id === 'hang-rong') || allGames[0];
      openGameModal(hangRong);
    });

    document.getElementById('featuredHeroCard')?.addEventListener('click', () => {
      const hangRong = allGames.find(g => g.id === 'hang-rong') || allGames[0];
      openGameModal(hangRong);
    });

    // Modal close
    document.getElementById('closeModalBtn')?.addEventListener('click', closeGameModal);
    document.getElementById('closeModalBackdrop')?.addEventListener('click', closeGameModal);
    document.getElementById('closeDonateBtn')?.addEventListener('click', closeDonateModal);
    document.getElementById('closeDonateBackdrop')?.addEventListener('click', closeDonateModal);

    // Donate buttons
    document.getElementById('openDonateModalBtn')?.addEventListener('click', () => {
      playClickSound();
      document.getElementById('donateModal').style.display = 'flex';
    });

    // Mobile nav
    document.getElementById('mNavHome')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveBottomNav('mNavHome');
    });
    document.getElementById('mNavSearch')?.addEventListener('click', () => {
      document.getElementById('searchInput')?.focus();
      document.getElementById('sectionAll')?.scrollIntoView({ behavior: 'smooth' });
      setActiveBottomNav('mNavSearch');
    });
    document.getElementById('mNavFriends')?.addEventListener('click', () => {
      document.getElementById('sectionFriends')?.scrollIntoView({ behavior: 'smooth' });
      setActiveBottomNav('mNavFriends');
    });
    document.getElementById('mNavFav')?.addEventListener('click', () => {
      currentFilter = 'fav';
      updateFilterPillsUI('fav');
      renderFilteredAll();
      document.getElementById('sectionAll')?.scrollIntoView({ behavior: 'smooth' });
      setActiveBottomNav('mNavFav');
    });

    // Fullscreen controller
    const fsBtn = document.getElementById('fullscreenGameBtn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        playClickSound();
        const modalWin = document.querySelector('.modal-window');
        if (!modalWin) return;
        if (!document.fullscreenElement) {
          modalWin.requestFullscreen?.().catch(() => {
            showToast('Trình duyệt không hỗ trợ toàn màn hình.');
          });
          fsBtn.textContent = '🗗';
          fsBtn.title = 'Thu nhỏ (Thoát toàn màn hình)';
        } else {
          document.exitFullscreen?.();
          fsBtn.textContent = '⛶';
          fsBtn.title = 'Toàn màn hình';
        }
      });
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && fsBtn) {
          fsBtn.textContent = '⛶';
          fsBtn.title = 'Toàn màn hình';
        }
      });
    }

    // CRT Scanlines toggle
    const crtBtn = document.getElementById('crtToggleBtn');
    let crtEnabled = localStorage.getItem('np_crt') === 'true';
    function updateCrtState(active) {
      crtEnabled = active;
      try { localStorage.setItem('np_crt', crtEnabled ? 'true' : 'false'); } catch (e) {}
      if (crtBtn) {
        crtBtn.classList.toggle('active', crtEnabled);
        crtBtn.title = crtEnabled ? 'Hiệu ứng CRT Scanlines: Đang bật 📺' : 'Hiệu ứng CRT Scanlines: Đang tắt 📺';
      }
      document.querySelectorAll('.canvas-game-box').forEach(box => {
        box.classList.toggle('crt-active', crtEnabled);
      });
    }
    if (crtBtn) {
      crtBtn.addEventListener('click', () => {
        playClickSound();
        updateCrtState(!crtEnabled);
        showToast(crtEnabled ? 'Đã bật hiệu ứng CRT hoài cổ 📺' : 'Đã tắt hiệu ứng CRT');
      });
      updateCrtState(crtEnabled);
    }

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeGameModal();
        closeDonateModal();
      }
    });
  }

  function setActiveBottomNav(id) {
    document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
  }

  function updateFilterPillsUI(cat) {
    document.querySelectorAll('.filter-pill').forEach(pill => {
      if (pill.getAttribute('data-category') === cat) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  // --- THEME TOGGLE ---
  function setupTheme() {
    const savedTheme = localStorage.getItem('np_theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
      updateThemeIcon(true);
    }
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        playClickSound();
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('np_theme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);
      });
    }
  }

  function updateThemeIcon(isDark) {
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = isDark ? '🌙' : '☀️';
  }

  // --- SOUND TOGGLE (MUTE BY DEFAULT WHILE WORKING) ---
  function setupSoundControls() {
    function updateSoundIcons(muted) {
      const icon = muted ? '🔇' : '🔊';
      const title = muted ? 'Bật âm thanh (Hiện đang tắt)' : 'Tắt âm thanh (Hiện đang bật)';
      const headerBtn = document.getElementById('soundToggleBtn');
      if (headerBtn) {
        headerBtn.setAttribute('title', title);
        const iconSpan = headerBtn.querySelector('.sound-icon');
        if (iconSpan) iconSpan.textContent = icon;
      }
      const modalBtn = document.getElementById('modalSoundToggleBtn');
      if (modalBtn) {
        modalBtn.setAttribute('title', title);
        modalBtn.textContent = icon;
      }
    }

    function toggleSound() {
      if (window.NP_Audio && typeof window.NP_Audio.toggleMute === 'function') {
        const isMuted = window.NP_Audio.toggleMute();
        updateSoundIcons(isMuted);
      } else {
        window.NEWPLAYGROUND_MUTED = !window.NEWPLAYGROUND_MUTED;
        try {
          localStorage.setItem('np_muted', window.NEWPLAYGROUND_MUTED ? 'true' : 'false');
        } catch (e) {}
        updateSoundIcons(window.NEWPLAYGROUND_MUTED);
      }
    }

    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', toggleSound);
    }
    const modalSoundBtn = document.getElementById('modalSoundToggleBtn');
    if (modalSoundBtn) {
      modalSoundBtn.addEventListener('click', toggleSound);
    }

    const isMuted = window.NEWPLAYGROUND_MUTED !== false;
    updateSoundIcons(isMuted);
  }

  // --- GAME MODAL & RUNTIME ---
  let gameInterval = null;

  function openGameModal(game) {
    playClickSound();
    const modal = document.getElementById('gameModal');
    const title = document.getElementById('modalGameTitle');
    const badge = document.getElementById('modalGameBadge');
    const container = document.getElementById('modalGameContainer');

    title.textContent = game.title;
    badge.textContent = game.category;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Cleanup previous runs if any
    const cleanupAllEngines = () => {
      if (typeof window.__currentHangRongCleanup === 'function') window.__currentHangRongCleanup();
      if (typeof window.__currentDaoVangCleanup === 'function') window.__currentDaoVangCleanup();
      if (typeof window.__currentBanTrungCleanup === 'function') window.__currentBanTrungCleanup();
      if (typeof window.__currentKimCuongCleanup === 'function') window.__currentKimCuongCleanup();
      if (typeof window.__currentDatBomCleanup === 'function') window.__currentDatBomCleanup();
      if (typeof window.__currentXeTangCleanup === 'function') window.__currentXeTangCleanup();
      if (typeof window.__currentCaroCleanup === 'function') window.__currentCaroCleanup();
      if (typeof window.__currentSnakeCleanup === 'function') window.__currentSnakeCleanup();
      if (typeof window.__currentTetrisCleanup === 'function') window.__currentTetrisCleanup();
      if (typeof window.__currentFlappyCleanup === 'function') window.__currentFlappyCleanup();
      if (typeof window.__currentFruitCleanup === 'function') window.__currentFruitCleanup();
      if (typeof window.__currentDoMinCleanup === 'function') window.__currentDoMinCleanup();
      if (typeof window.__currentPikachuCleanup === 'function') window.__currentPikachuCleanup();
      if (typeof window.__currentPacManCleanup === 'function') window.__currentPacManCleanup();
      if (typeof window.__currentMarioCleanup === 'function') window.__currentMarioCleanup();
      if (typeof window.__currentGunnyCleanup === 'function') window.__currentGunnyCleanup();
      if (typeof window.__currentNongTraiCleanup === 'function') window.__currentNongTraiCleanup();
      if (typeof window.__currentFeedingCleanup === 'function') window.__currentFeedingCleanup();
      if (typeof window.__currentPvZCleanup === 'function') window.__currentPvZCleanup();
      if (typeof window.__currentChickenCleanup === 'function') window.__currentChickenCleanup();
      if (typeof window.__current2048Cleanup === 'function') window.__current2048Cleanup();
      if (typeof window.__currentDXBallCleanup === 'function') window.__currentDXBallCleanup();
      if (typeof window.__currentSokobanCleanup === 'function') window.__currentSokobanCleanup();
      if (typeof window.__currentOAnQuanCleanup === 'function') window.__currentOAnQuanCleanup();
      if (typeof window.__currentNuoiCaCleanup === 'function') window.__currentNuoiCaCleanup();
      if (typeof window.__currentPongCleanup === 'function') window.__currentPongCleanup();
      if (typeof window.__currentZumaCleanup === 'function') window.__currentZumaCleanup();
      if (typeof window.__currentDinerCleanup === 'function') window.__currentDinerCleanup();
      if (typeof window.__currentCoTuongCleanup === 'function') window.__currentCoTuongCleanup();
      if (typeof window.__currentBanBiCleanup === 'function') window.__currentBanBiCleanup();
      if (typeof window.__currentUnoCleanup === 'function') window.__currentUnoCleanup();
      if (typeof window.__currentArcadeCleanup === 'function') window.__currentArcadeCleanup();
      if (typeof window.__currentBoomOnlineCleanup === 'function') window.__currentBoomOnlineCleanup();
      if (typeof window.__currentAuditionCleanup === 'function') window.__currentAuditionCleanup();
      if (typeof window.__currentRoadRashCleanup === 'function') window.__currentRoadRashCleanup();
      if (typeof window.__currentMegaManCleanup === 'function') window.__currentMegaManCleanup();
      if (typeof window.__currentDuckHuntCleanup === 'function') window.__currentDuckHuntCleanup();
      if (typeof window.__currentStreetFighterCleanup === 'function') window.__currentStreetFighterCleanup();
      if (typeof window.__currentBloxorzCleanup === 'function') window.__currentBloxorzCleanup();
      if (typeof window.__currentAgeOfWarCleanup === 'function') window.__currentAgeOfWarCleanup();
      if (typeof window.__currentBubbleBobbleCleanup === 'function') window.__currentBubbleBobbleCleanup();
      if (typeof window.__currentRaftWarsCleanup === 'function') window.__currentRaftWarsCleanup();
      if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') window.NP_Audio.stopBGM();
    };
    cleanupAllEngines();

    const gId = (game.id || '').toLowerCase();
    if (window.NP_Retro50Engines && window.NP_Retro50Engines.hasGame(game.id)) {
      window.NP_Retro50Engines.launchGame(container, game);
    } else if (window.NP_Engines) {
      if (gId.includes('hang-rong') || gId.includes('ca-pho')) {
        window.NP_Engines.launchHangRong(container, game);
      } else if (gId.includes('dao-vang') || gId.includes('gold-miner')) {
        window.NP_Engines.launchDaoVang(container, game);
      } else if (gId.includes('pac-man')) {
        window.NP_Engines.launchPacMan(container, game);
      } else if (gId.includes('mario') || gId.includes('sonic') || gId.includes('subway') || gId.includes('paperboy')) {
        window.NP_Engines.launchMario(container, game);
      } else if (gId.includes('gunny') || gId.includes('cung') || gId.includes('angry-birds')) {
        window.NP_Engines.launchGunny(container, game);
      } else if (gId.includes('nong-trai') || gId.includes('sky-garden') || gId.includes('vuon')) {
        window.NP_Engines.launchNongTrai(container, game);
      } else if (gId.includes('feeding') || gId.includes('ca-lon') || gId.includes('nuot-ca')) {
        window.NP_Engines.launchFeedingFrenzy(container, game);
      } else if (gId.includes('nuoi-ca') || gId.includes('nemo') || gId.includes('insaniquarium') || gId.includes('dao-rong')) {
        window.NP_Engines.launchNuoiCaNemo(container, game);
      } else if (gId.includes('zuma')) {
        window.NP_Engines.launchZuma(container, game);
      } else if (gId.includes('diner')) {
        window.NP_Engines.launchDinerDash(container, game);
      } else if (gId.includes('co-tuong')) {
        window.NP_Engines.launchCoTuong(container, game);
      } else if (gId.includes('ban-bi')) {
        window.NP_Engines.launchBanBiVe(container, game);
      } else if (gId.includes('danh-bai') || gId.includes('uno')) {
        window.NP_Engines.launchDanhBaiUno(container, game);
      } else if (gId.includes('plants') || gId.includes('zombie') || gId.includes('bloons') || gId.includes('thu-thanh')) {
        window.NP_Engines.launchPvZ(container, game);
      } else if (gId.includes('ban-ga') || gId.includes('galaga') || gId.includes('ban-ruoi') || gId.includes('chicken')) {
        window.NP_Engines.launchChickenInvaders(container, game);
      } else if (gId.includes('pha-gach') || gId.includes('dx-ball') || gId.includes('arkanoid') || gId.includes('peggle')) {
        window.NP_Engines.launchDXBall(container, game);
      } else if (gId.includes('2048')) {
        window.NP_Engines.launchGame2048(container, game);
      } else if (gId.includes('sokoban') || gId.includes('day-thung') || gId.includes('ha-noi')) {
        window.NP_Engines.launchSokoban(container, game);
      } else if (gId.includes('o-an-quan')) {
        window.NP_Engines.launchOAnQuan(container, game);
      } else if (gId.includes('pong') || gId.includes('bi-lac') || gId.includes('bong-ban')) {
        window.NP_Engines.launchPong(container, game);
      } else if (gId.includes('line-98')) {
        window.NP_Engines.launchLine98(container, game);
      } else if (gId.includes('ban-trung') || gId.includes('dynomite') || gId.includes('bobble')) {
        window.NP_Engines.launchBanTrung(container, game);
      } else if (gId.includes('kim-cuong') || gId.includes('bejeweled') || gId.includes('chuzzle')) {
        window.NP_Engines.launchKimCuong(container, game);
      } else if (gId.includes('dat-bom') || gId.includes('bomberman')) {
        window.NP_Engines.launchDatBom(container, game);
      } else if (gId.includes('xe-tang') || gId.includes('battle-city') || gId.includes('tank-1990') || gId.includes('heavy-weapon')) {
        window.NP_Engines.launchXeTang1990(container, game);
      } else if (gId.includes('caro')) {
        window.NP_Engines.launchCaro(container, game);
      } else if (gId.includes('ran-san-moi') || gId.includes('snake')) {
        window.NP_Engines.launchSnake(container, game);
      } else if (gId.includes('xep-gach') || gId.includes('tetris') || gId.includes('dr-mario')) {
        window.NP_Engines.launchTetris(container, game);
      } else if (gId.includes('flappy')) {
        window.NP_Engines.launchFlappyBird(container, game);
      } else if (gId.includes('chem-hoa-qua') || gId.includes('fruit-ninja')) {
        window.NP_Engines.launchFruitNinja(container, game);
      } else if (gId.includes('do-min') || gId.includes('minesweeper')) {
        window.NP_Engines.launchDoMin(container, game);
      } else if (gId.includes('pikachu') || gId.includes('lat-the') || gId.includes('noi-hinh')) {
        window.NP_Engines.launchPikachu(container, game);
      } else {
        window.NP_Engines.launchRetroArcade(container, game);
      }
      launchGameSandbox(container, game);
    }

    // Apply CRT state if active
    if (localStorage.getItem('np_crt') === 'true') {
      container.querySelectorAll('.canvas-game-box').forEach(box => box.classList.add('crt-active'));
    }
    // Apply vector mode to smooth canvas vector games
    const isVectorGame = ['zuma', 'co-tuong', 'ban-bi', 'uno', 'dao-vang', 'line-98', 'diner'].some(k => gId.includes(k));
    if (isVectorGame) {
      container.querySelectorAll('canvas').forEach(c => c.classList.add('canvas-vector-mode'));
    }
  }

  function closeGameModal() {
    const modal = document.getElementById('gameModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    clearInterval(gameInterval);
    if (typeof window.__currentHangRongCleanup === 'function') window.__currentHangRongCleanup();
    if (typeof window.__currentDaoVangCleanup === 'function') window.__currentDaoVangCleanup();
    if (typeof window.__currentBanTrungCleanup === 'function') window.__currentBanTrungCleanup();
    if (typeof window.__currentKimCuongCleanup === 'function') window.__currentKimCuongCleanup();
    if (typeof window.__currentDatBomCleanup === 'function') window.__currentDatBomCleanup();
    if (typeof window.__currentXeTangCleanup === 'function') window.__currentXeTangCleanup();
    if (typeof window.__currentCaroCleanup === 'function') window.__currentCaroCleanup();
    if (typeof window.__currentSnakeCleanup === 'function') window.__currentSnakeCleanup();
    if (typeof window.__currentTetrisCleanup === 'function') window.__currentTetrisCleanup();
    if (typeof window.__currentFlappyCleanup === 'function') window.__currentFlappyCleanup();
    if (typeof window.__currentFruitCleanup === 'function') window.__currentFruitCleanup();
    if (typeof window.__currentDoMinCleanup === 'function') window.__currentDoMinCleanup();
    if (typeof window.__currentPikachuCleanup === 'function') window.__currentPikachuCleanup();
    if (typeof window.__currentPacManCleanup === 'function') window.__currentPacManCleanup();
    if (typeof window.__currentMarioCleanup === 'function') window.__currentMarioCleanup();
    if (typeof window.__currentGunnyCleanup === 'function') window.__currentGunnyCleanup();
    if (typeof window.__currentNongTraiCleanup === 'function') window.__currentNongTraiCleanup();
    if (typeof window.__currentFeedingCleanup === 'function') window.__currentFeedingCleanup();
    if (typeof window.__currentPvZCleanup === 'function') window.__currentPvZCleanup();
    if (typeof window.__currentChickenCleanup === 'function') window.__currentChickenCleanup();
    if (typeof window.__current2048Cleanup === 'function') window.__current2048Cleanup();
    if (typeof window.__currentDXBallCleanup === 'function') window.__currentDXBallCleanup();
    if (typeof window.__currentSokobanCleanup === 'function') window.__currentSokobanCleanup();
    if (typeof window.__currentOAnQuanCleanup === 'function') window.__currentOAnQuanCleanup();
    if (typeof window.__currentNuoiCaCleanup === 'function') window.__currentNuoiCaCleanup();
    if (typeof window.__currentPongCleanup === 'function') window.__currentPongCleanup();
    if (typeof window.__currentZumaCleanup === 'function') window.__currentZumaCleanup();
    if (typeof window.__currentDinerCleanup === 'function') window.__currentDinerCleanup();
    if (typeof window.__currentCoTuongCleanup === 'function') window.__currentCoTuongCleanup();
    if (typeof window.__currentBanBiCleanup === 'function') window.__currentBanBiCleanup();
    if (typeof window.__currentUnoCleanup === 'function') window.__currentUnoCleanup();
    if (typeof window.__currentArcadeCleanup === 'function') window.__currentArcadeCleanup();
    if (window.NP_Audio && typeof window.NP_Audio.stopBGM === 'function') window.NP_Audio.stopBGM();
  }

  function closeDonateModal() {
    const modal = document.getElementById('donateModal');
    if (modal) modal.style.display = 'none';
  }

  // --- PLAYABLE HÀNG RONG (STREET STALL) GAME ENGINE ---
  function launchPlayableHangRong(container, game) {
    let coins = 50;
    let shiftSeconds = 180;
    let customersServed = 0;
    let customersMissed = 0;
    let tray = []; // Food on tray
    const maxTray = 2;

    const recipes = [
      { id: 'banhmi', name: 'Bánh Mì Pate', icon: '🥖', cost: 4, price: 12, time: 2 },
      { id: 'nuocmia', name: 'Nước Mía Đá', icon: '🥤', cost: 6, price: 18, time: 3 },
      { id: 'cavien', name: 'Cá Viên Chiên', icon: '🍢', cost: 10, price: 25, time: 4 }
    ];

    let customers = [
      { id: 1, name: 'Bác xe ôm', avatar: '🛵', order: recipes[0], patience: 100, maxPatience: 100 },
      { id: 2, name: 'Chị văn phòng', avatar: '👩‍💼', order: recipes[1], patience: 80, maxPatience: 80 }
    ];

    container.innerHTML = `
      <div class="game-viewport">
        <div class="game-hud">
          <div class="hud-stat">
            <span>⏱️ Giờ bán:</span>
            <span class="hud-value" id="hudTimer">${shiftSeconds}s</span>
          </div>
          <div class="hud-stat">
            <span>🪙 Vốn liếng:</span>
            <span class="hud-value" id="hudCoins">${coins} xu</span>
          </div>
          <div class="hud-stat">
            <span>⭐ Đã bán:</span>
            <span class="hud-value" id="hudServed">${customersServed}</span>
          </div>
        </div>

        <div class="game-stage-area">
          <div class="customer-counter-row" id="customerRow">
            <!-- Customer cards rendered here -->
          </div>

          <div class="stall-workbench-row">
            <div class="tray-status-bar">
              <span>Khay thành phẩm (${tray.length}/${maxTray}):</span>
              <div class="tray-slots-list" id="traySlots">
                <!-- Tray items -->
              </div>
            </div>

            <div class="dishes-selection-grid">
              ${recipes.map(r => `
                <button class="dish-cook-btn" data-recipe="${r.id}">
                  <span class="dish-icon">${r.icon}</span>
                  <span class="dish-name">${r.name}</span>
                  <span class="dish-price">${r.price} xu (Nấu ${r.time}s)</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: center;">
        <small style="color: var(--text-muted);">💡 Hướng dẫn: Bấm món để nấu đặt lên khay ➔ Bấm vào khách để phục vụ trước khi hết kiên nhẫn!</small>
        <button class="btn btn-secondary" id="saveShiftBtn">Lưu tiến trình 💾</button>
      </div>
    `;

    function updateHUD() {
      const timerEl = document.getElementById('hudTimer');
      const coinsEl = document.getElementById('hudCoins');
      const servedEl = document.getElementById('hudServed');
      if (timerEl) timerEl.textContent = `${shiftSeconds}s`;
      if (coinsEl) coinsEl.textContent = `${coins} xu`;
      if (servedEl) servedEl.textContent = `${customersServed}`;
    }

    function renderCustomers() {
      const row = document.getElementById('customerRow');
      if (!row) return;
      row.innerHTML = customers.map(c => `
        <div class="customer-slot" data-cust-id="${c.id}">
          <div class="customer-avatar">${c.avatar}</div>
          <div class="customer-order-bubble">${c.order.icon} ${c.order.name}</div>
          <div class="patience-bar">
            <div class="patience-fill" style="width: ${(c.patience / c.maxPatience) * 100}%; background-color: ${c.patience < 30 ? '#EF4444' : '#10B981'};"></div>
          </div>
        </div>
      `).join('');

      // Add click to serve
      row.querySelectorAll('.customer-slot').forEach(slot => {
        slot.addEventListener('click', () => {
          const custId = parseInt(slot.getAttribute('data-cust-id'));
          serveCustomer(custId);
        });
      });
    }

    function renderTray() {
      const traySlots = document.getElementById('traySlots');
      if (!traySlots) return;
      let html = '';
      for (let i = 0; i < maxTray; i++) {
        const item = tray[i];
        html += `<div class="tray-box" data-tray-idx="${i}" title="${item ? 'Bấm để vứt nếu nấu nhầm' : 'Khay trống'}">${item ? item.icon : ''}</div>`;
      }
      traySlots.innerHTML = html;

      // Click tray item to discard (waste)
      traySlots.querySelectorAll('.tray-box').forEach(box => {
        box.addEventListener('click', () => {
          const idx = parseInt(box.getAttribute('data-tray-idx'));
          if (tray[idx]) {
            playErrorSound();
            showToast(`Đã bỏ ${tray[idx].name} (Lãng phí -${tray[idx].cost} xu)`);
            coins = Math.max(0, coins - tray[idx].cost);
            tray.splice(idx, 1);
            renderTray();
            updateHUD();
          }
        });
      });
    }

    function cookDish(recipeId) {
      if (tray.length >= maxTray) {
        playErrorSound();
        showToast('Khay đã đầy! Hãy phục vụ khách hoặc bấm khay để bỏ.');
        return;
      }
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) return;

      playClickSound();
      showToast(`Đang nấu ${recipe.name}...`);
      setTimeout(() => {
        if (tray.length < maxTray) {
          tray.push(recipe);
          playCoinSound();
          renderTray();
        }
      }, recipe.time * 500); // Fast simulation for fun
    }

    function serveCustomer(custId) {
      const custIndex = customers.findIndex(c => c.id === custId);
      if (custIndex === -1) return;
      const cust = customers[custIndex];

      const matchingTrayIndex = tray.findIndex(item => item.id === cust.order.id);
      if (matchingTrayIndex !== -1) {
        // Correct order!
        tray.splice(matchingTrayIndex, 1);
        coins += cust.order.price;
        customersServed++;
        playSuccessSound();
        showToast(`Tuyệt vời! +${cust.order.price} xu từ ${cust.name}!`);
        customers.splice(custIndex, 1);
        renderTray();
        renderCustomers();
        updateHUD();
      } else {
        playErrorSound();
        showToast(`Khách cần ${cust.order.name}, trên khay chưa có!`);
      }
    }

    // Bind cook buttons
    container.querySelectorAll('.dish-cook-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipeId = btn.getAttribute('data-recipe');
        cookDish(recipeId);
      });
    });

    document.getElementById('saveShiftBtn')?.addEventListener('click', () => {
      playSuccessSound();
      localStorage.setItem('np_capho_save', JSON.stringify({ coins, customersServed, savedAt: new Date().toISOString() }));
      showToast('Đã lưu tiến trình thành công vào trình duyệt! 💾');
    });

    // Start game tick loop
    renderCustomers();
    renderTray();
    updateHUD();

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
      shiftSeconds--;
      if (shiftSeconds <= 0) {
        clearInterval(gameInterval);
        playSuccessSound();
        showToast(`🎉 Ca bán kết thúc! Bạn kiếm được ${coins} xu và phục vụ ${customersServed} khách!`);
        return;
      }

      // Decay customer patience
      customers.forEach(c => {
        c.patience -= 4;
      });

      // Remove angry customers
      const angryCustomers = customers.filter(c => c.patience <= 0);
      if (angryCustomers.length > 0) {
        playErrorSound();
        customersMissed += angryCustomers.length;
        customers = customers.filter(c => c.patience > 0);
        showToast('Một khách đã rời đi vì hết kiên nhẫn! 😢');
      }

      // Spawn new customer if space
      if (customers.length < 2 && Math.random() < 0.3) {
        const rIndex = Math.floor(Math.random() * recipes.length);
        const avatars = [
          { name: 'Bác xe ôm', avatar: '🛵' },
          { name: 'Cô công sở', avatar: '👩‍💼' },
          { name: 'Cậu sinh viên', avatar: '🎒' },
          { name: 'Bé học sinh', avatar: '🚲' }
        ];
        const aIndex = Math.floor(Math.random() * avatars.length);
        customers.push({
          id: Date.now() + Math.random(),
          name: avatars[aIndex].name,
          avatar: avatars[aIndex].avatar,
          order: recipes[rIndex],
          patience: 100,
          maxPatience: 100
        });
      }

      renderCustomers();
      updateHUD();
    }, 1000);
  }

  // --- UNIVERSAL RETRO ARCADE RUNNER (REAL PLAYABLE GAME FOR ALL GAMES) ---
  function launchGameSandbox(container, game) {
    if (window.NP_Engines && typeof window.NP_Engines.launchRetroArcade === 'function') {
      window.NP_Engines.launchRetroArcade(container, game);
    }
  }

  // Expose helpers for automation and direct linking
  window.openGameById = function(id) {
    const g = allGames.find(x => x.id === id);
    if (g) {
      openGameModal(g);
      return true;
    }
    return false;
  };
  window.closeGameModal = closeGameModal;

  // --- START ENTRY ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGames);
  } else {
    loadGames();
  }

})();
