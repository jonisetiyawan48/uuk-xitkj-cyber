# Dependency audit lab

Snapshot npm registry yang diverifikasi pada **17 November 2026**: **5 temuan (1 low, 1 moderate, 2 high, 1 critical)**. Npm memakai istilah moderate untuk medium. Jumlah ini menghitung paket yang ditandai rentan; satu paket bisa memiliki beberapa advisory/CVE. Jumlah dan severity dapat berubah saat registry memperbarui advisory.

Lima devDependencies sengaja dipin untuk latihan membaca laporan SCA (Software Composition Analysis). Pilihan ini memberi contoh kategori yang umum dipelajari, dengan variasi severity. Tingkat kesulitan di sini mengacu pada memahami laporan dan mencari versi perbaikan, bukan jaminan bahwa seluruh advisory mudah dieksploitasi.

| Paket | Versi lab | Severity npm | Fokus pembelajaran | Contoh advisory |
|---|---|---|---|---|
| cookie | 0.6.0 | low | Validasi karakter nama, path, dan domain cookie | [CVE-2024-47764](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) |
| tough-cookie | 4.1.2 | moderate | Prototype pollution pada penyimpanan cookie | [CVE-2023-26136](https://github.com/advisories/GHSA-72xf-g2v4-qvf3) |
| cross-spawn | 7.0.3 | high | Regular Expression Denial of Service (ReDoS) | [CVE-2024-21538](https://github.com/advisories/GHSA-3xgq-45jj-v275) |
| serialize-javascript | 1.9.0 | high | XSS dan serialisasi JavaScript tidak aman | [CVE-2019-16769](https://github.com/advisories/GHSA-h9rv-jmmf-4pgx) |
| lodash | 4.17.4 | critical | Prototype pollution pada utilitas objek | [CVE-2019-10744](https://github.com/advisories/GHSA-jf85-cpcp-j695) |

Severity pada tabel adalah severity agregat paket dalam hasil npm audit, sehingga bisa berbeda dari severity satu contoh advisory yang ditautkan. Snapshot JSON memuat seluruh advisory tiap paket.

Paket latihan tidak diimpor oleh kode portal dan tidak menambahkan endpoint web. Docker menggunakan `npm ci --omit=dev`, sehingga paket latihan tidak dipasang di image aplikasi. Lima temuan dependency ini terpisah dari lima titik kerentanan web (dua SQLi, dua XSS, satu path traversal).

Jalankan dari direktori proyek:

```bash
npm ci --ignore-scripts
npm audit
# atau npm run audit:lab
npm audit --json
npm run audit:runtime
```

Hasil snapshot:

```text
5 vulnerabilities (1 low, 1 moderate, 2 high, 1 critical)
```

Pada verifikasi ini, `npm run audit:runtime` menghasilkan **0 vulnerabilities**. Exit code 1 dari `npm audit` berarti temuan lab terdeteksi. `npm audit fix` bisa mengubah atau menghapus temuan yang sengaja dipertahankan.

Latihan mudah: catat nama paket, versi terpasang, severity, jenis masalah, dan versi perbaikan yang ditunjukkan audit. Baca advisory yang ditautkan untuk memahami kondisi pemicunya.

Detail lengkap tersedia di [dependency-audit.json](dependency-audit.json).
