import { useEffect, useRef } from 'react';
import {
  HiMicrophone,
  HiOutlineMicrophone,
  HiVideoCamera,
  HiVideoCameraSlash,
  HiSpeakerWave,
  HiHandRaised,
  HiStar,
} from 'react-icons/hi2';
import { Avatar } from '@/components/ui';

export default function ParticipantTile({
  participant,
  isLocal,
  localVideoRef,
  isSpeaking = false,
  hasHandRaised = false,
  avatarUrl = null,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!participant?.videoTrack) return;
    const el = isLocal && localVideoRef ? localVideoRef.current : videoRef.current;
    if (!el) return;
    try {
      participant.videoTrack.attach(el);
    } catch {
      /* ignore */
    }
  }, [participant?.videoTrack, isLocal, localVideoRef]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden aspect-video flex items-center justify-center bg-[var(--bg-tertiary)] transition-all ${
        hasHandRaised
          ? 'ring-2 ring-[var(--warning-text)]'
          : isSpeaking
          ? 'ring-2 ring-[var(--success-text)]'
          : participant.isHost
          ? 'ring-2 ring-[var(--brand-primary)]/50'
          : ''
      }`}
    >
      {participant.hasVideo && participant.videoTrack ? (
        <video
          ref={isLocal && localVideoRef ? localVideoRef : videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Avatar name={participant.name} src={avatarUrl} size="lg" />
        </div>
      )}

      {participant.isHost && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--warning-text)] text-black text-[10px] font-bold shadow-sm">
          <HiStar className="w-3 h-3" />
          HOST
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 text-white text-xs max-w-[calc(100%-1rem)]">
        <span className="truncate">{participant.name}</span>
        {isLocal && (
          <span className="shrink-0 px-1 rounded bg-white/20 text-[9px]">YOU</span>
        )}
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            participant.hasAudio
              ? 'bg-black/60 text-white'
              : 'bg-[var(--danger-text)] text-white'
          }`}
          title={participant.hasAudio ? 'Mic on' : 'Mic off'}
        >
          {participant.hasAudio ? (
            <HiMicrophone className="w-3.5 h-3.5" />
          ) : (
            <HiOutlineMicrophone className="w-3.5 h-3.5" />
          )}
        </div>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            participant.hasVideo
              ? 'bg-black/60 text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)]'
          }`}
          title={participant.hasVideo ? 'Video on' : 'Video off'}
        >
          {participant.hasVideo ? (
            <HiVideoCamera className="w-3.5 h-3.5" />
          ) : (
            <HiVideoCameraSlash className="w-3.5 h-3.5" />
          )}
        </div>
      </div>

      {isSpeaking && (
        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-[var(--success-text)] text-white flex items-center justify-center animate-pulse">
          <HiSpeakerWave className="w-3.5 h-3.5" />
        </div>
      )}

      {hasHandRaised && !isSpeaking && (
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[var(--warning-text)] text-white flex items-center justify-center animate-bounce">
          <HiHandRaised className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}