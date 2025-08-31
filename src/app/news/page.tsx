"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type NewsDoc = {
  _id: { $oid?: string } | string;
  title: string;
  category?: string;
  location?: string;
  brief?: string;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function getId(id: NewsDoc["_id"]): string {
  return typeof id === "string" ? id : id?.$oid || "";
}

export default function NewsListPage() {
  const [data, setData] = useState<Paginated<NewsDoc>>({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateInstructions, setUpdateInstructions] = useState("");
  const [updateApplying, setUpdateApplying] = useState(false);

  const fetchPage = useMemo(
    () => async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/news?page=${p}&pageSize=${pageSize}`);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const j = (await res.json()) as Paginated<NewsDoc>;
        setData(j);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this news item?")) return;
    const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchPage(page);
    }
  }

  async function handleAiUpdate() {
    if (!updatingId) return;
    setUpdateApplying(true);
    try {
      const res = await fetch(`/api/news/${updatingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: updateInstructions }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      // Refresh list to reflect updated Gujarati title/content
      await fetchPage(page);
      setUpdatingId(null);
      setUpdateInstructions("");
    } catch (e) {
      console.error(e);
    } finally {
      setUpdateApplying(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">News History</h1>
        <Link href="/news/new" className="px-4 py-2 rounded bg-foreground text-background">New Report</Link>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {data.items.map((n) => {
            const id = getId(n._id);
            return (
              <div key={id} className="border rounded p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium">{n.title}</h2>
                    <p className="text-xs text-gray-500">
                      {n.category || "General"} {n.location ? `• ${n.location}` : ""} • {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 border rounded" onClick={() => setUpdatingId(id)}>AI Update</button>
                    <button className="px-3 py-1 border rounded" onClick={() => handleDelete(id)}>Delete</button>
                  </div>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm">Show content</summary>
                  <div className="mt-2 text-sm leading-6 overflow-auto whitespace-pre-wrap">
                    {n.content}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button className="px-3 py-1 border rounded" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span className="text-sm">
          Page {data.page} of {data.totalPages}
        </span>
        <button className="px-3 py-1 border rounded" disabled={page >= data.totalPages} onClick={() => setPage((p) => Math.min(data.totalPages || p + 1, p + 1))}>
          Next
        </button>
      </div>

      {updatingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background text-foreground w-full max-w-lg rounded p-4 space-y-3">
            <h3 className="text-lg font-medium">AI Update Instructions</h3>
            <textarea
              className="w-full border rounded px-3 py-2 bg-transparent min-h-[140px]"
              placeholder="Example: Improve clarity of the third paragraph and include the latest official statement."
              value={updateInstructions}
              onChange={(e) => setUpdateInstructions(e.target.value)}
            />
            <div className="flex items-center gap-2 justify-end">
              <button className="px-3 py-1 border rounded" onClick={() => !updateApplying && setUpdatingId(null)} disabled={updateApplying}>
                Cancel
              </button>
              {updateApplying ? (
                <span className="text-sm text-gray-500">Applying...</span>
              ) : (
                <button className="px-3 py-1 rounded bg-foreground text-background" onClick={handleAiUpdate} disabled={updateApplying}>
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
