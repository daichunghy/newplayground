/* Six deterministic, project-authored stages for Bi Vòm. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_BubbleDomeCampaign = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'np_bi_vom_campaign_v1';
  const BACKUP_KEY = `${STORAGE_KEY}_recovery`;
  const SCHEMA_VERSION = 1;
  const COLOR = Object.freeze({ A: 'amber', M: 'mint', B: 'blue', R: 'rose' });

  function bubblesFromRows(rows) {
    return rows.flatMap((line, row) => [...line].flatMap((symbol, col) =>
      symbol === '.' ? [] : [{ row, col, color: COLOR[symbol] }]));
  }
  function freezeStage(stage) {
    return Object.freeze({
      ...stage,
      initial: Object.freeze(stage.initial.map(bubble => Object.freeze({ ...bubble }))),
      queue: Object.freeze([...stage.queue]),
      witnessAngles: Object.freeze([...stage.witnessAngles]),
      checkpointCounts: Object.freeze([...stage.checkpointCounts])
    });
  }

  const STAGES = Object.freeze([
    freezeStage({ id: 'cum-dau-tien', title: 'Cụm đầu tiên', hint: 'Chạm cụm cùng màu để ghép ba bóng.',
      initial: bubblesFromRows(['....RR...']), queue: ['rose', 'amber', 'rose'], witnessAngles: [0], checkpointCounts: [0] }),
    freezeStage({ id: 'doi-dich', title: 'Đổi đích', hint: 'Dọn từng màu theo thứ tự bóng đang có.',
      initial: [
        { row: 0, col: 5, color: 'amber' }, { row: 0, col: 6, color: 'amber' },
        { row: 0, col: 1, color: 'blue' }, { row: 0, col: 2, color: 'blue' }
      ], queue: ['amber', 'blue', 'amber', 'blue'], witnessAngles: [0, -24], checkpointCounts: [2, 0] }),
    freezeStage({ id: 'roi-khoi-vom', title: 'Rơi khỏi vòm', hint: 'Gỡ bóng đỡ để nhánh bên dưới rơi theo.',
      initial: [
        { row: 0, col: 4, color: 'amber' }, { row: 0, col: 5, color: 'amber' },
        { row: 1, col: 4, color: 'blue' }, { row: 1, col: 5, color: 'blue' },
        { row: 2, col: 4, color: 'mint' },
        { row: 0, col: 0, color: 'rose' }, { row: 0, col: 1, color: 'rose' }
      ], queue: ['amber', 'rose', 'amber', 'rose', 'amber'], witnessAngles: [-10, -24], checkpointCounts: [2, 0] }),
    freezeStage({ id: 'mai-bong-bon-mau', title: 'Mái bốn màu', hint: 'Nhắm kỹ khi các cụm đứng sát nhau.',
      initial: bubblesFromRows(['AAMMBBRR.']),
      queue: ['amber', 'mint', 'blue', 'rose', 'amber', 'mint', 'blue', 'rose'],
      witnessAngles: [-23.2, -13.39, -2.73, 8.13], checkpointCounts: [6, 4, 2, 0] }),
    freezeStage({ id: 'go-nut-doi', title: 'Ba cụm lẻ', hint: 'Ghép từng bóng lẻ bằng hai cú bắn cùng màu.',
      initial: [
        { row: 0, col: 1, color: 'amber' }, { row: 0, col: 4, color: 'mint' }, { row: 0, col: 7, color: 'blue' }
      ], queue: ['amber', 'amber', 'mint', 'mint', 'blue', 'blue', 'rose', 'rose'],
      witnessAngles: [-18.43, -18.43, -2.73, -2.73, 13.39, 13.39], checkpointCounts: [4, 2, 3, 1, 2, 0] }),
    freezeStage({ id: 'vom-sau', title: 'Nhánh và bờ', hint: 'Bắn vòng qua bờ; gỡ bóng đỡ cho nhánh rơi.',
      initial: [
        { row: 0, col: 1, color: 'mint' },
        { row: 0, col: 5, color: 'rose' }, { row: 0, col: 6, color: 'rose' },
        { row: 1, col: 5, color: 'blue' }, { row: 1, col: 6, color: 'blue' },
        { row: 2, col: 5, color: 'mint' },
        { row: 1, col: 7, color: 'amber' }, { row: 1, col: 8, color: 'amber' }
      ], queue: ['amber', 'rose', 'mint', 'mint', 'amber', 'blue'],
      witnessAngles: [-60.25, -43, -18.43, -18.43], checkpointCounts: [6, 1, 2, 0] })
  ]);

  function freshProgress() {
    return { unlockedStage: 1, completedStages: [], bestByStage: {} };
  }
  function validProgress(value) {
    if (!value || typeof value !== 'object' || value.version !== SCHEMA_VERSION || value.game !== 'bi-vom'
      || !Number.isInteger(value.unlockedStage) || value.unlockedStage < 1 || value.unlockedStage > STAGES.length
      || !Array.isArray(value.completedStages) || !value.bestByStage || typeof value.bestByStage !== 'object'
      || Array.isArray(value.bestByStage)) return false;
    const completed = value.completedStages;
    if (completed.some(n => !Number.isInteger(n) || n < 1 || n > STAGES.length)
      || new Set(completed).size !== completed.length) return false;
    const completedSet = new Set(completed);
    let contiguous = 0;
    while (completedSet.has(contiguous + 1)) contiguous++;
    if (Math.min(STAGES.length, contiguous + 1) !== value.unlockedStage) return false;
    for (const number of completed) for (let prior = 1; prior < number; prior++) {
      if (!completedSet.has(prior)) return false;
    }
    for (const [key, best] of Object.entries(value.bestByStage)) {
      const number = Number(key);
      if (!Number.isInteger(number) || number < 1 || number > STAGES.length || !completedSet.has(number)
        || !best || !Number.isSafeInteger(best.score) || best.score < 0
        || !Number.isInteger(best.shotsUsed) || best.shotsUsed < 1 || best.shotsUsed > STAGES[number - 1].queue.length) return false;
    }
    return completed.every(number => Object.prototype.hasOwnProperty.call(value.bestByStage, String(number)));
  }
  function accessStorage(explicitStorage) {
    if (explicitStorage !== undefined) return explicitStorage;
    try { return typeof localStorage === 'undefined' ? null : localStorage; }
    catch (_) { return null; }
  }
  function loadProgress(storage) {
    const initial = {
      ...freshProgress(),
      canWrite: Boolean(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function'),
      message: storage ? '' : 'Không có bộ nhớ; tiến trình chỉ giữ trong lượt này.'
    };
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      return { ...initial, canWrite: false, message: storage ? 'Không dùng được bộ nhớ; tiến trình chỉ giữ trong lượt này.' : initial.message };
    }
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch (_) { return { ...initial, canWrite: false, message: 'Không đọc được bản lưu; bạn vẫn chơi tiếp được.' }; }
    if (raw === null || raw === undefined || raw === '') return initial;
    let saved;
    try { saved = JSON.parse(raw); }
    catch (_) { saved = null; }
    if (validProgress(saved)) {
      return {
        unlockedStage: saved.unlockedStage,
        completedStages: [...saved.completedStages],
        bestByStage: Object.fromEntries(Object.entries(saved.bestByStage).map(([key, best]) => [key, { ...best }])),
        canWrite: true, message: ''
      };
    }
    if (Number.isInteger(saved?.version) && saved.version > SCHEMA_VERSION) {
      return { ...initial, canWrite: false, message: 'Bản lưu mới hơn được giữ nguyên; bạn vẫn chơi được.' };
    }
    try {
      const backup = storage.getItem(BACKUP_KEY);
      if (backup && backup !== raw) return { ...initial, canWrite: false, message: 'Bản lưu lỗi được giữ nguyên; bạn vẫn chơi được.' };
      storage.setItem(BACKUP_KEY, raw);
      return { ...initial, message: 'Bản lưu lỗi đã được giữ riêng; bạn vẫn chơi được.' };
    } catch (_) {
      return { ...initial, canWrite: false, message: 'Bản lưu lỗi được giữ nguyên; bạn vẫn chơi được.' };
    }
  }

  function create(options = {}) {
    const Model = options.model || (typeof window !== 'undefined' && window.NP_BubbleDomeModel)
      || (typeof globalThis !== 'undefined' && globalThis.NP_BubbleDomeModel);
    if (!Model || typeof Model.create !== 'function') throw new Error('Bi Vòm campaign needs its bubble model');
    const storage = accessStorage(options.storage);
    const progress = loadProgress(storage);
    let unlockedStage = progress.unlockedStage;
    let completedStages = new Set(progress.completedStages);
    let bestByStage = progress.bestByStage;
    let selectedStage = 1;

    function buildModel(number) {
      const stage = STAGES[number - 1];
      return Model.create({ seed: `bi-vom-${stage.id}-v1`, initial: stage.initial, queue: stage.queue });
    }
    let model = buildModel(selectedStage);
    function save() {
      if (!storage || !progress.canWrite) return false;
      try {
        const saved = {
          version: SCHEMA_VERSION, game: 'bi-vom', unlockedStage,
          completedStages: [...completedStages].sort((a, b) => a - b),
          bestByStage: Object.fromEntries(Object.entries(bestByStage).sort(([a], [b]) => Number(a) - Number(b)))
        };
        storage.setItem(STORAGE_KEY, JSON.stringify(saved));
        return true;
      } catch (_) {
        progress.canWrite = false;
        progress.message = 'Chưa lưu được tiến trình; bạn vẫn chơi tiếp được.';
        return false;
      }
    }

    return Object.freeze({
      view() {
        const stage = STAGES[selectedStage - 1];
        return {
          selectedStage, unlockedStage, count: STAGES.length,
          completedStages: [...completedStages].sort((a, b) => a - b),
          stage: { id: stage.id, title: stage.title, hint: stage.hint },
          best: bestByStage[String(selectedStage)] ? { ...bestByStage[String(selectedStage)] } : null,
          stages: STAGES.map((item, index) => ({
            number: index + 1, title: item.title, unlocked: index < unlockedStage,
            complete: completedStages.has(index + 1), selected: index + 1 === selectedStage,
            bestScore: bestByStage[String(index + 1)]?.score ?? null
          })),
          game: model.view(), saveMessage: progress.message
        };
      },
      getModel() { return model; },
      selectStage(number) {
        if (!Number.isInteger(number) || number < 1 || number > unlockedStage || number > STAGES.length) return false;
        selectedStage = number;
        model = buildModel(number);
        return true;
      },
      restart() { return model.restart(); },
      recordWin() {
        const current = model.view();
        if (current.status !== 'won') return false;
        const key = String(selectedStage);
        const previous = bestByStage[key];
        const better = !previous || current.score > previous.score
          || (current.score === previous.score && current.shotsUsed < previous.shotsUsed);
        const unlockChanged = selectedStage < STAGES.length && selectedStage >= unlockedStage;
        const completionChanged = !completedStages.has(selectedStage);
        if (!better && !unlockChanged && !completionChanged) return false;
        completedStages.add(selectedStage);
        if (unlockChanged) unlockedStage = selectedStage + 1;
        if (better) bestByStage = { ...bestByStage, [key]: { score: current.score, shotsUsed: current.shotsUsed } };
        save();
        return true;
      }
    });
  }

  function replayWitness(Model, number) {
    const stage = STAGES[number - 1];
    if (!stage || !Model || typeof Model.create !== 'function') throw new TypeError('Unknown Bi Vòm stage or model.');
    const model = Model.create({ seed: `bi-vom-${stage.id}-v1`, initial: stage.initial, queue: stage.queue });
    const checkpoints = [];
    for (const angle of stage.witnessAngles) {
      if (!model.fire(angle)) return { ok: false, reason: 'fire-rejected', checkpoints, final: model.view() };
      let frames = 0, bounced = false;
      while (model.view().projectile && frames < 1200) {
        const before = model.view().projectile;
        model.tick(1 / 60);
        const after = model.view().projectile;
        if (before && after && Math.sign(before.vx) !== Math.sign(after.vx)) bounced = true;
        frames++;
      }
      const view = model.view();
      checkpoints.push({ ...view, wallBounce: bounced });
      if (view.projectile || (view.status !== 'playing' && view.status !== 'won')) {
        return { ok: false, reason: 'shot-did-not-settle', checkpoints, final: view };
      }
    }
    const final = model.view();
    return { ok: final.status === 'won' && final.bubbles.length === 0, checkpoints, final };
  }

  function stage(number) {
    const item = STAGES[number - 1];
    return item ? {
      id: item.id, title: item.title, hint: item.hint,
      initial: item.initial.map(bubble => ({ ...bubble })), queue: [...item.queue],
      witnessAngles: [...item.witnessAngles], checkpointCounts: [...item.checkpointCounts]
    } : null;
  }

  return Object.freeze({ STORAGE_KEY, BACKUP_KEY, SCHEMA_VERSION, COUNT: STAGES.length, validProgress, stage, replayWitness, create });
});
