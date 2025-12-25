import { NextRequest } from 'next/server';
import { CLIENT_SESSION_COOKIE, ADMIN_SESSION_COOKIE, SessionScope } from '@/lib/auth/constants';
import { parseSessionToken } from './auth';
import { prisma } from '../prisma';

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'STAFF';

export interface SessionUser {
  userId: string;
  role: UserRole;
  assignedStoreId?: string | null;
}

export async function getSessionUser(
  req: NextRequest,
  scope: SessionScope | 'any' = 'any'
): Promise<SessionUser | null> {
  const cookieNames =
    scope === 'any' ? [ADMIN_SESSION_COOKIE, CLIENT_SESSION_COOKIE] : [scope === 'admin' ? ADMIN_SESSION_COOKIE : CLIENT_SESSION_COOKIE];

  let session: { userId: string; role: UserRole } | null = null;
  for (const name of cookieNames) {
    const token = req.cookies.get(name)?.value;
    if (!token) continue;
    const parsed = parseSessionToken(token);
    if (!parsed) continue;
    if (scope === 'admin' && parsed.role === 'CUSTOMER') continue;
    if (scope === 'client' && parsed.role !== 'CUSTOMER') continue;
    session = parsed;
    break;
  }

  if (!session) return null;

  // 根据role查询对应的表
  if (session.role === 'ADMIN') {
    const admin = await prisma.admin.findUnique({
      where: { id: session.userId, isActive: true },
      select: { id: true }
    });
    if (!admin) return null;
    return { userId: admin.id, role: 'ADMIN' };
  } else if (session.role === 'STAFF') {
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId, isActive: true },
      select: { id: true, assignedStoreId: true }
    });
    if (!staff) return null;
    return { 
      userId: staff.id, 
      role: 'STAFF', 
      assignedStoreId: staff.assignedStoreId 
    };
  } else if (session.role === 'CUSTOMER') {
    const customer = await prisma.customer.findUnique({
      where: { id: session.userId, isActive: true },
      select: { id: true }
    });
    if (!customer) return null;
    return { userId: customer.id, role: 'CUSTOMER' };
  }

  return null;
}

export function hasStoreAccess(user: SessionUser, storeId: string): boolean {
  // ADMIN可以访问所有门店
  if (user.role === 'ADMIN') return true;
  
  // STAFF只能访问分配的门店
  if (user.role === 'STAFF') {
    return user.assignedStoreId === storeId;
  }
  
  // CUSTOMER不能访问管理端门店数据
  return false;
}

export function getAccessibleStores(user: SessionUser): { all: boolean; storeIds?: string[] } {
  if (user.role === 'ADMIN') {
    return { all: true };
  }
  
  if (user.role === 'STAFF' && user.assignedStoreId) {
    return { all: false, storeIds: [user.assignedStoreId] };
  }
  
  return { all: false, storeIds: [] };
}
