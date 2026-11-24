# 🎄 ASCII Christmas Tree 3D

Pohon Natal 3D yang berputar, digambar **100% dari karakter ASCII** di `<canvas>`.
Ada bintang berkedip, lampu, garland spiral, bola hias, kado, salju, banner ketik otomatis, dan panel kode ala reels.

- **Tanpa library, tanpa build step**: hanya `index.html`, `style.css`, `main.js`
- Siap deploy ke **Vercel** atau **Cloudflare Pages** sebagai static site
- Responsif (rasio 9:16 seperti reels), jalan di HP dan desktop

> Proyek ini **terinspirasi** dari reels `@treeco.ai`. Aslinya skrip Python, sedangkan di sini ditulis ulang dari nol dengan JavaScript supaya bisa jalan di browser dan di-hosting statis. Kodenya orisinal, bukan salinan.

---

## 1. Isi folder

```
ascii-christmas-tree/
├── index.html   # struktur halaman
├── style.css    # tampilan
├── main.js      # mesin render 3D ASCII + konfigurasi
└── README.md    # panduan ini
```

## 2. Jalankan di komputer sendiri

Pilih salah satu:

**A. Paling gampang**: klik dua kali `index.html`. Langsung jalan di browser.

**B. Pakai server lokal (disarankan, karena mirip kondisi online)**

```bash
# Python
python -m http.server 8000
# lalu buka http://localhost:8000

# atau Node.js
npx serve .
```

## 3. Kontrol

| Aksi | Cara |
|---|---|
| Putar manual | Geser (drag) di atas pohon |
| Jeda / putar | Tombol ⏸ atau tekan **Spasi** |
| Ganti tema (Classic / Ice / Neon) | Tombol 🎨 atau tekan **T** |
| Simpan gambar PNG | Tombol 📸 atau tekan **S** |

## 4. Kustomisasi

### a) Lewat URL (tanpa edit kode)

Tambahkan parameter di belakang alamat website:

| Parameter | Contoh | Fungsi |
|---|---|---|
| `name` | `?name=@budi` | Nama/akun di pojok kiri atas |
| `text` | `?text=SELAMAT NATAL 2026` | Teks banner |
| `theme` | `?theme=neon` | `classic`, `ice`, atau `neon` |
| `speed` | `?speed=1.2` | Kecepatan putar (0 sampai 3) |
| `fps` | `?fps=60` | Batas FPS (10 sampai 60) |
| `seed` | `?seed=7` | Tata letak hiasan berbeda |
| `code` | `?code=0` | Sembunyikan panel kode |

Gabungkan dengan `&`, misalnya:
`https://domain-kamu.vercel.app/?name=@budi&text=SELAMAT%20NATAL&theme=ice`

### b) Edit default di kode

Buka `main.js`, lihat blok `CONFIG` di bagian atas:

```js
const CONFIG = {
  handle: '@namakamu',            // ganti dengan akun kamu
  banner: 'MERRY CHRISTMAS 2026', // teks di bawah pohon
  theme: 'classic',
  fps: 30,
  speed: 0.55,
  cols: 0,                        // 0 = otomatis
  showCode: true,
  seed: 2026,
};
```

Warna tema ada di objek `THEMES` tepat di bawahnya. Tinggal tambah tema baru dengan menyalin salah satunya.

---

## 5. Upload ke GitHub

### Cara 1: lewat terminal

1. Buat repository kosong di <https://github.com/new>, misalnya `ascii-christmas-tree` (public atau private bebas, jangan centang "Add a README").
2. Di folder project:

```bash
git init
git add .
git commit -m "feat: ascii christmas tree"
git branch -M main
git remote add origin https://github.com/USERNAME/ascii-christmas-tree.git
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub kamu.

### Cara 2: lewat web (tanpa Git)

1. Buat repository baru di GitHub.
2. Klik **uploading an existing file**.
3. Seret `index.html`, `style.css`, `main.js`, `README.md` ke halaman itu.
4. Klik **Commit changes**.

> Pastikan `index.html` ada di **root** repository, bukan di dalam subfolder.

---

## 6. Deploy ke Vercel

1. Masuk ke <https://vercel.com> dan login dengan GitHub.
2. Klik **Add New… → Project**.
3. Pilih repository `ascii-christmas-tree` lalu **Import**.
4. Isi pengaturan seperti ini:
   - **Framework Preset**: `Other`
   - **Build Command**: kosongkan
   - **Output Directory**: kosongkan
   - **Install Command**: kosongkan
5. Klik **Deploy**. Dalam sekitar 30 detik kamu dapat alamat `https://nama-project.vercel.app`.

Setiap kali kamu `git push`, Vercel otomatis deploy ulang.

**Alternatif lewat CLI:**

```bash
npm i -g vercel
vercel        # ikuti pertanyaannya, lalu
vercel --prod
```

## 7. Deploy ke Cloudflare Pages

1. Masuk ke <https://dash.cloudflare.com>.
2. Buka **Workers & Pages → Create application → Pages → Connect to Git**.
3. Pilih repository `ascii-christmas-tree`.
4. Isi pengaturan build:
   - **Framework preset**: `None`
   - **Build command**: kosongkan
   - **Build output directory**: `/` (atau `.`)
5. Klik **Save and Deploy**. Alamatnya berbentuk `https://nama-project.pages.dev`.

> Tampilan dashboard Cloudflare sering berubah. Intinya: connect repo, tanpa build command, folder output adalah root.

---

## 8. Domain sendiri (opsional)

- **Vercel**: Project → **Settings → Domains → Add**
- **Cloudflare Pages**: Project → **Custom domains → Set up a custom domain**

Ikuti petunjuk DNS yang muncul.

## 9. Troubleshooting

| Masalah | Solusi |
|---|---|
| Halaman putih / kosong | Pastikan `index.html`, `style.css`, `main.js` berada di folder yang sama dan di root repo. Buka Console browser (F12) untuk melihat error. |
| Animasi patah-patah di HP lama | Pakai `?fps=24`, atau turunkan jumlah kolom lewat `cols: 60` di `CONFIG`. |
| Karakter terlihat tidak sejajar | Browser tidak punya font monospace bawaan. Ubah konstanta `FONT` di `main.js` ke font monospace yang kamu pakai. |
| Tombol simpan PNG tidak jalan | Pastikan website dibuka lewat `https://` atau `localhost`, bukan dari file lain yang diblokir browser. |
| Setelah push, tampilan lama masih muncul | Hard refresh dengan **Ctrl+Shift+R**. |

## 10. Cara kerja singkat

1. Pohon dibangun dari ± 5.500 titik 3D: daun, rumbai, garland, lampu, bola, bintang, batang, kado, dan lantai.
2. Tiap frame, semua titik diputar mengelilingi sumbu Y lalu diproyeksikan dengan perspektif ke grid karakter.
3. **Z-buffer** per sel memastikan hanya titik terdepan yang tampil.
4. Terang gelapnya titik (dari arah cahaya) dipetakan ke deretan karakter, dari `.` sampai `@`.
5. Salju dan bintang latar punya kedalaman sendiri, jadi bisa lewat di depan atau di belakang pohon.

Bebas dipakai dan dimodifikasi. Selamat Natal! 🎅
