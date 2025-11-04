/**
 * Local PDF Serving API
 *
 * Serves Gayed research papers from local docs/gayed-doc/ directory.
 * This provides a reliable fallback when Vercel Blob is unavailable.
 *
 * Usage: GET /api/papers/[filename].pdf
 * Example: /api/papers/An%20Intermarket%20Approach%20to%20Beta%20Rotation.pdf
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs'; // Required for fs access

// Allowed PDF files (security whitelist)
const ALLOWED_FILES = [
  'An Intermarket Approach to Beta Rotation.pdf',
  'An Intermarket Approach to Tactical Risk Rotation.pdf',
  'Lumber Worth Its Weight in Gold.pdf',
  'Leverage for the Long Run.pdf',
  'Actively Using Passive Sectors to Generate Alpha Using the VIX.pdf'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Decode URL-encoded filename
    const decodedFilename = decodeURIComponent(filename);

    // Security: Only allow whitelisted files
    if (!ALLOWED_FILES.includes(decodedFilename)) {
      return NextResponse.json(
        { error: 'File not found or not authorized' },
        { status: 404 }
      );
    }

    // Path to papers directory (from monorepo root)
    const papersDir = path.join(process.cwd(), 'docs/gayed-doc');
    const filePath = path.join(papersDir, decodedFilename);

    // Security: Ensure path doesn't escape docs directory
    const realPath = await fs.realpath(papersDir);
    const targetPath = path.resolve(filePath);

    if (!targetPath.startsWith(realPath)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Read PDF file
    const fileBuffer = await fs.readFile(filePath);

    // Return PDF with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${decodedFilename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    console.error('Error serving PDF:', error);

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
