// Popup Reels-Creator: kelola antrean di chrome.storage.local,
// lalu perintahkan content script di tab Muse aktif untuk menyuntik prompt berikutnya.
const $ = (id) => document.getElementById(id);

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

async function refreshStatus() {
  const s = await chrome.storage.local.get({ queue: [], index: 0, autoSend: false });
  const total = s.queue.length;
  $('autoSend').checked = !!s.autoSend;
  $('status').textContent = total === 0
    ? 'Antrean kosong.'
    : `Antrean: ${total} prompt, sudah disuntik ${Math.min(s.index, total)}, sisa ${total - Math.min(s.index, total)}. Auto-send: ${s.autoSend ? 'ON' : 'OFF'}.`;
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
  $('status').textContent += ' Antrean tersimpan, siap disuntik dari tab chat Muse.';
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
    $('status').textContent += ' Gagal menyuntik: pastikan tab aktif adalah chat Muse (muse.ai) dan halaman sudah dimuat penuh, lalu coba lagi.';
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

// Isi textarea dari antrean tersimpan (gabung pakai ---)
chrome.storage.local.get({ queue: [] }).then((s) => {
  if (s.queue.length) $('queue').value = s.queue.join('\n---\n');
  refreshStatus();
});
