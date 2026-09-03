# System Management Sparepart (SMS)
## Dokumentasi Fitur, Alur Kerja & Dampak Operasional

> **Versi Sistem:** SMS v4.26.2  
> **Platform:** Desktop Application (Windows)  
> **Koneksi Database:** SQL Server (Enterprise)  
> **Terakhir Diperbarui:** Juli 2026

---

## Daftar Isi

1. [Gambaran Umum Sistem](#gambaran-umum-sistem)
2. [Login & Akses Sistem](#1-login--akses-sistem)
3. [Dashboard](#2-dashboard)
4. [Master Data Sparepart](#3-master-data-sparepart)
5. [Barang Masuk](#4-barang-masuk)
6. [Barang Keluar](#5-barang-keluar)
7. [Riwayat Transaksi](#6-riwayat-transaksi)
8. [Admin Management](#7-admin-management)
9. [Master Machine](#8-master-machine)
10. [Machine Sparepart Mapping](#9-machine-sparepart-mapping)
11. [Cost Intelligence](#10-cost-intelligence)
12. [Line Compatibility](#11-line-compatibility)
13. [Electrical Parts](#12-electrical-parts)
14. [Supplier Data](#13-supplier-data)
15. [Settings](#14-settings)
16. [Email Settings](#15-email-settings)
17. [Dampak & Nilai Bisnis](#dampak--nilai-bisnis)

---

## Gambaran Umum Sistem

System Management Sparepart (SMS) adalah aplikasi manajemen gudang sparepart yang dirancang khusus untuk lingkungan manufaktur. Sistem ini mengelola seluruh siklus hidup sparepart mulai dari penerimaan barang, pengeluaran ke mesin, hingga analisis biaya per lini produksi.

**Dua area kerja utama yang dilayani sistem ini:**
- **UP1** — Lini produksi T5, J3, T3, J5, J4, T7, B10, B5, T1, T4, T6, T8, T9, T12
- **UP2** — Lini produksi B24, B22, B21, B20, B19, B18, B17, B11, S6, S7, S8, S9, S10, S20, S19, S18, S16, S15, S14

**Pengguna sistem terbagi dalam dua peran:**
| Peran | Hak Akses |
|---|---|
| **Admin** | Akses penuh ke seluruh fitur, termasuk approval, konfigurasi sistem, dan manajemen user |
| **User / Operator** | Akses terbatas sesuai permission yang dikonfigurasi admin (misalnya hanya Barang Masuk atau Barang Keluar) |

---

## 1. Login & Akses Sistem

### Fitur
- Form login dengan username dan password
- Validasi kredensial terhadap database SQL Server
- Session management — sistem menyimpan info user yang sedang login
- Role-based access control (RBAC) — menu yang tampil di sidebar disesuaikan otomatis berdasarkan role dan permission masing-masing user
- Redirect otomatis ke halaman utama setelah login berhasil

### Flow — Apa yang Terjadi

```
User membuka aplikasi
    └─► Halaman Login muncul
        └─► User mengetik username & password
            └─► Sistem memverifikasi ke SQL Server
                ├─► [Berhasil] → Session disimpan → Masuk ke Dashboard
                └─► [Gagal] → Pesan error ditampilkan
```

### Yang Dilakukan User
1. Buka aplikasi SMS
2. Ketik username dan password
3. Tekan Enter atau klik tombol Login
4. Sistem otomatis mengarahkan ke Dashboard

### Yang Dilakukan Admin
- Membuat dan mengelola akun user melalui menu Settings
- Menetapkan role (Admin/User) dan permission spesifik per user
- Menonaktifkan akun user yang sudah tidak aktif

---

## 2. Dashboard

### Fitur
Dashboard adalah halaman pertama yang muncul setelah login. Ini adalah pusat kendali visual yang menampilkan kondisi gudang secara real-time dalam satu layar.

**KPI Cards (ringkasan angka penting):**
- **Total Sparepart Items** — Jumlah total part yang terdaftar di sistem
- **Low Stock Alert** — Jumlah part yang stoknya di bawah atau mendekati safety stock (dilengkapi tanda seru merah sebagai peringatan)
- **Sparepart Outgoing Cost** — Total biaya pengeluaran sparepart; bisa difilter per bulan/tahun
- **Pending Approvals** — Jumlah antrean transaksi Barang Keluar yang menunggu persetujuan (approval) admin

**Stock Status Overview (donut chart):**
- Normal Stock (hijau) — Stok aman di atas safety stock
- Near Safety Stock (kuning) — Stok mendekati batas minimum
- Below Safety Stock (merah) — Stok sudah di bawah batas minimum

**Cost per Line Chart (line chart interaktif):**
- Grafik garis yang menampilkan total biaya sparepart per lini produksi
- Bisa difilter berdasarkan tahun dan bulan
- Setiap titik data menampilkan angka Rupiah secara langsung di atas grafik
- Otomatis memuat ulang saat filter diubah

**Top 5 Low Stock Items (tabel prioritas):**
- Daftar 5 sparepart yang stoknya paling kritis
- Menampilkan BIN, nama item, mesin terkait, stok saat ini vs safety stock
- Badge status warna merah/kuning untuk identifikasi cepat

**Recent Activity Feed:**
- 5 aktivitas terakhir di seluruh sistem (barang masuk, keluar, penambahan/penghapusan data)
- Menampilkan jenis aktivitas, nama sparepart, siapa yang melakukan, dan kapan waktunya

**KPI Tiga Insight Biaya:**
- Highest Cost Line — Lini produksi dengan biaya sparepart tertinggi bulan ini
- Highest Cost Asset — Mesin dengan biaya sparepart tertinggi bulan ini
- Top Cost Sparepart — Sparepart dengan total biaya pengeluaran tertinggi

### Flow

```
User masuk ke Dashboard
    └─► Sistem otomatis memuat data real-time dari SQL Server
        ├─► KPI cards terisi (total item, low stock, outgoing cost)
        ├─► Donut chart tergambar (distribusi status stok)
        ├─► Line chart tergambar (cost per production line)
        ├─► Tabel low stock terisi (5 item paling kritis)
        └─► Recent activity feed terisi (5 aktivitas terakhir)

User mengubah filter Tahun/Bulan
    └─► Chart, outgoing cost, dan KPI biaya otomatis terupdate
        (tanpa reload halaman penuh)

User klik tombol Refresh
    └─► Seluruh data Dashboard dimuat ulang dari database

User klik KPI Card "Low Stock"
    └─► Navigasi otomatis ke halaman yang relevan
```

### Yang Dilakukan User
1. Melihat kondisi gudang sekilas setiap hari masuk kerja
2. Mengecek apakah ada alert low stock yang perlu ditangani
3. Memfilter cost per line untuk periode tertentu
4. Klik refresh jika ingin data terbaru

### Yang Dilakukan Admin
1. Sama seperti user, plus memantau tren biaya antar lini
2. Menggunakan insight untuk menentukan lini mana yang perlu diaudit lebih lanjut
3. Memantau aktivitas terbaru untuk memastikan tidak ada transaksi yang tidak wajar

### Nilai untuk Atasan
Dashboard memberikan gambaran lengkap kondisi gudang dalam satu halaman. Saat atasan membutuhkan laporan kondisi stok atau biaya, data sudah tersedia secara visual tanpa harus meminta laporan manual dari staf gudang.

---

## 3. Master Data Sparepart

### Fitur
Ini adalah "buku induk" seluruh sparepart yang dikelola gudang. Setiap sparepart memiliki data lengkap yang menjadi acuan seluruh transaksi di sistem.

**Data yang dikelola per sparepart:**
| Field | Keterangan |
|---|---|
| Part Number | ID unik yang di-generate otomatis sistem |
| BIN | Kode lokasi fisik penyimpanan di rak gudang |
| UP Area | Area kerja (UP1 atau UP2) |
| Category | Kategori sparepart |
| Machine | Mesin yang menggunakan part ini |
| Item Name | Nama sparepart |
| Detail | Spesifikasi teknis atau keterangan tambahan |
| Brand | Merek atau produsen |
| Budget Code | Kode anggaran untuk keperluan akuntansi |
| Current Stock | Jumlah stok saat ini (otomatis update saat ada transaksi masuk/keluar) |
| Safety Stock | Batas minimum stok — dihitung otomatis dari formula |
| QTY/Line | Kebutuhan per lini produksi |
| TBM/Month | Time Between Maintenance per bulan |
| LT/Month | Lead Time pembelian dalam bulan |
| QTY Need/Year | Kebutuhan tahunan |
| Frequency | FAST atau SLOW (menentukan faktor safety stock) |
| Gambar | Foto sparepart untuk identifikasi visual |
| Compatible Lines | Daftar lini produksi yang bisa menggunakan part ini |

**Formula Safety Stock (otomatis):**
```
Safety Stock = (QTY Need/Yr ÷ 12) × LT/Month × Safety Factor
Safety Factor = 100% jika FAST, 50% jika SLOW
```

**Fitur operasional:**
- Pencarian real-time berdasarkan Part Number, BIN, nama item
- Paginasi 50 item per halaman untuk performa optimal
- Badge warna pada kolom stok (merah = kritis, kuning = waspada, hijau = aman)
- Badge FAST/SLOW dengan warna berbeda untuk identifikasi cepat
- Export ke Excel — seluruh data master bisa diunduh kapan saja
- Upload foto sparepart langsung dari menu add/edit
- Multi-line compatibility — satu sparepart bisa ditandai kompatibel dengan beberapa lini sekaligus

### Flow — Menambah Sparepart Baru

```
Admin buka Master Data Sparepart
    └─► Klik tombol "Add Sparepart"
        └─► Form dialog terbuka (dua kolom: General Details & Line Compatibility)
            ├─► Admin isi data: Item Name, BIN, Category, Machine, Brand, dll
            ├─► Sistem hitung Safety Stock otomatis saat LT/Month atau QTY Need/Yr diubah
            ├─► Admin centang lini produksi yang kompatibel (UP1 / UP2)
            ├─► Admin upload foto sparepart (opsional)
            └─► Klik "Save Changes"
                └─► Data tersimpan ke SQL Server
                └─► Tabel Master Data langsung ter-refresh
```

### Flow — Mengedit atau Menghapus

```
Admin cari sparepart via search box
    └─► Klik ikon Edit pada baris yang ingin diubah
        └─► Form dialog terbuka dengan data existing
            └─► Admin ubah field yang perlu diupdate
                └─► Klik "Save Changes" → Data ter-update di database

Admin klik ikon Delete
    └─► Konfirmasi dialog muncul ("Yakin ingin menghapus?")
        ├─► Konfirmasi → Item dihapus dari database
        └─► Batal → Tidak ada perubahan
```

### Flow — Export Excel

```
Admin klik ikon Export (download)
    └─► File picker terbuka (pilih lokasi simpan)
        └─► Sistem generate file .xlsx dengan seluruh data master yang tampil
            └─► File tersimpan di lokasi yang dipilih
```

### Yang Dilakukan User
- Tidak bisa menambah atau menghapus (bergantung permission)
- Bisa melihat dan mencari data sparepart
- Bisa melihat kondisi stok saat memilih sparepart di Barang Masuk/Keluar

### Yang Dilakukan Admin
1. Menambah sparepart baru saat ada pengadaan part yang belum terdaftar
2. Mengupdate data (harga, stok, safety stock) saat ada perubahan kondisi lapangan
3. Mengatur kompatibilitas lini produksi untuk setiap sparepart
4. Menghapus data sparepart yang sudah tidak digunakan
5. Export data master untuk keperluan audit atau laporan ke atasan

---

## 4. Barang Masuk

### Fitur
Menu ini digunakan untuk mencatat penerimaan sparepart dari supplier. Setiap kali barang datang dari vendor, transaksi dicatat di sini dan stok otomatis bertambah.

**Form input barang masuk:**
- Tanggal penerimaan (otomatis terisi hari ini, bisa diubah via date picker)
- PIC (Person In Charge) — nama personel yang menerima barang
- Supplier — pilih dari daftar supplier terdaftar
- BIN — kode lokasi penyimpanan
- Item Name — terisi otomatis jika BIN sudah dikenal sistem, atau diisi manual jika BIN baru
- QTY — jumlah unit yang diterima
- PO Number — nomor Purchase Order (opsional)
- Harga Beli per unit (opsional — jika diisi, harga di Master Data otomatis terupdate)
- Remarks — catatan tambahan

**Referensi Master Data (auto-fill):**
Ada fitur pencarian cepat di panel kiri untuk mencari berdasarkan nama item atau BIN. Saat ditemukan dan dipilih, BIN dan nama item otomatis terisi di form.

**Dua mode simpan:**
1. **Tambah Item** → Menambahkan item ke daftar pending (belum tersimpan ke database), berguna untuk input batch beberapa item sekaligus
2. **Submit Direct** → Langsung menyimpan satu item ke database dan memotong antrian

**Pending List (keranjang sementara):**
Daftar item yang sudah di-input tapi belum di-commit ke database. Bisa dihapus jika ada kesalahan sebelum disimpan.

**Riwayat Barang Masuk:**
Bagian bawah halaman menampilkan history penerimaan yang bisa dicari dan difilter per tahun. Tersedia tombol hapus untuk koreksi jika ada entri yang keliru.

### Flow — Input Barang Masuk

```
Staf gudang menerima barang dari supplier
    └─► Buka menu Barang Masuk
        └─► Pilih PIC dan Supplier dari dropdown
            └─► Cari sparepart via "Referensi Master Data" (ketik nama/BIN)
                └─► Klik hasil pencarian → BIN & Item Name terisi otomatis
                    └─► Isi QTY, PO Number, Harga Beli (opsional), Remarks
                        ├─► Klik "Submit Direct" → Langsung simpan, stok bertambah
                        └─► Klik "Tambah Item" → Masuk ke pending list
                            └─► Ulangi untuk item berikutnya
                                └─► Klik "Simpan & Update Stock" → Semua item tersimpan sekaligus
```

### Flow — Koreksi Riwayat

```
Staf menemukan entri yang salah di riwayat
    └─► Cari via search box atau filter tahun
        └─► Klik ikon hapus (trash icon) pada baris yang salah
            └─► Entri dihapus dari database (stok akan disesuaikan)
```

### Yang Dilakukan User/Staf Gudang
1. Setiap ada barang masuk dari supplier, langsung input di sistem
2. Scan BIN atau cari nama part untuk auto-fill
3. Isi jumlah, PO number, dan pilih supplier
4. Submit → Stok di Master Data otomatis bertambah
5. Cek riwayat jika perlu verifikasi transaksi sebelumnya

### Yang Dilakukan Admin
1. Monitor riwayat barang masuk
2. Hapus entri yang salah jika ada kesalahan pencatatan
3. Memastikan data supplier sudah terupdate sebelum staf input

---

## 5. Barang Keluar

### Fitur
Menu ini digunakan untuk mencatat pengeluaran sparepart dari gudang ke mesin produksi. Ini adalah proses yang paling sering terjadi dan paling kritis karena langsung mempengaruhi stok dan biaya produksi.

**Mode scanning:**
- **Kamera (Barcode Scanner)** — Kamera laptop/PC otomatis menyala saat halaman dibuka. Arahkan kamera ke barcode sparepart, sistem otomatis mendeteksi dan menambahkan ke daftar scan. Ada beep sebagai konfirmasi.
- **Input Manual** — Ketik kode Part Number atau kode BIN di field input, lalu tekan Enter. Sistem mencari ke Master Data dan menambahkan jika ditemukan.

**Daftar Scan (panel kiri):**
Semua item yang sudah di-scan ditampilkan di sini. Setiap item punya status "Belum diisi" atau "Siap". Item baru masuk dalam status Belum diisi sampai detail pengeluarannya dilengkapi.

**Form Detail Pengeluaran (panel kanan):**
Untuk setiap item yang dipilih dari daftar scan:
- Actual Usage Line — Lini produksi tempat part digunakan (wajib)
- Mesin — Pilih mesin spesifik dalam lini tersebut (opsional, tapi sangat disarankan untuk tracking biaya)
- QTY — Jumlah yang diambil
- PIC — Nama personel yang mengambil
- Maintenance Type — PM, Breakdown, Improvement, Trial, Stock Correction, atau Others
- Remarks — Catatan tambahan

**Fitur "Default Carry-Over":**
Ada checkbox "Gunakan Line & PIC ini sebagai default untuk item berikutnya" — saat dicentang, Line dan PIC yang dipilih otomatis terisi untuk item scan berikutnya, menghemat waktu saat ambil banyak part untuk mesin yang sama.

**Mekanisme Approval:**
- Jika akun user dikonfigurasi dengan `require_approval`, pengeluaran tidak langsung memotong stok. Status menjadi "Pending" dan masuk antrian approval admin.
- Jika admin atau user tanpa approval, pengeluaran langsung memotong stok saat submit.

### Flow — Pengeluaran Normal (Mekanik di Lapangan)

```
Mekanik butuh sparepart untuk mesin yang breakdown
    └─► Buka menu Barang Keluar
        └─► Arahkan barcode scanner ke sparepart atau ketik kode BIN
            └─► Item muncul di daftar scan dengan status "Belum diisi"
                └─► Klik item di daftar scan → Detail pengeluaran terbuka di kanan
                    └─► Pilih Line, Mesin, isi QTY, pilih PIC
                        └─► Pilih Maintenance Type: "Breakdown"
                            └─► Klik "Simpan Detail & Lanjut"
                                └─► Status item berubah menjadi "Siap"
                                    └─► Scan item berikutnya jika ada lebih dari satu
                                        └─► Klik "Simpan & Kurangi Stok"
                                            └─► Semua item diproses, stok berkurang
```

### Flow — Pengeluaran dengan Approval (User Tanpa Akses Penuh)

```
Operator scan item dan isi semua detail
    └─► Klik "Kirim untuk Approval"
        └─► Data masuk ke antrian pending di Admin Management
            └─► Admin melihat notifikasi di menu Admin Management
                └─► Admin review → Approve atau Reject
                    ├─► Approve → Stok otomatis terpotong
                    └─► Reject → Transaksi dibatalkan, stok tidak berubah
```

### Yang Dilakukan User/Operator
1. Scan barcode sparepart menggunakan kamera atau input manual
2. Untuk setiap item, isi detail: Line, Mesin, QTY, PIC, Maintenance Type
3. Manfaatkan fitur default carry-over untuk efisiensi saat ambil banyak part
4. Submit pengeluaran
5. Tunggu approval admin jika dikonfigurasi demikian

### Yang Dilakukan Admin
1. Memantau antrian approval pengeluaran di Admin Management
2. Approve atau tolak pengajuan yang masuk
3. Memonitor riwayat pengeluaran untuk mendeteksi pola yang tidak wajar

---

## 6. Riwayat Transaksi

### Fitur
Halaman ini adalah arsip lengkap seluruh transaksi yang sudah terjadi — baik barang masuk maupun barang keluar — dalam satu tempat yang terorganisir.

**Tab Barang Masuk:**
Menampilkan kolom: Tanggal/Jam, BIN, Nama Item, QTY (+), PO Number, PIC, Remarks
- Filter berdasarkan tahun (dropdown)
- Pencarian by Part Number, BIN, Item, atau PO Number
- Tombol hapus untuk koreksi entri yang salah

**Tab Barang Keluar:**
Menampilkan kolom: Tanggal/Jam, Part Number, PIC, BIN, Nama Item, Mesin, Line, QTY (-), Harga Unit
- Filter berdasarkan tahun
- Pencarian by Part Number, BIN, PIC, atau Line

**Summary Cards (atas halaman):**
Saat tab aktif berubah, summary cards berubah otomatis:
- Barang Masuk: Total Transaksi, Total QTY Masuk, Unique BIN
- Barang Keluar: Total Transaksi, Total QTY Keluar, Unique BIN, PIC Aktif

**Export ke Excel:**
Tombol download tersedia di toolbar — ekspor data sesuai tab yang sedang aktif dan filter yang sedang berlaku.

### Flow

```
User buka Riwayat Transaksi
    └─► Summary cards muncul untuk tab yang aktif
        └─► User pilih tab (Barang Masuk / Barang Keluar)
            └─► Pilih tahun dari dropdown
                └─► Ketik kata kunci di search box (opsional)
                    └─► Tabel terisi otomatis dengan hasil yang sesuai
                        └─► Klik Export untuk download ke Excel
```

### Yang Dilakukan User
- Cari transaksi tertentu untuk keperluan verifikasi
- Lihat history pengambilan sparepart berdasarkan periode waktu

### Yang Dilakukan Admin
1. Memonitor seluruh pergerakan barang secara historis
2. Mengidentifikasi anomali atau transaksi mencurigakan
3. Export data untuk rekonsiliasi dengan purchase order atau laporan keuangan
4. Hapus entri yang salah saat ada kesalahan pencatatan

---

## 7. Admin Management

### Fitur
Halaman ini adalah pusat kontrol administratif yang hanya bisa diakses oleh admin. Di sini admin mengelola procurement view, approval transaksi, dan monitoring inventori secara keseluruhan.

**Tab 1 — Inventory & Procurement View:**
Tampilan tabel lengkap seluruh sparepart dengan informasi:
- Part Number, BIN, UP Area, Current Stock, Safety Stock
- Nama Item, Detail, Harga Unit, Supplier (Primary)
- Total Value (Current Stock × Unit Price)
- Status Bidding (YES / NO)

Summary cards di atas:
- Total Spareparts — jumlah seluruh item terdaftar
- Total Inventory Value — total valuasi stok yang ada di gudang
- Average Sparepart Price — rata-rata harga per sparepart

Filter stok: Klik summary card untuk filter tampilan berdasarkan status stok.

**Manajemen Supplier per Sparepart:**
Klik tombol detail pada baris sparepart untuk membuka dialog manajemen supplier:
- Lihat daftar supplier yang bisa menyediakan part tersebut
- Set supplier utama (primary supplier)
- Tambah supplier baru dengan harga dan tanggal update
- Hapus supplier yang tidak relevan lagi

**Tab 2 — Bidding View:**
Kelola data pengadaan (bidding) sparepart:
- Lihat summary total bidding, total nilai, bidding pertama vs tambahan
- Filter per tahun
- Detail record bidding per sparepart
- Export data bidding ke Excel

**Tab 3 — Approval Barang Keluar:**
Antrian pengeluaran sparepart yang menunggu persetujuan admin.
- Tampil: Tanggal, Part Number, Nama Barang, QTY, Line/Mesin, PIC, Submitted By
- Tombol Approve — memotong stok dan mencatat siapa yang menyetujui
- Tombol Reject — menolak transaksi, stok tidak berubah

**Tab 4 — Approval Sparepart Mapping:**
Antrian auto-learning compatibility yang butuh verifikasi:
- Sistem belajar otomatis saat sparepart digunakan di mesin/line baru
- Admin bisa Approve, Edit (ubah line/mesin), atau Delete mapping

**Export ke Excel:**
Admin bisa export seluruh data procurement view ke format Excel dengan timestamp otomatis.

### Flow — Proses Approval Barang Keluar

```
Admin buka Admin Management → Tab "Approval Barang Keluar"
    └─► Muncul daftar pengajuan yang pending
        └─► Admin review detail (item, QTY, line, PIC, siapa yang request)
            ├─► Klik ✓ (Approve) → Stok terpotong, transaksi tercatat sebagai approved
            └─► Klik ✗ (Reject) → Transaksi dibatalkan, stok tidak berubah
                └─► Notifikasi konfirmasi muncul di layar
```

### Flow — Lihat Nilai Inventori

```
Admin buka Admin Management → Tab pertama (default)
    └─► Summary cards langsung tampil (Total Items, Inventory Value, Avg Price)
        └─► Tabel inventori penuh ter-render
            └─► Admin klik Summary Card tertentu untuk filter stok
                └─► Admin klik baris sparepart untuk buka dialog supplier
                    └─► Admin kelola supplier (tambah, set primary, hapus)
```

### Yang Dilakukan Admin
1. Monitoring kondisi inventori secara keseluruhan setiap hari
2. Approve atau tolak pengajuan barang keluar dari user
3. Mengelola supplier per sparepart (siapa vendor utama, harga terbaru)
4. Monitoring dan validasi data bidding pengadaan
5. Generate laporan Excel untuk meeting atau audit
6. Review auto-learning compatibility mapping yang diusulkan sistem

---

## 8. Master Machine

### Fitur
Registrasi dan pengelolaan data seluruh mesin produksi yang ada di pabrik. Data mesin ini digunakan sebagai referensi saat input Barang Keluar (mesin mana yang menggunakan part tersebut) dan untuk analisis biaya.

**Data mesin yang dikelola:**
- Machine Code (kode unik mesin)
- Machine Name (nama deskriptif)
- Machine Type (jenis mesin)
- Line (lini produksi tempat mesin berada)
- Status (Active / Inactive)
- Deskripsi atau keterangan tambahan

**Fitur:**
- Tambah mesin baru
- Edit data mesin existing
- Ubah status mesin (nonaktifkan mesin yang sudah tidak beroperasi)
- Filter berdasarkan Line atau Status
- Pencarian berdasarkan Machine Code atau Name

### Flow

```
Admin buka Master Machine
    └─► Lihat daftar seluruh mesin yang terdaftar
        └─► Klik "Add Machine" untuk daftarkan mesin baru
            └─► Isi Machine Code, Name, Type, Line, Status
                └─► Simpan → Mesin langsung tersedia di dropdown Barang Keluar
                
Admin ubah status mesin
    └─► Cari mesin yang bersangkutan
        └─► Edit → Ubah status ke "Inactive"
            └─► Mesin tidak muncul lagi di pilihan dropdown Barang Keluar
```

### Yang Dilakukan Admin
1. Daftarkan mesin baru saat ada penambahan aset produksi
2. Nonaktifkan mesin yang sudah tidak beroperasi
3. Update detail mesin jika ada perubahan konfigurasi
4. Pastikan data mesin selalu akurat sebagai referensi cost tracking

---

## 9. Machine Sparepart Mapping

### Fitur
Ini adalah fitur paling komprehensif untuk analisis kondisi mesin. Menu ini memetakan sparepart mana saja yang terpasang, pernah digunakan, atau perlu dianalisis untuk setiap mesin produksi.

**Tiga kategori data per mesin:**
1. **Installed** — Sparepart yang saat ini terpasang di mesin (komponen aktif)
2. **Consumption** — Riwayat penggunaan sparepart pada mesin tersebut (kapan dipakai, berapa banyak, biaya berapa)
3. **Analysis** — Analisis performa dan prediksi kebutuhan sparepart

**Filter yang tersedia:**
- Filter berdasarkan Line produksi
- Filter berdasarkan tahun dan bulan (global filter di topbar)
- Pencarian mesin berdasarkan kode atau nama

**Informasi yang tampil per mesin:**
- Daftar mesin per lini dengan Machine Code dan Nama
- Total biaya sparepart yang digunakan
- Jumlah sparepart berbeda yang pernah dipakai
- Frekuensi penggunaan
- Detail consumption per sparepart (BIN, nama, QTY, harga, tanggal)

### Flow

```
Admin buka Machine Sparepart Mapping
    └─► Filter Line dari dropdown (misal: Line T5)
        └─► Daftar mesin di Line T5 muncul
            └─► Klik mesin tertentu
                └─► Detail panel terbuka:
                    ├─► Tab Installed: sparepart yang terpasang saat ini
                    ├─► Tab Consumption: history pemakaian sparepart
                    └─► Tab Analysis: analisis kebutuhan dan prediksi
```

### Yang Dilakukan Admin
1. Cek sparepart apa saja yang terpasang di mesin tertentu
2. Lihat history konsumsi sparepart untuk analisis keandalan mesin
3. Gunakan data untuk merencanakan PM (Preventive Maintenance) schedule
4. Identifikasi mesin yang konsumsi sparepartnya paling tinggi

---

## 10. Cost Intelligence

### Fitur
Halaman analisis biaya yang memberikan insight mendalam tentang di mana biaya sparepart paling banyak terserap. Data ini sangat penting untuk pengambilan keputusan manajemen.

**KPI utama (real-time):**
- Total Cost Consumed — Total biaya sparepart yang keluar dalam periode yang dipilih
- Total Qty Issued — Total unit sparepart yang dikeluarkan
- Outbound Transactions — Jumlah transaksi pengeluaran yang terjadi

**Filter waktu:**
- Start Date dan End Date (bisa dipilih bebas via date picker)
- Default menampilkan 30 hari terakhir

**Tab Cost per Line:**
- Tabel: Nama Line, Total Mesin, Total Record Sparepart, Unique Sparepart, Total Cost
- Bar chart Top 5 lini dengan biaya tertinggi (angka Rupiah tampil di atas setiap bar)
- Klik baris di tabel → Drilldown detail: sparepart apa saja yang menyumbang biaya di lini tersebut

**Tab Cost per Machine:**
- Tabel: Machine Code, Machine Name, Type, Status, Line, QTY Sparepart, Total Cost
- Bar chart Top 5 mesin dengan biaya tertinggi
- Filter tambahan: bisa filter berdasarkan Line tertentu
- Klik ikon drilldown → Detail konsumsi sparepart per mesin (QTY, frekuensi, failure reason, maintenance type)

**Export:**
- Tombol download Excel tersedia — export data sesuai tab yang aktif

### Flow — Analisis Biaya untuk Laporan

```
Admin buka Cost Intelligence
    └─► Set periode waktu (misal: awal bulan sampai hari ini)
        └─► KPI cards langsung update
            └─► Pilih Tab "Cost per Line"
                └─► Bar chart Top 5 tergambar
                └─► Tabel urutan biaya per lini muncul
                    └─► Klik baris Line T5 untuk drilldown
                        └─► Detail sparepart di T5 terbuka (nama item, QTY, total cost)
                            └─► Export ke Excel untuk laporan manajemen
```

### Yang Dilakukan Admin
1. Set periode analisis (mingguan, bulanan, kuartalan)
2. Identifikasi lini produksi yang biaya sparepartnya tertinggi
3. Drilldown ke mesin yang paling banyak menyerap biaya
4. Drilldown lebih dalam ke sparepart spesifik yang menyumbang biaya
5. Export data untuk presentasi ke manajemen atau rapat anggaran
6. Tracking tren biaya dari bulan ke bulan

### Nilai untuk Atasan
Menu ini menjawab pertanyaan paling sering diajukan atasan: *"Line mana yang paling banyak habiskan anggaran sparepart?"* dan *"Mesin mana yang paling sering rusak?"* — dalam hitungan detik, bukan hari.

---

## 11. Line Compatibility

### Fitur
Sistem manajemen kompatibilitas sparepart yang bekerja dengan mekanisme *self-learning*. Sistem secara otomatis merekam kombinasi sparepart-line dan sparepart-mesin yang muncul dari transaksi Barang Keluar.

**Dua tipe mapping:**
1. **Line Compatibility** — Sparepart X kompatibel dengan Line Y
2. **Machine Compatibility** — Sparepart X kompatibel dengan Machine Z

**Status mapping:**
- **Approved** — Mapping sudah diverifikasi admin, valid untuk digunakan
- **Pending** — Mapping baru ditemukan sistem dari transaksi terbaru, menunggu review admin
- **Auto-Suggested** — Sistem sudah pernah melihat kombinasi ini dan mengusulkannya

**Fitur admin di halaman ini:**
- Lihat semua mapping yang ada (approved dan pending)
- Tambah mapping manual baru
- Edit mapping yang ada
- Hapus mapping yang tidak valid
- Filter berdasarkan status

### Flow — Self-Learning

```
Mekanik scan sparepart dan pilih Line T5 → submit Barang Keluar
    └─► Sistem melihat kombinasi ini belum ada di mapping
        └─► Sistem otomatis buat entri mapping baru dengan status "Pending"
            └─► Admin masuk ke Compatibility Center atau Admin Management
                └─► Muncul notifikasi mapping baru menunggu review
                    ├─► Admin Approve → Mapping menjadi valid
                    ├─► Admin Edit dulu (ubah line/mesin) → Lalu Approve
                    └─► Admin Delete → Mapping dihapus (kombinasi dianggap tidak valid)
```

### Yang Dilakukan Admin
1. Review mapping baru yang diusulkan sistem secara berkala
2. Approve mapping yang valid, edit yang perlu koreksi, hapus yang salah
3. Tambah mapping manual untuk kombinasi yang sudah diketahui tapi belum pernah dipakai di sistem
4. Pastikan data kompatibilitas akurat untuk validasi transaksi Barang Keluar

---

## 12. Electrical Parts

### Fitur
Sub-modul khusus untuk mengelola sparepart kategori electrical (kelistrikan) yang memiliki karakteristik berbeda dari sparepart mekanik umum.

**Fitur:**
- Daftar khusus electrical parts dengan kolom dan kategorisasi yang relevan
- CRUD operations (tambah, lihat, edit, hapus)
- Filter dan pencarian
- Pengelolaan stok untuk komponen electrical secara terpisah

### Flow

```
Admin atau user buka Electrical Parts
    └─► Lihat daftar komponen electrical yang terdaftar
        └─► Tambah item baru / Edit / Hapus sesuai kebutuhan
```

### Yang Dilakukan Admin
1. Daftarkan komponen electrical baru
2. Monitor stok komponen electrical
3. Update data saat ada pengadaan baru

---

## 13. Supplier Data

### Fitur
Master data supplier (vendor) yang menjadi referensi saat input Barang Masuk dan pengelolaan supplier di Admin Management.

**Data supplier yang dikelola:**
- Nama Supplier
- Kontak (telepon, email)
- Alamat
- NPWP / informasi legal
- Keterangan tambahan

**Fitur:**
- Tambah supplier baru
- Edit data supplier
- Hapus supplier yang sudah tidak aktif
- Daftar supplier langsung tersedia sebagai pilihan di dropdown Barang Masuk

### Flow

```
Admin tambah supplier baru
    └─► Buka Supplier Data
        └─► Klik Add Supplier
            └─► Isi nama, kontak, alamat
                └─► Simpan
                    └─► Supplier langsung tersedia di dropdown Barang Masuk
                        dan di menu Admin Management (supplier management per part)
```

### Yang Dilakukan Admin
1. Daftarkan supplier baru saat ada vendor baru yang disetujui procurement
2. Update kontak supplier saat ada perubahan
3. Nonaktifkan supplier yang sudah tidak bermitra

---

## 14. Settings

### Fitur
Halaman konfigurasi sistem yang mencakup manajemen user dan pengaturan operasional.

**Manajemen User:**
- Tambah user baru dengan role (Admin / User)
- Edit data user (nama, password, permission)
- Aktifkan atau nonaktifkan akun user

**Permission yang bisa dikonfigurasi per user:**
| Permission | Keterangan |
|---|---|
| can_master_data | Akses ke Master Data Sparepart |
| can_admin_mgmt | Akses ke Admin Management |
| can_barang_masuk | Akses ke Barang Masuk |
| can_barang_keluar | Akses ke Barang Keluar |
| can_riwayat | Akses ke Riwayat Transaksi |
| can_electrical_parts | Akses ke Electrical Parts |
| can_email_settings | Akses ke Email Settings |
| can_supplier_data | Akses ke Supplier Data |
| can_master_machine | Akses ke Master Machine |
| can_sparepart_machine | Akses ke Machine Sparepart Mapping |
| can_cost_intelligence | Akses ke Cost Intelligence |
| can_line_mapping | Akses ke Line Compatibility |
| require_approval_keluar | Pengeluaran user ini butuh approval admin |

### Flow — Buat User Baru

```
Admin buka Settings
    └─► Klik "Add User"
        └─► Isi username, nama lengkap, password, role
            └─► Centang permission yang diberikan
                └─► Centang "require_approval_keluar" jika user ini butuh approval
                    └─► Simpan
                        └─► User bisa langsung login dengan akun baru
                            └─► Sidebar menu otomatis disesuaikan dengan permission yang diberikan
```

### Yang Dilakukan Admin
1. Buat akun untuk staf gudang baru
2. Atur permission sesuai jobdesc masing-masing staf
3. Reset password jika ada user yang lupa
4. Nonaktifkan akun user yang sudah tidak bekerja

---

## 15. Email Settings

### Fitur
Konfigurasi sistem notifikasi email otomatis untuk alert stok dan laporan periodik.

**Yang bisa dikonfigurasi:**
- SMTP Server, port, dan enkripsi
- Username dan password email pengirim
- Daftar penerima email (bisa multiple)
- Threshold alert (stok di bawah berapa persen dari safety stock mulai kirim alert)
- Jadwal pengiriman laporan (harian, mingguan)

**Jenis notifikasi:**
- Alert stok menipis — dikirim saat sparepart mendekati atau di bawah safety stock
- Laporan periodik — ringkasan kondisi inventori dikirim ke email atasan secara terjadwal

### Flow

```
Admin buka Email Settings
    └─► Isi konfigurasi SMTP (host, port, username, password)
        └─► Tambahkan email penerima
            └─► Atur threshold dan jadwal
                └─► Test koneksi
                    ├─► [Berhasil] → Simpan konfigurasi
                    └─► [Gagal] → Cek setting SMTP, coba lagi
                        └─► Sistem akan kirim alert otomatis sesuai jadwal yang dikonfigurasi
```

### Yang Dilakukan Admin
1. Konfigurasi awal SMTP saat sistem pertama kali digunakan
2. Tambah/hapus email penerima saat ada perubahan personel
3. Sesuaikan threshold alert sesuai kebijakan perusahaan
4. Aktifkan atau nonaktifkan fitur email

---

## Dampak & Nilai Bisnis

### Dari Sisi Operasional

| Sebelum SMS | Sesudah SMS |
|---|---|
| Pencatatan manual di buku/Excel — rawan hilang dan tidak terupdate real-time | Semua transaksi tercatat otomatis dan bisa diakses kapan saja |
| Stok sering tidak diketahui sampai kehabisan di lapangan | Alert otomatis saat stok mendekati minimum |
| Tidak ada jejak siapa yang ambil sparepart apa dan untuk mesin mana | Setiap pengeluaran tercatat lengkap: PIC, Line, Mesin, Tanggal |
| Laporan biaya membutuhkan rekap manual berhari-hari | Cost per Line dan Cost per Machine tersedia dalam hitungan detik |
| Tidak ada kontrol pengambilan sparepart oleh user | Sistem approval memastikan setiap pengeluaran disetujui admin |

### Dari Sisi Keuangan

- **Visibilitas Biaya Real-time** — Total nilai inventori, biaya pengeluaran per periode, dan biaya per lini/mesin selalu tersedia tanpa perlu rekap manual
- **Pencegahan Pemborosan** — Safety stock formula memastikan stok tidak berlebih (overstock) tapi juga tidak kehabisan (stockout)
- **Tracking Supplier** — Riwayat harga per supplier memudahkan negosiasi dan evaluasi vendor
- **Data untuk Budgeting** — History biaya per lini dan per mesin menjadi dasar penyusunan anggaran sparepart yang akurat

### Dari Sisi Manajemen

- **Laporan Instan** — Atasan bisa request laporan kondisi stok atau biaya kapan saja, data sudah ada di sistem
- **Akuntabilitas** — Setiap transaksi punya jejak digital yang lengkap (siapa, apa, kapan, untuk apa)
- **Pengambilan Keputusan Berbasis Data** — Cost Intelligence menunjukkan lini dan mesin mana yang paling banyak menyerap biaya, membantu prioritisasi maintenance budget
- **Compliance Pengadaan** — Data bidding dan supplier terdokumentasi rapi untuk keperluan audit

### Indikator Keberhasilan

- **Tidak ada lagi stockout mendadak** karena sistem memberi peringatan jauh sebelum stok habis
- **Waktu rekap laporan stok** turun dari berhari-hari menjadi di bawah 5 menit
- **Pengeluaran sparepart tidak sah** tereduksi karena ada mekanisme approval
- **Biaya sparepart per lini** termonitor bulanan sehingga anomali bisa terdeteksi lebih cepat

---

*Dokumen ini dibuat berdasarkan source code aplikasi SMS v4.26.2. Semua fitur yang terdokumentasi di sini sudah diimplementasikan dan bisa dilihat langsung di aplikasi.*
