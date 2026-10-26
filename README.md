# Reels-Creator — Auto Input ke Chat Muse

Extension Chrome (Manifest V3) untuk pembuatan video/Reels tanpa copy-paste manual
berulang-ulang. Lo tempel antrean prompt sekali, terus suntik satu per satu ke
kotak chat Muse (muse.ai).

## Cara install (Load unpacked)

1. Buka `chrome://extensions` → nyalakan **Developer mode** (kanan atas).
2. Klik **Load unpacked** → pilih folder extension ini (atau hasil ekstrak ZIP).
3. Buka chat Muse di `muse.ai`, login seperti biasa.
4. Klik ikon extension → tempel antrean prompt → **Simpan antrean**.
5. Klik **Suntik prompt berikutnya** (di popup, atau di panel kecil pojok kanan
   bawah halaman chat). Teks masuk ke kotak chat.
6. Cek teksnya, lalu kirim manual (Enter / tombol kirim).

## Format antrean

- Pisahkan tiap prompt dengan satu baris yang hanya berisi `---`.
- Atau tempel JSON array: `["prompt 1", "prompt 2"]`, atau array objek
  dengan field `prompt`.
- Bisa juga load file `.txt` / `.json` dari popup.
- Contoh siap pakai: `prompts/contoh-prompt-reels.txt`.

## Mode kirim

- **Default: OFF (disarankan).** Extension hanya mengisi teks, tidak mengirim.
  Ini sengaja: lo bisa cek prompt sebelum terkirim, dan tidak spam chat saat
  Muse masih menjawab prompt sebelumnya.
- **Auto-send ON:** setelah disuntik, extension klik tombol kirim kalau ketemu
  dan aktif. Kalau tombol tidak ketemu, teks tetap terisi dan lo kirim manual.

## Keamanan / batasan

- Extension tidak menyimpan password, tidak membaca isi jawaban Muse, dan tidak
  mengirim data ke server mana pun. Antrean hanya tersimpan lokal di
  `chrome.storage.local` di browser lo.
- Jangan jalankan auto-send beruntun saat Muse masih generating — tunggu
  jawaban selesai, baru suntik prompt berikutnya.
- Kalau kotak chat Muse berubah layout dan extension gagal menemukan composer,
  update selector di `content.js` (`findComposer` / `findSendButton`).

## Struktur file

- `manifest.json` — izin + target `muse.ai`
- `content.js` — cari kotak chat, suntik teks, panel kecil di halaman chat
- `popup.html` / `popup.js` — kelola antrean, simpan, suntik berikutnya
- `prompts/contoh-prompt-reels.txt` — 3 contoh prompt

## Versi

- v1.0.0 — suntik antrean satu per satu, auto-send opsional, panel in-page.
