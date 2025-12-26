import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

// 获取房型列表（集团级别，与门店无关）
export async function GET() {
  try {
    const session = await getSession('admin');
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以查看房型列表
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const roomTypes = await prisma.roomType.findMany({
      include: {
        _count: {
          select: {
            rooms: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ roomTypes });
  } catch (error) {
    console.error('获取房型列表失败:', error);
    return NextResponse.json(
      { error: '获取房型列表失败' },
      { status: 500 }
    );
  }
}

// 创建房型（集团级别）
export async function POST(req: Request) {
  try {
    const session = await getSession('admin');
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以创建房型
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { name, description, basePrice, capacity, amenities } = await req.json();

    if (!name || basePrice === undefined) {
      return NextResponse.json(
        { error: '房型名称和基础价格不能为空' },
        { status: 400 }
      );
    }

    // 检查房型名称是否重复（全局唯一）
    const existingRoomType = await prisma.roomType.findFirst({
      where: { name },
    });

    if (existingRoomType) {
      return NextResponse.json(
        { error: '已存在同名房型' },
        { status: 400 }
      );
    }

    const roomType = await prisma.roomType.create({
      data: {
        name,
        description: description || null,
        basePrice: String(basePrice),
        capacity: capacity || 2,
        amenities: amenities || [],
      },
    });

    return NextResponse.json({
      message: '房型创建成功',
      roomType,
    });
  } catch (error: unknown) {
    console.error('创建房型失败:', error);
    const message = error instanceof Error ? error.message : '创建房型失败';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}