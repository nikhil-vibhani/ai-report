import { NextRequest, NextResponse } from "next/server";
import { deleteNews, getNewsById, updateNewsContent } from "@/data/newsRepo";
import { withKeyRotation } from "@/lib/ai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const doc = await getNewsById(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await deleteNews(id);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { title, category, location, brief, instructions } = body as {
      title?: string;
      category?: string;
      location?: string;
      brief?: string;
      instructions?: string; // AI rewrite instructions
    };

    let contentUpdate: string | undefined;

    if (typeof instructions === "string" && instructions.trim().length > 0) {
      const existing = await getNewsById(id);
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const system = new SystemMessage(
        "You are a professional Gujarati broadcast news anchor and editor. Rewrite or edit the provided news article per the user's instructions strictly in Gujarati language, maintaining a neutral, formal anchor-style tone. Use markdown format, preserve key facts; if adding, mark as assumptions."
      );
      const user = new HumanMessage(
        `Current article (markdown):\n\n${existing.content}\n\nInstructions: ${instructions}\n\nReturn the full updated article in Gujarati only, markdown only.`
      );
      
      // Use withKeyRotation to handle API key rotation automatically
      contentUpdate = await withKeyRotation(async (model) => {
        const aiRes = await model.invoke([system, user]);
        const normalizeContent = (ai: { content: unknown }): string =>
          typeof ai.content === "string" ? ai.content : String(ai.content);
        return normalizeContent(aiRes as { content: unknown });
      });
    }

    // Prefer deriving Gujarati title from updated content when available
    let finalTitle = title;
    if (contentUpdate) {
      const m = contentUpdate.match(/^#\s+(.+)$/m);
      if (m) {
        finalTitle = m[1].trim();
      }
    }

    const updated = await updateNewsContent(id, {
      ...(finalTitle && finalTitle.trim() ? { title: finalTitle.trim() } : {}),
      ...(typeof category === 'string' ? { category } : {}),
      ...(typeof location === 'string' ? { location } : {}),
      ...(typeof brief === 'string' ? { brief } : {}),
      ...(contentUpdate ? { content: contentUpdate } : {}),
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("PUT /api/news/[id] error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
