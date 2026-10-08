/* Four deterministic, project-authored bottles using the shared capsule rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NP_TestTubeCampaign = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'np_test_tube_campaign_v1';
  const BACKUP_KEY = `${STORAGE_KEY}_recovery`;
  const DEFINITIONS = Object.freeze([
    Object.freeze({ id: 'ngang', title: 'Ghép ngang', beat: 'Xoay viên để nối đủ bốn màu trên một hàng.',
      viruses: [{ row: 15, col: 0, color: 'blue' }, { row: 15, col: 1, color: 'blue' }, { row: 15, col: 2, color: 'blue' }],
      pairs: [['blue', 'blue']] }),
    Object.freeze({ id: 'doc', title: 'Ghép dọc', beat: 'Xoay hai lần để xếp cùng màu thành cột.',
      viruses: [{ row: 12, col: 3, color: 'rose' }, { row: 13, col: 3, color: 'rose' }, { row: 14, col: 3, color: 'rose' }],
      pairs: [['rose', 'rose']] }),
    Object.freeze({ id: 'roi', title: 'Nửa viên rơi', beat: 'Dọn hàng phía trên; nửa không khớp sẽ rơi xuống.',
      viruses: [
        { row: 14, col: 0, color: 'blue' }, { row: 14, col: 1, color: 'blue' }, { row: 14, col: 2, color: 'blue' },
        { row: 15, col: 2, color: 'amber' }, { row: 15, col: 3, color: 'amber' }
      ],
      pairs: [['blue', 'rose'], ['amber', 'amber']] }),
    Object.freeze({ id: 'combo', title: 'Combo tự động', beat: 'Nửa viên rơi nối thêm một hàng; combo tự dọn tiếp.',
      viruses: [
        { row: 14, col: 0, color: 'blue' }, { row: 14, col: 1, color: 'blue' }, { row: 14, col: 2, color: 'blue' },
        { row: 15, col: 3, color: 'rose' }, { row: 15, col: 5, color: 'rose' }, { row: 15, col: 6, color: 'rose' }, { row: 15, col: 7, color: 'rose' }
      ],
      pairs: [['blue', 'rose']] })
  ]);

  function validProgress(value) {
    return Boolean(value && typeof value === 'object' && value.version === 1
      && Number.isInteger(value.unlockedBottle) && value.unlockedBottle >= 1
      && value.unlockedBottle <= DEFINITIONS.length);
  }

  function accessStorage(explicitStorage) {
    if (explicitStorage !== undefined) return explicitStorage;
    try { return typeof localStorage === 'undefined' ? null : localStorage; }
    catch (_) { return null; }
  }

  function loadProgress(storage) {
    const initial = {
      unlockedBottle: 1,
      canWrite: Boolean(storage && typeof storage.setItem === 'function'),
      message: storage ? '' : 'Không có bộ nhớ; tiến trình chỉ giữ trong lượt này.'
    };
    if (!storage || typeof storage.getItem !== 'function') return initial;
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch (_) { return { ...initial, canWrite: false, message: 'Không đọc được bản lưu; tiến trình mới vẫn chơi được.' }; }
    if (raw === null || raw === undefined || raw === '') return initial;
    let saved;
    try { saved = JSON.parse(raw); }
    catch (_) { saved = null; }
    if (validProgress(saved)) return { unlockedBottle: saved.unlockedBottle, canWrite: true, message: '' };
    if (Number.isInteger(saved?.version) && saved.version > 1) {
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
    const M = options.model || (typeof window !== 'undefined' && window.NP_TestTubeModel)
      || (typeof globalThis !== 'undefined' && globalThis.NP_TestTubeModel);
    if (!M || typeof M.create !== 'function') throw new Error('Ống Nghiệm campaign needs its capsule model');
    const storage = accessStorage(options.storage);
    const progress = loadProgress(storage);
    let unlockedBottle = progress.unlockedBottle;
    let selectedBottle = 1;
    let model = createBottle(selectedBottle);

    function createBottle(number) {
      const stage = DEFINITIONS[number - 1];
      return M.create({ seed: `ong-nghiem-${stage.id}-v1`, viruses: stage.viruses, pairs: stage.pairs });
    }
    function save() {
      if (!storage || !progress.canWrite || typeof storage.setItem !== 'function') return false;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, unlockedBottle }));
        return true;
      } catch (_) {
        progress.canWrite = false;
        progress.message = 'Chưa lưu được tiến trình; bạn vẫn chơi tiếp được.';
        return false;
      }
    }

    return Object.freeze({
      view() {
        const stage = DEFINITIONS[selectedBottle - 1];
        return {
          selectedBottle,
          unlockedBottle,
          count: DEFINITIONS.length,
          stage: { id: stage.id, title: stage.title, beat: stage.beat },
          bottles: DEFINITIONS.map((stage, index) => ({
            number: index + 1, title: stage.title,
            unlocked: index < unlockedBottle, selected: index + 1 === selectedBottle
          })),
          game: model.view(),
          saveMessage: progress.message
        };
      },
      getModel() { return model; },
      selectBottle(number) {
        if (!Number.isInteger(number) || number < 1 || number > unlockedBottle || number > DEFINITIONS.length) return false;
        selectedBottle = number;
        model = createBottle(number);
        return true;
      },
      restart() { return model.restart(); },
      recordWin() {
        if (model.view().status !== 'won' || selectedBottle >= DEFINITIONS.length || selectedBottle < unlockedBottle) return false;
        unlockedBottle = selectedBottle + 1;
        save();
        return true;
      }
    });
  }

  return Object.freeze({ STORAGE_KEY, BACKUP_KEY, validProgress, create });
});
