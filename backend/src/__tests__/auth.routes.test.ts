import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import app from '../app';
import pool from '../db/pool';

jest.mock('../db/pool', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-pw'),
  compare: jest.fn(),
}));

const mockQuery = pool.query as jest.Mock;
const mockCompare = bcrypt.compare as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// ── POST /api/auth/register ───────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const dbUser = {
    id: 1,
    email: 'user@test.com',
    api_key_hash: 'hashed_api_key',
    name: 'Test',
    created_at: new Date().toISOString(),
  };

  it('201 with token and user on success', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbUser] });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'pass123', name: 'Test' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('user@test.com');
    expect(res.body.user.password).toBeUndefined();

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET!) as { userId: number };
    expect(payload.userId).toBe(1);
  });

  it('400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'pass123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email and password required');
  });

  it('400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com' });

    expect(res.status).toBe(400);
  });

  it('409 when email is already registered', async () => {
    const pgUniqueError = Object.assign(new Error('duplicate'), { code: '23505' });
    mockQuery.mockRejectedValueOnce(pgUniqueError);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'pass123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  it('normalises email to lowercase before insert', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...dbUser, email: 'user@test.com' }] });

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'USER@TEST.COM', password: 'pass123' });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['user@test.com'])
    );
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const dbUser = {
    id: 2,
    email: 'login@test.com',
    api_key_hash: 'hashed_api_key',
    name: 'Login User',
    password: 'hashed-pw',
    created_at: new Date().toISOString(),
  };

  it('200 with token and user (no password) on valid credentials', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbUser] });
    mockCompare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'pass123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('login@test.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'pass123' });

    expect(res.status).toBe(400);
  });

  it('400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com' });

    expect(res.status).toBe(400);
  });

  it('401 when user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'pass123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('401 when password is wrong', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [dbUser] });
    mockCompare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'wrong-pass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  const apiKey = 'wk_test_key';
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  function validAuthHeader(): string {
    const token = jwt.sign({ userId: 3, email: 'me@test.com' }, process.env.JWT_SECRET!);
    return `Bearer ${token}`;
  }

  it('200 with user for a valid token', async () => {
    const authUser = { id: 3, email: 'me@test.com', name: 'Me', created_at: new Date().toISOString() };
    mockQuery.mockResolvedValueOnce({ rows: [{ ...authUser }] });
    mockQuery.mockResolvedValueOnce({ rows: [authUser] });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', validAuthHeader())
      .set('x-api-key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE api_key_hash = $1 OR api_key = $1'),
      [apiKeyHash]
    );
  });

  it('401 with no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 with an invalid token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 3, email: 'me@test.com', name: 'Me', created_at: new Date().toISOString() }],
    });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer bad.token.here')
      .set('x-api-key', apiKey);
    expect(res.status).toBe(401);
  });

  it('404 when user has been deleted from DB', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 3, email: 'me@test.com', name: 'Me', created_at: new Date().toISOString() }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', validAuthHeader())
      .set('x-api-key', apiKey);

    expect(res.status).toBe(404);
  });
});
