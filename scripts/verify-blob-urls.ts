/**
 * Verify Vercel Blob URLs
 *
 * Tests all PDF URLs in signal-descriptions.ts to ensure they're accessible
 *
 * Usage: npx tsx scripts/verify-blob-urls.ts
 */

import { RESEARCH_PAPERS } from '../apps/web/src/lib/data/signal-descriptions';

async function verifyBlobUrls() {
  console.log('🔍 Verifying Vercel Blob URLs...\n');

  let successCount = 0;
  let failCount = 0;

  for (const [id, paper] of Object.entries(RESEARCH_PAPERS)) {
    if (!paper.blobUrl) {
      console.log(`⚠️  ${paper.title}: No URL configured`);
      failCount++;
      continue;
    }

    try {
      const response = await fetch(paper.blobUrl, { method: 'HEAD' });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const sizeMB = contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) : 'unknown';

        console.log(`✅ ${paper.title}`);
        console.log(`   URL: ${paper.blobUrl}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Type: ${contentType}`);
        console.log(`   Size: ${sizeMB} MB\n`);

        successCount++;
      } else {
        console.log(`❌ ${paper.title}`);
        console.log(`   URL: ${paper.blobUrl}`);
        console.log(`   Status: ${response.status} ${response.statusText}\n`);

        failCount++;
      }
    } catch (error) {
      console.log(`❌ ${paper.title}`);
      console.log(`   URL: ${paper.blobUrl}`);
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);

      failCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Results: ${successCount} ✅ | ${failCount} ❌`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failCount > 0) {
    console.log('⚠️  Some PDFs are not accessible. Check:');
    console.log('   1. PDFs are uploaded to Vercel Blob');
    console.log('   2. Blob URLs are correct in signal-descriptions.ts');
    console.log('   3. BLOB_READ_WRITE_TOKEN is configured in .env.local\n');
    process.exit(1);
  } else {
    console.log('🎉 All PDFs are accessible!\n');
    process.exit(0);
  }
}

verifyBlobUrls();
