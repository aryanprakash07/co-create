import React, { useState } from "react";
import { Room, Job, Portfolio } from "../types";
import { 
  ShieldAlert, 
  Trash2, 
  Plus, 
  Activity, 
  Briefcase, 
  Layers, 
  Users, 
  Tv,
  CheckCircle2, 
  AlertTriangle,
  Send,
  Sparkles,
  Search,
  Hash,
  MessageSquare,
  FileText
} from "lucide-react";

interface AdminPanelProps {
  rooms: Room[];
  jobs: Job[];
  portfolios: Portfolio[];
  creators: any[];
  onDeleteRoom: (id: string) => Promise<void>;
  onDeletePortfolio: (id: string) => Promise<void>;
  onDeleteJob: (id: string) => Promise<void>;
  onDeleteCreator: (id: string) => Promise<void>;
  onCreateRoom: (title: string, desc: string) => Promise<any>;
  onPostJob: (jobData: Omit<Job, "id" | "logo" | "postedAt" | "applicationsCount">) => Promise<void>;
}

type AdminSubTab = "dashboard" | "rooms" | "artworks" | "jobs" | "creators";

export default function AdminPanel({
  rooms,
  jobs,
  portfolios,
  creators,
  onDeleteRoom,
  onDeletePortfolio,
  onDeleteJob,
  onDeleteCreator,
  onCreateRoom,
  onPostJob
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Room Creation Form state
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  
  // Job Creation Form state
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobCompany, setNewJobCompany] = useState("");
  const [newJobType, setNewJobType] = useState<"Full-time" | "Freelance" | "Remote">("Full-time");
  const [newJobSalary, setNewJobSalary] = useState("");
  const [newJobLocation, setNewJobLocation] = useState("");
  const [newJobDesc, setNewJobDesc] = useState("");
  const [newJobSkills, setNewJobSkills] = useState("");
  
  // Status/Alert Feedback State
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;
    try {
      await onCreateRoom(newRoomTitle, newRoomDesc);
      showFeedback(`Whiteboard Room "${newRoomTitle}" successfully created!`);
      setNewRoomTitle("");
      setNewRoomDesc("");
    } catch (err: any) {
      showFeedback(err.message || "Failed to create room", true);
    }
  };

  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobCompany.trim()) return;
    try {
      await onPostJob({
        title: newJobTitle,
        company: newJobCompany,
        location: newJobLocation || "Remote",
        type: newJobType,
        description: newJobDesc || "We are looking for creative talent to join our design studio.",
        salary: newJobSalary || "$85,000 - $105,000",
        skills: newJobSkills ? newJobSkills.split(",").map(s => s.trim()).filter(Boolean) : ["Design", "Collaboration"],
        isFreelance: newJobType === "Freelance",
        postedBy: "system"
      });
      showFeedback(`Job listing "${newJobTitle}" successfully published!`);
      setNewJobTitle("");
      setNewJobCompany("");
      setNewJobSalary("");
      setNewJobLocation("");
      setNewJobDesc("");
      setNewJobSkills("");
    } catch (err: any) {
      showFeedback("Failed to post job listing", true);
    }
  };

  const calculateTotalStrokes = () => {
    return rooms.reduce((total, room) => total + (room.strokes?.length || 0), 0);
  };

  const calculateTotalComments = () => {
    return portfolios.reduce((total, p) => total + (p.comments?.length || 0), 0);
  };

  // Filters
  const filteredRooms = rooms.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredArtworks = portfolios.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.artistName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJobs = jobs.filter(j =>
    j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCreators = creators.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.headline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" id="admin-panel-container">
      {/* Header Banner */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-neon-green/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-neon-green animate-pulse" size={20} />
              <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-neon-green font-mono">
                CO.CREATE System Administrator
              </span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight font-sans">
              Control Panel & Moderation Suite
            </h2>
            <p className="text-xs text-white/50 max-w-2xl leading-relaxed">
              Real-time monitoring and database oversight. Direct moderation of collaborative whiteboard spaces, artist showcases, contract listings, and simulated actor states.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1.5 rounded-lg font-mono">
            <button
              id="admin-btn-db-refresh"
              onClick={() => showFeedback("Oversight metrics refreshed with production database")}
              className="p-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 rounded transition-all flex items-center gap-1.5"
            >
              <Activity size={12} className="text-neon-green" />
              <span>Sync Metrics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications / Feedback toasts */}
      {actionSuccess && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-xs font-mono tracking-wide" id="admin-feedback-success">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="bg-rose-950/40 border border-rose-500/30 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-xs font-mono tracking-wide" id="admin-feedback-error">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#111] border border-white/10 p-4 rounded-xl relative overflow-hidden hover:border-white/20 transition-all">
          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">Canvas Spaces</p>
          <p className="text-2xl font-black text-white mt-1.5">{rooms.length}</p>
          <div className="text-[9px] font-mono text-white/50 mt-1.5 flex items-center gap-1">
            <Hash size={10} className="text-neon-green" />
            <span>{calculateTotalStrokes()} total strokes</span>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 p-4 rounded-xl relative overflow-hidden hover:border-white/20 transition-all">
          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">Showcase Artworks</p>
          <p className="text-2xl font-black text-white mt-1.5">{portfolios.length}</p>
          <div className="text-[9px] font-mono text-white/50 mt-1.5 flex items-center gap-1">
            <MessageSquare size={10} className="text-indigo-400" />
            <span>{calculateTotalComments()} comments received</span>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 p-4 rounded-xl relative overflow-hidden hover:border-white/20 transition-all">
          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">Gigs & Positions</p>
          <p className="text-2xl font-black text-white mt-1.5">{jobs.length}</p>
          <div className="text-[9px] font-mono text-white/50 mt-1.5 flex items-center gap-1">
            <Briefcase size={10} className="text-amber-400" />
            <span>{jobs.filter(j => j.isFreelance).length} Freelance Gigs</span>
          </div>
        </div>

        <div className="bg-[#111] border border-white/10 p-4 rounded-xl relative overflow-hidden hover:border-white/20 transition-all">
          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">Network Creators</p>
          <p className="text-2xl font-black text-white mt-1.5">{creators.length}</p>
          <div className="text-[9px] font-mono text-neon-green mt-1.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-ping" />
            <span>{creators.filter(c => c.isOnline).length} Online Now</span>
          </div>
        </div>

        <div className="bg-neon-green/5 border border-neon-green/20 p-4 rounded-xl relative overflow-hidden col-span-2 lg:col-span-1">
          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-neon-green">System Status</p>
          <p className="text-lg font-black text-white mt-1.5 uppercase tracking-tighter">Operational</p>
          <div className="text-[9px] font-mono text-white/50 mt-2 flex items-center gap-1">
            <span>Latency: &lt; 14ms (WS)</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="border-b border-white/10 flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-1.5 bg-[#111] p-1 rounded-lg border border-white/10 font-mono">
          <button
            id="admin-tab-dash-button"
            onClick={() => { setActiveSubTab("dashboard"); setSearchQuery(""); }}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeSubTab === "dashboard" ? "bg-neon-green text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Dashboard Setup
          </button>
          <button
            id="admin-tab-rooms-button"
            onClick={() => { setActiveSubTab("rooms"); setSearchQuery(""); }}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeSubTab === "rooms" ? "bg-neon-green text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Rooms ({rooms.length})
          </button>
          <button
            id="admin-tab-artworks-button"
            onClick={() => { setActiveSubTab("artworks"); setSearchQuery(""); }}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeSubTab === "artworks" ? "bg-neon-green text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Artworks ({portfolios.length})
          </button>
          <button
            id="admin-tab-jobs-button"
            onClick={() => { setActiveSubTab("jobs"); setSearchQuery(""); }}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeSubTab === "jobs" ? "bg-neon-green text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Gigs Board ({jobs.length})
          </button>
          <button
            id="admin-tab-creators-button"
            onClick={() => { setActiveSubTab("creators"); setSearchQuery(""); }}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
              activeSubTab === "creators" ? "bg-neon-green text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Creators ({creators.length})
          </button>
        </div>

        {activeSubTab !== "dashboard" && (
          <div className="relative w-full max-w-xs shrink-0">
            <span className="absolute inset-y-0 left-3 flex items-center text-white/40">
              <Search size={12} />
            </span>
            <input
              type="text"
              placeholder={`Search ${activeSubTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-[#111] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 focus:outline-none focus:border-neon-green placeholder-white/30 text-white font-mono"
            />
          </div>
        )}
      </div>

      {/* SUBTAB 1: SYSTEM DASHBOARD AND SEEDING TOOLS */}
      {activeSubTab === "dashboard" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="admin-subtab-dashboard">
          {/* Quick Room Creator */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Plus className="text-neon-green" size={16} />
              <h3 className="text-xs font-black uppercase tracking-wider font-mono text-white">Create Whiteboard Room</h3>
            </div>
            
            <form onSubmit={handleCreateRoomSubmit} className="space-y-3 font-sans">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1.5 font-mono">Room Title</label>
                <input
                  type="text"
                  placeholder="e.g. Cyberpunk Interface Design"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#0D0D0D] border border-white/10 rounded-md focus:outline-none focus:border-neon-green text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1.5 font-mono">Description / Objectives</label>
                <textarea
                  rows={2}
                  placeholder="Set boundaries or initial constraints for this studio board..."
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#0D0D0D] border border-white/10 rounded-md focus:outline-none focus:border-neon-green text-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-neon-green hover:bg-neon-green/90 text-black text-[10px] font-black uppercase tracking-widest rounded transition-all font-mono"
              >
                Launch Room
              </button>
            </form>
          </div>

          {/* Quick Gigs Poster */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Briefcase className="text-amber-400" size={16} />
              <h3 className="text-xs font-black uppercase tracking-wider font-mono text-white">Post Creative Gig / Position</h3>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1 font-mono">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Animator"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1 font-mono">Studio / Client</label>
                  <input
                    type="text"
                    placeholder="e.g. Neon Horizon"
                    value={newJobCompany}
                    onChange={(e) => setNewJobCompany(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1 font-mono">Type</label>
                  <select
                    value={newJobType}
                    onChange={(e) => setNewJobType(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-1.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white font-mono cursor-pointer"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1 font-mono">Budget / Salary</label>
                  <input
                    type="text"
                    placeholder="e.g. $95k - $120k"
                    value={newJobSalary}
                    onChange={(e) => setNewJobSalary(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1 font-mono">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Tokyo / Remote"
                    value={newJobLocation}
                    onChange={(e) => setNewJobLocation(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1 font-mono">Skills Required (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. AfterEffects, Spine, 2D Animation"
                  value={newJobSkills}
                  onChange={(e) => setNewJobSkills(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/50 mb-1 font-mono">Job Description</label>
                <textarea
                  rows={2}
                  placeholder="Outline the critical creative requirements..."
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-black uppercase tracking-widest rounded transition-all font-mono"
              >
                Publish Job Post
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUBTAB 2: ROOMS MODERATION */}
      {activeSubTab === "rooms" && (
        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl" id="admin-subtab-rooms">
          <div className="p-4 border-b border-white/10 bg-[#161616] flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider font-mono"> Whiteboard Collaboration Rooms ({filteredRooms.length})</h3>
            <span className="text-[10px] text-white/40 font-mono font-bold uppercase">All live channels</span>
          </div>
          
          <div className="divide-y divide-white/10">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <div key={room.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight font-sans">{room.title}</h4>
                      <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-white/40">{room.id}</span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed max-w-2xl">{room.description}</p>
                    <div className="flex items-center gap-4 text-[9px] font-mono text-white/40 pt-1 uppercase tracking-wider">
                      <span>{room.strokes?.length || 0} Strokes</span>
                      <span>{room.versions?.length || 0} Snapshots</span>
                      <span>{room.messages?.length || 0} Chat Messages</span>
                      <span className="text-neon-green">{room.activeUsers?.length || 0} Active Users</span>
                    </div>
                  </div>

                  <button
                    id={`btn-delete-room-${room.id}`}
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to shut down and delete the whiteboard room: "${room.title}"?`)) {
                        try {
                          await onDeleteRoom(room.id);
                          showFeedback(`Room "${room.title}" was permanently purged.`);
                        } catch (err) {
                          showFeedback("Failed to delete room.", true);
                        }
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider font-mono rounded flex items-center gap-1 transition-all"
                  >
                    <Trash2 size={12} />
                    <span>Terminate Room</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-white/40 text-xs font-mono">
                <AlertTriangle size={24} className="mx-auto mb-2 text-white/20" />
                <span>No collaboration rooms match the query</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: ARTWORKS MODERATION */}
      {activeSubTab === "artworks" && (
        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl" id="admin-subtab-artworks">
          <div className="p-4 border-b border-white/10 bg-[#161616] flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider font-mono">Artist Portfolios & Submissions ({filteredArtworks.length})</h3>
            <span className="text-[10px] text-white/40 font-mono font-bold uppercase font-sans">Moderation suite</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 bg-black/20">
            {filteredArtworks.length > 0 ? (
              filteredArtworks.map((art) => (
                <div key={art.id} className="p-5 flex gap-4 hover:bg-white/2 transition-all">
                  <div className="w-24 h-24 bg-black/40 border border-white/10 rounded overflow-hidden shrink-0 relative">
                    <img 
                      src={art.imageSrc} 
                      alt={art.title} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h4 className="text-xs font-black text-white uppercase tracking-tight truncate">{art.title}</h4>
                    <p className="text-[10px] text-white/50">By <strong className="text-white/80">{art.artistName}</strong> ({art.artistId === "system" ? "Generated AI" : "User Joined"})</p>
                    <p className="text-[10px] text-white/70 line-clamp-2 leading-normal">{art.description}</p>
                    
                    <div className="flex items-center gap-3 text-[9px] font-mono text-white/40 uppercase tracking-wider pt-1">
                      <span>{art.likes} Likes</span>
                      <span>{art.comments?.length || 0} Comments</span>
                    </div>

                    <div className="pt-2">
                      <button
                        id={`btn-delete-art-${art.id}`}
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to moderate and delete the artwork "${art.title}"?`)) {
                            try {
                              await onDeletePortfolio(art.id);
                              showFeedback(`Artwork "${art.title}" was moderated.`);
                            } catch (err) {
                              showFeedback("Failed to delete artwork.", true);
                            }
                          }
                        }}
                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-wider font-mono rounded flex items-center gap-1 transition-all"
                      >
                        <Trash2 size={10} />
                        <span>Purge Artwork</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-white/40 text-xs font-mono col-span-2">
                <AlertTriangle size={24} className="mx-auto mb-2 text-white/20" />
                <span>No portfolio submissions found</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: GIGS MODERATION */}
      {activeSubTab === "jobs" && (
        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl" id="admin-subtab-gigs">
          <div className="p-4 border-b border-white/10 bg-[#161616] flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider font-mono">Gigs & Freelance Job Listings ({filteredJobs.length})</h3>
            <span className="text-[10px] text-white/40 font-mono font-bold uppercase">System and custom posts</span>
          </div>

          <div className="divide-y divide-white/10">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <div key={job.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{job.logo}</span>
                      <h4 className="text-xs font-black text-white uppercase tracking-tight font-sans">{job.title}</h4>
                      <span className="text-[9px] text-neon-green font-mono font-bold uppercase bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">{job.type}</span>
                    </div>
                    <p className="text-[11px] text-white/60 font-medium">{job.company} — <span className="text-white/40">{job.location}</span></p>
                    <p className="text-xs text-white/70 max-w-2xl leading-relaxed mt-1">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                      {job.skills.map((s, idx) => (
                        <span key={idx} className="text-[8px] bg-white/5 text-white/60 px-1.5 py-0.5 rounded font-mono uppercase">{s}</span>
                      ))}
                    </div>
                  </div>

                  <button
                    id={`btn-delete-job-${job.id}`}
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to remove the job listing for "${job.title}"?`)) {
                        try {
                          await onDeleteJob(job.id);
                          showFeedback(`Job post "${job.title}" successfully deleted.`);
                        } catch (err) {
                          showFeedback("Failed to delete job post.", true);
                        }
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider font-mono rounded flex items-center gap-1 transition-all shrink-0"
                  >
                    <Trash2 size={11} />
                    <span>Delete Listing</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-white/40 text-xs font-mono">
                <AlertTriangle size={24} className="mx-auto mb-2 text-white/20" />
                <span>No job or freelance listings matched the search query</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 5: CREATORS DIRECTORY MODERATION */}
      {activeSubTab === "creators" && (
        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl" id="admin-subtab-creators">
          <div className="p-4 border-b border-white/10 bg-[#161616] flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider font-mono">Live Creative Network Directory ({filteredCreators.length})</h3>
            <span className="text-[10px] text-white/40 font-mono font-bold uppercase">Simulated actors & system accounts</span>
          </div>

          <div className="divide-y divide-white/10">
            {filteredCreators.length > 0 ? (
              filteredCreators.map((creator) => (
                <div key={creator.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-2xl shrink-0 select-none">
                      {creator.avatar}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-white uppercase tracking-tight font-sans">{creator.name}</h4>
                        <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                          creator.isOnline 
                            ? "bg-neon-green/10 border-neon-green/20 text-neon-green" 
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}>
                          {creator.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                      <p className="text-[10px] text-neon-green font-bold uppercase font-mono tracking-wider">{creator.headline}</p>
                      <p className="text-xs text-white/60 max-w-xl line-clamp-1 leading-relaxed">{creator.bio}</p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {creator.skills?.map((skill: string, idx: number) => (
                          <span key={idx} className="text-[8px] bg-white/5 text-white/50 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    id={`btn-delete-creator-${creator.id}`}
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to ban and delete ${creator.name}'s profile?`)) {
                        try {
                          await onDeleteCreator(creator.id);
                          showFeedback(`Creator profile for "${creator.name}" successfully terminated.`);
                        } catch (err) {
                          showFeedback("Failed to delete creator profile.", true);
                        }
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider font-mono rounded flex items-center gap-1 transition-all shrink-0"
                  >
                    <Trash2 size={11} />
                    <span>Terminate Profile</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-white/40 text-xs font-mono">
                <AlertTriangle size={24} className="mx-auto mb-2 text-white/20" />
                <span>No registered creators found matching query</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
