import { useState, FormEvent } from "react";
import { Job } from "../types";
import { Briefcase, MapPin, DollarSign, Calendar, Search, Filter, Plus, Send, CheckCircle, Edit, Trash2 } from "lucide-react";

interface JobsBoardProps {
  jobs: Job[];
  onPostJob: (jobData: Omit<Job, "id" | "logo" | "postedAt" | "applicationsCount">) => Promise<void>;
  onApplyJob: (jobId: string, pitch: string) => void;
  onUpdateJob: (id: string, updatedData: Partial<Job>) => Promise<void>;
  onDeleteJob: (id: string) => Promise<void>;
  currentUser: { id: string; name: string; avatar: string };
}

export default function JobsBoard({ jobs, onPostJob, onApplyJob, onUpdateJob, onDeleteJob, currentUser }: JobsBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"All" | "Full-time" | "Freelance" | "Remote">("All");

  // Post job modal states
  const [showPostModal, setShowPostModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newType, setNewType] = useState<Job["type"]>("Full-time");
  const [newSalary, setNewSalary] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSkills, setNewSkills] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Edit job modal states
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editType, setEditType] = useState<Job["type"]>("Full-time");
  const [editSalary, setEditSalary] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSkills, setEditSkills] = useState("");

  const handleStartEdit = (job: Job) => {
    setEditingJob(job);
    setEditTitle(job.title);
    setEditCompany(job.company);
    setEditLocation(job.location);
    setEditType(job.type);
    setEditSalary(job.salary);
    setEditDescription(job.description);
    setEditSkills(job.skills.join(", "));
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    const skillsArray = editSkills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await onUpdateJob(editingJob.id, {
      title: editTitle,
      company: editCompany,
      location: editLocation,
      type: editType,
      description: editDescription,
      salary: editSalary,
      skills: skillsArray,
      isFreelance: editType === "Freelance"
    });

    setEditingJob(null);
  };

  // Apply modal states
  const [showApplyModal, setShowApplyModal] = useState<string | null>(null);
  const [coverPitch, setCoverPitch] = useState("");
  const [applicationSuccess, setApplicationSuccess] = useState(false);

  // Filtered Jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      selectedType === "All" ||
      (selectedType === "Full-time" && job.type === "Full-time") ||
      (selectedType === "Freelance" && (job.type === "Freelance" || job.isFreelance)) ||
      (selectedType === "Remote" && (job.location.toLowerCase().includes("remote") || job.type === "Remote"));

    return matchesSearch && matchesType;
  });

  const handlePostSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCompany.trim() || !newDescription.trim()) return;

    setIsPosting(true);
    const skillsArray = newSkills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await onPostJob({
      title: newTitle,
      company: newCompany,
      location: newLocation || "Remote",
      type: newType,
      description: newDescription,
      salary: newSalary || "Competitive",
      skills: skillsArray,
      postedBy: currentUser.id,
      isFreelance: newType === "Freelance",
    });

    // Reset Form
    setNewTitle("");
    setNewCompany("");
    setNewLocation("");
    setNewType("Full-time");
    setNewSalary("");
    setNewDescription("");
    setNewSkills("");
    setIsPosting(false);
    setShowPostModal(false);
  };

  const handleApplySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!showApplyModal) return;

    onApplyJob(showApplyModal, coverPitch);
    setApplicationSuccess(true);
    setTimeout(() => {
      setApplicationSuccess(false);
      setShowApplyModal(null);
      setCoverPitch("");
    }, 1800);
  };

  return (
    <div className="space-y-6" id="designer-jobs-container">
      {/* Search Header Banner */}
      <div className="bg-[#111] border border-white/10 text-white rounded-xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-neon-green/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-black uppercase tracking-widest text-neon-green font-mono">Creator Career Hub</span>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1.5 uppercase leading-tight font-sans">
            Find Permanent Studio Roles & Freelance Commission Gigs
          </h1>
          <p className="text-xs text-white/60 mt-2 max-w-lg leading-relaxed">
            Connect with top developers, gaming studios, and global publishing brands looking for digital artists, concept illustrators, UI designers, and animators.
          </p>

          {/* Search Box */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                id="search-jobs-input"
                type="text"
                placeholder="Search jobs by title, skill (e.g. 'Figma', 'Concept Art')..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0D0D0D] border border-white/10 rounded text-xs font-semibold placeholder-white/20 text-white focus:outline-none focus:border-neon-green transition-colors"
              />
            </div>
            <button
              id="btn-open-post-job-modal"
              onClick={() => setShowPostModal(true)}
              className="px-5 py-3 bg-neon-green hover:bg-[#00E55C] text-black text-xs font-black uppercase tracking-wider rounded font-mono transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Post Opening / Gig</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3" id="jobs-filter-tabs">
        {(["All", "Full-time", "Freelance", "Remote"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider font-mono transition-all ${
              selectedType === t
                ? "bg-neon-green text-black font-extrabold"
                : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
        <span className="text-xs font-bold uppercase tracking-wider font-mono text-white/40 ml-auto mr-1">
          {filteredJobs.length} matches
        </span>
      </div>

      {/* Jobs Listing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-[#111] border border-white/10 rounded-xl p-5 hover:border-neon-green transition-all flex flex-col justify-between"
              id={`job-card-${job.id}`}
            >
              {/* Card Top */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 bg-white/5 border border-white/10 rounded flex items-center justify-center text-2xl shadow-xs shrink-0">
                      {job.logo}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-white hover:text-neon-green transition-colors uppercase tracking-tight">
                        {job.title}
                      </h3>
                      <p className="text-xs text-white/40 font-mono uppercase tracking-wider">{job.company}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider font-mono shrink-0 ${
                      job.type === "Full-time"
                        ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                        : job.type === "Freelance"
                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                        : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                    }`}
                  >
                    {job.type}
                  </span>
                </div>

                {/* Locations / Salary */}
                <div className="flex flex-wrap items-center gap-3 mt-3.5 text-xs text-white/60">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-white/40" />
                    <span className="font-mono uppercase text-[11px] tracking-wider">{job.location}</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <DollarSign size={13} className="text-white/40" />
                    <span className="font-black text-neon-green font-mono">{job.salary}</span>
                  </span>
                </div>

                {/* Job Description */}
                <p className="text-xs text-white/75 mt-3 line-clamp-3 leading-relaxed">
                  {job.description}
                </p>

                {/* Required Skills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-4">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-white/5 border border-white/5 text-[10px] font-mono text-white/60 uppercase rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] text-white/40 font-mono uppercase tracking-widest flex items-center gap-1">
                  <Calendar size={11} />
                  <span>{new Date(job.postedAt).toLocaleDateString()}</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/50 font-mono">
                    {job.applicationsCount} applied
                  </span>
                  {job.postedBy === currentUser.id && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(job)}
                        title="Edit Job Posting"
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded border border-white/10 transition-all cursor-pointer"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => onDeleteJob(job.id)}
                        title="Delete Job Posting"
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded border border-rose-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                  <button
                    id={`btn-apply-job-${job.id}`}
                    onClick={() => setShowApplyModal(job.id)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-wider rounded font-mono transition-all"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-1 md:col-span-2 bg-[#111] border border-dashed border-white/10 rounded p-12 text-center text-white/40">
            <Briefcase size={36} className="mx-auto mb-3 text-white/20 animate-bounce" />
            <p className="text-sm font-bold text-white uppercase tracking-wider">No matching jobs or freelance opportunities</p>
            <p className="text-xs text-white/50 mt-1">Try expanding your search query or selecting a different filter.</p>
          </div>
        )}
      </div>

      {/* Post a Job Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111] rounded-xl p-6 max-w-lg w-full shadow-2xl border border-white/10 overflow-y-auto max-h-[90vh] text-white">
            <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-tight">
              <Plus size={18} className="text-neon-green" />
              <span>Post a Creative Opening / Freelance Contract</span>
            </h3>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              Connect with digital designers and hand-drawn artists. Your posting will appear instantly in the talent feed.
            </p>

            <form onSubmit={handlePostSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Job / Contract Title *
                  </label>
                  <input
                    id="post-job-title"
                    type="text"
                    placeholder="e.g. Lead Concept Artist"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white font-semibold placeholder-white/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Company / Publisher Name *
                  </label>
                  <input
                    id="post-job-company"
                    type="text"
                    placeholder="e.g. Indie Game Studios"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white font-semibold placeholder-white/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Engagement Type
                  </label>
                  <select
                    id="post-job-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as Job["type"])}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white font-semibold placeholder-white/20"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Location / Work Model
                  </label>
                  <input
                    id="post-job-location"
                    type="text"
                    placeholder="e.g. Tokyo (Remote OK)"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white font-semibold placeholder-white/20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Salary / Compensation
                  </label>
                  <input
                    id="post-job-salary"
                    type="text"
                    placeholder="e.g. $80k - $100k or $50/hr"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white font-semibold placeholder-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Description & Project Scope *
                </label>
                <textarea
                  id="post-job-description"
                  placeholder="Outline the job responsibilities, project timelines, canvas layouts, or illustration directions requested..."
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Required Skills (comma separated)
                </label>
                <input
                  id="post-job-skills"
                  type="text"
                  placeholder="e.g. Illustrator, Storyboards, Figma, Photoshop"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 text-xs border-t border-white/10">
                <button
                  id="btn-close-post-job"
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-3 py-2 text-white/60 hover:text-white font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-post-job"
                  type="submit"
                  disabled={isPosting}
                  className="px-5 py-2.5 bg-neon-green hover:bg-[#00E55C] text-black font-black uppercase tracking-wider rounded disabled:opacity-50"
                >
                  {isPosting ? "Posting..." : "Post Opening"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply to Job Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111] rounded-xl p-6 max-w-md w-full shadow-2xl border border-white/10 text-white">
            {applicationSuccess ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded flex items-center justify-center mx-auto mb-3 animate-bounce">
                  <CheckCircle size={24} />
                </div>
                <h4 className="text-base font-black uppercase tracking-wider font-mono text-white">Application Sent</h4>
                <p className="text-xs text-white/60 mt-1 max-w-xs mx-auto leading-relaxed">
                  Your portfolio link and cover pitch have been sent directly to the project director.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-tight">
                  <Send size={16} className="text-neon-green" />
                  <span>Submit Creative Application</span>
                </h3>
                <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                  Applying as <strong className="text-white font-bold">{currentUser.name}</strong>. Your profile information and portfolio works will be automatically attached.
                </p>
 
                <form onSubmit={handleApplySubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                      Cover Pitch & Portfolio Links
                    </label>
                    <textarea
                      id="apply-pitch-input"
                      placeholder="Highlight your previous illustrations or collaborative projects. Describe why you are a great fit for this specific contract..."
                      rows={5}
                      value={coverPitch}
                      onChange={(e) => setCoverPitch(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                      required
                    />
                  </div>
 
                  <div className="pt-3 flex items-center justify-end gap-2 text-xs border-t border-white/10">
                    <button
                      id="btn-close-apply"
                      type="button"
                      onClick={() => setShowApplyModal(null)}
                      className="px-3 py-2 text-white/60 hover:text-white font-bold uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn-submit-apply"
                      type="submit"
                      className="px-5 py-2.5 bg-neon-green hover:bg-[#00E55C] text-black font-black uppercase tracking-wider rounded"
                    >
                      Submit Application
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#111] rounded-xl p-6 max-w-lg w-full shadow-2xl border border-white/10 overflow-y-auto max-h-[90vh] text-white space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] border-b border-white/5 pb-3">
              Edit Job Opening / Gig
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Concept Artist"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Studio / Publisher Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PixelCraft Studios"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Location *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tokyo, JP (Remote)"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Job Type *
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as Job["type"])}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white"
                  >
                    <option value="Full-time">Full-time Position</option>
                    <option value="Freelance">Freelance Contract</option>
                    <option value="Remote">Fully Remote</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                    Est. Salary / Rate *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $120k - $140k"
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Job Description & Scope *
                </label>
                <textarea
                  placeholder="Detail the creative responsibilities, pipeline requirements, and core tool skills needed..."
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Required Core Skills (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UI/UX, Figma, Concept Art, Photoshop"
                  value={editSkills}
                  onChange={(e) => setEditSkills(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 text-xs border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-3 py-2 text-white/60 hover:text-white font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-neon-green hover:bg-[#00E55C] text-black font-black uppercase tracking-wider rounded cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
