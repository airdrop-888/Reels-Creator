// Reels-Creator v1.2 — content script untuk chat AI (utama muse.ai,
// juga chat lain yang diaktifkan lewat popup). Guard ganda supaya injeksi
// on-demand tidak membuat panel/listener dobel.
//
// Gambar referensi (.jpg/.png): best-effort, karena dialog file picker
// bawaan OS tidak bisa diisi otomatis oleh extension mana pun. Strateginya:
//  1) isi <input type="file"> chat yang sudah ada di halaman (termasuk yang
//     tersembunyi) lewat DataTransfer, lalu picu event change;
//  2) kalau belum ada input file, klik tombol lampiran (📎/+) lalu ulangi;
//  3) kalau tetap tidak ada, salin 1 gambar pertama ke clipboard — user
//     tinggal Ctrl+V di kotak chat. Status selalu jujur soal metode yang jalan.
(() => {
  if (window.__reelsCreatorLoaded) return;
  window.__reelsCreatorLoaded = true;
  const PANEL_ID = 'reels-creator-panel';

  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 20 && r.height > 10 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  function findComposer() {
    const candidates = [...document.querySelectorAll(
      'textarea, div[contenteditable="true"], [role="textbox"]'
    )].filter(isVisible);
    if (!candidates.length) return null;
    const filtered = candidates.filter((el) => {
      const hay = `${el.getAttribute('placeholder') || ''} ${el.getAttribute('aria-label') || ''} ${el.id || ''} ${el.className || ''}`.toLowerCase();
      return !/search|cari|filter|find/.test(hay);
    });
    const pool = filtered.length ? filtered : candidates;
    pool.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
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
    const s = await chrome.storage.local.get({ queue: [], index: 0, autoSend: false, refImages: [] });
    return {
      queue: Array.isArray(s.queue) ? s.queue : [],
      index: s.index || 0,
      autoSend: !!s.autoSend,
      refImages: Array.isArray(s.refImages) ? s.refImages : [],
    };
  }

  function setStatus(msg) {
    const el = document.getElementById('rc-status');
    if (el) el.textContent = msg;
  }

  async function dataUrlToFile(img) {
    const res = await fetch(img.dataUrl);
    const blob = await res.blob();
    return new File([blob], img.name || 'referensi.png', { type: img.type || blob.type || 'image/png' });
  }

  function findFileInputs() {
    // Input file chat sering disembunyikan (display:none) tapi tetap bisa
    // diisi lewat JS, jadi jangan difilter pakai isVisible.
    return [...document.querySelectorAll('input[type="file"]')].filter((el) => {
      const accept = (el.getAttribute('accept') || '').toLowerCase();
      return !accept || /image|\.jpg|\.jpeg|\.png|\.webp|\*/.test(accept);
    });
  }

  function findAttachButton() {
    return [...document.querySelectorAll('button')].filter(isVisible).find((b) => {
      const hay = `${b.getAttribute('aria-label') || ''} ${b.title || ''} ${b.textContent || ''}`.toLowerCase();
      return /attach|upload|paperclip|lampiran|tambah.*(file|gambar|foto)|add.*(file|image|photo)/.test(hay)
        || b.textContent.trim() === '📎' || b.textContent.trim() === '+';
    }) || null;
  }

  async function attachViaFileInput(files) {
    let inputs = findFileInputs();
    if (!inputs.length) {
      const btn = findAttachButton();
      if (btn) {
        btn.click();
        await new Promise((r) => setTimeout(r, 700));
        inputs = findFileInputs();
      }
    }
    if (!inputs.length) return null;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    const input = inputs[0];
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { method: 'file-input', count: files.length };
  }

  async function attachRefImages(refImages, composer) {
    if (!refImages.length) return null;
    try {
      const files = [];
      for (const img of refImages) files.push(await dataUrlToFile(img));
      const viaInput = await attachViaFileInput(files);
      if (viaInput) return viaInput;
    } catch (e) {
      // Jatuh ke clipboard di bawah; jangan gagalkan suntikan teks.
      console.warn('[Reels-Creator] attach via file input gagal:', e);
    }
    // Fallback: clipboard (1 gambar). Butuh fokus ke composer dulu.
    try {
      if (navigator.clipboard && window.ClipboardItem && composer) {
        composer.focus();
        const blob = await (await fetch(refImages[0].dataUrl)).blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
        return { method: 'clipboard', count: 1, total: refImages.length };
      }
    } catch (e) {
      console.warn('[Reels-Creator] clipboard fallback gagal:', e);
    }
    return { method: 'none', count: 0, total: refImages.length };
  }

  async function injectNext() {
    const state = await getState();
    if (state.index >= state.queue.length) {
      setStatus('Antrean habis. Tambah prompt lewat popup extension.');
      return { ok: false, reason: 'empty' };
    }
    const composer = findComposer();
    if (!composer) {
      setStatus('Kotak chat tidak ketemu. Pastikan halaman chat sudah terbuka penuh, lalu coba lagi.');
      return { ok: false, reason: 'no-composer' };
    }
    const text = state.queue[state.index];
    injectText(composer, text);
    composer.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await chrome.storage.local.set({ index: state.index + 1 });
    const left = state.queue.length - (state.index + 1);
    let status = `Prompt ${state.index + 1}/${state.queue.length} sudah masuk. Sisa: ${left}.`;
    if (state.refImages.length) {
      const attached = await attachRefImages(state.refImages, composer);
      if (attached?.method === 'file-input') {
        status += ` Gambar referensi terlampir (${attached.count}). Cek pratinjau lampiran sebelum kirim.`;
      } else if (attached?.method === 'clipboard') {
        status += ` Chat ini tidak mengekspos input file — gambar referensi pertama sudah disalin ke clipboard, tekan Ctrl+V di kotak chat untuk menempelnya${attached.total > 1 ? ` (1 dari ${attached.total} gambar; sisanya tempel manual)` : ''}.`;
      } else {
        status += ` Gambar referensi gagal dilampirkan otomatis — lampirkan manual lewat tombol 📎 di chat (file picker OS tidak bisa diisi extension).`;
      }
    }
    setStatus(status);
    if (state.autoSend) {
      await new Promise((r) => setTimeout(r, state.refImages.length ? 1400 : 800));
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

  if (document.body) buildPanel();
  else new MutationObserver((_m, obs) => {
    if (document.body) { buildPanel(); obs.disconnect(); }
  }).observe(document.documentElement, { childList: true });
})();
