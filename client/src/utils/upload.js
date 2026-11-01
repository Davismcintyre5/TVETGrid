export async function uploadToCloudinary(file, signature, onProgress) {
  const { uploadUrl, apiKey, timestamp, signature: sig, folder, uploadPreset } = signature;

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', sig);
  form.append('folder', folder);
  if (uploadPreset) form.append('upload_preset', uploadPreset);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

    if (onProgress) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          onProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response from Cloudinary'));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.error?.message) msg = `${msg}: ${body.error.message}`;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(form);
  });
}

// Avatar constraints
export const AVATAR_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const AVATAR_MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB