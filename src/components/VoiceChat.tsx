import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Users, Volume2 } from "lucide-react";
import { RoomUser } from "../types";

interface VoiceChatProps {
  activeUsers: RoomUser[];
  currentUser: { id: string; name: string; avatar: string };
  socket: WebSocket | null;
  roomId: string;
}

export default function VoiceChat({ activeUsers, currentUser, socket, roomId }: VoiceChatProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Toggle microphone stream
  useEffect(() => {
    if (isMuted) {
      cleanupMicrophone();
      // Broadcast silent voice state
      broadcastVoiceState(false, 0);
    } else {
      initializeMicrophone();
    }

    return () => {
      cleanupMicrophone();
    };
  }, [isMuted]);

  const initializeMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setHasMicPermission(true);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      mediaStreamRef.current = stream;

      // Start analyzing volume levels
      analyzeVolume();
    } catch (err) {
      console.error("Failed to access microphone:", err);
      setHasMicPermission(false);
      setIsMuted(true);
    }
  };

  const cleanupMicrophone = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const analyzeVolume = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate simple average frequency intensity
      let total = 0;
      for (let i = 0; i < bufferLength; i++) {
        total += dataArray[i];
      }
      const average = total / bufferLength;

      // Scale average from 0-255 to 0-100 scale
      const volumeLevel = Math.min(100, Math.round((average / 128) * 100));

      // Check if threshold is met to consider "speaking"
      const speakingThreshold = 10; // noise floor
      const isCurrentlySpeaking = volumeLevel > speakingThreshold;

      broadcastVoiceState(isCurrentlySpeaking, volumeLevel);

      animationFrameRef.current = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  };

  const broadcastVoiceState = (isSpeaking: boolean, speakVolume: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "voice-level",
          roomId,
          data: {
            userId: currentUser.id,
            isSpeaking,
            speakVolume,
          },
        })
      );
    }
  };

  return (
    <div className="bg-[#111] text-white rounded-xl p-5 border border-white/10 shadow-2xl flex flex-col gap-4" id="voice-chat-control-box">
      {/* Voice Room Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded ${isMuted ? "bg-white/5 border border-white/10" : "bg-neon-green/10 border border-neon-green/20 text-neon-green"}`}>
            <Volume2 size={16} className={!isMuted ? "animate-pulse" : ""} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Audio Stage</h4>
            <div className="flex items-center gap-1.5 text-[10px] text-white/60 font-mono uppercase tracking-wider">
              <Users size={10} />
              <span>{activeUsers.length} active</span>
            </div>
          </div>
        </div>

        {/* Toggle Voice Chat Mic Button */}
        <button
          id="btn-toggle-mic"
          onClick={() => setIsMuted((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-black uppercase tracking-wider transition-all ${
            isMuted
              ? "bg-white/5 text-white/80 hover:bg-white/10 border border-white/10"
              : "bg-neon-green hover:bg-[#00E55C] text-black shadow-md shadow-neon-green/10"
          }`}
        >
          {isMuted ? (
            <>
              <MicOff size={14} />
              <span>Muted</span>
            </>
          ) : (
            <>
              <Mic size={14} className="animate-bounce" />
              <span>Speaking</span>
            </>
          )}
        </button>
      </div>

      {/* Mic Status Warning */}
      {hasMicPermission === false && !isMuted && (
        <div className="text-[10px] bg-rose-950/40 text-rose-300 border border-rose-900/40 p-2.5 rounded font-mono uppercase tracking-wider leading-relaxed">
          Microphone access denied. Enable permissions in browser to broadcast audio.
        </div>
      )}

      {/* active users grids with glowing speak animations */}
      <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
        {activeUsers.map((user) => {
          const isCurrentUser = user.id === currentUser.id;
          const speakingIntensity = user.isSpeaking ? user.speakVolume : 0;
          const borderScale = 1 + (speakingIntensity / 100) * 0.4;
          const ringOpacity = speakingIntensity / 100;

          return (
            <div
              key={user.id}
              className={`flex flex-col items-center p-3 rounded border relative transition-all ${
                user.isSpeaking
                  ? "bg-[#0D0D0D] border-neon-green/50"
                  : "bg-[#080808] border-white/5"
              }`}
              style={{
                boxShadow: user.isSpeaking
                  ? `0 0 ${speakingIntensity / 4}px rgba(0, 255, 102, ${ringOpacity})`
                  : "none",
              }}
            >
              {/* Concentric Speaking Rings */}
              {user.isSpeaking && (
                <div
                  className="absolute inset-0 rounded pointer-events-none border border-neon-green/30 transition-transform duration-75"
                  style={{ transform: `scale(${borderScale})`, opacity: ringOpacity }}
                />
              )}

              {/* User Avatar */}
              <div className="relative">
                <span className="text-2xl filter drop-shadow-md select-none">{user.avatar}</span>
                {/* Speaking indicator dot */}
                {user.isSpeaking ? (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-neon-green rounded-full border-2 border-[#111] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  </div>
                ) : (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white/20 rounded-full border-2 border-[#111]" />
                )}
              </div>

              {/* User Details */}
              <span className="text-[10px] font-bold text-white mt-2 max-w-full truncate">
                {user.name}
              </span>
              <span className="text-[8px] text-white/40 uppercase font-mono mt-0.5 tracking-wider">
                {isCurrentUser ? "You" : isMuted && user.id === currentUser.id ? "Muted" : "Creator"}
              </span>

              {/* Speaking waveform visualizer */}
              {user.isSpeaking && (
                <div className="flex items-center gap-0.5 h-2.5 mt-2">
                  <div
                    className="w-0.5 bg-neon-green rounded-full transition-all"
                    style={{ height: `${20 + (speakingIntensity % 4) * 15}%` }}
                  />
                  <div
                    className="w-0.5 bg-neon-green rounded-full transition-all"
                    style={{ height: `${40 + (speakingIntensity % 3) * 15}%` }}
                  />
                  <div
                    className="w-0.5 bg-neon-green rounded-full transition-all"
                    style={{ height: `${30 + (speakingIntensity % 5) * 15}%` }}
                  />
                  <div
                    className="w-0.5 bg-neon-green rounded-full transition-all"
                    style={{ height: `${10 + (speakingIntensity % 2) * 15}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
