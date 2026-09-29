"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  type: "like" | "comment" | string;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; name: string | null };
  post: { id: string; content: string } | null;
};

type InboxResponse = {
  unreadCount: number;
  notifications: NotificationItem[];
};

export default function NotificationsPage() {
  const { status } = useSession();
  const [inbox, setInbox] = useState<InboxResponse>({ unreadCount: 0, notifications: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/notifications")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar las notificaciones.");
        return data as InboxResponse;
      })
      .then(setInbox)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las notificaciones.");
      })
      .finally(() => setLoading(false));
  }, [status]);

  const markRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error("No se pudo actualizar la notificación.");

      setInbox((previous) => ({
        unreadCount: Math.max(0, previous.unreadCount - 1),
        notifications: previous.notifications.map((notification) =>
          notification.id === id
            ? { ...notification, readAt: new Date().toISOString() }
            : notification
        ),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la notificación.");
    }
  };

  const markAllRead = async () => {
    setUpdating(true);
    setError("");

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("No se pudieron marcar como leídas.");

      const now = new Date().toISOString();
      setInbox((previous) => ({
        unreadCount: 0,
        notifications: previous.notifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? now,
        })),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron marcar como leídas.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <nav className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 shadow-sm sm:px-8">
        <Link href="/" className="text-lg font-bold text-[#1877F2]">
          ISMEM SOCIAL
        </Link>
        <Link href="/profile" className="text-sm font-semibold text-[#1877F2] hover:underline">
          Mi perfil
        </Link>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#050505]">Notificaciones</h1>
            <p className="mt-1 text-sm text-[#65676B]">{inbox.unreadCount} sin leer</p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={updating || inbox.unreadCount === 0}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#1877F2] shadow-sm hover:bg-[#E7F3FF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? "Actualizando..." : "Marcar todas leídas"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-8 text-center text-[#65676B]">Cargando notificaciones...</p>
        ) : inbox.notifications.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-[#65676B] shadow-sm">
            Todavía no tienes notificaciones.
          </p>
        ) : (
          <div className="divide-y divide-[#E4E6EB] rounded-lg bg-white shadow-sm">
            {inbox.notifications.map((notification) => {
              const actorName = notification.actor.name || "Un usuario";
              const action = notification.type === "comment" ? "comentó en tu publicación" : "indicó que le gusta tu publicación";

              return (
                <article
                  key={notification.id}
                  className={`flex items-start justify-between gap-3 p-4 ${notification.readAt ? "" : "bg-[#E7F3FF]/60"}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm text-[#050505]">
                      <Link href={`/users/${notification.actor.id}`} className="font-semibold hover:underline">
                        {actorName}
                      </Link>{" "}
                      {action}
                    </p>
                    {notification.post && (
                      <Link
                        href={`/#post-${notification.post.id}`}
                        onClick={() => {
                          if (!notification.readAt) void markRead(notification.id);
                        }}
                        className="mt-1 block truncate text-sm text-[#65676B] hover:text-[#1877F2]"
                      >
                        {notification.post.content}
                      </Link>
                    )}
                    <time className="mt-2 block text-xs text-[#65676B]">
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                  </div>
                  {!notification.readAt && (
                    <button
                      type="button"
                      onClick={() => void markRead(notification.id)}
                      className="shrink-0 text-xs font-semibold text-[#1877F2] hover:underline"
                    >
                      Marcar leída
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
