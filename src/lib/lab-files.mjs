// Virtual Linux configuration files for the beginner lab. Never read OS files.
export const LINUX_FIXTURES = Object.freeze({
  '/etc/crontab': 'SHELL=/bin/sh\n17 * * * * root echo "dummy training job"',
  '/etc/anacrontab': '1 5 cron.daily echo "dummy daily job"',
  '/etc/shells': '/bin/sh\n/bin/bash',
  '/etc/ssh/ssh_config': 'Host *\n    ForwardAgent no\n    Port 22',
  '/etc/ssh/moduli': '# Dummy moduli fixture; no cryptographic material',
  '/etc/apache2/apache2.conf': 'ServerName moklet-demo.local\nDocumentRoot /var/www/demo',
  '/etc/apache2/.htpasswd': 'demo:$apr1$DEMO$NOT_A_REAL_PASSWORD_HASH',
  '/etc/apache2/envvars': 'export APACHE_RUN_USER=www-data\nexport APACHE_RUN_GROUP=www-data',
  '/etc/apache2/sites-available/default': '<VirtualHost *:80>\n    ServerName moklet-demo.local\n    DocumentRoot /var/www/demo\n</VirtualHost>',
  '/etc/apache2/mods-available/ssl.conf': 'SSLProtocol -all +TLSv1.2 +TLSv1.3',
  '/etc/apache2/mods-available/proxy.conf': 'ProxyRequests Off',
  '/etc/apache2/mods-available/php4.conf': '# Historical PHP4 configuration, dummy fixture only',
  '/etc/mysql/my.cnf': '[client]\nport=3306\n[mysqld]\nbind-address=127.0.0.1\n# No database credentials in this fixture',
  '/etc/mysql/debian-start': '#!/bin/sh\n# Dummy MariaDB maintenance script\necho "training only"',
  '/etc/postgresql/pg_hba.conf': 'local all all peer\nhost all all 127.0.0.1/32 scram-sha-256',
  '/etc/postgresql/pg_ident.conf': '# MAPNAME SYSTEM-USERNAME PG-USERNAME\ndemo_map demo demo',
  '/etc/postgresql/postgresql.env': 'PGPORT=5432\nPGDATABASE=demo_training',
  '/etc/vsftpd.conf': 'anonymous_enable=NO\nlocal_enable=YES\nwrite_enable=NO',
  '/etc/pam.d/vsftpd': '# Dummy PAM configuration\n@include common-auth',
  '/etc/default/proftpd': 'RUN=yes\nOPTIONS=""',
});
export function linuxFixture(filename) {
  const prefix = '../../../../../';
  const target = filename.startsWith(prefix) ? '/'+filename.slice(prefix.length) : filename;
  if (!Object.hasOwn(LINUX_FIXTURES,target)) return null;
  return { path:target, body:`# UUK-LFI-DEMO: ${target}\n# Dummy training fixture, not an operating-system file.\n${LINUX_FIXTURES[target]}\n` };
}
