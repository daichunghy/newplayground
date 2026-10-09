/* Deterministic, original hex-word and spreading-spark rules for Mọt Sách Nối Chữ. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BookwormModel = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const ROWS = 6, COLS = 6, TILE_COUNT = ROWS * COLS;
  const MAX_WORD_LENGTH = 7, FIRE_BONUS = 8;
  const ALPHABET = 'EEEEEEEEAAAAAAAARRRRRRIIIIIIINNNNNNTTTTTTOOOOOOSSSSSSLLLLCCCCUUUUDDDDPPPMMGGBB';
  const LEVELS = Object.freeze([
    Object.freeze({ name: 'Kệ Thư Sinh', goal: 42, turns: 12, opening: 'SHELF', path: Object.freeze([0, 1, 2, 3, 4]), fire: 15 }),
    Object.freeze({ name: 'Kệ Học Giả', goal: 68, turns: 12, opening: 'GARDEN', path: Object.freeze([0, 1, 2, 3, 4, 5]), fire: 14 }),
    Object.freeze({ name: 'Kệ Bác Học', goal: 92, turns: 12, opening: 'LIBRARY', path: Object.freeze([0, 1, 2, 3, 4, 5, 11]), fire: 19 })
  ]);
  // A small, hand-authored word set keeps the game offline and its accepted vocabulary reviewable.
  const WORDS = Object.freeze(`
    garden
    ace act add age ago aid aim air ale all and ant any ape apt arc are ark arm art ash ask ate awe bad bag ban bar bat bay bed bee beg bet bid big bin bit bog boo book bow box boy bud bug bun bus but buy bye cab can cap car cat cod cog cop cot cow coy cry cub cue cup cut dab dad dam day den dew did die dig dim din dip dog dot dry due dug dye ear eat eel egg ego elk elm emu end era eve eye fan far fat fed fee few fig fin fit fix flu fly fog for fox fry fun fur gap gas gel gem get gum gun gut guy had hag ham has hat hay hem hen her hex hid hip his hit hog hop hot how hub hug hum hut ice icy ink inn ion its jam jar jet job jog jot joy jug key kid kin kit lab lad lag lap law lay led leg let lie lip lit log lot low lug mad man map mat may men met mix mob mop mug nap net new nib nil nip nod nor not now nun nut oak oar oat odd off oil old one opt orb ore owl own pad pal pan pat paw pay pea peg pen pet pie pig pin pit ply pod pop pot pry pub pug pun put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod rot row rub rug run rye sad sag sat saw say sea see set sew she shy sin sip sir sit six ski sky sly sob son sow spa spy sub sue sum sun tab tag tan tap tar tea ten the tie tin tip toe ton too top toy try tub tug two use van vat vet via vow wad wag war was wax way web wed wet who why wig win wit wok won woo wow yes yet you
    ache acid acre actin actor adapt admit adore after again agent agree ahead alarm album alert alley allot allow alone along alter angel anger angle angry apart apple apron arise armful artist audio awake award aware awful badge baker beach beard beast began begin being below bench berry birth black blade blame blank blend blind block bloom board boast brave bread break brick bride brief bring broad broke brown brush build bulb bunch burst cabin cable camel camped campus canal candy cargo carrier carrot carton castle casual cattle cause cedar cello chain chair chalk chance change charm chart chase cheap cheek cheer chess chest chief child chill china choice choir chose cigar civic claim class clean clear clerk clever click climb clock close cloth cloud clown coast color could count court cover craft crash cream crime crisp cross crowd crown crude crush curve cycle daily dance dated debut decay delay delta dense depth diary dirty doubt dozen draft drama dream dress drink drive eager eagle early earth eight elbow elder elect elite else embed empty enemy enjoy entry equal error essay ethic even ever exact exam exist extra faith false fancy fatal fault feast fence fever fewer field fiery fifth fifty fight final first fixed flame flash fleet flesh floor flour focus force found frame frank fresh friend front fruit fuzzy giant given glass globe glory glove goat going grace grade grain grand grant grape grasp grass great green greet grief grill group guard guess guest guide guilty habit happy harbor harden harmony harsh harvest haste haven heard heart heavy hedge hello hence herb hobby honey honor horror hotel house human humble humor hurry ideal image imagine impact improve income index indoor inform inhale inject injury inland inmate inner input intact into issue item ivory jazz joint judge juice kitty label labor ladder lantern large laser later laugh layer learn leave legal lemon level liberty library lifted light likely limit linen linked listen little lively local logic lonely loose lunar lunch magic mainly manner marble market marsh matter maybe meadow means medal mellow memory menu mercy merit merry message metal meter middle might minor minute mirror model modern modest money month moral motor mount mouse mouth movie music musical mutual myself narrow nation native nature near navy nearly neck need nerve never new night noble noise noisy normal north nose note novel nurse ocean offer often olive omens onion open opera orbit order organ other ought ounce outer owner paint panel paper party patch peace pearl penny people pepper person phrase piano piece pilot pilot plain plane plant plate play point polar porch power press price pride prime print prism prize proof proud prove pulse pupil puppy puzzle quick quiet radio raise range reach react ready realm rebel recall recipe record refer relax relief remain remind remove render renew reply reset reset ribbon rifle right ring risen river roast robot rocky romance rough round route royal rules ruler saint salad salad salon sauce saved scale scene scent school score scout screen script seed seen select sense serve shade shake shall shape share sharp sheep shelf shell shift shine shirt shock shore short shown shyly sight silly since siren skate skill skirt sleep slept slice slide slow small smart smell smoke snack snake solar solid solve sorry sound space spare speak speed spend sphere spice spider spill spine spirit split spoke spoon sport spray stack staff stage stain stair stake stand stare start state steam steel steep steer stick still stone store story strip stuck sugar suite sunny super sweep swing sword table tablet taken talent target taste teach teeth tempo tender tennis terms thank theme there thick thing think third those three throw threw thumb tidy tiger times tiny title today topic touch tower trace track trade train treat trend trial trick tried tries troop truck truly trust truth tutor twelve twenty twice twin type ugly undue union unite unity until upper upset urban usage usual value vanish vapor vast venue verse very video visit vital vivid voice vowel wage waste watch water weave weight whale wheat wheel where while white whole whose widen widow width wield witch witty woman world worry worse worst worth would wound write wrong yacht year yeast yield young youth zebra
  `.trim().toUpperCase().split(/\s+/).filter(word => word.length >= 3 && word.length <= MAX_WORD_LENGTH));
  const WORD_SET = new Set(WORDS);
  const PREFIXES = new Set();
  for (const word of WORDS) for (let length = 1; length < word.length; length++) PREFIXES.add(word.slice(0, length));

  function neighbors(index) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= TILE_COUNT) return [];
    const row = Math.floor(index / COLS), col = index % COLS;
    const deltas = row % 2 === 0
      ? [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]
      : [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
    return deltas.map(([dr, dc]) => (row + dr) * COLS + col + dc)
      .filter(next => next >= 0 && next < TILE_COUNT &&
        Math.abs(Math.floor(next / COLS) - row) <= 1 &&
        Math.abs((next % COLS) - col) <= 1);
  }

  function pathIsValid(path, board) {
    if (!Array.isArray(path) || path.length < 3 || path.length > MAX_WORD_LENGTH ||
        !Array.isArray(board) || board.length !== TILE_COUNT) return false;
    const seen = new Set();
    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      if (!Number.isSafeInteger(index) || index < 0 || index >= TILE_COUNT || seen.has(index) ||
          typeof board[index] !== 'string' || board[index].length !== 1) return false;
      if (i && !neighbors(path[i - 1]).includes(index)) return false;
      seen.add(index);
    }
    return WORD_SET.has(path.map(index => board[index]).join(''));
  }

  function findPath(board, fireIndex = -1) {
    let best = null, bestValue = -1, visited = 0;
    const path = [], used = new Uint8Array(TILE_COUNT);
    const explore = (index, word) => {
      if (++visited > 28000) return;
      path.push(index); used[index] = 1;
      if (word.length >= 3 && WORD_SET.has(word)) {
        const value = word.length * word.length + (path.includes(fireIndex) ? FIRE_BONUS : 0);
        if (value > bestValue) { bestValue = value; best = path.slice(); }
      }
      if (word.length < MAX_WORD_LENGTH && PREFIXES.has(word)) {
        for (const next of neighbors(index)) {
          if (!used[next] && visited <= 28000) explore(next, word + board[next]);
        }
      }
      used[index] = 0; path.pop();
    };
    for (let i = 0; i < TILE_COUNT && visited <= 28000; i++) explore(i, board[i]);
    return best;
  }

  function create({ seed = 0x0b00c4e1 } = {}) {
    let rng = (Number(seed) >>> 0) || 0x0b00c4e1;
    const random = () => {
      rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
      return (rng >>> 0) / 4294967296;
    };
    const letter = () => ALPHABET[Math.floor(random() * ALPHABET.length)];
    const state = { status: 'playing', stageIndex: 0, score: 0, totalScore: 0, turns: 0,
      board: Array.from({ length: TILE_COUNT }, letter), fireIndex: LEVELS[0].fire, fireBeats: 2 };

    function placeOpening(level) {
      level.path.forEach((index, i) => { state.board[index] = level.opening[i]; });
    }
    function fillShelf(stageIndex) {
      const level = LEVELS[stageIndex];
      state.board = Array.from({ length: TILE_COUNT }, letter);
      placeOpening(level);
      state.fireIndex = level.fire;
      state.fireBeats = 2;
    }
    placeOpening(LEVELS[0]);

    function ensureWord() {
      if (findPath(state.board, state.fireIndex)) return;
      state.board[0] = 'C'; state.board[1] = 'A'; state.board[2] = 'T';
    }
    function view() {
      const level = LEVELS[state.stageIndex];
      return { rows: ROWS, cols: COLS, board: state.board.slice(), status: state.status,
        stageIndex: state.stageIndex, stage: level.name, stages: LEVELS.map(item => ({ ...item, path: item.path.slice() })),
        score: state.score, totalScore: state.totalScore, target: level.goal, turns: state.turns,
        turnsLeft: Math.max(0, level.turns - state.turns), turnLimit: level.turns,
        fire: { index: state.fireIndex, row: Math.floor(state.fireIndex / COLS), col: state.fireIndex % COLS, beatsLeft: state.fireBeats } };
    }

    function submit(path) {
      if (state.status !== 'playing') return { ok: false, reason: state.status };
      if (!pathIsValid(path, state.board)) return { ok: false, reason: 'invalid-word' };
      const word = path.map(index => state.board[index]).join('');
      const doused = path.includes(state.fireIndex);
      const points = (word.length * word.length) + (doused ? FIRE_BONUS : 0);
      for (const index of path) state.board[index] = null;
      for (let col = 0; col < COLS; col++) {
        const kept = [];
        for (let row = ROWS - 1; row >= 0; row--) {
          const value = state.board[row * COLS + col];
          if (value !== null) kept.push(value);
        }
        let cursor = 0;
        for (let row = ROWS - 1; row >= 0; row--) state.board[row * COLS + col] = kept[cursor++] || letter();
      }
      state.score += points; state.totalScore += points; state.turns++;
      if (doused) {
        const oldCol = state.fireIndex % COLS;
        const row = 0;
        const col = (oldCol + 2 + state.stageIndex) % COLS;
        state.fireIndex = row * COLS + col;
        state.fireBeats = 2;
      } else if (--state.fireBeats === 0) {
        state.fireIndex += COLS; state.fireBeats = 2;
      }

      const level = LEVELS[state.stageIndex];
      if (state.score >= level.goal) {
        const clearedStage = state.stageIndex;
        if (clearedStage === LEVELS.length - 1) state.status = 'won';
        else {
          state.stageIndex++;
          state.score = 0; state.turns = 0;
          fillShelf(state.stageIndex);
        }
        return { ok: true, word, points, doused, stageCleared: clearedStage,
          status: state.status, stageIndex: state.stageIndex };
      }
      if (state.turns >= level.turns || state.fireIndex >= (ROWS - 1) * COLS) state.status = 'lost';
      ensureWord();
      return { ok: true, word, points, doused, stageCleared: null, status: state.status, stageIndex: state.stageIndex };
    }

    return { view, submit, isWord: word => typeof word === 'string' && WORD_SET.has(word.toUpperCase()),
      neighbors, hint: () => state.status === 'playing' ? findPath(state.board, state.fireIndex) : null };
  }

  return { ROWS, COLS, TILE_COUNT, MAX_WORD_LENGTH, FIRE_BONUS, LEVELS, WORDS,
    create, neighbors, pathIsValid, findPath };
});
