// Popup Reels-Creator: kelola antrean + gambar referensi di chrome.storage.local,
// lalu perintahkan content script di tab aktif untuk menyuntik prompt berikutnya.
// Gambar disimpan sebagai data URL (lokal, tidak dikirim ke server). Batas praktis:
// total ~8 MB — di atas itu Chrome storage bisa menolak, jadi file besar diskip
// dengan peringatan, bukan diam-diam hilang.
const $ = (id) => document.getElementById(id);
const MAX_REF_BYTES = 8 * 1024 * 1024;

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

async function refreshRefList() {
  const { refImages = [] } = await chrome.storage.local.get({ refImages: [] });
  if (!refImages.length) {
    $('refList').textContent = 'Belum ada gambar referensi.';
    return;
  }
  $('refList').innerHTML = '';
  refImages.forEach((img) => {
    const thumb = document.createElement('img');
    thumb.src = img.dataUrl;
    thumb.title = img.name;
    thumb.alt = img.name;
    $('refList').appendChild(thumb);
  });
  const names = refImages.map((i) => i.name).join(', ');
  const span = document.createElement('span');
  span.textContent = `${refImages.length} gambar: ${names}`;
  $('refList').appendChild(span);
}

async function refreshStatus() {
  const s = await chrome.storage.local.get({ queue: [], index: 0, autoSend: false, refImages: [] });
  const total = s.queue.length;
  $('autoSend').checked = !!s.autoSend;
  $('status').textContent = total === 0
    ? `Antrean kosong. Gambar referensi: ${s.refImages.length}.`
    : `Antrean: ${total} prompt, sudah disuntik ${Math.min(s.index, total)}, sisa ${total - Math.min(s.index, total)}. Gambar referensi: ${s.refImages.length}. Auto-send: ${s.autoSend ? 'ON' : 'OFF'}.`;
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

$('save').addEventListener('click', async () => {
  const queue = parseQueue($('queue').value);
  if (!queue.length) { $('status').textContent = 'Tidak ada prompt yang bisa disimpan. Cek lagi isinya.'; return; }
  await chrome.storage.local.set({ queue, index: 0, autoSend: $('autoSend').checked });
  await refreshStatus();
  $('status').textContent += ' Antrean tersimpan, siap disuntik dari tab chat mana pun.';
});

$('autoSend').addEventListener('change', async () => {
  await chrome.storage.local.set({ autoSend: $('autoSend').checked });
  await refreshStatus();
});

$('next').addEventListener('click', async () => {
  await chrome.storage.local.set({ autoSend: $('autoSend').checked });
  const res = await sendToActiveTab({ type: 'rc-inject-next' });
  await refreshStatus();
  if (!res?.ok) {
    $('status').textContent += ' Gagal menyuntik: pastikan tab aktif adalah halaman chat dan sudah dimuat penuh, atau klik "Aktifkan di tab ini" dulu, lalu coba lagi.';
  }
});

$('activate').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { $('status').textContent = 'Tidak ada tab aktif.'; return; }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    $('status').textContent = 'Reels-Creator diaktifkan di tab ini. Panel kecil akan muncul di pojok kanan bawah halaman chat — klik "Suntik prompt berikutnya" dari sana.';
  } catch (e) {
    $('status').textContent = 'Gagal mengaktifkan di tab ini (halaman khusus browser seperti chrome:// tidak bisa diinjeksi). Buka halaman chat biasa lalu coba lagi.';
  }
});

$('reset').addEventListener('click', async () => {
  await chrome.storage.local.set({ queue: [], index: 0 });
  $('queue').value = '';
  await refreshStatus();
});

$('file').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  $('queue').value = await f.text();
  $('status').textContent = `File ${f.name} dimuat ke textarea. Klik "Simpan antrean".`;
});

$('refFile').addEventListener('change', async (e) => {
  const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length) { $('status').textContent = 'Pilih file gambar (.jpg / .png / .webp).'; return; }
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
  await refreshRefList();
  await refreshStatus();
  $('status').textContent = skipped.length
    ? `${files.length - skipped.length} gambar ditambahkan. Diskip karena total melebihi ~8 MB: ${skipped.join(', ')} — pakai gambar yang dikompres / diperkecil dulu.`
    : `${files.length} gambar referensi ditambahkan. Gambar akan dilampirkan bersama tiap prompt yang disuntik.`;
  e.target.value = '';
});

$('clearRefs').addEventListener('click', async () => {
  await chrome.storage.local.set({ refImages: [] });
  await refreshRefList();
  await refreshStatus();
  $('status').textContent = 'Gambar referensi dihapus.';
});

chrome.storage.local.get({ queue: [] }).then((s) => {
  if (s.queue.length) $('queue').value = s.queue.join('\n---\n');
  refreshStatus();
  refreshRefList();
});
