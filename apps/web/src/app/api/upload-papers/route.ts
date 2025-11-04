/**
 * One-time API endpoint to upload Gayed research papers to Vercel Blob
 *
 * Usage: POST /api/upload-papers
 * This will upload all PDFs from docs/gayed-doc/ to Vercel Blob and return their URLs.
 *
 * After running once, copy the returned URLs into signal-descriptions.ts blobUrl fields.
 * Then you can delete or disable this endpoint for security.
 */

import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs'; // Required for fs access

interface UploadResult {
  fileName: string;
  blobUrl: string;
  size: number;
  success: boolean;
  error?: string;
}

export async function POST() {
  try {
    const results: UploadResult[] = [];

    // Path to papers directory (relative to project root)
    const papersDir = path.join(process.cwd(), '../../docs/gayed-doc');

    // Paper files to upload
    const paperFiles = [
      'SSRN-id2417974.pdf',
      'SSRN-id2431022.pdf',
      'SSRN-id2604248.pdf',
      'SSRN-id2741701.pdf',
      'SSRN-id3718824.pdf'
    ];

    console.log('📚 Starting upload of Gayed research papers to Vercel Blob...');
    console.log(`📂 Reading from: ${papersDir}`);

    for (const fileName of paperFiles) {
      try {
        const filePath = path.join(papersDir, fileName);

        // Read PDF file as buffer
        const fileBuffer = await fs.readFile(filePath);
        const fileSize = fileBuffer.length;

        console.log(`📄 Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

        // Upload to Vercel Blob with public access
        const blob = await put(`research-papers/${fileName}`, fileBuffer, {
          access: 'public',
          contentType: 'application/pdf',
          addRandomSuffix: false // Keep original filename
        });

        results.push({
          fileName,
          blobUrl: blob.url,
          size: fileSize,
          success: true
        });

        console.log(`✅ Uploaded: ${blob.url}`);
      } catch (error) {
        console.error(`❌ Failed to upload ${fileName}:`, error);
        results.push({
          fileName,
          blobUrl: '',
          size: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalSize = results.reduce((sum, r) => sum + r.size, 0);

    console.log(`\n🎉 Upload complete: ${successCount}/${paperFiles.length} files uploaded`);
    console.log(`📊 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    return NextResponse.json({
      success: true,
      message: `Uploaded ${successCount}/${paperFiles.length} papers`,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      results,
      instructions: `
        Copy these URLs into apps/web/src/lib/data/signal-descriptions.ts:

        ${results.filter(r => r.success).map(r => `
        '${r.fileName.replace('SSRN-id', '').replace('.pdf', '')}': {
          ...
          blobUrl: '${r.blobUrl}'
        }`).join(',\n')}
      `
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Upload failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}

// GET endpoint for status/instructions
export async function GET() {
  return NextResponse.json({
    message: 'Upload Papers Endpoint',
    usage: 'Send POST request to upload papers from docs/gayed-doc/ to Vercel Blob',
    instructions: [
      '1. Ensure BLOB_READ_WRITE_TOKEN is set in .env.local',
      '2. Send POST request to /api/upload-papers',
      '3. Copy returned blob URLs into signal-descriptions.ts',
      '4. Delete or disable this endpoint for security'
    ],
    papers: [
      'SSRN-id2417974.pdf',
      'SSRN-id2431022.pdf',
      'SSRN-id2604248.pdf',
      'SSRN-id2741701.pdf',
      'SSRN-id3718824.pdf'
    ]
  });
}
