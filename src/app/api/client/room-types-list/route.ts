import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // 获取所有活跃的房型
    const roomTypes = await prisma.roomType.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ roomTypes });
  } catch (error) {
    console.error('获取房型列表失败:', error);
    return NextResponse.json({ error: '获取房型列表失败' }, { status: 500 });
  }
}
