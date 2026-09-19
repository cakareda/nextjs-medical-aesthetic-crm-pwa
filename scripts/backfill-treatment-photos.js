// One-off backfill: copies legacy Treatment.beforePhotoUrl/afterPhotoUrl into
// the new TreatmentPhoto table so nothing already uploaded is lost.
// Idempotent — safe to re-run (skips a treatment/type pair that already has
// a matching TreatmentPhoto row).
//
// Usage:
//   node scripts/backfill-treatment-photos.js --dry-run
//   node scripts/backfill-treatment-photos.js
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const dryRun = process.argv.includes('--dry-run');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const treatments = await prisma.treatment.findMany({
    where: {
      OR: [{ beforePhotoUrl: { not: null } }, { afterPhotoUrl: { not: null } }],
    },
    select: { id: true, beforePhotoUrl: true, afterPhotoUrl: true, photos: true },
  });

  let created = 0;
  let skipped = 0;

  for (const t of treatments) {
    const candidates = [
      t.beforePhotoUrl ? { url: t.beforePhotoUrl, type: 'BEFORE' } : null,
      t.afterPhotoUrl ? { url: t.afterPhotoUrl, type: 'AFTER' } : null,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const alreadyExists = t.photos.some((p) => p.url === candidate.url && p.type === candidate.type);
      if (alreadyExists) {
        skipped++;
        continue;
      }

      console.log(`${dryRun ? '[dry-run] would create' : 'creating'}: treatment=${t.id} type=${candidate.type} url=${candidate.url}`);
      if (!dryRun) {
        await prisma.treatmentPhoto.create({ data: { treatmentId: t.id, url: candidate.url, type: candidate.type } });
      }
      created++;
    }
  }

  console.log(`\nDone. ${created} ${dryRun ? 'would be created' : 'created'}, ${skipped} already existed (skipped).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
