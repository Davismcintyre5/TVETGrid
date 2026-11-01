const { cloudinary, signUpload, deleteAsset, signedUrl } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

async function sign({ folder, resourceType = 'auto' }) {
  try {
    return signUpload({ folder, resourceType });
  } catch (err) {
    logger.error('uploadService.sign failed', { err: err.message });
    throw ApiError.internal('Could not sign upload', 'UPLOAD_SIGN_FAILED');
  }
}

async function confirm({ publicId, resourceType = 'image', meta = {} }) {
  if (!publicId) throw ApiError.badRequest('publicId required', 'VALIDATION_001');
  try {
    const asset = await cloudinary.api.resource(publicId, { resource_type: resourceType });
    return {
      publicId: asset.public_id,
      url: asset.secure_url,
      format: asset.format,
      bytes: asset.bytes,
      duration: asset.duration || null,
      resourceType,
      ...meta,
    };
  } catch (err) {
    logger.warn('uploadService.confirm asset missing', { publicId, err: err.message });
    throw ApiError.notFound('Uploaded asset not found on Cloudinary', 'UPLOAD_NOT_FOUND');
  }
}

async function remove({ publicId, resourceType = 'image' }) {
  if (!publicId) return { success: false, reason: 'no-publicId' };
  try {
    const res = await deleteAsset(publicId, resourceType);
    return { success: true, result: res.result };
  } catch (err) {
    logger.error('uploadService.remove failed', { publicId, err: err.message });
    return { success: false, error: err.message };
  }
}

function downloadUrl({ publicId, resourceType = 'raw', ttlSeconds = 300 }) {
  if (!publicId) throw ApiError.badRequest('publicId required', 'VALIDATION_001');
  return signedUrl(publicId, resourceType, ttlSeconds);
}

module.exports = { sign, confirm, remove, downloadUrl };