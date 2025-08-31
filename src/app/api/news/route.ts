import { NextRequest, NextResponse } from "next/server";
import { insertNews, listNews } from "@/data/newsRepo";
import { withKeyRotation } from "@/lib/ai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const data = await listNews(page, pageSize);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category, location, brief, content: providedContent } = body as {
      title?: string;
      category?: string;
      location?: string;
      brief?: string;
      content?: string;
    };
    const safeTitle = (title && title.trim()) || "સમાચાર રિપોર્ટ";

    let content = (providedContent ?? "").trim();
    if (!content) {
      const system = new SystemMessage(
        "You are a professional Gujarati broadcast news anchor and editor. Write complete, factual news reports strictly in Gujarati language with a neutral, formal anchor-style tone. Use markdown with headings and short paragraphs. Avoid sensationalism. If facts are missing, clearly state assumptions."
      );

      const user = new HumanMessage(
        `Write a complete news report. Output must be in Gujarati only.
Title: ${safeTitle}
Category: ${category ?? "General"}
Location: ${location ?? "N/A"}
Brief/context: ${brief ?? ""}

Requirements:
- Use a professional Gujarati news anchor tone: precise, neutral, formal, clear.
- 6-10 short paragraphs with clear sections and a concise intro.
- Include key facts, quotes (if not provided, mark as attributed or hypothetical), dates, numbers when relevant.
- Include a short summary at the end under 'સારાંશ'.
- Output markdown only and Gujarati only.`
      );

      // Use withKeyRotation to handle API key rotation automatically
      content = await withKeyRotation(async (model) => {
        const aiRes = await model.invoke([system, user]);
        const normalizeContent = (ai: { content: unknown }): string =>
          typeof ai.content === "string" ? ai.content : String(ai.content);
        return normalizeContent(aiRes as { content: unknown });
      });
    }

    // Derive title from first markdown heading if present to ensure Gujarati title is stored
    const headingMatch = content.match(/^#\s+(.+)$/m);
    const derivedTitle = headingMatch ? headingMatch[1].trim() : undefined;
    const finalTitle = derivedTitle || safeTitle;
    const saved = await insertNews({ title: finalTitle, category, location, brief, content });
    return NextResponse.json(saved, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("POST /api/news error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
