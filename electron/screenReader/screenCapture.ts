import { desktopCapturer, screen } from 'electron';
import type { RegionRect } from './regionOverlay';

/**
 * Captures and crops a region of the primary display with DPI scaling compensation.
 * Returns base64-encoded PNG image data.
 */
export async function captureRegion(rect: RegionRect): Promise<string> {
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor || 1;
  const { width: screenWidth, height: screenHeight } = primaryDisplay.size;

  const thumbnailSize = {
    width: Math.max(1, Math.round(screenWidth * scaleFactor)),
    height: Math.max(1, Math.round(screenHeight * scaleFactor)),
  };

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize,
  });

  if (!sources || sources.length === 0) {
    throw new Error('Không thể tìm thấy nguồn màn hình để chụp.');
  }

  // Find the primary screen source or fall back to the first available screen
  const primarySource =
    sources.find(s => s.display_id === String(primaryDisplay.id)) || sources[0];

  if (!primarySource || !primarySource.thumbnail) {
    throw new Error('Không thể chụp hình ảnh màn hình.');
  }

  // Scale rectangle coordinates to physical pixels
  const cropRect = {
    x: Math.round(rect.x * scaleFactor),
    y: Math.round(rect.y * scaleFactor),
    width: Math.round(rect.width * scaleFactor),
    height: Math.round(rect.height * scaleFactor),
  };

  const imgSize = primarySource.thumbnail.getSize();

  // Clamp within thumbnail bounds to prevent invalid crop
  const clampedRect = {
    x: Math.max(0, Math.min(cropRect.x, imgSize.width - 1)),
    y: Math.max(0, Math.min(cropRect.y, imgSize.height - 1)),
    width: Math.min(cropRect.width, Math.max(1, imgSize.width - Math.max(0, cropRect.x))),
    height: Math.min(cropRect.height, Math.max(1, imgSize.height - Math.max(0, cropRect.y))),
  };

  if (clampedRect.width <= 0 || clampedRect.height <= 0) {
    throw new Error('Vùng chọn không hợp lệ hoặc nằm ngoài phạm vi màn hình.');
  }

  const cropped = primarySource.thumbnail.crop(clampedRect);
  const pngBuffer = cropped.toPNG();

  if (!pngBuffer || pngBuffer.length === 0) {
    throw new Error('Hình ảnh cắt được rỗng hoặc bị lỗi đồ họa.');
  }

  return pngBuffer.toString('base64');
}
