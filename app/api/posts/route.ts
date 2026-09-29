import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

async function saveUploadedImage(file: File) {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const extension = path.extname(file.name) || ".png";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  const filePath = path.join(uploadDir, safeName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return `/uploads/${safeName}`;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const content = String(formData.get("content") ?? "").trim();
    const file = formData.get("image");
    const category = String(formData.get("category") ?? "general").trim() || "general";

    if (!content) {
      return NextResponse.json(
        { error: "El contenido de la publicación es obligatorio" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    let imageUrl: string | null = null;

    if (file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "El archivo debe ser una imagen" },
          { status: 400 }
        );
      }

      imageUrl = await saveUploadedImage(file);
    }

    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        category,
        authorId: user.id,
      },
      include: {
        author: true,
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        category: post.category,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: {
          id: post.author.id,
          name: post.author.name,
          email: post.author.email,
        },
        commentsCount: post._count.comments,
        reactionsCount: post._count.reactions,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const pageValue = Number(searchParams.get("page") ?? 1);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = 10;

    const posts = await prisma.post.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: "desc" },
      ...(searchParams.has("page") ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      include: {
        author: true,
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    return NextResponse.json(
      posts.map((post) => ({
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        category: post.category,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: {
          id: post.author.id,
          name: post.author.name,
          email: post.author.email,
        },
        commentsCount: post._count.comments,
        reactionsCount: post._count.reactions,
      }))
    );
  } catch (error) {
    console.error("List posts error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
