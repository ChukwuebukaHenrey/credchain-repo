import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { User, Role } from '../types';
import { toUiRole } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const TOKEN_KEY = 'cc_token';
const USER_KEY = 'cc_user';

interface AuthContextType {
  token: string | null;
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (token: string, user?: any) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJwt(token: string) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load check
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, userObj?: any) => {
    let resolved: User | null = null;
    
    if (userObj) {
      resolved = {
        id: userObj.id || userObj._id,
        role: toUiRole(userObj.role) as Role,
        email: userObj.email,
        name: userObj.fullName || userObj.name || userObj.email?.split('@')[0],
        credchainId: userObj.credchainId,
        photo: userObj.photo,
        institution: userObj.institution || userObj.instName,
        field: userObj.field || userObj.fieldOfStudy,
        company: userObj.company || userObj.companyName
      };
    } else {
      const claims = decodeJwt(newToken);
      if (claims) {
        resolved = {
          id: claims.sub,
          role: toUiRole(claims.role) as Role,
          email: claims.email,
          name: claims.name || claims.email?.split('@')[0],
          credchainId: claims.credchainId,
        };
      }
    }

    if (resolved) {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(resolved));
      localStorage.setItem('credchain_role', resolved.role); // Maintain legacy key for compatibility if needed

      setToken(newToken);
      setUser(resolved);
      // Join the per-user socket room so chat / bulk-progress events arrive live.
      if (resolved.id) {
        try { connectSocket(resolved.id); } catch { /* socket is best-effort */ }
      }
    }
  }, []);

  // Reconnect the socket on page refresh for an already-authenticated session.
  useEffect(() => {
    if (token && user?.id) {
      try { connectSocket(user.id); } catch { /* socket is best-effort */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('credchain_role');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(token),
      login,
      logout,
      isLoading,
    }),
    [token, user, login, logout, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
