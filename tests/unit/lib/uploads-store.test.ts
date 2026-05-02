import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  resolveUploadImagePath,
  uploadPathToImageUrl,
  UPLOADS_DIR,
} from '@/lib/uploads-store';

describe('uploadPathToImageUrl', () => {
  it('converts an uploaded image path to an API URL', () => {
    const imagePath = path.join(UPLOADS_DIR, 'ws-1', 'tab-1', 'image name.png');

    expect(uploadPathToImageUrl(imagePath)).toBe('/api/uploads/ws-1/tab-1/image%20name.png');
  });

  it('rejects paths outside the uploads directory', () => {
    expect(uploadPathToImageUrl('/tmp/image.png')).toBeNull();
  });

  it('rejects non-image uploads', () => {
    const filePath = path.join(UPLOADS_DIR, 'ws-1', 'tab-1', 'notes.txt');

    expect(uploadPathToImageUrl(filePath)).toBeNull();
  });
});

describe('resolveUploadImagePath', () => {
  it('resolves safe upload URL segments', () => {
    const expected = path.join(UPLOADS_DIR, 'ws-1', 'tab-1', 'image.png');

    expect(resolveUploadImagePath(['ws-1', 'tab-1', 'image.png'])).toBe(expected);
  });

  it('rejects traversal segments', () => {
    expect(resolveUploadImagePath(['ws-1', '..', 'image.png'])).toBeNull();
  });

  it('rejects non-image segments', () => {
    expect(resolveUploadImagePath(['ws-1', 'tab-1', 'notes.txt'])).toBeNull();
  });
});
