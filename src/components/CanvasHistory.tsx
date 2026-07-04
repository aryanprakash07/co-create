import { CanvasVersion } from "../types";
import { Clock, RefreshCcw, User, Layers } from "lucide-react";

interface CanvasHistoryProps {
  versions: CanvasVersion[];
  onRestoreVersion: (versionId: string) => void;
  currentUser: { id: string; name: string; avatar: string };
}

export default function CanvasHistory({ versions, onRestoreVersion, currentUser }: CanvasHistoryProps) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-5 shadow-2xl space-y-4" id="canvas-version-history">
      {/* History Header */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <div className="p-2 bg-white/5 border border-white/10 text-white rounded">
          <Clock size={16} />
        </div>
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Canvas Versions</h3>
          <p className="text-[10px] text-white/60 font-semibold mt-0.5">Restore drawing history at any time</p>
        </div>
      </div>

      {/* Version check lists */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {versions.length > 0 ? (
          [...versions].reverse().map((version, idx) => {
            return (
              <div
                key={version.id}
                className="p-3 bg-[#0D0D0D] border border-white/5 rounded hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                id={`version-item-${version.id}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{version.name}</span>
                    <span className="text-[9px] bg-neon-green/10 text-neon-green border border-neon-green/20 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5 shrink-0 uppercase tracking-wider font-mono">
                      <Layers size={9} />
                      <span>{version.strokes.length} strokes</span>
                    </span>
                  </div>
                  {version.description && (
                    <p className="text-[11px] text-white/50 leading-relaxed">{version.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/40 font-mono uppercase tracking-wider">
                    <span className="flex items-center gap-0.5">
                      <User size={10} />
                      <span>By {version.creatorName}</span>
                    </span>
                    <span>•</span>
                    <span>{new Date(version.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <button
                  id={`btn-restore-version-${version.id}`}
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to restore the canvas to the checkpoint: "${version.name}"? This will overwrite the current live drawing.`)) {
                      onRestoreVersion(version.id);
                    }
                  }}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] font-bold rounded uppercase tracking-wider font-mono transition-all flex items-center justify-center gap-1 shrink-0"
                >
                  <RefreshCcw size={11} className="text-white/60" />
                  <span>Restore</span>
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-white/40 border border-dashed border-white/10 rounded">
            <Clock size={24} className="mx-auto text-white/20 mb-2" />
            <p className="text-[11px] font-bold text-white uppercase tracking-wider">No Checkpoint Backups yet</p>
            <p className="text-[9px] text-white/40 mt-1 max-w-xs mx-auto leading-relaxed">
              Use the "Save Version" tool inside the canvas belt to secure a history state.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
