import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { posts: true } },
        posts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            _count: { select: { comments: true, reactions: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      createdAt: user.createdAt,
      postsCount: user._count.posts,
      posts: user.posts.map((post) => ({
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        category: post.category,
        createdAt: post.createdAt,
        commentsCount: post._count.comments,
        reactionsCount: post._count.reactions,
      })),
    });
  } catch (error) {
    console.error("Get public profile error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}