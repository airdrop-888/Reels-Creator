// Reels-Creator v2.2 — content script untuk chat AI (utama muse.ai,
// juga chat lain yang diaktifkan lewat popup). Guard ganda supaya injeksi
// on-demand tidak membuat panel/listener dobel.
//
// v2.2 BARU — simpan jawaban: setelah auto-batch menunggu jawaban selesai,
// content script mengambil teks jawaban baru (bukan promptnya), memvalidasi
// apakah ia JSON / punya scenes, lalu menyimpannya lokal di
// chrome.storage.local sebagai `results` (tidak dikirim ke server mana pun).
// Penangkapan ini heuristik generik lintas chat (bukan API resmi), jadi
// untuk layout chat yang belum dikenali hasilnya bisa kosong — dalam hal
// itu hasil tetap dicatat dengan status capture_failed agar tidak hilang
// diam-diam, dan user bisa salin jawaban manual lalu export tetap jalan
// untuk job-job yang berhasil ditangkap.
//
// Gambar referensi (.jpg/.png): best-effort, karena dialog file picker
// bawaan OS tidak bisa diisi otomatis oleh extension mana pun. Strateginya:
//  1) isi <input type="file"> chat yang sudah ada di halaman (termasuk yang
//     tersembunyi) lewat DataTransfer, lalu picu event change;
//  2) kalau belum ada input file, klik tombol lampiran (📎/+) lalu ulangi;
//  3) kalau tetap tidak ada, salin 1 gambar pertama ke clipboard — user
//     tinggal Ctrl+V di kotak chat. Status selalu jujur soal metode yang jalan.
//
// Auto-batch (v2.1): kirim antrean satu per satu TANPA klik per prompt.
// Setelah tiap prompt terkirim, mesin menunggu jawaban selesai dengan
// heuristik generik (bukan API resmi chat, jadi tidak 100% pasti):
//  - tidak ada lagi tombol Stop/Berhenti yang terlihat, DAN
//  - isi halaman tidak berubah selama `quietSec` detik berturut-turut.
// Kalau waktu tunggu maksimum lewat, batch DIJEDA (bukan dilanjut buta),
// supaya tidak mengirim prompt berikutnya di tengah jawaban yang masih jalan.
// Jeda/berhenti hanya berlaku di antara prompt; kalau dijeda di tengah
// jawaban, pastikan jawaban selesai dulu sebelum menekan Lanjut.
// Satu batch per satu tab saja. Tab jangan ditutup selama batch jalan;
// tab yang tidak aktif bisa membuat timer Chrome melambat.
(() => {
  if (window.__reelsCreatorLoaded) return;
  window.__reelsCreatorLoaded = true;
  const PANEL_ID = 'reels-creator-panel';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- State auto-batch (per tab, in-memory; ringkasannya juga disimpan) ---
  let batchRunning = false;
  let batchPaused = false;
  let batchStopRequested = false;
  let batchMode = 'idle'; // idle | running | paused | stopped | done | error
  let batchSettings = { quietSec: 8, maxWaitSec: 300 };

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
    const s = await chrome.storage.local.get({ queue: [], index: 0, autoSend: false, refImages: [], queueMeta: [] });
    return {
      queue: Array.isArray(s.queue) ? s.queue : [],
      index: s.index || 0,
      autoSend: !!s.autoSend,
      refImages: Array.isArray(s.refImages) ? s.refImages : [],
      queueMeta: Array.isArray(s.queueMeta) ? s.queueMeta : [],
    };
  }

  // --- v2.2: tangkap jawaban baru setelah jawaban selesai ---
  function snapshotTexts() {
    const out = new Set();
    const add = (t) => {
      const s = (t || '').replace(/\s+/g, ' ').trim();
      if (s.length >= 30) out.add(s);
    };
    document.querySelectorAll('[data-message-author-role="assistant"], [data-role="assistant"]').forEach((el) => add(el.textContent));
    document.querySelectorAll('p, li, pre').forEach((el) => add(el.textContent));
    return out;
  }

  function extractJsonInfo(text) {
    if (!text) return { jsonValid: false, sceneCount: null };
    const tryParse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
    let obj = tryParse(text.trim());
    if (!obj) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) obj = tryParse(text.slice(start, end + 1));
    }
    if (!obj) {
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start >= 0 && end > start) obj = tryParse(text.slice(start, end + 1));
    }
    if (!obj) return { jsonValid: false, sceneCount: null };
    const scenes = Array.isArray(obj) ? obj : obj.scenes;
    return { jsonValid: true, sceneCount: Array.isArray(scenes) ? scenes.length : null };
  }

  function captureAnswer(beforeSet, promptText) {
    const candidates = [];
    document.querySelectorAll('[data-message-author-role="assistant"], [data-role="assistant"]').forEach((el) => {
      const s = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (s.length >= 80 && !s.includes(promptText.slice(0, 60))) candidates.push(s);
    });
    // Blok teks baru yang tidak ada sebelum prompt dikirim = jawaban baru.
    document.querySelectorAll('p, li, pre').forEach((el) => {
      const s = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (s.length >= 30 && !beforeSet.has(s) && !candidates.includes(s)) candidates.push(s);
    });
    // Buang blok yang isinya cuma prompt itu sendiri / tombol / UI pendek.
    const filtered = candidates.filter((s) => s.length >= 80 && !s.startsWith(promptText.slice(0, 40)));
    const answer = filtered.join('\n\n').slice(0, 30000);
    const info = extractJsonInfo(answer);
    return { answer, captured: answer.length >= 80, ...info };
  }

  async function saveResult(meta, promptText, captured) {
    try {
      const s = await chrome.storage.local.get({ results: [] });
      const results = Array.isArray(s.results) ? s.results : [];
      results.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        project: meta?.project || '',
        theme: meta?.theme || '',
        prompt: promptText,
        answer: captured.answer || '',
        captured: captured.captured,
        jsonValid: captured.jsonValid,
        sceneCount: captured.sceneCount,
        capturedAt: new Date().toISOString(),
        sourceUrl: location.href,
      });
      while (results.length > 200) results.shift();
      await chrome.storage.local.set({ results });
      return results.length;
    } catch (_) { return null; }
  }

  function setStatus(msg) {
    // v2.2.1: SATU status saja. Sebelumnya setStatus menulis ke rc-status
    // DAN rc-batch-status sehingga teks yang sama tampil 2x di panel.
    const el = document.getElementById('rc-status');
    if (el) el.textContent = msg;
  }

  function pressEnter(composer) {
    // Fallback kirim: tekan Enter di composer bila tombol kirim tidak ketemu.
    // Banyak chat AI mengirim dengan Enter (tanpa Shift), jadi ini meniru
    // persis apa yang user lakukan manual.
    try {
      composer.focus();
      const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      composer.dispatchEvent(new KeyboardEvent('keydown', opts));
      composer.dispatchEvent(new KeyboardEvent('keypress', opts));
      composer.dispatchEvent(new KeyboardEvent('keyup', opts));
      return true;
    } catch (_) { return false; }
  }

  function saveBatchState() {
    try {
      chrome.storage.local.set({ batch: { mode: batchMode, running: batchRunning, paused: batchPaused, updatedAt: Date.now() } });
    } catch (_) { /* status panel tetap jalan walau storage gagal */ }
  }

  async function dataUrlToFile(img) {
    const res = await fetch(img.dataUrl);
    const blob = await res.blob();
    return new File([blob], img.name || 'referensi.png', { type: img.type || blob.type || 'image/png' });
  }

  function findFileInputs() {
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
        await sleep(700);
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
      console.warn('[Reels-Creator] attach via file input gagal:', e);
    }
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

  async function injectNext(opts = {}) {
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
    let sent = false;
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
    // v2.2.1: Suntik = isi + kirim otomatis (Enter). Dipakai popup, panel,
    // dan auto-batch — tidak lagi ada mode "isi saja, cek dulu, kirim manual".
    // forceSend selalu true dari pemanggil manual; autoSend lama tetap
    // dihormati sebagai cadangan bila ada pemanggil lama tanpa forceSend.
    if (state.autoSend || opts.forceSend || opts.fromManual) {
      await sleep(state.refImages.length ? 1400 : 800);
      const btn = findSendButton(composer);
      if (btn && !btn.disabled) {
        btn.click();
        sent = true;
        setStatus(`Prompt ${state.index + 1} terkirim otomatis. Sisa: ${left}.`);
      } else if (pressEnter(composer)) {
        sent = true;
        setStatus(`Prompt ${state.index + 1} terkirim otomatis via Enter (tombol kirim tidak ketemu). Sisa: ${left}.`);
      } else {
        setStatus(`Prompt ${state.index + 1} sudah masuk, tapi gagal dikirim otomatis — tekan Enter / kirim manual.`);
      }
    }
    return { ok: true, sent, index: state.index + 1, total: state.queue.length };
  }

  // --- Auto-batch ---
  function isGenerating() {
    // Tombol Stop adalah sinyal paling jelas di hampir semua chat AI.
    // Sengaja tidak memakai "tombol kirim disabled" sebagai sinyal, karena
    // setelah terkirim pun tombol kirim biasanya disabled saat kotak kosong.
    return [...document.querySelectorAll('button')].filter(isVisible).some((b) => {
      const hay = `${b.getAttribute('aria-label') || ''} ${b.title || ''} ${b.textContent || ''}`.toLowerCase();
      return /stop generating|stop response|berhenti|membatalkan/.test(hay);
    });
  }

  async function waitForAnswer() {
    const intervalMs = 2000;
    const quietNeeded = Math.max(1, Math.round((batchSettings.quietSec * 1000) / intervalMs));
    // Masa tenggang: jawaban butuh waktu mulai, jangan langsung dianggap selesai.
    for (let t = 0; t < 5000; t += 1000) {
      if (batchStopRequested) return { done: false, reason: 'stopped' };
      if (batchPaused) return { done: false, reason: 'paused' };
      await sleep(1000);
    }
    let lastLen = document.body ? document.body.innerText.length : 0;
    let quietTicks = 0;
    let elapsed = 0;
    while (elapsed < batchSettings.maxWaitSec * 1000) {
      if (batchStopRequested) return { done: false, reason: 'stopped' };
      if (batchPaused) return { done: false, reason: 'paused' };
      await sleep(intervalMs);
      elapsed += intervalMs;
      if (batchStopRequested) return { done: false, reason: 'stopped' };
      if (batchPaused) return { done: false, reason: 'paused' };
      const curLen = document.body ? document.body.innerText.length : 0;
      if (!isGenerating() && curLen === lastLen) quietTicks += 1;
      else quietTicks = 0;
      lastLen = curLen;
      if (quietTicks >= quietNeeded) return { done: true };
    }
    return { done: false, reason: 'timeout' };
  }

  function batchStatus() {
    return { ok: true, running: batchRunning, paused: batchPaused, mode: batchMode, settings: batchSettings };
  }

  async function runBatchLoop() {
    let savedCount = 0;
    let captureFailedCount = 0;
    while (batchRunning) {
      if (batchStopRequested) break;
      if (batchPaused) break;
      const state = await getState();
      if (state.index >= state.queue.length) break;
      const composer = findComposer();
      if (!composer) {
        batchMode = 'error';
        setStatus('Auto-batch berhenti: kotak chat tidak ketemu. Refresh halaman chat lalu mulai lagi.');
        break;
      }
      const promptText = state.queue[state.index];
      const promptMeta = state.queueMeta[state.index] || {};
      const beforeTexts = snapshotTexts();
      setStatus(`Auto-batch: mengirim prompt ${state.index + 1}/${state.queue.length}…`);
      const res = await injectNext({ forceSend: true });
      if (!res.ok) {
        batchMode = 'error';
        setStatus(`Auto-batch berhenti: ${res.reason || 'gagal menyuntik'}. Perbaiki lalu mulai lagi dari prompt berikutnya.`);
        break;
      }
      if (!res.sent) {
        batchMode = 'paused';
        batchPaused = true;
        setStatus('Auto-batch dijeda: prompt sudah masuk tapi tombol kirim tidak ketemu. Kirim manual, pastikan jawaban selesai, lalu tekan Lanjut.');
        break;
      }
      setStatus(`Auto-batch: menunggu jawaban prompt ${res.index}/${res.total} selesai…`);
      const wait = await waitForAnswer();
      if (wait.reason === 'paused') {
        batchMode = 'paused';
        setStatus('Auto-batch dijeda. Pastikan jawaban selesai dulu sebelum menekan Lanjut.');
        break;
      }
      if (wait.reason === 'stopped') break;
      if (wait.reason === 'timeout') {
        batchMode = 'paused';
        batchPaused = true;
        setStatus(`Auto-batch dijeda: jawaban prompt ${res.index} belum selesai setelah ${batchSettings.maxWaitSec} detik. Cek chat, tunggu selesai, lalu tekan Lanjut.`);
        break;
      }
      // v2.2: jawaban selesai -> tangkap & simpan lokal sebelum prompt berikut.
      const captured = captureAnswer(beforeTexts, promptText);
      await saveResult(promptMeta, promptText, captured);
      if (captured.captured) {
        savedCount += 1;
        setStatus(`Auto-batch: jawaban prompt ${res.index}/${res.total} tersimpan (${captured.answer.length} karakter${captured.jsonValid ? `, JSON valid${captured.sceneCount != null ? `, ${captured.sceneCount} scene` : ''}` : ', bukan JSON'}). Lanjut ke prompt berikutnya…`);
      } else {
        captureFailedCount += 1;
        setStatus(`Auto-batch: jawaban prompt ${res.index}/${res.total} TIDAK berhasil ditangkap otomatis (layout chat belum dikenali) — dicatat capture_failed, salin manual dari chat bila perlu. Lanjut ke prompt berikutnya…`);
      }
      await sleep(1500);
    }
    const wasStopped = batchStopRequested;
    batchRunning = false;
    if (wasStopped) {
      batchMode = 'stopped';
      batchPaused = false;
      setStatus('Auto-batch dihentikan. Antrean berhenti di prompt berikutnya — bisa dilanjut manual atau mulai batch lagi.');
    } else if (batchMode === 'running') {
      // Keluar loop karena antrean habis (bukan pause/stop/error).
      const state = await getState();
      if (state.index >= state.queue.length) {
        batchMode = 'done';
        setStatus(`Auto-batch selesai. Semua ${state.queue.length} prompt terkirim, ${savedCount} jawaban tersimpan${captureFailedCount ? `, ${captureFailedCount} gagal ditangkap otomatis` : ''}. Buka popup extension untuk export JSON.`);
      }
    }
    batchStopRequested = false;
    saveBatchState();
  }

  function startBatch(settings) {
    if (batchRunning) return { ok: false, reason: 'already-running', ...batchStatus() };
    if (settings) {
      if (Number.isFinite(settings.quietSec)) batchSettings.quietSec = Math.min(60, Math.max(3, settings.quietSec));
      if (Number.isFinite(settings.maxWaitSec)) batchSettings.maxWaitSec = Math.min(1800, Math.max(60, settings.maxWaitSec));
    }
    return getState().then((state) => {
      if (state.index >= state.queue.length) {
        return { ok: false, reason: 'empty', ...batchStatus() };
      }
      batchRunning = true;
      batchPaused = false;
      batchStopRequested = false;
      batchMode = 'running';
      saveBatchState();
      setStatus(`Auto-batch dimulai dari prompt ${state.index + 1}/${state.queue.length}. Jangan tutup tab ini.`);
      runBatchLoop();
      return { ok: true, ...batchStatus() };
    });
  }

  function pauseBatch() {
    if (batchRunning) {
      batchPaused = true;
      batchMode = 'paused';
      saveBatchState();
      return { ok: true, ...batchStatus() };
    }
    return { ok: false, reason: 'not-running', ...batchStatus() };
  }

  function resumeBatch() {
    if (batchRunning) return { ok: false, reason: 'already-running', ...batchStatus() };
    if (batchMode !== 'paused') return { ok: false, reason: 'not-paused', ...batchStatus() };
    batchRunning = true;
    batchPaused = false;
    batchStopRequested = false;
    batchMode = 'running';
    saveBatchState();
    setStatus('Auto-batch dilanjutkan dari prompt berikutnya.');
    runBatchLoop();
    return { ok: true, ...batchStatus() };
  }

  function toggleBatch() {
    if (batchRunning) return pauseBatch();
    if (batchMode === 'paused') return resumeBatch();
    return { ok: false, reason: 'not-running', ...batchStatus() };
  }

  function stopBatch() {
    if (!batchRunning && batchMode !== 'paused') {
      batchMode = 'stopped';
      saveBatchState();
      return { ok: true, ...batchStatus() };
    }
    batchStopRequested = true;
    batchPaused = false;
    setStatus('Auto-batch dihentikan…');
    return { ok: true, ...batchStatus() };
  }

  function buildPanel() {
    // v2.2.1: panel dirapikan — 1 status saja (tidak ganda lagi), header
    // sendiri, tombol tersusun baris demi baris, tidak meluber / membungkus
    // aneh seperti di screenshot. Tombol utama: Suntik & Kirim (isi + Enter).
    if (document.getElementById(PANEL_ID)) return;
    const box = document.createElement('div');
    box.id = PANEL_ID;
    box.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-weight:700;font-size:13px">🎬 Reels-Creator</span>
        <button id="rc-hide" title="Sembunyikan panel (muncul lagi setelah refresh)" style="width:24px;height:24px;padding:0">✕</button>
      </div>
      <div id="rc-status" style="font-size:12px;line-height:1.5;background:rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;margin-bottom:10px">Siap. Buka popup extension untuk isi antrean prompt.</div>
      <button id="rc-next" style="width:100%;margin-bottom:8px">⚡ Suntik &amp; Kirim</button>
      <div style="display:flex;gap:6px">
        <button id="rc-batch" style="flex:1">▶ Auto-batch</button>
        <button id="rc-batch-toggle" style="flex:1">⏸ Jeda</button>
        <button id="rc-batch-stop" style="flex:1">⏹ Berhenti</button>
      </div>
    `;
    Object.assign(box.style, {
      position: 'fixed', right: '16px', bottom: '16px', zIndex: '2147483647',
      width: '320px', padding: '14px', borderRadius: '14px', fontFamily: 'system-ui, sans-serif',
      fontSize: '13px', color: '#fff', background: 'rgba(20,20,30,.94)',
      boxShadow: '0 8px 30px rgba(0,0,0,.35)',
    });
    box.querySelectorAll('button').forEach((b) => {
      b.style.cssText += 'border:0;border-radius:9px;padding:9px 8px;cursor:pointer;background:#7c5cff;color:#fff;font-weight:600;font-size:12px;white-space:nowrap';
    });
    box.querySelector('#rc-hide').style.cssText += 'background:#444;font-size:12px';
    box.querySelector('#rc-batch-toggle').style.cssText += 'background:#475569';
    box.querySelector('#rc-batch-stop').style.cssText += 'background:#dc2626';
    box.querySelector('#rc-next').addEventListener('click', () => injectNext({ forceSend: true, fromManual: true }));
    box.querySelector('#rc-hide').addEventListener('click', () => box.remove());
    box.querySelector('#rc-batch').addEventListener('click', () => {
      chrome.storage.local.get({ batchQuietSec: 8, batchMaxWaitMin: 5 }).then((s) => {
        startBatch({ quietSec: s.batchQuietSec, maxWaitSec: s.batchMaxWaitMin * 60 });
      });
    });
    box.querySelector('#rc-batch-toggle').addEventListener('click', (e) => {
      const r = toggleBatch();
      e.target.textContent = r.paused ? '▶ Lanjut' : '⏸ Jeda';
    });
    box.querySelector('#rc-batch-stop').addEventListener('click', () => stopBatch());
    document.body.appendChild(box);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'rc-ping') sendResponse({ ok: true });
    else if (msg?.type === 'rc-inject-next') injectNext({ forceSend: !!msg.forceSend, fromManual: !!msg.fromManual }).then(sendResponse);
    else if (msg?.type === 'rc-batch-start') startBatch(msg.settings).then(sendResponse);
    else if (msg?.type === 'rc-batch-pause') sendResponse(pauseBatch());
    else if (msg?.type === 'rc-batch-resume') sendResponse(resumeBatch());
    else if (msg?.type === 'rc-batch-toggle') sendResponse(toggleBatch());
    else if (msg?.type === 'rc-batch-stop') sendResponse(stopBatch());
    else if (msg?.type === 'rc-batch-status') sendResponse(batchStatus());
    return true;
  });

  if (document.body) buildPanel();
  else new MutationObserver((_m, obs) => {
    if (document.body) { buildPanel(); obs.disconnect(); }
  }).observe(document.documentElement, { childList: true });
})();
