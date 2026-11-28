/*! ROSES: "If Seoul were a person" answer board. Sativus Gourd, November 2026.
 *  Visitors answer with a pixel bouquet instead of a name. Answers go to a Google Sheet through the
 *  Apps Script in seoul-answers.gs (the same pattern as Hyperlink Heaven's guestbook). Until ENDPOINT
 *  is filled in, answers are kept on the visitor's own device only.
 */
(() => {
  'use strict';
  // Paste the Apps Script web app URL (ends in /exec) here once seoul-answers.gs is deployed.
  const ENDPOINT = '';
  const LOCAL_KEY = 'sg-seoul-answers';
  const MAX_LEN = 240;
  const board = document.getElementById('seoulBoard');
  if (!board) return;
  const connected = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(ENDPOINT);
  const $ = sel => board.querySelector(sel);
  const form = $('#seoulForm'), keys = $('#seoulKeys'), list = $('#seoulList'), status = $('#seoulStatus');
  const textarea = form.querySelector('textarea'), button = form.querySelector('button[type="submit"]');

  /* ------------------------------------------------------------ pixel bouquets (20 x 26) */
  const W = 20, H = 26;
  const ROSE = {
    red: ['#ff6a60', '#e9393e', '#831c1f'], white: ['#ffffff', '#ebe6d7', '#b3ac9e'],
    pink: ['#f5b6c2', '#e08a9b', '#9c5b71'], peach: ['#fdbe8a', '#e59a60', '#9c5b4a'],
    dark: ['#831c1f', '#5a141a', '#2a0a0c'], yellow: ['#f0de6a', '#d7c02c', '#8a7a1a'],
  };
  const GREEN = { stem: '#3f6b3b', leaf: '#5c8a48', dark: '#2e4f2c' };
  const BOUQUETS = [
    { wrap: 'kraft', roses: ['red'], n: 5, ribbon: '#48999f', label: 'Red roses in kraft paper' },
    { wrap: 'news', roses: ['white'], n: 5, ribbon: '#e9393e', label: 'White roses in newspaper' },
    { wrap: 'black', roses: ['red', 'dark'], n: 6, ribbon: '#b3ac9e', label: 'Dark red roses in black paper' },
    { wrap: 'cello', roses: ['pink'], n: 5, ribbon: '#e9393e', label: 'Pink roses in cellophane' },
    { wrap: 'none', roses: ['red'], n: 1, single: true, label: 'A single red rose' },
    { wrap: 'bag', roses: ['yellow'], n: 4, label: 'Yellow roses in a shop bag' },
    { wrap: 'kraft', roses: ['peach'], n: 4, wilted: true, ribbon: '#831c1f', label: 'Wilting roses in kraft paper' },
    { wrap: 'pink', roses: ['white', 'red'], n: 6, ribbon: '#ebe6d7', label: 'Red and white roses in pink paper' },
  ];
  const WRAP = {
    kraft: { base: '#b98a5a', shade: '#8e6640', light: '#d6ab78', mark: '#6e4e30' },
    news: { base: '#d8d3c7', shade: '#a9a399', light: '#eeeae0', mark: '#3a3733' },
    black: { base: '#1e1b19', shade: '#0f0d0c', light: '#3a3733', mark: '#b3ac9e' },
    cello: { base: '#93d7f3', shade: '#48999f', light: '#ffffff', mark: '#ffffff', alpha: .38 },
    pink: { base: '#e8a5b4', shade: '#b8788a', light: '#f7c9d3', mark: '#9c5b71' },
    bag: { base: '#ebe6d7', shade: '#b3ac9e', light: '#ffffff', mark: '#e9393e' },
  };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  function drawBouquet(b, seed) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'), im = ctx.createImageData(W, H), d = im.data;
    const r = rng(seed);
    const px = (x, y, col, a = 1) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H || !col) return;
      const p = (y * W + x) * 4, c = hex(col), ia = d[p + 3] / 255, na = a + ia * (1 - a);
      for (let k = 0; k < 3; k++) d[p + k] = na ? (c[k] * a + d[p + k] * ia * (1 - a)) / na : 0;
      d[p + 3] = na * 255;
    };
    const head = (x, y, tone, big) => {
      const [li, ba, dk] = ROSE[tone];
      const m = big
        ? ['.aab.', 'abbbc', 'abdbc', 'bbbcc', '.ccc.']
        : ['.ab.', 'abbc', 'bdbc', '.cc.'];
      m.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch === '.') return;
        px(x + i, y + j, ch === 'a' ? li : ch === 'b' ? ba : ch === 'c' ? dk : dk);
      }));
    };
    const W8 = WRAP[b.wrap];
    if (b.single) {
      for (let y = 8; y < 25; y++) px(10, y, GREEN.stem);
      px(9, 14, GREEN.leaf); px(8, 14, GREEN.leaf); px(8, 13, GREEN.dark);
      px(11, 18, GREEN.leaf); px(12, 18, GREEN.leaf); px(12, 17, GREEN.dark);
      px(11, 11, GREEN.dark); px(9, 21, GREEN.dark);
      head(8, 3, b.roses[0], true);
      px(9, 8, GREEN.leaf); px(11, 8, GREEN.leaf);
    } else {
      // stems behind the wrap (they show through cellophane)
      for (let k = 0; k < 4; k++) for (let y = 11; y < 24; y++) px(7 + k * 2 + (y > 18 ? (k < 2 ? 1 : -1) : 0), y, GREEN.stem, .9);
      // back edge of the paper
      if (W8) for (let x = 1; x < 19; x++) px(x, 8 + (x % 3 === 0 ? 0 : 1), W8.light, W8.alpha || 1);
      // heads, with a few leaves between them
      const spots = [[-7, 2], [-3, 0], [1, 1], [4, 3], [-5, 5], [-1, 4], [3, 6], [-8, 7]];
      const cx = 9, cy = b.wilted ? 6 : 3;
      for (let i = 0; i < 6; i++) px(cx + Math.round(r() * 14 - 7), cy + 2 + Math.round(r() * 6), r() < .5 ? GREEN.leaf : GREEN.dark);
      for (let i = 0; i < b.n; i++) {
        const [ox, oy] = spots[i];
        const tone = b.roses[i % b.roses.length];
        const jx = Math.round(r() * 2 - 1), jy = Math.round(r() * 2 - 1) + (b.wilted ? Math.round(r() * 3) : 0);
        head(cx + ox + jx, cy + oy + jy, b.wilted && i % 2 ? 'dark' : tone, false);
      }
      if (b.wilted) { px(3, 13, ROSE.peach[2]); px(17, 12, ROSE.dark[1]); }
      // the wrap
      if (b.wrap === 'bag') {
        for (let y = 10; y < 26; y++) {
          const t = (y - 10) / 15, half = 7.5 - t * 1.5, xl = Math.round(9.5 - half), xr = Math.round(9.5 + half);
          for (let x = xl; x <= xr; x++) {
            let col = x === xl || x === xr ? W8.shade : W8.base;
            if (y === 15 || y === 16) col = W8.mark;
            if (y === 10) col = W8.light;
            px(x, y, col);
          }
        }
        for (const [x, y] of [[4, 8], [4, 9], [5, 7], [6, 7], [7, 8], [12, 8], [13, 7], [14, 7], [15, 8], [15, 9]]) px(x, y, W8.shade);
      } else {
        for (let y = 10; y < 26; y++) {
          const t = (y - 10) / 15, half = 8.8 * (1 - t) + 1.2 * t;
          const xl = Math.round(9.5 - half), xr = Math.round(9.5 + half);
          for (let x = xl; x <= xr; x++) {
            let col = x < 9.5 ? W8.shade : W8.base;
            if (x === xr) col = W8.light;
            if (y === 10) col = W8.light;
            if (b.wrap === 'kraft' && r() < .12) col = W8.mark;
            if (b.wrap === 'news' && y % 2 === 0 && x > xl && x < xr && r() < .7) col = W8.mark;
            if (b.wrap === 'black' && x === xr) col = W8.mark;
            if (b.wrap === 'pink' && (x - y) % 6 === 0) col = W8.mark;
            let a = W8.alpha || 1;
            if (b.wrap === 'cello' && (x + y) % 7 === 0) { col = W8.mark; a = .7; }
            px(x, y, col, a);
          }
        }
        if (b.ribbon) {
          for (let x = 5; x <= 14; x++) px(x, 18, b.ribbon);
          for (const [x, y] of [[8, 17], [11, 17], [9, 19], [10, 19], [8, 20], [11, 20]]) px(x, y, b.ribbon);
        }
      }
    }
    ctx.putImageData(im, 0, 0);
    return cv.toDataURL('image/png');
  }
  const SPRITES = BOUQUETS.map((b, i) => drawBouquet(b, 4021 + i * 97));

  /* ------------------------------------------------------------ picker */
  const start = Math.floor(Math.random() * BOUQUETS.length);
  BOUQUETS.forEach((b, i) => {
    const label = document.createElement('label');
    label.className = 'sg-seoul-key';
    label.title = b.label;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'bouquet'; input.value = String(i);
    input.setAttribute('aria-label', b.label);
    if (i === start) input.checked = true;
    const img = document.createElement('img');
    img.src = SPRITES[i]; img.alt = ''; img.width = W; img.height = H;
    label.append(input, img);
    keys.append(label);
  });

  /* ------------------------------------------------------------ answers */
  let entries = [];
  const say = (ko, en) => { status.textContent = ''; const a = document.createElement('span'); a.lang = 'ko'; a.textContent = ko; const b = document.createElement('span'); b.lang = 'en'; b.textContent = en; status.append(a, ' ', b); };
  const stamp = d => {
    const t = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(t.getTime())) return String(d || '');
    const z = n => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${z(t.getMonth() + 1)}-${z(t.getDate())} ${z(t.getHours())}:${z(t.getMinutes())}`;
  };
  function render() {
    list.textContent = '';
    if (!entries.length) {
      const li = document.createElement('li');
      li.className = 'sg-seoul-empty';
      li.innerHTML = '<span lang="ko">아직 답이 없어요.</span> <span lang="en">No answers yet.</span>';
      list.append(li);
      return;
    }
    entries.slice(-100).reverse().forEach(o => {
      const li = document.createElement('li');
      const img = document.createElement('img');
      const n = Math.max(0, Math.min(BOUQUETS.length - 1, parseInt(o.bouquet, 10) || 0));
      img.src = SPRITES[n]; img.alt = BOUQUETS[n].label; img.width = W; img.height = H;
      const body = document.createElement('div');
      const msg = document.createElement('p'); msg.textContent = String(o.message || '');
      const time = document.createElement('time'); time.textContent = stamp(o.date);
      body.append(msg, time);
      li.append(img, body);
      list.append(li);
    });
  }
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (err) { return []; } };
  const writeLocal = a => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(a.slice(-100))); return true; } catch (err) { return false; } };

  function load() {
    if (!connected) {
      entries = readLocal(); render();
      say('지금은 이 기기에만 저장돼요.', 'Saved on this device for now.');
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      const cb = 'sgSeoul_' + Date.now() + '_' + Math.floor(Math.random() * 1e5);
      const tag = document.createElement('script');
      let done = false;
      const finish = ok => { if (done) return; done = true; clearTimeout(timer); delete window[cb]; tag.remove(); resolve(ok); };
      const timer = setTimeout(() => { say('불러오지 못했어요.', "Couldn't load answers."); finish(false); }, 8500);
      window[cb] = payload => {
        if (payload && payload.ok && Array.isArray(payload.entries)) { entries = payload.entries; render(); say('', ''); finish(true); }
        else { say('불러오지 못했어요.', "Couldn't load answers."); finish(false); }
      };
      tag.onerror = () => { say('연결이 끊겼어요.', 'Connection lost.'); finish(false); };
      tag.src = ENDPOINT + '?action=list&callback=' + encodeURIComponent(cb) + '&t=' + Date.now();
      document.head.append(tag);
    });
  }

  let sending = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    const f = new FormData(form);
    if (String(f.get('website') || '')) return;
    const message = String(f.get('message') || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
    const bouquet = parseInt(f.get('bouquet'), 10);
    if (!message || !(bouquet >= 0)) { say('꽃다발을 고르고 답을 적어 주세요.', 'Pick a bouquet and write an answer.'); textarea.focus(); return; }
    sending = true; button.disabled = true;
    const entry = { bouquet, message, date: new Date().toISOString() };
    if (!connected) {
      const all = readLocal(); all.push(entry); writeLocal(all);
      entries = all; render(); form.reset();
      keys.querySelectorAll('input')[bouquet].checked = true;
      say('이 기기에 저장했어요.', 'Saved on this device.');
      sending = false; button.disabled = false;
      return;
    }
    say('보내는 중…', 'Sending…');
    try {
      await fetch(ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'post', bouquet: String(bouquet), message, website: '' }) });
      entries.push(entry); render(); form.reset();
      keys.querySelectorAll('input')[bouquet].checked = true;
      say('보냈어요.', 'Sent.');
      setTimeout(() => load(), 1800);
    } catch (err) {
      say('보내지 못했어요. 다시 해 주세요.', "Couldn't send. Try again.");
    }
    sending = false; button.disabled = false;
  });
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); }
  });
  load();
})();
