"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 10;

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

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
};

export default function Home() {
  const { data: session, status } = useSession();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [postCategory, setPostCategory] = useState("general");
  const [posting, setPosting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");
  const [editingPostCategory, setEditingPostCategory] = useState("general");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [uiMessage, setUiMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const fetchPosts = useCallback(async (nextPage = 1, append = false) => {
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      const res = await fetch(`/api/posts?${params.toString()}`);
      if (!res.ok) {
        setUiMessage({ type: "error", text: "No se pudieron cargar las publicaciones." });
        return;
      }

      const data = (await res.json()) as Post[];
      setPosts((previous) => (append ? [...previous, ...data] : data));
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error("Load posts error", error);
      setUiMessage({ type: "error", text: "No se pudieron cargar las publicaciones." });
    } finally {
      setLoadingPosts(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (status === "authenticated") {
      // State updates happen only after the asynchronous posts request resolves.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchPosts(1);
    }
  }, [status, fetchPosts]);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/notifications")
      .then((response) => response.json())
      .then((data: { unreadCount?: number }) => {
        setUnreadNotifications(Number(data.unreadCount ?? 0));
      })
      .catch((error) => console.error("Load unread notifications error", error));
  }, [status]);

  const loadComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) return;

      const data = (await res.json()) as Comment[];
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: data,
      }));
    } catch (error) {
      console.error("Failed to load comments", error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setUiMessage({ type: "error", text: "Escribe algo antes de publicar." });
      return;
    }

    setPosting(true);
    setUiMessage(null);

    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("category", postCategory);

      if (image) {
        formData.append("image", image);
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setUiMessage({ type: "error", text: data.error || "No se pudo crear la publicación" });
        return;
      }

      setContent("");
      setImage(null);
      setPostCategory("general");
      setUiMessage({ type: "success", text: "Publicación creada correctamente." });
      setLoadingPosts(true);
      await fetchPosts(1);
    } finally {
      setPosting(false);
    }
  };

  const handleCreateComment = async (postId: string) => {
    const value = (commentInputs[postId] ?? "").trim();

    if (!value) {
      setUiMessage({ type: "error", text: "Escribe un comentario antes de enviarlo." });
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: value }),
      });

      if (!res.ok) {
        const data = await res.json();
        setUiMessage({ type: "error", text: data.error || "No se pudo comentar" });
        return;
      }

      setCommentInputs((prev) => ({
        ...prev,
        [postId]: "",
      }));

      setPosts((prev) => prev.map((post) =>
        post.id === postId ? { ...post, commentsCount: post.commentsCount + 1 } : post
      ));
      setUiMessage({ type: "success", text: "Comentario publicado." });
      await loadComments(postId);
    } catch (error) {
      console.error("Create comment error", error);
      setUiMessage({ type: "error", text: "No se pudo comentar en este momento." });
    }
  };

  const startPostEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditingPostContent(post.content);
    setEditingPostCategory(post.category);
  };

  const handleSavePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingPostContent, category: editingPostCategory }),
      });
      const data = await res.json();

      if (!res.ok) {
        setUiMessage({ type: "error", text: data.error || "No se pudo editar la publicación." });
        return;
      }

      setPosts((previous) => previous.map((post) =>
        post.id === postId ? { ...post, content: data.content, category: data.category } : post
      ));
      setEditingPostId(null);
      setUiMessage({ type: "success", text: "Publicación actualizada." });
    } catch (error) {
      console.error("Update post error", error);
      setUiMessage({ type: "error", text: "No se pudo editar la publicación." });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("¿Eliminar esta publicación y sus comentarios?")) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setUiMessage({ type: "error", text: data.error || "No se pudo eliminar la publicación." });
        return;
      }

      setPosts((previous) => previous.filter((post) => post.id !== postId));
      setCommentsByPost((previous) => {
        const next = { ...previous };
        delete next[postId];
        return next;
      });
      setUiMessage({ type: "success", text: "Publicación eliminada." });
    } catch (error) {
      console.error("Delete post error", error);
      setUiMessage({ type: "error", text: "No se pudo eliminar la publicación." });
    }
  };

  const handleSaveComment = async (postId: string, commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingCommentContent }),
      });
      const data = await res.json();

      if (!res.ok) {
        setUiMessage({ type: "error", text: data.error || "No se pudo editar el comentario." });
        return;
      }

      setCommentsByPost((previous) => ({
        ...previous,
        [postId]: previous[postId].map((comment) =>
          comment.id === commentId ? { ...comment, content: data.content } : comment
        ),
      }));
      setEditingCommentId(null);
      setUiMessage({ type: "success", text: "Comentario actualizado." });
    } catch (error) {
      console.error("Update comment error", error);
      setUiMessage({ type: "error", text: "No se pudo editar el comentario." });
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm("¿Eliminar este comentario?")) return;

    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setUiMessage({ type: "error", text: data.error || "No se pudo eliminar el comentario." });
        return;
      }

      setCommentsByPost((previous) => ({
        ...previous,
        [postId]: previous[postId].filter((comment) => comment.id !== commentId),
      }));
      setPosts((previous) => previous.map((post) =>
        post.id === postId
          ? { ...post, commentsCount: Math.max(0, post.commentsCount - 1) }
          : post
      ));
      setUiMessage({ type: "success", text: "Comentario eliminado." });
    } catch (error) {
      console.error("Delete comment error", error);
      setUiMessage({ type: "error", text: "No se pudo eliminar el comentario." });
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "like" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setUiMessage({ type: "error", text: data.error || "No se pudo guardar la reacción" });
        return;
      }

      setLikedPosts((prev) => ({
        ...prev,
        [postId]: !!data.liked,
      }));

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                reactionsCount: Number(data.reactionsCount ?? post.reactionsCount),
              }
            : post
        )
      );

      setUiMessage({ type: "success", text: data.liked ? "Like agregado." : "Like quitado." });
    } catch (error) {
      console.error("Toggle like error", error);
      setUiMessage({ type: "error", text: "No se pudo guardar la reacción en este momento." });
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5]">
        <p className="text-[#65676B]">Cargando...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] px-4">
        <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow-md">
          <h1 className="mb-2 text-3xl font-bold text-[#1877F2]">ISMEM SOCIAL</h1>
          <p className="mb-6 text-[#65676B]">No has iniciado sesión.</p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-md bg-[#1877F2] px-4 py-2 font-semibold text-white transition hover:bg-[#166FE5]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-[#E4E6EB] px-4 py-2 font-semibold text-[#050505] transition hover:bg-[#D8DADF]"
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
        <h1 className="text-xl font-bold text-[#1877F2] sm:text-2xl">ISMEM SOCIAL</h1>

        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="rounded-md bg-[#E7F3FF] px-3 py-1.5 text-sm font-semibold text-[#1877F2] transition hover:bg-[#D9EBFF]"
          >
            Mi perfil
          </Link>
          <Link
            href="/notifications"
            className="relative rounded-md bg-[#F0F2F5] px-3 py-1.5 text-sm font-semibold text-[#050505] transition hover:bg-[#E4E6EB]"
          >
            Notificaciones
            {unreadNotifications > 0 && (
              <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">
                {unreadNotifications}
              </span>
            )}
          </Link>
          <span className="hidden text-sm font-medium text-[#050505] sm:inline">
            {session.user?.name || session.user?.email}
          </span>
          <button
            onClick={() => signOut()}
            type="button"
            className="rounded-md bg-[#E4E6EB] px-3 py-1.5 text-sm font-semibold text-[#050505] transition hover:bg-[#D8DADF]"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {uiMessage && (
          <div
            className={`mb-4 rounded-md border px-4 py-2 text-sm font-medium ${
              uiMessage.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {uiMessage.text}
          </div>
        )}

        <form
          onSubmit={handleCreatePost}
          className="mb-6 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="¿Qué quieres compartir?"
            rows={3}
            className="w-full resize-none rounded-lg border border-[#CED0D4] bg-[#F0F2F5] p-3 text-[#050505] placeholder-[#65676B] focus:border-[#1877F2] focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
          />

          <label className="flex items-center gap-3 text-sm font-medium text-[#050505]">
            Categoría
            <select
              value={postCategory}
              onChange={(e) => setPostCategory(e.target.value)}
              className="rounded-md border border-[#CED0D4] bg-white px-3 py-2"
            >
              <option value="general">Publicación general</option>
              <option value="comunicado">Comunicado</option>
            </select>
          </label>

          <div className="flex items-center justify-between gap-3 border-t border-[#E4E6EB] pt-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="text-sm text-[#65676B] file:mr-3 file:rounded-md file:border-0 file:bg-[#E7F3FF] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#1877F2] hover:file:bg-[#DCEBFE]"
            />

            <button
              type="submit"
              disabled={posting}
              className="rounded-md bg-[#1877F2] px-4 py-1.5 font-semibold text-white transition hover:bg-[#166FE5] disabled:opacity-60"
            >
              {posting ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </form>

        <div className="mb-4 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-[#050505]">
            Mostrar
            <select
              value={selectedCategory}
              onChange={(e) => {
                setLoadingPosts(true);
                setSelectedCategory(e.target.value);
              }}
              className="rounded-md border border-[#CED0D4] bg-white px-3 py-2"
            >
              <option value="all">Todas las categorías</option>
              <option value="general">Publicaciones generales</option>
              <option value="comunicado">Comunicados</option>
            </select>
          </label>
        </div>

        {loadingPosts ? (
          <p className="text-center text-[#65676B]">Cargando publicaciones...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <article id={`post-${post.id}`} key={post.id} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] font-bold text-white">
                      {(post.author.name || post.author.email).charAt(0).toUpperCase()}
                    </div>
                    <Link href={`/users/${post.author.id}`} className="font-semibold text-[#050505] hover:underline">
                      {post.author.name || post.author.email}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <small className="text-[#65676B]">
                      {new Date(post.createdAt).toLocaleString()}
                    </small>
                    {post.author.email.toLowerCase() === session.user?.email?.toLowerCase() && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startPostEdit(post)}
                          className="text-sm font-semibold text-[#1877F2] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="text-sm font-semibold text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {editingPostId === post.id ? (
                  <div className="my-3 flex flex-col gap-2">
                    <textarea
                      value={editingPostContent}
                      onChange={(e) => setEditingPostContent(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-[#CED0D4] bg-[#F0F2F5] p-3 text-[#050505] focus:border-[#1877F2] focus:outline-none"
                    />
                    <select
                      value={editingPostCategory}
                      onChange={(e) => setEditingPostCategory(e.target.value)}
                      className="w-fit rounded-md border border-[#CED0D4] bg-white px-3 py-2"
                    >
                      <option value="general">Publicación general</option>
                      <option value="comunicado">Comunicado</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSavePost(post.id)}
                        className="rounded-md bg-[#1877F2] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#166FE5]"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPostId(null)}
                        className="rounded-md bg-[#E4E6EB] px-3 py-1.5 text-sm font-semibold text-[#050505] hover:bg-[#D8DADF]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="inline-block rounded-full bg-[#F0F2F5] px-2 py-1 text-xs font-semibold uppercase text-[#65676B]">
                      {post.category === "comunicado" ? "Comunicado" : "General"}
                    </span>
                    <p className="my-3 whitespace-pre-wrap text-[#050505]">{post.content}</p>
                  </>
                )}

                {post.imageUrl && (
                  <Image
                    src={post.imageUrl}
                    alt="Contenido de la publicación"
                    width={1200}
                    height={800}
                    sizes="(max-width: 672px) 100vw, 640px"
                    className="max-h-[420px] w-full rounded-lg object-cover"
                  />
                )}

                <div className="mt-3 mb-3 flex flex-wrap gap-2 border-t border-[#E4E6EB] pt-3">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                      likedPosts[post.id]
                        ? "bg-[#1877F2] text-white hover:bg-[#166FE5]"
                        : "bg-[#F0F2F5] text-[#050505] hover:bg-[#E4E6EB]"
                    }`}
                  >
                    👍 {likedPosts[post.id] ? "Quitar like" : "Like"} · {post.reactionsCount}
                  </button>

                  <button
                    type="button"
                    onClick={() => loadComments(post.id)}
                    className="rounded-md bg-[#F0F2F5] px-3 py-1.5 text-sm font-semibold text-[#050505] transition hover:bg-[#E4E6EB]"
                  >
                    💬 Comentarios · {post.commentsCount}
                  </button>
                </div>

                {commentsByPost[post.id] && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-[#E4E6EB] pt-3">
                    {commentsByPost[post.id].length === 0 ? (
                      <p className="text-sm text-[#65676B]">No hay comentarios todavía.</p>
                    ) : (
                      commentsByPost[post.id].map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-2xl bg-[#F0F2F5] px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Link href={`/users/${comment.author.id}`} className="text-sm font-semibold text-[#050505] hover:underline">
                              {comment.author.name || comment.author.email}
                            </Link>
                            {comment.author.email.toLowerCase() === session.user?.email?.toLowerCase() && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditingCommentContent(comment.content);
                                  }}
                                  className="text-xs font-semibold text-[#1877F2] hover:underline"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                  className="text-xs font-semibold text-red-600 hover:underline"
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="mt-2 flex flex-col gap-2">
                              <textarea
                                value={editingCommentContent}
                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                rows={2}
                                className="w-full rounded-md border border-[#CED0D4] bg-white p-2 text-sm text-[#050505]"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveComment(post.id, comment.id)}
                                  className="text-xs font-semibold text-[#1877F2] hover:underline"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCommentId(null)}
                                  className="text-xs font-semibold text-[#65676B] hover:underline"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-0.5 text-sm text-[#050505]">{comment.content}</p>
                          )}
                        </div>
                      ))
                    )}

                    <div className="mt-2 flex gap-2">
                      <input
                        value={commentInputs[post.id] ?? ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Escribe un comentario"
                        className="flex-1 rounded-full border border-[#CED0D4] bg-[#F0F2F5] px-4 py-2 text-sm text-[#050505] placeholder-[#65676B] focus:border-[#1877F2] focus:outline-none focus:ring-1 focus:ring-[#1877F2]"
                      />

                      <button
                        type="button"
                        onClick={() => handleCreateComment(post.id)}
                        className="rounded-full bg-[#1877F2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#166FE5]"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}

            {!loadingPosts && posts.length === 0 && (
              <p className="rounded-lg bg-white p-6 text-center text-[#65676B] shadow-sm">
                No hay publicaciones todavía.
              </p>
            )}

            {hasMore && (
              <button
                type="button"
                onClick={() => {
                  setLoadingMore(true);
                  void fetchPosts(page + 1, true).finally(() => setLoadingMore(false));
                }}
                disabled={loadingMore}
                className="self-center rounded-md bg-white px-5 py-2 text-sm font-semibold text-[#1877F2] shadow-sm hover:bg-[#E7F3FF] disabled:opacity-60"
              >
                {loadingMore ? "Cargando..." : "Cargar más"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}