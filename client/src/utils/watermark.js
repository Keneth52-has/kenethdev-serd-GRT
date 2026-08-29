import { formatDateTime } from './location';

/**
 * Creates a GPS-stamped image using HTML5 Canvas with SERD FOUNDATION branding
 * @param {string|HTMLImageElement} imageSrc - Base64 Data URL or Image element
 * @param {Object} data - Metadata for the stamp
 * @returns {Promise<string>} - Resolves to stamped JPEG base64 Data URL
 */
export async function createGPSStampedImage(imageSrc, data = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const width = img.naturalWidth || img.width || 1280;
        const height = img.naturalHeight || img.height || 960;

        canvas.width = width;
        canvas.height = height;

        // Draw original photo
        ctx.drawImage(img, 0, 0, width, height);

        // Watermark Banner Dimensions
        const bannerHeight = Math.max(165, Math.round(height * 0.23));
        const bannerY = height - bannerHeight;

        // 1. Draw gradient background overlay at the bottom
        const gradient = ctx.createLinearGradient(0, bannerY - 30, 0, height);
        gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
        gradient.addColorStop(0.2, 'rgba(15, 23, 42, 0.90)');
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.98)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, bannerY - 30, width, bannerHeight + 30);

        // 2. Decorative top accent line (Emerald green & Gold)
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, bannerY - 2, width, 4);

        // 3. Official SERD FOUNDATION Badge on the top-left of the banner
        const padX = Math.round(width * 0.035);
        let currentY = bannerY + Math.round(bannerHeight * 0.16);

        // Badge pill
        const badgeText = data.photo_type === 'GROUP'
          ? 'SERD FOUNDATION • GROUP GRT PHOTO'
          : `SERD FOUNDATION • MEMBER ${String(data.member_number || 1).padStart(2, '0')} GRT`;
        ctx.font = `bold ${Math.round(bannerHeight * 0.09)}px "Inter", sans-serif`;
        const badgeWidth = ctx.measureText(badgeText).width + 24;
        const badgeHeight = Math.round(bannerHeight * 0.13);

        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.roundRect(padX, currentY - badgeHeight + 4, badgeWidth, badgeHeight, 6);
        ctx.fill();

        ctx.fillStyle = '#86efac';
        ctx.fillText(badgeText, padX + 12, currentY - 2);

        // GPS live badge on top-right of banner
        const gpsStatus = `GPS ACCURACY: ±${data.gps_accuracy || data.accuracy || 5}m`;
        ctx.font = `600 ${Math.round(bannerHeight * 0.08)}px "Inter", sans-serif`;
        const gpsWidth = ctx.measureText(gpsStatus).width;
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(gpsStatus, width - padX - gpsWidth, currentY - 2);

        currentY += Math.round(bannerHeight * 0.18);

        // Main Title Row: Group Name & Member Name
        const titleFontSize = Math.round(bannerHeight * 0.11);
        ctx.font = `bold ${titleFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = '#ffffff';

        const shgText = `Group: ${data.shg_name || 'SERD Foundation Group'}`;
        ctx.fillText(shgText, padX, currentY);

        if (data.member_name) {
          ctx.fillStyle = '#fde047';
          const memberText = `Member: ${data.member_name} ${data.member_id ? `(${data.member_id})` : ''}`;
          ctx.fillText(memberText, width * 0.52, currentY);
        }

        currentY += Math.round(bannerHeight * 0.16);

        // Row 2: Date & Time, Employee Info
        const metaFontSize = Math.round(bannerHeight * 0.085);
        ctx.font = `500 ${metaFontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#e2e8f0';

        const formattedTime = formatDateTime(data.captured_at || new Date().toISOString());
        ctx.fillText(`🕒 ${formattedTime}`, padX, currentY);

        const empText = `Officer: ${data.employee_name || 'Field Officer'} [${data.employee_id || 'EMP'}]`;
        ctx.fillText(`👮 ${empText}`, width * 0.52, currentY);

        currentY += Math.round(bannerHeight * 0.16);

        // Row 3: GPS Coordinates & Accuracy
        const lat = Number(data.latitude || 0).toFixed(6);
        const lon = Number(data.longitude || 0).toFixed(6);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`🌐 Lat: ${lat}°  Long: ${lon}°`, padX, currentY);

        // Row 4: Village / Location Address
        currentY += Math.round(bannerHeight * 0.15);
        ctx.fillStyle = '#94a3b8';
        ctx.font = `400 ${Math.round(bannerHeight * 0.075)}px "Inter", sans-serif`;
        const locationText = data.address || `${data.village || ''}, ${data.taluk || ''}, ${data.district || ''}`.trim() || 'Location captured via GPS';
        ctx.fillText(`📍 ${locationText}`, padX, currentY, width - (padX * 2));

        const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
        resolve(stampedDataUrl);
      } catch (err) {
        console.error('Error stamping photo:', err);
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(new Error('Failed to load image for watermarking'));
    };

    if (typeof imageSrc === 'string') {
      img.src = imageSrc;
    } else if (imageSrc instanceof HTMLImageElement) {
      img.src = imageSrc.src;
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}
