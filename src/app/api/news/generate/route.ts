import { NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/ai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { GenerateRequestBody, NewsFormat } from "@/types/news";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category, location, brief, baseContent, instructions, format, options } =
      body as GenerateRequestBody;

    const safeTitle = (title && title.trim()) || "સમાચાર રિપોર્ટ";

    const model = getGeminiModel();

    // Helper to normalize content from AI message objects
    const normalizeContent = (ai: { content: unknown }): string =>
      typeof ai.content === "string" ? ai.content : String(ai.content);

    // If baseContent or instructions are provided, treat as rewrite/regenerate flow
    if ((baseContent && baseContent.trim()) || (instructions && instructions.trim())) {
      const system = new SystemMessage(
        "You are a professional Gujarati broadcast news anchor and editor. Rewrite or edit the provided news article per the user's instructions strictly in Gujarati language, maintaining a neutral, formal anchor-style tone. Use markdown format, preserve key facts; if adding, mark as assumptions."
      );
      const user = new HumanMessage(
        `Title: ${safeTitle}\nCategory: ${category ?? "General"}\nLocation: ${location ?? "N/A"}\nBrief/context: ${brief ?? ""}\n\nCurrent article (markdown):\n\n${baseContent ?? ""}\n\nInstructions: ${instructions ?? "Revise and improve clarity keeping the same facts."}\n\nReturn the full updated article in Gujarati only, markdown only. Include a 'સારાંશ' section at the end.`
      );
      const aiRes = await model.invoke([system, user]);
      const content = normalizeContent(aiRes as { content: unknown });
      return NextResponse.json({ content });
    }

    // Fresh generation flow with format-specific prompts
    const system = new SystemMessage(
      "You are a professional Gujarati broadcast news anchor and editor. Write output strictly in Gujarati with a neutral, formal anchor-style tone. Use markdown. Avoid sensationalism. If facts are missing, clearly state assumptions. CRITICAL: Obey the requested structure EXACTLY. For every section that specifies a count (e.g., Top Band, VO Script, Express lines, Rundown stories), output EXACTLY that many items—no more, no less. Do NOT add extra bullets, do NOT omit any. Do NOT leave any numbered item blank; each item must contain a complete, meaningful sentence in Gujarati. Do NOT reorder any pre-listed, numbered, or topic-tagged lines provided in the template."
    );

    const fmt: NewsFormat | undefined = format as NewsFormat | undefined;
    let topBandCount = Math.max(1, Math.min(10, options?.topBandCount ?? (fmt === "SPECIAL" ? 10 : 5)));
    let voCount = Math.max(1, Math.min(12, options?.voCount ?? (fmt === "SPECIAL" ? 10 : 5)));
    const storyCount = Math.max(5, Math.min(40, options?.storyCount ?? 30));

    // AV format has fixed counts: Anchor 7 lines + Top Band 5
    if (fmt === "AV") {
      voCount = 7;
      topBandCount = 5;
    }

    // Heuristic topic inference for Bulletin based on brief
    function inferTopicsFromBrief(text: string | undefined): string[] {
      const t = (text || "").trim();
      if (!t) return ["General"];
      const lines = t.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
      const candidates = lines.length > 1 ? lines : t.split(/\.(\s+|$)/).map(s => s.trim()).filter(Boolean);
      const orderedSet: string[] = [];
      const pushUnique = (label: string) => {
        const L = label.trim();
        if (!L) return;
        if (!orderedSet.includes(L)) orderedSet.push(L);
      };
      for (const s of candidates) {
        const lc = s.toLowerCase();
        if (/(parliament|lok sabha|rajya sabha)/i.test(s)) pushUnique("Parliament");
        else if (/(prime minister|\bpm\b|narendra modi)/i.test(s)) pushUnique("PM");
        else if (/(opposition|walkout)/i.test(s)) pushUnique("Opposition");
        else if (/(cabinet|reshuffle)/i.test(s)) pushUnique("Cabinet");
        else if (/(election commission|poll schedule|election)/i.test(s)) pushUnique("Election");
        else if (/(supreme court|sc\b|plea|judg(e)?ment)/i.test(s)) pushUnique("Supreme Court");
        else if (/(president)/i.test(s)) pushUnique("President");
        else if (/(finance|budget|gst|economy|foreign policy)/i.test(s)) pushUnique("Policy");
        else if (/(cm\b|chief minister|state)/i.test(s)) pushUnique("State");
        else if (/(defen[cs]e)/i.test(s)) pushUnique("Defence");
        else if (/(social media|digital|smart city|governance)/i.test(s)) pushUnique("Governance");
        else pushUnique("General");
      }
      return orderedSet.length ? orderedSet : ["General"];
    }

    let topics: string[];
    if (options?.topics && options.topics.length > 0) {
      topics = options.topics as string[];
    } else if (fmt === "BULLETIN_26M") {
      topics = inferTopicsFromBrief(brief);
    } else {
      topics = ["Accident", "Rain", "Political", "Sports", "Crime"];
    }

    function userPrompt(): string {
      const header = `શીર્ષક: ${safeTitle}\nવિભાગ: ${category ?? "General"}\nસ્થળ: ${location ?? "N/A"}\nસંદર્ભ: ${brief ?? ""}`;
      switch (fmt) {
        case "AV": 
          return `${header}\n\nઆઉટપુટ બંધારણ (Gujarati only, markdown only):\n# ${safeTitle}\n\n## Anchor Script\n(Write a single 300-word paragraph in Gujarati. Do NOT use any numbered format like 1), 2), 3). Write one continuous flowing paragraph with complete sentences and detailed content.)\n\n## Top Band (${topBandCount})\n${Array.from({ length: topBandCount }).map(() => "- ").join("\n")}`;
        case "PKG": {
          const voSections = [];
          for (let i = 0; i < voCount; i++) {
            voSections.push(`## VO Script ${i + 1} (15-line paragraph)\n(Write a single 15-line paragraph in Gujarati)`);
          }
          return `${header}\n\nઆઉટપુટ બંધારણ (Gujarati only, markdown only):\n# ${safeTitle}\n\n## Anchor Opening (2 lines)\n1)\n2)\n\n${voSections.join('\n\n')}\n\n## Anchor Closing Summary (5 lines)\n1)\n2)\n3)\n4)\n5)\n\n## Top Band (${topBandCount})\n${Array.from({ length: topBandCount }).map(() => "- ").join("\n")}`;
        }
        case "AV_GFX":
          return `${header}\n\nઆઉટપુટ બંધારણ (Gujarati only, markdown only):\n# ${safeTitle}\n\n## Story\n(Write a 150-word story in Gujarati. Keep it concise and focused on the key points.)\n\n## Top Bands (${topBandCount})\n${Array.from({ length: topBandCount }).map(() => "- ").join("\n")}`;
        case "EXPRESS":
          return `${header}\n\nઆઉટપુટ બંધારણ (Gujarati only, markdown only):\n# ${safeTitle}\n\n## Express Summary (2 lines)\n1)\n2)`;
        case "BULLETIN_26M": {
          const secs = Math.floor((26 * 60 - 4 * 90) / 30);
          // Distribute storyCount across topics in order, grouped by topic
          const tLen = Math.max(1, topics.length);
          const base = Math.floor(storyCount / tLen);
          const rem = storyCount % tLen;
          const perTopicCounts = topics.map((_, idx) => base + (idx < rem ? 1 : 0));
          let rundown = "";
          let idx = 1;
          for (let ti = 0; ti < tLen; ti++) {
            const topic = topics[ti] || "General";
            const count = perTopicCounts[ti] ?? 0;
            for (let k = 0; k < count; k++) {
              rundown += `\n${idx}) [${topic}] –`;
              idx++;
            }
          }
          return `# ${safeTitle} – 26 મિનિટ બુલેટિન રૂન્ડાઉન\n\n## Rundown (${storyCount} stories)\n(નોંધ: ટોપિક પ્રમાણે ગ્રૂપિંગ કરવું: પહેલા તમામ '${topics[0] ?? "General"}' પછી '${topics[1] ?? ""}' વગેરે. ક્રમ બદલો નહીં અને કુલ આઇટમ્સ બરાબર ${storyCount} જ હોવા જોઇએ.)${rundown}\n\n## Timing Guide\n- Stories 1–6: ~${secs}s/Story\n- Break 1: ~90s\n- Stories 7–12: ~${secs}s/Story\n- Break 2: ~90s\n- Stories 13–18: ~${secs}s/Story\n- Break 3: ~90s\n- Stories 19–24: ~${secs}s/Story\n- Break 4: ~90s\n- Stories 25–30: ~${secs}s/Story`;
        }
        case "SPECIAL": {
          const voSections = [];
          for (let i = 0; i < voCount; i++) {
            voSections.push(`## VO Script ${i + 1} (30-line paragraph)\n(Write a single 30-line paragraph in Gujarati)`);
          }
          return `${header}\n\n# ${safeTitle}\n\n## Anchor Opening (8 lines)\n1)\n2)\n3)\n4)\n5)\n6)\n7)\n8)\n\n${voSections.join('\n\n')}\n\n## Anchor Closing Summary (5 lines)\n1)\n2)\n3)\n4)\n5)\n\n## Top Band (${topBandCount})\n${Array.from({ length: topBandCount }).map(() => "- ").join("\n")}\n\n## Top Band GFX (${topBandCount} × 3 variants)\n${Array.from({ length: topBandCount }).map((_, i) => `${i + 1}) A)  B)  C)`).join("\n")}`;
        }
        // case "SPECIAL":
        //   return `${header}\n\n# ${safeTitle}\n\n## Anchor Opening (8 lines)\n1)\n2)\n3)\n4)\n5)\n6)\n7)\n8)\n\n## VO Script (${voCount} lines)\n${Array.from({ length: voCount }).map((_, i) => `VO-${i + 1})`).join("\n")}\n\n## Anchor Closing Summary (5 lines)\n1)\n2)\n3)\n4)\n5)\n\n## Top Band (${topBandCount})\n${Array.from({ length: topBandCount }).map(() => "- ").join("\n")}\n\n## Top Band GFX (${topBandCount} × 3 variants)\n${Array.from({ length: topBandCount }).map((_, i) => `${i + 1}) A)  B)  C)`).join("\n")}`;
        default:
          // Backward-compatible generic article with summary
          return `Write a complete news report. Output must be in Gujarati only.\nTitle: ${safeTitle}\nCategory: ${category ?? "General"}\nLocation: ${location ?? "N/A"}\nBrief/context: ${brief ?? ""}\n\nRequirements:\n- Use a professional Gujarati news anchor tone: precise, neutral, formal, clear.\n- 6-10 short paragraphs with clear sections and a concise intro.\n- Include key facts, quotes (if not provided, mark as attributed or hypothetical), dates, numbers when relevant.\n- Include a short summary at the end under 'સારાંશ'.\n- Output markdown only and Gujarati only.`;
      }
    }

    const user = new HumanMessage(userPrompt());
    const aiRes = await model.invoke([system, user]);
    let content = normalizeContent(aiRes as { content: unknown });

    // Safety: ensure no blank numbered items for AV anchor lines
    if (fmt === "AV") {
      const filler = "આજના મુખ્ય મુદ્દા પર એક સંક્ષિપ્ત, સ્પષ્ટ વાક્ય.";
      content = content.replace(/^(\s*\d+\)\s*)$/gm, (_, p1: string) => `${p1}${filler}`);
    }

    return NextResponse.json({ content });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("POST /api/news/generate error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
