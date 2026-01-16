import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { UserRole } from '../types';

interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  role: UserRole;
  isReportManager: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole;
  isReportManager: boolean;
  isSuperAdmin: boolean;
  isClient: boolean;
  isNormalUser: boolean;
  login: (provider?: 'google') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REPORT_MANAGER_EMAIL = 'ff@auxcode.com';
const SUPER_ADMIN_EMAILS = ['o@auxcode.com', 'alex@auxcode.com', 'bobby@auxcode.com', 'rosen@auxcode.com'];

function determineUserRole(email: string): UserRole {
  const emailLower = email.toLowerCase();
  
  if (SUPER_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === emailLower)) {
    return 'super_admin';
  }
  
  return 'normal';
}

async function checkIfClient(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('project_client_access')
      .select('id')
      .eq('client_email', email.toLowerCase())
      .limit(1);
    
    if (error) {
      console.error('Error checking client status:', error);
      return false;
    }
    
    return (data && data.length > 0);
  } catch (error) {
    console.error('Error checking client status:', error);
    return false;
  }
}

async function supabaseUserToUser(supabaseUser: SupabaseUser): Promise<User> {
  const email = supabaseUser.email || '';
  const emailLower = email.toLowerCase();
  
  const baseRole = determineUserRole(email);
  let finalRole: UserRole = baseRole;
  
  console.log('Determining role for email:', email);
  console.log('Base role:', baseRole);
  console.log('Super admin emails:', SUPER_ADMIN_EMAILS);
  
  if (baseRole === 'normal') {
    const isClient = await checkIfClient(email);
    if (isClient) {
      finalRole = 'client';
    }
  }
  
  console.log('Final role:', finalRole);
  
  const userData = {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email.split('@')[0] || 'User',
    email: email,
    picture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
    role: finalRole,
    isReportManager: emailLower === REPORT_MANAGER_EMAIL.toLowerCase() || finalRole === 'super_admin',
  };
  
  console.log('User data:', userData);
  
  return userData;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const role = user?.role ?? 'normal';
  const isReportManager = user?.isReportManager ?? false;
  const isSuperAdmin = role === 'super_admin';
  const isClient = role === 'client';
  const isNormalUser = role === 'normal';

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userData = await supabaseUserToUser(session.user);
        setUser(userData);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userData = await supabaseUserToUser(session.user);
        setUser(userData);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (provider: 'google' = 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to login:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      setUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        role,
        isReportManager,
        isSuperAdmin,
        isClient,
        isNormalUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
