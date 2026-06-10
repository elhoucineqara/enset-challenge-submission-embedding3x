/**
 * Realtime service — live student-progress push over WebSocket.
 *
 * Replaces the previous 15s polling on the teacher dashboard:
 *   student workspace  →  publishProgress() (HTTP POST)
 *                      →  agent-gateway /ws/progress broadcast
 *                      →  subscribeProgress() on the teacher dashboard
 *
 * The full TPProgress snapshot travels with every event, so live tracking
 * works across browsers/machines without a shared client-side store.
 */
import { TPProgress } from "@/types";

const AGENT_BASE =
  process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL ?? "http://localhost:8000";

const WS_BASE = AGENT_BASE.replace(/^http/, "ws");

interface ProgressMessage {
  type: string;
  progress: TPProgress;
  at?: string;
}

/** Students call this whenever their progress changes. Fire-and-forget. */
export function publishProgress(progress: TPProgress): void {
  if (typeof window === "undefined") return;
  try {
    fetch(`${AGENT_BASE}/api/agents/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "progress", progress }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore — realtime is best-effort */
  }
}

/**
 * Dashboards subscribe to live progress. Returns an unsubscribe function.
 * Automatically reconnects with backoff until unsubscribed.
 */
export function subscribeProgress(
  onProgress: (progress: TPProgress) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let socket: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (closed) return;
    socket = new WebSocket(`${WS_BASE}/ws/progress`);

    socket.onopen = () => {
      retry = 0;
    };

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ProgressMessage;
        if (msg.type === "progress" && msg.progress) {
          onProgress(msg.progress);
        }
      } catch {
        /* ignore malformed frame */
      }
    };

    socket.onclose = () => {
      if (closed) return;
      const delay = Math.min(1000 * 2 ** retry, 15000);
      retry += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
