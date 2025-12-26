import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/session';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession('client');
    
    if (!session || session.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }
 
    const body = await req.json();
    const { phone } = body;

    // 验证手机号格式
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    // 更新用户电话号码
    const updatedUser = await prisma.customer.update({
      where: { id: session.userId },
      data: { phone },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: {
        ...updatedUser,
        role: 'CUSTOMER',
      },
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { error: '更新用户信息失败' },
      { status: 500 }
    );
  }
}