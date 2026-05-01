import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../dal';
import { asAppError } from '../lib/appError';

export interface RegisterInput {
  email?: string;
  password?: string;
  name?: string;
}

export interface LoginInput {
  email?: string;
  password?: string;
}

const users = new UserRepository();

export async function register(input: RegisterInput) {
  const { email, password, name } = input;

  if (!email || !password) {
    throw asAppError(400, 'email and password required');
  }

  const hashed = await bcrypt.hash(password, 12);
  const apiKey = createApiKey();
  const userRecord = await users.create({
    email: email.toLowerCase().trim(),
    apiKey,
    password: hashed,
    name: name ?? null,
  });
  const user = {
    id: userRecord.id,
    email: userRecord.email,
    apiKey,
    name: userRecord.name,
    created_at: userRecord.createdAt,
  };
  const token = signToken(user.id, user.email);

  return { token, user };
}

export async function login(input: LoginInput) {
  const { email, password } = input;

  if (!email || !password) {
    throw asAppError(400, 'email and password required');
  }

  const user = await users.findByEmail(email.toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw asAppError(401, 'Invalid credentials');
  }

  const token = signToken(user.id, user.email);
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.createdAt,
  };

  return { token, user: safeUser };
}

export async function user(userId: string) {
  const user = await users.findSafeById(userId);
  if (!user) {
    throw asAppError(404, 'User not found');
  }

  return { user };
}

function signToken(userId: string | number, email: string): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET!,
    { expiresIn }
  );
}

function createApiKey(): string {
  return `wk_${crypto.randomBytes(24).toString('hex')}`;
}
