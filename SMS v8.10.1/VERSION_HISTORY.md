# 📋 Riwayat Versi & Catatan Rilis (Version History)
**Sparepart Management System (SMS)**

Dokumen ini mencatat seluruh riwayat versi, pembaruan fitur, perbaikan bug, dan perubahan skema database secara kronologis.

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
