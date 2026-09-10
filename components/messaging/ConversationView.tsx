"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createClientSupabase } from "@/lib/supabase-client";
import { Send, Mic, MicOff, Clock, Play, Pause, Image as ImageIcon, X, Search } from "lucide-react";
import CoachVideoRecorder from "@/components/coach/CoachVideoRecorder";
import { safeExternalUrl } from "@/lib/sanitize";
import { triggerAICoachReply } from "@/app/dashboard/client/messages/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  type: "text" | "voice" | "image" | "video";
  content: string | null;
  voice_url: string | null;
  voice_duration_seconds: number | null;
  image_url: string | null;
  video_url: string | null;
  is_read: boolean;
  expires_at: string | null;
  created_at: string;
}

interface Props {
  /** The current logged-in user's ID */
  userId: string;
  /** The other participant's ID */
  peerId: string;
  /** The other participant's display name */
  peerName: string;
  /** The CURRENT user's own display name — used in push notification text sent
   * to the peer ("X t'a envoyé un message"), never the peer's own name. */
  selfName?: string;
  /** conversation_id = clientId always */
  conversationId: string;
  /** Whether the current user is the coach */
  isCoach: boolean;
  /** Push URL for push notification (e.g. /dashboard/coach/messages) */
  pushUrl: string;
  /** false = this user can't send yet (free member waiting on the coach to open the conversation) */
  canSend?: boolean;
  /** true = peerId est un coach IA (lib/ai-coaches.ts) : après un envoi texte, déclenche sa réponse automatique. */
  isPeerAICoach?: boolean;
}

// ── Voice message player ──────────────────────────────────────────────────────

function VoicePlayer({
  url,
  durationSeconds,
  expiresAt,
}: {
  url: string;
  durationSeconds: number | null;
  expiresAt: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hoursLeft = expiresAt
    ? Math.max(
        0,
        Math.floor(
          (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
        )
      )
    : null;

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleToggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => {
        setPlaying(false);
        setElapsed(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    if (playing) {
      audioRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor(audioRef.current?.currentTime ?? 0));
      }, 500);
    }
  }

  const duration = durationSeconds ?? 0;
  const pct = duration > 0 ? Math.min((elapsed / duration) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-2.5 min-w-[160px]">
      <button
        onClick={handleToggle}
        aria-label={playing ? "Mettre en pause" : "Lire"}
        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors"
      >
        {playing ? (
          <Pause size={13} className="text-white" />
        ) : (
          <Play size={13} className="text-white ml-0.5" />
        )}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/70 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-white/60">
            {playing ? `${elapsed}s` : duration > 0 ? `${duration}s` : "vocal"}
          </span>
          {hoursLeft !== null && hoursLeft < 24 && (
            <span className="text-[8px] font-bold text-amber-400 flex items-center gap-0.5">
              <Clock size={8} />
              {hoursLeft}h
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Voice Recorder ────────────────────────────────────────────────────────────

function VoiceRecorderButton({
  onSend,
}: {
  onSend: (blob: Blob, duration: number) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        stream.getTracks().forEach((t) => t.stop());
        onSend(blob, duration);
      };

      recorder.start(250);
      setRecording(true);
      setElapsed(0);
      intervalRef.current = setInterval(
        () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
        500
      );
    } catch {
      // Mic not available
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRecording(false);
  }

  return (
    <button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={(e) => {
        e.preventDefault();
        startRecording();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stopRecording();
      }}
      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all select-none ${
        recording
          ? "bg-red-500 scale-110 shadow-lg shadow-red-500/30"
          : "bg-[#890404]/30 hover:bg-[#890404]/50 text-[#F5EDED]/60"
      }`}
      title={recording ? "Relâcher pour envoyer" : "Maintenir pour enregistrer"} aria-label={recording ? "Relâcher pour envoyer" : "Maintenir pour enregistrer"}
    >
      {recording ? (
        <div className="flex items-center gap-1">
          <MicOff size={14} className="text-white" />
          <span className="text-[9px] font-black text-white">{elapsed}s</span>
        </div>
      ) : (
        <Mic size={16} />
      )}
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
  fromFounder,
}: {
  msg: Message;
  isOwn: boolean;
  /** true si ce message vient du fondateur alors que l'interlocuteur affiché
   * en tête de conversation est quelqu'un d'autre (le fondateur peut écrire
   * dans n'importe quelle conversation pour le support/la modération) —
   * sans ça le message apparaîtrait à tort comme venant du pair habituel. */
  fromFounder?: boolean;
}) {
  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(msg.created_at));

  const isExpired = msg.content === "[Vocal expiré]";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[75%] ${isOwn ? "" : "flex flex-col items-start"}`}>
        {fromFounder && (
          <span
            className="inline-flex items-center rounded-full font-bold uppercase tracking-wide mb-1 text-[8px] px-1.5 py-0.5"
            style={{ background: "rgba(224,30,30,0.12)", border: "1px solid rgba(224,30,30,0.35)", color: "#E01E1E" }}
          >
            Santamaria · Fondateur
          </span>
        )}
      <div
        className={`rounded-2xl px-3.5 py-2.5 ${
          isOwn
            ? "bg-[#E01E1E] rounded-br-sm"
            : "bg-[#3a0a0a] border border-[#890404]/30 rounded-bl-sm"
        }`}
      >
        {msg.type === "voice" && msg.voice_url && !isExpired ? (
          <VoicePlayer
            url={msg.voice_url}
            durationSeconds={msg.voice_duration_seconds}
            expiresAt={msg.expires_at}
          />
        ) : msg.type === "image" && msg.image_url ? (
          <a href={safeExternalUrl(msg.image_url) ?? "#"} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={msg.image_url}
              alt={isOwn ? "Photo envoyée" : "Photo reçue"}
              className="rounded-lg max-w-[220px] max-h-[280px] object-cover"
            />
          </a>
        ) : msg.type === "video" && msg.video_url ? (
          <video src={msg.video_url} controls playsInline className="rounded-lg max-w-[240px] max-h-[300px]" />
        ) : (
          <p
            className={`text-sm leading-relaxed break-words ${
              isExpired ? "text-white/30 italic" : "text-white"
            }`}
            style={{ overflowWrap: "anywhere" }}
          >
            {msg.content ?? ""}
          </p>
        )}
        <p className="text-[8px] mt-1 text-white/40 text-right">{time}</p>
      </div>
      </div>
    </div>
  );
}

// ── Main ConversationView ─────────────────────────────────────────────────────

export default function ConversationView({
  userId,
  peerId,
  peerName,
  selfName,
  conversationId,
  isCoach,
  pushUrl,
  canSend = true,
  isPeerAICoach = false,
}: Props) {
  // Nom à afficher dans les notifications push envoyées au pair — c'est
  // TOUJOURS mon propre nom (l'expéditeur), jamais celui du destinataire.
  const senderFirstName =
    selfName?.split(" ")[0] || (isCoach ? "Ton coach" : "Un membre");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientSupabase();

  // Item 28 : historique facile à retrouver — filtre côté client sur les
  // messages déjà chargés (pas de nouvelle requête réseau à chaque frappe).
  // Ne s'applique qu'aux messages texte : chercher un mot dans une note
  // vocale ou une image n'aurait pas de sens.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTerm = searchQuery.trim().toLowerCase();
  const visibleMessages = searchTerm
    ? messages.filter((m) => m.content?.toLowerCase().includes(searchTerm))
    : messages;

  // Load messages and mark as read
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!cancelled) {
        setMessages((data as Message[]) ?? []);
      }

      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("receiver_id", userId)
        .eq("is_read", false);
    }

    load();

    // Realtime subscription
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read if we're the receiver
          if (newMsg.receiver_id === userId) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendPushNotification(body: string) {
    try {
      const senderName = senderFirstName;
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: peerId,
          title: "EP Coaching : Nouveau message",
          body: `${senderName} : ${body.slice(0, 60)}`,
          url: pushUrl,
        }),
      });
    } catch {
      // non-blocking
    }
  }

  const sendText = useCallback(async () => {
    const content = text.trim();
    if (!content || sending || !canSend) return;
    setSending(true);
    setSendError(null);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        receiver_id: peerId,
        type: "text",
        content,
        is_read: false,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data as Message]);
      setText("");
      await sendPushNotification(content);
      // Coach IA : déclenche sa réponse automatique après coup, jamais dans
      // le chemin qui détermine si LE message du client a réussi ci-dessus.
      if (isPeerAICoach) {
        triggerAICoachReply(peerId).catch(() => {});
      }
    } else {
      setSendError("Message non envoyé, réessaie.");
    }
    setSending(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, sending, canSend, conversationId, userId, peerId, isPeerAICoach]);

  const sendVoice = useCallback(
    async (blob: Blob, duration: number) => {
      if (!canSend) return;
      setSending(true);
      setSendError(null);
      try {
        // Upload to Supabase Storage
        const fileName = `${conversationId}/${userId}-${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("voice-messages")
          .upload(fileName, blob, {
            contentType: blob.type || "audio/webm",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get signed URL (24h expiry)
        const { data: signedData, error: signError } = await supabase.storage
          .from("voice-messages")
          .createSignedUrl(uploadData.path, 24 * 60 * 60);

        if (signError || !signedData) throw signError ?? new Error("Signed URL failed");

        const voiceUrl = signedData.signedUrl;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { data: msgData, error: insertError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            receiver_id: peerId,
            type: "voice",
            content: null,
            voice_url: voiceUrl,
            voice_duration_seconds: duration,
            is_read: false,
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (msgData) {
          setMessages((prev) => [...prev, msgData as Message]);
          await sendPushNotification(`${senderFirstName} t'a envoyé un vocal`);
        }
      } catch {
        setSendError("Échec de l'envoi du vocal, réessaie.");
      }
      setSending(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, userId, peerId, isCoach, peerName, canSend]
  );

  const sendImage = useCallback(
    async (file: File) => {
      if (!canSend) return;
      // MASTERCLASS.md Axe O : le bucket message-images rejette déjà les
      // fichiers trop lourds ou au mauvais type côté serveur, mais sans ce
      // contrôle l'utilisateur attend l'échec de l'upload réseau d'une image
      // de plusieurs dizaines de Mo avant de voir l'erreur.
      if (file.size > 8 * 1024 * 1024) {
        setSendError("Image trop lourde (8 Mo maximum).");
        return;
      }
      setSending(true);
      setSendError(null);
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `${conversationId}/${userId}-${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("message-images")
          .upload(fileName, file, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // message-images est un bucket prive (photos privees entre un client et
        // son coach) : getPublicUrl servait un lien permanent et non authentifie,
        // exactement l'inverse de ce qu'il fallait. createSignedUrl respecte la
        // RLS du bucket (proprietaire ou son coach uniquement), meme pattern que
        // voice_url/video_url plus haut dans ce fichier.
        const { data: signed, error: signError } = await supabase.storage
          .from("message-images")
          .createSignedUrl(uploadData.path, 365 * 24 * 60 * 60);
        if (signError || !signed) throw signError ?? new Error("signed url failed");

        const { data: msgData, error: insertError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            receiver_id: peerId,
            type: "image",
            content: null,
            image_url: signed.signedUrl,
            is_read: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (msgData) {
          setMessages((prev) => [...prev, msgData as Message]);
          await sendPushNotification(`${senderFirstName} t'a envoyé une photo`);
        }
      } catch {
        setSendError("Échec de l'envoi de la photo, réessaie.");
      }
      setSending(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, userId, peerId, isCoach, peerName, canSend]
  );

  // Retour vidéo type Loom (coach uniquement) — voir components/coach/CoachVideoRecorder.tsx.
  const sendVideoMessage = useCallback(
    async (blob: Blob) => {
      setSendError(null);
      const fileName = `${conversationId}/${userId}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("coach-videos")
        .upload(fileName, blob, { contentType: blob.type || "video/webm", upsert: false });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signError } = await supabase.storage
        .from("coach-videos")
        .createSignedUrl(uploadData.path, 30 * 24 * 60 * 60);
      if (signError || !signedData) throw signError ?? new Error("Signed URL failed");

      const { data: msgData, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          receiver_id: peerId,
          type: "video",
          content: null,
          video_url: signedData.signedUrl,
          is_read: false,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      if (msgData) {
        setMessages((prev) => [...prev, msgData as Message]);
        await sendPushNotification(`${senderFirstName} t'a envoyé une vidéo`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, userId, peerId]
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] md:h-[calc(100dvh-0px)] max-h-[800px]">
      {/* Barre de recherche — repliée par défaut pour ne rien changer à
          l'usage courant, juste un bouton discret pour l'ouvrir. */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 border-b border-[#890404]/15">
          {searchOpen ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <Search size={14} className="text-[#F5EDED]/30 flex-shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chercher dans la conversation…" aria-label="Chercher dans la conversation…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#F5EDED]/25 outline-none"
              />
              {searchTerm && (
                <span className="text-[10px] text-[#F5EDED]/30 flex-shrink-0">
                  {visibleMessages.length} résultat{visibleMessages.length !== 1 ? "s" : ""}
                </span>
              )}
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                aria-label="Fermer la recherche"
                className="text-[#F5EDED]/40 hover:text-white flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-[#F5EDED]/30 hover:text-[#F5EDED]/55 transition-colors"
            >
              <Search size={11} /> Chercher dans la conversation
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[#F5EDED]/25 text-center">
              Aucun message pour l&apos;instant.
              <br />
              Démarre la conversation 👋
            </p>
          </div>
        )}
        {messages.length > 0 && visibleMessages.length === 0 && (
          <p className="text-xs text-[#F5EDED]/25 text-center py-8">
            Aucun message ne correspond à ta recherche.
          </p>
        )}
        {visibleMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.sender_id === userId}
            fromFounder={msg.sender_id !== userId && msg.sender_id !== peerId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {sendError && (
        <div className="px-3 pb-1 flex items-center justify-between gap-2">
          <p className="text-[11px] text-red-400">{sendError}</p>
          <button onClick={() => setSendError(null)} aria-label="Fermer le message d'erreur" className="text-red-400/60 hover:text-red-400">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input zone */}
      {!canSend ? (
        <div className="border-t border-[#890404]/20 bg-[#150000] px-4 py-4 text-center">
          <p className="text-[11px] text-[#F5EDED]/35 leading-relaxed">
            Ton coach n&apos;a pas encore ouvert cette conversation.
            <br />
            Tu pourras lui répondre dès qu&apos;il t&apos;aura écrit.
          </p>
        </div>
      ) : (
      <div className="border-t border-[#890404]/20 bg-[#150000] px-3 pt-1.5 pb-3 flex flex-col gap-1">
      <p className="text-[9px] text-[#F5EDED]/25 pl-1">Maintiens l&apos;icône micro pour enregistrer un message vocal.</p>
      <div className="flex items-center gap-2">
        <VoiceRecorderButton onSend={sendVoice} />

        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={sending}
          className="w-10 h-10 rounded-xl bg-[#890404]/30 hover:bg-[#890404]/50 text-[#F5EDED]/60 flex items-center justify-center flex-shrink-0 transition-[background-color,transform] duration-150 active:scale-90"
          title="Envoyer une photo" aria-label="Envoyer une photo"
        >
          <ImageIcon size={16} />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          aria-label="Envoyer une photo"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) sendImage(file);
            e.target.value = "";
          }}
        />

        {isCoach && (
          <CoachVideoRecorder
            onSend={sendVideoMessage}
            triggerLabel=""
            triggerClassName="w-10 h-10 rounded-xl bg-[#890404]/30 hover:bg-[#890404]/50 text-[#F5EDED]/60 flex items-center justify-center flex-shrink-0 transition-colors"
          />
        )}

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText();
            }
          }}
          placeholder={`Message à ${peerName.split(" ")[0]}…`}
          aria-label={`Message à ${peerName.split(" ")[0]}`}
          className="flex-1 min-w-0 bg-[#1f0101] border border-[#890404]/30 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#890404]/60"
        />

        <button
          onClick={sendText}
          disabled={!text.trim() || sending}
          aria-label="Envoyer"
          className="w-10 h-10 rounded-xl bg-[#E01E1E] hover:bg-[#B00202] disabled:bg-[#890404]/30 flex items-center justify-center flex-shrink-0 transition-[background-color,transform] duration-150 active:scale-90"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={15} className="text-white" />
          )}
        </button>
      </div>
      </div>
      )}
    </div>
  );
}
