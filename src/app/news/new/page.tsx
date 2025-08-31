"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GenerateRequestOptions, NewsFormat } from "@/types/news";

export default function NewNewsPage() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [regenInstructions, setRegenInstructions] = useState("");
  const [showForm, setShowForm] = useState(true);
  // New: generation format and options
  const [format, setFormat] = useState<NewsFormat>("EXPRESS");
  const [voCount, setVoCount] = useState<number>(5);
  const [topBandCount, setTopBandCount] = useState<number>(5);
  const [storyCount, setStoryCount] = useState<number>(30);


  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    try {
      const options: GenerateRequestOptions = {
        voCount: Number.isFinite(voCount) ? voCount : undefined,
        topBandCount: Number.isFinite(topBandCount) ? topBandCount : undefined,
        storyCount: Number.isFinite(storyCount) ? storyCount : undefined,
      };
      const res = await fetch("/api/news/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, format, options }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed: ${res.status}`);
      }
      const j = await res.json();
      const next = j.content || "";
      setContent(next);
      setShowForm(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    setError(null);
    setGenerating(true);
    try {
      const options: GenerateRequestOptions = {
        voCount: Number.isFinite(voCount) ? voCount : undefined,
        topBandCount: Number.isFinite(topBandCount) ? topBandCount : undefined,
        storyCount: Number.isFinite(storyCount) ? storyCount : undefined,
      };
      const res = await fetch("/api/news/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, baseContent: content, instructions: regenInstructions, format, options }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed: ${res.status}`);
      }
      const j = await res.json();
      const next = j.content || "";
      setContent(next);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, content }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed: ${res.status}`);
      }
      router.push("/news");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-semibold text-center">Create AI News Report</h1>

      {/* Pre-generate: center form as a card */}
      {showForm && !content && (
        <form onSubmit={handleGenerate} className="mx-auto w-full max-w-3xl space-y-5 border rounded-xl p-5 sm:p-6 shadow-sm">
          <div>
            <div className="mb-2 space-y-2">
              <div className="w-full max-w-xs">
                <label className="block text-sm font-medium" htmlFor="format">Format</label>
                <div className="relative">
                  <select
                    id="format"
                    className="w-full appearance-none rounded px-3 pr-10 py-2 border border-foreground/20 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as NewsFormat)}
                  >
                    <option value="EXPRESS">Express (2 lines)</option>
                    <option value="AV">AV (7 lines + 5 top band)</option>
                    <option value="PKG">PKG (Anchor+VO+Closing+TopBand)</option>
                    <option value="AV_GFX">AV GFX (Top band 5-10)</option>
                    <option value="BULLETIN_26M">Bulletin 26m (30 stories)</option>
                    <option value="SPECIAL">Special (Anchor+10 VO+Closing+GFX)</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-foreground/60">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.957a.75.75 0 111.1 1.02l-4.25 4.53a.75.75 0 01-1.1 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            {(format === "PKG" || format === "AV_GFX" || format === "SPECIAL") && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                {format !== "AV_GFX" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">VO Count</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="w-full border rounded px-3 py-2 bg-transparent"
                      value={voCount}
                      onChange={(e) => setVoCount(parseInt(e.target.value || "0", 10))}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Top Band Count</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="w-full border rounded px-3 py-2 bg-transparent"
                    value={topBandCount}
                    onChange={(e) => setTopBandCount(parseInt(e.target.value || "0", 10))}
                  />
                </div>
              </div>
            )}
            {format === "BULLETIN_26M" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Story Count</label>
                  <input
                    type="number"
                    min={5}
                    max={40}
                    className="w-full border rounded px-3 py-2 bg-transparent"
                    value={storyCount}
                    onChange={(e) => setStoryCount(parseInt(e.target.value || "0", 10))}
                  />
                </div>
              </div>
            )}
            <label htmlFor="brief" className="block text-sm font-medium">Brief / Context</label>
            <textarea
              className="w-full border rounded px-3 py-2 bg-transparent min-h-[120px]"
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Key facts, sources, angle"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded border"
              onClick={() => router.push("/news")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="px-4 py-2 rounded bg-foreground text-background disabled:opacity-60"
            >
              {generating ? "Generating..." : "Generate Preview"}
            </button>
          </div>
        </form>
      )}

      {/* Post-generate: preview-focused layout */}
      {content && (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 items-start`}>
          {showForm && (
            <form onSubmit={handleGenerate} className="space-y-4 lg:col-span-1 border rounded-xl p-4 sm:p-5 shadow-sm">
              <div>
                <div className="mb-2 space-y-2">
                  <label htmlFor="brief-post" className="block text-sm font-medium">Brief / Context</label>
                  <div className="w-full max-w-xs">
                    <label className="block text-xs text-foreground/70 mb-1" htmlFor="format-post">Format</label>
                    <div className="relative">
                      <select
                        id="format-post"
                        className="w-full appearance-none rounded px-3 pr-10 py-2 border border-foreground/20 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
                        value={format}
                        onChange={(e) => setFormat(e.target.value as NewsFormat)}
                      >
                        <option value="EXPRESS">Express (2 lines)</option>
                        <option value="AV">AV (7 lines + 5 top band)</option>
                        <option value="PKG">PKG (Anchor+VO+Closing+TopBand)</option>
                        <option value="AV_GFX">AV GFX (Top band 5-10)</option>
                        <option value="BULLETIN_26M">Bulletin 26m (30 stories)</option>
                        <option value="SPECIAL">Special (Anchor+10 VO+Closing+GFX)</option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-foreground/60">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.957a.75.75 0 111.1 1.02l-4.25 4.53a.75.75 0 01-1.1 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
                {(format === "PKG" || format === "AV_GFX" || format === "SPECIAL") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {format !== "AV_GFX" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">VO Count</label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          className="w-full border rounded px-3 py-2 bg-transparent"
                          value={voCount}
                          onChange={(e) => setVoCount(parseInt(e.target.value || "0", 10))}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Top Band Count</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        className="w-full border rounded px-3 py-2 bg-transparent"
                        value={topBandCount}
                        onChange={(e) => setTopBandCount(parseInt(e.target.value || "0", 10))}
                      />
                    </div>
                  </div>
                )}
                {format === "BULLETIN_26M" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Story Count</label>
                      <input
                        type="number"
                        min={5}
                        max={40}
                        className="w-full border rounded px-3 py-2 bg-transparent"
                        value={storyCount}
                        onChange={(e) => setStoryCount(parseInt(e.target.value || "0", 10))}
                      />
                    </div>
                  </div>
                )}
                <textarea
                  className="w-full border rounded px-3 py-2 bg-transparent min-h-[120px]"
                  id="brief-post"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1 rounded border"
                >
                  Hide details
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  className="px-4 py-2 rounded border"
                  onClick={() => router.push("/news")}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div
            className={`space-y-3 border rounded-xl p-3 sm:p-5 shadow-sm ${
              showForm ? "lg:col-span-2" : "lg:col-span-3"
            }`}
          >
            <h2 className="text-lg font-medium">Preview & Edit</h2>
            <textarea
              className="w-full border rounded px-3 py-2 bg-transparent min-h-[420px] lg:min-h-[520px] font-mono text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium">Regenerate Instructions (optional)</label>
              <textarea
                className="w-full border rounded px-3 py-2 bg-transparent min-h-[100px]"
                placeholder="Example: Add official statement, clarify numbers, shorten intro..."
                value={regenInstructions}
                onChange={(e) => setRegenInstructions(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {!showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="px-3 py-1 rounded border"
                >
                  Edit details
                </button>
              )}
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={generating}
                className="px-3 py-1 rounded border"
              >
                {generating ? "Regenerating..." : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={() => setRegenInstructions("")}
                className="px-3 py-1 rounded border"
              >
                Clear Instructions
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleSave}
                disabled={true}
                // disabled={loading || !content.trim()}
                className="px-4 py-2 rounded bg-foreground text-background disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
