import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 获取当前员工信息
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      include: {
        assignedStore: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        }
      }
    });

    if (!staff) {
      return NextResponse.json({ error: '员工不存在' }, { status: 404 });
    }

    if (!staff.assignedStore) {
      return NextResponse.json({ error: '您没有分配的门店' }, { status: 403 });
    }

    return NextResponse.json(staff.assignedStore);

  } catch (error) {
    console.error('获取门店信息失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}