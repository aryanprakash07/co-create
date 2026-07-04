import { useEffect, useState, useRef, FormEvent } from "react";
import { Room, Job, Portfolio, Stroke, CanvasVersion, ChatMessage, RoomUser } from "./types";
import DrawingCanvas from "./components/DrawingCanvas";
import VoiceChat from "./components/VoiceChat";
import JobsBoard from "./components/JobsBoard";
import Portfolios from "./components/Portfolios";
import CanvasHistory from "./components/CanvasHistory";
import AdminPanel from "./components/AdminPanel";
import {
  Sparkles,
  Layers,
  Briefcase,
  User,
  LogOut,
  ChevronRight,
  MessageCircle,
  Plus,
  Send,
  Sliders,
  VolumeX,
  Volume2,
  Users,
  Radio,
  Trash,
  UserPlus,
  Play,
  Check,
  Activity,
  Wifi,
  WifiOff,
  Shield
} from "lucide-react";

// Local storage keys
const USER_STORAGE_KEY = "cocreate_user_profile";

interface LocalUser {
  id: string;
  name: string;
  avatar: string;
  headline: string;
  bio: string;
  skills: string[];
}

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"studio" | "portfolios" | "jobs" | "profile" | "network" | "admin">("studio");

  // Authentication / Profile state
  const [user, setUser] = useState<LocalUser | null>(null);

  // Profile onboarding inputs
  const [onboardName, setOnboardName] = useState("");
  const [onboardAvatar, setOnboardAvatar] = useState("🎨");
  const [onboardHeadline, setOnboardHeadline] = useState("Designer");
  const [onboardBio, setOnboardBio] = useState("");
  const [onboardSkills, setOnboardSkills] = useState("");

  // REST Data state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [creators, setCreators] = useState<any[]>([]);

  // Studio Room State
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomStrokes, setRoomStrokes] = useState<Stroke[]>([]);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);
  const [roomVersions, setRoomVersions] = useState<CanvasVersion[]>([]);
  const [roomActiveUsers, setRoomActiveUsers] = useState<RoomUser[]>([]);

  // Real-time canvas backup dataurl
  const [lastCanvasSnapshot, setLastCanvasSnapshot] = useState<string | null>(null);

  // Publish showcase modal states (lifted up)
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [useStudioCanvas, setUseStudioCanvas] = useState(false);

  // New text chat message state
  const [chatInput, setChatInput] = useState("");

  // New room modal state
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");

  // New creator modal and simulation states
  const [showAddCreatorModal, setShowAddCreatorModal] = useState(false);
  const [newCreatorName, setNewCreatorName] = useState("");
  const [newCreatorAvatar, setNewCreatorAvatar] = useState("🦊");
  const [newCreatorHeadline, setNewCreatorHeadline] = useState("Designer");
  const [newCreatorBio, setNewCreatorBio] = useState("");
  const [newCreatorSkills, setNewCreatorSkills] = useState("");
  const [simulatedMessage, setSimulatedMessage] = useState<{ [creatorId: string]: string }>({});

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);

  // Avatars for registration
  const avatars = ["🎨", "🌸", "⚡", "🌿", "🦊", "👾", "🚀", "💎", "🦁", "🧸", "🦉", "🍄"];

  // Initialize: Load user profile and fetch REST APIs
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing saved user", e);
      }
    }

    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [roomsRes, jobsRes, portfoliosRes, creatorsRes] = await Promise.all([
        fetch("/api/rooms"),
        fetch("/api/jobs"),
        fetch("/api/portfolios"),
        fetch("/api/creators")
      ]);

      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (portfoliosRes.ok) setPortfolios(await portfoliosRes.json());
      if (creatorsRes.ok) setCreators(await creatorsRes.json());
    } catch (err) {
      console.error("Failed to load databases:", err);
    }
  };

  // Connect to room WebSocket when room is selected
  useEffect(() => {
    if (!selectedRoomId || !user) {
      // Disconnect if no room selected
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // Join Room immediately
      socket.send(
        JSON.stringify({
          type: "join-room",
          roomId: selectedRoomId,
          data: {
            userId: user.id,
            name: user.name,
            avatar: user.avatar
          }
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, data } = parsed;

        if (type === "room-sync") {
          setRoomStrokes(data.strokes || []);
          setRoomMessages(data.messages || []);
          setRoomVersions(data.versions || []);
          setRoomActiveUsers(data.activeUsers || []);
        } else if (type === "user-joined") {
          setRoomActiveUsers(data.activeUsers || []);
        } else if (type === "user-left") {
          setRoomActiveUsers(data.activeUsers || []);
        } else if (type === "draw-stroke") {
          setRoomStrokes((prev) => [...prev, data.stroke]);
        } else if (type === "clear-canvas") {
          setRoomStrokes([]);
        } else if (type === "version-added") {
          setRoomVersions((prev) => [...prev, data.version]);
        } else if (type === "canvas-restored") {
          setRoomStrokes(data.strokes);
        } else if (type === "message-received") {
          setRoomMessages((prev) => [...prev, data.message]);
        } else if (type === "voice-updated") {
          setRoomActiveUsers((prev) =>
            prev.map((u) =>
              u.id === data.userId
                ? { ...u, isSpeaking: data.isSpeaking, speakVolume: data.speakVolume }
                : u
            )
          );
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket connection error:", err);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    wsRef.current = socket;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedRoomId, user]);

  // Handle Onboarding / Profile Save
  const handleOnboardSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!onboardName.trim()) return;

    const skillsArray = onboardSkills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newUser: LocalUser = {
      id: `user-${Date.now()}`,
      name: onboardName,
      avatar: onboardAvatar,
      headline: onboardHeadline || "Digital Designer",
      bio: onboardBio || "Collaborative creator sharing the workspace.",
      skills: skillsArray.length > 0 ? skillsArray : ["Sketching", "Illustration"]
    };

    setUser(newUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out and change your artist profile?")) {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setSelectedRoomId(null);
    };
  };

  // Studio Socket Actions
  const handleDrawStroke = (stroke: Stroke) => {
    setRoomStrokes((prev) => [...prev, stroke]);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "draw-stroke",
          roomId: selectedRoomId,
          data: { stroke }
        })
      );
    }

    // Capture snapshot for portfolio upload
    const canvas = document.querySelector("canvas");
    if (canvas) {
      setLastCanvasSnapshot(canvas.toDataURL("image/png"));
    }
  };

  const handleClearCanvas = () => {
    if (window.confirm("Are you sure you want to clear the canvas for everyone in the room? This action is instant.")) {
      setRoomStrokes([]);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "clear-canvas",
            roomId: selectedRoomId
          })
        );
      }
    }
  };

  const handleUndoStroke = () => {
    setRoomStrokes((prev) => {
      if (prev.length === 0) return prev;
      let indexToRemove = -1;
      if (user) {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].userId === user.id) {
            indexToRemove = i;
            break;
          }
        }
      }
      if (indexToRemove === -1) {
        indexToRemove = prev.length - 1;
      }
      const nextStrokes = [...prev];
      nextStrokes.splice(indexToRemove, 1);
      return nextStrokes;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "undo-stroke",
          roomId: selectedRoomId
        })
      );
    }
  };

  const handleSaveVersion = (name: string, description: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(
        JSON.stringify({
          type: "save-version",
          roomId: selectedRoomId,
          data: {
            name,
            description,
            creatorName: user.name
          }
        })
      );
    }
  };

  const handleRestoreVersion = (versionId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "restore-version",
          roomId: selectedRoomId,
          data: { versionId }
        })
      );
    }
  };

  const handleSendTextMessage = () => {
    if (!chatInput.trim() || !user) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "send-message",
          roomId: selectedRoomId,
          data: {
            text: chatInput,
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar
          }
        })
      );
      setChatInput("");
    }
  };

  // REST API updates
  const handlePostJob = async (jobData: Omit<Job, "id" | "logo" | "postedAt" | "applicationsCount">) => {
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData)
      });
      if (res.ok) {
        const newJob = await res.json();
        setJobs((prev) => [newJob, ...prev]);
      }
    } catch (err) {
      console.error("Error posting job:", err);
    }
  };

  const handleApplyJob = (jobId: string, pitch: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, applicationsCount: j.applicationsCount + 1 } : j))
    );
  };

  const handlePublishPortfolio = async (
    portfolioData: Omit<Portfolio, "id" | "likes" | "likedBy" | "comments" | "timestamp">
  ) => {
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(portfolioData)
      });
      if (res.ok) {
        const newPortfolio = await res.json();
        setPortfolios((prev) => [newPortfolio, ...prev]);
        setActiveTab("portfolios");
      }
    } catch (err) {
      console.error("Error publishing portfolio:", err);
    }
  };

  const handleLikePortfolio = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/portfolios/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        const updated = await res.json();
        setPortfolios((prev) => prev.map((p) => (p.id === id ? updated : p)));
      }
    } catch (err) {
      console.error("Error liking portfolio:", err);
    }
  };

  const handleAddComment = async (portfolioId: string, text: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: user.name,
          userAvatar: user.avatar,
          text
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setPortfolios((prev) => prev.map((p) => (p.id === portfolioId ? updated : p)));
      }
    } catch (err) {
      console.error("Error commenting on portfolio:", err);
    }
  };

  const handleUpdatePortfolio = async (id: string, updatedData: Partial<Portfolio>) => {
    try {
      const res = await fetch(`/api/portfolios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        const updated = await res.json();
        setPortfolios((prev) => prev.map((p) => (p.id === id ? updated : p)));
      }
    } catch (err) {
      console.error("Error updating portfolio:", err);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this portfolio showcase? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/portfolios/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setPortfolios((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Error deleting portfolio:", err);
    }
  };

  const handleUpdateJob = async (id: string, updatedData: Partial<Job>) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        const updated = await res.json();
        setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      }
    } catch (err) {
      console.error("Error updating job:", err);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this job post? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
      }
    } catch (err) {
      console.error("Error deleting job:", err);
    }
  };

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newRoomTitle,
          description: newRoomDesc
        })
      });
      if (res.ok) {
        const newRoom = await res.json();
        setRooms((prev) => [...prev, newRoom]);
        setSelectedRoomId(newRoom.id);
        setNewRoomTitle("");
        setNewRoomDesc("");
        setShowNewRoomModal(false);
      }
    } catch (err) {
      console.error("Error creating room:", err);
    }
  };

  // Creator management handlers
  const handleAddCreator = async (creatorData: {
    name: string;
    avatar: string;
    headline: string;
    bio: string;
    skills: string[];
    isOnline: boolean;
  }) => {
    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creatorData)
      });
      if (res.ok) {
        const newCreator = await res.json();
        setCreators((prev) => [...prev, newCreator]);
      }
    } catch (err) {
      console.error("Error adding creator:", err);
    }
  };

  const handleDeleteCreator = async (id: string) => {
    try {
      const res = await fetch(`/api/creators/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setCreators((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Error deleting creator:", err);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.id !== id));
        if (selectedRoomId === id) {
          setSelectedRoomId(null);
        }
      } else {
        throw new Error("Failed to delete room");
      }
    } catch (err) {
      console.error("Error deleting room:", err);
      throw err;
    }
  };

  const handleAdminCreateRoom = async (title: string, description: string) => {
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description })
      });
      if (res.ok) {
        const newRoom = await res.json();
        setRooms((prev) => [...prev, newRoom]);
        return newRoom;
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create room");
      }
    } catch (err) {
      console.error("Error creating room via Admin:", err);
      throw err;
    }
  };

  const handleAdminDeletePortfolio = async (id: string) => {
    try {
      const res = await fetch(`/api/portfolios/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setPortfolios((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Error deleting portfolio in Admin:", err);
    }
  };

  const handleAdminDeleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
      }
    } catch (err) {
      console.error("Error deleting job in Admin:", err);
    }
  };

  const handleToggleCreatorOnline = async (id: string, currentlyOnline: boolean) => {
    try {
      const res = await fetch(`/api/creators/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: !currentlyOnline })
      });
      if (res.ok) {
        const updated = await res.json();
        setCreators((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } catch (err) {
      console.error("Error toggling creator online:", err);
    }
  };

  const handleCreatorJoinRoom = async (creatorId: string, roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/join-creator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId })
      });
      if (res.ok) {
        const data = await res.json();
        setRoomActiveUsers(data.activeUsers);
        setCreators((prev) =>
          prev.map((c) => (c.id === creatorId ? { ...c, currentRoomId: roomId } : c))
        );
      }
    } catch (err) {
      console.error("Error connecting creator to room:", err);
    }
  };

  const handleCreatorLeaveRoom = async (creatorId: string, roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/leave-creator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId })
      });
      if (res.ok) {
        const data = await res.json();
        setRoomActiveUsers(data.activeUsers);
        setCreators((prev) =>
          prev.map((c) => (c.id === creatorId ? { ...c, currentRoomId: undefined } : c))
        );
      }
    } catch (err) {
      console.error("Error disconnecting creator from room:", err);
    }
  };

  const handleCreatorAction = async (creatorId: string, roomId: string, actionType: "message" | "draw" | "speak", payload: any = {}) => {
    try {
      await fetch(`/api/rooms/${roomId}/creator-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          actionType,
          ...payload
        })
      });
    } catch (err) {
      console.error("Error triggering creator action:", err);
    }
  };

  // Onboarding Wall
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-neon-green text-black rounded-lg flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,255,102,0.3)]">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <h2 className="mt-4 text-3xl font-black text-white uppercase tracking-tighter">
              Join CO.CREATE Network
            </h2>
            <p className="mt-1.5 text-xs text-white/60 font-mono uppercase tracking-widest leading-relaxed">
              Create your design identity to enter shared whiteboard rooms, showcase portfolios, and browse creative opportunities.
            </p>
          </div>

          <div className="bg-[#111111] py-6 px-6 border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Choose Avatar Emoji *
                </label>
                <div className="grid grid-cols-6 gap-2 bg-[#080808] p-2 rounded-lg border border-white/5">
                  {avatars.map((av) => (
                    <button
                      id={`avatar-select-${av}`}
                      key={av}
                      type="button"
                      onClick={() => setOnboardAvatar(av)}
                      className={`text-2xl py-1.5 rounded-lg border transition-all ${
                        onboardAvatar === av
                          ? "bg-neon-green text-black border-neon-green scale-105 font-bold"
                          : "border-transparent bg-white/5 hover:bg-white/10 text-white"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Artist / Nickname *
                </label>
                <input
                  id="onboard-name-input"
                  type="text"
                  placeholder="e.g. FloraSketcher"
                  value={onboardName}
                  onChange={(e) => setOnboardName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded-lg focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white placeholder-white/30 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Professional Headline / Role *
                </label>
                <select
                  id="onboard-headline-select"
                  value={onboardHeadline}
                  onChange={(e) => setOnboardHeadline(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded-lg focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white font-semibold cursor-pointer"
                >
                  <option value="Designer">Designer</option>
                  <option value="Editor">Editor</option>
                  <option value="Illustrator">Illustrator</option>
                  <option value="Animator">Animator</option>
                  <option value="3D Artist">3D Artist</option>
                  <option value="UI/UX Designer">UI/UX Designer</option>
                  <option value="Concept Artist">Concept Artist</option>
                  <option value="Developer">Developer</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Short Bio / Specialty
                </label>
                <textarea
                  id="onboard-bio-input"
                  placeholder="Tell others what you love drawing or building collaboratively..."
                  rows={2}
                  value={onboardBio}
                  onChange={(e) => setOnboardBio(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded-lg focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white placeholder-white/30"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Specialty Skills (comma separated)
                </label>
                <input
                  id="onboard-skills-input"
                  type="text"
                  placeholder="e.g. Storyboards, Character rigging, Figma, Illustration"
                  value={onboardSkills}
                  onChange={(e) => setOnboardSkills(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded-lg focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white placeholder-white/30"
                />
              </div>

              <button
                id="btn-submit-onboard"
                type="submit"
                className="w-full py-3 bg-neon-green hover:bg-[#00E55C] text-black font-black uppercase tracking-wider text-xs rounded-lg transition-colors mt-6 shadow-[0_4px_12px_rgba(0,255,102,0.2)]"
              >
                Create Creator Profile
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col font-sans selection:bg-neon-green selection:text-black" id="cocreate-art-app">
      {/* Platform Navigation Header */}
      <header className="bg-[#0D0D0D] border-b border-white/10 sticky top-0 z-45">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-baseline gap-2">
              <h1 className="text-4xl font-black tracking-tighter leading-none text-white">
                CO.CREATE
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-neon-green font-bold ring-1 ring-neon-green px-2 py-0.5">
                Live Studio
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden sm:flex items-center gap-1 bg-[#111] p-1 rounded-lg border border-white/10">
              <button
                id="tab-studio-button"
                onClick={() => setActiveTab("studio")}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                  activeTab === "studio"
                    ? "bg-neon-green text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Studio Canvas
              </button>
              <button
                id="tab-portfolios-button"
                onClick={() => setActiveTab("portfolios")}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                  activeTab === "portfolios"
                    ? "bg-neon-green text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Portfolios Walkthrough
              </button>
              <button
                id="tab-jobs-button"
                onClick={() => setActiveTab("jobs")}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                  activeTab === "jobs"
                    ? "bg-neon-green text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Jobs & Freelance Board
              </button>
              <button
                id="tab-profile-button"
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                  activeTab === "profile"
                    ? "bg-neon-green text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                My Portfolio
              </button>
              <button
                id="tab-network-button"
                onClick={() => setActiveTab("network")}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                  activeTab === "network"
                    ? "bg-neon-green text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Creative Network
              </button>
              <button
                id="tab-admin-button"
                onClick={() => setActiveTab("admin")}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.1em] transition-all flex items-center gap-1.5 ${
                  activeTab === "admin"
                    ? "bg-neon-green text-black"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Shield size={12} />
                <span>Admin Panel</span>
              </button>
            </nav>

            {/* User Identity and Action */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border-l border-white/20 pl-3">
                <span className="text-xl filter drop-shadow-xs">{user.avatar}</span>
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                  <span className="text-[9px] text-white/50 font-medium">{user.headline}</span>
                </div>
              </div>

              <button
                id="btn-header-logout"
                onClick={handleLogout}
                className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-400 rounded-lg transition-colors border border-white/10"
                title="Log out / Change profile"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="sm:hidden flex items-center justify-around border-t border-white/10 py-2 bg-[#080808] px-2">
          <button
            id="mobile-tab-studio"
            onClick={() => setActiveTab("studio")}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${
              activeTab === "studio" ? "text-neon-green" : "text-white/40"
            }`}
          >
            <Sparkles size={16} />
            <span>Studio</span>
          </button>
          <button
            id="mobile-tab-portfolios"
            onClick={() => setActiveTab("portfolios")}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${
              activeTab === "portfolios" ? "text-neon-green" : "text-white/40"
            }`}
          >
            <Layers size={16} />
            <span>Showcases</span>
          </button>
          <button
            id="mobile-tab-jobs"
            onClick={() => setActiveTab("jobs")}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${
              activeTab === "jobs" ? "text-neon-green" : "text-white/40"
            }`}
          >
            <Briefcase size={16} />
            <span>Gigs</span>
          </button>
          <button
            id="mobile-tab-profile"
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${
              activeTab === "profile" ? "text-neon-green" : "text-white/40"
            }`}
          >
            <User size={16} />
            <span>Profile</span>
          </button>
          <button
            id="mobile-tab-network"
            onClick={() => setActiveTab("network")}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${
              activeTab === "network" ? "text-neon-green" : "text-white/40"
            }`}
          >
            <Users size={16} />
            <span>Network</span>
          </button>
          <button
            id="mobile-tab-admin"
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${
              activeTab === "admin" ? "text-neon-green" : "text-white/40"
            }`}
          >
            <Shield size={16} />
            <span>Admin</span>
          </button>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: STUDIO CANVAS */}
        {activeTab === "studio" && (
          <div className="space-y-6">
            {!selectedRoomId ? (
              // Room Selection View
              <div className="space-y-6">
                {/* Intro Banner */}
                <div className="bg-[#111] text-white border border-white/10 rounded-xl p-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-neon-green/10 to-indigo-500/10 rounded-full blur-3xl" />
                  <div className="relative z-10 max-w-lg space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neon-green bg-white/5 border border-white/10 px-2.5 py-1 rounded-full font-mono">
                      Real-time Whiteboard Rooms
                    </span>
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none pt-2">
                      Enter a Collaborative Room or Design Studio
                    </h2>
                    <p className="text-xs text-white/60 leading-relaxed font-sans pt-1">
                      Choose any persistent digital canvas room below to sketch, draw, and voice-chat with designers in real-time.
                    </p>
                    <button
                      id="btn-show-create-room"
                      onClick={() => setShowNewRoomModal(true)}
                      className="mt-4 px-5 py-3 bg-neon-green hover:bg-[#00E55C] text-black text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow-[0_4px_12px_rgba(0,255,102,0.2)]"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span>Start Custom Canvas Room</span>
                    </button>
                  </div>
                </div>

                {/* Rooms Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-neon-green transition-all flex flex-col justify-between hover:shadow-[0_0_15px_rgba(0,255,102,0.1)] group"
                      id={`room-card-${room.id}`}
                    >
                      <div>
                        <h3 className="text-base font-extrabold text-white group-hover:text-neon-green transition-colors">{room.title}</h3>
                        <p className="text-xs text-white/60 mt-2 leading-relaxed">
                          {room.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest flex items-center gap-1.5">
                          <Layers size={11} />
                          <span>{room.versions.length} versions saved</span>
                        </span>

                        <button
                          id={`btn-join-room-${room.id}`}
                          onClick={() => setSelectedRoomId(room.id)}
                          className="px-4 py-2 bg-white hover:bg-neon-green text-black text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1"
                        >
                          <span>Join Canvas</span>
                          <ChevronRight size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Active Studio Canvas Interface
              <div className="space-y-4 animate-fade-in">
                {/* Active Room Title Bar */}
                <div className="bg-[#111] border border-white/10 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <button
                      id="btn-leave-room"
                      onClick={() => setSelectedRoomId(null)}
                      className="text-[10px] font-mono font-bold text-neon-green hover:text-white uppercase tracking-[0.2em] flex items-center gap-1 mb-1.5 transition-colors"
                    >
                      ← Back to Studio list
                    </button>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">
                        {rooms.find((r) => r.id === selectedRoomId)?.title || "Canvas Studio"}
                      </h2>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-white/50 font-mono uppercase tracking-wider">
                      Canvas Room: <strong className="text-neon-green font-bold">{selectedRoomId}</strong>
                    </span>
                    <button
                      id="btn-quick-publish"
                      disabled={!lastCanvasSnapshot}
                      onClick={() => {
                        setActiveTab("portfolios");
                        setShowPublishModal(true);
                        setUseStudioCanvas(true);
                      }}
                      className="px-4 py-2 bg-neon-green hover:bg-[#00E55C] disabled:opacity-30 disabled:bg-white/5 disabled:text-white/40 text-black text-xs font-black uppercase tracking-wider rounded-lg transition-all shadow-[0_4px_12px_rgba(0,255,102,0.15)]"
                      title="Post current drawing directly to your Showcase Portfolio!"
                    >
                      Publish Artwork to Portfolio
                    </button>
                  </div>
                </div>

                {/* Grid Split: Canvas in middle, Voice controller + Chats + Version checklist on right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Left Column: Canvas (Large) */}
                  <div className="lg:col-span-8 flex flex-col h-[500px] md:h-[600px]">
                    <DrawingCanvas
                      strokes={roomStrokes}
                      activeUsers={roomActiveUsers}
                      onDrawStroke={handleDrawStroke}
                      onClearCanvas={handleClearCanvas}
                      onUndoStroke={handleUndoStroke}
                      onSaveVersion={handleSaveVersion}
                      currentUser={user}
                      socket={wsRef.current}
                      roomId={selectedRoomId}
                    />
                  </div>

                  {/* Right Column: Audio Chat, Text Chat & Versioning */}
                  <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Live Voice Controller */}
                    <VoiceChat
                      activeUsers={roomActiveUsers}
                      currentUser={user}
                      socket={wsRef.current}
                      roomId={selectedRoomId}
                    />

                    {/* Live Room Connections Manager */}
                    <div className="bg-[#111] border border-white/10 rounded-xl p-5 shadow-2xl flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-1.5">
                          <Radio size={14} className="text-neon-green animate-pulse" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">
                            Live Room Co-Creators
                          </h4>
                        </div>
                        <button
                          onClick={() => setActiveTab("network")}
                          className="text-[9px] font-mono font-bold uppercase tracking-wider text-neon-green hover:underline"
                        >
                          Manage Network
                        </button>
                      </div>

                      {/* Online creators who are not yet in the room */}
                      <div className="space-y-2">
                        {creators.filter(c => c.isOnline).map(creator => {
                          const isInRoom = roomActiveUsers.some(u => u.id === creator.id);
                          const isSpeaking = roomActiveUsers.find(u => u.id === creator.id)?.isSpeaking;
                          return (
                            <div key={creator.id} className="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${isSpeaking ? "animate-bounce" : ""}`}>{creator.avatar}</span>
                                <div className="leading-none">
                                  <p className="text-[11px] font-bold text-white leading-none">{creator.name}</p>
                                  <span className="text-[9px] text-white/40 font-mono">{creator.headline}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {!isInRoom ? (
                                  <button
                                    onClick={() => handleCreatorJoinRoom(creator.id, selectedRoomId)}
                                    className="px-2 py-1 bg-neon-green/10 hover:bg-neon-green/20 text-neon-green border border-neon-green/25 text-[9px] font-bold uppercase rounded font-mono"
                                  >
                                    Join Room
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleCreatorAction(creator.id, selectedRoomId, "draw")}
                                      className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors"
                                      title="Trigger Sketch Drawing"
                                    >
                                      <Sparkles size={11} className="text-amber-400" />
                                    </button>
                                    <button
                                      onClick={() => handleCreatorAction(creator.id, selectedRoomId, "speak", { isSpeaking: !isSpeaking })}
                                      className={`p-1.5 rounded transition-colors ${isSpeaking ? "bg-neon-green text-black" : "bg-white/5 hover:bg-white/10 text-white"}`}
                                      title="Toggle Voice Mic Speaking"
                                    >
                                      {isSpeaking ? <Volume2 size={11} /> : <VolumeX size={11} />}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const txt = window.prompt(`Have ${creator.name} say:`, "Let's draw a masterpiece!");
                                        if (txt) {
                                          handleCreatorAction(creator.id, selectedRoomId, "message", { text: txt });
                                        }
                                      }}
                                      className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors"
                                      title="Type message as this creator"
                                    >
                                      <MessageCircle size={11} className="text-neon-green" />
                                    </button>
                                    <button
                                      onClick={() => handleCreatorLeaveRoom(creator.id, selectedRoomId)}
                                      className="px-1.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[9px] font-bold uppercase rounded font-mono transition-colors"
                                      title="Remove from Room"
                                    >
                                      Leave
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {creators.filter(c => c.isOnline).length === 0 && (
                          <p className="text-[9px] text-white/30 text-center py-2 font-mono leading-relaxed">
                            No network creators are currently online. Go to the "Creative Network" tab to set them online or create new ones!
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Canvas Snapshot Checklist */}
                    <CanvasHistory
                      versions={roomVersions}
                      onRestoreVersion={handleRestoreVersion}
                      currentUser={user}
                    />

                    {/* Studio Text Chat thread */}
                    <div className="bg-[#111] border border-white/10 rounded-xl p-5 flex flex-col h-[280px] shadow-2xl justify-between">
                      <div className="flex items-center gap-1.5 border-b border-white/5 pb-3 mb-2">
                        <MessageCircle size={14} className="text-neon-green" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">
                          Room Text Chat
                        </h4>
                      </div>

                      {/* Chat Messages flow */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                        {roomMessages.length > 0 ? (
                          roomMessages.map((msg) => {
                            const isSelf = msg.userId === user.id;
                            return (
                              <div
                                key={msg.id}
                                className={`flex gap-2 text-[11px] items-start ${
                                  isSelf ? "flex-row-reverse" : "flex-row"
                                }`}
                              >
                                <span className="w-6 h-6 rounded bg-[#0D0D0D] border border-white/10 flex items-center justify-center text-xs shrink-0 select-none">
                                  {msg.userAvatar}
                                </span>
                                <div
                                  className={`p-2.5 rounded-lg max-w-[80%] ${
                                    isSelf ? "bg-neon-green text-black font-semibold" : "bg-[#080808] border border-white/5 text-white/90"
                                  }`}
                                >
                                  {!isSelf && (
                                    <p className="font-bold text-[9px] text-white/40 uppercase tracking-wider font-mono mb-0.5 leading-none">
                                      {msg.userName}
                                    </p>
                                  )}
                                  <p className="leading-normal">{msg.text}</p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center text-white/30 py-8">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">No text messages</p>
                            <p className="text-[9px] text-white/20 mt-1">Keep the whiteboard coordination alive!</p>
                          </div>
                        )}
                      </div>

                      {/* Msg input block */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                        <input
                          id="studio-chat-input"
                          type="text"
                          placeholder="Type and hit Enter to chat..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendTextMessage()}
                          className="flex-1 text-xs px-3 py-2 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/30 font-semibold"
                        />
                        <button
                          id="btn-send-studio-chat"
                          onClick={handleSendTextMessage}
                          className="p-2 bg-neon-green text-black hover:bg-[#00E55C] rounded transition-colors flex items-center justify-center"
                        >
                          <Send size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PORTFOLIOS SHOWCASE */}
        {activeTab === "portfolios" && (
          <Portfolios
            portfolios={portfolios}
            onLikePortfolio={handleLikePortfolio}
            onAddComment={handleAddComment}
            onPublishPortfolio={handlePublishPortfolio}
            onUpdatePortfolio={handleUpdatePortfolio}
            onDeletePortfolio={handleDeletePortfolio}
            currentUser={user}
            lastCanvasDataURL={lastCanvasSnapshot}
            showPublishModal={showPublishModal}
            setShowPublishModal={setShowPublishModal}
            useStudioCanvas={useStudioCanvas}
            setUseStudioCanvas={setUseStudioCanvas}
          />
        )}

        {/* TAB 3: JOBS & FREELANCE BOARD */}
        {activeTab === "jobs" && (
          <JobsBoard
            jobs={jobs}
            onPostJob={handlePostJob}
            onApplyJob={handleApplyJob}
            onUpdateJob={handleUpdateJob}
            onDeleteJob={handleDeleteJob}
            currentUser={user}
          />
        )}

        {/* TAB 4: MY PROFILE */}
        {activeTab === "profile" && (
          <div className="space-y-6" id="personal-creator-profile-container">
            {/* User Profile Header banner */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl text-white">
              <span className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-4xl shadow-xs shrink-0 select-none">
                {user.avatar}
              </span>

              <div className="space-y-1.5 text-center md:text-left flex-1">
                <h2 className="text-lg font-black text-white uppercase tracking-tight font-sans">{user.name}</h2>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-[10px] text-white/40 font-bold uppercase font-mono tracking-wider">Role:</span>
                  <select
                    id="profile-headline-select"
                    value={user.headline}
                    onChange={(e) => {
                      const updated = { ...user, headline: e.target.value };
                      setUser(updated);
                      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
                    }}
                    className="bg-[#0D0D0D] border border-white/10 text-xs text-neon-green font-bold uppercase font-mono tracking-wider px-2.5 py-1 rounded focus:outline-none focus:border-neon-green cursor-pointer"
                  >
                    <option value="Designer">Designer</option>
                    <option value="Editor">Editor</option>
                    <option value="Illustrator">Illustrator</option>
                    <option value="Animator">Animator</option>
                    <option value="3D Artist">3D Artist</option>
                    <option value="UI/UX Designer">UI/UX Designer</option>
                    <option value="Concept Artist">Concept Artist</option>
                    <option value="Developer">Developer</option>
                  </select>
                </div>
                <p className="text-xs text-white/70 max-w-xl leading-relaxed mt-1">{user.bio}</p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-2">
                  {user.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-[9px] font-bold text-white/60 uppercase rounded font-mono tracking-wider"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  id="btn-edit-bio-prompt"
                  onClick={() => {
                    const newB = window.prompt("Enter your new creator bio:", user.bio);
                    if (newB !== null) {
                      const updated = { ...user, bio: newB };
                      setUser(updated);
                      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
                    }
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider font-mono rounded"
                >
                  Edit Bio
                </button>
              </div>
            </div>

            {/* User's Published Art Showcase subsection */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">
                My Showcase Contributions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {portfolios.filter((p) => p.artistId === user.id).length > 0 ? (
                  portfolios
                    .filter((p) => p.artistId === user.id)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl hover:border-neon-green transition-all"
                      >
                        <div className="aspect-video bg-[#0D0D0D] border-b border-white/5 overflow-hidden relative">
                          <img
                            src={item.imageSrc}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="p-4">
                          <h4 className="text-xs font-black text-white uppercase tracking-tight truncate font-sans">{item.title}</h4>
                          <p className="text-[11px] text-white/60 mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-3 mt-4 text-[9px] text-white/40 font-bold border-t border-white/5 pt-2.5 font-mono uppercase tracking-wider">
                            <span>{item.likes} likes</span>
                            <span>{item.comments.length} comments</span>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="col-span-1 md:col-span-3 bg-[#111] border border-dashed border-white/10 rounded p-10 text-center text-white/40">
                    <Sparkles size={28} className="mx-auto mb-2 text-white/20 animate-pulse" />
                    <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">No published artworks yet</p>
                    <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                      Go to the <strong className="text-white font-bold uppercase tracking-wider">Studio Canvas</strong> tab, draw something magnificent, and click "Publish Artwork" to show it here!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CREATIVE NETWORK & LIVE CONNECTIVITY */}
        {activeTab === "network" && (
          <div className="space-y-6 animate-fade-in" id="creative-network-view">
            {/* Banner */}
            <div className="bg-[#111] text-white border border-white/10 rounded-xl p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-neon-green/10 to-indigo-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 max-w-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neon-green bg-white/5 border border-white/10 px-2.5 py-1 rounded-full font-mono">
                  Live Online Connections
                </span>
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none pt-2">
                  Connect Live Designers & Simulate Real-Time Actions
                </h2>
                <p className="text-xs text-white/60 leading-relaxed font-sans pt-1">
                  Build and connect your own live creative network! Add custom creators ("add by own"), toggle them online, invite them to any whiteboard room, and command them to sketch on the canvas, chat in real-time, or toggle speaking in voice chat.
                </p>
              </div>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#111] border border-white/10 p-5 rounded-xl flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Registered Network</p>
                  <h4 className="text-2xl font-black text-white mt-1">{creators.length} Creators</h4>
                </div>
                <Users size={24} className="text-neon-green/40" />
              </div>
              <div className="bg-[#111] border border-white/10 p-5 rounded-xl flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Active Live / Online</p>
                  <h4 className="text-2xl font-black text-neon-green mt-1 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-neon-green"></span>
                    </span>
                    {creators.filter(c => c.isOnline).length} Active
                  </h4>
                </div>
                <Activity size={24} className="text-neon-green/40" />
              </div>
              <div className="bg-[#111] border border-white/10 p-5 rounded-xl flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Co-designing in Rooms</p>
                  <h4 className="text-2xl font-black text-white mt-1">{creators.filter(c => c.currentRoomId).length} Active</h4>
                </div>
                <Radio size={24} className="text-indigo-400/40" />
              </div>
            </div>

            {/* Main content grid: 2/3 Creators, 1/3 Add form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Creators List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 font-mono">
                  Live Creative Registry ({creators.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {creators.map(creator => {
                    const roomInfo = rooms.find(r => r.id === creator.currentRoomId);
                    return (
                      <div key={creator.id} className="bg-[#111] border border-white/10 rounded-xl p-5 shadow-2xl flex flex-col justify-between hover:border-white/20 transition-all">
                        <div className="space-y-3">
                          {/* Top: Avatar & Online Status */}
                          <div className="flex items-center justify-between">
                            <span className="text-3xl bg-white/5 border border-white/10 p-2 rounded-lg leading-none select-none">
                              {creator.avatar}
                            </span>
                            <button
                              onClick={() => handleToggleCreatorOnline(creator.id, creator.isOnline)}
                              className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full font-mono flex items-center gap-1.5 transition-all ${
                                creator.isOnline
                                  ? "bg-neon-green/10 text-neon-green border border-neon-green/30 shadow-[0_0_8px_rgba(0,255,102,0.15)] animate-pulse"
                                  : "bg-white/5 text-white/40 border border-white/10"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${creator.isOnline ? "bg-neon-green" : "bg-white/30"}`} />
                              <span>{creator.isOnline ? "Online" : "Offline"}</span>
                            </button>
                          </div>

                          {/* Info */}
                          <div className="space-y-1">
                            <h4 className="text-base font-extrabold text-white">{creator.name}</h4>
                            <p className="text-xs text-neon-green font-bold uppercase font-mono tracking-wider">{creator.headline}</p>
                            <p className="text-[11px] text-white/60 leading-relaxed pt-1">{creator.bio}</p>
                          </div>

                          {/* Skills tags */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {creator.skills.map((skill: string) => (
                              <span key={skill} className="px-2 py-0.5 bg-white/5 border border-white/5 text-[9px] font-mono font-bold text-white/40 uppercase rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Bottom: Dynamic Connections & Controls */}
                        <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                          {/* Connection state */}
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-white/40 font-mono">Workspace Status:</span>
                            {creator.isOnline ? (
                              roomInfo ? (
                                <span className="text-indigo-400 font-bold flex items-center gap-1">
                                  <Radio size={12} className="animate-pulse" />
                                  Active in: "{roomInfo.title}"
                                </span>
                              ) : (
                                <span className="text-neon-green font-bold">Idle / Ready to Connect</span>
                              )
                            ) : (
                              <span className="text-white/30">Offline / Standby</span>
                            )}
                          </div>

                          {/* Action deck */}
                          {creator.isOnline && (
                            <div className="space-y-2">
                              {/* Studio Room connector */}
                              <div className="flex gap-1.5">
                                {!creator.currentRoomId ? (
                                  <select
                                    id={`select-room-${creator.id}`}
                                    onChange={(e) => {
                                      const rId = e.target.value;
                                      if (rId) handleCreatorJoinRoom(creator.id, rId);
                                    }}
                                    className="flex-1 text-[11px] px-2 py-1.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white/80"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Invite to Studio...</option>
                                    {rooms.map(r => (
                                      <option key={r.id} value={r.id}>{r.title}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <button
                                    onClick={() => handleCreatorLeaveRoom(creator.id, creator.currentRoomId!)}
                                    className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase rounded font-mono transition-colors"
                                  >
                                    Disconnect from room
                                  </button>
                                )}
                              </div>

                              {/* Interactive drawing, messaging & mic triggers */}
                              {creator.currentRoomId && (
                                <div className="bg-black/35 p-2 rounded-lg border border-white/5 space-y-2">
                                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest leading-none">Simulate live collaboration</p>
                                  
                                  <div className="flex items-center justify-between gap-1">
                                    {/* Draw button */}
                                    <button
                                      onClick={() => handleCreatorAction(creator.id, creator.currentRoomId!, "draw")}
                                      className="flex-1 py-1 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-bold uppercase tracking-wider text-white flex items-center justify-center gap-1 transition-colors"
                                      title="Trigger Sketch Drawing"
                                    >
                                      <Sparkles size={11} className="text-amber-400" />
                                      <span>Sketch</span>
                                    </button>

                                    {/* Speak toggle */}
                                    {(() => {
                                      const isSpeaking = roomActiveUsers.find(u => u.id === creator.id)?.isSpeaking;
                                      return (
                                        <button
                                          onClick={() => handleCreatorAction(creator.id, creator.currentRoomId!, "speak", { isSpeaking: !isSpeaking })}
                                          className={`flex-1 py-1 px-2 border rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
                                            isSpeaking
                                              ? "bg-neon-green text-black border-neon-green"
                                              : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                                          }`}
                                          title="Toggle Speaking State"
                                        >
                                          {isSpeaking ? <Volume2 size={11} /> : <VolumeX size={11} />}
                                          <span>{isSpeaking ? "Speaking" : "Muted"}</span>
                                        </button>
                                      );
                                    })()}
                                  </div>

                                  {/* Custom message input for simulated creator */}
                                  <div className="flex gap-1">
                                    <input
                                      id={`creator-msg-input-${creator.id}`}
                                      type="text"
                                      placeholder="Message content..."
                                      value={simulatedMessage[creator.id] || ""}
                                      onChange={(e) => setSimulatedMessage(prev => ({ ...prev, [creator.id]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          const txt = simulatedMessage[creator.id];
                                          if (txt) {
                                            handleCreatorAction(creator.id, creator.currentRoomId!, "message", { text: txt });
                                            setSimulatedMessage(prev => ({ ...prev, [creator.id]: "" }));
                                          }
                                        }
                                      }}
                                      className="flex-1 text-[10px] px-2.5 py-1 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white font-semibold"
                                    />
                                    <button
                                      onClick={() => {
                                        const txt = simulatedMessage[creator.id];
                                        if (txt) {
                                          handleCreatorAction(creator.id, creator.currentRoomId!, "message", { text: txt });
                                          setSimulatedMessage(prev => ({ ...prev, [creator.id]: "" }));
                                        }
                                      }}
                                      className="p-1 bg-neon-green text-black hover:bg-[#00E55C] rounded transition-colors"
                                    >
                                      <Send size={10} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Delete option */}
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleDeleteCreator(creator.id)}
                              className="text-[10px] font-mono text-white/30 hover:text-rose-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
                              title="Delete Creator profile"
                            >
                              <Trash size={10} />
                              <span>Delete Creator</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Add Live Creator Form */}
              <div className="bg-[#111] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-tight">
                    <UserPlus size={16} className="text-neon-green" />
                    <span>Add Custom Creator</span>
                  </h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    Instantly register your own customizable designer profile into the live creative database!
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newCreatorName.trim()) return;
                    handleAddCreator({
                      name: newCreatorName,
                      avatar: newCreatorAvatar,
                      headline: newCreatorHeadline || "Creative Designer",
                      bio: newCreatorBio || "Digital artist on the live network.",
                      skills: newCreatorSkills ? newCreatorSkills.split(",").map(s => s.trim()) : ["Sketching", "Illustration"],
                      isOnline: true
                    });
                    setNewCreatorName("");
                    setNewCreatorHeadline("");
                    setNewCreatorBio("");
                    setNewCreatorSkills("");
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                      Choose Profile Avatar Emoji
                    </label>
                    <div className="flex flex-wrap gap-1.5 bg-[#0D0D0D] p-2.5 rounded border border-white/5">
                      {["🦊", "👾", "🚀", "💎", "🦁", "🧸", "🦉", "🍄", "🎨", "🌸", "⚡", "🌿", "👽", "🦄", "🐼", "🔥"].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewCreatorAvatar(emoji)}
                          className={`w-8 h-8 rounded text-lg flex items-center justify-center transition-all ${
                            newCreatorAvatar === emoji ? "bg-neon-green text-black ring-2 ring-white font-bold" : "bg-white/5 hover:bg-white/10 text-white"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                      Creator Full Name *
                    </label>
                    <input
                      id="new-creator-name-input"
                      type="text"
                      placeholder="e.g. Alex Watercolor"
                      value={newCreatorName}
                      onChange={(e) => setNewCreatorName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white font-semibold placeholder-white/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                      Professional Specialty / Role *
                    </label>
                    <select
                      id="new-creator-headline-select"
                      value={newCreatorHeadline}
                      onChange={(e) => setNewCreatorHeadline(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white font-semibold cursor-pointer"
                    >
                      <option value="Designer">Designer</option>
                      <option value="Editor">Editor</option>
                      <option value="Illustrator">Illustrator</option>
                      <option value="Animator">Animator</option>
                      <option value="3D Artist">3D Artist</option>
                      <option value="UI/UX Designer">UI/UX Designer</option>
                      <option value="Concept Artist">Concept Artist</option>
                      <option value="Developer">Developer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                      Creator Bio / Description
                    </label>
                    <textarea
                      id="new-creator-bio-input"
                      placeholder="e.g. Specialist in futuristic machinery, blender nodes, and low-poly game assets..."
                      rows={3}
                      value={newCreatorBio}
                      onChange={(e) => setNewCreatorBio(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white placeholder-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                      Skills tags (comma separated)
                    </label>
                    <input
                      id="new-creator-skills-input"
                      type="text"
                      placeholder="e.g. 3D Modeling, Blender, Hard Surface"
                      value={newCreatorSkills}
                      onChange={(e) => setNewCreatorSkills(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white font-semibold placeholder-white/20"
                    />
                  </div>

                  <button
                    id="btn-submit-new-creator"
                    type="submit"
                    className="w-full px-4 py-3 bg-neon-green hover:bg-[#00E55C] text-black text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,255,102,0.15)]"
                  >
                    <UserPlus size={14} strokeWidth={3} />
                    <span>Register Dynamic Creator</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN PANEL */}
        {activeTab === "admin" && (
          <AdminPanel
            rooms={rooms}
            jobs={jobs}
            portfolios={portfolios}
            creators={creators}
            onDeleteRoom={handleDeleteRoom}
            onDeletePortfolio={handleAdminDeletePortfolio}
            onDeleteJob={handleAdminDeleteJob}
            onDeleteCreator={handleDeleteCreator}
            onCreateRoom={handleAdminCreateRoom}
            onPostJob={handlePostJob}
          />
        )}
      </main>

      {/* Start New Canvas Studio Modal */}
      {showNewRoomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111] rounded-xl p-6 max-w-sm w-full shadow-2xl border border-white/10 text-white">
            <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-tight">
              <Plus size={16} className="text-neon-green" />
              <span>Initialize Drawing Studio</span>
            </h3>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              Start a custom whiteboard channel. Other designers can instantly connect via the studio browser.
            </p>

            <form onSubmit={handleCreateRoom} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Studio Title *
                </label>
                <input
                  id="new-room-title-input"
                  type="text"
                  placeholder="e.g. Dreamy Watercolor Study"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white font-semibold placeholder-white/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Topic Description
                </label>
                <textarea
                  id="new-room-desc-input"
                  placeholder="e.g. Practicing soft shading, lighting, and sharing references..."
                  rows={2}
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-white/10 rounded focus:outline-none focus:border-neon-green bg-[#0D0D0D] text-white placeholder-white/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 text-xs border-t border-white/10">
                <button
                  id="btn-cancel-create-room"
                  type="button"
                  onClick={() => setShowNewRoomModal(false)}
                  className="px-3 py-2 text-white/60 hover:text-white font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-room"
                  type="submit"
                  className="px-5 py-2.5 bg-neon-green hover:bg-[#00E55C] text-black font-black uppercase tracking-wider rounded"
                >
                  Start Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simple Footer */}
      <footer className="border-t border-white/10 py-8 mt-12 text-center text-white/30 text-[10px] font-bold tracking-widest uppercase font-mono">
        <p>© 2026 CO.CREATE Art Network. All processes online.</p>
      </footer>
    </div>
  );
}
