import { mountReel } from './reel/reel.js';

const FILE_MB = 18.4;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const card = document.querySelector('.share');
const button = card.querySelector('.send');
const label = card.querySelector('.send-label');
const icon = card.querySelector('.send-plane');
const attStatus = card.querySelector('.att-status');
const attBar = card.querySelector('.att-bar span');
const status = card.querySelector('.share-status');
const trailSvg = card.querySelector('.trail-layer');
const trail = trailSvg.querySelector('.trail');
const planeLayer = card.querySelector('.plane-layer');

// Mask that reveals the dotted trail as the plane flies (a solid stroke drawn with dashoffset).
trailSvg.insertAdjacentHTML('afterbegin',
  '<defs><mask id="trail-reveal" maskUnits="userSpaceOnUse"><path class="trail-mask" fill="none" stroke="#fff" stroke-width="6"/></mask></defs>');
const trailMask = trailSvg.querySelector('.trail-mask');
trail.setAttribute('mask', 'url(#trail-reveal)');

const setState = (state) => { card.dataset.state = state; };

function setProgress(p) {
  button.style.setProperty('--progress', p.toFixed(3));
  attBar.style.width = `${p * 100}%`;
  label.textContent = `Uploading ${Math.round(p * 100)}%`;
  attStatus.textContent = `${(FILE_MB * p).toFixed(1)} of ${FILE_MB} MB · Uploading`;
}

/** Fake upload: progress eases from 0 to 1 over `duration` ms, driven by requestAnimationFrame. */
function upload(duration = 1700) {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(1 - (1 - t) ** 3); // ease-out: fast start, gentle finish
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

/** Centre of an element in the card's own coordinate space (ignores any CSS scale on the page). */
function centreIn(el) {
  const c = card.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const scale = c.width / card.offsetWidth;
  return { x: (r.left + r.width / 2 - c.left) / scale, y: (r.top + r.height / 2 - c.top) / scale };
}

/** The plane leaves the button, loops once and shoots off the top-right corner. */
async function launchPlane() {
  const { x, y } = centreIn(icon);
  const w = card.offsetWidth;
  const path =
    `M ${x} ${y} C ${x + 90} ${y - 20}, ${x + 120} ${y - 150}, ${x + 30} ${y - 150} ` +
    `C ${x - 60} ${y - 150}, ${x - 60} ${y - 60}, ${x + 20} ${y - 70} ` +
    `C ${x + 120} ${y - 80}, ${w} ${-40}, ${w + 140} ${-140}`;

  trail.setAttribute('d', path);
  trailMask.setAttribute('d', path);
  const length = trailMask.getTotalLength();
  trailMask.style.strokeDasharray = `${length}`;
  trail.style.opacity = '1';

  const plane = document.createElement('div');
  plane.className = 'flying-plane';
  plane.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 3l-7 18-4-7-7-4z"/><path d="M21 3L10 14"/></svg>';
  plane.style.offsetPath = `path('${path}')`;
  planeLayer.append(plane);
  icon.style.opacity = '0';

  const flight = { duration: 1300, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' };
  trailMask.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], flight);
  await plane.animate([
    { offsetDistance: '0%', transform: 'scale(0.8)', opacity: 1 },
    { offsetDistance: '55%', transform: 'scale(1.25)', opacity: 1, offset: 0.55 },
    { offsetDistance: '100%', transform: 'scale(0.6)', opacity: 0 },
  ], flight).finished;
  plane.remove();
  trail.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
}

async function send() {
  button.disabled = true;
  setState('uploading');
  setProgress(0);
  await upload();
  label.textContent = 'Sending…';
  if (!reducedMotion) await launchPlane();

  setState('sent');
  label.textContent = 'Sent ✓';
  attStatus.textContent = `${FILE_MB} MB · Delivered to 5 people`;
  status.textContent = 'final-assets.zip was shared with Design team.';
}

button.addEventListener('click', send);

function reset() {
  planeLayer.replaceChildren();
  trail.getAnimations().forEach((a) => a.cancel());
  trail.style.opacity = '0';
  icon.style.opacity = '';
  button.style.removeProperty('--progress');
  attBar.style.width = '0';
  setState('idle');
  label.textContent = 'Send';
  attStatus.textContent = `${FILE_MB} MB · Ready to send`;
  status.textContent = '';
  button.disabled = false;
}

reset();

/* ---------- Reel mode ---------- */

mountReel({
  eyebrow: 'UI animation #03',
  title: 'Send File',
  accent: 'Paper Plane',
  demo: card,
  demoScale: 1.7,
  file: 'send-file-animation/script.js',
  code: `
// One path drives both the dotted trail and the plane
trail.setAttribute('d', path);
plane.style.offsetPath = \`path('\${path}')\`;

// Reveal the trail with a mask while the plane flies
mask.animate(
  [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
  flight,
);
plane.animate([
  { offsetDistance: '0%', transform: 'scale(.8)' },
  { offsetDistance: '55%', transform: 'scale(1.25)' },
  { offsetDistance: '100%', opacity: 0 },
], flight);`,
  reset,
  async play({ cursor, sleep, waitFor }) {
    await cursor.click(button);
    await waitFor(() => card.dataset.state === 'sent');
    await sleep(1800);
  },
});
