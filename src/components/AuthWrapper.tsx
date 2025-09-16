import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { LoginForm } from './LoginForm';
import { useToast } from '@/hooks/use-toast';
import { UserService } from '@/services/userService';
import { AuthUser, CreateUserData } from '@/types/auth';
import { useUserManagement } from '@/hooks/useUserManagement';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  users: AuthUser[];
  allAssignableUsers: AuthUser[];
  userStats: { totalUsers: number; activeUsers: number; administrators: number };
  addSubUser: (name: string, email: string, password: string) => Promise<boolean>;
  getMasterUsers: () => AuthUser[];
  refreshProfile: () => Promise<void>;
  loading: boolean;
  userManagementLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Hook de gerenciamento de usuários
  const userManagement = useUserManagement(user);

  const transformProfile = (profile: any): AuthUser => ({
    ...profile,
    id: profile.user_id,
    masterAccountId: profile.master_account_id,
    createdAt: profile.created_at,
  });

  const fetchUserProfile = async (userId: string): Promise<any | null> => {
    try {
      let profile = await UserService.getUserProfile(userId);

      // Se não encontrou o profile, cria um novo (caso seja primeiro login)
      if (!profile) {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          profile = await UserService.createMasterProfile(authUser.user);
        }
      }

      return profile;
    } catch (error) {
      console.error('Erro ao buscar profile:', error);
      return null;
    }
  };

useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) {
              if (profile.is_active === false) {
                toast({
                  title: 'Conta inativa',
                  description: 'Entre em contato com o administrador para reativação.',
                  variant: 'destructive',
                });
                await supabase.auth.signOut();
                setUser(null);
                return;
              }
              const authUser = transformProfile(profile);
              setUser(authUser);
            }
          }, 0);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        setTimeout(async () => {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) {
            if (profile.is_active === false) {
              toast({
                title: 'Conta inativa',
                description: 'Entre em contato com o administrador para reativação.',
                variant: 'destructive',
              });
              await supabase.auth.signOut();
              setUser(null);
              return;
            }
            const authUser = transformProfile(profile);
            setUser(authUser);
          }
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Heartbeat de presença: atualiza last_seen_at a cada 60s
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('user_id', user.user_id);
      } catch (e) {
        console.error('Erro ao atualizar presença:', e);
      }
    };

    // Atualiza imediatamente e depois a cada minuto
    updatePresence();
    const interval = setInterval(updatePresence, 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.user_id]);

  // Fetch team users when user changes
  useEffect(() => {
    if (user && user.role === 'master') {
      userManagement.fetchTeamUsers();
    }
  }, [user?.id, userManagement.fetchTeamUsers]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Confirme seu email antes de fazer login. Verifique sua caixa de entrada.' };
        }
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Email ou senha incorretos. Verifique suas credenciais.' };
        }
        if (error.message.includes('Email link is invalid or has expired')) {
          return { success: false, error: 'Link de confirmação inválido ou expirado.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro inesperado' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name,
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { success: false, error: 'Este email já está cadastrado. Tente fazer login.' };
        }
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        error: 'Conta criada! Verifique seu email para confirmar a conta antes de fazer login.' 
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erro inesperado' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Função legada de compatibilidade
  const getMasterUsers = (): AuthUser[] => {
    return userManagement.users;
  };

  // Wrapper para manter compatibilidade
  const addSubUser = async (name: string, email: string, password: string): Promise<boolean> => {
    return await userManagement.addSubUser({ name, email, password });
  };

  // Atualiza o perfil atual no contexto
  const refreshProfile = async (): Promise<void> => {
    try {
      const { data: authSession } = await supabase.auth.getSession();
      const userId = authSession.session?.user?.id;
      if (!userId) return;
      const profile = await fetchUserProfile(userId);
      if (profile) {
        setUser(transformProfile(profile));
      }
    } catch (e) {
      console.error('Erro ao atualizar perfil no contexto:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <LoginForm login={login} register={register} />;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        login,
        register,
        logout,
        users: userManagement.users,
        allAssignableUsers: userManagement.allAssignableUsers,
        userStats: userManagement.userStats,
        addSubUser,
        getMasterUsers,
        refreshProfile,
        loading,
        userManagementLoading: userManagement.loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};