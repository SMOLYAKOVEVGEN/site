import { createContext, useContext } from 'react';
import type { Member } from '..';

export interface MemberState {
  member: Member | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface MemberActions {
  loadCurrentMember: () => Promise<void>;
  login: () => void;
  logout: () => void;
  clearMember: () => void;
}

export interface MemberContextType extends MemberState {
  actions: MemberActions;
}

export const MemberContext = createContext<MemberContextType | undefined>(undefined);

export const useMember = () => {
  const context = useContext(MemberContext);
  if (!context) throw new Error('useMember must be used within a MemberProvider');
  return context;
};
