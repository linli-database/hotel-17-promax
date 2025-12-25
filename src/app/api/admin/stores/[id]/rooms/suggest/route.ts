import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

// 获取建议的房间号
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await context.params;
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const floor = parseInt(searchParams.get('floor') || '1');

    // 获取该楼层现有的房间号
    const existingRooms = await prisma.room.findMany({
      where: {
        storeId,
        floor,
        isActive: true,
      },
      select: {
        roomNo: true,
      },
    });

    const existingNumbers = existingRooms
      .map(room => parseInt(room.roomNo))
      .filter(num => !isNaN(num))
      .sort((a, b) => a - b);

    // 生成建议房间号
    let suggestedNumber = floor * 100 + 1;
    while (existingNumbers.includes(suggestedNumber)) {
      suggestedNumber++;
    }

    return NextResponse.json({
      suggestedRoomNo: suggestedNumber.toString(),
      existingRoomsCount: existingNumbers.length,
      floor,
    });
  } catch (error) {
    console.error('获取房间号建议失败:', error);
    return NextResponse.json(
      { error: '获取房间号建议失败' },
      { status: 500 }
    );
  }
}