# 🚀 PANDUAN LENGKAP & SIMPEL HOSTING IM DIGITAL (PLUG & PLAY)

Panduan ini ditujukan agar aplikasi **IM Digital Web** dapat di-hosting dengan sangat mudah, baik di **komputer lokal (PC Server Kantor/LAN)** maupun di **Windows Server**.

---

## 📁 Struktur File Utama

| File / Folder | Fungsi |
| :--- | :--- |
| `JALANKAN_PRODUCTION.bat` | **(Direkomendasikan)** Menjalankan aplikasi dalam mode produksi (cepat, ringan, stabil). |
| `JALANKAN_WEB.bat` | Menjalankan aplikasi dalam mode development (dengan hot-reload kode). |
| `HENTIKAN_WEB.bat` | Menghentikan seluruh proses backend dan frontend dengan 1 klik. |
| `SKEMA_DATABASE_IM_DIGITAL.sql` | Skrip pembuatan database dan tabel di SQL Server. |
| `dotnet/` | Source code backend ASP.NET Core 8 Web API (Port 5268). |
| `web-frontend/` | Source code frontend Next.js (Port 3000). |

---

## 🛠️ Prasyarat pada Komputer Server / Hosting

Pastikan komputer yang dijadikan server telah terinstall:
1. **.NET 8 SDK / Runtime** ([Download di sini](https://dotnet.microsoft.com/download/dotnet/8.0))
2. **Node.js LTS (v18 atau v20+)** ([Download di sini](https://nodejs.org))
3. **Microsoft SQL Server** (Bisa SQL Server Express atau Developer)

---

## ⚡ Langkah 1: Persiapan Database (Hanya 1 Kali di Awal)

1. Buka **SQL Server Management Studio (SSMS)** di komputer server.
2. Buka file `SKEMA_DATABASE_IM_DIGITAL.sql` dan klik **Execute** (F5).
3. Database `IM_Database` beserta seluruh tabel dan hak akses default akan otomatis terbuat.
4. Periksa koneksi database di file:
   `dotnet/PPI.IM.WebApi/appsettings.json`
   ```json
   "Database": {
     "Server": "localhost",
     "Database": "IM_Database",
     "TrustedConnection": true,
     "Username": "",
     "Password": "",
     "Timeout": 30
   }
   ```
   * *Jika menggunakan Windows Authentication, biarkan `TrustedConnection: true`.*
   * *Jika menggunakan user `sa`, ubah `TrustedConnection: false`, lalu isi `Username` dan `Password`.*

---

## 🟢 Langkah 2: Menjalankan Aplikasi (1 Klik)

Cukup **dobel-klik** file:
👉 **`JALANKAN_PRODUCTION.bat`**

Sistem akan otomatis:
* Memeriksa dan menginstall dependensi yang diperlukan.
* Melakukan build produksi otomatis.
* Menyalakan backend API di port `5268`.
* Menyalakan frontend web di port `3000`.
* Menampilkan IP komputer server agar komputer lain bisa mengakses.
* Membuka browser secara otomatis.

---

## 🌐 Langkah 3: Mengakses dari Komputer / Laptop Lain (LAN)

Setiap user di jaringan kantor (Wi-Fi / Kabel LAN yang sama) dapat langsung membuka:

```text
http://[IP-KOMPUTER-SERVER]:3000
```
*(Contoh: `http://192.168.1.50:3000`)*

> **Catatan Plug & Play:**
> Frontend sudah dikonfigurasi secara dinamis (**Dynamic Host Detection**). Pengguna dari laptop lain tidak perlu mengkonfigurasi IP backend apa pun, browser mereka akan otomatis terhubung ke IP server tersebut.

---

## 🔒 Langkah 4: Pengaturan Windows Firewall (Jika Komputer Lain Tidak Bisa Buka)

Jika komputer lain tidak bisa membuka alamat web, cukup izinkan port di Windows Firewall server:

1. Buka menu **Start**, ketik **PowerShell**, klik kanan -> **Run as Administrator**.
2. Jalankan perintah berikut:
   ```powershell
   New-NetFirewallRule -DisplayName "IM Digital Web (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "IM Digital API (Port 5268)" -Direction Inbound -LocalPort 5268 -Protocol TCP -Action Allow
   ```
3. Selesai! Port 3000 dan 5268 sekarang terbuka untuk seluruh jaringan lokal.

---

## 🛑 Cara Menghentikan Aplikasi

Jika ingin mematikan server:
👉 Cukup dobel-klik **`HENTIKAN_WEB.bat`**.

---

## 💡 Tips Hosting Otomatis (Auto-Start saat Komputer Dinyalakan)

Jika Anda ingin aplikasi otomatis menyala setiap kali komputer server dinyalakan tanpa perlu klik apa pun:
1. Tekan tombol `Windows + R`, ketik `shell:startup`, lalu tekan **Enter**.
2. Buat **Shortcut** dari file `JALANKAN_PRODUCTION.bat` dan letakkan di dalam folder Startup tersebut.
3. Aplikasi akan otomatis berjalan setiap kali Windows login!
