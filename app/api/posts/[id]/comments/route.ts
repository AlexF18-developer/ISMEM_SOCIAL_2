import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "El contenido del comentario es obligatorio" },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        postId: post.id,
        authorId: user.id,
      },
      include: {
        author: true,
      },
    });

    if (post.authorId !== user.id) {
      try {
        await prisma.notification.create({
          data: {
            type: "comment",
            recipientId: post.authorId,
            actorId: user.id,
            postId: post.id,
          },
        });
      } catch (notificationError) {
        console.error("Create comment notification error:", notificationError);
      }
    }

    return NextResponse.json(
      {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        comments: {
          orderBy: { createdAt: "desc" },
          include: {
            author: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    return NextResponse.json(
      post.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
        },
      }))
    );
  } catch (error) {
    console.error("List comments error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
