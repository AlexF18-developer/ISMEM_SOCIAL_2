"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type PublicPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  category: string;
  createdAt: string;
  commentsCount: number;
  reactionsCount: number;
};

type PublicProfile = {
  id: string;
  name: string | null;
  createdAt: string;
  postsCount: number;
  posts: PublicPost[];
};

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch(`/api/users/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar el perfil.");
        return data as PublicProfile;
      })
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el perfil.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <nav className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 shadow-sm sm:px-8">
        <Link href="/" className="text-lg font-bold text-[#1877F2]">
          ISMEM SOCIAL
        </Link>
        <Link href="/login" className="text-sm font-semibold text-[#1877F2] hover:underline">
          Iniciar sesión
        </Link>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {loading ? (
          <p className="py-10 text-center text-[#65676B]">Cargando perfil...</p>
        ) : error || !profile ? (
          <p className="rounded-lg bg-white p-6 text-center text-red-700 shadow-sm">
            {error || "Perfil no encontrado."}
          </p>
        ) : (
          <>
            <section className="mb-5 flex items-center gap-4 rounded-lg bg-white p-5 shadow-sm">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-2xl font-bold text-white">
                {(profile.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold text-[#050505]">
                  {profile.name || "Usuario"}
                </h1>
                <p className="mt-1 text-sm text-[#65676B]">
                  Miembro desde {new Date(profile.createdAt).toLocaleDateString()} · {profile.postsCount} publicaciones
                </p>
              </div>
            </section>

            <section className="flex flex-col gap-4" aria-label="Publicaciones del usuario">
              {profile.posts.length === 0 ? (
                <p className="rounded-lg bg-white p-6 text-center text-[#65676B] shadow-sm">
                  Este usuario todavía no tiene publicaciones.
                </p>
              ) : (
                profile.posts.map((post) => (
                  <article id={`post-${post.id}`} key={post.id} className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[#F0F2F5] px-2 py-1 text-xs font-semibold uppercase text-[#65676B]">
                        {post.category === "comunicado" ? "Comunicado" : "General"}
                      </span>
                      <time className="text-xs text-[#65676B]">
                        {new Date(post.createdAt).toLocaleString()}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap text-[#050505]">{post.content}</p>
                    {post.imageUrl && (
                      <Image
                        src={post.imageUrl}
                        alt="Imagen de la publicación"
                        width={1200}
                        height={800}
                        sizes="(max-width: 672px) 100vw, 640px"
                        className="mt-3 max-h-[420px] w-full rounded-lg object-cover"
                      />
                    )}
                    <div className="mt-3 flex gap-4 border-t border-[#E4E6EB] pt-3 text-sm text-[#65676B]">
                      <span>👍 {post.reactionsCount}</span>
                      <span>💬 {post.commentsCount}</span>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
