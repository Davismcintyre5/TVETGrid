import api from './axios';

export async function me() {
  const res = await api.get('/client/profile');
  return res.data;
}

export async function update(data) {
  const res = await api.patch('/client/profile', data);
  return res.data;
}

export async function signAvatarUpload() {
  const res = await api.post('/client/profile/avatar/sign');
  return res.data;
}

export async function confirmAvatarUpload({ publicId, resourceType = 'image' }) {
  const res = await api.post('/client/profile/avatar/confirm', {
    publicId,
    resourceType,
  });
  return res.data;
}

export async function removeAvatar() {
  const res = await api.delete('/client/profile/avatar');
  return res.data;
}