// WARNING: the seed file empties the tables first, so only use it in development.
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const SEEDS_DIR = path.join(__dirname, '..', '..', 'database', 'seeds');

async function seed() {
  const files = fs
    .readdirSync(SEEDS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    await pool.query(fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8'));
    console.log(`seeded   ${file}`);
  }
}

seed()
  .catch((error) => {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
