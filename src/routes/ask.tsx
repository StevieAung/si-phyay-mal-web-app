import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, MapPin, Trash2, Cloud, CloudOff } from "lucide-react";
import { AppShell, BrandHeader } from "@/components/fuel/AppShell";
import { useFuelStore } from "@/lib/fuel/store";
import { MANDALAY_CENTER } from "@/lib/fuel/stations";
import { useGeolocation } from "@/hooks/useGeolocation";
import { answer, type AssistantReply, type StationRef } from "@/lib/fuel/assistant";
import { useSession } from "@/lib/fuel/session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ask")({
  component: AskPage,
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  refs?: StationRef[];
  disclaimer?: string;
}

const SUGGESTIONS: string[] = [
  "အနီးဆုံး ဒီဇယ်ဆိုင်ရှာပေးပါ",
  "95 ဆီရတဲ့ဆိုင်ရှာပေးပါ",
  "92 တန်းစီတိုတဲ့ဆိုင်",
  "ဒီဆိုင်ကို ယုံလို့ရလား?",
  "ဘာကြောင့် ဒီဆိုင်ကို အကြံပြုတာလဲ?",
  "ဒီဇယ်ဆိုင် နှိုင်းယှဉ်ပေးပါ",
];

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: [
    "မင်္ဂလာပါ! ကျွန်ုပ်က **ဆီရှာဖွေရေး လက်ထောက်** ပါ။",
    "အနီးဆုံး ဆီဆိုင်များ၊ တန်းစီအခြေအနေ၊ confidence၊ ဘာကြောင့် အကြံပြုသည် ကို ရှင်းပြပေးနိုင်ပါသည်။",
    "",
    "Community reports မှသာ အခြေခံပါသည်။",
  ].join("\n"),
};

interface ChatRow {
  id: string;
  role: string;
  content: string;
  refs: unknown;
  disclaimer: string | null;
  created_at: string;
}

function rowToMessage(r: ChatRow): ChatMessage {
  return {
    id: r.id,
    role: r.role === "user" ? "user" : "assistant",
    text: r.content,
    refs: Array.isArray(r.refs) ? (r.refs as StationRef[]) : undefined,
    disclaimer: r.disclaimer ?? undefined,
  };
}

function AskPage() {
  const { stations, reports } = useFuelStore();
  const geo = useGeolocation();
  const { profile, phoneE164, openSheet } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const ctx = useMemo(
    () => ({
      stations,
      reports,
      origin: geo.coords ?? MANDALAY_CENTER,
      hasUserLocation: !!geo.coords,
    }),
    [stations, reports, geo.coords],
  );

  // Load persisted history whenever the signed-in profile changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.id || !phoneE164) {
        setMessages([WELCOME]);
        return;
      }
      const { data, error } = await supabase.rpc("get_chat_messages", {
        _id: profile.id,
        _phone: phoneE164,
      });
      if (cancelled) return;
      if (error || !data) {
        setMessages([WELCOME]);
        return;
      }
      const mapped = (data as ChatRow[]).map(rowToMessage);
      setMessages(mapped.length > 0 ? [WELCOME, ...mapped] : [WELCOME]);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, phoneE164]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    const reply: AssistantReply = answer(trimmed, ctx);
    const aiMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: reply.text,
      refs: reply.refs,
      disclaimer: reply.disclaimer,
    };
    setMessages((m) => [...m, userMsg, aiMsg]);
    setInput("");

    // Persist per-account when signed in; otherwise stays local for this session.
    if (profile?.id && phoneE164) {
      const rows = [
        {
          profile_id: profile.id,
          role: "user" as const,
          content: userMsg.text,
        },
        {
          profile_id: profile.id,
          role: "assistant" as const,
          content: aiMsg.text,
          refs: aiMsg.refs ? (JSON.parse(JSON.stringify(aiMsg.refs)) as never) : null,
          disclaimer: aiMsg.disclaimer ?? null,
        },
      ];
      const { error } = await supabase.from("chat_messages").insert(rows);
      if (error) console.error("[chat] insert failed", error);
    }
  }

  async function clearHistory() {
    if (!profile?.id || !phoneE164) {
      setMessages([WELCOME]);
      return;
    }
    const { error } = await supabase.rpc("clear_chat_messages", {
      _id: profile.id,
      _phone: phoneE164,
    });
    if (error) console.error("[chat] clear failed", error);
    setMessages([WELCOME]);
  }

  const signedIn = !!profile?.id && !!phoneE164;
  const hasHistory = messages.length > 1;

  return (
    <AppShell>
      <BrandHeader subtitle="AI လမ်းညွှန် · Fuel Assistant" />

      <div className="mb-2 flex items-center justify-between gap-2">
        {signedIn ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
            <Cloud className="h-3 w-3 text-primary" aria-hidden />
            <span>Account နဲ့ Sync</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => openSheet("phone")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary/40"
          >
            <CloudOff className="h-3 w-3" aria-hidden />
            <span>Sign in to sync chat</span>
          </button>
        )}
        {signedIn && hasHistory && (
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-destructive/40 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" aria-hidden />
            <span>Clear</span>
          </button>
        )}
      </div>

      {!geo.coords && (
        <div className="mb-2 flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden />
          <span>တည်နေရာ မဖွင့်ရသေးပါ · Using Mandalay center</span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto pb-3"
        aria-live="polite"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
      </div>

      {/* Suggested prompts */}
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto pb-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="h-9 shrink-0 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:border-primary/40"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5 shadow-sm"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="မေးမြန်းရန်... ဥပမာ - အနီးဆုံး 95 ဆိုင်"
          className="h-10 flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ fontSize: 16 }}
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!input.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </AppShell>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
          {msg.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 max-w-[85%] flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-2.5 text-sm text-foreground">
          <FormattedText text={msg.text} />
          {msg.refs && msg.refs.length > 0 && (
            <div className="mt-2.5 space-y-1.5 border-t border-border pt-2.5">
              {msg.refs.map((r) => (
                <Link
                  key={`${r.stationId}-${r.fuelType}`}
                  to="/station/$id"
                  params={{ id: r.stationId }}
                  className="flex items-center justify-between rounded-xl border border-border bg-background px-2.5 py-1.5 text-[12px] hover:border-primary/40"
                >
                  <span className="min-w-0 truncate pr-2 font-medium text-foreground">
                    {r.stationName}
                  </span>
                  <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    {r.fuelType}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        {msg.disclaimer && (
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
            {msg.disclaimer}
          </p>
        )}
      </div>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  // Minimal renderer: **bold** and line breaks. No external deps.
  const lines = text.split("\n");
  return (
    <div className="whitespace-pre-wrap break-words">
      {lines.map((line, i) => (
        <div key={i} className={line === "" ? "h-2" : ""}>
          {renderInline(line)}
        </div>
      ))}
    </div>
  );
}

function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
