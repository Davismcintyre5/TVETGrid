const { v2: cloudinary } = require('cloudinary');
const env = require('./env');

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true,
});

function signUpload({ folder, resourceType = 'auto' }) {
  const timestamp = Math.round(Date.now() / 1000);
  const targetFolder = folder || env.cloudinary.folder;

  const params = {
    timestamp,
    folder: targetFolder,
  };

  const signature = cloudinary.utils.api_sign_request(params, env.cloudinary.apiSecret);

  return {
    signature,
    timestamp,
    apiKey: env.cloudinary.apiKey,
    cloudName: env.cloudinary.cloudName,
    folder: targetFolder,
    resourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${resourceType}/upload`,
  };
}

async function deleteAsset(publicId, resourceType = 'image') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}

function signedUrl(publicId, resourceType = 'image', ttlSeconds = 300, format = null) {
  const expiresAt = Math.round(Date.now() / 1000) + ttlSeconds;

  let ext = format;
  if (!ext) {
    const match = String(publicId).match(/\.([a-z0-9]+)$/i);
    if (match) ext = match[1];
  }

  return cloudinary.utils.private_download_url(
    publicId,
    ext || '',
    { expires_at: expiresAt, resource_type: resourceType }
  );
}

module.exports = { cloudinary, signUpload, deleteAsset, signedUrl };