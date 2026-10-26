# 🎬 Reels-Creator

![Version](https://img.shields.io/badge/version-1.2.0-7c5cff)
![Manifest](https://img.shields.io/badge/manifest-V3-333333)
![Browser](https://img.shields.io/badge/browser-Chrome-4285F4)
![Privacy](https://img.shields.io/badge/data-tidak%20dikirim%20ke%20server-2ea043)

**Antrean prompt pembuatan video/Reels, disuntik satu per satu ke kotak chat AI — tanpa copy-paste berulang.**

Tempel antrean prompt sekali, lalu kirim satu per satu ke chat Muse, ChatGPT, Claude, Gemini, atau chat AI lainnya. Cocok untuk produksi konten harian: satu antrean, banyak video, tanpa prompt yang tertukar atau terlewat.

---

## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| 📋 Antrean prompt | Simpan banyak prompt sekaligus, disuntik satu per satu sesuai urutan |
| 🖼️ Gambar referensi | Lampirkan `.jpg` / `.png` bersama prompt — karakter, gaya visual, atau produk acuan |
| 🎯 Suntik otomatis | Prompt masuk langsung ke kotak chat, tanpa mengetik ulang |
| 🖱️ Kirim manual (default) | Teks dicek dulu sebelum dikirim — aman dari salah kirim |
| ⚡ Auto-send opsional | Bisa diaktifkan kalau sudah percaya dengan antreannya |
| 🧩 Panel in-page | Tombol suntik tersedia langsung di halaman chat, pojok kanan bawah |
| 📁 Load file | Dukung `.txt` dan `.json` untuk antrean dalam jumlah besar |
| 🌐 Multi-chat | Bekerja di chat AI populer, plus chat lain lewat aktivasi per-tab |
| 🔒 100% lokal | Antrean hanya tersimpan di browser, tidak dikirim ke server mana pun |

---

## 🚀 Instalasi

Extension ini dipasang secara manual (Load unpacked), tanpa perlu lewat Chrome Web Store.

1. Buka `chrome://extensions` di Chrome.
2. Aktifkan **Developer mode** (tombol kanan atas).
3. Klik **Load unpacked**.
4. Pilih folder extension ini (atau hasil ekstrak file ZIP dari repo ini).
5. Ikon 🎬 **Reels-Creator** akan muncul di toolbar Chrome.

> 💡 Setiap ada update, cukup `git pull` lalu klik **Reload** di `chrome://extensions` pada kartu Reels-Creator.

---

## 🧭 Cara Pakai

### 1. Siapkan antrean prompt

Klik ikon extension, tempel daftar prompt di kolom antrean, lalu klik **Simpan antrean**.

### 2. Tambahkan gambar referensi (opsional)

Di popup yang sama, klik pilih file pada bagian **Gambar referensi** dan pilih file `.jpg` / `.png` (`.webp` juga didukung). Gambar yang dipilih akan dilampirkan bersama tiap prompt yang disuntik — cocok untuk referensi karakter, gaya visual, atau foto produk.

### 3. Buka halaman chat

Buka chat tujuan di tab lain (misalnya `muse.ai`) dan pastikan halaman sudah termuat penuh.

### 3. Suntik prompt berikutnya

Klik **Suntik prompt berikutnya** — dari popup extension, atau dari panel kecil di pojok kanan bawah halaman chat.

### 4. Cek, lalu kirim

Prompt sudah terisi di kotak chat. Periksa sekilas, lalu tekan **Enter** atau klik tombol kirim seperti biasa.

### 5. Ulangi untuk prompt berikutnya

Tunggu jawaban chat selesai, baru suntik prompt berikutnya. Satu antrean bisa dipakai untuk satu sesi produksi penuh.

---

## 🖼️ Gambar Referensi (.jpg / .png)

Gambar referensi membuat hasil video lebih konsisten: chat AI bisa melihat karakter, gaya, atau produk yang dimaksud, bukan cuma membacanya dari teks.

**Cara kerja:**

1. Pilih gambar di popup extension (bagian **Gambar referensi**).
2. Saat prompt disuntik, extension mencoba melampirkan gambar lewat input file yang sudah ada di halaman chat.
3. Bila chat belum menampilkan input file, extension mencoba membuka tombol lampiran (📎/+) dulu, lalu melampirkan.
4. Bila chat tetap tidak mengekspos input file, gambar pertama disalin ke clipboard — pengguna tinggal tekan **Ctrl+V** di kotak chat.

**Batasan yang perlu diketahui (jujur, bukan janji manis):**

- Dialog file picker bawaan sistem operasi **tidak bisa diisi otomatis oleh extension mana pun**. Itulah kenapa jalur di atas memakai input file halaman dan clipboard, bukan mengklik dialog OS.
- Tiap chat punya cara lampiran yang berbeda, jadi lampiran otomatis tidak dijamin 100% di semua chat. Panel extension selalu memberi tahu metode yang berhasil — cek pratinjau lampiran sebelum mengirim.
- Gambar disimpan lokal di browser sebagai data URL, dengan total praktis **~8 MB**. Gambar yang melebihi batas diskip dengan peringatan — kompres / perkecil dulu gambar besar sebelum dipilih.
- Untuk menghapus referensi, klik **Hapus gambar referensi** di popup. Gambar referensi tidak ikut terhapus saat antrean di-reset.

---

## 📝 Format Antrean

### Opsi A — Pisahkan dengan `---`

Satu prompt dipisahkan dari prompt berikutnya oleh satu baris yang hanya berisi `---`:

```text
Buatkan saya 1 ide video Reels vertikal 30 detik, niche stoikisme untuk pria:
hook 3 detik yang kuat, naskah voiceover singkat, 3 adegan visual dari foto,
caption + hashtag. Judul: "Diam lo lebih berisik dari omongan mereka".
---
Buatkan saya 1 ide video Reels vertikal 30 detik, niche stoikisme untuk pria:
hook 3 detik yang kuat, naskah voiceover singkat, 3 adegan visual dari foto,
caption + hashtag. Judul: "99% pria nunggu siap, 1% yang jalan".
```

### Opsi B — JSON array

```json
[
  "Prompt video 1...",
  "Prompt video 2...",
  "Prompt video 3..."
]
```

Array objek juga didukung, selama ada field `prompt`:

```json
[{ "prompt": "Prompt video 1..." }, { "prompt": "Prompt video 2..." }]
```

Contoh siap pakai tersedia di [`prompts/contoh-prompt-reels.txt`](prompts/contoh-prompt-reels.txt).

---

## 💬 Chat yang Didukung

| Chat | Status |
|---|---|
| Muse (`muse.ai`) | ✅ Otomatis — target utama |
| ChatGPT (`chatgpt.com`) | ✅ Otomatis |
| Claude (`claude.ai`) | ✅ Otomatis |
| Gemini (`gemini.google.com`) | ✅ Otomatis |
| Meta AI (`meta.ai`) | ✅ Otomatis |
| Copilot, Perplexity, DeepSeek, Grok | ✅ Otomatis |
| Chat AI / halaman chat lainnya | 🔧 Buka tab chat itu, klik ikon extension, lalu **Aktifkan di tab ini** |

> Catatan: halaman khusus browser seperti `chrome://` tidak bisa diinjeksi extension. Gunakan selalu halaman chat biasa.

---

## ⚙️ Mode Kirim

| Mode | Perilaku | Cocok untuk |
|---|---|---|
| **Manual (default, disarankan)** | Extension hanya mengisi teks. Pengiriman tetap oleh pengguna. | Produksi harian, prompt panjang, dan sesi yang butuh pengecekan |
| **Auto-send** | Setelah disuntik, extension mengklik tombol kirim bila tombol ditemukan dan aktif. | Antrean yang sudah final dan teruji |

Jika tombol kirim tidak ditemukan, teks tetap terisi dan pengguna tinggal mengirim manual — antrean tidak hilang.

> ⚠️ Jangan menyuntik prompt berikutnya saat chat masih menjawab prompt sebelumnya. Tunggu jawaban selesai agar urutan tidak berantakan.

---

## 🔒 Privasi & Keamanan

- Extension **tidak menyimpan password** dan **tidak membaca jawaban chat**.
- Antrean dan gambar referensi hanya tersimpan lokal di `chrome.storage.local` pada browser pengguna.
- Tidak ada data yang dikirim ke server pihak ketiga mana pun.
- Tidak ada pelacakan, tidak ada analitik.

---

## 🗂️ Struktur Proyek

```text
Reels-Creator/
├── manifest.json            # Izin extension + daftar situs yang didukung (Manifest V3)
├── content.js               # Cari kotak chat, suntik teks, panel in-page
├── popup.html               # Tampilan popup extension
├── popup.js                 # Kelola antrean, simpan, suntik, aktivasi per-tab
├── README.md                # Dokumen ini
└── prompts/
    └── contoh-prompt-reels.txt   # 3 contoh prompt Reels siap pakai
```

---

## 🛠️ Troubleshooting

| Gejala | Solusi |
|---|---|
| Panel tidak muncul di halaman chat | Refresh halaman chat; untuk chat di luar daftar, klik **Aktifkan di tab ini** dari popup |
| Teks tidak masuk ke kotak chat | Pastikan halaman chat termuat penuh, lalu coba suntik sekali lagi |
| Gambar referensi tidak terlampir | Cek status di panel: bila tertulis clipboard, tekan **Ctrl+V** di kotak chat; bila gagal total, lampirkan manual lewat tombol 📎 di chat |
| Gambar diskip saat dipilih | Total gambar melebihi ~8 MB — kompres / perkecil gambar, lalu pilih ulang |
| Tombol kirim tidak terklik (mode auto-send) | Kirim manual dengan Enter / tombol kirim; antrean tetap aman |
| Antrean kosong setelah reload | Simpan ulang dari popup — antrean tersimpan per browser, bukan per tab |
| Extension tidak aktif setelah update | Klik **Reload** pada kartu extension di `chrome://extensions` |

---

## 🗺️ Roadmap

- [x] v1.0 — Suntik antrean satu per satu ke `muse.ai`, auto-send opsional
- [x] v1.1 — Dukungan multi-chat + aktivasi per-tab untuk chat lainnya
- [x] v1.2 — Gambar referensi `.jpg` / `.png` bersama prompt
- [ ] v1.3 — Deteksi chat selesai menjawab sebelum prompt berikutnya disuntik
- [ ] v1.3 — Jeda otomatis antar prompt dan template prompt bawaan

---

## 📜 Changelog

### v1.2.0

- Gambar referensi: pilih `.jpg` / `.png` (`.webp` juga) di popup, dilampirkan bersama tiap prompt yang disuntik.
- Lampiran best-effort: input file chat → tombol lampiran → fallback clipboard (Ctrl+V), dengan status yang jujur soal metode yang berhasil.
- Batas praktis total gambar ~8 MB (penyimpanan lokal browser), file berlebih diskip dengan peringatan.
- Tombol **Hapus gambar referensi** di popup.

### v1.1.0

- Dukungan multi-chat: ChatGPT, Claude, Gemini, Meta AI, Copilot, Perplexity, DeepSeek, Grok.
- Tombol **Aktifkan di tab ini** untuk chat di luar daftar situs bawaan.
- Guard injeksi ganda pada content script.
- README ditulis ulang dengan dokumentasi lengkap.

### v1.0.0

- Rilis awal: antrean prompt, suntik satu per satu ke chat Muse (`muse.ai`), panel in-page, dan mode auto-send opsional.

---

<p align="center">
  Dibuat untuk produksi konten yang lebih cepat — satu antrean, tanpa copy-paste berulang. 🎬
</p>
