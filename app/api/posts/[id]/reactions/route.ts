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
    const type = typeof body.type === "string" ? body.type : "like";

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    const existingReaction = await prisma.reaction.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId: user.id,
        },
      },
    });

    if (existingReaction) {
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id,
        },
      });

      const count = await prisma.reaction.count({ where: { postId: post.id } });

      return NextResponse.json({
        liked: false,
        type,
        reactionsCount: count,
      });
    }

    await prisma.reaction.create({
      data: {
        type,
        postId: post.id,
        userId: user.id,
      },
    });

    if (post.authorId !== user.id) {
      try {
        await prisma.notification.create({
          data: {
            type: "like",
            recipientId: post.authorId,
            actorId: user.id,
            postId: post.id,
          },
        });
      } catch (notificationError) {
        console.error("Create like notification error:", notificationError);
      }
    }

    const count = await prisma.reaction.count({ where: { postId: post.id } });

    return NextResponse.json({
      liked: true,
      type,
      reactionsCount: count,
    });
  } catch (error) {
    console.error("Toggle reaction error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
