// Tests always use a dedicated schema, never the portal database from .env.
export async function prepareTestDatabase() {
  const name = process.env.UUK_TEST_DB_NAME || 'moklet_uuk_test';
  if (!/^[a-zA-Z0-9_]+_test$/.test(name)) throw new Error('UUK_TEST_DB_NAME must end with _test');
  Object.assign(process.env, {
    UUK_DB_HOST: process.env.UUK_TEST_DB_HOST || '127.0.0.1',
    UUK_DB_PORT: process.env.UUK_TEST_DB_PORT || '13307',
    UUK_DB_USER: process.env.UUK_TEST_DB_USER || 'moklet',
    UUK_DB_PASSWORD: process.env.UUK_TEST_DB_PASSWORD || 'test-database-password',
    UUK_DB_NAME: name,
  });
  const { reset, closeDatabase } = await import('../src/lib/db.mjs');
  try { await reset(); } finally { await closeDatabase(); }
}
