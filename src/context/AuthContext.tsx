import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/crm';
import { getProfiles } from '../services/db';
import { getSupabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  availableUsers: UserProfile[];
  refreshProfiles: () => Promise<UserProfile[]>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'essential_soul_current_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfiles = async () => {
    try {
      const profiles = await getProfiles();
      setAvailableUsers(profiles.filter((p) => p.active));
      return profiles;
    } catch (err) {
      console.error('Failed to load profiles', err);
      return [];
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const profiles = await refreshProfiles();

      // Check saved user session
      const savedUserId = localStorage.getItem(AUTH_USER_KEY);
      if (savedUserId) {
        const found = profiles.find((p) => p.id === savedUserId && p.active);
        if (found) {
          setCurrentUser(found);
          setIsLoading(false);
          return;
        }
      }

      // Default to Super Admin for immediate instant access
      const defaultAdmin = profiles.find((p) => p.role === 'ADMIN' && p.active) || profiles[0];
      if (defaultAdmin) {
        setCurrentUser(defaultAdmin);
        localStorage.setItem(AUTH_USER_KEY, defaultAdmin.id);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (emailOrUsername: string, password?: string): Promise<boolean> => {
    const clean = emailOrUsername.trim().toLowerCase();
    
    // Check if Supabase client has real auth
    const supabase = getSupabase();
    if (supabase && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: clean,
          password: password,
        });
        if (!error && data.user) {
          const profiles = await getProfiles();
          const match = profiles.find((p) => p.id === data.user.id || p.email.toLowerCase() === clean);
          if (match && match.active) {
            setCurrentUser(match);
            localStorage.setItem(AUTH_USER_KEY, match.id);
            return true;
          }
        }
      } catch (e) {
        console.warn('Supabase auth login check', e);
      }
    }

    // Direct match against active profiles (supports demo login / username / email)
    const match = availableUsers.find(
      (u) =>
        u.email.toLowerCase() === clean ||
        u.username.toLowerCase() === clean ||
        u.full_name.toLowerCase() === clean
    );

    if (match && match.active) {
      setCurrentUser(match);
      localStorage.setItem(AUTH_USER_KEY, match.id);
      return true;
    }

    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    const supabase = getSupabase();
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const switchUser = async (userId: string) => {
    const profiles = await refreshProfiles();
    const target = profiles.find((p) => p.id === userId);
    if (target && target.active) {
      setCurrentUser(target);
      localStorage.setItem(AUTH_USER_KEY, target.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        login,
        logout,
        switchUser,
        availableUsers,
        refreshProfiles,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
