import { useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

// ── Micro components ──────────────────────────────────────────────────────────

const CheckboxRow = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group">
    <input type="checkbox" checked={checked} onChange={onChange} className="w-3.5 h-3.5 accent-blue-400" />
    <span className="text-xs text-gray-300 group-hover:text-white transition leading-snug">{label}</span>
  </label>
);

const NumberInput = ({ label, value, onChange, min = 0 }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-gray-500">{label}</label>
    <input
      type="number" value={value} min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-[#061a2b] border border-white/10 text-white rounded px-2 py-1 text-xs w-20"
    />
  </div>
);

const SliderInput = ({ label, value, onChange, min, max, step }) => (
  <div className="ml-5 mt-1 mb-1">
    <div className="flex justify-between text-xs text-gray-500 mb-1">
      <span>{label}</span>
      <span className="text-blue-300 font-medium">{value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-blue-400 h-1"
    />
  </div>
);

const StatCard = ({ label, value, accent = false }) => (
  <div className="bg-[#0c2d45] rounded-xl p-4 border border-white/5">
    <p className="text-gray-500 text-xs mb-1">{label}</p>
    <p className={`font-bold text-lg leading-tight ${accent ? "text-red-400" : "text-white"}`}>{value}</p>
  </div>
);

const BarStat = ({ label, percent, color }) => (
  <div className="mb-3 last:mb-0">
    <div className="flex justify-between text-xs mb-1.5">
      <span className="text-gray-300">{label}</span>
      <span className="text-gray-400">{percent}%</span>
    </div>
    <div className="h-1.5 bg-[#061a2b] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
    </div>
  </div>
);

const SideSection = ({ title, subtitle, children }) => (
  <div className="border-b border-white/5 px-5 py-4">
    <p className="text-xs font-semibold text-white mb-0.5">{title}</p>
    {subtitle && <p className="text-xs text-gray-500 mb-3 leading-snug">{subtitle}</p>}
    {!subtitle && <div className="mb-3" />}
    <div className="space-y-2.5">{children}</div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const ImagePage = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [problems, setProblems] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  const [cleaning, setCleaning] = useState({
    remove_corrupted: true, remove_duplicates: true,
    filter_low_res: false, standardize_color: false,
  });
  const [minWidth, setMinWidth] = useState(100);
  const [minHeight, setMinHeight] = useState(100);
  const [colorTarget, setColorTarget] = useState("RGB");

  const [transform, setTransform] = useState({ resize: false, normalize: true });
  const [resizeWidth, setResizeWidth] = useState(640);
  const [resizeHeight, setResizeHeight] = useState(640);
  const [outputFormat, setOutputFormat] = useState("JPEG");

  const [augEnabled, setAugEnabled] = useState(false);
  const [aug, setAug] = useState({
    flip_horizontal: false, flip_vertical: false, rotate: false,
    brightness: false, contrast: false, blur: false, noise: false, zoom_crop: false,
  });
  const [augConfig, setAugConfig] = useState({
    rotate_degrees: 15, brightness_factor: 1.2, contrast_factor: 1.2,
    blur_radius: 1.0, zoom_factor: 0.8,
  });

  const [previewPairs, setPreviewPairs] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [totalAfterFilter, setTotalAfterFilter] = useState(null);
  const [activeRightTab, setActiveRightTab] = useState("profile");

  const buildSteps = () => ({
    ...cleaning, min_width: minWidth, min_height: minHeight, color_target: colorTarget,
    ...transform, resize_width: resizeWidth, resize_height: resizeHeight,
    augmentation: augEnabled, ...aug, ...augConfig,
  });

  const tc = (k) => setCleaning((p) => ({ ...p, [k]: !p[k] }));
  const tt = (k) => setTransform((p) => ({ ...p, [k]: !p[k] }));
  const ta = (k) => setAug((p) => ({ ...p, [k]: !p[k] }));
  const problemCount = problems ? Object.keys(problems).length : 0;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f); setFileName(f?.name || "");
    setSessionId(null); setProfile(null); setProblems(null);
    setRecommendations(null); setPreviewPairs(null); setTotalAfterFilter(null);
  };

  const runAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/image-preprocessing/analyze`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setSessionId(data.session_id); setProfile(data.profile);
      setProblems(data.problems); setRecommendations(data.recommendations);
      setActiveRightTab("profile");
    } catch { alert("Analysis failed. Is the backend running?"); }
    finally { setLoading(false); }
  };

  const runPreview = async () => {
    if (!sessionId) return;
    setPreviewLoading(true); setPreviewPairs(null); setActiveRightTab("preview");
    const fd = new FormData();
    fd.append("session_id", sessionId); fd.append("steps", JSON.stringify(buildSteps()));
    try {
      const res = await fetch(`${API_BASE}/image-preprocessing/preview`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setPreviewPairs(data.pairs); setTotalAfterFilter(data.total_after_filter);
    } catch { alert("Preview failed."); }
    finally { setPreviewLoading(false); }
  };

  const downloadDataset = async () => {
    if (!sessionId) return;
    setDownloadLoading(true);
    const fd = new FormData();
    fd.append("session_id", sessionId); fd.append("steps", JSON.stringify(buildSteps()));
    fd.append("output_format", outputFormat);
    try {
      const res = await fetch(`${API_BASE}/image-preprocessing/download`, { method: "POST", body: fd });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "processed_images.zip"; a.click();
      window.URL.revokeObjectURL(url); setSessionId(null);
    } catch { alert("Download failed."); }
    finally { setDownloadLoading(false); }
  };

  const TABS = [
    { id: "profile",  label: "Profile" },
    { id: "problems", label: `Problems${problemCount > 0 ? ` (${problemCount})` : ""}` },
    { id: "preview",  label: "Preview" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-[#071e2e] text-white flex flex-col overflow-hidden">

      {/* ── HEADER ── */}
      <header className="bg-[#061626] border-b border-white/10 px-8 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 text-lg">🖼</span>
          <div>
            <h1 className="text-sm font-bold leading-none">Image Dataset Pipeline</h1>
            <p className="text-gray-500 text-xs mt-0.5">Upload → Analyze → Configure → Preview → Export</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-xs bg-green-900/40 text-green-400 border border-green-700/30 px-3 py-1 rounded-full">
              ✓ {profile.total_images} images loaded
            </span>
          )}
          {sessionId && (
            <button
              onClick={runPreview}
              disabled={previewLoading}
              className="text-xs bg-[#1A4D6E] hover:bg-[#245d85] px-4 py-1.5 rounded-full transition disabled:opacity-50"
            >
              {previewLoading ? "⏳ Generating..." : "⑥ Generate Preview"}
            </button>
          )}
          {sessionId && (
            <button
              onClick={downloadDataset}
              disabled={downloadLoading}
              className="text-xs bg-purple-700 hover:bg-purple-600 px-4 py-1.5 rounded-full transition disabled:opacity-50"
            >
              {downloadLoading ? "⏳ Packing..." : "⑦ Download ZIP"}
            </button>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR — Controls ── */}
        <aside className="w-72 bg-[#061626] border-r border-white/10 flex flex-col overflow-y-auto shrink-0">

          {/* STAGE 1 — Upload */}
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-xs font-semibold text-white mb-1">① Upload Dataset</p>
            <p className="text-xs text-gray-500 mb-3 leading-snug">ZIP file containing JPG / PNG images.</p>

            <label className="flex items-center gap-2 bg-[#0c2d45] border border-white/10 hover:border-blue-500/50 rounded-lg px-3 py-2 cursor-pointer transition group">
              <span className="text-blue-400 text-sm">📂</span>
              <span className="text-xs text-gray-300 group-hover:text-white truncate transition">
                {fileName || "Choose ZIP file"}
              </span>
              <input type="file" accept=".zip" onChange={handleFileChange} className="hidden" />
            </label>

            <button
              onClick={runAnalysis}
              disabled={!file || loading}
              className="w-full mt-3 py-2 bg-[#1A4D6E] hover:bg-[#245d85] rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {loading ? "⏳ Analyzing..." : "Analyze Dataset"}
            </button>
          </div>

          {/* STAGE 5a — Cleaning */}
          <SideSection title="⑤a Cleaning" subtitle="Remove bad data before transforming.">
            <CheckboxRow label="Remove corrupted files" checked={cleaning.remove_corrupted} onChange={() => tc("remove_corrupted")} />
            <CheckboxRow label="Remove duplicate images" checked={cleaning.remove_duplicates} onChange={() => tc("remove_duplicates")} />
            <CheckboxRow label="Filter low-resolution" checked={cleaning.filter_low_res} onChange={() => tc("filter_low_res")} />
            {cleaning.filter_low_res && (
              <div className="ml-5 flex gap-2 pt-1">
                <NumberInput label="Min W (px)" value={minWidth} onChange={setMinWidth} min={1} />
                <NumberInput label="Min H (px)" value={minHeight} onChange={setMinHeight} min={1} />
              </div>
            )}
            <CheckboxRow label="Standardize color format" checked={cleaning.standardize_color} onChange={() => tc("standardize_color")} />
            {cleaning.standardize_color && (
              <div className="ml-5 flex items-center gap-2">
                <span className="text-xs text-gray-400">To:</span>
                <select value={colorTarget} onChange={(e) => setColorTarget(e.target.value)}
                  className="bg-[#061a2b] text-white border border-white/10 rounded px-2 py-0.5 text-xs">
                  <option value="RGB">RGB</option>
                  <option value="grayscale">Grayscale</option>
                </select>
              </div>
            )}
          </SideSection>

          {/* STAGE 5b — Transformation */}
          <SideSection title="⑤b Transformation" subtitle="Normalize structure and format.">
            <CheckboxRow label="Resize to uniform dimensions" checked={transform.resize} onChange={() => tt("resize")} />
            {transform.resize && (
              <div className="ml-5 flex gap-2 pt-1">
                <NumberInput label="W (px)" value={resizeWidth} onChange={setResizeWidth} min={1} />
                <NumberInput label="H (px)" value={resizeHeight} onChange={setResizeHeight} min={1} />
              </div>
            )}
            <CheckboxRow label="Normalize pixel values (0–1)" checked={transform.normalize} onChange={() => tt("normalize")} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Output:</span>
              <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}
                className="bg-[#061a2b] text-white border border-white/10 rounded px-2 py-0.5 text-xs">
                <option value="JPEG">JPEG</option>
                <option value="PNG">PNG</option>
              </select>
            </div>
          </SideSection>

          {/* STAGE 5c — Augmentation */}
          <SideSection title="⑤c Augmentation" subtitle="Optional — generates visual variants.">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Enable augmentation</span>
              <button
                onClick={() => setAugEnabled(!augEnabled)}
                className={`text-xs px-3 py-1 rounded-full transition font-medium ${augEnabled ? "bg-green-700 text-green-100" : "bg-[#0c2d45] text-gray-400 hover:text-white"}`}
              >
                {augEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {augEnabled && (
              <div className="space-y-2 mt-1 pt-2 border-t border-white/5">
                <CheckboxRow label="Horizontal flip" checked={aug.flip_horizontal} onChange={() => ta("flip_horizontal")} />
                <CheckboxRow label="Vertical flip" checked={aug.flip_vertical} onChange={() => ta("flip_vertical")} />
                <CheckboxRow label="Rotation" checked={aug.rotate} onChange={() => ta("rotate")} />
                {aug.rotate && <SliderInput label="Degrees" value={augConfig.rotate_degrees} onChange={(v) => setAugConfig(p => ({...p, rotate_degrees: v}))} min={1} max={180} step={1} />}
                <CheckboxRow label="Brightness" checked={aug.brightness} onChange={() => ta("brightness")} />
                {aug.brightness && <SliderInput label="Factor" value={augConfig.brightness_factor} onChange={(v) => setAugConfig(p => ({...p, brightness_factor: v}))} min={0.1} max={3.0} step={0.1} />}
                <CheckboxRow label="Contrast" checked={aug.contrast} onChange={() => ta("contrast")} />
                {aug.contrast && <SliderInput label="Factor" value={augConfig.contrast_factor} onChange={(v) => setAugConfig(p => ({...p, contrast_factor: v}))} min={0.1} max={3.0} step={0.1} />}
                <CheckboxRow label="Gaussian blur" checked={aug.blur} onChange={() => ta("blur")} />
                {aug.blur && <SliderInput label="Radius" value={augConfig.blur_radius} onChange={(v) => setAugConfig(p => ({...p, blur_radius: v}))} min={0.1} max={5.0} step={0.1} />}
                <CheckboxRow label="Noise injection" checked={aug.noise} onChange={() => ta("noise")} />
                <CheckboxRow label="Zoom / center crop" checked={aug.zoom_crop} onChange={() => ta("zoom_crop")} />
                {aug.zoom_crop && <SliderInput label="Zoom factor" value={augConfig.zoom_factor} onChange={(v) => setAugConfig(p => ({...p, zoom_factor: v}))} min={0.5} max={1.0} step={0.05} />}
              </div>
            )}
          </SideSection>

        </aside>

        {/* ── RIGHT PANEL — Results ── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#071e2e]">

          {/* Tab bar */}
          {profile && (
            <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-white/10 shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveRightTab(tab.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
                    activeRightTab === tab.id
                      ? "text-white border-blue-400 bg-white/5"
                      : "text-gray-500 border-transparent hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Empty state */}
            {!profile && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-6 opacity-20">🖼</div>
                <h2 className="text-xl font-semibold text-gray-400 mb-2">No dataset loaded</h2>
                <p className="text-gray-600 text-sm max-w-xs">
                  Upload a ZIP file of images using the sidebar and click <strong className="text-gray-400">Analyze Dataset</strong> to begin.
                </p>
                <div className="mt-8 flex flex-col gap-2 text-xs text-gray-600">
                  {["① Upload ZIP", "② View profile & stats", "③ Detect problems", "④ See recommendations",
                    "⑤ Configure pipeline", "⑥ Preview before/after", "⑦ Export processed ZIP"].map((s, i) => (
                    <div key={i} className="flex items-center gap-2"><span className="text-blue-900">→</span>{s}</div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: Profile ──────────────────────────────────────────────── */}
            {profile && activeRightTab === "profile" && (
              <div className="space-y-5">

                {/* Stat row */}
                <div className="grid grid-cols-4 gap-3">
                  <StatCard label="Total Images" value={profile.total_images} />
                  <StatCard
                    label="Size Consistency"
                    value={profile.size_consistent ? "✅ Uniform" : `❌ ${profile.unique_size_count} sizes`}
                    accent={!profile.size_consistent}
                  />
                  <StatCard label="Avg Resolution" value={`${profile.resolution.avg_width}×${profile.resolution.avg_height}`} />
                  <StatCard label="Format" value={Object.keys(profile.format_distribution).join(" + ")} />
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0c2d45] rounded-xl p-5 border border-white/5">
                    <p className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wide">Format Distribution</p>
                    {Object.entries(profile.format_distribution).map(([fmt, pct]) => (
                      <BarStat key={fmt} label={fmt} percent={pct} color="bg-blue-400" />
                    ))}
                  </div>
                  <div className="bg-[#0c2d45] rounded-xl p-5 border border-white/5">
                    <p className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wide">Color Format</p>
                    <BarStat label="RGB" percent={profile.color_format.rgb_percent} color="bg-orange-400" />
                    <BarStat label="Grayscale" percent={profile.color_format.grayscale_percent} color="bg-slate-400" />
                  </div>
                </div>

                {/* Resolution range */}
                <div className="bg-[#0c2d45] rounded-xl p-5 border border-white/5">
                  <p className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wide">Resolution Range</p>
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: "Smallest", w: profile.resolution.min_width, h: profile.resolution.min_height },
                      { label: "Average",  w: profile.resolution.avg_width, h: profile.resolution.avg_height },
                      { label: "Largest",  w: profile.resolution.max_width, h: profile.resolution.max_height },
                    ].map(({ label, w, h }) => (
                      <div key={label}>
                        <p className="text-gray-600 text-xs mb-1">{label}</p>
                        <p className="text-lg font-bold">{w}×{h}</p>
                        <p className="text-gray-500 text-xs">{(w * h / 1000).toFixed(0)}K px</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {recommendations && recommendations.length > 0 && (
                  <div className="bg-[#0c2d45] rounded-xl p-5 border border-white/5">
                    <p className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wide">④ Recommended Steps</p>
                    <div className="grid grid-cols-2 gap-3">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-3 bg-[#071e2e] p-3 rounded-lg border border-white/5">
                          <span className="text-blue-400 text-sm mt-0.5">→</span>
                          <div>
                            <p className="text-xs font-semibold">{rec.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{rec.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Problems ─────────────────────────────────────────────── */}
            {profile && activeRightTab === "problems" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 mb-4">
                  {problemCount > 0
                    ? `${problemCount} issue${problemCount > 1 ? "s" : ""} detected in your dataset.`
                    : "Your dataset passed all quality checks."}
                </p>

                {problemCount === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="text-5xl mb-4">✅</div>
                    <p className="text-gray-400 font-semibold">No problems detected</p>
                    <p className="text-gray-600 text-sm mt-1">Your dataset looks clean and ready to process.</p>
                  </div>
                )}

                {Object.entries(problems).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-4 bg-[#0c2d45] p-4 rounded-xl border border-red-900/30">
                    <div className="w-8 h-8 rounded-lg bg-red-900/40 flex items-center justify-center shrink-0">
                      <span className="text-red-400 text-sm">⚠</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-red-300">{k}</p>
                      <p className="text-gray-400 text-xs mt-1">{v}</p>
                    </div>
                  </div>
                ))}

                {problemCount > 0 && (
                  <p className="text-xs text-gray-600 pt-2">
                    Enable the corresponding fixes in the <strong className="text-gray-400">Cleaning</strong> section of the sidebar.
                  </p>
                )}
              </div>
            )}

            {/* ── TAB: Preview ──────────────────────────────────────────────── */}
            {profile && activeRightTab === "preview" && (
              <div>
                {totalAfterFilter !== null && (
                  <p className="text-xs text-gray-500 mb-5">
                    <span className="text-white font-semibold text-sm">{totalAfterFilter}</span> images will be in the final exported dataset.
                  </p>
                )}

                {!previewPairs && !previewLoading && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="text-5xl mb-4 opacity-30">🔍</div>
                    <p className="text-gray-400 font-semibold">No preview yet</p>
                    <p className="text-gray-600 text-sm mt-1 mb-5">Configure your pipeline steps, then click Generate Preview.</p>
                    <button
                      onClick={runPreview}
                      disabled={!sessionId}
                      className="px-5 py-2 bg-[#1A4D6E] hover:bg-[#245d85] rounded-lg text-sm disabled:opacity-40 transition"
                    >
                      Generate Preview
                    </button>
                    {!sessionId && <p className="text-yellow-500 text-xs mt-3">⚠ Session expired — re-upload your ZIP.</p>}
                  </div>
                )}

                {previewLoading && (
                  <div className="flex items-center justify-center py-24">
                    <p className="text-gray-400 text-sm">⏳ Applying pipeline to sample images...</p>
                  </div>
                )}

                {previewPairs && previewPairs.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-20">All images were filtered out by your cleaning rules.</p>
                )}

                {previewPairs && previewPairs.length > 0 && (
                  <div className="grid grid-cols-2 gap-5">
                    {previewPairs.map((pair, i) => (
                      <div key={i} className="bg-[#0c2d45] rounded-xl overflow-hidden border border-white/5">
                        <div className="px-4 py-2.5 border-b border-white/5">
                          <p className="text-xs font-semibold text-gray-300 truncate">{pair.name}</p>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-white/5">
                          <div className="p-3">
                            <p className="text-xs text-gray-600 mb-2">Before · {pair.before_size} · {pair.before_mode}</p>
                            <img src={`data:image/jpeg;base64,${pair.before}`} alt="before"
                              className="w-full rounded-lg object-cover aspect-video" />
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-blue-400 mb-2">After · {pair.after_size} · {pair.after_mode}</p>
                            <img src={`data:image/jpeg;base64,${pair.after}`} alt="after"
                              className="w-full rounded-lg object-cover aspect-video" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default ImagePage;