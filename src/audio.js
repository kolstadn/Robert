/* Tiny procedural sound effects (WebAudio). No asset files. */
(function (TB) {
  'use strict';
  var ctx = null, master = null, noiseBuf = null;
  TB.muted = false;

  function init() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, lp, delay) {
    var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = lp || 3000;
    g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  var S = {
    swing:  function () { noise(0.09, 0.18, 5000); tone(500, 900, 0.07, 'triangle', 0.06); },
    hit:    function () { noise(0.08, 0.35, 2500); tone(180, 70, 0.09, 'square', 0.25); },
    heavy:  function () { noise(0.18, 0.5, 1500); tone(120, 40, 0.2, 'sawtooth', 0.3); },
    hurt:   function () { tone(300, 90, 0.2, 'sawtooth', 0.3); noise(0.1, 0.25, 1800); },
    pickup: function () { tone(660, 990, 0.07, 'square', 0.15); tone(990, 1320, 0.09, 'square', 0.15, 0.06); },
    level:  function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, f, 0.16, 'square', 0.2, i * 0.09); }); },
    special:function () { tone(220, 880, 0.35, 'sawtooth', 0.22); noise(0.3, 0.25, 4000); },
    fire:   function () { noise(0.35, 0.35, 900); tone(200, 500, 0.3, 'sawtooth', 0.15); },
    zap:    function () { tone(1600, 200, 0.12, 'square', 0.2); tone(1200, 300, 0.1, 'square', 0.15, 0.05); },
    ice:    function () { tone(1400, 2200, 0.15, 'triangle', 0.18); tone(900, 1800, 0.2, 'triangle', 0.12, 0.05); },
    break_: function () { noise(0.22, 0.45, 2200); tone(140, 60, 0.12, 'square', 0.2); },
    warn:   function () { tone(880, 880, 0.06, 'square', 0.13); tone(660, 660, 0.06, 'square', 0.13, 0.08); },
    roar:   function () { tone(90, 50, 0.9, 'sawtooth', 0.35); noise(0.9, 0.3, 700); },
    boom:   function () { noise(0.4, 0.55, 500); tone(80, 30, 0.35, 'sawtooth', 0.35); },
    roll:   function () { noise(0.12, 0.15, 1200); },
    shoot:  function () { tone(700, 400, 0.08, 'square', 0.14); },
    ui:     function () { tone(520, 680, 0.05, 'square', 0.12); }
  };
  TB.sfx = function (n) {
    if (TB.muted) return;
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    try { if (S[n]) S[n](); } catch (e) { /* audio is optional */ }
  };
})(window.TB);
