import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from 'livekit-client';
import {
  HiMicrophone,
  HiVideoCamera,
  HiVideoCameraSlash,
  HiOutlineMicrophone,
  HiPhoneXMark,
  HiUsers,
  HiChatBubbleLeftRight,
  HiFaceSmile,
  HiHandRaised,
  HiPlay,
  HiXMark,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Button, Spinner, Modal } from '@/components/ui';
import { meetingsApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSocket } from '@/context/SocketContext';
import { parseApiError } from '@/utils/parseApiError';
import ParticipantTile from '@/components/meetings/ParticipantTile';
import ChatPanel from '@/components/meetings/ChatPanel';
import ReactionsPanel from '@/components/meetings/ReactionsPanel';
import ParticipantsPanel from '@/components/meetings/ParticipantsPanel';

export default function MeetingRoom() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getMeetingSocket } = useSocket();

  const isGuest = searchParams.get('guest') === '1';

  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [settings, setSettings] = useState({});
  const [micEnabled, setMicEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [speakingIdentities, setSpeakingIdentities] = useState(new Set());
  const [raisedHands, setRaisedHands] = useState(new Set());
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [avatarMap, setAvatarMap] = useState({});
  const [error, setError] = useState('');
  const [waitingForHost, setWaitingForHost] = useState(false);
  const [starting, setStarting] = useState(true);
  const [ending, setEnding] = useState(false);
  const [endingOpen, setEndingOpen] = useState(false);
  const [sidePanel, setSidePanel] = useState(null);
  const [guestData, setGuestData] = useState(null);
  const [meetingTitle, setMeetingTitle] = useState('Meeting');
  const [meetingStatus, setMeetingStatus] = useState(null);
  const [socketJoined, setSocketJoined] = useState(false);
  const [hostUnmutedMe, setHostUnmutedMe] = useState(false);

  const localVideoRef = useRef(null);
  const audioTrackRef = useRef(null);
  const videoTrackRef = useRef(null);
  const isHostRef = useRef(false);
  const hostIdentityRef = useRef(null);

  const displayName = user?.name || guestData?.displayName || 'Guest';
  const myAvatarUrl = user?.avatarUrl || null;
  const myUserId = user?.id || user?._id;

  // ─── Guest credentials ───────────────────────────
  useEffect(() => {
    if (!isGuest) return;
    const stored = sessionStorage.getItem(`guestJoin:${id}`);
    if (!stored) {
      setError('Join session expired. Please re-open your invite link.');
      setStarting(false);
      return;
    }
    try {
      const data = JSON.parse(stored);
      setGuestData(data);
      setMeetingTitle(data.meetingTitle || 'Meeting');
      setMeetingStatus('live');
      setWaitingForHost(true);
      setStarting(false);
    } catch {
      setError('Invalid join data. Please re-open your invite link.');
      setStarting(false);
    }
  }, [id, isGuest]);

  // ─── Fetch meeting ───────────────────────────────
  const meetingQuery = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      const res = await meetingsApi.get(id);
      return res?.data || res;
    },
    enabled: !!id && !isGuest && /^[a-f0-9]{24}$/i.test(id),
    retry: 0,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const meeting = isGuest
    ? guestData
      ? { _id: id, title: guestData.meetingTitle || 'Meeting', status: 'live' }
      : null
    : meetingQuery.data;

  useEffect(() => {
    if (meeting?.title && !isGuest) setMeetingTitle(meeting.title);
    if (meeting?.status) setMeetingStatus(meeting.status);
    if (meeting?.host?._id) {
      hostIdentityRef.current = String(meeting.host._id);
    }
    if (meeting?.settings) setSettings(meeting.settings);
  }, [meeting?.title, meeting?.status, meeting?.host?._id, meeting?.settings, isGuest]);

  const isHostByMeeting =
    !isGuest &&
    meeting &&
    user &&
    String(meeting.host?._id || meeting.hostId) === String(myUserId);

  // ─── Participants (list API) — refetch on events ─
  const participantsQuery = useQuery({
    queryKey: ['meeting', id, 'participants'],
    queryFn: async () => {
      const res = await meetingsApi.listParticipants(id);
      return res?.data || res || [];
    },
    enabled: !!id && !isGuest && socketJoined,
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Build avatarMap whenever participantsQuery data changes
  useEffect(() => {
    const list = participantsQuery.data || [];
    const map = {};
    list.forEach((p) => {
      if (p.userId && p.avatarUrl) map[String(p.userId)] = p.avatarUrl;
    });
    setAvatarMap(map);
  }, [participantsQuery.data]);

  // ─── Socket setup ────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const socket = getMeetingSocket();
    if (!socket) return;

    let cancelled = false;

    const attemptJoin = (retries = 6) => {
      if (cancelled) return;
      if (!socket.connected) {
        if (retries <= 0) return;
        setTimeout(() => attemptJoin(retries - 1), 400);
        return;
      }
      socket.emit('meeting:join', { meetingId: id }, (response) => {
        if (cancelled) return;
        if (response?.ok) {
          setSocketJoined(true);
        } else if (retries > 0) {
          setTimeout(() => attemptJoin(retries - 1), 400);
        }
      });
    };

    attemptJoin();

    const onConnect = () => {
      setSocketJoined(false);
      attemptJoin();
    };

    socket.on('connect', onConnect);

    // ─── Refresh helpers ───────────────────────────
    const refreshParticipants = () => {
      queryClient.invalidateQueries({
        queryKey: ['meeting', id, 'participants'],
      });
    };
    const refreshMeeting = () => {
      if (!isGuest) {
        queryClient.invalidateQueries({ queryKey: ['meeting', id] });
      }
    };

    // ─── Meeting lifecycle ─────────────────────────
    const onStarted = () => {
      setWaitingForHost(false);
      setMeetingStatus('live');
      toast.success('Meeting started');
      refreshMeeting();
      refreshParticipants();
    };
    const onEnded = () => {
      toast.info('Meeting ended by host');
      if (room) room.disconnect();
      navigate(isGuest ? '/' : '/meetings');
    };
    const onCancelled = () => {
      toast.info('Meeting cancelled');
      if (room) room.disconnect();
      navigate(isGuest ? '/' : '/meetings');
    };

    // ─── Participants join/leave ───────────────────
    const onParticipantJoined = () => {
      refreshParticipants();
    };
    const onParticipantLeft = () => {
      refreshParticipants();
    };
    const onParticipantRemoved = ({ userId }) => {
      if (String(userId) === String(myUserId)) {
        toast.error('You were removed from this meeting');
        if (room) room.disconnect();
        navigate(isGuest ? '/' : '/meetings');
      } else {
        refreshParticipants();
      }
    };

    // ─── Settings ──────────────────────────────────
    const onSettingsUpdate = ({ settings: s, action }) => {
      setSettings(s || {});
      if (action === 'unmuteAll') setHostUnmutedMe(false);
      refreshParticipants();
    };

    // ─── Hand raise ────────────────────────────────
    const onHandUpdate = ({ userId, raised }) => {
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (raised) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    // ─── Host mute/unmute specific user ────────────
    const onHostMute = ({ userId }) => {
      if (String(userId) !== String(myUserId)) return;
      if (audioTrackRef.current && room) {
        (async () => {
          try {
            await room.localParticipant.unpublishTrack(audioTrackRef.current);
            audioTrackRef.current.stop();
            audioTrackRef.current = null;
            setMicEnabled(false);
            setHostUnmutedMe(false);
            toast.info('The host muted you');
            refreshParticipants();
          } catch {
            /* ignore */
          }
        })();
      }
    };

    const onHostUnmute = ({ userId }) => {
      if (String(userId) !== String(myUserId)) return;
      setHostUnmutedMe(true);
      if (!micEnabled && room) {
        (async () => {
          try {
            const audio = await createLocalAudioTrack();
            await room.localParticipant.publishTrack(audio);
            audioTrackRef.current = audio;
            setMicEnabled(true);
            toast.success('The host unmuted you');
            refreshParticipants();
          } catch {
            /* ignore */
          }
        })();
      }
    };

    const onHostMuteAll = () => {
      if (isHost) return;
      if (audioTrackRef.current && room) {
        (async () => {
          try {
            await room.localParticipant.unpublishTrack(audioTrackRef.current);
            audioTrackRef.current.stop();
            audioTrackRef.current = null;
            setMicEnabled(false);
            setHostUnmutedMe(false);
            toast.info('The host muted everyone');
            refreshParticipants();
          } catch {
            /* ignore */
          }
        })();
      }
    };

    const onHostUnmuteAll = () => {
      if (isHost) return;
      setHostUnmutedMe(true);
      if (!micEnabled && room) {
        (async () => {
          try {
            const audio = await createLocalAudioTrack();
            await room.localParticipant.publishTrack(audio);
            audioTrackRef.current = audio;
            setMicEnabled(true);
            toast.success('The host unmuted everyone');
            refreshParticipants();
          } catch {
            /* ignore */
          }
        })();
      }
    };

    socket.on('meeting:started', onStarted);
    socket.on('meeting:ended', onEnded);
    socket.on('meeting:cancelled', onCancelled);
    socket.on('participant:joined', onParticipantJoined);
    socket.on('participant:left', onParticipantLeft);
    socket.on('participant:removed', onParticipantRemoved);
    socket.on('settings:update', onSettingsUpdate);
    socket.on('hand:update', onHandUpdate);
    socket.on('host:mute', onHostMute);
    socket.on('host:unmute', onHostUnmute);
    socket.on('host:mute-all', onHostMuteAll);
    socket.on('host:unmute-all', onHostUnmuteAll);

    return () => {
      cancelled = true;
      socket.off('connect', onConnect);
      socket.off('meeting:started', onStarted);
      socket.off('meeting:ended', onEnded);
      socket.off('meeting:cancelled', onCancelled);
      socket.off('participant:joined', onParticipantJoined);
      socket.off('participant:left', onParticipantLeft);
      socket.off('participant:removed', onParticipantRemoved);
      socket.off('settings:update', onSettingsUpdate);
      socket.off('hand:update', onHandUpdate);
      socket.off('host:mute', onHostMute);
      socket.off('host:unmute', onHostUnmute);
      socket.off('host:mute-all', onHostMuteAll);
      socket.off('host:unmute-all', onHostUnmuteAll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, getMeetingSocket, isGuest, myUserId]);

  // ─── LiveKit connect ─────────────────────────────
  useEffect(() => {
    if (!meeting) return;

    if (!isGuest && meeting.status === 'ended') {
      toast.info('This meeting has ended');
      navigate('/meetings');
      return;
    }

    if (waitingForHost) return;

    let cancelled = false;
    let lkRoom;

    (async () => {
      try {
        setStarting(true);
        setError('');

        let joinData;
        if (isGuest) {
          if (!guestData) return;
          joinData = {
            token: guestData.token,
            url: guestData.url,
            roomName: guestData.roomName,
            settings: {},
            participant: {
              isHost: false,
              isMutedByHost: false,
              isVideoBlockedByHost: false,
            },
          };
        } else {
          try {
            const res = await meetingsApi.join(id);
            joinData = res?.data || res;
          } catch (err) {
            const code = err?.code;
            const message = err?.message || '';
            const isNotStarted =
              code === 'MEETING_NOT_STARTED' ||
              /not started|start meeting/i.test(message);

            if (isNotStarted) {
              setWaitingForHost(true);
              setStarting(false);
              return;
            }
            if (code === 'REMOVED_FROM_MEETING') {
              setError('You were removed from this meeting');
              setStarting(false);
              return;
            }
            if (code === 'MEETING_ENDED') {
              toast.info('Meeting has ended');
              navigate('/meetings');
              return;
            }
            if (code === 'MEETING_CANCELLED') {
              toast.info('Meeting was cancelled');
              navigate('/meetings');
              return;
            }
            if (code === 'MEETING_LOCKED') {
              setError('Meeting is locked by the host');
              setStarting(false);
              return;
            }
            throw err;
          }
        }

        if (!joinData?.token || !joinData?.url) {
          throw new Error('Invalid join credentials');
        }

        lkRoom = new Room({ adaptiveStream: true, dynacast: true });

        lkRoom
          .on(RoomEvent.ParticipantConnected, () => {
            refreshParticipantsLocal(lkRoom);
            queryClient.invalidateQueries({
              queryKey: ['meeting', id, 'participants'],
            });
          })
          .on(RoomEvent.ParticipantDisconnected, () => {
            refreshParticipantsLocal(lkRoom);
            queryClient.invalidateQueries({
              queryKey: ['meeting', id, 'participants'],
            });
          })
          .on(RoomEvent.TrackSubscribed, () => refreshParticipantsLocal(lkRoom))
          .on(RoomEvent.TrackUnsubscribed, () => refreshParticipantsLocal(lkRoom))
          .on(RoomEvent.LocalTrackPublished, () => refreshParticipantsLocal(lkRoom))
          .on(RoomEvent.LocalTrackUnpublished, () => refreshParticipantsLocal(lkRoom))
          .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
            setSpeakingIdentities(new Set(speakers.map((s) => s.identity)));
          })
          .on(RoomEvent.Disconnected, () => {
            if (!cancelled) navigate(isGuest ? '/' : '/meetings');
          });

        await lkRoom.connect(joinData.url, joinData.token);
        if (cancelled) {
          lkRoom.disconnect();
          return;
        }

        const hostFlag = isGuest ? false : !!joinData.participant?.isHost;
        isHostRef.current = hostFlag;
        if (hostFlag) {
          hostIdentityRef.current = String(lkRoom.localParticipant.identity);
        }
        if (!isGuest && joinData.meeting?.hostId) {
          hostIdentityRef.current = String(joinData.meeting.hostId);
        }

        setRoom(lkRoom);
        setIsHost(hostFlag);
        setSettings(joinData.settings || {});

        const hostMuted = isGuest ? false : !!joinData.participant?.isMutedByHost;
        if (!hostMuted) {
          try {
            const audio = await createLocalAudioTrack();
            await lkRoom.localParticipant.publishTrack(audio);
            audioTrackRef.current = audio;
            setMicEnabled(true);
          } catch {
            toast.error('Microphone permission denied');
          }
        }

        refreshParticipantsLocal(lkRoom);
        setStarting(false);

        // Immediate + delayed participant refresh after connect
        queryClient.invalidateQueries({
          queryKey: ['meeting', id, 'participants'],
        });
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ['meeting', id, 'participants'],
          });
        }, 800);
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ['meeting', id, 'participants'],
          });
        }, 2500);
      } catch (err) {
        if (!cancelled) {
          setError(parseApiError(err).message || 'Could not join meeting');
          setStarting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (audioTrackRef.current) {
        audioTrackRef.current.stop();
        audioTrackRef.current = null;
      }
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
        videoTrackRef.current = null;
      }
      if (lkRoom) lkRoom.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting?._id, guestData, waitingForHost]);

  // ─── Build local participant list from LiveKit ───
  function refreshParticipantsLocal(r) {
    if (!r) return;
    const list = [];

    const local = r.localParticipant;
    if (local) {
      const localVideoPubs = local.videoTrackPublications
        ? Array.from(local.videoTrackPublications.values())
        : [];
      const localAudioPubs = local.audioTrackPublications
        ? Array.from(local.audioTrackPublications.values())
        : [];

      const localVideoTrack = localVideoPubs.find(
        (pub) => pub.track && pub.kind === Track.Kind.Video
      )?.track;
      const hasLocalAudio = localAudioPubs.some(
        (pub) => pub.track && pub.kind === Track.Kind.Audio
      );

      list.push({
        identity: local.identity,
        name: local.name || local.identity || 'You',
        isLocal: true,
        isHost: isHostRef.current,
        hasVideo: !!localVideoTrack,
        hasAudio: hasLocalAudio,
        videoTrack: localVideoTrack || null,
      });
    }

    if (r.remoteParticipants) {
      for (const p of r.remoteParticipants.values()) {
        const videoPubs = p.videoTrackPublications
          ? Array.from(p.videoTrackPublications.values())
          : [];
        const audioPubs = p.audioTrackPublications
          ? Array.from(p.audioTrackPublications.values())
          : [];

        const videoTrack = videoPubs.find(
          (pub) => pub.track && pub.kind === Track.Kind.Video
        )?.track;
        const hasAudio = audioPubs.some(
          (pub) => pub.track && pub.kind === Track.Kind.Audio
        );

        list.push({
          identity: p.identity,
          name: p.name || p.identity,
          isLocal: false,
          isHost: hostIdentityRef.current && p.identity === hostIdentityRef.current,
          hasVideo: !!videoTrack,
          hasAudio,
          videoTrack: videoTrack || null,
        });
      }
    }

    const sorted = [...list].sort((a, b) => {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      return 0;
    });

    setParticipants(sorted);
  }

  // ─── Local controls ──────────────────────────────
  const toggleMic = async () => {
    if (!room) return;
    if (!isHost && settings.muteAll && !hostUnmutedMe) {
      toast.error('The host has muted all participants');
      return;
    }
    try {
      if (micEnabled) {
        if (audioTrackRef.current) {
          await room.localParticipant.unpublishTrack(audioTrackRef.current);
          audioTrackRef.current.stop();
          audioTrackRef.current = null;
        }
        setMicEnabled(false);
      } else {
        const audio = await createLocalAudioTrack();
        await room.localParticipant.publishTrack(audio);
        audioTrackRef.current = audio;
        setMicEnabled(true);
      }
      refreshParticipantsLocal(room);
    } catch {
      toast.error('Could not toggle microphone');
    }
  };

  const toggleVideo = async () => {
    if (!room) return;
    if (!isHost && settings.videoOffAll) {
      toast.error('The host has disabled all videos');
      return;
    }
    try {
      if (videoEnabled) {
        if (videoTrackRef.current) {
          await room.localParticipant.unpublishTrack(videoTrackRef.current);
          videoTrackRef.current.stop();
          videoTrackRef.current = null;
        }
        setVideoEnabled(false);
      } else {
        const video = await createLocalVideoTrack();
        await room.localParticipant.publishTrack(video);
        videoTrackRef.current = video;
        if (localVideoRef.current) video.attach(localVideoRef.current);
        setVideoEnabled(true);
      }
      refreshParticipantsLocal(room);
    } catch {
      toast.error('Could not toggle camera');
    }
  };

  const toggleHand = () => {
    const socket = getMeetingSocket();
    if (!socket) return;
    const next = !myHandRaised;
    setMyHandRaised(next);
    socket.emit('hand:raise', { meetingId: id, raised: next });
    if (next) toast.success('Hand raised');
    else toast.info('Hand lowered');
  };

  const leaveMeeting = async () => {
    try {
      if (!isGuest) await meetingsApi.leave(id);
    } catch {
      /* ignore */
    }
    if (room) room.disconnect();
    if (isGuest) sessionStorage.removeItem(`guestJoin:${id}`);
    navigate(isGuest ? '/' : '/meetings');
  };

  const hostToggleSetting = async (key) => {
    if (!isHost) return;
    const next = { ...settings, [key]: !settings[key] };
    try {
      const res = await meetingsApi.updateSettings(id, { [key]: next[key] });
      const updated = res?.data || res;
      setSettings(updated);
      toast.success('Setting updated');
      queryClient.invalidateQueries({
        queryKey: ['meeting', id, 'participants'],
      });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  const handleStartNow = async () => {
    try {
      await meetingsApi.start(id);
      setWaitingForHost(false);
      setMeetingStatus('live');
      toast.success('Meeting started');
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
      queryClient.invalidateQueries({
        queryKey: ['meeting', id, 'participants'],
      });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  const handleEndMeeting = async () => {
    setEnding(true);
    try {
      await meetingsApi.end(id);
      toast.success('Meeting ended');
      if (room) room.disconnect();
      navigate('/meetings');
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setEnding(false);
      setEndingOpen(false);
    }
  };

  const handleMuteParticipant = async (userId) => {
    try {
      await meetingsApi.muteParticipant(id, userId);
      toast.success('User muted');
      queryClient.invalidateQueries({
        queryKey: ['meeting', id, 'participants'],
      });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  const handleUnmuteParticipant = async (userId) => {
    try {
      await meetingsApi.unmuteParticipant(id, userId);
      toast.success('User unmuted');
      queryClient.invalidateQueries({
        queryKey: ['meeting', id, 'participants'],
      });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  const handleUnmuteAll = async () => {
    try {
      await meetingsApi.unmuteAll(id);
      toast.success('All unmuted');
      queryClient.invalidateQueries({
        queryKey: ['meeting', id, 'participants'],
      });
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  // ─── States ──────────────────────────────────────
  if (starting && !waitingForHost) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-[var(--text-muted)]">Joining meeting...</p>
      </div>
    );
  }

  if (waitingForHost) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-tertiary)] text-[var(--brand-primary)] mb-4">
          <HiPlay className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          {isHostByMeeting ? 'Ready to start?' : 'Waiting for host'}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {isHostByMeeting
            ? 'Click "Start meeting" when you\'re ready to let participants in.'
            : "The meeting hasn't started yet. You'll join automatically when the host starts."}
        </p>

        {isHostByMeeting ? (
          <Button
            variant="primary"
            size="lg"
            onClick={handleStartNow}
            icon={<HiPlay className="w-5 h-5" />}
          >
            Start meeting
          </Button>
        ) : (
          <Spinner />
        )}

        <div className="mt-8">
          <Button variant="outline" onClick={() => navigate('/meetings')}>
            {isHostByMeeting ? 'Back to meetings' : 'Cancel'}
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <HiOutlineExclamationTriangle className="w-10 h-10 mx-auto text-[var(--danger-text)] mb-3" />
        <p className="text-sm text-[var(--danger-text)] mb-4">{error}</p>
        <Button to={isGuest ? '/' : '/meetings'} variant="outline">
          {isGuest ? 'Back to home' : 'Back to meetings'}
        </Button>
      </div>
    );
  }

  if (!isGuest && meetingQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isGuest && (meetingQuery.isError || !meeting)) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <HiOutlineExclamationTriangle className="w-10 h-10 mx-auto text-[var(--danger-text)] mb-3" />
        <p className="text-sm text-[var(--danger-text)] mb-4">Meeting not found</p>
        <Button to="/meetings" variant="outline">Back to meetings</Button>
      </div>
    );
  }

  const isLive = meetingStatus === 'live';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">
            {meetingTitle}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
            {isHost && ' · You are the host'}
            {isGuest && ' · Guest'}
          </p>
        </div>

        {isHost && isLive && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={settings.muteAll ? 'danger' : 'outline'}
              onClick={() => hostToggleSetting('muteAll')}
            >
              {settings.muteAll ? 'Unmute all' : 'Mute all'}
            </Button>
            <Button
              size="sm"
              variant={settings.videoOffAll ? 'danger' : 'outline'}
              onClick={() => hostToggleSetting('videoOffAll')}
            >
              {settings.videoOffAll ? 'Allow video' : 'Stop video'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setEndingOpen(true)}
            >
              End
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            sidePanel ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
          } gap-3 flex-1`}
        >
          {participants.map((p) => (
            <ParticipantTile
              key={p.identity}
              participant={p}
              isLocal={p.isLocal}
              localVideoRef={p.isLocal ? localVideoRef : undefined}
              isSpeaking={speakingIdentities.has(p.identity)}
              hasHandRaised={
                p.isLocal ? myHandRaised : raisedHands.has(p.identity)
              }
              avatarUrl={
                p.isLocal ? myAvatarUrl : avatarMap[p.identity] || null
              }
            />
          ))}
          {participants.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Spinner />
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Waiting for participants...
              </p>
            </div>
          )}
        </div>

        {sidePanel && (
          <div className="w-full sm:w-80 shrink-0 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-20rem)]">
            <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {sidePanel === 'chat' && 'Chat'}
                {sidePanel === 'reactions' && 'Reactions'}
                {sidePanel === 'people' && 'People'}
              </h3>
              <button
                onClick={() => setSidePanel(null)}
                className="p-1 rounded hover:bg-[var(--sidebar-hover)]"
                aria-label="Close panel"
              >
                <HiXMark className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidePanel === 'chat' && (
                <ChatPanel
                  meetingId={id}
                  disabled={settings.chatDisabled}
                  displayName={displayName}
                  userAvatar={myAvatarUrl}
                  socketJoined={socketJoined}
                />
              )}
              {sidePanel === 'reactions' && (
                <ReactionsPanel
                  meetingId={id}
                  disabled={settings.reactionsDisabled}
                />
              )}
              {sidePanel === 'people' && (
                <ParticipantsPanel
                  meetingId={id}
                  isHost={isHost}
                  liveParticipants={participants}
                  raisedHands={raisedHands}
                  avatarMap={avatarMap}
                  settings={settings}
                  onMute={handleMuteParticipant}
                  onUnmute={handleUnmuteParticipant}
                  onUnmuteAll={handleUnmuteAll}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-4 mx-auto px-3 py-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-[var(--shadow-lg)] flex items-center gap-2">
        <ControlButton
          active={micEnabled}
          onClick={toggleMic}
          disabled={!isHost && settings.muteAll && !hostUnmutedMe}
          iconOn={<HiMicrophone className="w-5 h-5" />}
          iconOff={<HiOutlineMicrophone className="w-5 h-5" />}
          labelOn="Mic on"
          labelOff="Mic off"
        />
        <ControlButton
          active={videoEnabled}
          onClick={toggleVideo}
          disabled={!isHost && settings.videoOffAll}
          iconOn={<HiVideoCamera className="w-5 h-5" />}
          iconOff={<HiVideoCameraSlash className="w-5 h-5" />}
          labelOn="Video on"
          labelOff="Video off"
        />
        <ControlButton
          active={sidePanel === 'chat'}
          onClick={() => setSidePanel(sidePanel === 'chat' ? null : 'chat')}
          disabled={settings.chatDisabled}
          iconOn={<HiChatBubbleLeftRight className="w-5 h-5" />}
          iconOff={<HiChatBubbleLeftRight className="w-5 h-5" />}
          labelOn="Chat"
          labelOff="Chat"
        />
        <ControlButton
          active={sidePanel === 'reactions'}
          onClick={() =>
            setSidePanel(sidePanel === 'reactions' ? null : 'reactions')
          }
          disabled={settings.reactionsDisabled}
          iconOn={<HiFaceSmile className="w-5 h-5" />}
          iconOff={<HiFaceSmile className="w-5 h-5" />}
          labelOn="React"
          labelOff="React"
        />
        <ControlButton
          active={myHandRaised}
          onClick={toggleHand}
          iconOn={<HiHandRaised className="w-5 h-5" />}
          iconOff={<HiHandRaised className="w-5 h-5" />}
          labelOn="Lower hand"
          labelOff="Raise hand"
        />
        <ControlButton
          active={sidePanel === 'people'}
          onClick={() =>
            setSidePanel(sidePanel === 'people' ? null : 'people')
          }
          iconOn={<HiUsers className="w-5 h-5" />}
          iconOff={<HiUsers className="w-5 h-5" />}
          labelOn="People"
          labelOff="People"
        />
        <ControlButton
          active={false}
          onClick={leaveMeeting}
          iconOn={<HiPhoneXMark className="w-5 h-5" />}
          iconOff={<HiPhoneXMark className="w-5 h-5" />}
          labelOn="Leave"
          labelOff="Leave"
          danger
        />
      </div>

      <Modal
        open={endingOpen}
        onClose={() => {
          if (!ending) setEndingOpen(false);
        }}
        title="End meeting?"
      >
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          This will end the meeting for all participants and disconnect everyone.
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setEndingOpen(false)}
            disabled={ending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleEndMeeting}
            disabled={ending}
          >
            {ending ? 'Ending...' : 'End meeting'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  disabled,
  iconOn,
  iconOff,
  labelOn,
  labelOff,
  danger = false,
}) {
  const label = active ? labelOn : labelOff;
  const icon = active ? iconOn : iconOff;

  const base =
    'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = danger
    ? 'bg-[var(--danger-bg)] text-[var(--danger-text)] hover:opacity-90'
    : active
    ? 'bg-[var(--brand-primary)] text-white hover:opacity-90'
    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)]';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}