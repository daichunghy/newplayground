/* Original shelf-logic campaign for Kệ Sách Ký Ức. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_KeSachKyUcModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BOOKS = Object.freeze([
    { id: 'sao-muoi', title: 'Sao Muối', sigil: '✦', tone: 'ochre' },
    { id: 'may-giay', title: 'Mây Trên Giấy', sigil: '⌁', tone: 'blue' },
    { id: 'da-bac', title: 'Đá Bạc', sigil: '◈', tone: 'plum' },
    { id: 'vuon-dem', title: 'Vườn Đêm', sigil: '✿', tone: 'leaf' },
    { id: 'den-thu', title: 'Đèn Thu', sigil: '◉', tone: 'coral' },
    { id: 'chim-gap', title: 'Chim Gấp Giấy', sigil: '⌑', tone: 'mint' },
    { id: 'bac-cau', title: 'Bậc Cầu Mưa', sigil: '▱', tone: 'sky' },
    { id: 'gom-gio', title: 'Gom Gió', sigil: '≈', tone: 'rust' },
    { id: 'vo-soc', title: 'Vỏ Sò Kể Chuyện', sigil: '⌇', tone: 'sand' },
    { id: 'nuoc-len', title: 'Nước Lên Bậc Đá', sigil: '◌', tone: 'teal' },
    { id: 'tram-mua', title: 'Trạm Mưa Nhỏ', sigil: '⌂', tone: 'violet' },
    { id: 'tieng-go', title: 'Tiếng Gõ Vắng', sigil: '∴', tone: 'gold' },
    { id: 'trang-tim', title: 'Trăng Tím', sigil: '☾', tone: 'indigo' },
    { id: 'mua-rao', title: 'Mưa Rào Trên Hiên', sigil: '⋰', tone: 'aqua' },
    { id: 'hat-mam', title: 'Hạt Mầm Thức Giấc', sigil: '♧', tone: 'green' },
    { id: 'muc-lam', title: 'Mực Lam', sigil: '▰', tone: 'navy' },
    { id: 'den-hien', title: 'Đèn Bên Hiên', sigil: '✧', tone: 'amber' },
    { id: 'song-ngu', title: 'Sông Ngủ Muộn', sigil: '∿', tone: 'water' }
  ].map(Object.freeze));

  const BOOK_BY_ID = new Map(BOOKS.map(book => [book.id, book]));
  const STAGES = Object.freeze([
    Object.freeze({
      name: 'Góc Đèn',
      books: Object.freeze(['sao-muoi', 'may-giay', 'da-bac', 'vuon-dem', 'den-thu']),
      answer: Object.freeze(['sao-muoi', 'may-giay', 'da-bac', 'vuon-dem', 'den-thu']),
      budget: 8,
      scramble: 5,
      clues: Object.freeze([
        Object.freeze({ type: 'between', left: 'sao-muoi', middle: 'may-giay', right: 'vuon-dem', text: 'Mây nằm giữa Sao Muối và Vườn Đêm.' }),
        Object.freeze({ type: 'adjacent', left: 'may-giay', right: 'da-bac', text: 'Mây đứng ngay trước Đá Bạc.' }),
        Object.freeze({ type: 'at', book: 'den-thu', position: 5, text: 'Đèn Thu khép lại hàng sách.' })
      ])
    }),
    Object.freeze({
      name: 'Bến Mưa',
      books: Object.freeze(['chim-gap', 'bac-cau', 'gom-gio', 'vo-soc', 'nuoc-len', 'tram-mua']),
      answer: Object.freeze(['chim-gap', 'bac-cau', 'gom-gio', 'vo-soc', 'nuoc-len', 'tram-mua']),
      budget: 12,
      scramble: 7,
      clues: Object.freeze([
        Object.freeze({ type: 'at', book: 'chim-gap', position: 1, text: 'Chim Gấp Giấy mở đầu hàng.' }),
        Object.freeze({ type: 'adjacent', left: 'bac-cau', right: 'gom-gio', text: 'Bậc Cầu Mưa đứng ngay trước Gom Gió.' }),
        Object.freeze({ type: 'before', left: 'gom-gio', right: 'vo-soc', text: 'Gom Gió đứng trước Vỏ Sò Kể Chuyện.' }),
        Object.freeze({ type: 'at', book: 'nuoc-len', position: 5, text: 'Nước Lên Bậc Đá chiếm vị trí thứ năm.' }),
        Object.freeze({ type: 'at', book: 'tram-mua', position: 6, text: 'Trạm Mưa Nhỏ đứng cuối hàng.' })
      ])
    }),
    Object.freeze({
      name: 'Ngăn Trăng',
      books: Object.freeze(['trang-tim', 'mua-rao', 'hat-mam', 'muc-lam', 'den-hien', 'song-ngu', 'tieng-go']),
      answer: Object.freeze(['trang-tim', 'mua-rao', 'hat-mam', 'muc-lam', 'den-hien', 'song-ngu', 'tieng-go']),
      budget: 16,
      scramble: 9,
      clues: Object.freeze([
        Object.freeze({ type: 'at', book: 'trang-tim', position: 1, text: 'Trăng Tím nằm ở đầu hàng.' }),
        Object.freeze({ type: 'at', book: 'muc-lam', position: 4, text: 'Mực Lam chiếm vị trí thứ tư.' }),
        Object.freeze({ type: 'between', left: 'trang-tim', middle: 'mua-rao', right: 'hat-mam', text: 'Mưa Rào nằm giữa Trăng Tím và Hạt Mầm.' }),
        Object.freeze({ type: 'before', left: 'hat-mam', right: 'muc-lam', text: 'Hạt Mầm đứng trước Mực Lam.' }),
        Object.freeze({ type: 'adjacent', left: 'muc-lam', right: 'den-hien', text: 'Đèn Bên Hiên đứng ngay sau Mực Lam.' }),
        Object.freeze({ type: 'adjacent', left: 'song-ngu', right: 'tieng-go', text: 'Sông Ngủ Muộn đứng ngay trước Tiếng Gõ Vắng.' })
      ])
    })
  ]);

  function seedValue(seed) {
    if (Number.isFinite(seed)) return (seed >>> 0) || 1;
    let hash = 2166136261;
    for (const character of String(seed ?? 'ke-sach-ky-uc')) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    return hash || 1;
  }

  function makeRandom(seed) {
    let state = seedValue(seed);
    return () => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function positionOf(order, id) { return order.indexOf(id) + 1; }

  function clueSatisfied(clue, order) {
    const left = positionOf(order, clue.left), right = positionOf(order, clue.right);
    switch (clue.type) {
      case 'at': return positionOf(order, clue.book) === clue.position;
      case 'before': return left > 0 && right > 0 && left < right;
      case 'adjacent': return left > 0 && right === left + 1;
      case 'between': {
        const middle = positionOf(order, clue.middle);
        return left > 0 && middle > left && right > middle;
      }
      default: return false;
    }
  }

  function satisfiesClues(stageOrIndex, order) {
    const stage = Number.isInteger(stageOrIndex) ? STAGES[stageOrIndex] : stageOrIndex;
    return Boolean(stage && Array.isArray(order) && stage.clues.every(clue => clueSatisfied(clue, order)));
  }

  function permutations(items) {
    const result = [], current = [], used = new Set();
    function visit() {
      if (current.length === items.length) { result.push(current.slice()); return; }
      for (const item of items) if (!used.has(item)) {
        used.add(item); current.push(item); visit(); current.pop(); used.delete(item);
      }
    }
    visit();
    return result;
  }

  function solutionsForStage(stageIndex) {
    const stage = STAGES[stageIndex];
    if (!stage) return [];
    return permutations(stage.books).filter(order => satisfiesClues(stage, order));
  }

  function makeStart(stage, seed) {
    const order = stage.answer.slice(), random = makeRandom(seed);
    const rank = new Map(stage.answer.map((id, index) => [id, index]));
    for (let move = 0; move < stage.scramble; move++) {
      // Each adjacent swap increases inversion distance by exactly one, so the
      // advertised scramble length guarantees the same minimum number of moves.
      const choices = [];
      for (let index = 0; index < order.length - 1; index++) {
        if (rank.get(order[index]) < rank.get(order[index + 1])) choices.push(index);
      }
      if (!choices.length) throw new RangeError(`${stage.name} scramble is longer than its adjacent-swap state space.`);
      const index = choices[Math.floor(random() * choices.length)];
      [order[index], order[index + 1]] = [order[index + 1], order[index]];
    }
    return order;
  }

  function create({ seed = 0x4b534b55 } = {}) {
    const campaignSeed = seedValue(seed);
    const starts = STAGES.map((stage, index) => makeStart(stage, campaignSeed ^ Math.imul(index + 1, 0x9e3779b9)));
    let stageIndex = 0, order = starts[0].slice(), moves = 0, status = 'playing';

    function currentStage() { return STAGES[stageIndex]; }
    function view() {
      const stage = currentStage();
      return {
        status, stageIndex, stageNumber: stageIndex + 1, stageCount: STAGES.length, stageName: stage.name,
        order: order.slice(), books: order.map(id => ({ ...BOOK_BY_ID.get(id) })),
        clues: stage.clues.map(clue => ({ ...clue, satisfied: clueSatisfied(clue, order) })), moves, budget: stage.budget,
        movesLeft: Math.max(0, stage.budget - moves)
      };
    }

    function move(bookId, direction) {
      if (status !== 'playing' || ![-1, 1].includes(direction)) return { accepted: false, reason: 'inactive' };
      const from = order.indexOf(bookId), to = from + direction;
      if (from < 0 || to < 0 || to >= order.length) return { accepted: false, reason: 'edge' };
      [order[from], order[to]] = [order[to], order[from]];
      moves++;
      let completed = false;
      if (satisfiesClues(currentStage(), order)) {
        completed = true;
        status = stageIndex === STAGES.length - 1 ? 'won' : 'stage-clear';
      } else if (moves >= currentStage().budget) status = 'lost';
      return { accepted: true, completed, status, movesLeft: Math.max(0, currentStage().budget - moves) };
    }

    function nextStage() {
      if (status !== 'stage-clear' || stageIndex >= STAGES.length - 1) return false;
      stageIndex++;
      order = starts[stageIndex].slice();
      moves = 0;
      status = 'playing';
      return true;
    }

    function pause() {
      if (status !== 'playing') return false;
      status = 'paused';
      return true;
    }

    function resume() {
      if (status !== 'paused') return false;
      status = 'playing';
      return true;
    }

    function restart() {
      stageIndex = 0; order = starts[0].slice(); moves = 0; status = 'playing';
      return true;
    }

    return { view, move, nextStage, pause, resume, restart };
  }

  return Object.freeze({ BOOKS, STAGES, create, clueSatisfied, satisfiesClues, solutionsForStage });
});
