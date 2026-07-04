import { useRef, useState, useEffect, MouseEvent, TouchEvent } from "react";
import { Stroke, StrokePoint, RoomUser } from "../types";
import { Brush, Eraser, Trash2, Camera, Eye, Plus, ArrowLeftRight, Clock, Undo } from "lucide-react";

interface DrawingCanvasProps {
  strokes: Stroke[];
  activeUsers: RoomUser[];
  onDrawStroke: (stroke: Stroke) => void;
  onClearCanvas: () => void;
  onUndoStroke: () => void;
  onSaveVersion: (name: string, description: string) => void;
  currentUser: { id: string; name: string; avatar: string };
  socket: WebSocket | null;
  roomId: string;
}

export default function DrawingCanvas({
  strokes,
  activeUsers,
  onDrawStroke,
  onClearCanvas,
  onUndoStroke,
  onSaveVersion,
  currentUser,
  socket,
  roomId,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [color, setColor] = useState<string>("#3b82f6");
  const [brushSize, setBrushSize] = useState<number>(5);
  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([]);

  // Track remote cursors
  const [remoteCursors, setRemoteCursors] = useState<{
    [userId: string]: { name: string; avatar: string; x: number; y: number; timestamp: number };
  }>({});

  // Version saving modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [versionDesc, setVersionDesc] = useState("");

  // Clean stale remote cursors
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const cleaned: typeof prev = {};
        Object.keys(prev).forEach((id) => {
          if (now - prev[id].timestamp < 3000) {
            cleaned[id] = prev[id];
          }
        });
        return cleaned;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to remote cursors from the WebSocket if any
  useEffect(() => {
    if (!socket) return;

    const handleSocketMessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "cursor-moved") {
          const { userId, name, avatar, x, y } = parsed.data;
          setRemoteCursors((prev) => ({
            ...prev,
            [userId]: { name, avatar, x, y, timestamp: Date.now() },
          }));
        }
      } catch (err) {
        // Ignored, other messages handled elsewhere
      }
    };

    socket.addEventListener("message", handleSocketMessage);
    return () => {
      socket.removeEventListener("message", handleSocketMessage);
    };
  }, [socket]);

  // Adjust canvas size to parent container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep backup of canvas drawings
        const ctx = canvas.getContext("2d");
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx && ctx) {
          tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = width;
        canvas.height = height;

        // Restore canvas after resize
        if (ctx && tempCtx) {
          ctx.drawImage(tempCanvas, 0, 0);
        }
        redrawAllStrokes();
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [strokes]);

  // Redraw all strokes whenever strokes list updates
  useEffect(() => {
    redrawAllStrokes();
  }, [strokes]);

  const redrawAllStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.5;
    const gridSize = 30;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw all strokes
    strokes.forEach((stroke) => {
      drawStrokeOnContext(ctx, stroke);
    });
  };

  const drawStrokeOnContext = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = stroke.isEraser ? "#0D0D0D" : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.color.startsWith("rgba")) {
      ctx.globalAlpha = 0.4; // Transparency for highlighter
    } else {
      ctx.globalAlpha = 1.0;
    }

    const start = stroke.points[0];
    ctx.moveTo(start.x, start.y);

    if (stroke.points.length === 1) {
      ctx.lineTo(start.x, start.y);
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x, pt.y);
      }
    }

    ctx.stroke();
    ctx.globalAlpha = 1.0; // Reset globalAlpha
  };

  const getCoordinates = (e: any): StrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStartDrawing = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentPoints([coords]);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.strokeStyle = tool === "eraser" ? "#0D0D0D" : tool === "highlighter" ? hexToRgba(color, 0.4) : color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(coords.x, coords.y);
      }
    }
  };

  const handleDrawing = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    // Send cursor coordinates via WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "cursor-move",
          roomId,
          data: {
            userId: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            x: coords.x,
            y: coords.y,
          },
        })
      );
    }

    if (!isDrawing) return;

    setCurrentPoints((prev) => [...prev, coords]);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    }
  };

  const handleStopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length > 0) {
      const newStroke: Stroke = {
        id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        points: currentPoints,
        color: tool === "eraser" ? "#0D0D0D" : tool === "highlighter" ? hexToRgba(color, 0.4) : color,
        width: brushSize,
        isEraser: tool === "eraser",
        userId: currentUser.id,
        userName: currentUser.name,
      };

      onDrawStroke(newStroke);
    }

    setCurrentPoints([]);
    redrawAllStrokes();
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const colors = [
    "#ffffff", // White
    "#00FF66", // Neon Green
    "#3b82f6", // Electric Blue
    "#ef4444", // Neon Red
    "#f59e0b", // Amber Yellow
    "#8b5cf6", // Orchid Purple
    "#ec4899", // Cotton Pink
    "#06b6d4", // Electric Cyan
  ];

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL("image/png");
    
    // Create temporary link and download
    const link = document.createElement("a");
    link.download = `cocreate-art-${roomId}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleSaveVersionSubmit = () => {
    if (!versionName.trim()) return;
    onSaveVersion(versionName, versionDesc);
    setVersionName("");
    setVersionDesc("");
    setShowSaveModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] relative border border-white/10 rounded-xl overflow-hidden" id="drawing-studio-container">
      {/* Canvas Tool Belt */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 bg-[#111] border-b border-white/10">
        {/* Tool selector */}
        <div className="flex items-center gap-1.5 bg-[#0D0D0D] p-1 rounded border border-white/5 font-mono">
          <button
            id="tool-pen"
            onClick={() => setTool("pen")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
              tool === "pen" ? "bg-neon-green text-black font-extrabold" : "text-white/60 hover:text-white"
            }`}
          >
            <Brush size={14} />
            <span>Brush</span>
          </button>
          <button
            id="tool-highlighter"
            onClick={() => setTool("highlighter")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
              tool === "highlighter" ? "bg-neon-green text-black font-extrabold" : "text-white/60 hover:text-white"
            }`}
          >
            <div className={`w-3 h-3 rounded-sm ${tool === "highlighter" ? "bg-black" : "bg-neon-green"}`} />
            <span>Glow Marker</span>
          </button>
          <button
            id="tool-eraser"
            onClick={() => setTool("eraser")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
              tool === "eraser" ? "bg-neon-green text-black font-extrabold" : "text-white/60 hover:text-white"
            }`}
          >
            <Eraser size={14} />
            <span>Eraser</span>
          </button>
        </div>

        {/* Color Palette */}
        {tool !== "eraser" && (
          <div className="flex items-center gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border transition-all hover:scale-110 ${
                  color === c ? "ring-2 ring-neon-green scale-110" : "border-white/10"
                }`}
                aria-label={`Color ${c}`}
              />
            ))}
            {/* Custom color picker */}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 p-0 rounded-full border border-white/20 cursor-pointer overflow-hidden bg-transparent"
              title="Custom Color"
            />
          </div>
        )}

        {/* Brush weight selector */}
        <div className="flex items-center gap-2 font-mono">
          <span className="text-xs font-bold uppercase text-white/50 tracking-wider">Size:</span>
          <input
            id="brush-size-input"
            type="range"
            min="1"
            max="40"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-20 md:w-28 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-neon-green"
          />
          <span className="text-xs font-bold font-mono bg-white/5 px-2 py-0.5 rounded text-neon-green w-10 text-center border border-white/5">
            {brushSize}px
          </span>
        </div>

        {/* Control Actions */}
        <div className="flex items-center gap-1.5 ml-auto font-mono">
          <button
            id="btn-undo-stroke"
            onClick={onUndoStroke}
            disabled={strokes.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors border border-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
            title="Undo last stroke"
          >
            <Undo size={13} />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            id="btn-save-version"
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors border border-white/10"
            title="Commit version history"
          >
            <Clock size={13} />
            <span className="hidden sm:inline">Save Version</span>
          </button>
          <button
            id="btn-export-png"
            onClick={handleExportPNG}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors border border-white/10"
            title="Download Canvas PNG"
          >
            <Camera size={13} />
            <span className="hidden sm:inline">Export PNG</span>
          </button>
          <button
            id="btn-clear-canvas"
            onClick={onClearCanvas}
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs font-bold uppercase tracking-wider transition-colors border border-rose-500/20"
            title="Clear all strokes"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Clear Canvas</span>
          </button>
        </div>
      </div>

      {/* Canvas viewport & Remote cursor anchors */}
      <div ref={containerRef} className="flex-1 relative bg-[#0D0D0D] overflow-hidden cursor-crosshair select-none touch-none border-b border-white/5">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStartDrawing}
          onMouseMove={handleDrawing}
          onMouseUp={handleStopDrawing}
          onMouseLeave={handleStopDrawing}
          onTouchStart={handleStartDrawing}
          onTouchMove={handleDrawing}
          onTouchEnd={handleStopDrawing}
          className="absolute inset-0 w-full h-full block"
        />

        {/* Remote Cursors Layer */}
        {Object.entries(remoteCursors).map(([id, item]) => {
          const data = item as { name: string; avatar: string; x: number; y: number; timestamp: number };
          if (id === currentUser.id) return null;
          return (
            <div
              key={id}
              className="absolute pointer-events-none transition-all duration-75 select-none z-10"
              style={{ left: data.x, top: data.y }}
            >
              {/* Cursor cursor dot */}
              <div className="w-3 h-3 bg-neon-green rounded-full border border-black shadow-md transform -translate-x-1.5 -translate-y-1.5" />
              {/* User badge */}
              <div className="ml-2 mt-1 px-2.5 py-1 bg-black/95 border border-white/10 text-white text-[10px] font-bold rounded flex items-center gap-1 shadow-md whitespace-nowrap font-mono uppercase tracking-wider">
                <span>{data.avatar}</span>
                <span>{data.name}</span>
              </div>
            </div>
          );
        })}

        {/* Interactive Drawing Guide overlay when canvas is pristine */}
        {strokes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white/40 p-6 text-center">
            <Brush size={36} className="text-neon-green/40 mb-3 animate-bounce" />
            <p className="text-sm font-bold uppercase tracking-wider text-white">The Canvas is Empty</p>
            <p className="text-xs text-white/50 mt-1 max-w-xs leading-relaxed">
              Draw anywhere! Your strokes, brush weight, and color updates are synchronized with all active members in real-time.
            </p>
          </div>
        )}
      </div>

      {/* Save Version History Modal */}
      {showSaveModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111] rounded-xl p-5 max-w-sm w-full shadow-2xl border border-white/10 text-white">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider font-sans">
              <Clock size={16} className="text-neon-green" />
              <span>Commit Canvas Version</span>
            </h3>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              Create a checkpoint of the canvas. You can restore this state at any time if you make mistakes later.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Version Title *
                </label>
                <input
                  id="version-title-input"
                  type="text"
                  placeholder="e.g. Skyline Layout Sketch"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white font-semibold placeholder-white/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 font-mono">
                  Description / Process Notes
                </label>
                <textarea
                  id="version-desc-input"
                  placeholder="e.g. Hand-sketched foreground buildings with primary layout guidelines..."
                  rows={2}
                  value={versionDesc}
                  onChange={(e) => setVersionDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#0D0D0D] border border-white/10 rounded focus:outline-none focus:border-neon-green text-white placeholder-white/20"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 text-xs border-t border-white/5 pt-3">
              <button
                id="btn-cancel-save-version"
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-2 text-white/60 hover:text-white font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                id="btn-submit-save-version"
                onClick={handleSaveVersionSubmit}
                disabled={!versionName.trim()}
                className="px-4 py-2 bg-neon-green hover:bg-[#00E55C] text-black font-black uppercase tracking-wider rounded disabled:opacity-45"
              >
                Save Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
