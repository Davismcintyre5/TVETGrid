import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HiUser,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiPencil,
  HiOutlineCamera,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { Card, Button, Input, Spinner, Badge, Avatar } from '@/components/ui';
import { profileApi, authApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { parseApiError } from '@/utils/parseApiError';
import { isStrongPassword } from '@/utils/validators';
import {
  uploadToCloudinary,
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_FILE_SIZE,
} from '@/utils/upload';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await profileApi.me();
      return res?.data || res;
    },
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const profile = data?.user || user;

  const startEdit = () => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await profileApi.update({
        name: name.trim(),
        phone: phone.trim() || null,
      });
      const updated = res?.data || res;
      setUser(updated);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Avatar upload ──────────────────────────────
  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > AVATAR_MAX_FILE_SIZE) {
      toast.error('Max avatar size is 3 MB');
      return;
    }
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      toast.error('Use a PNG, JPG or WebP image');
      return;
    }

    setUploadingAvatar(true);
    setAvatarProgress(0);

    try {
      const sigRes = await profileApi.signAvatarUpload();
      const sig = sigRes?.data || sigRes;

      if (!sig?.signature || !sig?.uploadUrl) {
        throw new Error('Invalid upload signature');
      }

      const cloud = await uploadToCloudinary(file, sig, (pct) =>
        setAvatarProgress(pct)
      );

      const confirmRes = await profileApi.confirmAvatarUpload({
        publicId: cloud.public_id,
        resourceType: cloud.resource_type || 'image',
      });
      const confirmed = confirmRes?.data || confirmRes;

      if (user) setUser({ ...user, avatarUrl: confirmed.avatarUrl });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.message || 'Avatar upload failed');
    } finally {
      setUploadingAvatar(false);
      setAvatarProgress(0);
    }
  };

  const handleRemoveAvatar = async () => {
    setRemovingAvatar(true);
    try {
      await profileApi.removeAvatar();
      if (user) setUser({ ...user, avatarUrl: null });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Avatar removed');
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setRemovingAvatar(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('All fields required');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      toast.error(
        'New password must be at least 8 characters with a letter and a number'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasAvatar = !!profile?.avatarUrl;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Profile</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Manage your account details
        </p>
      </div>

      {/* Header card with avatar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar
                name={profile?.name}
                src={profile?.avatarUrl}
                size="lg"
                className="w-20 h-20 text-xl"
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {avatarProgress}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--brand-primary)] hover:bg-[var(--sidebar-hover)] disabled:opacity-50"
              >
                <HiOutlineCamera className="w-3.5 h-3.5" />
                {hasAvatar ? 'Change' : 'Upload'}
              </button>

              {hasAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={removingAvatar}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)] disabled:opacity-50"
                >
                  <HiOutlineTrash className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarPick}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-lg font-semibold text-[var(--text-primary)] truncate">
              {profile?.name}
            </p>
            <p className="text-sm text-[var(--text-muted)] truncate">{profile?.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center sm:justify-start">
              <Badge variant="info">{profile?.role || 'student'}</Badge>
              {profile?.emailVerified ? (
                <Badge variant="success" dot>
                  Verified
                </Badge>
              ) : (
                <Badge variant="warning" dot>
                  Not verified
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Personal info */}
      <Card
        title="Personal information"
        actions={
          !editing ? (
            <Button
              size="sm"
              variant="outline"
              icon={<HiPencil className="w-3.5 h-3.5" />}
              onClick={startEdit}
            >
              Edit
            </Button>
          ) : null
        }
      >
        {editing ? (
          <div className="space-y-4">
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={savingProfile}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={saveProfile} loading={savingProfile}>
                Save changes
              </Button>
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <HiUser className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <dt className="text-[var(--text-muted)] w-20">Name</dt>
              <dd className="text-[var(--text-primary)]">{profile?.name}</dd>
            </div>
            <div className="flex items-center gap-3">
              <HiOutlineEnvelope className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <dt className="text-[var(--text-muted)] w-20">Email</dt>
              <dd className="text-[var(--text-primary)] break-all">{profile?.email}</dd>
            </div>
            <div className="flex items-center gap-3">
              <HiOutlinePhone className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <dt className="text-[var(--text-muted)] w-20">Phone</dt>
              <dd className="text-[var(--text-primary)]">
                {profile?.phone || (
                  <span className="text-[var(--text-muted)]">Not set</span>
                )}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      {/* Stats summary */}
      {data?.counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Bookmarks', value: data.counts.bookmarks },
            { label: 'Attempts', value: data.counts.attempts },
            { label: 'Progress', value: data.counts.progress },
            { label: 'AI sessions', value: data.counts.aiSessions },
          ].map((s) => (
            <div
              key={s.label}
              className="p-4 rounded-xl bg-[var(--bg-tertiary)] text-center"
            >
              <p className="text-xl font-bold text-[var(--text-primary)]">{s.value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Change password */}
      <Card title="Change password">
        <div className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="At least 8 characters, include a letter and a number"
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <div className="flex justify-end">
            <Button onClick={savePassword} loading={savingPassword}>
              Update password
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}