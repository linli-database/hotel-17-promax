import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomBytes, scrypt } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived: Buffer = await new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, key) => {
      if (err) return reject(err);
      resolve(key as Buffer);
    });
  });
  return `${salt}:${derived.toString('hex')}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const rl = createInterface({ input, output });
  const email = (await rl.question('管理员邮箱: ')).trim().toLowerCase();
  const name = (await rl.question('显示名称(可选): ')).trim();
  const password = (await rl.question('密码: ')).trim();

  if (!email || !password) {
    rl.close();
    throw new Error('邮箱和密码不能为空');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await hashPassword(password);
    const admin = await prisma.admin.upsert({
      where: { email },
      update: { 
        passwordHash, 
        name: name || null, 
        isActive: true
      },
      create: {
        email,
        passwordHash,
        name: name || null,
        isActive: true,
      },
      select: { 
        id: true, 
        email: true, 
        name: true
      },
    });

    console.log('✅ 管理员创建/更新成功:');
    console.log(admin);
  } finally {
    rl.close();
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ 操作失败:', err.message || err);
  process.exit(1);
});