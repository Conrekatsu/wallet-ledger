import { useAuthStore } from '../store/auth';

const mockUser = { id: 1, email: 'a@b.com', name: 'Alice' };

describe('useAuthStore', () => {
  it('starts with null token and user', () => {
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setAuth stores token and user', () => {
    useAuthStore.getState().setAuth('tok-123', mockUser);

    expect(useAuthStore.getState().token).toBe('tok-123');
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('logout clears token and user', () => {
    useAuthStore.getState().setAuth('tok-123', mockUser);
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('persists state to localStorage under key "hw-auth"', () => {
    useAuthStore.getState().setAuth('persist-tok', mockUser);

    const stored = JSON.parse(localStorage.getItem('hw-auth') ?? '{}');
    expect(stored.state.token).toBe('persist-tok');
  });
});
