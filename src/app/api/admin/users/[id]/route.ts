import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/server/session';
import { hashPassword } from '@/lib/server/auth';

// 更新用户
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以更新用户
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { email, password, name, isActive, storeId } = await req.json();
    const { id: userId } = await params;

    // 查找用户在哪个表中
    const [adminUser, staffUser] = await Promise.all([
      prisma.admin.findUnique({ where: { id: userId } }),
      prisma.staff.findUnique({ where: { id: userId } }),
    ]);

    const user = adminUser || staffUser;
    const userRole = adminUser ? 'ADMIN' : 'STAFF';

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查邮箱是否已被其他用户使用
    if (email !== undefined) {
      const [existingAdmin, existingStaff] = await Promise.all([
        prisma.admin.findFirst({ where: { email, NOT: { id: userId } } }),
        prisma.staff.findFirst({ where: { email, NOT: { id: userId } } }),
      ]);

      if (existingAdmin || existingStaff) {
        return NextResponse.json({ error: '邮箱已被使用' }, { status: 400 });
      }
    }

    let updatedUser;
    if (userRole === 'ADMIN') {
      const adminUpdateData: {
        email?: string;
        passwordHash?: string;
        name?: string;
        isActive?: boolean;
      } = {};
      
      if (email !== undefined) adminUpdateData.email = email;
      if (password) adminUpdateData.passwordHash = await hashPassword(password);
      if (name !== undefined) adminUpdateData.name = name;
      if (isActive !== undefined) adminUpdateData.isActive = isActive;
      
      updatedUser = await prisma.admin.update({
        where: { id: userId },
        data: adminUpdateData,
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
      const staffUpdateData: {
        email?: string;
        passwordHash?: string;
        name?: string;
        isActive?: boolean;
        assignedStoreId?: string;
      } = {};
      
      if (email !== undefined) staffUpdateData.email = email;
      if (password) staffUpdateData.passwordHash = await hashPassword(password);
      if (name !== undefined) staffUpdateData.name = name;
      if (isActive !== undefined) staffUpdateData.isActive = isActive;
      
      // 如果是前台用户，可以更新门店
      if (storeId !== undefined) {
        if (storeId) {
          const store = await prisma.store.findUnique({ where: { id: storeId } });
          if (!store) {
            return NextResponse.json({ error: '指定的门店不存在' }, { status: 400 });
          }
          staffUpdateData.assignedStoreId = storeId;
        }
      }
      
      updatedUser = await prisma.staff.update({
        where: { id: userId },
        data: staffUpdateData,
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
      message: '用户更新成功',
      user: {
        ...updatedUser,
        role: userRole,
        store: userRole === 'STAFF' && 'assignedStore' in updatedUser ? updatedUser.assignedStore : null,
      },
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    return NextResponse.json(
      { error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查权限：只有管理员可以删除用户
    const currentUser = await prisma.admin.findUnique({
      where: { id: session.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id: userId } = await params;

    // 不能删除自己
    if (userId === session.userId) {
      return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
    }

    // 查找用户在哪个表中
    const [adminUser, staffUser] = await Promise.all([
      prisma.admin.findUnique({ where: { id: userId } }),
      prisma.staff.findUnique({ where: { id: userId } }),
    ]);

    const user = adminUser || staffUser;
    const userRole = adminUser ? 'ADMIN' : 'STAFF';

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 软删除：将用户设为非活跃状态
    if (userRole === 'ADMIN') {
      await prisma.admin.update({
        where: { id: userId },
        data: { isActive: false },
      });
    } else {
      await prisma.staff.update({
        where: { id: userId },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
}