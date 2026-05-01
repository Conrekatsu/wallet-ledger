import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../lib/types';

interface AuthState {
  token: string | null;
  user: User | null;
  apiKey: string | null;
  activeAccountId: string | null;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  setApiKey: (apiKey: string) => void;
  setActiveAccountId: (accountId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      apiKey: null,
      activeAccountId: null,
      setAuth: (token, user) =>
        set({
          token,
          user,
          apiKey: user.apiKey ?? null,
        }),
      setUser: (user) =>
        set((state) => ({
          user,
          apiKey: user.apiKey ?? state.apiKey,
        })),
      setApiKey: (apiKey) => set({ apiKey }),
      setActiveAccountId: (activeAccountId) => set({ activeAccountId }),
      logout: () =>
        set({
          token: null,
          user: null,
          apiKey: null,
          activeAccountId: null,
        }),
    }),
    { name: 'hw-auth' }
  )
);
