import { http, HttpResponse } from 'msw';

const mockUser = { id: 1, email: 'user@test.com', name: 'Test User' };

export const handlers = [
  http.post('http://localhost/api/auth/login', () =>
    HttpResponse.json({ token: 'mock-token', user: mockUser })
  ),

  http.post('http://localhost/api/auth/register', () =>
    HttpResponse.json({ token: 'mock-token', user: mockUser }, { status: 201 })
  ),

  http.get('http://localhost/api/auth/user', () =>
    HttpResponse.json({ user: mockUser })
  ),
];
