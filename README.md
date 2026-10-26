# 🎬 Reels-Creator

![Version](https://img.shields.io/badge/version-2.2.0-7c5cff)
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
| 🤖 Auto-batch | Kirim antrean otomatis: tunggu jawaban selesai, lalu kirim prompt berikutnya sendiri |
| 🎬 Project & pengganda | 1 template + profil karakter dikunci + daftar variasi → N antrean (1 baris = 1 video) |
| 📦 Simpan jawaban + export JSON | Tiap jawaban auto-batch disimpan lokal, divalidasi JSON/scene, lalu di-export jadi 1 file JSON siap render |
| 💾 Prompt tersimpan | Simpan prompt ke pustaka lokal, pakai ulang kapan pun untuk video serupa |
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

Klik ikon extension, tempel daftar prompt di editor gelap, lalu klik **Simpan antrean**. Sejak v1.2.1, klik **Suntik prompt berikutnya** saja juga cukup — draf di textarea otomatis disimpan dulu bila belum tersimpan.

### 2. Project & pengganda — 1 prompt jadi N video (baru di v2.2)

Di popup bagian **Project & Pengganda**, isi:

1. **Nama project** — misal `AI Cat Streetwear`.
2. **Profil karakter** — deskripsi lengkap yang dikunci, misal kucing oranye gemuk, jaket denim oversize, bandana merah, gaya hyper-realistic. Profil ini disuntik ke tiap prompt, jadi karakter konsisten walau tiap video beda tema.
3. **Template prompt** — pakai variabel `{{character}}`, `{{theme}}`, `{{project}}` (atau `[CHARACTER_PROFILE]` untuk preset lama).
4. **Daftar variasi** — 1 baris = 1 video, misal naik sepeda lowrider, mandi busa, jaga parkir.

Klik **Buat antrean dari project ini** — template langsung mengembang jadi N prompt di antrean. Lalu jalankan **auto-batch** seperti biasa. Tiap jawaban yang selesai otomatis tersimpan di bagian **Hasil Auto-batch**, lengkap dengan project, tema, status JSON valid / jumlah scene. Klik **Export hasil jadi JSON** untuk mengunduh 1 file `reels-creator-hasil-*.json` siap dipakai ke tahap render.

### 2. Simpan prompt untuk dipakai ulang (baru di v2.0)

Prompt yang hasilnya bagus jangan dibuang. Di popup, isi nama prompt (misalnya "Kucing Streetwear v1") lalu klik **Simpan prompt ini**. Prompt masuk ke pustaka lokal dan muncul di bawah editor.

Lain kali, untuk video serupa:

- Klik **Muat** — prompt masuk ke editor, bisa diedit dulu sebelum dikirim.
- Klik **Pakai** — prompt langsung jadi antrean, tinggal klik **Suntik Prompt**.
- Klik **Hapus** — menghapus prompt itu dari pustaka saja, antrean yang sedang berjalan tidak ikut terhapus.

Preset bawaan juga tersedia di bawah editor: **AI Cat Streetwear**, **Cinematic 9:16**, dan **Product Commercial** — klik preset untuk mengisi editor dengan template JSON-nya, lalu sesuaikan isinya.

### 2. Tambahkan gambar referensi (opsional)

Di popup yang sama, klik pilih file pada bagian **Gambar referensi** dan pilih file `.jpg` / `.png` (`.webp` juga didukung). Gambar yang dipilih akan dilampirkan bersama tiap prompt yang disuntik — cocok untuk referensi karakter, gaya visual, atau foto produk.

### 3. Buka halaman chat

Buka chat tujuan di tab lain (misalnya `muse.ai`) dan pastikan halaman sudah termuat penuh.

### 3. Suntik prompt berikutnya

Klik **Suntik prompt berikutnya** — dari popup extension, atau dari panel kecil di pojok kanan bawah halaman chat.

### 4. Cek, lalu kirim

Prompt sudah terisi di kotak chat. Periksa sekilas, lalu tekan **Enter** atau klik tombol kirim seperti biasa.

### 5. Ulangi untuk prompt berikutnya — atau jalankan auto-batch

Manual: tunggu jawaban chat selesai, baru suntik prompt berikutnya. Satu antrean bisa dipakai untuk satu sesi produksi penuh.

Auto-batch: atur **Jeda tenang** dan **Maks tunggu per prompt** di popup (atau langsung dari panel di halaman chat), lalu klik **Mulai auto-batch**. Extension akan mengirim prompt 1, menunggu jawaban selesai, lalu mengirim prompt berikutnya sendiri sampai antrean habis. Tombol **Jeda / Lanjut** dan **Berhenti** tersedia di popup maupun panel.

---

## 🤖 Auto-batch — Cara Kerja & Batasan Jujur

**Deteksi jawaban selesai (heuristik generik, bukan API resmi chat):**

1. Tidak ada lagi tombol Stop / Berhenti yang terlihat di halaman chat, DAN
2. Isi halaman tidak berubah selama jeda tenang yang diatur (default 8 detik).

**Pengaman yang sengaja dibuat:**

- Kalau jawaban belum selesai melewati maks tunggu (default 5 menit per prompt), batch **dijeda, bukan dilanjut buta** — cek chat, tunggu selesai, lalu tekan Lanjut.
- Kalau prompt sudah masuk tapi tombol kirim tidak ketemu, batch juga dijeda — kirim manual, lalu Lanjut.
- Jeda / Berhenti berlaku di antara prompt. Kalau dijeda di tengah jawaban, pastikan jawaban selesai dulu sebelum Lanjut.
- Jalankan **satu batch per satu tab**. Jangan tutup tab selama batch jalan — tab yang tidak aktif bisa membuat timer Chrome melambat sehingga deteksi jawaban ikut melambat.
- Deteksi ini heuristik lintas chat (Muse, ChatGPT, Claude, Gemini, dll), bukan deteksi resmi per platform, jadi tidak 100% pasti di semua layout chat. Untuk batch pertama, coba dulu dengan antrean kecil (2–3 prompt) sambil dipantau, sebelum ditinggal jalan untuk antrean besar.

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

- Extension **tidak menyimpan password**.
- Sejak v2.2, extension **membaca jawaban chat hanya saat auto-batch berjalan** — tepat setelah jawaban dinyatakan selesai — untuk menyimpannya sebagai hasil. Jawaban, antrean, dan gambar referensi hanya tersimpan lokal di `chrome.storage.local` pada browser pengguna.
- Sebelum v2.2, extension memang tidak membaca jawaban chat sama sekali; perubahan ini sengaja, karena tanpa simpan jawaban automation putus di tengah.
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
| Panel tidak muncul di halaman chat | Refresh halaman chat; untuk chat di luar daftar, klik **Aktifkan di tab ini** dari popup. Sejak v1.2.1, tombol **Suntik** juga otomatis mengaktifkan content script di tab lama lalu mencoba ulang |
| Klik Suntik terasa tidak bereaksi | Pastikan antrean sudah tersimpan — sejak v1.2.1 draf textarea otomatis disimpan saat Suntik diklik. Bila status menampilkan "Gagal menyuntik", tab chat kemungkinan belum termuat penuh — tunggu sebentar lalu coba lagi |
| Teks tidak masuk ke kotak chat | Pastikan halaman chat termuat penuh, lalu coba suntik sekali lagi |
| Gambar referensi tidak terlampir | Cek status di panel: bila tertulis clipboard, tekan **Ctrl+V** di kotak chat; bila gagal total, lampirkan manual lewat tombol 📎 di chat |
| Gambar diskip saat dipilih | Total gambar melebihi ~8 MB — kompres / perkecil gambar, lalu pilih ulang |
| Auto-batch dijeda di tengah jalan | Cek status di panel: biasanya maks tunggu lewat atau tombol kirim tidak ketemu. Tunggu jawaban selesai / kirim manual, lalu tekan Lanjut. Naikkan maks tunggu untuk jawaban yang memang panjang |
| Jawaban tidak tersimpan (capture_failed) | Penangkapan jawaban itu heuristik generik, bukan API resmi — layout chat tertentu belum dikenali. Job tetap dicatat, salin jawaban manual dari chat untuk job itu; job lain yang berhasil tetap bisa di-export |
| Auto-batch terasa lambat saat tab tidak aktif | Itu throttling timer Chrome di tab background. Biarkan tab chat tetap terlihat selama batch jalan |
| Tombol kirim tidak terklik (mode auto-send) | Kirim manual dengan Enter / tombol kirim; antrean tetap aman |
| Antrean kosong setelah reload | Simpan ulang dari popup — antrean tersimpan per browser, bukan per tab |
| Extension tidak aktif setelah update | Klik **Reload** pada kartu extension di `chrome://extensions` |

---

## 🗺️ Roadmap

- [x] v1.0 — Suntik antrean satu per satu ke `muse.ai`, auto-send opsional
- [x] v1.1 — Dukungan multi-chat + aktivasi per-tab untuk chat lainnya
- [x] v1.2 — Gambar referensi `.jpg` / `.png` bersama prompt
- [x] v1.2.1 — Suntik otomatis menyimpan draf + otomatis mengaktifkan tab lama
- [x] v2.0 — Desain popup baru ala mockup (editor gelap, strip target, telemetri antrean) + pustaka prompt tersimpan + preset bawaan
- [x] v2.1 — Auto-batch: kirim antrean, tunggu jawaban selesai (heuristik), lanjut otomatis, jeda / berhenti
- [x] v2.2 — Project + profil karakter + pengganda variasi (1 prompt → N video) + simpan jawaban + export JSON siap render
- [ ] v2.3 — Validasi jawaban + retry otomatis + scene splitter + riwayat anti-duplikat
- [ ] v2.3 — Export / import pustaka prompt (PC rumah ↔ kantor)

---

## 📜 Changelog

### v2.2.0

- Fitur baru **Project & Pengganda**: nama project + profil karakter yang dikunci + template prompt dengan variabel `{{character}}`, `{{theme}}`, `{{project}}` (plus `[CHARACTER_PROFILE]` untuk preset lama) + daftar variasi 1 baris = 1 video → tombol **Buat antrean dari project ini** mengembang template jadi N antrean. Project tersimpan dan dimuat ulang saat popup dibuka.
- Fitur baru **Simpan jawaban auto-batch**: setelah jawaban dinyatakan selesai, content script menangkap teks jawaban baru, memvalidasi JSON / jumlah scene, dan menyimpannya lokal di `chrome.storage.local` (maks 200 hasil, tanpa kirim ke server). Status batch di akhir menampilkan berapa jawaban tersimpan dan berapa yang gagal ditangkap.
- Fitur baru **Export hasil jadi JSON**: 1 file `reels-creator-hasil-*.json` berisi semua hasil (project, tema, prompt, jawaban, status JSON/scene, waktu, URL sumber) — siap dipakai ke tahap render. Daftar hasil di popup bisa dibuka per item dan jawabannya bisa disalin.
- Batasan jujur: penangkapan jawaban adalah heuristik generik lintas chat, bukan API resmi — kalau layout chat belum dikenali, job dicatat `capture_failed` (bukan hilang diam-diam) dan perlu salin manual untuk job itu. Bagian Privasi di README diperbarui karena v2.2 memang membaca jawaban — hanya saat auto-batch, hanya untuk disimpan lokal.

### v2.1.0

- Fitur baru **Auto-batch**: mulai dari popup atau panel di halaman chat, kirim antrean satu per satu dengan kirim otomatis yang dipaksakan selama batch (toggle manual tetap berlaku di luar batch).
- Deteksi jawaban selesai via heuristik generik: tidak ada tombol Stop + isi halaman stabil selama jeda tenang (default 8 detik, bisa diatur 3–60 detik).
- Pengaman: maks tunggu per prompt (default 5 menit, bisa diatur 1–30 menit) — lewat batas, batch dijeda bukan dilanjut; tombol kirim tidak ketemu juga menjeda batch.
- Kontrol batch di popup (Mulai / Jeda-Lanjut / Berhenti + status) dan di panel halaman chat (▶ Auto-batch / ⏸ Jeda / ⏹ Berhenti), dengan pengaturan yang tersimpan dan dipakai panel.

### v2.0.0

- Desain ulang popup mengikuti mockup: header dengan badge versi dari manifest, strip target tab aktif (Terkoneksi / Belum aktif), editor JSON gelap dengan tombol Format JSON, telemetri antrean (Total / Disuntik / Sisa / Auto-send + progress bar), dan panduan cara pakai dalam accordion.
- Fitur baru **Simpan Prompt**: pustaka prompt lokal (nama + isi + tanggal), dengan aksi Muat / Pakai / Hapus, supaya video serupa bisa dibuat ulang tanpa mengetik ulang.
- Preset bawaan: AI Cat Streetwear, Cinematic 9:16, Product Commercial.
- Gambar referensi kini tampil sebagai grid thumbnail dengan hapus per gambar, bukan hanya hapus semua.
- Catatan implementasi: desain dibuat dengan CSS lokal sepenuhnya, tanpa CDN Tailwind / font remote, karena halaman extension MV3 memblokir script dan font dari luar — tampilannya meniru mockup, bukan memuat Tailwind dari internet.

### v1.2.1

- Perbaikan UX dari laporan pemakaian nyata: klik **Suntik** kini otomatis menyimpan draf textarea bila belum tersimpan, jadi urutan Simpan → Suntik tidak wajib lagi.
- Klik **Suntik** kini otomatis mengaktifkan content script di tab chat yang sudah terbuka sebelum extension di-load, lalu mencoba ulang — tidak perlu refresh manual atau klik **Aktifkan di tab ini** dulu.

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
