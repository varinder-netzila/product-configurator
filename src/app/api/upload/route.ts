import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const incomingForm = await request.formData();
    const file = incomingForm.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only images and PDFs are allowed.'
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 10MB.'
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const fileExtension = file.name.split('.').pop();
    const fileName = `design-${timestamp}-${randomString}.${fileExtension}`;

    // Upload directly via ImageKit REST API
    const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
    const auth = Buffer.from(`${privateKey}:`).toString('base64');

    const uploadForm = new FormData();
    uploadForm.append('file', buffer.toString('base64'));
    uploadForm.append('fileName', fileName);
    uploadForm.append('folder', '/bottle-designs/');

    const ikRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}` },
      body: uploadForm,
    });

    if (!ikRes.ok) {
      const errText = await ikRes.text();
      console.error('ImageKit upload failed:', errText);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const ikData = await ikRes.json();

    return NextResponse.json({
      success: true,
      url: ikData.url,
      fileId: ikData.fileId,
      fileName: fileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
