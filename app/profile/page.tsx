"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type ProfileUser = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
};

type Post = {
  id: string;
  content: string;
  imageUrl: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
  commentsCount: number;
  reactionsCount: number;
};

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    const loadProfile = async () => {
      setLoading(true);

      try {
        const [profileRes, postsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/posts"),
        ]);

        if (profileRes.ok) {
          const profileData = (await profileRes.json()) as ProfileUser;
          setProfile(profileData);
          setForm({
            name: profileData.name ?? "",
            email: profileData.email,
            password: "",
          });
        }

        if (postsRes.ok) {
          const postsData = (await postsRes.json()) as Post[];
          const myPosts = postsData.filter(
            (post) => post.author.email.toLowerCase() === session.user?.email?.toLowerCase()
          );
          setPosts(myPosts);
        }
      } catch (error) {
        console.error("Load profile error", error);
        setMessage({ type: "error", text: "No se pudo cargar tu perfil." });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [status, session?.user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setMessage(null);

    try {
      const payload: Record<string, string> = {};

      if (form.name.trim()) {
        payload.name = form.name.trim();
      }

      if (form.email.trim()) {
        payload.email = form.email.trim().toLowerCase();
      }

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (!payload.name && !payload.email && !payload.password) {
        setMessage({ type: "error", text: "No hay cambios para guardar." });
        return;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar el perfil");
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: data.name ?? prev.name,
              email: data.email ?? prev.email,
              updatedAt: data.updatedAt ?? prev.updatedAt,
            }
          : prev
      );

      setForm((prev) => ({
        ...prev,
        password: "",
      }));

      if (typeof update === "function") {
        await update({
          name: data.name ?? session?.user?.name,
          email: data.email ?? session?.user?.email,
        });
      }

      setMessage({ type: "success", text: "Perfil actualizado correctamente." });
    } catch (error) {
      const text = error instanceof Error ? error.message : "No se pudo guardar el perfil.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5]">
        <p className="text-[#65676B]">Cargando perfil...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
          <h1 className="mb-2 text-2xl font-bold text-[#1877F2]">Mi perfil</h1>
          <p className="mb-6 text-[#65676B]">Inicia sesión para ver tu información.</p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-md bg-[#1877F2] px-4 py-2 font-semibold text-white hover:bg-[#166FE5]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-[#E4E6EB] px-4 py-2 font-semibold text-[#050505] hover:bg-[#D8DADF]"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <nav className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-2 shadow-sm sm:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold text-[#1877F2] hover:underline">
            Volver al feed
          </Link>
          <h1 className="text-xl font-bold text-[#1877F2] sm:text-2xl">Mi perfil</h1>
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-md bg-[#E4E6EB] px-3 py-1.5 text-sm font-semibold text-[#050505] transition hover:bg-[#D8DADF]"
        >
          Cerrar sesión
        </button>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {message && (
          <div
            className={`mb-4 rounded-md border px-4 py-2 text-sm font-medium ${
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1877F2] text-xl font-bold text-white">
                {(profile?.name || profile?.email || session.user?.name || session.user?.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <p className="text-xl font-bold text-[#050505]">
                  {profile?.name || session.user?.name || "Usuario"}
                </p>
                <p className="text-sm text-[#65676B]">{profile?.email || session.user?.email}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-[#E4E6EB] pt-4 text-sm text-[#65676B]">
              <p>
                <span className="font-semibold text-[#050505]">Miembro desde:</span>{" "}
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
              </p>
              <p>
                <span className="font-semibold text-[#050505]">Última actualización:</span>{" "}
                {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </section>

          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-[#050505]">Editar perfil</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-[#050505]">
                  Nombre
                </label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-md border border-[#CED0D4] bg-[#F0F2F5] px-3 py-2 text-[#050505] outline-none focus:border-[#1877F2]"
                  placeholder="Tu nombre visible"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-[#050505]">
                  Correo
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-md border border-[#CED0D4] bg-[#F0F2F5] px-3 py-2 text-[#050505] outline-none focus:border-[#1877F2]"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#050505]">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-md border border-[#CED0D4] bg-[#F0F2F5] px-3 py-2 text-[#050505] outline-none focus:border-[#1877F2]"
                  placeholder="Deja en blanco para mantener la actual"
                />
              </div>

              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-md bg-[#1877F2] px-4 py-2 font-semibold text-white transition hover:bg-[#166FE5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#050505]">Mis publicaciones</h2>
            <span className="rounded-full bg-[#E7F3FF] px-2.5 py-1 text-xs font-semibold text-[#1877F2]">
              {posts.length}
            </span>
          </div>

          {loading ? (
            <p className="text-[#65676B]">Cargando publicaciones...</p>
          ) : posts.length === 0 ? (
            <p className="text-[#65676B]">Todavía no has publicado nada.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article key={post.id} className="rounded-lg border border-[#E4E6EB] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#F0F2F5] px-2 py-1 text-xs font-semibold uppercase text-[#65676B]">
                      {post.category}
                    </span>
                    <small className="text-[#65676B]">
                      {new Date(post.createdAt).toLocaleString()}
                    </small>
                  </div>

                  <p className="whitespace-pre-wrap text-[#050505]">{post.content}</p>

                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="Publicación del usuario"
                      className="mt-3 max-h-[300px] w-full rounded-lg object-cover"
                    />
                  )}

                  <div className="mt-3 flex gap-4 text-sm text-[#65676B]">
                    <span>👍 {post.reactionsCount}</span>
                    <span>💬 {post.commentsCount}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
