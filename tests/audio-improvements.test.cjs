const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/game-harness.cjs');

function audioHarness() {
  const h = harness({ loadEngines: false, loadApp: false });
  const contexts = [];
  const parameter = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, exponentialRampToValueAtTime() {} });
  class AudioContext {
    constructor() {
      this.state = 'running'; this.currentTime = 0; this.sampleRate = 8;
      this.destination = {}; this.nodes = []; this.suspends = 0; this.resumes = 0;
      contexts.push(this);
    }
    node(kind) {
      const node = { kind, frequency: parameter(), gain: parameter(), Q: parameter(), disconnected: false,
        connect(destination) { this.destination = destination; }, disconnect() { this.disconnected = true; },
        start() { this.started = true; }, stop() {} };
      this.nodes.push(node);
      return node;
    }
    createOscillator() { return this.node('oscillator'); }
    createGain() { return this.node('gain'); }
    createBiquadFilter() { return this.node('filter'); }
    createBufferSource() { return this.node('source'); }
    createBuffer(channels, size) { return { getChannelData: () => new Float32Array(size) }; }
    suspend() { this.suspends++; this.state = 'suspended'; return Promise.resolve(); }
    resume() { this.resumes++; this.state = 'running'; return Promise.resolve(); }
  }
  h.window.AudioContext = AudioContext;
  return Object.assign(h, {
    audio: h.context.NP_Audio,
    contexts,
    notes: () => contexts[0]?.nodes.filter(node => node.kind === 'oscillator') || []
  });
}

test('a game opened muted remembers its music, and unmuting starts the requested track', () => {
  const h = audioHarness();
  h.context.NP_GameSession.start();
  h.audio.startBGM('boom');
  assert.equal(h.audio.currentBgmTheme, 'boom');
  assert.equal(h.contexts.length, 0, 'muted launch does not create an audio context');
  assert.equal(h.timers.size, 0);
  h.audio.setMuted(false);
  assert.equal(h.notes()[0].frequency.value, 523.25, 'Boom begins with C5');
  assert.equal(h.timers.size, 1);
  h.audio.setMuted(true);
  assert.equal(h.audio.currentBgmTheme, 'boom', 'muting preserves the requested game music');
  assert.equal(h.timers.size, 0, 'muting cancels playback');
  assert.equal(h.contexts[0].state, 'suspended');
  h.audio.startBGM('zuma');
  h.audio.setMuted(false);
  assert.equal(h.notes()[2].frequency.value, 329.63, 'a track selected while muted starts on unmute');
  h.context.NP_GameSession.stop();
  assert.equal(h.audio.currentBgmTheme, null);
  assert.equal(h.timers.size, 0);
  const count = h.notes().length;
  h.audio.setMuted(true); h.audio.setMuted(false);
  assert.equal(h.notes().length, count, 'closing forgets the game music permanently');
});

test('BGM cancellation uses its session owner instead of an overlapping native timer ID', () => {
  const h = audioHarness();
  const portalTimer = h.window.setTimeout(() => {}, 5000);
  const session = h.context.NP_GameSession.start();
  h.audio.setMuted(false);
  h.audio.startBGM('boom');
  assert.equal(h.audio.currentBgmTimer, portalTimer, 'the test creates the original logical/native ID collision');
  const pending = [...h.timers.entries()].find(([id]) => id !== portalTimer)[1].callback;
  const output = h.contexts[0].nodes.find(node => node.kind === 'gain');
  h.audio.stopBGM();
  assert.equal(h.timers.size, 1);
  assert.ok(h.timers.has(portalTimer), 'the unrelated portal timeout survives');
  assert.equal(output.disconnected, true, 'old suspended notes cannot feed a future track');
  h.audio.startBGM('boom');
  const notes = h.notes().length;
  pending();
  assert.equal(h.notes().length, notes, 'an already queued callback cannot revive cancelled playback');
  assert.equal(h.timers.size, 2, 'exactly one new BGM timer is active');
  session.stop();
  assert.ok(h.timers.has(portalTimer));
  assert.equal(h.timers.size, 1);
});

test('repeated starts do not duplicate music, and switching games clears even a muted request', () => {
  const h = audioHarness();
  h.context.NP_GameSession.start();
  h.audio.startBGM('zuma');
  h.context.NP_GameSession.start();
  assert.equal(h.audio.currentBgmTheme, null, 'muted requests belong to their closed session');
  h.audio.setMuted(false);
  h.audio.startBGM('diner');
  h.audio.startBGM('diner');
  assert.equal(h.notes().length, 2);
  assert.equal(h.timers.size, 1);
  h.context.NP_GameSession.stop();
  assert.equal(h.timers.size, 0);
  assert.equal(h.audio.currentBgmTheme, null);
});

test('pause suspends both audio contexts without changing mute and ignores new effects', () => {
  const h = audioHarness();
  const session = h.context.NP_GameSession.start();
  h.audio.setMuted(false); h.audio.startBGM('boom');
  const legacy = new h.window.AudioContext();
  h.window.NP_AudioEngine = { ctx: legacy };
  session.pause(); h.audio.setPaused(true);
  assert.equal(h.audio.isMuted, false);
  assert.equal(h.stored.get('np_muted'), 'false');
  assert.equal(h.contexts[0].state, 'suspended');
  assert.equal(legacy.state, 'suspended');
  const notes = h.notes().length, vibrations = h.vibrations.length;
  h.audio.win(); h.audio.coin(); h.audio.explosion(); h.audio.tone(880);
  assert.equal(h.notes().length, notes);
  assert.equal(h.vibrations.length, vibrations);
  assert.equal(h.timers.size, 0, 'effects invoked while paused cannot queue a delayed fanfare');
  h.audio.setMuted(true); h.audio.setMuted(false);
  assert.equal(h.contexts[0].state, 'suspended', 'sound toggle cannot override game pause');
  assert.equal(h.timers.size, 0);
  h.frame(10000);
  session.resume(); h.audio.setPaused(false);
  assert.equal(h.contexts[0].state, 'running');
  assert.equal(legacy.state, 'running');
  assert.equal(h.notes().length, notes + 2);
  assert.equal(h.notes()[notes].frequency.value, 392, 'music continues with its next note after pause');
  assert.equal(h.timers.size, 1);
  h.context.NP_GameSession.stop();
});

test('shared effects also honor a paused session before the shell synchronizes audio state', () => {
  const h = audioHarness();
  const session = h.context.NP_GameSession.start();
  h.audio.setMuted(false);
  session.pause();
  h.audio.win(); h.audio.pop(); h.audio.dinerBell();
  assert.equal(h.contexts.length, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.vibrations.length, 0);
  h.context.NP_GameSession.stop();
});

test('quick pause and resume queues the resume even before AudioContext reports its suspended state', () => {
  const h = audioHarness();
  h.audio.setMuted(false); h.audio.tone(440);
  const context = h.contexts[0], requests = [];
  context.suspend = () => { requests.push('suspend'); return Promise.resolve(); };
  context.resume = () => { requests.push('resume'); return Promise.resolve(); };
  h.audio.setPaused(true);
  assert.equal(context.state, 'running', 'the mock keeps the previous state until the asynchronous transition');
  h.audio.setPaused(false);
  assert.deepEqual(requests, ['suspend', 'resume']);
});

test('reduced motion disables decorative screen and camera shake, including preference changes', () => {
  const h = audioHarness();
  const preference = { matches: true };
  h.window.matchMedia = () => preference;
  h.context.NP_GameSession.start();
  const juice = h.context.NP_Juice;
  h.container.style.transform = 'scale(1.2)';
  juice.screenShake(h.container, 10, 250);
  assert.equal(h.frames.size, 0);
  assert.equal(h.container.style.transform, 'scale(1.2)');
  const camera = juice.createCameraShake();
  camera.addTrauma(1);
  assert.equal(camera.trauma, 0);
  camera.trauma = 1;
  assert.equal(camera.getOffset().x, 0);
  assert.equal(camera.getOffset().y, 0);
  preference.matches = false;
  juice.screenShake(h.container, 10, 250); h.frame();
  assert.match(h.container.style.transform, /^scale\(1\.2\) translate\(/);
  preference.matches = true;
  h.frame();
  assert.equal(h.container.style.transform, 'scale(1.2)');
  assert.equal(h.frames.size, 0);
  h.context.NP_GameSession.stop();
});

test('screen shake uses active session time after a long pause and restores its transform on time', () => {
  const h = audioHarness();
  const session = h.context.NP_GameSession.start();
  h.container.style.transform = 'scale(1.1)';
  session.pause(); h.frame(15000); session.resume();
  h.context.NP_Juice.screenShake(h.container, 6, 250);
  for (let i = 0; i < 20; i++) h.frame(16);
  assert.equal(h.container.style.transform, 'scale(1.1)', 'a preexisting pause cannot lengthen a new shake');
  assert.equal(h.frames.size, 0);
  h.context.NP_Juice.screenShake(h.container, 6, 250); h.frame(30);
  session.pause(); h.frame(15000); session.resume();
  h.frame(230);
  assert.equal(h.container.style.transform, 'scale(1.1)', 'an active shake finishes after its remaining play time');
  assert.equal(h.frames.size, 0);
  h.context.NP_GameSession.stop();
});
