import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';

// 获取单个房型
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession('admin');
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const roomType = await prisma.roomType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            rooms: true,
            bookings: true,
          },
        },
      },
    });

    if (!roomType) {
      return NextResponse.json({ error: '房型不存在' }, { status: 404 });
    }

    return NextResponse.json({ roomType });
  } catch (error) {
    console.error('获取房型失败:', error);
    return NextResponse.json(
      { error: '获取房型失败' },
      { status: 500 }
    );
  }
}

// 更新房型
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession('admin');
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以更新房型
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id: roomTypeId } = await params;
    const { name, description, basePrice, capacity, amenities } = await req.json();

    // 检查房型是否存在
    const existingRoomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!existingRoomType) {
      return NextResponse.json({ error: '房型不存在' }, { status: 404 });
    }

    // 检查名称是否与其他房型重复（全局唯一）
    if (name && name !== existingRoomType.name) {
      const duplicateName = await prisma.roomType.findUnique({
        where: { name },
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: '已存在同名房型' },
          { status: 400 }
        );
      }
    }

    const updateData: {
      name?: string;
      description?: string;
      basePrice?: number;
      capacity?: number;
      amenities?: string[];
    } = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (basePrice !== undefined) updateData.basePrice = basePrice;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (amenities !== undefined) updateData.amenities = amenities;

    const roomType = await prisma.roomType.update({
      where: { id: roomTypeId },
      data: updateData,
    });

    return NextResponse.json({
      message: '房型更新成功',
      roomType,
    });
  } catch (error) {
    console.error('更新房型失败:', error);
    return NextResponse.json(
      { error: '更新房型失败' },
      { status: 500 }
    );
  }
}

// 删除房型
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession('admin');
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以删除房型
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id: roomTypeId } = await params;

    // 检查房型是否存在
    const existingRoomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        _count: {
          select: {
            rooms: true,
            bookings: true,
          },
        },
      },
    });

    if (!existingRoomType) {
      return NextResponse.json({ error: '房型不存在' }, { status: 404 });
    }

    // 检查是否有关联的房间或预订
    if (existingRoomType._count.rooms > 0) {
      return NextResponse.json(
        { error: `该房型下还有 ${existingRoomType._count.rooms} 个房间，无法删除` },
        { status: 400 }
      );
    }

    if (existingRoomType._count.bookings > 0) {
      return NextResponse.json(
        { error: `该房型有 ${existingRoomType._count.bookings} 个关联预订，无法删除` },
        { status: 400 }
      );
    }

    await prisma.roomType.delete({
      where: { id: roomTypeId },
    });

    return NextResponse.json({ message: '房型删除成功' });
  } catch (error) {
    console.error('删除房型失败:', error);
    return NextResponse.json(
      { error: '删除房型失败' },
      { status: 500 }
    );
  }
}