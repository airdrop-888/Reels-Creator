// Popup Reels-Creator v2.0 — desain baru + pustaka prompt tersimpan.
// Semua data lokal di chrome.storage.local, tidak dikirim ke server.
// - queue/index/autoSend/refImages: seperti v1.2.x
// - savedPrompts: [{id, name, text, createdAt}] — prompt yang disimpan user
//   untuk dipakai ulang (video serupa), dimuat via Muat atau langsung via Pakai.
// - Suntik tetap auto-simpan draf + auto-aktivasi tab lama (fix v1.2.1).
const $ = (id) => document.getElementById(id);
const MAX_REF_BYTES = 8 * 1024 * 1024;

const PRESETS = {
  'AI Cat Streetwear': `{
  "project_name": "AI_Cat_Shorts_Streetwear",
  "base_settings": {
    "aspect_ratio": "9:16",
    "style": "Hyper-realistic photography, highly detailed, 8k resolution, cinematic lighting",
    "negative_prompt": "cartoon, illustration, 3d render, deformed limbs"
  },
  "scenes": [
    {
      "scene_id": 1,
      "theme": "Streetwear Cat",
      "prompt": "[CHARACTER_PROFILE] riding a tiny customized lowrider bicycle in a rural Indonesian village street, followed by two small kittens wearing bandanas, dynamic angle."
    }
  ]
}`,
  'Cinematic 9:16': `{
  "project_name": "Cinematic_Short_9x16",
  "base_settings": {
    "aspect_ratio": "9:16",
    "style": "Cinematic, shallow depth of field, golden hour lighting, film grain",
    "negative_prompt": "cartoon, low resolution, blurry, watermark"
  },
  "scenes": [
    {
      "scene_id": 1,
      "theme": "Ganti tema di sini",
      "prompt": "Tulis prompt scene 1 di sini, vertikal 9:16, satu aksi jelas per scene."
    }
  ]
}`,
  'Product Commercial': `{
  "project_name": "Product_Commercial_Short",
  "base_settings": {
    "aspect_ratio": "9:16",
    "style": "Clean product commercial, bright studio lighting, sharp focus on product",
    "negative_prompt": "messy background, deformed product, text errors"
  },
  "scenes": [
    {
      "scene_id": 1,
      "theme": "Hero Product",
      "prompt": "Close-up produk hero di tengah frame, cahaya studio bersih, gerakan kamera slow push-in, tampilkan detail dan tekstur produk."
    }
  ]
}`,
};

function parseQueue(raw) {
  const text = (raw || '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) {
        return arr.map((x) =>
          typeof x === 'string' ? x : (x.prompt || x.text || x.content || x.input || '')
        ).map((s) => String(s).trim()).filter(Boolean);
      }
    } catch (_) { /* jatuh ke pemisah --- */ }
  }
  return text.split(/^---\s*$/m).map((s) => s.trim()).filter(Boolean);
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function setMsg(t) { $('status').textContent = t; }

async function refreshStatus() {
  const s = await chrome.storage.local.get({ queue: [], index: 0, autoSend: false, refImages: [] });
  const total = s.queue.length;
  const done = Math.min(s.index, total);
  const left = total - done;
  $('autoSend').checked = !!s.autoSend;
  $('queueBadge').textContent = `${total} Siap`;
  $('queueProgressText').textContent = `${done} / ${total}${total ? ` (${Math.round((done / total) * 100)}%)` : ''}`;
  $('progressBar').style.width = total ? `${(done / total) * 100}%` : '0%';
  $('statTotal').textContent = total;
  $('statInjected').textContent = done;
  $('statLeft').textContent = left;
  $('statAuto').textContent = s.autoSend ? 'ON' : 'OFF';
  $('refCount').textContent = `${s.refImages.length} Terlampir`;
  $('engineState').textContent = total ? (left ? 'Ready' : 'Selesai') : 'Ready';
}

async function refreshTarget() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) { $('targetText').textContent = 'Tidak ada tab aktif'; return; }
    const clean = tab.url.replace(/^https?:\/\//, '');
    $('targetText').textContent = clean.length > 38 ? clean.slice(0, 38) + '…' : clean;
    let connected = false;
    if (tab.id && /^https?:/.test(tab.url)) {
      try { const r = await chrome.tabs.sendMessage(tab.id, { type: 'rc-ping' }); connected = !!r?.ok; } catch (_) { connected = false; }
    }
    $('targetState').textContent = connected ? 'Terkoneksi' : 'Belum aktif';
    $('targetState').classList.toggle('warn', !connected);
    $('targetState').style.color = connected ? '#4f46e5' : '#d97706';
  } catch (_) { $('targetText').textContent = 'Tab tidak bisa dibaca'; }
}

async function refreshRefGrid() {
  const { refImages = [] } = await chrome.storage.local.get({ refImages: [] });
  const grid = $('refGrid');
  grid.innerHTML = '';
  refImages.forEach((img, i) => {
    const tile = document.createElement('div');
    tile.className = 'ref-tile';
    const im = document.createElement('img');
    im.src = img.dataUrl; im.alt = img.name; im.title = img.name;
    const name = document.createElement('div');
    name.className = 'name'; name.textContent = img.name;
    const rm = document.createElement('button');
    rm.className = 'rm'; rm.type = 'button'; rm.textContent = '×'; rm.title = 'Hapus gambar ini';
    rm.dataset.remove = String(i);
    tile.append(im, name, rm);
    grid.appendChild(tile);
  });
  const add = document.createElement('button');
  add.className = 'ref-add'; add.type = 'button'; add.id = 'refAddTile';
  add.innerHTML = '+<span>Tambah</span>';
  grid.appendChild(add);
  $('refCount').textContent = `${refImages.length} Terlampir`;
}

async function refreshSavedList() {
  const { savedPrompts = [] } = await chrome.storage.local.get({ savedPrompts: [] });
  const list = $('savedList');
  list.innerHTML = '';
  if (!savedPrompts.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Belum ada prompt tersimpan. Simpan prompt dari editor di atas untuk dipakai ulang.';
    list.appendChild(p);
    return;
  }
  savedPrompts.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'saved-item';
    const title = document.createElement('b');
    title.textContent = item.name;
    const snip = document.createElement('div');
    snip.className = 'snip';
    snip.textContent = item.text.replace(/\s+/g, ' ').slice(0, 90);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const mk = (label, action, primary) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = primary ? 'btn small primary' : 'btn small';
      b.textContent = label; b.dataset.action = action; b.dataset.id = item.id;
      return b;
    };
    actions.append(mk('Muat', 'load'), mk('Pakai', 'use', true), mk('Hapus', 'delete'));
    div.append(title, snip, actions);
    list.appendChild(div);
  });
}

async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, reason: 'no-tab' };
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (e) {
    return { ok: false, reason: String(e.message || e) };
  }
}

// --- Editor: preset & format JSON ---
document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    $('promptInput').value = PRESETS[btn.dataset.preset];
    setMsg(`Preset "${btn.dataset.preset}" dimuat ke editor. Klik Simpan antrean / Suntik, atau Simpan prompt untuk menyimpannya ke pustaka.`);
  });
});

$('formatJsonBtn').addEventListener('click', () => {
  const raw = $('promptInput').value.trim();
  try {
    if (!raw.startsWith('{') && !raw.startsWith('[')) throw new Error('not-json');
    $('promptInput').value = JSON.stringify(JSON.parse(raw), null, 2);
    setMsg('JSON diformat rapi.');
  } catch (_) {
    setMsg('Isi editor bukan JSON valid, tidak diformat. Tombol ini hanya untuk JSON.');
  }
});

// --- Pustaka prompt tersimpan ---
$('savePromptBtn').addEventListener('click', async () => {
  const text = $('promptInput').value.trim();
  if (!text) { setMsg('Editor kosong — tidak ada prompt yang bisa disimpan.'); return; }
  const { savedPrompts = [] } = await chrome.storage.local.get({ savedPrompts: [] });
  const name = $('savedName').value.trim() || `Prompt ${savedPrompts.length + 1}`;
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name, text,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  await chrome.storage.local.set({ savedPrompts: [...savedPrompts, item] });
  $('savedName').value = '';
  await refreshSavedList();
  setMsg(`Prompt "${name}" tersimpan ke pustaka. Lain kali tinggal klik Muat atau Pakai — tidak perlu mengetik ulang.`);
});

$('savedList').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { savedPrompts = [] } = await chrome.storage.local.get({ savedPrompts: [] });
  const item = savedPrompts.find((x) => x.id === btn.dataset.id);
  if (!item) return;
  if (btn.dataset.action === 'delete') {
    await chrome.storage.local.set({ savedPrompts: savedPrompts.filter((x) => x.id !== item.id) });
    await refreshSavedList();
    setMsg(`Prompt "${item.name}" dihapus dari pustaka.`);
  } else if (btn.dataset.action === 'load') {
    $('promptInput').value = item.text;
    setMsg(`Prompt "${item.name}" dimuat ke editor. Edit bila perlu, lalu klik Simpan antrean / Suntik.`);
  } else if (btn.dataset.action === 'use') {
    const queue = parseQueue(item.text);
    if (!queue.length) { setMsg('Prompt tersimpan itu kosong.'); return; }
    await chrome.storage.local.set({ queue, index: 0, autoSend: $('autoSend').checked });
    $('promptInput').value = item.text;
    await refreshStatus();
    setMsg(`Prompt "${item.name}" langsung jadi antrean (${queue.length} prompt). Klik Suntik Prompt untuk mengirimnya.`);
  }
});

// --- Antrean: simpan / suntik / aktivasi / reset ---
$('save').addEventListener('click', async () => {
  const queue = parseQueue($('promptInput').value);
  if (!queue.length) { setMsg('Tidak ada prompt yang bisa disimpan. Cek lagi isinya.'); return; }
  await chrome.storage.local.set({ queue, index: 0, autoSend: $('autoSend').checked });
  await refreshStatus();
  setMsg('Antrean tersimpan, siap disuntik dari tab chat mana pun.');
});

$('autoSend').addEventListener('change', async () => {
  await chrome.storage.local.set({ autoSend: $('autoSend').checked });
  await refreshStatus();
});

$('next').addEventListener('click', async () => {
  const draft = parseQueue($('promptInput').value);
  const stored = await chrome.storage.local.get({ queue: [], index: 0 });
  const draftChanged = draft.length > 0 && JSON.stringify(draft) !== JSON.stringify(stored.queue);
  if (draftChanged) {
    await chrome.storage.local.set({ queue: draft, index: 0 });
  }
  await chrome.storage.local.set({ autoSend: $('autoSend').checked });
  let res = await sendToActiveTab({ type: 'rc-inject-next' });
  if (!res?.ok) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await new Promise((r) => setTimeout(r, 400));
        res = await sendToActiveTab({ type: 'rc-inject-next' });
      }
    } catch (_) { /* pesan gagal di bawah tetap tampil */ }
  }
  await refreshStatus();
  await refreshTarget();
  if (res?.ok) {
    setMsg(`Prompt ${res.index}/${res.total} disuntik ke chat.${draftChanged ? ' Draf antrean otomatis disimpan dulu.' : ''}`);
  } else {
    setMsg('Gagal menyuntik: pastikan tab aktif adalah halaman chat dan sudah dimuat penuh, lalu coba lagi (atau refresh tab chat sekali).');
  }
});

$('activate').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { setMsg('Tidak ada tab aktif.'); return; }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await refreshTarget();
    setMsg('Reels-Creator diaktifkan di tab ini. Panel kecil akan muncul di pojok kanan bawah halaman chat — klik "Suntik prompt berikutnya" dari sana.');
  } catch (e) {
    setMsg('Gagal mengaktifkan di tab ini (halaman khusus browser seperti chrome:// tidak bisa diinjeksi). Buka halaman chat biasa lalu coba lagi.');
  }
});

$('reset').addEventListener('click', async () => {
  await chrome.storage.local.set({ queue: [], index: 0 });
  $('promptInput').value = '';
  await refreshStatus();
  setMsg('Antrean di-reset. Prompt tersimpan di pustaka tidak ikut terhapus.');
});

// --- Load file antrean ---
$('fileImportBtn').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  $('promptInput').value = await f.text();
  setMsg(`File ${f.name} dimuat ke editor. Klik "Simpan antrean" atau "Suntik Prompt".`);
  e.target.value = '';
});

// --- Gambar referensi ---
$('refGrid').addEventListener('click', async (e) => {
  const rm = e.target.closest('button[data-remove]');
  if (rm) {
    const { refImages = [] } = await chrome.storage.local.get({ refImages: [] });
    refImages.splice(Number(rm.dataset.remove), 1);
    await chrome.storage.local.set({ refImages });
    await refreshRefGrid();
    await refreshStatus();
    setMsg('Satu gambar referensi dihapus.');
    return;
  }
  if (e.target.closest('#refAddTile')) $('refFile').click();
});

$('refFile').addEventListener('change', async (e) => {
  const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length) { setMsg('Pilih file gambar (.jpg / .png / .webp).'); return; }
  const { refImages = [] } = await chrome.storage.local.get({ refImages: [] });
  const next = [...refImages];
  let skipped = [];
  let totalBytes = next.reduce((a, i) => a + (i.dataUrl?.length || 0), 0);
  for (const f of files) {
    const dataUrl = await readAsDataUrl(f);
    if (totalBytes + dataUrl.length > MAX_REF_BYTES) { skipped.push(f.name); continue; }
    totalBytes += dataUrl.length;
    next.push({ name: f.name, type: f.type, dataUrl });
  }
  await chrome.storage.local.set({ refImages: next });
  await refreshRefGrid();
  await refreshStatus();
  setMsg(skipped.length
    ? `${files.length - skipped.length} gambar ditambahkan. Diskip karena total melebihi ~8 MB: ${skipped.join(', ')} — pakai gambar yang dikompres / diperkecil dulu.`
    : `${files.length} gambar referensi ditambahkan. Gambar akan dilampirkan bersama tiap prompt yang disuntik.`);
  e.target.value = '';
});

$('clearRefs').addEventListener('click', async () => {
  await chrome.storage.local.set({ refImages: [] });
  await refreshRefGrid();
  await refreshStatus();
  setMsg('Gambar referensi dihapus.');
});

// --- Auto-batch ---
async function refreshBatchStatus() {
  const res = await sendToActiveTab({ type: 'rc-batch-status' });
  const s = await chrome.storage.local.get({ queue: [], index: 0 });
  if (!res?.ok) {
    $('batchStatus').textContent = 'Auto-batch: belum aktif di tab ini (klik Aktifkan di tab ini / mulai dari panel chat).';
    $('batchPauseBtn').textContent = '⏸ Jeda / Lanjut';
    return;
  }
  const modeText = { idle: 'belum berjalan', running: 'BERJALAN', paused: 'DIJEDA', stopped: 'dihentikan', done: 'selesai', error: 'berhenti karena error' }[res.mode] || res.mode;
  $('batchStatus').textContent = `Auto-batch: ${modeText} — prompt ${Math.min(s.index, s.queue.length)}/${s.queue.length}. Jeda tenang ${res.settings?.quietSec ?? 8} dtk, maks tunggu ${Math.round((res.settings?.maxWaitSec ?? 300) / 60)} mnt.`;
  $('batchPauseBtn').textContent = res.paused ? '▶ Lanjut batch' : '⏸ Jeda batch';
}

async function sendBatchWithActivate(message) {
  let res = await sendToActiveTab(message);
  if (!res?.ok) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        await new Promise((r) => setTimeout(r, 400));
        res = await sendToActiveTab(message);
      }
    } catch (_) { /* pesan gagal di bawah tetap tampil */ }
  }
  return res;
}

$('batchStart').addEventListener('click', async () => {
  const quietSec = Math.min(60, Math.max(3, parseInt($('batchQuietSec').value, 10) || 8));
  const maxWaitMin = Math.min(30, Math.max(1, parseInt($('batchMaxWaitMin').value, 10) || 5));
  $('batchQuietSec').value = quietSec;
  $('batchMaxWaitMin').value = maxWaitMin;
  await chrome.storage.local.set({ batchQuietSec: quietSec, batchMaxWaitMin: maxWaitMin });
  const res = await sendBatchWithActivate({ type: 'rc-batch-start', settings: { quietSec, maxWaitSec: maxWaitMin * 60 } });
  await refreshStatus();
  await refreshBatchStatus();
  if (!res?.ok) {
    setMsg(res?.reason === 'empty'
      ? 'Auto-batch gagal dimulai: antrean habis — simpan antrean baru dulu.'
      : res?.reason === 'already-running'
        ? 'Auto-batch sudah berjalan di tab ini.'
        : 'Auto-batch gagal dimulai: pastikan tab aktif adalah halaman chat dan sudah dimuat penuh.');
  } else {
    setMsg('Auto-batch dimulai. Jangan tutup tab chat — pantau dari panel di halaman chat, atau buka popup ini lagi untuk Jeda / Berhenti.');
  }
});

$('batchPauseBtn').addEventListener('click', async () => {
  const res = await sendBatchWithActivate({ type: 'rc-batch-toggle' });
  await refreshBatchStatus();
  if (!res?.ok) setMsg('Tidak ada auto-batch yang bisa dijeda / dilanjutkan di tab ini.');
  else setMsg(res.paused ? 'Auto-batch dijeda.' : 'Auto-batch dilanjutkan.');
});

$('batchStop').addEventListener('click', async () => {
  const res = await sendToActiveTab({ type: 'rc-batch-stop' });
  await refreshBatchStatus();
  if (!res?.ok) setMsg('Tidak ada auto-batch yang berjalan di tab ini.');
  else setMsg('Auto-batch dihentikan.');
});

// --- Init ---
$('versionBadge').innerHTML = `<span class="dot"></span> v${chrome.runtime.getManifest().version}`;
chrome.storage.local.get({ queue: [] }).then((s) => {
  if (s.queue.length) $('promptInput').value = s.queue.join('\n---\n');
  refreshStatus();
  refreshRefGrid();
  refreshSavedList();
  refreshTarget();
  refreshBatchStatus();
  chrome.storage.local.get({ batchQuietSec: 8, batchMaxWaitMin: 5 }).then((b) => {
    $('batchQuietSec').value = b.batchQuietSec;
    $('batchMaxWaitMin').value = b.batchMaxWaitMin;
  });
  if (!s.queue.length) setMsg('Tempel prompt di editor, atau muat prompt tersimpan dari pustaka.');
});
