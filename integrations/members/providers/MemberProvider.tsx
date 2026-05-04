import React, { useMemo, useState, type ReactNode } from 'react';
import { MemberContext, type MemberState } from './MemberContext';

export const MemberProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<MemberState>({
    member: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  const value = useMemo(() => ({
    ...state,
    actions: {
      loadCurrentMember: async () => undefined,
      login: () => window.alert('Авторизация отключена в автономной версии сайта.'),
      logout: () => setState({ member: null, isAuthenticated: false, isLoading: false, error: null }),
      clearMember: () => setState({ member: null, isAuthenticated: false, isLoading: false, error: null }),
    },
  }), [state]);

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
};
