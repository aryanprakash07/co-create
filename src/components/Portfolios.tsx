import { useState, FormEvent, DragEvent, ChangeEvent } from "react";
import { Portfolio } from "../types";
import { Heart, MessageSquare, Send, Award, Sparkles, Plus, Image, ChevronRight, Check, Edit, Trash2 } from "lucide-react";

interface PortfoliosProps {
  portfolios: Portfolio[];
  onLikePortfolio: (id: string) => Promise<void>;
  onAddComment: (portfolioId: string, text: string) => Promise<void>;
  onPublishPortfolio: (portfolioData: Omit<Portfolio, "id" | "likes" | "likedBy" | "comments" | "timestamp">) => Promise<void>;
  onUpdatePortfolio: (id: string, updatedData: Partial<Portfolio>) => Promise<void>;
  onDeletePortfolio: (id: string) => Promise<void>;
  currentUser: { id: string; name: string; avatar: string };
  lastCanvasDataURL: string | null; // Captures active drawings from studio for direct showcase!
  showPublishModal: boolean;
  setShowPublishModal: (show: boolean) => void;
  useStudioCanvas: boolean;
  setUseStudioCanvas: (use: boolean) => void;
}

export default function Portfolios({
  portfolios,
  onLikePortfolio,
  onAddComment,
  onPublishPortfolio,
  onUpdatePortfolio,
  onDeletePortfolio,
  currentUser,
  lastCanvasDataURL,
  showPublishModal,
  setShowPublishModal,
  useStudioCanvas,
  setUseStudioCanvas,
}: PortfoliosProps) {
  const [commentInputs, setCommentInputs] = useState<{ [portfolioId: string]: string }>({});
  const [expandedComments, setExpandedComments] = useState<{ [portfolioId: string]: boolean }>({});
  const [showProcessMap, setShowProcessMap] = useState<{ [portfolioId: string]: boolean }>({});

  // Editing state
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editDragActive, setEditDragActive] = useState(false);
  const [editStep1Title, setEditStep1Title] = useState("");
  const [editStep1Desc, setEditStep1Desc] = useState("");
  const [editStep2Title, setEditStep2Title] = useState("");
  const [editStep2Desc, setEditStep2Desc] = useState("");
  const [editStep3Title, setEditStep3Title] = useState("");
  const [editStep3Desc, setEditStep3Desc] = useState("");

  const handleStartEdit = (item: Portfolio) => {
    setEditingPortfolio(item);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditImage(item.imageSrc);
    setEditStep1Title(item.processSteps[0]?.title || "");
    setEditStep1Desc(item.processSteps[0]?.description || "");
    setEditStep2Title(item.processSteps[1]?.title || "");
    setEditStep2Desc(item.processSteps[1]?.description || "");
    setEditStep3Title(item.processSteps[2]?.title || "");
    setEditStep3Desc(item.processSteps[2]?.description || "");
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPortfolio) return;

    const processSteps = [];
    if (editStep1Title) processSteps.push({ title: editStep1Title, description: editStep1Desc });
    if (editStep2Title) processSteps.push({ title: editStep2Title, description: editStep2Desc });
    if (editStep3Title) processSteps.push({ title: editStep3Title, description: editStep3Desc });

    await onUpdatePortfolio(editingPortfolio.id, {
      title: editTitle,
      description: editDescription,
      imageSrc: editImage || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop",
      processSteps
    });

    setEditingPortfolio(null);
  };

  const handleEditFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, JPEG, GIF, SVG, WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setEditImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setEditDragActive(true);
    } else if (e.type === "dragleave") {
      setEditDragActive(false);
    }
  };

  const handleEditDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleEditFile(e.dataTransfer.files[0]);
    }
  };

  const handleEditFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleEditFile(e.target.files[0]);
    }
  };

  // Publish Modal state (other parts lifted up)
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (PNG, JPG, JPEG, GIF, SVG, WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setNewImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Dynamic process steps
  const [processStep1Title, setProcessStep1Title] = useState("Research & Inspiration");
  const [processStep1Desc, setProcessStep1Desc] = useState("Gathered moodboards and reference sheets.");
  const [processStep2Title, setProcessStep2Title] = useState("Blocking & Underpainting");
  const [processStep2Desc, setProcessStep2Desc] = useState("Co-sketched primary layouts collaboratively.");
  const [processStep3Title, setProcessStep3Title] = useState("Refinement & Color Grading");
  const [processStep3Desc, setProcessStep3Desc] = useState("Polished detailed gradients and lighting layers.");

  const handleCommentSubmit = async (portfolioId: string) => {
    const text = commentInputs[portfolioId];
    if (!text || !text.trim()) return;

    await onAddComment(portfolioId, text);
    setCommentInputs((prev) => ({ ...prev, [portfolioId]: "" }));
    // Open comments view
    setExpandedComments((prev) => ({ ...prev, [portfolioId]: true }));
  };

  const handlePublishSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    let finalImage = newImage;
    if (useStudioCanvas && lastCanvasDataURL) {
      finalImage = lastCanvasDataURL;
    } else if (!finalImage) {
      // Unsplash fallback preset
      const presets = [
        "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1549887534-1541e9326642?q=80&w=600&auto=format&fit=crop",
      ];
      finalImage = presets[Math.floor(Math.random() * presets.length)];
    }

    const steps = [
      { title: processStep1Title, description: processStep1Desc },
      { title: processStep2Title, description: processStep2Desc },
      { title: processStep3Title, description: processStep3Desc },
    ];

    await onPublishPortfolio({
      artistId: currentUser.id,
      artistName: currentUser.name,
      artistAvatar: currentUser.avatar,
      title: newTitle,
      description: newDescription,
      imageSrc: finalImage,
      processSteps: steps,
    });

    // Reset Form
    setNewTitle("");
    setNewDescription("");
    setNewImage("");
    setUseStudioCanvas(false);
    setShowPublishModal(false);
  };

  return (
    <div className="space-y-6" id="portfolio-showcase-container">
      {/* Portfolio Header */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div>
          <span className="text-[10px] bg-neon-green text-black font-black uppercase px-2.5 py-1 rounded-sm font-mono tracking-widest">
            Process Timeline Hub
          </span>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase mt-2.5 font-sans">
            Portfolios & Creative Walkthroughs
          </h1>
          <p className="text-xs text-white/60 mt-1 max-w-lg leading-relaxed">
            Where artists post final collaborative murals and showcase step-by-step notes on how the visual was built in real-time.
          </p>
        </div>

        <button
          id="btn-open-publish-modal"
          onClick={() => {
            setShowPublishModal(true);
            if (lastCanvasDataURL) {
              setUseStudioCanvas(true);
            }
          }}
          className="px-5 py-3 bg-neon-green hover:bg-[#00E55C] text-black text-xs font-black uppercase tracking-wider rounded font-mono transition-all flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Plus size={14} />
          <span>Showcase Your Art</span>
        </button>
      </div>

      {/* Portfolios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {portfolios.map((item) => {
          const isLikedByMe = item.likedBy.includes(currentUser.id);
          const showSteps = !!showProcessMap[item.id];
          const showComments = !!expandedComments[item.id];

          return (
            <div
              key={item.id}
              className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between"
              id={`portfolio-card-${item.id}`}
            >
              {/* Card Header (Artist profile details) */}
              <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-xs">
                    {item.artistAvatar}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white">{item.artistName}</h3>
                    <span className="text-[9px] text-white/40 font-mono uppercase tracking-wider block">
                      Artist Portfolio
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.artistId === currentUser.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(item)}
                        title="Edit Showcase Details"
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded border border-white/10 transition-all cursor-pointer"
                      >
                        <Edit size={11} />
                      </button>
                      <button
                        onClick={() => onDeletePortfolio(item.id)}
                        title="Delete Showcase"
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded border border-rose-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-neon-green text-[10px] font-bold bg-neon-green/10 border border-neon-green/20 px-2.5 py-1 rounded font-mono uppercase tracking-wider">
                    <Award size={12} />
                    <span>Mural Project</span>
                  </div>
                </div>
              </div>

              {/* Artwork Media Canvas Preview */}
              <div className="relative group overflow-hidden bg-[#0D0D0D] aspect-video flex items-center justify-center border-b border-white/5">
                <img
                  src={item.imageSrc}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/90 border border-white/10 text-white text-[9px] font-bold rounded flex items-center gap-1 font-mono uppercase tracking-wider">
                  <Sparkles size={10} className="text-neon-green animate-pulse" />
                  <span>Studio Sync</span>
                </div>
              </div>

              {/* Body Metadata */}
              <div className="px-5 py-4 space-y-2">
                <h2 className="text-sm font-black text-white leading-tight uppercase tracking-tight">{item.title}</h2>
                <p className="text-xs text-white/70 leading-relaxed">{item.description}</p>

                {/* Creative Process Steps Toggler */}
                <button
                  id={`btn-toggle-process-${item.id}`}
                  onClick={() =>
                    setShowProcessMap((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                  }
                  className="flex items-center gap-1 text-[10px] font-bold text-neon-green hover:text-[#00E55C] pt-1 font-mono uppercase tracking-wider"
                >
                  <span>{showSteps ? "Hide Process Journey" : "View Process Walkthrough"}</span>
                  <ChevronRight size={12} className={`transition-transform ${showSteps ? "rotate-90" : ""}`} />
                </button>

                {/* Timeline display */}
                {showSteps && (
                  <div className="bg-[#0D0D0D] rounded border border-white/5 p-3.5 space-y-3 mt-2">
                    <h4 className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">
                      Process Steps
                    </h4>
                    <div className="space-y-3 relative border-l border-white/10 pl-4 ml-1">
                      {item.processSteps.map((step, index) => (
                        <div key={index} className="relative">
                          {/* Step number marker */}
                          <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-neon-green border border-black" />
                          <p className="text-[11px] font-bold text-white font-mono">
                            0{index + 1}. {step.title}
                          </p>
                          <p className="text-[10px] text-white/50 mt-0.5">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Likes & Comments Interactive Strip */}
              <div className="px-5 py-3.5 bg-[#0D0D0D] border-t border-white/5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-white/60 font-bold font-mono">
                    <button
                      id={`btn-like-portfolio-${item.id}`}
                      onClick={() => onLikePortfolio(item.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        isLikedByMe ? "text-rose-500" : "hover:text-rose-400 text-white/60"
                      }`}
                    >
                      <Heart size={15} fill={isLikedByMe ? "currentColor" : "none"} />
                      <span>{item.likes} likes</span>
                    </button>

                    <button
                      id={`btn-toggle-comments-${item.id}`}
                      onClick={() =>
                        setExpandedComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                      }
                      className="flex items-center gap-1.5 hover:text-white transition-colors"
                    >
                      <MessageSquare size={15} />
                      <span>{item.comments.length} comments</span>
                    </button>
                  </div>

                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>

                {/* Expanded comments box */}
                {showComments && (
                  <div className="space-y-3.5 pt-3 border-t border-white/5">
                    {item.comments.length > 0 ? (
                      <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                        {item.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2 text-xs">
                            <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 border border-white/10">
                              {comment.userAvatar}
                            </span>
                            <div className="bg-[#111] p-2.5 rounded border border-white/5 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white text-[10px]">{comment.userName}</span>
                                <span className="text-[8px] text-white/40 font-mono">
                                  {new Date(comment.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-white/70 mt-0.5 text-[11px] leading-relaxed">
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-white/40 text-center py-2 font-mono uppercase tracking-wider">
                        No comments yet. Start the conversation!
                      </p>
                    )}

                    {/* New Comment Input */}
                    <div className="flex gap-1.5">
                      <input
                        id={`comment-input-${item.id}`}
                        type="text"
                        placeholder="Write a supportive comment..."
                        value={commentInputs[item.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit(item.id)}
                        className="flex-1 text-[11px] px-3.5 py-2 bg-[#111] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                      />
                      <button
                        id={`btn-send-comment-${item.id}`}
                        onClick={() => handleCommentSubmit(item.id)}
                        className="p-2 bg-neon-green text-black hover:bg-[#00E55C] rounded transition-colors flex items-center justify-center shrink-0"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Publish Portfolio Showcase Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111] rounded-xl p-6 max-w-lg w-full shadow-2xl border border-white/10 overflow-y-auto max-h-[90vh] text-white">
            <h3 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-tight">
              <Plus size={18} className="text-neon-green" />
              <span>Publish Artwork Portfolio</span>
            </h3>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              Share your creative designs, process steps, and completed digital works with other designers searching for collaborators.
            </p>

            <form onSubmit={handlePublishSubmit} className="mt-5 space-y-4">
              {/* Studio Canvas Integration panel */}
              {lastCanvasDataURL && (
                <div className="bg-[#0D0D0D] p-3.5 border border-white/10 rounded flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 bg-black rounded border border-white/10 overflow-hidden shrink-0">
                      <img src={lastCanvasDataURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white">Publish active Studio Drawing</p>
                      <p className="text-[10px] text-white/50">Attach the canvas you just sketched live in real-time!</p>
                    </div>
                  </div>

                  <button
                    id="btn-use-studio-canvas"
                    type="button"
                    onClick={() => setUseStudioCanvas(!useStudioCanvas)}
                    className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 transition-all ${
                      useStudioCanvas ? "bg-neon-green text-black" : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {useStudioCanvas && <Check size={12} />}
                    <span>{useStudioCanvas ? "Attached" : "Attach Draft"}</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Artwork Title *
                </label>
                <input
                  id="publish-art-title"
                  type="text"
                  placeholder="e.g. Dreamy Dusk Meadow"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white font-semibold placeholder-white/20"
                  required
                />
              </div>

              {!useStudioCanvas && (
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">
                    Mural Image Selection
                  </label>
                  
                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded p-5 transition-all text-center flex flex-col items-center justify-center cursor-pointer relative ${
                      dragActive
                        ? "border-neon-green bg-neon-green/5"
                        : newImage.startsWith("data:")
                        ? "border-neon-green/50 bg-[#0A0A0A]"
                        : "border-white/10 hover:border-white/20 bg-[#0D0D0D]"
                    }`}
                    onClick={() => document.getElementById("file-upload-input")?.click()}
                  >
                    <input
                      id="file-upload-input"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    
                    {newImage.startsWith("data:") ? (
                      <div className="space-y-2 pointer-events-none">
                        <div className="w-32 h-20 bg-black rounded border border-white/10 overflow-hidden mx-auto relative">
                          <img src={newImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <p className="text-[11px] text-neon-green font-bold uppercase tracking-wider font-mono">
                          Image uploaded successfully!
                        </p>
                      </div>
                    ) : (
                      <>
                        <Image size={24} className="text-white/40 mb-2 animate-pulse" />
                        <p className="text-xs text-white/80 font-bold">
                          Drag & drop your artwork photo here
                        </p>
                        <p className="text-[10px] text-white/40 mt-1 font-mono uppercase tracking-wider">
                          or click to browse local files
                        </p>
                      </>
                    )}
                  </div>

                  {/* URL Alternative Option */}
                  <div className="pt-1">
                    <span className="block text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono mb-1.5 text-center">
                      — OR PASTE IMAGE URL —
                    </span>
                    <input
                      id="publish-art-image"
                      type="text"
                      placeholder="e.g. https://images.unsplash.com/photo-..."
                      value={newImage.startsWith("data:") ? "" : newImage}
                      onChange={(e) => setNewImage(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Mural Description / Story behind the art *
                </label>
                <textarea
                  id="publish-art-description"
                  placeholder="Describe the art, the room, who you collaborated with, and the core tools/brushes used to achieve the textures..."
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                  required
                />
              </div>

              {/* Step Walkthrough inputs */}
              <div className="bg-[#0D0D0D] border border-white/5 p-3.5 rounded space-y-3">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">
                  Creative Process Stages (Walkthrough)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <input
                      id="process-step-1-title"
                      type="text"
                      placeholder="Stage 1 Title"
                      value={processStep1Title}
                      onChange={(e) => setProcessStep1Title(e.target.value)}
                      className="w-full font-bold bg-[#111] text-white px-2.5 py-1.5 border border-white/10 rounded focus:border-neon-green focus:outline-none"
                    />
                    <textarea
                      id="process-step-1-desc"
                      placeholder="Describe first stage..."
                      rows={1}
                      value={processStep1Desc}
                      onChange={(e) => setProcessStep1Desc(e.target.value)}
                      className="w-full mt-1 bg-[#111] text-white px-2.5 py-1 border border-white/10 rounded text-[11px] focus:border-neon-green focus:outline-none"
                    />
                  </div>

                  <div>
                    <input
                      id="process-step-2-title"
                      type="text"
                      placeholder="Stage 2 Title"
                      value={processStep2Title}
                      onChange={(e) => setProcessStep2Title(e.target.value)}
                      className="w-full font-bold bg-[#111] text-white px-2.5 py-1.5 border border-white/10 rounded focus:border-neon-green focus:outline-none"
                    />
                    <textarea
                      id="process-step-2-desc"
                      placeholder="Describe second stage..."
                      rows={1}
                      value={processStep2Desc}
                      onChange={(e) => setProcessStep2Desc(e.target.value)}
                      className="w-full mt-1 bg-[#111] text-white px-2.5 py-1 border border-white/10 rounded text-[11px] focus:border-neon-green focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <input
                    id="process-step-3-title"
                    type="text"
                    placeholder="Stage 3 Title"
                    value={processStep3Title}
                    onChange={(e) => setProcessStep3Title(e.target.value)}
                    className="w-full text-xs font-bold bg-[#111] text-white px-2.5 py-1.5 border border-white/10 rounded focus:border-neon-green focus:outline-none"
                  />
                  <textarea
                    id="process-step-3-desc"
                    placeholder="Describe third stage..."
                    rows={1.5}
                    value={processStep3Desc}
                    onChange={(e) => setProcessStep3Desc(e.target.value)}
                    className="w-full text-xs mt-1 bg-[#111] text-white px-2.5 py-1 border border-white/10 rounded text-[11px] focus:border-neon-green focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 text-xs border-t border-white/10">
                <button
                  id="btn-close-publish"
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-3 py-2 text-white/60 hover:text-white font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-publish"
                  type="submit"
                  className="px-5 py-2.5 bg-neon-green hover:bg-[#00E55C] text-black font-black uppercase tracking-wider rounded"
                >
                  Publish to Showcase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPortfolio && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#111] border border-white/15 rounded-lg w-full max-w-xl p-6 relative max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] border-b border-white/5 pb-3">
              Edit Showcase Details
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Artwork Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Neon Horizon"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">
                  Mural Image Selection
                </label>

                {/* Drag and Drop Zone for Edit */}
                <div
                  onDragEnter={handleEditDrag}
                  onDragOver={handleEditDrag}
                  onDragLeave={handleEditDrag}
                  onDrop={handleEditDrop}
                  className={`border-2 border-dashed rounded p-5 transition-all text-center flex flex-col items-center justify-center cursor-pointer relative ${
                    editDragActive
                      ? "border-neon-green bg-neon-green/5"
                      : editImage.startsWith("data:")
                      ? "border-neon-green/50 bg-[#0A0A0A]"
                      : "border-white/10 hover:border-white/20 bg-[#0D0D0D]"
                  }`}
                  onClick={() => document.getElementById("edit-file-upload-input")?.click()}
                >
                  <input
                    id="edit-file-upload-input"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleEditFileChange}
                  />

                  {editImage.startsWith("data:") ? (
                    <div className="space-y-2 pointer-events-none">
                      <div className="w-32 h-20 bg-black rounded border border-white/10 overflow-hidden mx-auto relative">
                        <img src={editImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <p className="text-[11px] text-neon-green font-bold uppercase tracking-wider font-mono">
                        Image uploaded successfully!
                      </p>
                    </div>
                  ) : (
                    <>
                      <Image size={24} className="text-white/40 mb-2 animate-pulse" />
                      <p className="text-xs text-white/80 font-bold">
                        Drag & drop your new artwork photo here
                      </p>
                      <p className="text-[10px] text-white/40 mt-1 font-mono uppercase tracking-wider">
                        or click to browse local files
                      </p>
                    </>
                  )}
                </div>

                {/* URL Alternative Option */}
                <div className="pt-1">
                  <span className="block text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono mb-1.5 text-center">
                    — OR PASTE IMAGE URL —
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. https://images.unsplash.com/photo-..."
                    value={editImage.startsWith("data:") ? "" : editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Mural Description / Story behind the art *
                </label>
                <textarea
                  placeholder="Describe the art, the room, who you collaborated with..."
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                  required
                />
              </div>

              {/* Step Walkthrough inputs */}
              <div className="bg-[#0D0D0D] border border-white/5 p-3.5 rounded space-y-3">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest font-mono">
                  Creative Process Stages (Walkthrough)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <input
                      type="text"
                      placeholder="Stage 1 Title"
                      value={editStep1Title}
                      onChange={(e) => setEditStep1Title(e.target.value)}
                      className="w-full font-bold bg-[#111] text-white px-2.5 py-1.5 border border-white/10 rounded focus:border-neon-green focus:outline-none"
                    />
                    <textarea
                      placeholder="Describe first stage..."
                      rows={1}
                      value={editStep1Desc}
                      onChange={(e) => setEditStep1Desc(e.target.value)}
                      className="w-full mt-1 bg-[#111] text-white px-2.5 py-1 border border-white/10 rounded text-[11px] focus:border-neon-green focus:outline-none"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Stage 2 Title"
                      value={editStep2Title}
                      onChange={(e) => setEditStep2Title(e.target.value)}
                      className="w-full font-bold bg-[#111] text-white px-2.5 py-1.5 border border-white/10 rounded focus:border-neon-green focus:outline-none"
                    />
                    <textarea
                      placeholder="Describe second stage..."
                      rows={1}
                      value={editStep2Desc}
                      onChange={(e) => setEditStep2Desc(e.target.value)}
                      className="w-full mt-1 bg-[#111] text-white px-2.5 py-1 border border-white/10 rounded text-[11px] focus:border-neon-green focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Stage 3 Title"
                    value={editStep3Title}
                    onChange={(e) => setEditStep3Title(e.target.value)}
                    className="w-full text-xs font-bold bg-[#111] text-white px-2.5 py-1.5 border border-white/10 rounded focus:border-neon-green focus:outline-none"
                  />
                  <textarea
                    placeholder="Describe third stage..."
                    rows={1.5}
                    value={editStep3Desc}
                    onChange={(e) => setEditStep3Desc(e.target.value)}
                    className="w-full text-xs mt-1 bg-[#111] text-white px-2.5 py-1 border border-white/10 rounded text-[11px] focus:border-neon-green focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 text-xs border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingPortfolio(null)}
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
