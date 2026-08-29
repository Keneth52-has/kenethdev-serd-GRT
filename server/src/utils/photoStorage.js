const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Saves a base64 image data URL to the uploads directory
 * @param {string} dataUrl - e.g. "data:image/jpeg;base64,..."
 * @param {string} prefix - e.g. "stamped_member" or "orig_group"
 * @returns {string} - public URL path e.g. "/uploads/stamped_member_1693214812_abc123.jpg"
 */
function saveBase64Image(dataUrl, prefix = 'photo') {
  if (!dataUrl) return null;
  
  // If it's already a URL path, return as is
  if (dataUrl.startsWith('/uploads/') || dataUrl.startsWith('http')) {
    return dataUrl;
  }

  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }

  const extension = matches[1].split('/')[1] || 'jpg';
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extension === 'jpeg' ? 'jpg' : extension}`;
  const filePath = path.join(uploadsDir, filename);

  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}

module.exports = {
  uploadsDir,
  saveBase64Image
};
