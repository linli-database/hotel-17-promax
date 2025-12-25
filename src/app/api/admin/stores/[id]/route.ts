import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

// 获取单个门店详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            rooms: true,
            assignedStaff: { where: { isActive: true } },
            bookings: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: '门店不存在' }, { status: 404 });
    }

    return NextResponse.json({ store });
  } catch (error) {
    console.error('获取门店详情失败:', error);
    return NextResponse.json(
      { error: '获取门店详情失败' },
      { status: 500 }
    );
  }
}

// 更新门店
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以更新门店
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id: storeId } = await params;
    const { name, address, isActive } = await req.json();

    // 检查门店是否存在
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!existingStore) {
      return NextResponse.json({ error: '门店不存在' }, { status: 404 });
    }

    // 检查名称是否与其他门店重复
    if (name && name.trim() !== existingStore.name) {
      const duplicateName = await prisma.store.findFirst({
        where: {
          name: name.trim(),
          NOT: { id: storeId },
        },
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: '已存在同名门店' },
          { status: 400 }
        );
      }
    }

    const updateData: {
      name?: string;
      address?: string | null;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name.trim();
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const store = await prisma.store.update({
      where: { id: storeId },
      data: updateData,
    });

    return NextResponse.json({
      message: '门店更新成功',
      store,
    });
  } catch (error) {
    console.error('更新门店失败:', error);
    return NextResponse.json(
      { error: '更新门店失败' },
      { status: 500 }
    );
  }
}

// 删除门店
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以删除门店
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id: storeId } = await params;

    // 检查门店是否存在
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        _count: {
          select: {
            rooms: true,
            assignedStaff: { where: { isActive: true } },
            bookings: true,
          },
        },
      },
    });

    if (!existingStore) {
      return NextResponse.json({ error: '门店不存在' }, { status: 404 });
    }

    // 检查是否有关联数据
    if (existingStore._count.rooms > 0) {
      return NextResponse.json(
        { error: `该门店下有 ${existingStore._count.rooms} 个房间，无法删除。请先删除或转移房间。` },
        { status: 400 }
      );
    }

    if (existingStore._count.assignedStaff > 0) {
      return NextResponse.json(
        { error: `该门店有 ${existingStore._count.assignedStaff} 名员工，无法删除。请先转移员工。` },
        { status: 400 }
      );
    }

    if (existingStore._count.bookings > 0) {
      return NextResponse.json(
        { error: `该门店有 ${existingStore._count.bookings} 个预订记录，无法删除。` },
        { status: 400 }
      );
    }

    await prisma.store.delete({
      where: { id: storeId },
    });

    return NextResponse.json({ message: '门店删除成功' });
  } catch (error) {
    console.error('删除门店失败:', error);
    return NextResponse.json(
      { error: '删除门店失败' },
      { status: 500 }
    );
  }
}
