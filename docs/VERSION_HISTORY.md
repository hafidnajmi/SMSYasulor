# 📋 Riwayat Versi & Catatan Rilis (Version History)
**Sparepart Management System (SMS)**

Dokumen ini mencatat seluruh riwayat versi, pembaruan fitur, perbaikan bug, dan perubahan skema database secara kronologis.

---

## 📌 SMS v8.10.3 (10 August 2026)
### 🚀 Perubahan Versi & Pembaruan Sistem
- **Automated Build Update**: Pembaruan stabilitas dan optimasi aplikasi SMS.
- **Database Sync**: Penyelarasan skema data dan performa query SQL Server.

---

## 📌 SMS v8.10.2 (10 August 2026)
### 🚀 Perubahan Versi & Pembaruan Sistem
- **Automated Build Update**: Pembaruan stabilitas dan optimasi aplikasi SMS.
- **Database Sync**: Penyelarasan skema data dan performa query SQL Server.

---

## 📌 SMS v8.10.1 (10 Agustus 2026)
### 🖥️ Presisi Data Mesin Approval Barang Keluar
- **Machine Code & Name Display**: Mengintegrasikan `LEFT JOIN dbo.Machine_Master` pada `get_pending_barang_keluar()` untuk menampilkan Kode Mesin & Nama Mesin resmi dari Master Machine pada kolom **LINE/MESIN** tabel Approval Barang Keluar (misal: `B24 / MCH-011 (Sealing Machine 11)`).

---

## 📌 SMS v8.7.5 (7 Agustus 2026)
### 🐛 Bug Fixes & Stability Hardening
- **Flet Session Parameter Fix**: Memperbaiki `TypeError` pada `page.session.get` dengan mengoperasikan 1 argumen sesuai standar Flet SessionStorage.
- **Logger Import Fix**: Meng-import dan menginisialisasi modul `get_logger` di `views/main_view.py` untuk menghilangkan `NameError: name 'log' is not defined`.

---

## 📌 SMS v8.7.4 (7 Agustus 2026)
### ⏱️ Dashboard Auto Refresh (5 Menit)
- **Auto Refresh Checkbox**: Menambahkan opsi ceklis **Auto Refresh (5m)** pada topbar menu Dashboard.
- **Background Timer Loop**: Saat diaktifkan, data KPI, status stok, riwayat transaksi, dan grafik biaya otomatis diperbarui dari SQL Server setiap 5 menit (300 detik) sekali.
- **Session Persistence**: Menyimpan status centang auto refresh di dalam sesi pengguna.

---

## 📌 SMS v8.7.0 (7 Agustus 2026)
### ⚡ Performa Navigasi & Asynchronous View Building
- **0ms Instant UI Feedback**: Tombol menu sidebar dan header topbar langsung aktif seketika saat diklik (0ms response).
- **Asynchronous View Loading**: Pembacaan database dan pembuatan komponen visual dipindahkan ke background thread sehingga UI thread Flet tidak pernah ter-block/freeze.
- **Smooth Loading Spinner**: Area konten langsung menampilkan animasi pemuatan mulus (*Memuat data menu...*) menggantikan layar blank abu-abu.
- **Matplotlib Chart Optimization**: Menyesuaikan resolusi grafik ke 100 DPI yang memangkas waktu render 2x-3x lebih cepat.

---

## 📌 SMS v8.6.0 (7 Agustus 2026)
### 🛡️ Keamanan Database & Proteksi Injeksi (ST-013, ST-014, ST-028)
- **ST-013 Filter Whitelist & LIKE Sanitization**: Sanitasi wildcard SQL (`_sanitize_like`) pada filter `line` dan pengunaan `frozenset` immutable.
- **ST-014 Dynamic Identifiers Security**: Validasi whitelist `_ALLOWED_SEQUENCES`, `_ALLOWED_FILTER_COLUMNS`, dan regex guard pada nama constraint DDL.
- **ST-028 Transaction Rollback & Stock Atomicity**: Menjamin transaksi `create_barang_masuk_with_stock` dan `create_barang_keluar_with_stock` aman dengan isolasi `conn.autocommit = False`, `conn.rollback()` pada exception, dan `finally: conn.autocommit = True`.

---

## 📌 SMS v7.31.1 (31 Juli 2026)
### 💰 Sinkronisasi Harga & Audit Master Data
- **Procurement & Bidding Price Tracking**: Mengintegrasikan pembaruan harga dari menu **Admin Management -> Procurement Comparison** dan **Bidding History** langsung ke tabel `Master_Data.current_unit_price`.
- **Audit Update Price**: Otomatis mencatat stempel waktu `last_price_update` (`GETDATE()`), nama pengguna pengubah `last_updated_by`, dan mata uang default `currency = 'IDR'` pada `Master_Data` SQL Server saat harga supplier/bidding diperbarui.
- **Form Master Data Cleanup**: Menghapus field input `Price / Harga Unit` dari modal dialog Add/Edit Sparepart agar manajemen pengisian harga dilakukan terpusat di menu Procurement Comparison.
- **Anti-Spam Guard**: Menambahkan proteksi tombol double-click (`is_saving` lock) pada modal dialog Master Data untuk mencegah duplikasi data akibat klik berulang.
- **Database Cleanup & Backfill**: Menjalankan *backfill* data lama sehingga seluruh baris `dbo.Master_Data` berstatus `currency = 'IDR'`, serta membersihkan record ujicoba.

---

## 📌 SMS v7.30.1 (30 Juli 2026)
### 🔒 Otorisasi Menu & Skema Tabel
- **Individual RBAC Menu Permissions**: Memperbaiki logika penyaringan menu navigasi sidebar (`views/main_view.py`) agar menghormati hak akses individual pengguna (`can_master_data`, `can_barang_masuk`, `can_settings`, dll.) tanpa bypass otomatis untuk role `admin`.
- **Barang Keluar Schema Cleanup**: Menghapus 3 kolom obsolete dari `dbo.Barang_Keluar` (`bin_snapshot`, `failure_reason`, `action_note`) dan menyesuaikan fungsi pengeluaran barang.
- **Barang Masuk Schema Cleanup**: Menghapus 7 kolom obsolete dari `dbo.Barang_Masuk` (`bin_snapshot`, `remark`, `master_id`, `invoice_number`, `purchase_order`, `batch_number`, `lot_number`).

---

## 📌 SMS v7.29.1 (29 Juli 2026)
### 📧 Layout & Fitur Email Settings
- **Email Settings Layout**: Menyempurnakan tata letak 4 tombol pengujian aksi (`Test SMTP Report`, `Test SMTP RFQ`, `Test Kirim Report`, `Simulasi RFQ Draft`) ke dalam 1 baris grid yang simetris dan rapi.
- **Save Configuration Button**: Menempatkan tombol utama **Simpan Pengaturan** secara menonjol di sudut kanan bawah kartu konfigurasi setinggi 42px.
- **Notification Banner**: Memperbaiki status banner notifikasi dengan border dan padding yang presisi untuk menampilkan respons SMTP dan draft RFQ.

---

## 📌 SMS v7.28.1 (28 Juli 2026)
### 🛠️ Self-Learning Machine Line Mapping & Approval Console
- **Line Compatibility Console**: Menambahkan fitur approval & mapping otomatis sparepart terhadap mesin dan line produksi secara real-time.
- **Automated Verification**: Integrasi pencatatan perubahan kompatibilitas sparepart ke Audit Log.
