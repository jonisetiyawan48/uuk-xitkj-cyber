/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  serverExternalPackages: ['mariadb'],
  experimental: { cpus: 2 },
};
export default config;
