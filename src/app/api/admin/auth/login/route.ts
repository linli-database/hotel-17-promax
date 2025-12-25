import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySession, verifyPassword } from '@/lib/server/auth';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password }: LoginRequest = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      );
    }

    let user = null;
    let role = null;

    // 先尝试从Admin表查找
    user = await prisma.admin.findUnique({
      where: { email },
    });

    if (user) {
      role = 'ADMIN';
    } else {
      // 尝试从Staff表查找
      user = await prisma.staff.findUnique({
        where: { email },
      });
      if (user) {
        role = 'STAFF';
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在或无权限访问管理端' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role
      }
    });
    return applySession(response, { userId: user.id, role }, 'admin');
  } catch (error) {
    console.error('管理端登录错误:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
