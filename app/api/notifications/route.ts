import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          actor: { select: { id: true, name: true } },
          post: { select: { id: true, content: true } },
        },
      }),
      prisma.notification.count({ where: { recipientId: user.id, readAt: null } }),
    ]);

    return NextResponse.json({
      unreadCount,
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        actor: notification.actor,
        post: notification.post,
      })),
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const where = body.all === true
      ? { recipientId: user.id, readAt: null }
      : typeof body.id === "string"
        ? { id: body.id, recipientId: user.id, readAt: null }
        : null;

    if (!where) {
      return NextResponse.json({ error: "Indica una notificación válida" }, { status: 400 });
    }

    const result = await prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Update notifications error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}