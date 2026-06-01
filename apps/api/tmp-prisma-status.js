const path = require('path');
const { spawnSync } = require('child_process');
const env = Object.assign({}, process.env, {
  DATABASE_URL: 'postgres://postgres.nztyfbytfizopqfxykss:mrJNLxtMkRFhqnJJ@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true',
});
const prismaPath = path.resolve(__dirname, 'node_modules', '.bin', 'prisma.cmd');
const result = spawnSync(prismaPath, ['migrate', 'status', '--schema', 'prisma/schema.prisma'], {
  env,
  stdio: 'inherit',
});
console.log('EXIT', result.status);
if (result.error) {
  console.error('ERROR', result.error);
  process.exit(1);
}
