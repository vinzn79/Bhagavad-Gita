/* Shrimad Bhagavad Gita — installable web app */
(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const store = {
  get(k, d) { try { const v = localStorage.getItem('gita.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('gita.' + k, JSON.stringify(v)); } catch (e) {} }
};
const S = {
  meta: null, index: null, scripts: {}, content: {}, i18n: {},
  lang: store.get('lang', 'en'), fs: store.get('fs', 1),
  query: '', qChapter: 'all', qTheme: '', installEvt: null
};
const cache = new Map();
async function getJSON(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });
  cache.set(url, p);
  try { return await p; } catch (e) { cache.delete(url); throw e; }
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DEVA_DIG = '०१२३४५६७८९';
const NATIVE_DIG = { deva: DEVA_DIG, beng: '০১২৩৪৫৬৭৮৯', asm: '০১২৩৪৫৬৭৮৯', guru: '੦੧੨੩੪੫੬੭੮੯', gujr: '૦૧૨૩૪૫૬૭૮૯', orya: '୦୧୨୩୪୫୬୭୮୯',
  taml: '௦௧௨௩௪௫௬௭௮௯', telu: '౦౧౨౩౪౫౬౭౮౯', knda: '೦೧೨೩೪೫೬೭೮೯', mlym: '൦൧൨൩൪൫൬൭൮൯', mtei: '꯰꯱꯲꯳꯴꯵꯶꯷꯸꯹', olck: '᱐᱑᱒᱓᱔᱕᱖᱗᱘᱙', urdu: '۰۱۲۳۴۵۶۷۸۹', iast: '0123456789' };
const digits = (n, sc) => String(n).replace(/\d/g, d => (NATIVE_DIG[sc] || '0123456789')[d]);
const DANDA = { urdu: ['۔', '۔۔'], iast: ['|', '||'], olck: ['᱾', '᱿'], mtei: ['꯫', '꯫꯫'] };

/* ---------- data ---------- */
const lang = () => S.meta.languages.find(l => l.id === S.lang) || S.meta.languages[0];
const chMeta = n => S.meta.chapters[n - 1];
const langName = code => (S.meta.languages.find(l => l.id === code) || {}).name || code;
const themeById = id => S.meta.themes.find(t => t.id === id);
async function loadScript(sc) { if (!S.scripts[sc]) S.scripts[sc] = await getJSON(`data/scripts/${sc}.json`); return S.scripts[sc]; }
async function loadChapter(n) {
  if (S.content[n] !== undefined) return S.content[n];
  if (!S.meta.ready.includes(n)) return (S.content[n] = null);
  const arr = await getJSON(`data/content/ch${n}.json`);
  S.content[n] = Object.fromEntries(arr.map(x => [x.id, x]));
  return S.content[n];
}
async function loadI18n(code, n) {
  const key = code + n;
  if (S.i18n[key] !== undefined) return S.i18n[key];
  const ready = (S.meta.langReady[code] || []).includes(n);
  S.i18n[key] = ready ? await getJSON(`data/i18n/${code}/ch${n}.json`).catch(() => null) : null;
  return S.i18n[key];
}
async function prep(chapters) {
  const L = lang();
  await Promise.all([loadScript('deva'), loadScript(L.script), loadScript('iast'),
    ...chapters.map(loadChapter), ...chapters.map(n => loadI18n(L.id, n)),
    ...(L.fb ? chapters.map(n => loadI18n(L.fb, n)) : [])]);
}

/* ---------- rendering helpers ---------- */
function versesLines(id, sc) {
  const rec = S.scripts[sc]?.[id];
  if (!rec) return '';
  const [spk, lines] = rec;
  const v = id.split('.')[1];
  const [d1, d2] = DANDA[sc] || ['।', '॥'];
  const html = lines.map((l, i) => esc(l) + (i < lines.length - 1 ? ` <span class="dd">${d1}</span>` : ` <span class="dd">${d2}${digits(v, sc)}${d2}</span>`)).join('<br>');
  return (spk ? `<div class="spk s-${sc}">${esc(spk)}</div>` : '') + html;
}
function textFor(id) {
  const n = +id.split('.')[0]; const c = S.content[n]?.[id]; const L = lang();
  if (!c) return null;
  const loc = S.i18n[L.id + n]?.[id];
  let tr, m, trLang = L.id, mLang = L.id, ai = false;
  if (L.id === 'en') { tr = c.en; m = c.men; }
  else if (L.id === 'hi' || L.id === 'sa') { tr = c.hi; m = c.mhi; trLang = mLang = 'hi'; }
  else {
    tr = loc?.tr; m = loc?.m; ai = !!(tr || m);
    const fb = L.fb || (L.script === 'deva' ? 'hi' : 'en');
    const fbLoc = !['en', 'hi'].includes(fb) ? S.i18n[fb + n]?.[id] : null;
    if (!tr) {
      if (fbLoc?.tr) { tr = fbLoc.tr; trLang = fb; }
      else if (fb === 'hi') { tr = c.hi; trLang = 'hi'; }
      else { tr = c.en; trLang = 'en'; }
    }
    if (!m) { m = fb === 'hi' ? c.mhi : c.men; mLang = fb === 'hi' ? 'hi' : 'en'; }
  }
  return { c, tr, m, trLang, mLang, ai };
}
const langCls = code => (['en', 'hi'].includes(code) ? '' : `l-${code}`);
function chips(ts) {
  return `<div class="chips">${(ts || []).map(t => { const th = themeById(t); return th ? `<a class="chip" style="--c:${th.c}" href="#theme-${t}"><i></i>${esc(th.en)}</a>` : ''; }).join('')}</div>`;
}
function verseRow(id, opts = {}) {
  const L = lang(); const sc = L.script; const t = textFor(id);
  const alt = sc !== 'deva' ? `<div class="alt s-${sc}"><div class="alt-label" dir="ltr">${esc(S.meta.scripts[sc])} script</div>${versesLines(id, sc)}</div>` : '';
  const other = !['en', 'hi', 'sa'].includes(L.id);
  const trNote = t && other ? (t.trLang === L.id ? `<div class="ai-note">AI translation into ${esc(L.name)}</div>` : `<div class="ai-note">${esc(L.name)} translation coming soon — showing ${esc(langName(t.trLang))}.</div>`) : '';
  const mNote = t && other && t.mLang !== L.id ? `<div class="ai-note">Meaning shown in ${esc(langName(t.mLang))}.</div>` : (t && other ? `<div class="ai-note">AI translation into ${esc(L.name)}</div>` : '');
  const trHtml = t ? `<div class="tr ${langCls(t.trLang)}" lang="${t.trLang}">${opts.hl ? opts.hl(t.tr) : esc(t.tr)}</div>${trNote}`
    : `<div class="pending">Translation coming in the next update.</div>`;
  const mHtml = t ? `<div class="mean ${langCls(t.mLang)}" lang="${t.mLang}">${opts.hl ? opts.hl(t.m) : esc(t.m)}</div>${mNote}`
    : `<div class="pending">Meaning coming in the next update.</div>`;
  const [c, v] = id.split('.');
  return `<article class="verse" id="v-${c}-${v}">
    <div class="vno"><a href="#v-${c}-${v}" title="Link to this shloka">${id}</a><button class="mini" data-copy="${id}">Copy</button></div>
    <div><div class="col-label">Shloka</div><div class="skt" lang="sa">${versesLines(id, 'deva')}</div>${alt}${v === '0' ? '<div class="ai-note">This opening verse of Chapter 13 appears in some editions only and is not counted in the 700.</div>' : ''}</div>
    <div><div class="col-label">Translation</div>${trHtml}</div>
    <div><div class="col-label">Meaning</div>${mHtml}</div>
    <div><div class="col-label">Connects to</div>${t ? chips(t.c.t) : '<span class="pending">—</span>'}</div>
  </article>`;
}
const tableHead = () => `<div class="vt-head"><div>Shloka no.</div><div>Sanskrit</div><div>Translation</div><div>Meaning</div><div>Connects to</div></div>`;
function setBg(name) {
  const img = $('#bgArt'); const map = { krishna: ['art/krishna.svg', ''], chakra: ['art/chakra.svg', 'spin'], chariot: ['art/chariot.svg', 'wide'], flute: ['art/flute.svg', ''] };
  const [src, cls] = map[name];
  if (!img.src.endsWith(src)) img.src = src;
  img.className = cls;
}
function navOn(key) { document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === key)); }
function chName(n) { const c = chMeta(n); return S.lang === 'hi' ? c.hi : c.en; }

/* ---------- views ---------- */
function dayIndex(len) { const d = new Date(); const day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5); return ((day * 7919) % len + len) % len; }
async function viewHome() {
  setBg('chariot'); navOn('home');
  await prep(S.meta.ready);
  const pool = [];
  for (const n of S.meta.ready) for (const [id, c] of Object.entries(S.content[n] || {})) if (c.t.some(t => t !== 'story')) pool.push(id);
  const id = pool[dayIndex(pool.length)]; const t = textFor(id); const [c, v] = id.split('.');
  const L = lang();
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
  view.innerHTML = `
  <section class="hero">
    <div class="vod">
      <div class="vod-top"><span class="eyebrow">Verse of the day · ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</span><a class="btn small ghost" href="#v-${c}-${v}">${id}</a></div>
      <div class="skt" lang="sa">${versesLines(id, 'deva')}</div>
      ${L.script !== 'deva' ? `<div class="alt s-${L.script}">${versesLines(id, L.script)}</div>` : ''}
      <div class="tr ${langCls(t.trLang)}" lang="${t.trLang}">${esc(t.tr)}</div>
      <div class="mean ${langCls(t.mLang)}" lang="${t.mLang}" style="margin-top:10px">${esc(t.m)}</div>
      <div style="margin-top:12px">${chips(t.c.t)}</div>
      <div class="vod-actions"><a class="btn" href="#ch-${c}">Read Chapter ${c}</a><button class="btn ghost" data-copy="${id}">Copy verse</button>
        <button class="btn ghost install ${S.installEvt ? 'show' : ''}" id="installBtn">Install app</button></div>
      ${isIOS ? '<div class="ai-note" style="margin-top:10px">To install on iPhone or iPad: tap Share, then “Add to Home Screen”.</div>' : ''}
    </div>
    <div class="hero-art"><img src="art/krishna.svg" alt="Shri Krishna playing the flute"></div>
  </section>
  <section class="section">
    <span class="eyebrow">18 chapters · 700 shlokas</span>
    <h2>Chapters</h2>
    ${chapterGrid()}
  </section>
  <section class="section">
    <span class="eyebrow">What does the Gita say about…</span>
    <h2>Explore by theme</h2>
    <div class="chips" style="gap:10px">${S.meta.themes.map(th => `<a class="chip big" style="--c:${th.c}" href="#theme-${th.id}"><i></i>${esc(th.en)} <span style="color:var(--muted)">· ${esc(th.hi)}</span></a>`).join('')}</div>
  </section>
  ${footer()}`;
  const ib = $('#installBtn'); if (ib) ib.onclick = async () => { if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; ib.classList.remove('show'); } };
}
function chapterGrid() {
  return `<div class="ch-grid">${S.meta.chapters.map(c => {
    const count = S.index.filter(x => x.c === c.n && x.v > 0).length;
    const ready = S.meta.ready.includes(c.n);
    return `<a class="ch-card" href="#ch-${c.n}"><span class="ch-num">${c.n}</span><span><div class="sa">${esc(c.sa)}</div><div class="en">${esc(c.en)}</div><div class="ct">${count} shlokas ${ready ? '<span class="ready">Full meanings</span>' : '<span class="soon">Sanskrit · meanings soon</span>'}</div></span></a>`;
  }).join('')}</div>`;
}
function footer() {
  return `<footer class="foot about" style="padding:20px 0 0"><p><b>About the text.</b> Sanskrit verses follow the traditional text (all 700 shlokas, in the standard numbering). English and Hindi translations and meanings were written fresh for this app from the Sanskrit, following the traditional understanding; they are not copied from any published translation. Meanings in other Indian languages are AI translations. Scripts other than Devanagari are converted automatically from the Devanagari text. Illustrations are original artwork made for this app.</p></footer>`;
}
async function viewChapters() {
  setBg('chakra'); navOn('chapters');
  view.innerHTML = `<span class="eyebrow">Shrimad Bhagavad Gita</span><h1>All 18 chapters</h1><p class="lede">Every chapter in order, from Arjuna's despair on the battlefield to the final teaching on freedom. Tap a chapter to read its shlokas.</p>${chapterGrid()}${footer()}`;
}
async function viewChapter(n, focus) {
  setBg('chakra'); navOn('chapters');
  await prep([n]);
  const c = chMeta(n); const L = lang();
  const ids = S.index.filter(x => x.c === n).map(x => x.id);
  const count = ids.filter(id => !id.endsWith('.0')).length;
  const scName = L.script !== 'deva' && L.script !== 'iast' ? `<div class="s-${L.script}" style="font-size:1.1rem;color:var(--ink-2)">${esc(S.scripts[L.script]?.__chapters?.[n] || '')}</div>` : '';
  view.innerHTML = `
  <div class="ch-head"><span class="ch-num">${n}</span><div><div class="sa">${esc(c.sa)}</div>${scName}<h1 style="margin:0">${esc(S.lang === 'hi' ? c.hi : c.en)}</h1></div></div>
  <p class="lede">${esc(c.about)} <span style="color:var(--muted)">· ${count} shlokas</span></p>
  ${S.meta.ready.includes(n) ? '' : `<div class="note-box">All ${count} Sanskrit shlokas of this chapter are here in every script. Translations, meanings and themes for Chapter ${n} are coming in the next update.</div>`}
  <nav class="ch-tabs" aria-label="Chapters">${S.meta.chapters.map(x => `<a href="#ch-${x.n}" class="${x.n === n ? 'on' : ''}" title="${esc(x.en)}">${x.n}</a>`).join('')}</nav>
  ${tableHead()}
  ${ids.map(id => verseRow(id)).join('')}
  <div class="pager">${n > 1 ? `<a class="btn ghost" href="#ch-${n - 1}">← Chapter ${n - 1}</a>` : '<span></span>'}${n < 18 ? `<a class="btn" href="#ch-${n + 1}">Chapter ${n + 1} →</a>` : ''}</div>`;
  const tab = $('.ch-tabs a.on'); if (tab) tab.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (focus) { const el = document.getElementById(focus); if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); } }
  else window.scrollTo(0, 0);
}
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function makeHL(q) {
  if (!q) return null;
  const words = q.split(/\s+/).filter(w => w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return null;
  const re = new RegExp('(' + words.join('|') + ')', 'gi');
  return s => esc(s).replace(re, '<mark>$1</mark>');
}
async function viewSearch() {
  setBg('flute'); navOn('search');
  view.innerHTML = `<span class="eyebrow">Search all 700 shlokas</span><h1>Search</h1>
  <p class="lede">Search by verse number (2.47), an English or Hindi word, a Sanskrit word in Devanagari or Roman letters (karma, कर्म), or a phrase.</p>
  <div class="search-box"><svg viewBox="0 0 24 24" width="20" height="20" fill="#7a7186"><path d="M10 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5 10.1 4.6 4.6-1.4 1.4-4.6-4.6z"/></svg>
  <input id="q" type="search" placeholder="e.g. anger, duty, मन, 2.47" value="${esc(S.query)}" autocomplete="off" enterkeyhint="search"></div>
  <div class="filters"><select id="qc"><option value="all">All chapters</option>${S.meta.chapters.map(c => `<option value="${c.n}" ${String(S.qChapter) === String(c.n) ? 'selected' : ''}>Chapter ${c.n} · ${esc(c.en)}</option>`).join('')}</select>
  <select id="qt"><option value="">Any theme</option>${S.meta.themes.map(t => `<option value="${t.id}" ${S.qTheme === t.id ? 'selected' : ''}>${esc(t.en)}</option>`).join('')}</select></div>
  <div id="results"></div>`;
  await prep(S.meta.ready);
  const run = () => { S.query = $('#q').value; S.qChapter = $('#qc').value; S.qTheme = $('#qt').value; renderResults(); };
  let tm; $('#q').addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(run, 180); });
  $('#qc').onchange = run; $('#qt').onchange = run;
  renderResults();
  if (!S.query) $('#q').focus();
}
function renderResults() {
  const box = $('#results'); const q = S.query.trim();
  if (!q && !S.qTheme) { box.innerHTML = `<p class="count">Type to search, or pick a theme.</p>`; return; }
  const L = lang(); const fq = fold(q); const terms = fq.split(/\s+/).filter(Boolean);
  const idMatch = q.match(/^(\d{1,2})[.:\s](\d{1,2})$/);
  const out = [];
  for (const x of S.index) {
    if (S.qChapter !== 'all' && x.c !== +S.qChapter) continue;
    const c = S.content[x.c]?.[x.id];
    if (S.qTheme && !(c && c.t.includes(S.qTheme))) continue;
    if (idMatch) { if (x.c === +idMatch[1] && x.v === +idMatch[2]) out.push(x.id); continue; }
    if (!terms.length) { out.push(x.id); continue; }
    const loc = S.i18n[L.id + x.c]?.[x.id];
    const hay = fold([x.id, c?.en, c?.hi, c?.men, c?.mhi, loc?.tr, loc?.m, (S.scripts.deva[x.id]?.[1] || []).join(' '), (S.scripts.iast[x.id]?.[1] || []).join(' '), c ? c.t.map(t => themeById(t)?.en).join(' ') : ''].join(' '));
    if (terms.every(t => hay.includes(t))) out.push(x.id);
  }
  const shown = out.slice(0, 120);
  const hl = makeHL(q);
  box.innerHTML = `<p class="count">${out.length} shloka${out.length === 1 ? '' : 's'} found${out.length > shown.length ? ` · showing first ${shown.length}` : ''}${!S.meta.ready.every(Boolean) || S.meta.ready.length < 18 ? ` · word search covers translations in chapters ${S.meta.ready.join(', ')} and the Sanskrit of all chapters` : ''}</p>${shown.length ? tableHead() : ''}${shown.map(id => verseRow(id, { hl })).join('')}`;
}
async function viewThemes(sel) {
  setBg('krishna'); navOn('themes');
  await prep(S.meta.ready);
  const counts = {};
  for (const n of S.meta.ready) for (const c of Object.values(S.content[n] || {})) for (const t of c.t) counts[t] = (counts[t] || 0) + 1;
  const th = sel && themeById(sel);
  const ids = th ? S.index.filter(x => S.content[x.c]?.[x.id]?.t.includes(sel)).map(x => x.id) : [];
  view.innerHTML = `<span class="eyebrow">What the Gita connects to</span><h1>${th ? esc(th.en) + ` <span style="font-family:var(--skt);font-size:.7em;color:var(--ink-2)">${esc(th.hi)}</span>` : 'Themes'}</h1>
  <p class="lede">${th ? `${ids.length} shlokas connect to <b>${esc(th.en.toLowerCase())}</b>, in chapter order.` : 'Pick a theme to see every shloka that speaks to it, in chapter order.'}</p>
  <div class="theme-grid">${S.meta.themes.map(t => `<a class="theme-card ${t.id === sel ? 'on' : ''}" style="--c:${t.c}" href="#theme-${t.id}"><b>${esc(t.en)}</b><span>${esc(t.hi)} · ${counts[t.id] || 0} shlokas</span></a>`).join('')}</div>
  ${th ? tableHead() + ids.map(id => verseRow(id)).join('') : ''}`;
  if (th) $('.vt-head')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/* ---------- router ---------- */
async function route() {
  const h = (location.hash || '#home').slice(1);
  let m;
  try {
    if (h === 'home' || h === '') await viewHome();
    else if (h === 'chapters') await viewChapters();
    else if ((m = h.match(/^ch-(\d{1,2})$/)) && +m[1] >= 1 && +m[1] <= 18) await viewChapter(+m[1]);
    else if ((m = h.match(/^v-(\d{1,2})-(\d{1,2})$/))) await viewChapter(+m[1], h);
    else if (h === 'search') await viewSearch();
    else if (h === 'themes') await viewThemes();
    else if ((m = h.match(/^theme-([a-z]+)$/))) await viewThemes(m[1]);
    else await viewHome();
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="note-box">Something went wrong loading this page. Please check your connection and try again.</div>`;
  }
  if (!h.startsWith('v-')) view.focus({ preventScroll: true });
}

/* ---------- language sheet ---------- */
function renderLangLabel() { const L = lang(); $('#langLabel').textContent = L.native; document.documentElement.lang = L.id === 'sa' ? 'sa' : L.id; }
function openLang() {
  const ready = code => code === 'en' || code === 'hi' || code === 'sa' || (S.meta.langReady[code] || []).length > 0;
  $('#langGrid').innerHTML = S.meta.languages.map(l => `<button class="lang-opt ${l.id === S.lang ? 'on' : ''}" data-lang="${l.id}"><b class="l-${l.id}" style="direction:ltr">${esc(l.native)}</b><span>${esc(l.name)} · ${esc(S.meta.scripts[l.script])}${ready(l.id) ? '' : ' · translation soon'}</span></button>`).join('');
  $('#langSheet').hidden = false; $('#langGrid .on')?.focus();
}
function closeLang() { $('#langSheet').hidden = true; $('#langBtn').focus(); }

/* ---------- misc ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove('show'), 1800); }
function copyVerse(id) {
  const n = +id.split('.')[0]; const rec = S.scripts.deva[id]; const t = textFor(id);
  const text = [`Bhagavad Gita ${id}`, ...(rec ? rec[1] : []), '', t ? t.tr : '', t ? t.m : ''].join('\n').trim();
  const done = () => toast('Copied ' + id);
  try { navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done)); } catch (e) { fallbackCopy(text, done); }
}
function fallbackCopy(text, done) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy not available here'); } ta.remove(); }
function applyFs() { document.documentElement.style.setProperty('--fs', S.fs); }

async function init() {
  applyFs();
  [S.meta, S.index] = await Promise.all([getJSON('data/meta.json'), getJSON('data/index.json')]);
  renderLangLabel();
  document.addEventListener('click', e => {
    const cp = e.target.closest('[data-copy]'); if (cp) { copyVerse(cp.dataset.copy); return; }
    const lo = e.target.closest('[data-lang]');
    if (lo) { S.lang = lo.dataset.lang; store.set('lang', S.lang); renderLangLabel(); closeLang(); route(); toast('Reading in ' + lang().name); }
  });
  $('#langBtn').onclick = openLang; $('#langClose').onclick = closeLang;
  $('#langSheet').addEventListener('click', e => { if (e.target.id === 'langSheet') closeLang(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#langSheet').hidden) closeLang(); });
  $('#sizeUp').onclick = () => { S.fs = Math.min(1.4, +(S.fs + .1).toFixed(1)); store.set('fs', S.fs); applyFs(); };
  $('#sizeDown').onclick = () => { S.fs = Math.max(.8, +(S.fs - .1).toFixed(1)); store.set('fs', S.fs); applyFs(); };
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; $('#installBtn')?.classList.add('show'); });
  await route();
  try { if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
}
init().catch(e => { console.error(e); view.innerHTML = '<div class="note-box">Could not load the Gita data. If you opened this file directly from your computer, please open it through the hosted link instead.</div>'; });
})();
