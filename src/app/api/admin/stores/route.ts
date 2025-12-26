import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

// 获取门店列表
export async function GET() {
  try {
    const session = await getSession('admin');
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以查看门店列表
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const stores = await prisma.store.findMany({
      include: {
        _count: {
          select: {
            rooms: true,
            assignedStaff: { where: { isActive: true } },
            bookings: { where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ stores });
  } catch (error) {
    console.error('获取门店列表失败:', error);
    return NextResponse.json(
      { error: '获取门店列表失败' },
      { status: 500 }
    );
  }
}

// 创建门店
export async function POST(req: Request) {
  try {
    const session = await getSession('admin');
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以创建门店
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { name, address } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '门店名称不能为空' },
        { status: 400 }
      );
    }

    // 检查门店名称是否重复
    const existingStore = await prisma.store.findFirst({
      where: { name: name.trim() },
    });

    if (existingStore) {
      return NextResponse.json(
        { error: '已存在同名门店' },
        { status: 400 }
      );
    }

    const store = await prisma.store.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
      },
    });

    return NextResponse.json({
      message: '门店创建成功',
      store,
    });
  } catch (error) {
    console.error('创建门店失败:', error);
    return NextResponse.json(
      { error: '创建门店失败' },
      { status: 500 }
    );
  }
}
