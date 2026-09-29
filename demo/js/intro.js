/* Physis-Lang intro v2 — timeline engine.
 *
 * One elapsed-time value (state.t) drives everything via requestAnimationFrame; every visual is a
 * pure function of t, so pause / seek / replay are exact. Timing lives in js/timeline.js, chart
 * values in js/chart_values.js, showcase clips in js/showcase_data.js.
 *
 * Video: clips are organised in groups (timeline.js "videoGroups"). A group starts at a timeline
 * second; each clip in it plays its [in, out] source segment at its playback rate, then holds the
 * out frame. Outside its window every clip is paused on its in frame (before) or out frame (after).
 * While a group plays, the timeline follows the video clock; if any clip is seeking, buffering or
 * still starting, the timeline holds.
 *
 * URL options: ?record=1  ?autostart=3  ?subs=1  ?t=41.5  ?scale=1
 */
(function () {
  'use strict';

  var TL = window.PL_TIMELINE, DATA = window.PL_DATA, SHOW = window.PL_SHOWCASE;
  var DURATION = TL.duration;
  var STAGE_W = 1920, STAGE_H = 1080;
  var FREEZE_EPS = 0.02;
  var SCENES = TL.scenes;
  var BUTTER_SRC = { vBase: 'assets/butter_baseline.mp4', vOurs: 'assets/butter_physis_lang.mp4' };

  // ------------------------------------------------------------------ helpers
  function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
  function ramp(x) { return clamp(x, 0, 1); }
  function smooth(x) { x = ramp(x); return x * x * (3 - 2 * x); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function $(id) { return document.getElementById(id); }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
  function envelope(t, a, b, fi, fo) {
    var up = fi <= 0.001 ? (t >= a ? 1 : 0) : smooth((t - a) / fi);
    var down = b == null ? 1 : 1 - smooth((t - b) / fo);
    return Math.min(up, down);
  }
  function cue(spec) {
    if (spec == null || spec === '') return null;
    var n = Number(spec);
    if (!isNaN(n)) return n;
    var m = String(spec).match(/^([A-Za-z0-9_.]+?)([+-]\d+(?:\.\d+)?)?$/);
    if (!m || !(m[1] in TL.cues)) throw new Error('Unknown cue: ' + spec);
    return TL.cues[m[1]] + (m[2] ? parseFloat(m[2]) : 0);
  }
  function path(obj, p) { return p.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmt2(x) { return x.toFixed(2); }

  var params = new URLSearchParams(window.location.search);
  function flag(name) { return params.has(name) && params.get(name) !== '0' && params.get(name) !== 'false'; }
  var RECORD = flag('record');
  var AUTOSTART = params.has('autostart') ? Math.max(0, num(params.get('autostart'), 0)) : null;
  var FORCED_SCALE = params.has('scale') ? num(params.get('scale'), null) : null;
  if (RECORD) { document.body.classList.remove('dev'); document.body.classList.add('record'); }

  var stage = $('stage');
  var state = { t: 0, playing: false, started: false, ended: false, stalled: false, stallReason: '', note: '',
                lastNow: null, ready: false, subsOn: flag('subs'), subs: [], scale: 1 };

  // ------------------------------------------------------------------ build data-driven content
  Array.prototype.forEach.call(document.querySelectorAll('[data-val]'), function (e) {
    var v = path(DATA, e.getAttribute('data-val'));
    if (v == null) throw new Error('Missing data value: ' + e.getAttribute('data-val'));
    e.textContent = typeof v === 'number' ? fmt2(v) : String(v);
  });

  // Table 6 rows (WISA vs + Retrieved), gain bars on a zero-origin scale.
  (function buildTable6() {
    var host = $('t6-rows'), T6 = DATA.table6_retrieval, PX = 110;
    T6.rows.concat([T6.mean]).forEach(function (r, i) {
      var row = el('div', 'd-tr' + (i === T6.rows.length ? ' d-mean' : ''));
      row.appendChild(el('span', 'c1', r.benchmark));
      row.appendChild(el('span', 'c2', fmt2(r.before)));
      row.appendChild(el('span', 'c3', '→'));
      row.appendChild(el('span', 'c4', fmt2(r.after)));
      row.appendChild(el('span', 'c5', '+' + fmt2(r.gain)));
      var c6 = el('span', 'c6'); var bar = el('i'); bar.style.width = (r.gain * PX).toFixed(1) + 'px'; c6.appendChild(bar);
      row.appendChild(c6);
      host.appendChild(row);
    });
  })();

  // Table 5 bars (mean gain; zero origin; Nano plotted once).
  var T5 = { x0: 660, px: 140, rows: [244, 436, 556, 676], bars: [] };
  (function buildTable5() {
    var host = $('t5-chart');
    host.appendChild(el('div', 'f-zero'));
    [2, 4, 6, 8].forEach(function (g) {
      var gl = el('div', 'f-grid'); gl.style.left = (T5.x0 + g * T5.px) + 'px'; host.appendChild(gl);
    });
    [0, 2, 4, 6, 8].forEach(function (g) {
      var tk = el('div', 'f-tick', String(g)); tk.style.left = (T5.x0 + g * T5.px) + 'px'; host.appendChild(tk);
    });
    DATA.table5_backbones.models.forEach(function (m, i) {
      var y = T5.rows[i];
      var name = el('div', 'f-name', m.name); name.style.top = y + 'px'; host.appendChild(name);
      var bar = el('div', 'f-bar' + (m.group === 'cosmos' ? ' cosmos' : '')); bar.style.top = y + 'px'; bar.style.width = '0px'; host.appendChild(bar);
      var val = el('div', 'f-val', '+' + fmt2(m.mean_gain)); val.style.top = y + 'px';
      val.style.left = (T5.x0 + m.mean_gain * T5.px + 18) + 'px'; val.setAttribute('data-in', 'f.values'); host.appendChild(val);
      T5.bars.push({ el: bar, v: m.mean_gain });
    });
  })();

  // Loop outcome sparklines (shared x scale: guideline iteration 1..10).
  (function buildSparks() {
    var NS = 'http://www.w3.org/2000/svg';
    function draw(svgId, iters, vals, lo, hi, keys) {
      var svg = $(svgId);
      function X(i) { return 40 + (i - 1) * (680 / 9); }
      function Y(v) { return 130 - (v - lo) / (hi - lo) * 116; }
      function mk(tag, attrs, text) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; svg.appendChild(e); return e; }
      mk('line', { 'class': 'sp-axis', x1: 20, y1: 138, x2: 740, y2: 138, stroke: '#c3ccd8', 'stroke-width': 2 });
      mk('polyline', { 'class': 'sp-line', fill: 'none', stroke: '#2f7d52', 'stroke-width': 5, points: iters.map(function (it, j) { return X(it).toFixed(1) + ',' + Y(vals[j]).toFixed(1); }).join(' ') });
      iters.forEach(function (it, j) {
        var key = keys.indexOf(it) >= 0;
        mk('circle', { 'class': 'sp-dot' + (key ? ' key' : ''), cx: X(it).toFixed(1), cy: Y(vals[j]).toFixed(1), r: key ? 10 : 7, fill: key ? '#2f7d52' : '#fff', stroke: '#2f7d52', 'stroke-width': 4 });
      });
      keys.forEach(function (it) { mk('text', { 'class': 'key', x: X(it), y: 168, 'text-anchor': 'middle', 'font-size': 28, 'font-family': 'Times New Roman, Times, serif', fill: '#070f43' }, 'Iter ' + it); });
    }
    var L = DATA.loop;
    draw('spark-f1', L.f1_trajectory.iterations, L.f1_trajectory.values, 74, 90, [1, 9]);
    draw('spark-gen', L.generation.iterations, L.generation.values, 63.5, 68, [1, 9]);
  })();

  // Showcase slots (sequential highlights).
  var showVideos = [];
  (function buildShowcase() {
    var host = $('g-slots');
    SHOW.sequence.forEach(function (it, i) {
      var slot = el('div', 'g-slot');
      slot.setAttribute('data-in', 'g.slot' + (i + 1));
      slot.setAttribute('data-fi', '0.2');
      if (i < SHOW.sequence.length - 1) { slot.setAttribute('data-out', 'g.slot' + (i + 2) + '+0.2'); slot.setAttribute('data-fo', '0.05'); }
      var box = el('div', 'g-vid');
      var v = document.createElement('video');
      v.id = it.id; v.muted = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('preload', 'auto');
      v.setAttribute('disablepictureinpicture', ''); v.setAttribute('disableremoteplayback', '');
      v._src = it.src; v._in = it['in']; v._out = it.out; v._rate = it.rate;
      box.appendChild(v); slot.appendChild(box);
      slot.appendChild(el('div', 'g-lab', it.label));   // phenomenon label only: no model tags or speed chips (R6)
      host.appendChild(slot);
      showVideos.push(v);
    });
  })();

  var vBase = $('vBase'), vOurs = $('vOurs');
  vBase._src = BUTTER_SRC.vBase; vOurs._src = BUTTER_SRC.vOurs;
  var videos = [vBase, vOurs].concat(showVideos);
  var groups = TL.videoGroups.map(function (g) {
    return { name: g.name, start: g.start, vids: g.videos.map(function (id) { var v = $(id); if (!v) throw new Error('No video ' + id); return v; }) };
  });

  // ------------------------------------------------------------------ cues and scenes
  var sceneEls = SCENES.map(function (s) { return { s: s, el: $(s.id) }; });
  var cues = Array.prototype.map.call(document.querySelectorAll('[data-in], [data-out]'), function (e) {
    return {
      el: e,
      a: e.hasAttribute('data-in') ? cue(e.getAttribute('data-in')) : -1,
      fi: Math.max(0.001, num(e.getAttribute('data-fi'), 0.45)),
      b: e.hasAttribute('data-out') ? cue(e.getAttribute('data-out')) : null,
      fo: Math.max(0.001, num(e.getAttribute('data-fo'), 0.35)),
      dy: num(e.getAttribute('data-dy'), 0)
    };
  });

  function renderScenes(t) {
    for (var i = 0; i < sceneEls.length; i++) {
      var s = sceneEls[i].s;
      var o = envelope(t, s.start, s.fo > 0 ? s.end - s.fo : null, s.fi, s.fo);
      if (s.fi <= 0 && t < s.start) o = 0;
      sceneEls[i].el.style.opacity = o.toFixed(4);
      sceneEls[i].el.style.visibility = o <= 0.0005 ? 'hidden' : 'visible';
    }
  }
  function renderCues(t) {
    for (var i = 0; i < cues.length; i++) {
      var c = cues[i];
      var o = envelope(t, c.a, c.b, c.fi, c.fo);
      c.el.style.opacity = o.toFixed(4);
      c.el.style.visibility = o <= 0.0005 ? 'hidden' : 'visible';
      if (c.dy) c.el.style.translate = '0 ' + ((1 - smooth((t - c.a) / c.fi)) * c.dy).toFixed(2) + 'px';
    }
  }

  // B · rows highlighted in turn, then all equal (text never fades).
  var bRows = ['row-cause', 'row-law', 'row-effect'].map($);
  var bCues = ['b.cause', 'b.law', 'b.effect', 'b.all'].map(cue);
  function renderB(t) {
    for (var i = 0; i < 3; i++) {
      var h = envelope(t, bCues[i], bCues[i + 1] - 0.25, 0.3, 0.25);
      bRows[i].style.setProperty('--hl', h.toFixed(3));
    }
  }

  // C · one paced pass through four states.
  var cStepCues = ['c.step1', 'c.step2', 'c.step3', 'c.step4', 'c.outcome'].map(cue);
  var cRevised = cue('c.step3+1.2');
  var cStepEls = Array.prototype.slice.call(document.querySelectorAll('#sC [data-steps]'));
  var cPills = Array.prototype.slice.call(document.querySelectorAll('#sC .c-pill'));
  var cSheet = document.querySelector('#sC .c-sheet');
  function currentStep(t) {
    for (var k = 0; k < 4; k++) if (t >= cStepCues[k] && t < cStepCues[k + 1]) return k + 1;
    return 0;
  }
  function renderC(t) {
    var step = currentStep(t);
    cStepEls.forEach(function (e) {
      var on = step > 0 && e.getAttribute('data-steps').split(',').indexOf(String(step)) >= 0;
      e.classList.toggle('on', on);
    });
    cPills.forEach(function (p) {
      var k = +p.getAttribute('data-step');
      p.classList.toggle('on', k === step);
      p.classList.toggle('done', step > 0 && k < step);
    });
    cSheet.classList.toggle('revised', t >= cRevised);
  }

  // D · stages light up in order; gallery matching.
  var dStages = ['d-s1', 'd-s2', 'd-s3', 'd-s4', 'd-s5'].map($);
  var dCues = ['d.s1', 'd.s2', 'd.s3', 'd.s4', 'd.s5', 'd.table'].map(cue);
  var dMatch = cue('d.match');
  function renderD(t) {
    for (var i = 0; i < 5; i++) dStages[i].style.setProperty('--act', envelope(t, dCues[i], dCues[i + 1] - 0.3, 0.3, 0.3).toFixed(3));
    $('d-s3').style.setProperty('--m', smooth((t - dMatch) / 0.6).toFixed(3));
  }

  var radar = $('radar'), eRadar = cue('e.radar');
  function renderE(t) { radar.style.scale = lerp(0.96, 1, smooth((t - eRadar) / 0.8)).toFixed(4); }

  var fBars = cue('f.bars');
  function renderF(t) {
    var p = smooth((t - fBars) / 0.9);
    T5.bars.forEach(function (b) { b.el.style.width = (b.v * T5.px * p).toFixed(1) + 'px'; });
  }

  var subsBox = $('subs'), subsText = $('subs-text');
  function renderSubs(t) {
    subsBox.hidden = !state.subsOn;
    if (!state.subsOn) return;
    var txt = '';
    for (var i = 0; i < state.subs.length; i++) { var s = state.subs[i]; if (t >= s.a && t < s.b) { txt = s.text; break; } }
    if (subsText.textContent !== txt) subsText.textContent = txt;
  }

  function render(t) {
    renderScenes(t); renderCues(t);
    renderB(t); renderC(t); renderD(t); renderE(t); renderF(t);
    renderSubs(t);
  }

  // ------------------------------------------------------------------ video groups
  function mediaDur(v) { return isFinite(v.duration) && v.duration > 0 ? v.duration : 8; }
  function seg(v) {
    var d = mediaDur(v), a = v._in || 0, r = v._rate || 1;
    var b = v._out != null ? Math.min(v._out, d) : d;
    var hold = (b < d - 0.05) ? b : d - FREEZE_EPS;   // natural end → last decoded frame
    return { a: a, hold: hold, r: r };
  }
  function playEnd(v, g0) { var s = seg(v); return g0 + (s.hold - s.a) / s.r; }
  function groupEnd(g) { return Math.max.apply(null, g.vids.map(function (v) { return playEnd(v, g.start); })); }
  function mediaTarget(v, g0, t) {
    var s = seg(v), local = t - g0;
    if (local <= 0) return s.a;
    var m = s.a + local * s.r;
    return m >= s.hold ? s.hold : m;
  }
  function nextVideoEdge(t) {
    var e = null;
    groups.forEach(function (g) {
      [g.start].concat(g.vids.map(function (v) { return playEnd(v, g.start); })).forEach(function (x) {
        if (x > t + 1e-6 && (e === null || x < e)) e = x;
      });
    });
    return e;
  }
  function pauseVideos() { videos.forEach(function (v) { if (!v.paused) v.pause(); }); }
  function setStall(on, why) { state.stalled = on; state.stallReason = on ? why : ''; }

  function syncVideos() {
    if (!state.ready) return;
    var t = state.t;
    var stall = '';
    groups.forEach(function (g) {
      var inWin = state.playing && t >= g.start && t < groupEnd(g);
      g.vids.forEach(function (v) {
        var s = seg(v);
        var should = inWin && t < playEnd(v, g.start);
        if (should && v.ended) { state.t = Math.max(state.t, playEnd(v, g.start)); should = false; }
        if (!should) {
          if (!v.paused) v.pause();
          var target = mediaTarget(v, g.start, t);
          // Preparing an off-screen clip must not stop the visible timeline.
          if (!v.seeking && Math.abs(v.currentTime - target) > 0.08) v.currentTime = target;
          return;
        }
        if (v.playbackRate !== s.r) { v.defaultPlaybackRate = s.r; v.playbackRate = s.r; }
        if (v.seeking || v.readyState < 3) { stall = 'buffering'; return; }
        // Keep a monotonic presentation clock. Correct substantial drift only;
        // repeatedly pausing both decoders for a 100ms difference causes stutter.
        var tgt = mediaTarget(v, g.start, t);
        if (Math.abs(v.currentTime - tgt) > 0.5 * s.r) {
          v.currentTime = tgt;
          stall = 'seeking';
          return;
        }
        if (v.paused) {
          if (!v._playPending) {
            v._playPending = true;
            var pr = v.play();
            if (pr && pr.then) pr.then(function () { v._playPending = false; }, function (err) { v._playPending = false; onPlayError(err); });
            else v._playPending = false;
          }
        }
      });
    });
    setStall(!!stall, stall);
  }

  function onPlayError(err) {
    if (err && err.name === 'AbortError') return;
    console.warn('Video play() failed:', err);
    state.playing = false;
    showOverlay('Playback was blocked by the browser — click Start.');
  }
  videos.forEach(function (v) {
    v.muted = true; v.defaultMuted = true; v._isPlaying = false;
    v.addEventListener('playing', function () { v._isPlaying = true; });
    ['pause', 'waiting', 'seeking', 'ended', 'emptied', 'stalled'].forEach(function (ev) { v.addEventListener(ev, function () { v._isPlaying = false; }); });
  });

  // ------------------------------------------------------------------ main loop and transport
  var lastRenderTime = null, lastRenderNow = 0;
  function tick(now) {
    var dt = state.lastNow === null ? 0 : (now - state.lastNow) / 1000;
    state.lastNow = now;
    dt = Math.min(dt, 0.1);
    syncVideos();
    if (state.playing && !state.stalled) {
      // Never step across a clip start/end within one frame: land on it so the clip starts/stops exactly there.
      var next = state.t + dt, edge = nextVideoEdge(state.t);
      state.t = Math.min(DURATION, edge !== null && next > edge ? edge : next);
      if (state.t >= DURATION) { state.t = DURATION; state.playing = false; state.ended = true; pauseVideos(); }
    }
    // Video frames are decoded independently; avoid redrawing every hidden
    // scene at display refresh rate, or redrawing a paused presentation.
    if (state.t !== lastRenderTime && (!state.playing || now - lastRenderNow >= 1000 / 30 || lastRenderTime === null)) {
      render(state.t);
      updateControls();
      lastRenderTime = state.t;
      lastRenderNow = now;
    }
    window.requestAnimationFrame(tick);
  }
  function play() {
    if (!state.ready) return;
    if (state.ended || state.t >= DURATION) seek(0);
    state.started = true; state.playing = true; state.ended = false; state.note = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    hideOverlay();
  }
  function pause() { state.playing = false; pauseVideos(); }
  function toggle() { if (state.playing) pause(); else play(); }
  function seek(t) {
    state.t = clamp(t, 0, DURATION);
    state.ended = state.t >= DURATION;
    pauseVideos();
    groups.forEach(function (g) {
      g.vids.forEach(function (v) { var target = mediaTarget(v, g.start, state.t); if (Math.abs(v.currentTime - target) > 0.01) v.currentTime = target; });
    });
    setStall(true, 'seeking');
  }
  function replay() { seek(0); play(); }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.playing) { pause(); state.note = 'paused: tab was hidden'; }
  });

  // ------------------------------------------------------------------ stage scaling
  var controls = $('controls');
  function fit() {
    var reserve = (!RECORD && !controls.hidden) ? controls.offsetHeight : 0;
    var aw = window.innerWidth, ah = window.innerHeight - reserve;
    var s = FORCED_SCALE || Math.min(aw / STAGE_W, ah / STAGE_H);
    state.scale = s;
    stage.style.transform = 'scale(' + s + ')';
    stage.style.left = Math.max(0, (aw - STAGE_W * s) / 2) + 'px';
    stage.style.top = Math.max(0, (ah - STAGE_H * s) / 2) + 'px';
  }
  window.addEventListener('resize', fit);

  // ------------------------------------------------------------------ dev controls
  var btnPlay = $('btn-play'), scrub = $('scrub'), timecode = $('timecode'), gate = $('gate');
  var sceneBtns = $('scene-btns'), guides = $('guides'), btnSubs = $('btn-subs'), btnGuides = $('btn-guides');
  scrub.max = String(DURATION);
  SCENES.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = (i + 1) + ' ' + s.label; b.title = 'Jump to ' + s.start + ' s (key ' + (i + 1) + ')';
    b.addEventListener('click', function () { seek(s.start); b.blur(); });
    sceneBtns.appendChild(b);
  });
  btnPlay.addEventListener('click', function () { toggle(); btnPlay.blur(); });
  $('btn-replay').addEventListener('click', function (e) { replay(); e.currentTarget.blur(); });
  btnSubs.addEventListener('click', function () { state.subsOn = !state.subsOn; btnSubs.blur(); });
  btnGuides.addEventListener('click', function () { guides.hidden = !guides.hidden; btnGuides.blur(); });
  $('btn-check').addEventListener('click', function (e) { runLayoutCheck(); e.currentTarget.blur(); });
  scrub.addEventListener('input', function () { seek(parseFloat(scrub.value)); });
  function sceneIndex(t) { var idx = 0; for (var i = 0; i < SCENES.length; i++) if (t >= SCENES[i].start) idx = i; return idx; }
  var lastTc = '';
  function updateControls() {
    if (RECORD || controls.hidden) return;
    var si = sceneIndex(state.t);
    var tc = state.t.toFixed(2) + ' / ' + DURATION.toFixed(2) + ' · S' + (si + 1) +
      (state.stalled && state.playing ? ' · ' + state.stallReason : '') + (!state.playing && state.note ? ' · ' + state.note : '');
    if (tc !== lastTc) { timecode.textContent = tc; lastTc = tc; }
    if (document.activeElement !== scrub) scrub.value = state.t.toFixed(2);
    btnPlay.textContent = state.playing ? 'Pause' : (state.ended ? 'Replay' : 'Play');
    btnSubs.classList.toggle('on', state.subsOn);
    btnGuides.classList.toggle('on', !guides.hidden);
    gate.hidden = SCENES[si].id !== 'sE';
    for (var i = 0; i < sceneBtns.children.length; i++) sceneBtns.children[i].classList.toggle('on', i === si);
  }
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === ' ' || k === 'k' || k === 'K' || k === 'Enter') { e.preventDefault(); if (state.ready) toggle(); }
    else if (k === 'r' || k === 'R') { if (state.ready) replay(); }
    else if (k >= '1' && k <= String(SCENES.length)) { seek(SCENES[parseInt(k, 10) - 1].start); }
    else if (k === 'ArrowLeft') { e.preventDefault(); seek(state.t - (e.shiftKey ? 1 / 30 : 1)); }
    else if (k === 'ArrowRight') { e.preventDefault(); seek(state.t + (e.shiftKey ? 1 / 30 : 1)); }
    else if (k === 'Home') { seek(0); }
    else if (k === 'c' || k === 'C') { state.subsOn = !state.subsOn; }
    else if (!RECORD && (k === 'g' || k === 'G')) { guides.hidden = !guides.hidden; }
    else if (!RECORD && (k === 'h' || k === 'H')) { controls.hidden = !controls.hidden; fit(); }
    else if (!RECORD && (k === 'l' || k === 'L')) { runLayoutCheck(); }
  });

  // ------------------------------------------------------------------ overlay and loading
  var overlay = $('overlay'), ovStatus = $('ov-status'), ovList = $('ov-list'), ovRecord = $('ov-record'), btnStart = $('btn-start');
  function showOverlay(msg) { overlay.hidden = false; if (msg) { ovStatus.textContent = msg; ovRecord.textContent = msg; } btnStart.disabled = !state.ready; }
  function hideOverlay() { overlay.hidden = true; }
  btnStart.addEventListener('click', function () { play(); });
  overlay.addEventListener('click', function (e) { if (RECORD && state.ready && e.target !== btnStart) play(); });
  function listItem(text) {
    var li = document.createElement('li'); li.className = 'wait'; li.textContent = text; ovList.appendChild(li);
    return { ok: function (x) { li.className = 'ok'; if (x) li.textContent = text + ' — ' + x; }, err: function (x) { li.className = 'err'; li.textContent = text + ' — ' + x; } };
  }
  function waitFor(target, evs, test, ms) {
    return new Promise(function (resolve, reject) {
      if (test()) { resolve(); return; }
      var timer = null;
      function done() { if (test()) { cleanup(); resolve(); } }
      function fail() { cleanup(); reject(new Error('media error')); }
      function cleanup() { evs.forEach(function (ev) { target.removeEventListener(ev, done); }); target.removeEventListener('error', fail); if (timer) clearTimeout(timer); }
      evs.forEach(function (ev) { target.addEventListener(ev, done); });
      target.addEventListener('error', fail);
      if (ms) timer = setTimeout(function () { cleanup(); reject(new Error('timeout')); }, ms);
    });
  }
  function loadVideo(v) {
    var url = v._src, item = listItem(url);
    function attach(src) {
      v.src = src; v.load();
      return waitFor(v, ['canplay', 'canplaythrough', 'loadeddata', 'progress'], function () { return v.readyState >= 2; }, 12000)
        .catch(function (e) { if (e.message === 'timeout' && v.readyState >= 2) { console.warn(url + ': readyState ' + v.readyState + '; continuing.'); return; } throw e; });
    }
    var mediaReady;
    if (window.location.protocol === 'file:') {
      // Native media elements can read sibling files; fetch(file:) is blocked.
      mediaReady = attach(url);
    } else {
    var controller = new AbortController();
    var fetchTimer = setTimeout(function () { controller.abort(); }, 12000);
    mediaReady = fetch(url, { signal: controller.signal })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
      .finally(function () { clearTimeout(fetchTimer); })
      .then(function (b) { return attach(URL.createObjectURL(b)); })
      .catch(function (e) { console.warn('Blob preload failed for ' + url + ' (' + e.message + '); using direct src.'); return attach(url); });
    }
    return mediaReady.then(function () {
        var s = seg(v);
        v.defaultPlaybackRate = s.r; v.playbackRate = s.r;
        item.ok(v.videoWidth + '×' + v.videoHeight + ', ' + v.duration.toFixed(3) + ' s' + (v._out != null ? ', segment ' + s.a + '–' + v._out + ' s at ' + s.r + '×' : ''));
      }, function (e) { item.err(e.message); throw e; });
  }
  function loadImage(img) {
    var item = listItem(img.getAttribute('src'));
    var p = img.complete && img.naturalWidth > 0 ? Promise.resolve() : waitFor(img, ['load'], function () { return img.complete && img.naturalWidth > 0; }, 30000);
    return p.then(function () { return img.decode ? img.decode().catch(function () {}) : null; })
      .then(function () { item.ok(img.naturalWidth + '×' + img.naturalHeight); }, function (e) { item.err(e.message); throw e; });
  }
  function parseSrt(txt) {
    function sec(h, m, s, ms) { return (+h) * 3600 + (+m) * 60 + (+s) + (+ms) / 1000; }
    return txt.replace(/\r/g, '').trim().split(/\n\s*\n/).map(function (block) {
      var lines = block.split('\n'), i = lines[0].indexOf('-->') >= 0 ? 0 : 1;
      var m = (lines[i] || '').match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/);
      if (!m) return null;
      return { a: sec(m[1], m[2], m[3], m[4]), b: sec(m[5], m[6], m[7], m[8]), text: lines.slice(i + 1).join('\n') };
    }).filter(Boolean);
  }
  function loadSubtitles() {
    return fetch('subtitles.srt').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (txt) { state.subs = parseSrt(txt); })
      .catch(function (e) { console.info('Subtitles not loaded (' + e.message + ').'); });
  }
  function init() {
    controls.hidden = RECORD;
    fit(); render(0);
    window.requestAnimationFrame(tick);
    var images = Array.prototype.slice.call(stage.querySelectorAll('img'));
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    state.loadError = '';
    var loadingTimer;
    var deadline = new Promise(function (_, reject) { loadingTimer = setTimeout(function () { reject(new Error('Loading timed out')); }, 30000); });
    Promise.race([Promise.all(videos.map(loadVideo).concat(images.map(loadImage)).concat([fontsReady, state.subsOn ? loadSubtitles() : Promise.resolve()])), deadline])
      .then(function () {
        clearTimeout(loadingTimer);
        state.ready = true;
        seek(params.has('t') ? clamp(num(params.get('t'), 0), 0, DURATION) : 0);
        ovStatus.textContent = 'All assets loaded. Ready (' + DURATION.toFixed(1) + ' s).';
        ovRecord.textContent = AUTOSTART !== null ? '' : 'Ready — click or press Space to start.';
        btnStart.disabled = false;
        if (!RECORD) btnStart.focus();
        if (AUTOSTART !== null) setTimeout(function () { if (!state.started) play(); }, AUTOSTART * 1000);
        else if (params.has('t')) hideOverlay();
      })
      .catch(function (e) {
        clearTimeout(loadingTimer);
        state.loadError = 'The overview could not load. Please retry.';
        console.error(e);
        ovStatus.textContent = state.loadError;
        ovRecord.textContent = ovStatus.textContent;
      });
  }

  // ------------------------------------------------------------------ layout self-check (dev, in a real browser)
  // Safe area (64 px), clipped text, overlapping visible text, unloaded media, Times New Roman presence,
  // and a type-size audit: nothing visible below 28 px; 28-35 px text listed so it can be confirmed as a qualifier.
  // Check instants derive from the timeline (each scene is checked just before its fade-out, when all its text is shown).
  function stableEnd(id) { var s = SCENES.filter(function (x) { return x.id === id; })[0]; return s.end - s.fo - 0.2; }
  var CHECKS = [
    ['A butter', stableEnd('sA')], ['B cause-law-effect', stableEnd('sB')], ['C step 1', cue('c.step1') + 3], ['C step 3', cue('c.step3') + 3.5],
    ['C step 4', cue('c.step4') + 3.5], ['C outcomes', stableEnd('sC')], ['D retrieval + table', stableEnd('sD')], ['E radar', stableEnd('sE')],
    ['F backbones', stableEnd('sF')], ['G slot 1', cue('g.slot1') + 1.2], ['G last slot', cue('g.slot' + SHOW.sequence.length) + 1.4], ['H takeaway', DURATION - 0.2]
  ];
  function fontInstalled(name) {
    var c = document.createElement('canvas').getContext('2d'), probe = 'mmmmmmmmmlliWWW 0123456789';
    return ['monospace', 'sans-serif'].some(function (base) {
      c.font = '72px ' + base; var w0 = c.measureText(probe).width;
      c.font = '72px "' + name + '", ' + base; return c.measureText(probe).width !== w0;
    });
  }
  function effectiveOpacity(e) {
    var o = 1;
    for (var n = e; n && n !== stage; n = n.parentElement) {
      var cs = window.getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none') return 0;
      o *= parseFloat(cs.opacity);
    }
    return o;
  }
  function stageRect(e, textOnly) {
    var r;
    if (textOnly) { var rg = document.createRange(); rg.selectNodeContents(e); r = rg.getBoundingClientRect(); } else r = e.getBoundingClientRect();
    var s = stage.getBoundingClientRect(), k = state.scale;
    return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
  }
  function textLeaves(root) {
    return Array.prototype.filter.call(root.querySelectorAll('*'), function (e) {
      if (e.closest('svg') && e.tagName.toLowerCase() !== 'text') return false;
      for (var c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.textContent.trim()) return true;
      return false;
    });
  }
  function describe(e) {
    var s = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : '');
    var tx = (e.textContent || e.getAttribute('src') || '').trim().replace(/\s+/g, ' ');
    return s + ' "' + tx.slice(0, 40) + (tx.length > 40 ? '…' : '') + '"';
  }
  function runLayoutCheck() {
    var wasPlaying = state.playing, savedT = state.t; pause();
    var out = [], problems = 0, small = {};
    out.push('Times New Roman installed: ' + (fontInstalled('Times New Roman') ? 'yes' : 'NO — fallback serif in use'));
    Array.prototype.forEach.call(stage.querySelectorAll('img'), function (img) { if (!(img.complete && img.naturalWidth > 0)) { out.push('IMAGE NOT LOADED: ' + img.getAttribute('src')); problems++; } });
    videos.forEach(function (v) { if (v.readyState < 2) { out.push('VIDEO NOT READY: ' + v.id); problems++; } });
    var M = 64, TOL = 1.5;
    CHECKS.forEach(function (ck) {
      var name = ck[0], t = ck[1];
      render(t);
      var si = sceneIndex(t), root = $(SCENES[si].id);
      var media = Array.prototype.slice.call(root.querySelectorAll('img, video'));
      var leaves = textLeaves(root);
      var vis = leaves.concat(media).filter(function (e) { return effectiveOpacity(e) > 0.05; });
      var rects = vis.map(function (e) { var isMedia = media.indexOf(e) >= 0; return { el: e, media: isMedia, r: stageRect(e, !isMedia) }; });
      rects.forEach(function (o) {
        var r = o.r;
        if (r.w === 0 && r.h === 0) return;
        if (r.x < M - TOL || r.y < M - TOL || r.x + r.w > STAGE_W - M + TOL || r.y + r.h > STAGE_H - M + TOL) {
          out.push('[' + name + ' @' + t.toFixed(1) + 's] outside 64 px safe area: ' + describe(o.el) + ' [x ' + r.x.toFixed(0) + ', y ' + r.y.toFixed(0) + ', w ' + r.w.toFixed(0) + ', h ' + r.h.toFixed(0) + ']'); problems++;
        }
        if (!o.media) {
          var fs = parseFloat(window.getComputedStyle(o.el).fontSize);
          if (fs < 27.5) { out.push('[' + name + '] TEXT BELOW 28 px (' + fs + ' px): ' + describe(o.el)); problems++; }
          else if (fs < 35.5) small[describe(o.el) + ' ' + fs + 'px'] = true;
          if (o.el.scrollWidth > o.el.clientWidth + 1 && window.getComputedStyle(o.el).overflow !== 'visible') { out.push('[' + name + '] clipped text: ' + describe(o.el)); problems++; }
        }
      });
      var texts = rects.filter(function (o) { return !o.media; });
      for (var a = 0; a < texts.length; a++) for (var b = a + 1; b < texts.length; b++) {
        var A = texts[a], B = texts[b];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        var ix = Math.min(A.r.x + A.r.w, B.r.x + B.r.w) - Math.max(A.r.x, B.r.x);
        var iy = Math.min(A.r.y + A.r.h, B.r.y + B.r.h) - Math.max(A.r.y, B.r.y);
        if (ix > 2 && iy > 2) { out.push('[' + name + '] text overlap: ' + describe(A.el) + ' ↔ ' + describe(B.el)); problems++; }
      }
    });
    out.push(problems ? problems + ' potential issue(s) listed above.' : 'No layout issues at ' + CHECKS.length + ' check instants.');
    out.push('\nText at 28–35 px (should all be qualifiers, never key science):\n  ' + Object.keys(small).join('\n  '));
    render(savedT); seek(savedT); if (wasPlaying) play();
    var rep = $('report'); rep.textContent = 'Layout check (click to close)\n\n' + out.join('\n'); rep.hidden = false; rep.onclick = function () { rep.hidden = true; };
    console.log(out.join('\n'));
    return out;
  }

  window.PhysisIntro = { play: play, pause: pause, seek: seek, replay: replay, check: runLayoutCheck, state: state, groups: groups };
  function notifyParent() {
    if (window.parent === window) return;
    window.parent.postMessage({ type: 'physis-demo-state', state: {
      ready: state.ready, t: state.t, playing: state.playing, loadError: state.loadError || ''
    } }, '*');
  }
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || !event.data || event.data.type !== 'physis-demo-command') return;
    var command = event.data.command;
    if (command === 'status') { notifyParent(); return; }
    if (!state.ready) return;
    if (command === 'play') play();
    else if (command === 'pause') pause();
    else if (command === 'replay') replay();
    else if (command === 'seek' && typeof event.data.value === 'number' && isFinite(event.data.value)) seek(event.data.value);
    notifyParent();
  });
  setInterval(notifyParent, 200);
  init();
})();
