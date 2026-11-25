/*! ROSES cyber layer, reference build for Soyong Kim. Sativus Gourd, November 2026.
 *
 *  Cement and signal. The collage, the roots and the grain are cement: material, slow, earthy.
 *  The static, the holograms, the pixels and the burns are signal. The two trade places with the song:
 *  quiet passages settle into cement, loud passages push into signal, and every signal event lands
 *  off the beat (a half beat late, plus 20 to 60 ms) so it reads as an artefact, as in the video.
 *
 *  How it attaches: this file loads after index.html's own script and only OBSERVES it (classes on
 *  #entry, #introShell, #experience, the overlays and the tiles, and the stage transform). None of
 *  the gallery, audio or overlay logic is changed. Delete the three cyber tags in <head> and the page
 *  is the week 6 release again; ?cyber=off does the same without deleting anything.
 *
 *  ?lab        opens a panel to switch every effect between its variants (the ` key toggles it)
 *  ?fx=a:b,... sets variants from the URL, e.g. ?fx=static:chroma,lock:tilt (the panel can copy this)
 *
 *  Misregistration runs one way across the whole site: red shifts left, cyan shifts right.
 */
(() => {
  'use strict';
  const doc = document, html = doc.documentElement;
  const params = new URLSearchParams(location.search);
  if (params.get('cyber') === 'off') return;

  /* ============================================================== palette and helpers */
  const COL = { void: '#0A0807', flash: '#FFFFFF', cyanPale: '#93D7F3', red: '#E9393E',
    oxblood: '#831C1F', cyan: '#48999F', bone: '#EBE6D7', acid: '#D7C02C' };
  const $ = id => doc.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const approach = (cur, target, dt, tau) => cur + (target - cur) * (1 - Math.exp(-dt / tau));
  const outCubic = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const inOutCubic = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const chance = p => Math.random() < p;
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const make = (tag, cls, parent) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  };
  const later = (ms, fn) => setTimeout(fn, ms);

  /* ============================================================== settings and variants */
  const VARIANTS = {
    static: ['dead', 'chroma', 'cement', 'off'],
    entry: ['tune', 'fade'],
    hiss: ['on', 'off'],
    rerender: ['on', 'off'],
    lock: ['voxel', 'tilt', 'off'],
    holo: ['music', 'always', 'off'],
    holoStyle: ['mercury', 'duotone', 'joi'],
    detail: ['projector', 'voxel', 'joi', 'fade'],
    ambient: ['breathe', 'cement', 'off'],
    burns: ['offbeat', 'frequent', 'off'],
    edge: ['on', 'off'],
    cursor: ['ghost', 'off'],
    essay: ['signal', 'off'],
    credits: ['hologram', 'off'],
  };
  const LABELS = {
    static: 'Opening static', entry: 'Entry', hiss: 'Entry hiss', rerender: 'Hover re-render',
    lock: 'Hover lock-on', holo: 'Holograms', holoStyle: 'Hologram light', detail: 'Photo open',
    ambient: 'Ambient', burns: 'Signal burns', edge: 'Edge streaks', cursor: 'Cursor',
    essay: 'Essay', credits: 'Credits',
  };
  const DEFAULTS = Object.fromEntries(Object.entries(VARIANTS).map(([k, v]) => [k, v[0]]));
  const LAB = params.has('lab');
  const S = { ...DEFAULTS };
  if (LAB) {
    try { Object.assign(S, JSON.parse(localStorage.getItem('sg-cyber-lab') || '{}')); } catch (err) { /* private mode */ }
  }
  (params.get('fx') || '').split(',').forEach(pair => {
    const [k, v] = pair.split(':');
    if (VARIANTS[k] && VARIANTS[k].includes(v)) S[k] = v;
  });
  for (const k of Object.keys(S)) if (!VARIANTS[k] || !VARIANTS[k].includes(S[k])) delete S[k];
  for (const k of Object.keys(DEFAULTS)) if (!(k in S)) S[k] = DEFAULTS[k];

  const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reducedMQ.matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const small = () => innerWidth <= 760;
  // Under reduced motion the layer keeps only still textures: no flicker, flashes or travel.
  const allowed = key => {
    if (S[key] === 'off') return false;
    if (!reduced()) return true;
    return !['rerender', 'lock', 'holo', 'burns', 'edge', 'cursor', 'hiss'].includes(key);
  };
  const variant = key => {
    if (reduced()) {
      if (key === 'entry') return 'fade';
      if (key === 'detail') return 'fade';
    }
    return S[key];
  };
  function applyClasses() {
    for (const c of [...html.classList]) if (/^sg-(detail|ambient|holostyle|credits|essay)-/.test(c)) html.classList.remove(c);
    html.classList.add('sg-cyber', `sg-detail-${variant('detail')}`, `sg-ambient-${S.ambient}`,
      `sg-holostyle-${S.holoStyle}`, `sg-credits-${S.credits}`, `sg-essay-${S.essay}`);
  }

  /* ============================================================== the page we observe */
  const R = {
    entry: $('entry'), intro: $('introShell'), enter: $('enter'), title: $('rosesTitle'),
    exp: $('experience'), viewport: $('viewport'), stage: $('stage'), audio: $('soundtrack'),
    detail: $('photoDetailOverlay'), detailFrame: $('photoDetailFrame'), detailImg: $('photoDetailImage'),
    essay: $('essayOverlay'), essayVideo: $('essayVideo'), credits: $('creditsOverlay'),
    creditsContent: $('creditsContent'), cursor: $('cursorCircle'),
  };
  if (!R.entry || !R.stage || !R.exp || !R.intro) return; // unexpected markup: stay out of the way
  applyClasses();

  const st = {
    get entered() { return R.exp.classList.contains('visible'); },
    get introVisible() { return !R.intro.hidden; },
    get essay() { return !!R.essay && R.essay.classList.contains('is-open'); },
    get credits() { return !!R.credits && R.credits.classList.contains('is-open'); },
    get detail() { return !!R.detail && R.detail.classList.contains('is-open'); },
    get dragging() { return R.viewport.classList.contains('dragging'); },
  };
  const overlayOpen = () => st.essay || st.credits || st.detail;

  // The stage is a single translate3d; its x is the camera.
  let camera = 0;
  const camRe = /translate3d\((-?[\d.e+-]+)px/;
  function readCamera() {
    const m = camRe.exec(R.stage.style.transform);
    camera = m ? -parseFloat(m[1]) : 0;
  }

  // Pointer, with a smoothed velocity for the cursor ghosts and the opening interference.
  const ptr = { x: innerWidth / 2, y: innerHeight / 2, inside: false, type: 'mouse', vx: 0, vy: 0,
    speed: 0, lastT: 0, down: false, downX: 0, downY: 0, moved: 0, onUi: false };
  doc.addEventListener('pointermove', e => {
    const t = performance.now();
    const dt = Math.max(4, t - (ptr.lastT || t - 16));
    ptr.vx = lerp(ptr.vx, (e.clientX - ptr.x) / dt * 1000, .35);
    ptr.vy = lerp(ptr.vy, (e.clientY - ptr.y) / dt * 1000, .35);
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.lastT = t; ptr.inside = true; ptr.type = e.pointerType;
    ptr.onUi = !!(e.target && e.target.closest && e.target.closest('.social-links,.sg-lab'));
    if (ptr.down) ptr.moved = Math.max(ptr.moved, Math.hypot(e.clientX - ptr.downX, e.clientY - ptr.downY));
  }, { passive: true });
  doc.addEventListener('pointerdown', e => {
    ptr.down = true; ptr.downX = ptr.x = e.clientX; ptr.downY = ptr.y = e.clientY;
    ptr.moved = 0; ptr.type = e.pointerType; ptr.inside = true;
  }, { passive: true, capture: true });
  doc.addEventListener('pointerup', () => { ptr.down = false; }, { passive: true, capture: true });
  doc.addEventListener('pointercancel', () => { ptr.down = false; }, { passive: true, capture: true });
  doc.addEventListener('pointerout', e => { if (!e.relatedTarget) ptr.inside = false; });
  addEventListener('blur', () => { ptr.inside = false; ptr.down = false; });
  function decayPointer(now) {
    if (now - ptr.lastT > 40) { ptr.vx *= .82; ptr.vy *= .82; }
    ptr.speed = Math.hypot(ptr.vx, ptr.vy);
  }

  /* ============================================================== the song: breath and off-beats */
  // roses-pulse.js holds the soundtrack's loudness and transients at 10 Hz plus its beat grid
  // (120 bpm). Signal follows loudness; events are pushed to the half beat.
  const PULSE = window.ROSES_PULSE || null;
  const decode = s => { const a = new Float32Array(s.length); for (let i = 0; i < s.length; i++) a[i] = parseInt(s[i], 36) / 35; return a; };
  const ENERGY = PULSE ? decode(PULSE.energy) : null;
  const HIT = PULSE ? decode(PULSE.hit) : null;
  const sampleAt = (arr, t) => {
    const x = t * PULSE.hz, i = Math.floor(x), f = x - i, n = arr.length;
    const a = arr[((i % n) + n) % n], b = arr[(((i + 1) % n) + n) % n];
    return a + (b - a) * f;
  };
  const music = { playing: false, t: 0, energy: .3, hit: 0, signal: 0, cement: 1, breath: .5 };
  function updateMusic(now, dt) {
    const audio = R.audio;
    music.playing = !!audio && !audio.paused && st.entered;
    music.t = audio ? (audio.currentTime || 0) : 0;
    const target = music.playing && PULSE ? sampleAt(ENERGY, music.t) : .22;
    music.energy = approach(music.energy, target, dt, 650);
    music.hit = music.playing && PULSE ? sampleAt(HIT, music.t) : 0;
    music.breath = .5 + .5 * Math.sin(now / 1000 * Math.PI * 2 / 7.5);
    const sig = S.ambient === 'cement' ? 0 : sstep(.36, .8, music.energy + (music.breath - .5) * .08);
    music.signal = sig;
    music.cement = 1 - sig;
  }
  // Milliseconds until the next off-beat (half beat), with a small late "artefact" offset.
  function untilOffbeat(minAheadMs = 90) {
    if (!music.playing || !PULSE) return minAheadMs + rand(0, 380);
    const { period, phase } = PULSE.beat;
    const t = music.t + minAheadMs / 1000;
    const k = Math.ceil((t - phase) / period - .5);
    const tb = phase + period * (k + .5) + rand(.02, .06);
    return Math.max(0, (tb - music.t) * 1000);
  }

  /* ============================================================== frame loop */
  const modules = [];
  let lastFrame = performance.now();
  const fpsMeter = { acc: 0, n: 0, value: 60, cost: 0, costAcc: 0 };
  function loop(now) {
    const t0 = performance.now();
    const dt = Math.min(100, Math.max(0, now - lastFrame));
    lastFrame = now;
    fpsMeter.acc += dt; fpsMeter.n++;
    if (fpsMeter.acc > 500) {
      fpsMeter.value = Math.round(1000 * fpsMeter.n / fpsMeter.acc);
      fpsMeter.cost = fpsMeter.costAcc / fpsMeter.n;
      fpsMeter.acc = 0; fpsMeter.n = 0; fpsMeter.costAcc = 0;
    }
    readCamera();
    decayPointer(now);
    updateMusic(now, dt);
    for (const m of modules) {
      try { m.update(now, dt); } catch (err) { if (!m.failed) { m.failed = true; console.warn('[roses-cyber]', m.name, err); } }
    }
    fpsMeter.costAcc += performance.now() - t0;
    requestAnimationFrame(loop);
  }

  /* ============================================================== small GL helper */
  function glProgram(gl, vs, fs) {
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  const uniforms = (gl, p, names) => Object.fromEntries(names.map(n => [n, gl.getUniformLocation(p, n)]));

  /* ============================================================== 1. opening: dead channel */
  // A broadcast with no signal fills the black around ROSES. The roots clear the noise around
  // themselves (the Rhizoma canvas is read back at low resolution as a mask), the invisible pointer
  // disturbs it, and every few seconds the channel surges. Entering tunes the channel in.
  const Static = (() => {
    const VS = 'attribute vec2 aPos;varying vec2 vUv;void main(){vUv=vec2(aPos.x*.5+.5,.5-aPos.y*.5);gl_Position=vec4(aPos,0.,1.);}';
    const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec2 uRes,uMaskTexel,uView;
uniform float uTime,uFrame,uLevel,uExp,uHCorr,uChroma,uFleck,uTear,uRoll,uInterf,uInterfY,uMaskAmt,uCover,uBand,uBeam,uWarm,uVignette;
uniform sampler2D uMask;
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float mk(vec2 q){return texture2D(uMask,q).r;}
void main(){
  vec2 uv=vUv;
  vec2 mv=uv*uView;
  float y=fract(uv.y+uRoll);
  float fr=uFrame;
  float line=floor(y*uRes.y);
  float bandId=floor(y*30.);
  float tear=uTear*step(.74,h12(vec2(bandId,floor(fr*.5)+3.)))*(h12(vec2(bandId*1.7,fr))-.5)*.22;
  float dy=(uv.y-uInterfY)*11.;
  float inter=uInterf*exp(-dy*dy);
  float wob=inter*(h12(vec2(line,fr))-.5)*.05;
  vec2 p=floor(vec2((uv.x+tear+wob)*uRes.x,y*uRes.y));
  vec2 seed=vec2(mod(fr,251.)*17.,mod(fr,241.)*59.);
  float nF=h12(p+seed);
  float n2=h12(vec2(floor(p.x*.5),p.y)+seed.yx);
  float n3=h12(vec2(floor((p.x+1.)/3.),p.y)+seed*1.31);
  float n=mix(nF,(n2+n3)*.5,uHCorr);
  n=clamp((n-.5)*(1.+uHCorr*.9)+.5,0.,1.);
  float lg=.74+.52*h12(vec2(line,mod(fr,239.)*3.+1.));
  lg+=step(.988,h12(vec2(line*.37,mod(fr,233.))))*.9;
  float hum=.85+.15*sin((uv.y+uTime*.09)*6.2831853);
  float g=lg*hum;
  float v=pow(n,uExp)*g;
  float r=pow(h12(p+vec2(-1.,0.)+seed),uExp)*g;
  float b=pow(h12(p+vec2(1.,0.)+seed),uExp)*g;
  vec3 col=mix(vec3(v),vec3(r,v,b),uChroma);
  float fleck=step(1.-.035*uFleck,h12(p*1.31+seed+7.));
  float side=step(.5,h12(p+3.));
  col=mix(col,vec3(.914,.224,.243)*1.5,fleck*side);
  col=mix(col,vec3(.576,.843,.953)*1.5,fleck*(1.-side));
  col*=mix(vec3(.9,.97,1.),vec3(1.,.93,.84),uWarm);
  col*=1.+inter*1.15;
  col+=vec3(.75,.9,1.)*inter*exp(-abs((uv.y-uInterfY)*uRes.y)*.7)*.22;
  vec2 c=uv-.5;
  col*=1.-uVignette*dot(c,c)*2.;
  // the roots: no static on them, and a narrow soft edge (3 and 6 CSS px) so the snow stops cleanly
  vec2 t=uMaskTexel;
  float core=mk(mv);
  float near=(mk(mv+vec2(t.x*3.,0.))+mk(mv-vec2(t.x*3.,0.))+mk(mv+vec2(0.,t.y*3.))+mk(mv-vec2(0.,t.y*3.)))*.25;
  float far=(mk(mv+t*vec2(4.2,4.2))+mk(mv+t*vec2(-4.2,4.2))+mk(mv+t*vec2(4.2,-4.2))+mk(mv+t*vec2(-4.2,-4.2))
    +mk(mv+vec2(t.x*6.,0.))+mk(mv-vec2(t.x*6.,0.))+mk(mv+vec2(0.,t.y*6.))+mk(mv-vec2(0.,t.y*6.)))*.125;
  float halo=near*.65+far*.35;
  float clearing=max(smoothstep(.06,.45,core),smoothstep(.05,.5,halo)*.55)*uMaskAmt;
  col*=uLevel*(1.-clearing);
  col=clamp(col,0.,1.);
  float a=max(max(col.r,col.g),col.b);
  a=mix(a,1.,uCover*(1.-clearing));
  if(uBand>0.){
    float d=abs(uv.y-.5);
    float inside=1.-smoothstep(uBand-1.5/uRes.y,uBand,d);
    float beam=exp(-abs(d-uBand)*uRes.y*.5)*uBeam;
    float glow=exp(-abs(d-uBand)*uRes.y*.06)*uBeam*.35;
    vec3 beamCol=mix(vec3(.576,.843,.953),vec3(1.),clamp(beam,0.,1.));
    float outside=1.-inside;
    vec3 o=col*outside;
    float oa=a*outside;
    float bl=clamp(beam+glow,0.,1.);
    o=o*(1.-bl)+beamCol*bl;
    oa=oa+(1.-oa)*bl;
    gl_FragColor=vec4(o,oa);
    return;
  }
  gl_FragColor=vec4(col,a);
}`;
    // px: CSS pixels per grain at density 1 (always a whole number of device pixels).
    const VARS = {
      dead: { base: .5, exp: 3.1, hcorr: .65, chroma: .06, fleck: 0, warm: 0, px: 1.5, fps: 0, vignette: .45 },
      chroma: { base: .58, exp: 3.2, hcorr: .55, chroma: .3, fleck: 1, warm: 0, px: 1.5, fps: 0, vignette: .4 },
      cement: { base: .44, exp: 2.6, hcorr: .25, chroma: 0, fleck: 0, warm: 1, px: 2.5, fps: 12, vignette: .6 },
    };
    let tune = {};
    let cv = null, gl = null, prog, U, tex, maskCv, mctx, ctx2d = null, frames2d = [], view = [1, 1], sizedPx = 0;
    let alive = false, phase = 'idle', frame = 0, lastDraw = 0, maskTick = 0, maskOk = true;
    let level = 0, tear = 0, roll = 0, interf = 0, interfY = .5, cover = 0, band = 0, beam = 0;
    let maskAmt = 0, revealAt = 0, nextSurge = 0, surgeUntil = 0, surgeTear = 0, releaseAt = 0, tuneAt = 0;
    const startedAt = performance.now();
    const v = () => ({ ...(VARS[S.static] || VARS.dead), ...tune });

    function size() {
      if (!cv) return;
      const p = v();
      const dpr = devicePixelRatio || 1;
      // Each grain covers a whole number of device pixels, so the static stays even on any screen.
      let dev = Math.max(1, Math.round(p.px * (small() ? 1.2 : 1) * dpr));
      let w, h;
      for (;;) {
        w = Math.ceil(innerWidth * dpr / dev); h = Math.ceil(innerHeight * dpr / dev);
        if (w * h <= 2.4e6 || dev > 8) break;
        dev++;
      }
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const cssW = w * dev / dpr, cssH = h * dev / dpr;
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
      view = [cssW / innerWidth, cssH / innerHeight];
      sizedPx = p.px;
      if (maskCv) { const k = small() ? 2.5 : 4; maskCv.width = Math.max(32, Math.round(innerWidth / k)); maskCv.height = Math.max(32, Math.round(innerHeight / k)); }
    }
    function init() {
      cv = make('canvas', 'sg-static');
      cv.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(cv);
      maskCv = doc.createElement('canvas');
      mctx = maskCv.getContext('2d');
      size();
      try {
        gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false,
          stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
        if (!gl) throw new Error('no webgl');
        prog = glProgram(gl, VS, FS);
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        U = uniforms(gl, prog, ['uRes', 'uMaskTexel', 'uView', 'uTime', 'uFrame', 'uLevel', 'uExp', 'uHCorr', 'uChroma',
          'uFleck', 'uTear', 'uRoll', 'uInterf', 'uInterfY', 'uMaskAmt', 'uCover', 'uBand', 'uBeam', 'uWarm', 'uVignette', 'uMask']);
        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
        gl.uniform1i(U.uMask, 0);
        cv.addEventListener('webglcontextlost', e => { e.preventDefault(); gl = null; finish(); });
      } catch (err) {
        gl = null;
        ctx2d = cv.getContext('2d');
        // Fallback without WebGL: four pre-rendered noise frames, no root mask.
        for (let i = 0; i < 4; i++) {
          const f = doc.createElement('canvas');
          f.width = cv.width; f.height = cv.height;
          const c = f.getContext('2d'), img = c.createImageData(f.width, f.height);
          for (let q = 0; q < img.data.length; q += 4) {
            const n = Math.pow(Math.random(), 2.6) * 255;
            img.data[q] = n * .92; img.data[q + 1] = n * .98; img.data[q + 2] = n; img.data[q + 3] = n;
          }
          c.putImageData(img, 0, 0);
          frames2d.push(f);
        }
      }
      alive = true;
      nextSurge = performance.now() + rand(4200, 6800);
      addEventListener('resize', size);
    }

    function updateMask() {
      if (!gl || !maskOk) return;
      const rc = R.title && R.title.querySelector('canvas');
      if (!rc || !rc.width) return;
      const r = rc.getBoundingClientRect();
      const mw = maskCv.width, mh = maskCv.height, W = innerWidth, H = innerHeight;
      mctx.globalCompositeOperation = 'source-over';
      mctx.fillStyle = '#000';
      mctx.fillRect(0, 0, mw, mh);
      try {
        mctx.imageSmoothingEnabled = true;
        mctx.drawImage(rc, r.left / W * mw, r.top / H * mh, r.width / W * mw, r.height / H * mh);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCv);
      } catch (err) { maskOk = false; }
    }

    function draw(now) {
      const p = v();
      if (gl) {
        if (!reduced()) frame = p.fps ? Math.floor(now / (1000 / p.fps)) : frame + 1;
        gl.viewport(0, 0, cv.width, cv.height);
        gl.useProgram(prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform2f(U.uRes, cv.width, cv.height);
        gl.uniform2f(U.uMaskTexel, 1 / innerWidth, 1 / innerHeight);
        gl.uniform2f(U.uView, view[0], view[1]);
        gl.uniform1f(U.uTime, (now - startedAt) / 1000);
        gl.uniform1f(U.uFrame, frame % 4096);
        gl.uniform1f(U.uLevel, level * sstep(0, 900, now - startedAt) * (small() ? .85 : 1));
        gl.uniform1f(U.uExp, p.exp);
        gl.uniform1f(U.uHCorr, p.hcorr);
        gl.uniform1f(U.uChroma, p.chroma);
        gl.uniform1f(U.uFleck, p.fleck);
        gl.uniform1f(U.uTear, tear);
        gl.uniform1f(U.uRoll, roll);
        gl.uniform1f(U.uInterf, interf);
        gl.uniform1f(U.uInterfY, interfY);
        gl.uniform1f(U.uMaskAmt, maskAmt);
        gl.uniform1f(U.uCover, cover);
        gl.uniform1f(U.uBand, band);
        gl.uniform1f(U.uBeam, beam);
        gl.uniform1f(U.uWarm, p.warm);
        gl.uniform1f(U.uVignette, p.vignette);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } else if (ctx2d && frames2d.length) {
        if (now - lastDraw < 40) return;
        lastDraw = now;
        ctx2d.clearRect(0, 0, cv.width, cv.height);
        if (cover > 0) { ctx2d.globalAlpha = cover; ctx2d.fillStyle = '#000'; ctx2d.fillRect(0, 0, cv.width, cv.height); }
        ctx2d.globalAlpha = clamp(level * 1.6, 0, 1);
        ctx2d.drawImage(frames2d[Math.floor(Math.random() * frames2d.length)], 0, 0);
        ctx2d.globalAlpha = 1;
        if (band > 0) {
          const h = band * 2 * cv.height;
          ctx2d.clearRect(0, cv.height / 2 - h / 2, cv.width, h);
        }
      }
    }

    function finish() {
      if (!cv) return;
      alive = false;
      try { const ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (err) { /* ignore */ }
      cv.remove(); cv = null; gl = null;
      removeEventListener('resize', size);
    }

    // Called by the observers below.
    function onReveal() { revealAt = performance.now(); }
    function onRelease() {
      if (!alive) return;
      phase = 'release'; releaseAt = performance.now();
    }
    function onLeaving() {
      if (!alive) return;
      if (variant('entry') === 'tune' && !reduced()) {
        phase = 'tune'; tuneAt = performance.now();
      } else {
        phase = 'fade';
        cv.classList.add('is-fading');
        later(420, finish);
      }
    }

    function update(now, dt) {
      if (!alive) return;
      if (S.static === 'off' && phase === 'idle') { cv.style.visibility = 'hidden'; return; }
      cv.style.visibility = '';
      if (v().px !== sizedPx) size();
      // Reduced motion: one fixed noise frame, redrawn twice a second only so the roots can clear it.
      if (reduced() && phase === 'idle') {
        if (now - lastDraw < 500) return;
        lastDraw = now;
        maskAmt = revealAt ? sstep(0, 3200, now - revealAt) : 0;
        level = v().base * .8; tear = 0; interf = 0; roll = 0;
        if (maskAmt > 0) updateMask();
        draw(now);
        return;
      }
      const p = v();
      // Roots clear the static only once Soyong's black curtain has started to lift (4 s fade).
      const curtain = revealAt ? sstep(0, 3200, now - revealAt) : 0;
      maskAmt = curtain;
      if (++maskTick % 3 === 0 && curtain > 0) updateMask();
      // Pointer interference: the opening has no visible cursor, so the disturbance is the cursor.
      const moving = ptr.inside && now - ptr.lastT < 120;
      const interfTarget = moving ? clamp(.25 + ptr.speed / 1600, .25, 1) : 0;
      interf = approach(interf, interfTarget, dt, moving ? 70 : 420);
      if (ptr.inside) interfY = approach(interfY, ptr.y / innerHeight, dt, 50);
      const breath = .9 + .1 * Math.sin(now / 1000 * Math.PI * 2 / 6.5);

      if (phase === 'idle') {
        if (now > nextSurge) {
          surgeUntil = now + rand(140, 300);
          surgeTear = rand(.55, 1);
          if (chance(.4)) roll = rand(.04, .12);
          nextSurge = now + rand(5600, 9800);
        }
        const surging = now < surgeUntil;
        level = approach(level, p.base * breath + (surging ? .34 : 0), dt, surging ? 45 : 260);
        tear = approach(tear, surging ? surgeTear : 0, dt, surging ? 30 : 140);
        roll = approach(roll, 0, dt, 160);
      } else if (phase === 'release') {
        // The channel loses what little picture it had while the roots withdraw.
        const t = (now - releaseAt) / 760;
        level = approach(level, .95, dt, 90);
        tear = approach(tear, .85, dt, 60);
        cover = variant('entry') === 'tune' ? clamp(t, 0, 1) : 0;
        roll = approach(roll, .08 * Math.sin(now / 60), dt, 40);
        // Never trap anyone: if the page entered without us noticing, carry on.
        if (now - releaseAt > 2600 && st.entered) onLeaving();
      } else if (phase === 'tune') {
        const t = (now - tuneAt) / 640;
        cover = 1;
        band = .002 + outCubic(t) * .56;
        beam = 1 - sstep(.25, 1, t);
        level = approach(level, .55, dt, 120);
        tear = approach(tear, 0, dt, 120);
        roll = approach(roll, 0, dt, 60);
        if (t >= 1.05) { finish(); return; }
      } else if (phase === 'fade') {
        level = approach(level, 0, dt, 200);
      }
      draw(now);
    }
    return { name: 'static', init, update, onReveal, onRelease, onLeaving, get alive() { return alive; },
      debugMask: () => (maskCv ? maskCv.toDataURL() : null), canvas: () => cv,
      tune: o => { tune = { ...tune, ...(o || {}) }; size(); return v(); },
      surge: () => { nextSurge = performance.now(); } };
  })();
  modules.push(Static);

  /* ============================================================== 2. entry hiss */
  // A short burst of filtered noise while the channel tunes in, gone as the music rises.
  const Hiss = (() => {
    let ac = null, gain = null, src = null, stopping = false;
    function start() {
      if (!allowed('hiss') || ac) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        ac = new Ctx();
        if (ac.state === 'suspended') ac.resume().catch(() => {});
        const len = Math.floor(ac.sampleRate * 1.5);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
        const pk = ac.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 3400; pk.Q.value = .8; pk.gain.value = 5;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
        gain = ac.createGain(); gain.gain.value = 0;
        src.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(gain); gain.connect(ac.destination);
        const t0 = ac.currentTime;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(.05, t0 + .07);
        for (let k = 0; k < 18; k++) gain.gain.setValueAtTime(.032 + Math.random() * .03, t0 + .09 + k * .055);
        src.start();
        later(3200, () => stop(.3)); // safety
      } catch (err) { ac = null; }
    }
    function stop(fade = .42) {
      if (!ac || stopping) return;
      stopping = true;
      try {
        const t = ac.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + fade);
        src.stop(t + fade + .05);
      } catch (err) { /* already stopped */ }
      const ctx = ac;
      later(fade * 1000 + 300, () => { try { ctx.close(); } catch (err) { /* ignore */ } });
    }
    return { name: 'hiss', start, stop, update() {} };
  })();

  /* ============================================================== 3. tile re-render (pixel) */
  // Every time Soyong's hover burst starts (pointer, keyboard focus, or the mobile scan band),
  // the treatment arrives as three coarse frames before the sharp image: 26, 13, 7 then 3.5 px blocks.
  const Rerender = (() => {
    const STEPS = [26, 13, 7, 3.5];
    const running = new WeakMap();
    function run(tile) {
      if (!allowed('rerender') || !tile.isConnected) return;
      const layer = tile.querySelector('.photo-filter-layer');
      const img = tile.querySelector('img.original-image');
      if (!layer || !img || !img.complete || !img.naturalWidth) return;
      let cv = layer.querySelector('canvas.sg-px');
      if (!cv) {
        cv = doc.createElement('canvas');
        cv.className = 'sg-px';
        cv.setAttribute('aria-hidden', 'true');
        const fx = layer.querySelector('img.fx-image');
        if (fx && fx.nextSibling) layer.insertBefore(cv, fx.nextSibling); else layer.appendChild(cv);
      }
      const ctx = cv.getContext('2d');
      const tw = tile.offsetWidth || 200, th = tile.offsetHeight || 150;
      const token = {};
      running.set(tile, token);
      let i = 0;
      const step = () => {
        if (running.get(tile) !== token) return;
        if (i >= STEPS.length) { cv.classList.remove('on'); return; }
        const b = STEPS[i++];
        const w = Math.max(2, Math.round(tw / b)), h = Math.max(2, Math.round(th / b));
        if (cv.width !== w) cv.width = w;
        if (cv.height !== h) cv.height = h;
        ctx.imageSmoothingEnabled = true;
        try { ctx.drawImage(img, 0, 0, w, h); } catch (err) { cv.classList.remove('on'); return; }
        cv.classList.add('on');
        later(i === 1 ? 50 : 40, step);
      };
      step();
    }
    // Scan burns reuse the same idea on the untreated photograph.
    function scan(tile, holdMs = 120) {
      if (!tile.isConnected) return;
      const img = tile.querySelector('img.original-image');
      if (!img || !img.complete || !img.naturalWidth) return;
      let cv = tile.querySelector(':scope > canvas.sg-scanpx');
      if (!cv) { cv = make('canvas', 'sg-scanpx', tile); cv.setAttribute('aria-hidden', 'true'); }
      const ctx = cv.getContext('2d');
      const tw = tile.offsetWidth || 200, th = tile.offsetHeight || 150;
      const seq = [9, 16, 9, 5];
      let i = 0;
      const step = () => {
        if (i >= seq.length) { cv.classList.remove('on'); return; }
        const b = seq[i++];
        cv.width = Math.max(2, Math.round(tw / b)); cv.height = Math.max(2, Math.round(th / b));
        try { ctx.drawImage(img, 0, 0, cv.width, cv.height); } catch (err) { return; }
        cv.classList.add('on');
        later(holdMs / seq.length, step);
      };
      step();
    }
    return { name: 'rerender', run, scan, update() {} };
  })();

  // Set by the hologram module; the lock-on asks it first so a hologram under the cursor wins.
  const holoHit = { under: () => null };

  /* ============================================================== 4. lock-on: voxel relief or tilt */
  // Rest the cursor on a photograph (desktop, 600 ms) and it locks on: registration marks snap to
  // its corners and it lifts into a relief of pixel blocks, brighter pixels standing further forward,
  // tilting under the cursor. The blocks keep the photograph's own colours (cement); their sides catch
  // cyan light on the right and red on the left (signal). On phones the first tap does it briefly.
  const Lock = (() => {
    const DWELL = 600, MAX_X = 15, MAX_Y = 21;
    let hoverTile = null, hoverSince = 0, pollTick = 0;
    let locked = null, lockedAt = 0, tempUntil = 0, marks = null;
    let rx = 0, ry = 0;
    // voxel state: the tile the relief belongs to stays set while it retracts
    let voxTile = null, ext = 0, extTarget = 0, originCell = [0, 0], voxelFailed = false;
    let vcv = null, vgl = null, vprog = null, vbuf = null, vU = null, vCount = 0, vInfo = null, attrs = null;
    // tilt state: a tile easing back to flat after the cursor leaves
    let tiltBack = null;
    const sampleCv = doc.createElement('canvas');
    const sctx = sampleCv.getContext('2d', { willReadFrequently: true });

    const VS = `
attribute vec3 aPos;attribute vec2 aCell;attribute vec3 aNormal;attribute vec4 aColor;
uniform vec2 uGrid,uTile,uCanvas,uRot,uOrigin;uniform float uExt,uDepth,uGap,uD,uTime,uBreath;
varying vec3 vCol;
vec3 rot(vec3 p,vec2 r){float cx=cos(r.x),sx=sin(r.x),cy=cos(r.y),sy=sin(r.y);
  p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);return vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);}
void main(){
  vec3 p;vec3 c;
  vec3 n=vec3(aNormal.x,-aNormal.y,aNormal.z);
  if(aCell.x<0.){
    p=vec3(aPos.x*uTile.x-uTile.x*.5,-(aPos.y*uTile.y-uTile.y*.5),-.6);
    c=vec3(.039,.031,.027);
  }else{
    vec2 cs=uTile/uGrid;
    float d=length((aCell-uOrigin)/uGrid);
    float local=clamp(uExt*1.7-d*.7,0.,1.);local=local*local*(3.-2.*local);
    float wave=.5+.5*sin(uTime*1.6-(aCell.x+aCell.y)*.33);
    float h=uDepth*(.1+.9*aColor.a)*local*(.86+.28*wave*uBreath);
    float g=uGap*local;
    vec2 q=mix(vec2(g*.5),vec2(1.-g*.5),aPos.xy);
    vec2 xy=(aCell+q)*cs-uTile*.5;
    p=vec3(xy.x,-xy.y,aPos.z*h);
    bool front=aNormal.z>.5;
    vec3 rn=rot(n,uRot);
    float diff=max(dot(rn,normalize(vec3(-.4,.6,.75))),0.);
    c=front?aColor.rgb*(.88+.18*diff):aColor.rgb*(.12+.34*diff);
    if(!front){c+=vec3(.576,.843,.953)*max(rn.x,0.)*.32*local;c+=vec3(.914,.224,.243)*max(-rn.x,0.)*.2*local;}
  }
  vec3 r=rot(p,uRot);
  float w=uD/(uD-r.z);
  gl_Position=vec4(r.xy*w/(uCanvas*.5),-r.z/(uD*2.),1.);
  vCol=c;
}`;
    const FS = 'precision mediump float;varying vec3 vCol;void main(){gl_FragColor=vec4(vCol,1.);}';

    function initGL() {
      if (vgl) return true;
      if (voxelFailed) return false;
      try {
        vcv = make('canvas', 'sg-voxel');
        vcv.setAttribute('aria-hidden', 'true');
        R.stage.appendChild(vcv);
        vgl = vcv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true });
        if (!vgl) throw new Error('no webgl');
        vprog = glProgram(vgl, VS, FS);
        vU = uniforms(vgl, vprog, ['uGrid', 'uTile', 'uCanvas', 'uRot', 'uOrigin', 'uExt', 'uDepth', 'uGap', 'uD', 'uTime', 'uBreath']);
        attrs = ['aPos', 'aCell', 'aNormal', 'aColor'].map(n => vgl.getAttribLocation(vprog, n));
        vbuf = vgl.createBuffer();
        vcv.addEventListener('webglcontextlost', e => {
          e.preventDefault(); voxelFailed = true; vgl = null; voxTile = null; vcv.classList.remove('on');
        });
        return true;
      } catch (err) {
        voxelFailed = true;
        if (vcv) vcv.remove();
        vcv = null; vgl = null;
        return false;
      }
    }

    // Faces of a unit block in screen orientation (y down, z towards the viewer). No back faces.
    const FACES = [
      { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
      { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
      { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
      { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
      { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    ];
    const TRI = [0, 1, 2, 0, 2, 3];
    const STRIDE = 12;

    function buildVoxels(tile) {
      const img = tile.querySelector('img.original-image');
      const b = tile._rosesBounds;
      if (!img || !img.complete || !img.naturalWidth || !b) return false;
      const tw = b.right - b.left, th = b.bottom - b.top;
      if (tw < 40 || th < 30) return false;
      let block = clamp(Math.round(Math.min(tw, th) / 15), 7, 18);
      let cols = Math.max(4, Math.round(tw / block)), rows = Math.max(3, Math.round(th / block));
      while (cols * rows > 1500) { block += 1; cols = Math.round(tw / block); rows = Math.round(th / block); }
      sampleCv.width = cols; sampleCv.height = rows;
      sctx.imageSmoothingEnabled = true;
      let data;
      try {
        sctx.drawImage(img, 0, 0, cols, rows);
        data = sctx.getImageData(0, 0, cols, rows).data;
      } catch (err) { voxelFailed = true; return false; } // opened from file:// : falls back to the tilt
      const verts = new Float32Array((cols * rows * 30 + 6) * STRIDE);
      let o = 0;
      const push = (pos, cell, n, c) => {
        verts[o++] = pos[0]; verts[o++] = pos[1]; verts[o++] = pos[2];
        verts[o++] = cell[0]; verts[o++] = cell[1];
        verts[o++] = n[0]; verts[o++] = n[1]; verts[o++] = n[2];
        verts[o++] = c[0]; verts[o++] = c[1]; verts[o++] = c[2]; verts[o++] = c[3];
      };
      // void base plate: the grout between blocks
      const base = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
      for (const k of TRI) push(base[k], [-1, -1], [0, 0, 1], [0, 0, 0, 0]);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const p = (j * cols + i) * 4;
          // a touch more contrast, plus a little per-block grain so the blocks read as cast material
          const grain = 1 + (Math.random() - .5) * .08;
          const r = clamp(((data[p] / 255 - .5) * 1.12 + .5) * grain, 0, 1);
          const g = clamp(((data[p + 1] / 255 - .5) * 1.12 + .5) * grain, 0, 1);
          const bl = clamp(((data[p + 2] / 255 - .5) * 1.12 + .5) * grain, 0, 1);
          const lum = clamp(.2126 * r + .7152 * g + .0722 * bl, 0, 1);
          const c = [r, g, bl, Math.pow(lum, .85)];
          for (const f of FACES) for (const k of TRI) push(f.v[k], [i, j], f.n, c);
        }
      }
      vgl.bindBuffer(vgl.ARRAY_BUFFER, vbuf);
      vgl.bufferData(vgl.ARRAY_BUFFER, verts, vgl.STATIC_DRAW);
      vCount = o / STRIDE;
      const margin = Math.max(56, Math.round(Math.max(tw, th) * .32));
      vInfo = { cols, rows, tw, th, margin, depth: Math.min(96, Math.min(tw, th) * .32) };
      return true;
    }

    function drawVoxels(tile, now) {
      if (!vgl || !vInfo || !tile) return;
      const b = tile._rosesBounds;
      if (!b) return;
      const { cols, rows, tw, th, margin, depth } = vInfo;
      const cw = tw + margin * 2, ch = th + margin * 2;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
      if (vcv.width !== pw || vcv.height !== ph) { vcv.width = pw; vcv.height = ph; }
      vcv.style.width = cw + 'px'; vcv.style.height = ch + 'px';
      vcv.style.left = (b.left - margin) + 'px'; vcv.style.top = (b.top - margin) + 'px';
      const gl = vgl;
      gl.viewport(0, 0, pw, ph);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(vprog);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
      const sizes = [3, 2, 3, 4];
      let off = 0;
      attrs.forEach((loc, i) => {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, sizes[i], gl.FLOAT, false, STRIDE * 4, off * 4);
        off += sizes[i];
      });
      gl.uniform2f(vU.uGrid, cols, rows);
      gl.uniform2f(vU.uTile, tw, th);
      gl.uniform2f(vU.uCanvas, cw, ch);
      gl.uniform2f(vU.uRot, -rx * Math.PI / 180, ry * Math.PI / 180);
      gl.uniform2f(vU.uOrigin, originCell[0], originCell[1]);
      gl.uniform1f(vU.uExt, ext);
      gl.uniform1f(vU.uDepth, depth);
      gl.uniform1f(vU.uGap, .1);
      gl.uniform1f(vU.uD, 720);
      gl.uniform1f(vU.uTime, now / 1000);
      gl.uniform1f(vU.uBreath, .35 + .65 * music.signal);
      gl.drawArrays(gl.TRIANGLES, 0, vCount);
    }

    function ensureMarks() {
      if (marks) return marks;
      marks = make('div', 'sg-lock', R.stage);
      marks.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 4; i++) make('i', '', marks);
      make('b', '', marks);
      return marks;
    }
    function placeMarks(tile) {
      const b = tile._rosesBounds;
      if (!b || !marks) return;
      marks.style.left = b.left + 'px'; marks.style.top = b.top + 'px';
      marks.style.width = (b.right - b.left) + 'px'; marks.style.height = (b.bottom - b.top) + 'px';
      marks.style.setProperty('--sg-h', (b.bottom - b.top) + 'px');
    }

    function mode() {
      if (!allowed('lock')) return 'off';
      if (S.lock === 'voxel' && !voxelFailed) return 'voxel';
      return 'tilt';
    }

    function lock(tile, temporaryMs = 0) {
      if (locked === tile) return;
      if (locked) unlock(true);
      const m = mode();
      if (m === 'off') return;
      locked = tile; lockedAt = performance.now();
      tempUntil = temporaryMs ? lockedAt + temporaryMs : 0;
      ensureMarks();
      placeMarks(tile);
      marks.classList.remove('armed', 'sweep');
      marks.classList.add('on');
      void marks.offsetWidth;
      marks.classList.add('armed', 'sweep');
      const b = tile._rosesBounds;
      let u = .5, vv = .5;
      if (b && !temporaryMs) {
        u = clamp((ptr.x - (b.left - camera)) / (b.right - b.left), 0, 1);
        vv = clamp((ptr.y - b.top) / (b.bottom - b.top), 0, 1);
      }
      if (m === 'voxel' && initGL() && buildVoxels(tile)) {
        originCell = [u * vInfo.cols, vv * vInfo.rows];
        voxTile = tile; ext = 0; extTarget = 1;
        vcv.classList.add('on');
        tile.dataset.sgLock = 'voxel';
      } else {
        if (tiltBack && tiltBack.tile !== tile) { tiltBack.tile.style.transform = ''; tiltBack = null; }
        tiltBack = null;
        tile.dataset.sgLock = 'tilt';
        if (!tile.querySelector(':scope > .sg-sheen')) make('div', 'sg-sheen', tile).setAttribute('aria-hidden', 'true');
        tile.classList.add('sg-tilted');
      }
    }
    function unlock(immediate = false) {
      if (!locked) return;
      const tile = locked, kind = tile.dataset.sgLock;
      locked = null; tempUntil = 0;
      if (marks) marks.classList.remove('armed', 'sweep', 'on');
      tile.classList.remove('sg-tilted');
      delete tile.dataset.sgLock;
      if (kind === 'voxel') {
        extTarget = 0;
        if (immediate && vcv) { vcv.classList.remove('on'); voxTile = null; ext = 0; }
      } else if (kind === 'tilt') {
        if (immediate) tile.style.transform = '';
        else tiltBack = { tile, at: performance.now(), rx, ry };
      }
    }

    // Only a deliberate hover locks on: the pointer has moved in the last two seconds, and the
    // tile is not one of the very large feature photographs.
    function lockable(tile, now) {
      if (now - ptr.lastT > 2000) return false;
      const b = tile._rosesBounds;
      if (!b) return false;
      return (b.right - b.left) < innerWidth * .46 && (b.bottom - b.top) < innerHeight * .62;
    }

    // Desktop hover is polled: a tile can drift under a still cursor without any pointer event.
    function poll(now) {
      if (!canHover || !st.entered || overlayOpen() || !ptr.inside || ptr.onUi || st.dragging || ptr.down) {
        hoverTile = null;
        return;
      }
      if (++pollTick % 2) return;
      if (holoHit.under()) { hoverTile = null; return; }
      const hit = doc.elementFromPoint(ptr.x, ptr.y);
      const tile = hit && hit.closest ? hit.closest('#stage .tile.photo') : null;
      if (tile !== hoverTile) { hoverTile = tile; hoverSince = now; }
    }

    function update(now, dt) {
      poll(now);
      const m = mode();
      if (locked && m === 'off') unlock(true);
      if (canHover && m !== 'off') {
        if (locked && (locked !== hoverTile || !locked.isConnected || overlayOpen() || st.dragging)) unlock(!locked.isConnected || st.detail);
        if (!locked && hoverTile && now - hoverSince >= DWELL && hoverTile.isConnected && lockable(hoverTile, now)) lock(hoverTile);
      } else if (locked && ((tempUntil && now > tempUntil) || overlayOpen() || !locked.isConnected)) {
        unlock(!locked.isConnected || st.detail);
      }
      // rotation target: the cursor, or a slow sway for the brief tap lock on phones
      let txr = 0, tyr = 0;
      if (locked && locked._rosesBounds) {
        const b = locked._rosesBounds;
        placeMarks(locked);
        if (tempUntil) {
          const t = (now - lockedAt) / 1000;
          tyr = Math.sin(t * 2.2) * MAX_Y * .8; txr = Math.sin(t * 1.5 + 1) * MAX_X * .5;
        } else {
          const u = (ptr.x - (b.left - camera)) / (b.right - b.left);
          const vv = (ptr.y - b.top) / (b.bottom - b.top);
          tyr = clamp((u - .5) * 2, -1, 1) * MAX_Y;
          txr = -clamp((vv - .5) * 2, -1, 1) * MAX_X;
        }
      }
      rx = approach(rx, txr, dt, 110);
      ry = approach(ry, tyr, dt, 110);

      // voxel relief: extrude while locked, retract after
      if (voxTile) {
        ext = approach(ext, extTarget, dt, extTarget > ext ? 150 : 85);
        if (extTarget === 0 && ext < .015) { vcv.classList.remove('on'); voxTile = null; ext = 0; }
        else if (!voxTile.isConnected) { vcv.classList.remove('on'); voxTile = null; }
        else drawVoxels(voxTile, now);
      }

      // CSS tilt (fallback, or chosen in the lab)
      if (locked && locked.dataset.sgLock === 'tilt') applyTilt(locked, rx, ry, 1);
      if (tiltBack) {
        const k = 1 - clamp((now - tiltBack.at) / 260, 0, 1);
        if (k <= 0 || !tiltBack.tile.isConnected) { tiltBack.tile.style.transform = ''; tiltBack = null; }
        else applyTilt(tiltBack.tile, tiltBack.rx, tiltBack.ry, outCubic(k));
      }
    }
    function applyTilt(tile, ax, ay, k) {
      const s = 1 + .035 * k;
      tile.style.transform = `translate3d(0,-50%,0) perspective(820px) rotateX(${(ax * k).toFixed(2)}deg) rotateY(${(ay * k).toFixed(2)}deg) scale(${s.toFixed(4)})`;
      const b = tile._rosesBounds;
      if (b) {
        tile.style.setProperty('--sg-sx', `${((ay / MAX_Y) * (b.right - b.left) * .35).toFixed(1)}px`);
        tile.style.setProperty('--sg-sy', `${((-ax / MAX_X) * (b.bottom - b.top) * .2).toFixed(1)}px`);
      }
    }

    // Phones: the first tap on a photo (Soyong's "select" tap) lifts it for a moment.
    R.stage.addEventListener('click', e => {
      if (canHover || !allowed('lock')) return;
      const tile = e.target.closest && e.target.closest('.tile.photo');
      if (!tile) return;
      setTimeout(() => { if (!st.detail && st.entered && tile.classList.contains('is-hovered')) lock(tile, 1700); }, 0);
    });

    return { name: 'lock', update, unlock, get locked() { return locked; },
      debug: () => ({ mode: mode(), hover: hoverTile && hoverTile.dataset.source, since: Math.round(performance.now() - hoverSince),
        locked: locked && locked.dataset.source, kind: locked && locked.dataset.sgLock, voxelFailed }) };
  })();
  modules.push(Lock);

  /* ============================================================== 5. holograms */
  // During the louder passages a photograph projects a hologram of itself: a beam climbs out of it
  // and the picture resolves in the air above, in three voxel layers that drift with parallax, nearer
  // than the collage. Rest the cursor on one and it sharpens and turns to you; click to open it.
  const Holo = (() => {
    const list = [];
    let layer = null, nextSpawnAt = 0, enteredAt = 0, redirecting = false;
    const maxCount = () => (small() ? 1 : 3);

    function ensureLayer() {
      if (layer) return layer;
      layer = make('div', 'sg-holos');
      layer.setAttribute('aria-hidden', 'true');
      R.exp.insertBefore(layer, R.viewport.nextSibling);
      return layer;
    }

    // Holograms are drawn per pixel when the photographs are same-origin (GitHub Pages, any server):
    // a luminance ramp from deep teal glass to cyan-pale to white, translucent in the shadows, with a
    // rim on edges so the silhouette reads over a busy collage. From file:// the canvas cannot be read,
    // so the fallback tints the image and screen-blends it as pure light.
    let pixelAccess = true;
    const RAMPS = {
      mercury: [[11, 42, 51], [72, 153, 159], [147, 215, 243], [255, 255, 255]],
      red: [[10, 8, 7], [131, 28, 31], [233, 57, 62], [255, 214, 214]],
    };
    const ramp = (stops, t) => {
      const x = clamp(t, 0, 1) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
      const a = stops[i], b = stops[i + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    };
    function drawLayer(cv, img, w, h, style, idx) {
      if (!Number.isFinite(w) || !Number.isFinite(h)) return;
      w = Math.max(3, Math.round(w)); h = Math.max(3, Math.round(h));
      if (cv.width !== w) cv.width = w;
      if (cv.height !== h) cv.height = h;
      const x = cv.getContext('2d', { willReadFrequently: true });
      x.globalCompositeOperation = 'source-over';
      x.imageSmoothingEnabled = true;
      x.clearRect(0, 0, w, h);
      try { x.drawImage(img, 0, 0, w, h); } catch (err) { return; }
      if (pixelAccess) {
        let data;
        try { data = x.getImageData(0, 0, w, h); } catch (err) { pixelAccess = false; }
        if (data) {
          const d = data.data, L = new Float32Array(w * h);
          for (let i = 0, p = 0; i < w * h; i++, p += 4) L[i] = (.2126 * d[p] + .7152 * d[p + 1] + .0722 * d[p + 2]) / 255;
          const stops = style === 'duotone' && idx === 0 ? RAMPS.red : RAMPS.mercury;
          for (let yy = 0; yy < h; yy++) {
            for (let xx = 0; xx < w; xx++) {
              const i = yy * w + xx, p = i * 4;
              const l = Math.pow(L[i], .9);
              const gx = (xx < w - 1 ? L[i + 1] : L[i]) - (xx > 0 ? L[i - 1] : L[i]);
              const gy = (yy < h - 1 ? L[i + w] : L[i]) - (yy > 0 ? L[i - w] : L[i]);
              const rim = clamp(Math.hypot(gx, gy) * 2.6, 0, 1);
              let c;
              if (style === 'joi' && idx > 0) {
                c = [d[p] * 1.08 + 10, d[p + 1] * 1.1 + 14, d[p + 2] * 1.14 + 22];
              } else c = ramp(stops, l * .92 + rim * .25);
              const edge = rim * (idx === 2 ? 70 : 30);
              d[p] = clamp(c[0] + edge * .58, 0, 255);
              d[p + 1] = clamp(c[1] + edge * .84, 0, 255);
              d[p + 2] = clamp(c[2] + edge * .95, 0, 255);
              const base = idx === 2 ? .3 : .22;
              d[p + 3] = clamp((base + .62 * l + .4 * rim) * 255, 0, 255);
            }
          }
          x.putImageData(data, 0, 0);
          return;
        }
      }
      // fallback: tinted light, screen-blended by the .additive class
      if (style !== 'joi') {
        x.globalCompositeOperation = 'saturation'; x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
        x.globalCompositeOperation = 'multiply';
        x.fillStyle = style === 'duotone' && idx === 0 ? COL.red : COL.cyanPale;
        x.fillRect(0, 0, w, h);
      }
      x.globalCompositeOperation = 'multiply';
      x.drawImage(cv, 0, 0);
      if (idx === 2) { x.globalCompositeOperation = 'screen'; x.drawImage(cv, 0, 0); }
      x.globalCompositeOperation = 'source-over';
    }
    function redraw(h, block) {
      h.block = block;
      const style = S.holoStyle;
      const sizes = [block * 2.6, block * 1.6, block];
      h.canvases.forEach((cv, i) => drawLayer(cv, h.img, h.w / sizes[i], h.h / sizes[i], style, i));
      h.el.classList.toggle('additive', !pixelAccess);
    }

    function candidates() {
      const out = [];
      const W = innerWidth, H = innerHeight;
      for (const tile of R.stage.querySelectorAll('.tile.photo.is-loaded')) {
        if (tile.tabIndex !== 0 || tile.classList.contains('is-hovered') || tile === Lock.locked) continue;
        const b = tile._rosesBounds;
        if (!b) continue;
        const l = b.left - camera, r = b.right - camera;
        if (l < W * .08 || r > W * .92 || b.top < H * .12 || b.bottom > H * .98) continue;
        if (list.some(h => h.src === tile.dataset.source)) continue;
        out.push(tile);
      }
      return out;
    }

    function spawn(force = false) {
      if (!force && (!allowed('holo') || list.length >= maxCount())) return null;
      if (!st.entered) return null;
      const tile = pick(candidates());
      if (!tile) return null;
      const img = tile.querySelector('img.original-image');
      if (!img || !img.naturalWidth) return null;
      ensureLayer();
      const b = tile._rosesBounds;
      const ratio = img.naturalWidth / img.naturalHeight;
      const H = innerHeight, W = innerWidth;
      let h = H * rand(small() ? .16 : .19, small() ? .22 : .28);
      let w = h * ratio;
      if (w > W * .34) { w = W * .34; h = w / ratio; }
      const cx = clamp((b.left + b.right) / 2 - camera + rand(-W * .06, W * .06), w / 2 + 10, W - w / 2 - 10);
      const tileTop = b.top;
      // float above the photograph where there is room, otherwise below it
      let cy = tileTop - h / 2 - rand(H * .05, H * .14);
      if (cy - h / 2 < H * .04) cy = b.bottom + h / 2 + rand(H * .04, H * .1);
      cy = clamp(cy, h / 2 + 8, H - h / 2 - 8);
      const el = make('div', 'sg-holo', layer);
      el.style.width = w + 'px'; el.style.height = h + 'px';
      const tilt = make('div', 'sg-holo-tilt', el);
      const canvases = [0, 1, 2].map(i => make('canvas', 'l' + i, tilt));
      make('div', 'sg-holo-scan', tilt);
      const holo = { el, tilt, canvases, img, src: tile.dataset.source, tile, w, h, cx, cy, cam0: camera,
        depth: rand(1.12, 1.48), born: performance.now(), life: rand(9000, 15000), state: 'in',
        phase: rand(0, 6.28), block: 26, locked: false, lockSince: 0, outAt: 0, rx: 0, ry: 0, forced: force };
      redraw(holo, 26);
      list.push(holo);
      // the beam that climbs out of the photograph
      tile.style.setProperty('--sg-h', (b.bottom - b.top) + 'px');
      tile.classList.remove('sg-emit'); void tile.offsetWidth; tile.classList.add('sg-emit');
      later(520, () => tile.classList.remove('sg-emit'));
      const fromY = tileTop, toY = cy + h / 2;
      if (fromY > toY + 6) {
        const beam = make('div', 'sg-holo-beam', layer);
        beam.style.height = (fromY - toY) + 'px';
        beam.style.setProperty('--sg-b', `translate3d(${(b.left + b.right) / 2 - camera}px,${toY}px,0)`);
        later(800, () => beam.remove());
      }
      return holo;
    }

    function despawn(h) {
      if (h.state === 'out') return;
      h.state = 'out'; h.outAt = performance.now();
    }

    function holoUnderPointer() {
      if (!ptr.inside || !canHover) return null;
      for (let i = list.length - 1; i >= 0; i--) {
        const h = list[i];
        if (h.state !== 'live') continue;
        if (Math.abs(ptr.x - h.sx) < h.w / 2 && Math.abs(ptr.y - h.sy) < h.h / 2) return h;
      }
      return null;
    }

    function update(now, dt) {
      if (!st.entered) return;
      if (!enteredAt) { enteredAt = now; nextSpawnAt = now + 3200; }
      const on = allowed('holo');
      const paused = st.detail;
      // how many holograms the song wants right now
      let want = 0;
      if (on && !overlayOpen()) {
        want = S.holo === 'always' ? maxCount() : Math.round(maxCount() * sstep(.15, .85, music.signal));
        if (!music.playing && S.holo === 'music') want = 0;
      }
      const live = list.filter(h => h.state !== 'out');
      const cullable = live.filter(h => !h.forced);
      if (live.length > want && cullable.length) despawn(cullable.sort((a, b) => a.born - b.born)[0]);
      if (live.length < want && now >= nextSpawnAt) {
        nextSpawnAt = now + 1e9; // until the off-beat fires
        later(untilOffbeat(), () => { spawn(); nextSpawnAt = performance.now() + rand(1600, 3200); });
      }
      const target = canHover ? holoUnderPointer() : null;
      for (let i = list.length - 1; i >= 0; i--) {
        const h = list[i];
        const age = Math.max(0, now - h.born);
        if (h.state === 'in' && age > 520) h.state = 'live';
        if (h.state === 'live' && age > h.life) despawn(h);
        // parallax: nearer than the collage, so it travels faster than the photographs
        h.sx = h.cx - (camera - h.cam0) * h.depth + Math.sin(now / 2300 + h.phase) * 8;
        h.sy = h.cy + Math.sin(now / 1700 + h.phase * 1.3) * 6;
        if (h.state !== 'out' && (h.sx + h.w / 2 < -30 || h.sx - h.w / 2 > innerWidth + 30)) despawn(h);
        // lock-on with the cursor
        const isTarget = target === h && !paused;
        if (isTarget && !h.lockSince) h.lockSince = now;
        if (!isTarget) h.lockSince = 0;
        h.locked = isTarget && now - h.lockSince > 160;
        // resolution: materialise, breathe with the song, sharpen when locked, dissolve when leaving
        let block;
        if (h.state === 'in') block = [26, 14, 8, 5][clamp(Math.floor(age / 110), 0, 3)];
        else if (h.state === 'out') block = [7, 12, 20, 30][clamp(Math.floor((now - h.outAt) / 90), 0, 3)];
        else if (h.locked) block = 2;
        else block = music.hit > .82 && music.signal > .45 ? 9 : (Math.sin(now / 1900 + h.phase) > .55 ? 6 : 4);
        if (block !== h.block) redraw(h, block);
        // tilt: idle sway, or turn towards the cursor
        let tx = Math.sin(now / 2600 + h.phase) * 5, ty = Math.sin(now / 3100 + h.phase) * 14;
        if (h.locked) {
          ty = clamp((ptr.x - h.sx) / (h.w / 2), -1, 1) * 22;
          tx = -clamp((ptr.y - h.sy) / (h.h / 2), -1, 1) * 14;
        }
        h.rx = approach(h.rx, tx, dt, 140); h.ry = approach(h.ry, ty, dt, 140);
        // opacity: snap on, rare flicker, brighter when locked
        let op = h.locked ? 1 : .82;
        if (h.state === 'in') op *= age < 60 ? 1.4 : (age % 120 < 30 ? .45 : 1);
        if (h.state === 'out') op *= 1 - clamp((now - h.outAt) / 360, 0, 1);
        if (h.state === 'live' && Math.sin(now / 97 + h.phase * 9) > .985) op *= .35;
        if (paused) op *= 0;
        let sy = 1;
        if (h.state === 'in') sy = clamp(outCubic(age / 260), .02, 1);
        if (h.state === 'out') sy = clamp(1 - outCubic((now - h.outAt - 160) / 200), .02, 1);
        const scale = h.locked ? 1.06 : 1;
        h.el.style.transform = `translate3d(${(h.sx - h.w / 2).toFixed(1)}px,${(h.sy - h.h / 2).toFixed(1)}px,0) scale(${scale},${(scale * sy).toFixed(3)})`;
        h.el.style.opacity = clamp(op, 0, 1).toFixed(3);
        h.tilt.style.transform = `rotateX(${h.rx.toFixed(2)}deg) rotateY(${h.ry.toFixed(2)}deg)`;
        if (h.state === 'out' && now - h.outAt > 380) { h.el.remove(); list.splice(i, 1); }
      }
    }

    // A click on a locked hologram opens its own photograph (Soyong's click handler does the work).
    doc.addEventListener('click', e => {
      if (redirecting || !canHover || !st.entered || overlayOpen()) return;
      const h = list.find(x => x.locked && x.state === 'live');
      if (!h || ptr.moved > 6) return;
      const tile = h.tile && h.tile.isConnected ? h.tile
        : [...R.stage.querySelectorAll('.tile.photo')].find(t => t.dataset.source === h.src);
      if (!tile) return;
      e.preventDefault(); e.stopPropagation();
      redirecting = true;
      try { tile.click(); } finally { redirecting = false; }
    }, true);

    holoHit.under = holoUnderPointer;
    return { name: 'holo', update, spawn: () => spawn(true), list };
  })();
  modules.push(Holo);

  /* ============================================================== 6. ambient register */
  // Grain (cement) and scanlines plus a slow rolling hum bar (signal). Their balance follows the song.
  const Ambient = (() => {
    let built = false, tick = 0;
    function noiseUrl(size, fn) {
      const c = doc.createElement('canvas');
      c.width = size; c.height = size;
      const x = c.getContext('2d'), img = x.createImageData(size, size);
      fn(img.data, size);
      x.putImageData(img, 0, 0);
      return c.toDataURL('image/png');
    }
    function build() {
      if (built) return;
      built = true;
      const grain = noiseUrl(256, (d) => {
        for (let p = 0; p < d.length; p += 4) {
          const n = 128 + (Math.random() + Math.random() + Math.random() - 1.5) * 120;
          // a slightly warm, bone-coloured grain
          d[p] = clamp(n + 6, 0, 255); d[p + 1] = clamp(n + 2, 0, 255); d[p + 2] = clamp(n - 6, 0, 255); d[p + 3] = 255;
        }
      });
      html.style.setProperty('--sg-grain-url', `url("${grain}")`);
      const streak = noiseUrl(240, (d, s) => {
        // short horizontal streaks for the edge-steering layer
        for (let p = 0; p < d.length; p += 4) d[p + 3] = 0;
        for (let k = 0; k < 90; k++) {
          const y = Math.floor(Math.random() * s), x0 = Math.floor(Math.random() * s);
          const len = 12 + Math.random() * 70, a = 60 + Math.random() * 140, cyan = Math.random() < .7;
          for (let x = 0; x < len; x++) {
            const p = (y * s + ((x0 + x) % s)) * 4;
            const fall = 1 - x / len;
            d[p] = cyan ? 147 : 255; d[p + 1] = cyan ? 215 : 255; d[p + 2] = cyan ? 243 : 255; d[p + 3] = a * fall;
          }
        }
      });
      html.style.setProperty('--sg-streak-url', `url("${streak}")`);
      const host = R.exp;
      const add = cls => { const e = make('div', 'sg-amb ' + cls); e.setAttribute('aria-hidden', 'true'); host.appendChild(e); return e; };
      add('sg-grain'); add('sg-scan'); add('sg-hum');
    }
    function update(now) {
      if (!built) build();
      if (++tick % 6) return; // ten times a second is plenty for a register that breathes over seconds
      const sig = st.entered ? music.signal : 0;
      R.exp.style.setProperty('--sg-signal', sig.toFixed(3));
      R.exp.style.setProperty('--sg-cement', (1 - sig).toFixed(3));
    }
    return { name: 'ambient', update, build };
  })();
  modules.push(Ambient);

  /* ============================================================== 7. signal burns */
  // Off-beat events. Gentle ones in the quiet passages (a scanner pass, a single tile tearing),
  // stronger ones when the song is loud (a duotone band burning across, the vertical hold slipping).
  const Burns = (() => {
    let nextAt = 0, lastAt = 0, pending = false, enteredAt = 0;
    const visibleTiles = (loadedOnly = true) => {
      const W = innerWidth, out = [];
      for (const t of R.stage.querySelectorAll(loadedOnly ? '.tile.photo.is-loaded' : '.tile.photo')) {
        const b = t._rosesBounds;
        if (!b) continue;
        const l = b.left - camera, r = b.right - camera;
        if (r > 0 && l < W) out.push(t);
      }
      return out;
    };

    function band(hot = false) {
      const H = innerHeight;
      const h = hot ? H * rand(.06, .14) : H * rand(.1, .3);
      const top = rand(0, H - h);
      const parts = ['g', 'm', 's'].map(k => {
        const e = make('div', 'sg-burn sg-amb ' + k, R.exp);
        e.style.top = top + 'px'; e.style.height = h + 'px';
        return e;
      });
      parts[1].style.background = hot ? COL.red : COL.cyanPale;
      parts[2].style.background = hot ? COL.void : '#3A0C0F'; // oxblood at about 45%, so shadows stay dark
      const flick = [70, 45, hot ? 0 : 85];
      let i = 0;
      const step = () => {
        const visible = i % 2 === 0;
        parts.forEach(p => { p.style.visibility = visible ? 'visible' : 'hidden'; });
        const d = flick[i++];
        if (!d) { parts.forEach(p => p.remove()); return; }
        later(d, step);
      };
      step();
      // the band also drags whatever it crosses a few pixels sideways
      later(10, () => {
        const crossed = visibleTiles().filter(t => { const b = t._rosesBounds; return b.bottom > top && b.top < top + h; });
        for (let k = 0; k < 3 && crossed.length; k++) tear(crossed.splice(Math.floor(Math.random() * crossed.length), 1)[0], 1);
      });
    }

    function tear(tile, strength = 1) {
      const b = tile._rosesBounds;
      if (!b || !tile.isConnected || tile.querySelector(':scope > .sg-slices')) return;
      const src = tile.dataset.source;
      const tw = b.right - b.left, th = b.bottom - b.top;
      const wrap = make('div', 'sg-slices', tile);
      wrap.setAttribute('aria-hidden', 'true');
      const n = 2 + Math.floor(rand(0, 3));
      for (let k = 0; k < n; k++) {
        const sh = th * rand(.06, .2), sy = rand(0, th - sh);
        const s = make('div', 'sg-slice', wrap);
        s.style.top = sy + 'px'; s.style.height = sh + 'px';
        const dx = (chance(.5) ? -1 : 1) * rand(5, 22) * strength;
        s.style.transform = `translate3d(${dx.toFixed(1)}px,0,0)`;
        const split = rand(3, 7) * strength;
        for (const [cls, sx] of [['r', -split], ['c', split]]) {
          const i = make('i', cls, s);
          i.style.top = -sy + 'px'; i.style.height = th + 'px';
          i.style.backgroundImage = `url("${src}")`;
          i.style.backgroundSize = `${tw}px ${th}px`;
          i.style.transform = `translate3d(${sx.toFixed(1)}px,0,0)`;
        }
      }
      later(rand(110, 220), () => {
        // one more jolt before it settles
        wrap.querySelectorAll('.sg-slice').forEach(s => { s.style.transform = `translate3d(${rand(-6, 6).toFixed(1)}px,0,0)`; });
        later(rand(50, 90), () => wrap.remove());
      });
    }

    function vhold() {
      const v = R.viewport;
      const seq = [[0, rand(-14, -8)], [rand(-5, 5), rand(5, 9)], [rand(-2, 2), rand(-3, 3)], null];
      let i = 0;
      const step = () => {
        const s = seq[i++];
        if (!s) { v.style.transform = ''; return; }
        v.style.transform = `translate3d(${s[0].toFixed(1)}px,${s[1].toFixed(1)}px,0)`;
        later(34, step);
      };
      step();
      const tiles = visibleTiles();
      for (let k = 0; k < 2 && tiles.length; k++) tear(pick(tiles), .7);
    }

    function scan() {
      const line = make('div', 'sg-scanline sg-amb', R.exp);
      const W = innerWidth, dur = 700, t0 = performance.now(), touched = new Set();
      const tiles = visibleTiles();
      const step = now => {
        const t = clamp((now - t0) / dur, 0, 1);
        const x = inOutCubic(t) * (W + 20) - 10;
        line.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
        line.style.opacity = String(1 - sstep(.85, 1, t));
        for (const tile of tiles) {
          if (touched.has(tile)) continue;
          const b = tile._rosesBounds;
          if (b && x >= b.left - camera && x <= b.right - camera) { touched.add(tile); Rerender.scan(tile, 150); }
        }
        if (t < 1) requestAnimationFrame(step); else line.remove();
      };
      requestAnimationFrame(step);
    }

    function fire(type) {
      lastAt = performance.now();
      if (type === 'band') band(false);
      else if (type === 'hot') band(true);
      else if (type === 'vhold') vhold();
      else if (type === 'scan') scan();
      else { const t = visibleTiles(); if (t.length) { tear(pick(t)); if (chance(.4)) tear(pick(t), .8); } }
    }
    function choose() {
      const s = music.signal;
      if (s < .35) return chance(.5) ? 'scan' : 'tiles';
      const roll = Math.random();
      if (roll < .3) return 'band';
      if (roll < .42) return 'hot';
      if (roll < .62) return 'vhold';
      if (roll < .8) return 'tiles';
      return 'scan';
    }

    function update(now) {
      if (!st.entered) return;
      if (!enteredAt) { enteredAt = now; nextAt = now + rand(6000, 9000); }
      if (!allowed('burns') || overlayOpen() || pending || document.hidden) return;
      const s = music.signal;
      // A big transient in a loud passage may pull an extra (small) event forward.
      if (music.hit > .86 && s > .55 && now - lastAt > 2600 && now > nextAt - 2500 && chance(.08)) {
        pending = true;
        later(untilOffbeat(), () => { pending = false; if (!overlayOpen()) fire('tiles'); });
        return;
      }
      if (now < nextAt) return;
      const base = S.burns === 'frequent' ? lerp(5.5, 2.4, s) : lerp(16, 5.5, s);
      nextAt = now + base * 1000 * rand(.7, 1.3);
      pending = true;
      later(untilOffbeat(), () => { pending = false; if (!overlayOpen() && allowed('burns')) fire(choose()); });
    }
    return { name: 'burns', update, fire };
  })();
  modules.push(Burns);

  /* ============================================================== 8. edge steering streaks */
  // Soyong's gallery speeds up threefold when the cursor sits near an edge. That edge now streaks,
  // with a hairline of red on the left and cyan on the right.
  const Edge = (() => {
    let l = null, r = null, f = 1;
    function build() {
      if (l) return;
      l = make('div', 'sg-edge l sg-amb', R.exp); make('i', '', l);
      r = make('div', 'sg-edge r sg-amb', R.exp); make('i', '', r);
      l.setAttribute('aria-hidden', 'true'); r.setAttribute('aria-hidden', 'true');
    }
    function update(now, dt) {
      if (!canHover) return;
      build();
      const zone = Math.min(150, Math.max(70, innerWidth * .12));
      let want = 1;
      if (allowed('edge') && st.entered && innerWidth > 760 && ptr.inside && !ptr.onUi && !st.essay && !st.credits && !st.detail) {
        if (ptr.x < zone) want = -3; else if (ptr.x > innerWidth - zone) want = 3;
      }
      f = approach(f, want, dt, 155);
      l.style.opacity = clamp((1 - f) / 4, 0, 1).toFixed(3);
      r.style.opacity = clamp((f - 1) / 2, 0, 1).toFixed(3);
    }
    return { name: 'edge', update };
  })();
  modules.push(Edge);

  /* ============================================================== 9. photo projection */
  const Detail = (() => {
    let proj = null, pxCv = null, token = 0;
    function build() {
      if (proj || !R.detailFrame) return;
      proj = make('div', 'sg-proj', R.detailFrame);
      proj.setAttribute('aria-hidden', 'true');
      make('div', 'sg-proj-r', proj); make('div', 'sg-proj-c', proj);
      const slices = make('div', 'sg-proj-slices', proj);
      for (let i = 0; i < 3; i++) make('div', 'sg-proj-s', slices);
      pxCv = make('canvas', '', proj);
      make('div', 'sg-proj-scan', proj);
      make('div', 'sg-proj-beam', proj);
    }
    function onOpen() {
      const v = variant('detail');
      if (v === 'fade' || !R.detailImg) return;
      build();
      const src = R.detailImg.currentSrc || R.detailImg.src;
      R.detailFrame.style.setProperty('--sg-src', `url("${src}")`);
      proj.querySelectorAll('.sg-proj-s').forEach(s => {
        const t = rand(5, 80), h = rand(4, 14);
        s.style.setProperty('--t', t + '%');
        s.style.setProperty('--b', Math.max(0, 100 - t - h) + '%');
        s.style.setProperty('--dx', ((chance(.5) ? -1 : 1) * rand(10, 34)).toFixed(1) + 'px');
      });
      R.detailFrame.classList.remove('sg-proj-on');
      void R.detailFrame.offsetWidth;
      R.detailFrame.classList.add('sg-proj-on');
      const my = ++token;
      if (v === 'voxel') voxelIn(my);
      later(v === 'joi' ? 1600 : 1000, () => { if (token === my) R.detailFrame.classList.remove('sg-proj-on'); });
    }
    function voxelIn(my) {
      const img = R.detailImg;
      const go = () => {
        const fw = R.detailFrame.offsetWidth || 800, fh = R.detailFrame.offsetHeight || 600;
        const steps = [56, 32, 18, 10, 5];
        const ctx = pxCv.getContext('2d');
        let i = 0;
        const step = () => {
          if (token !== my) return;
          if (i >= steps.length) { pxCv.classList.remove('on'); return; }
          const b = steps[i++];
          pxCv.width = Math.max(2, Math.round(fw / b)); pxCv.height = Math.max(2, Math.round(fh / b));
          try { ctx.drawImage(img, 0, 0, pxCv.width, pxCv.height); } catch (err) { pxCv.classList.remove('on'); return; }
          pxCv.classList.add('on');
          later(i === 1 ? 90 : 62, step);
        };
        step();
      };
      if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
    }
    function onClose() { token++; if (pxCv) pxCv.classList.remove('on'); }
    return { name: 'detail', onOpen, onClose, update() {} };
  })();

  /* ============================================================== 10. cursor ghosts */
  // Two hairline rings follow Soyong's cursor and separate with speed, red left, cyan right.
  const Ghost = (() => {
    let r = null, c = null, gx = 0, gy = 0;
    function update(now, dt) {
      if (!canHover || !R.cursor) return;
      if (!r) {
        r = make('div', 'sg-ghost r', doc.body); c = make('div', 'sg-ghost c', doc.body);
        r.setAttribute('aria-hidden', 'true'); c.setAttribute('aria-hidden', 'true');
      }
      const visible = allowed('cursor') && R.cursor.classList.contains('is-visible');
      gx = approach(gx, ptr.x, dt, 28); gy = approach(gy, ptr.y, dt, 28);
      const off = clamp(ptr.speed * .011, 0, 10);
      const op = visible ? clamp(ptr.speed / 900, 0, .85) : 0;
      r.style.transform = `translate3d(${(gx - off).toFixed(1)}px,${gy.toFixed(1)}px,0) translate(-50%,-50%)`;
      c.style.transform = `translate3d(${(gx + off).toFixed(1)}px,${gy.toFixed(1)}px,0) translate(-50%,-50%)`;
      r.style.opacity = c.style.opacity = op.toFixed(3);
    }
    return { name: 'ghost', update };
  })();
  modules.push(Ghost);

  /* ============================================================== 11. essay: scan edge and a dead video slot */
  const Essay = (() => {
    let beam = null, cv = null, ctx = null, img = null, last = 0, frame = 0;
    function build() {
      if (!R.essay || beam) return;
      beam = make('div', 'sg-essay-beam');
      beam.setAttribute('aria-hidden', 'true');
      R.essay.insertBefore(beam, R.essay.firstChild);
      // Until the YouTube link is in, the video slot shows a dead channel instead of a grey box.
      if (R.essayVideo && !R.essayVideo.querySelector('iframe')) {
        cv = make('canvas', 'sg-essay-static', R.essayVideo);
        cv.setAttribute('aria-hidden', 'true');
        cv.width = 192; cv.height = 108;
        ctx = cv.getContext('2d');
        img = ctx.createImageData(cv.width, cv.height);
        R.essayVideo.classList.add('sg-static-on');
        drawStatic(performance.now());
      }
    }
    function drawStatic(now) {
      if (!ctx) return;
      const d = img.data, w = cv.width, h = cv.height;
      const roll = (now / 40) % h;
      for (let y = 0; y < h; y++) {
        const gain = .55 + Math.random() * .5;
        const bar = Math.abs(y - roll) < 9 ? 1.35 : 1;
        for (let x = 0; x < w; x++) {
          const p = (y * w + x) * 4;
          const n = Math.pow(Math.random(), 2.2) * 120 * gain * bar;
          d[p] = n * .82; d[p + 1] = n * .95; d[p + 2] = n * 1.02; d[p + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    function update(now) {
      if (S.essay === 'off') {
        if (beam) beam.style.display = 'none';
        if (R.essayVideo && cv) { cv.style.display = 'none'; R.essayVideo.classList.remove('sg-static-on'); }
        return;
      }
      build();
      if (beam) beam.style.display = '';
      if (cv) { cv.style.display = ''; R.essayVideo.classList.add('sg-static-on'); }
      if (!cv || !cv.isConnected || !st.essay || reduced()) return;
      if (now - last < 1000 / 20) return;
      last = now; frame++;
      drawStatic(now);
    }
    return { name: 'essay', update };
  })();
  modules.push(Essay);

  /* ============================================================== 12. credits: the rose as a hologram */
  // Frame-119 is roses laid on a concrete ledge. In the credits the concrete falls away and the roses
  // stay as a projection over a thin emitter, with the ledge kept as a faint wireframe behind them.
  const Rose = (() => {
    let wrap = null, tilt = null, main = null, ghost = null, built = false, failed = false, rx = 0, ry = 0;
    const roseImg = () => R.creditsContent && R.creditsContent.querySelector('.credits-rose');
    function render() {
      const img = roseImg();
      if (!img || !img.complete || !img.naturalWidth) return false;
      const w = img.offsetWidth, h = img.offsetHeight;
      if (!w || !h) return false;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      const src = doc.createElement('canvas');
      src.width = W; src.height = H;
      const sx = src.getContext('2d', { willReadFrequently: true });
      sx.drawImage(img, 0, 0, W, H);
      let data;
      try { data = sx.getImageData(0, 0, W, H); } catch (err) { failed = true; return false; }
      const d = data.data, out = new ImageData(W, H), od = out.data, gh = new ImageData(W, H), gd = gh.data;
      const lum = new Float32Array(W * H);
      for (let i = 0, p = 0; i < W * H; i++, p += 4) lum[i] = (.2126 * d[p] + .7152 * d[p + 1] + .0722 * d[p + 2]) / 255;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x, p = i * 4;
          const r = d[p] / 255, g = d[p + 1] / 255, b = d[p + 2] / 255;
          const red = Math.max(0, r - Math.max(g, b)), green = Math.max(0, g - Math.max(r, b));
          let a = clamp((red - .05) / .2, 0, 1) + .8 * clamp((green - .025) / .12, 0, 1);
          a = clamp(a, 0, 1);
          // scanlines baked into the projection
          const scan = (y % 3 === 2) ? .45 : 1;
          const petal = red > green;
          let R2, G2, B2;
          if (petal) { R2 = Math.min(1, r * 1.75 + .1); G2 = Math.min(1, g * 1.05 + .05); B2 = Math.min(1, b * 1.05 + .08); }
          else { R2 = lerp(g * .5, .576, .55); G2 = lerp(g * 1.35, .843, .55); B2 = lerp(b * 1.1, .953, .55); }
          od[p] = R2 * 255; od[p + 1] = G2 * 255; od[p + 2] = B2 * 255; od[p + 3] = a * 255 * scan;
          // the concrete as a wireframe: luminance edges, cyan, faint
          if (x > 0 && y > 0 && x < W - 1 && y < H - 1) {
            const gxv = lum[i + 1] - lum[i - 1], gyv = lum[i + W] - lum[i - W];
            const e = clamp(Math.hypot(gxv, gyv) * 5 - .12, 0, 1) * (1 - a) * scan;
            gd[p] = 147; gd[p + 1] = 215; gd[p + 2] = 243; gd[p + 3] = e * 150;
          }
        }
      }
      main.width = ghost.width = W; main.height = ghost.height = H;
      main.getContext('2d').putImageData(out, 0, 0);
      ghost.getContext('2d').putImageData(gh, 0, 0);
      return true;
    }
    function place() {
      const img = roseImg();
      if (!img || !wrap) return;
      const ir = img.getBoundingClientRect(), cr = R.creditsContent.getBoundingClientRect();
      wrap.style.left = (ir.left - cr.left) + 'px'; wrap.style.top = (ir.top - cr.top) + 'px';
      wrap.style.width = ir.width + 'px'; wrap.style.height = ir.height + 'px';
    }
    function build() {
      if (built || failed) return built;
      const img = roseImg();
      if (!img) { failed = true; return false; }
      wrap = make('div', 'sg-rose');
      wrap.setAttribute('aria-hidden', 'true');
      make('div', 'sg-rose-cone', wrap);
      tilt = make('div', 'sg-rose-tilt', wrap);
      ghost = make('canvas', 'ghost', tilt);
      main = make('canvas', 'main', tilt);
      make('div', 'sg-rose-emit', wrap);
      img.after(wrap);
      if (!render()) { wrap.remove(); wrap = null; return false; }
      built = true;
      addEventListener('resize', () => { if (st.credits) { render(); place(); } });
      return true;
    }
    function onOpen() {
      if (!allowed('credits') && S.credits === 'off') return;
      requestAnimationFrame(() => {
        if (!build()) return;
        roseImg().classList.add('sg-held');
        wrap.style.display = '';
        place();
        if (!reduced()) { wrap.classList.remove('boot'); void wrap.offsetWidth; wrap.classList.add('boot'); }
      });
    }
    function update(now, dt) {
      if (!built) return;
      if (S.credits === 'off') { wrap.style.display = 'none'; roseImg().classList.remove('sg-held'); return; }
      if (!st.credits) return;
      roseImg().classList.add('sg-held');
      wrap.style.display = '';
      if (reduced()) return;
      let tx, ty;
      if (canHover && ptr.inside) {
        ty = clamp((ptr.x / innerWidth - .5) * 2, -1, 1) * 16;
        tx = -clamp((ptr.y / innerHeight - .5) * 2, -1, 1) * 10;
      } else { ty = Math.sin(now / 1400) * 12; tx = Math.sin(now / 1900) * 5; }
      rx = approach(rx, tx, dt, 160); ry = approach(ry, ty, dt, 160);
      tilt.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      if (now % 1000 < 20) place();
    }
    return { name: 'rose', onOpen, update };
  })();
  modules.push(Rose);

  /* ============================================================== observers: what Soyong's page is doing */
  const watch = (node, fn, opts = { attributes: true, attributeFilter: ['class', 'hidden'], attributeOldValue: true }) => {
    if (!node) return;
    new MutationObserver(recs => { for (const r of recs) fn(r); }).observe(node, opts);
  };
  const had = (rec, cls) => (rec.oldValue || '').split(/\s+/).includes(cls);
  watch(R.entry, rec => {
    if (rec.attributeName !== 'class') return;
    if (R.entry.classList.contains('reveal-engine') && !had(rec, 'reveal-engine')) Static.onReveal();
    if (R.entry.classList.contains('releasing') && !had(rec, 'releasing')) Static.onRelease();
  });
  watch(R.intro, rec => {
    if (rec.attributeName === 'class' && R.intro.classList.contains('leaving') && !had(rec, 'leaving')) {
      Static.onLeaving();
      Hiss.stop(.45);
    }
  });
  watch(R.detail, rec => {
    if (rec.attributeName !== 'class') return;
    const open = R.detail.classList.contains('is-open'), was = had(rec, 'is-open');
    if (open && !was) { Lock.unlock(true); Detail.onOpen(); }
    if (!open && was) Detail.onClose();
  });
  watch(R.credits, rec => {
    if (rec.attributeName === 'class' && R.credits.classList.contains('is-open') && !had(rec, 'is-open')) Rose.onOpen();
  });
  // Tile hover bursts: a new burst is either is-hovered being added or the treatment number changing.
  watch(R.stage, (() => {
    let queued = new Set(), scheduled = false;
    return rec => {
      const t = rec.target;
      if (!t.classList || !t.classList.contains('tile')) return;
      if (!t.classList.contains('is-hovered')) return;
      if (rec.attributeName === 'class' && had(rec, 'is-hovered')) return;
      if (rec.attributeName === 'data-filter' && rec.oldValue === t.dataset.filter) return;
      queued.add(t);
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(() => { scheduled = false; const q = queued; queued = new Set(); q.forEach(Rerender.run); });
      }
    };
  })(), { attributes: true, subtree: true, attributeFilter: ['class', 'data-filter'], attributeOldValue: true });

  // The hiss has to start inside the visitor's own gesture for iOS, so it listens to the same inputs.
  if (R.enter) R.enter.addEventListener('click', () => { if (!st.entered) Hiss.start(); });
  doc.addEventListener('keydown', e => {
    if (st.entered || !st.introVisible) return;
    if ((e.key === 'Enter' || e.code === 'Space' || e.key === ' ') && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey) Hiss.start();
  });
  // Opening state at load: if the engine already revealed before this script ran, catch up.
  if (R.entry.classList.contains('reveal-engine')) Static.onReveal();

  /* ============================================================== lab panel */
  const Lab = (() => {
    let panel = null, fpsEl = null;
    function save() {
      try { localStorage.setItem('sg-cyber-lab', JSON.stringify(S)); } catch (err) { /* ignore */ }
    }
    function link() {
      const diff = Object.keys(S).filter(k => S[k] !== DEFAULTS[k]).map(k => `${k}:${S[k]}`).join(',');
      const u = new URL(location.href);
      u.searchParams.delete('lab');
      if (diff) u.searchParams.set('fx', diff); else u.searchParams.delete('fx');
      return u.toString();
    }
    function set(key, value) {
      if (!VARIANTS[key] || !VARIANTS[key].includes(value)) return;
      S[key] = value;
      applyClasses();
      save();
      if (panel) panel.querySelectorAll(`[data-k="${key}"]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === value)));
    }
    function build() {
      if (panel) return;
      panel = make('section', 'sg-lab', doc.body);
      panel.setAttribute('aria-label', 'Cyber layer variants');
      const h = make('h2', '', panel); h.textContent = 'Cyber layer';
      const p = make('p', '', panel);
      p.textContent = 'Defaults are the first option in each row. Changes apply live and are kept on this device.';
      for (const key of Object.keys(VARIANTS)) {
        const row = make('div', 'row', panel);
        make('span', '', row).textContent = LABELS[key] || key;
        const opts = make('div', 'opts', row);
        for (const value of VARIANTS[key]) {
          const b = make('button', '', opts);
          b.type = 'button'; b.textContent = value; b.dataset.k = key; b.dataset.v = value;
          b.setAttribute('aria-pressed', String(S[key] === value));
          b.addEventListener('click', e => { e.stopPropagation(); set(key, value); });
        }
      }
      const fireRow = make('div', 'row', panel);
      make('span', '', fireRow).textContent = 'Fire now';
      const fo = make('div', 'opts', fireRow);
      for (const [label, fn] of [['band', () => Burns.fire('band')], ['hot', () => Burns.fire('hot')],
        ['tiles', () => Burns.fire('tiles')], ['scan', () => Burns.fire('scan')], ['v-hold', () => Burns.fire('vhold')],
        ['hologram', () => Holo.spawn()]]) {
        const b = make('button', '', fo); b.type = 'button'; b.textContent = label;
        b.addEventListener('click', e => { e.stopPropagation(); if (st.entered) fn(); });
      }
      const foot = make('div', 'foot', panel);
      const copy = make('button', '', foot); copy.type = 'button'; copy.textContent = 'Copy link';
      copy.addEventListener('click', async e => {
        e.stopPropagation();
        try { await navigator.clipboard.writeText(link()); copy.textContent = 'Copied'; }
        catch (err) { prompt('Link with these settings', link()); }
        later(1400, () => { copy.textContent = 'Copy link'; });
      });
      const reset = make('button', '', foot); reset.type = 'button'; reset.textContent = 'Reset';
      reset.addEventListener('click', e => { e.stopPropagation(); for (const k of Object.keys(DEFAULTS)) set(k, DEFAULTS[k]); });
      const orig = make('button', '', foot); orig.type = 'button'; orig.textContent = 'Original';
      orig.title = 'Open the week 6 release without the cyber layer';
      orig.addEventListener('click', e => { e.stopPropagation(); const u = new URL(location.href); u.search = '?cyber=off'; window.open(u.toString(), '_blank', 'noopener'); });
      fpsEl = make('span', 'fps', foot);
      panel.addEventListener('pointerdown', e => e.stopPropagation());
      panel.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    }
    function update() {
      if (fpsEl) fpsEl.textContent = `${fpsMeter.value} fps, layer ${fpsMeter.cost.toFixed(2)} ms${reduced() ? ', reduced motion' : ''}`;
    }
    if (LAB) {
      build();
      doc.addEventListener('keydown', e => {
        if (e.key === '`' && !e.repeat) { panel.hidden = !panel.hidden; }
      });
    }
    return { name: 'lab', update, set };
  })();
  modules.push(Lab);

  /* ============================================================== start */
  Static.init();
  requestAnimationFrame(loop);
  window.SGCyber = { version: '1.0', settings: S, set: Lab.set, burn: t => Burns.fire(t || 'band'),
    hologram: () => Holo.spawn(), holograms: () => Holo.list.map(h => ({ src: h.src, state: h.state, locked: h.locked, sx: h.sx, sy: h.sy, w: h.w, h: h.h })),
    pointer: ptr, lock: () => Lock.debug(), staticMask: () => Static.debugMask(), staticCanvas: () => Static.canvas(),
    staticTune: o => Static.tune(o), staticSurge: () => Static.surge(), music, cost: () => ({ fps: fpsMeter.value, ms: fpsMeter.cost }) };
})();
