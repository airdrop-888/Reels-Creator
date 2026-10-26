// Reels-Creator v1 — content script untuk chat Muse (muse.ai)
// Tugasnya cuma satu: cari kotak chat, isi dengan prompt berikutnya dari antrean.
// Default TIDAK auto-send. Auto-send hanya jalan kalau toggle di popup/panel ON,
// dan hanya kalau tombol kirim ketemu + aktif. Kalau tidak ketemu, teks tetap
// terisi dan user tinggal tekan Enter / klik kirim manual.
(() => {
  const PANEL_ID = 'reels-creator-panel';

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 20 && r.height > 10 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  // Cari composer: utamakan elemen yang paling bawah & paling lebar di viewport
  // (itu ciri kotak chat), bukan kotak search di header.
  function findComposer() {
    const candidates = [...document.querySelectorAll(
      'textarea, div[contenteditable="true"], [role="textbox"]'
    )].filter(isVisible);
    if (!candidates.length) return null;
    // Buang yang jelas-jelas bukan composer: search, filter, dsb.
    const filtered = candidates.filter((el) => {
      const hay = `${el.getAttribute('placeholder') || ''} ${el.getAttribute('aria-label') || ''} ${el.id || ''} ${el.className || ''}`.toLowerCase();
      return !/search|cari|filter|find/.test(hay);
    });
    const pool = filtered.length ? filtered : candidates;
    pool.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      // bawah dulu, lalu lebar
      return rb.top - ra.top || rb.width - ra.width;
    });
    return pool[0];
  }

  function findSendButton(composer) {
    const btns = [...document.querySelectorAll('button')].filter(isVisible);
    const labelled = btns.filter((b) => {
      const hay = `${b.getAttribute('aria-label') || ''} ${b.title || ''} ${b.textContent || ''}`.toLowerCase();
      return /^(send|kirim)$/.test(hay.trim()) || hay.includes('send message') || hay.includes('send prompt');
    });
    if (labelled.length) return labelled[labelled.length - 1];
    // Fallback: tombol submit terdekat dengan composer
    if (composer) {
      let scope = composer.closest('form') || composer.parentElement;
      for (let i = 0; i < 4 && scope; i++) {
        const b = scope.querySelector('button[type="submit"]');
        if (b && isVisible(b)) return b;
        scope = scope.parentElement;
      }
    }
    return null;
  }

  function injectText(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const setter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      )?.set;
      if (setter) setter.call(el, text);
      else el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    // contenteditable / ProseMirror / React editor
    const sel = window.getSelection();
    try {
      sel.selectAllChildren(el);
      if (document.execCommand('insertText', false, text)) return true;
    } catch (_) { /* lanjut fallback */ }
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  async function getState() {
    const s = await chrome.storage.local.get({ queue: [], index: 0, autoSend: false });
    return { queue: Array.isArray(s.queue) ? s.queue : [], index: s.index || 0, autoSend: !!s.autoSend };
  }

  function setStatus(msg) {
    const el = document.getElementById('rc-status');
    if (el) el.textContent = msg;
  }

  async function injectNext() {
    const state = await getState();
    if (state.index >= state.queue.length) {
      setStatus('Antrean habis. Tambah prompt lewat popup extension.');
      return { ok: false, reason: 'empty' };
    }
    const composer = findComposer();
    if (!composer) {
      setStatus('Kotak chat tidak ketemu. Pastikan halaman chat Muse sudah terbuka penuh, lalu coba lagi.');
      return { ok: false, reason: 'no-composer' };
    }
    const text = state.queue[state.index];
    injectText(composer, text);
    composer.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await chrome.storage.local.set({ index: state.index + 1 });
    const left = state.queue.length - (state.index + 1);
    setStatus(`Prompt ${state.index + 1}/${state.queue.length} sudah masuk. Sisa: ${left}.`);
    if (state.autoSend) {
      await new Promise((r) => setTimeout(r, 800));
      const btn = findSendButton(composer);
      if (btn && !btn.disabled) {
        btn.click();
        setStatus(`Prompt ${state.index + 1} terkirim otomatis. Sisa: ${left}.`);
      } else {
        setStatus(`Prompt ${state.index + 1} sudah masuk, tapi tombol kirim tidak ketemu — tekan Enter / kirim manual.`);
      }
    }
    return { ok: true, index: state.index + 1, total: state.queue.length };
  }

  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return;
    const box = document.createElement('div');
    box.id = PANEL_ID;
    box.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px">🎬 Reels-Creator</div>
      <div id="rc-status" style="font-size:12px;line-height:1.4;margin-bottom:8px">Siap. Buka popup extension untuk isi antrean prompt.</div>
      <button id="rc-next" style="flex:1">Suntik prompt berikutnya</button>
      <button id="rc-hide" title="Sembunyikan panel (muncul lagi setelah refresh)">✕</button>
    `;
    Object.assign(box.style, {
      position: 'fixed', right: '16px', bottom: '16px', zIndex: '2147483647',
      width: '280px', padding: '12px', borderRadius: '12px', fontFamily: 'system-ui, sans-serif',
      fontSize: '13px', color: '#fff', background: 'rgba(20,20,30,.92)',
      boxShadow: '0 8px 30px rgba(0,0,0,.35)', display: 'flex', flexWrap: 'wrap', gap: '6px',
    });
    box.querySelectorAll('button').forEach((b) => {
      b.style.cssText += 'border:0;border-radius:8px;padding:8px 10px;cursor:pointer;background:#7c5cff;color:#fff;font-weight:600';
    });
    box.querySelector('#rc-hide').style.cssText += 'flex:0 0 auto;background:#444';
    box.querySelector('#rc-next').addEventListener('click', injectNext);
    box.querySelector('#rc-hide').addEventListener('click', () => box.remove());
    document.body.appendChild(box);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'rc-ping') sendResponse({ ok: true });
    if (msg?.type === 'rc-inject-next') injectNext().then(sendResponse);
    return true;
  });

  // Tunggu body siap (SPA Muse bisa render belakangan)
  if (document.body) buildPanel();
  else new MutationObserver((_m, obs) => {
    if (document.body) { buildPanel(); obs.disconnect(); }
  }).observe(document.documentElement, { childList: true });
})();
