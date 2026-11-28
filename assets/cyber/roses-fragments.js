/* ROSES fragments: puts the Korean interview line for the open photograph under it.
   Reads window.ROSES_FRAGMENTS (assets/fragments.js), keyed by file name. Only observes Soyong's
   overlay, like the cyber layer: no edits to her code. Variant: ?fx=frag:phosphor|teletext|off,
   also switchable live from the ?lab panel. The caption is content, so it runs with ?cyber=off too. */
(() => {
  'use strict';
  const DATA = window.ROSES_FRAGMENTS || {};
  const overlay = document.getElementById('photoDetailOverlay');
  const img = document.getElementById('photoDetailImage');
  if (!overlay || !img) return;

  const html = document.documentElement;
  const MODES = /(?:^|\s)sg-frag-(phosphor|teletext|off)(?=\s|$)/;
  // The cyber layer sets the class from ?fx or the lab; without it (?cyber=off) read ?fx here.
  if (!MODES.test(html.className)) {
    const fx = new URLSearchParams(location.search).get('fx') || '';
    const pick = (fx.match(/(?:^|,)frag:(phosphor|teletext|off)/) || [])[1] || 'phosphor';
    html.classList.add(`sg-frag-${pick}`);
  }
  const mode = () => (html.className.match(MODES) || [])[1] || 'phosphor';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // Fetch the pixel face early so the first caption is measured in it, not in the fallback.
  if (document.fonts && document.fonts.load) document.fonts.load('12px "Galmuri11 Roses"', '서울').catch(() => {});

  const cap = document.createElement('p');
  cap.className = 'sg-frag'; cap.id = 'sgFrag'; cap.lang = 'ko'; cap.hidden = true;
  const line = cap.appendChild(document.createElement('span'));
  overlay.appendChild(cap);

  // The src attribute is set before is-open, so it always names the photo being opened.
  const fileOf = (src) => { try { return decodeURIComponent(new URL(src, location.href).pathname.split('/').pop()); } catch { return ''; } };
  // The caption waits for the photo to finish arriving: projector ~0.5 s, joi ~0.8 s, fade ~0.25 s.
  const delay = () => {
    if (reduced.matches) return 0;
    if (html.classList.contains('sg-detail-joi')) return 820;
    if (html.classList.contains('sg-detail-projector') || html.classList.contains('sg-detail-voxel')) return 520;
    return 240;
  };

  let onTimer = 0, blipTimer = 0, open = false;
  function measure() {
    const cs = getComputedStyle(cap);
    overlay.style.setProperty('--frag-h', `${Math.ceil(cap.offsetHeight + parseFloat(cs.marginTop))}px`);
  }
  function show(wait = delay()) {
    const text = DATA[fileOf(img.getAttribute('src') || img.currentSrc || '')];
    clearTimeout(onTimer); clearTimeout(blipTimer); cap.classList.remove('is-on', 'sg-blip');
    if (!text || mode() === 'off') {
      cap.hidden = true; line.textContent = '';
      overlay.classList.remove('has-frag'); overlay.removeAttribute('aria-describedby'); return;
    }
    line.textContent = text;
    cap.hidden = false;
    overlay.classList.add('has-frag');
    overlay.setAttribute('aria-describedby', 'sgFrag');
    // One layout read per open: the photo shrinks by exactly the caption's height.
    measure();
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => { if (open && !cap.hidden) measure(); });
    onTimer = setTimeout(() => { if (open) { cap.classList.add('is-on'); scheduleBlip(); } }, wait);
  }
  function hide() {
    clearTimeout(onTimer); clearTimeout(blipTimer);
    cap.classList.remove('is-on', 'sg-blip');
  }

  // Optional: on loud passages, a one-frame slip on the off-beat (half beat plus 20 to 60 ms),
  // the same artefact timing as the rest of the cyber layer.
  const song = document.getElementById('soundtrack');
  const P = window.ROSES_PULSE;
  function loudness(t) {
    if (!P || !P.energy) return 0;
    const c = P.energy[Math.min(P.energy.length - 1, Math.max(0, Math.floor(t * P.hz)))];
    return parseInt(c, 36) / 35;
  }
  function scheduleBlip() {
    clearTimeout(blipTimer);
    if (!open || reduced.matches || mode() !== 'phosphor' || !P || !song) return;
    blipTimer = setTimeout(() => {
      if (!open) return;
      const t = song.currentTime, { period, phase } = P.beat;
      const toHalf = ((phase + period / 2 - t) % period + period) % period;
      blipTimer = setTimeout(() => {
        if (open && !song.paused && loudness(song.currentTime) > 0.55) {
          cap.classList.add('sg-blip');
          requestAnimationFrame(() => requestAnimationFrame(() => cap.classList.remove('sg-blip')));
        }
        scheduleBlip();
      }, toHalf * 1000 + 20 + Math.random() * 40);
    }, 2200 + Math.random() * 2600);
  }

  new MutationObserver(() => {
    const now = overlay.classList.contains('is-open');
    if (now && !open) { open = true; show(); }
    else if (!now && open) { open = false; hide(); }
  }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
  // Keep the photo's room for the caption until the overlay is fully hidden, so closing doesn't jump.
  new MutationObserver(() => { if (overlay.hidden) { overlay.classList.remove('has-frag'); cap.hidden = true; } })
    .observe(overlay, { attributes: true, attributeFilter: ['hidden'] });
  // A variant switched in the lab while a photo is open applies at once.
  document.addEventListener('sg:variant', e => { if (e.detail && e.detail.key === 'frag' && open) show(0); });
})();
