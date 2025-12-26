import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';
import { hashPassword } from '@/lib/server/auth';

// 获取用户列表
export async function GET() {
  try {
    const session = await getSession('admin');
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以查看用户列表
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 获取管理员和前台用户列表
    const [admins, staff] = await Promise.all([
      prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.staff.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          assignedStoreId: true,
          assignedStore: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const users = [
      ...admins.map(user => ({ ...user, role: 'ADMIN' as const, store: null })),
      ...staff.map(user => ({ ...user, role: 'STAFF' as const, store: user.assignedStore })),
    ];

    return NextResponse.json({ users });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 创建用户
export async function POST(req: NextRequest) {
  try {
    const session = await getSession('admin');
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以创建用户
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { email, password, name, role, storeId } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: '邮箱、密码和角色不能为空' },
        { status: 400 }
      );
    }

    if (!['ADMIN', 'STAFF'].includes(role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const [existingAdmin, existingStaff] = await Promise.all([
      prisma.admin.findUnique({ where: { email } }),
      prisma.staff.findUnique({ where: { email } }),
    ]);

    if (existingAdmin || existingStaff) {
      return NextResponse.json({ error: '邮箱已存在' }, { status: 400 });
    }

    // 加密密码
    const passwordHash = await hashPassword(password);

    let newUser;
    if (role === 'ADMIN') {
      newUser = await prisma.admin.create({
        data: {
          email,
          passwordHash,
          name,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else {
      // STAFF角色
      if (!storeId) {
        return NextResponse.json({ error: '前台用户必须指定门店' }, { status: 400 });
      }

      // 验证门店是否存在
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });
      if (!store) {
        return NextResponse.json({ error: '指定的门店不存在' }, { status: 400 });
      }

      newUser = await prisma.staff.create({
        data: {
          email,
          passwordHash,
          name,
          assignedStoreId: storeId,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          assignedStoreId: true,
          createdAt: true,
          updatedAt: true,
          assignedStore: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      message: '用户创建成功',
      user: {
        ...newUser,
        role,
        store: role === 'STAFF' && 'assignedStore' in newUser ? newUser.assignedStore : null,
      },
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    );
  }
}