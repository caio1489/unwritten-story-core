import { useState, useCallback } from 'react';
import { UserService } from '@/services/userService';
import { UserProfile, AuthUser, CreateUserData, UserStats } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

export const useUserManagement = (currentUser: AuthUser | null) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const transformProfile = useCallback((profile: UserProfile): AuthUser => ({
    ...profile,
    id: profile.user_id,
    masterAccountId: profile.master_account_id,
    createdAt: profile.created_at,
  }), []);

  const fetchTeamUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'master') {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const profiles = await UserService.getTeamUsers(currentUser.user_id);
      const transformedUsers = profiles.map(transformProfile);
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Erro ao buscar usuários da equipe:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários da equipe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser, transformProfile, toast]);

  const addSubUser = useCallback(async (userData: CreateUserData): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'master') {
      toast({
        title: "Erro",
        description: "Apenas administradores podem adicionar usuários",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      const newProfile = await UserService.createSubUser(currentUser.user_id, userData);
      
      if (newProfile) {
        const newUser = transformProfile(newProfile);
        setUsers(prev => [...prev, newUser]);
        
        toast({
          title: "Sucesso!",
          description: "Usuário criado com sucesso. Ele já pode fazer login com as credenciais fornecidas.",
        });
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Erro ao adicionar usuário:', error);
      toast({
        title: "Erro",
        description: error.message || 'Erro inesperado ao criar usuário',
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, transformProfile, toast]);

  const getTeamMembers = useCallback((): AuthUser[] => {
    if (!currentUser || currentUser.role !== 'master') return [];
    // Retorna apenas membros da equipe (exclui o próprio administrador)
    return users.filter(u => u.master_account_id === currentUser.id);
  }, [users, currentUser]);

  const getAllAssignableUsers = useCallback((): AuthUser[] => {
    // Retorna o admin atual + membros da equipe para atribuição de leads
    if (!currentUser) return [];
    return [currentUser, ...getTeamMembers()];
  }, [currentUser, getTeamMembers]);

  const getUserStats = useCallback((): UserStats => {
    if (!currentUser || currentUser.role !== 'master') {
      return { totalUsers: 0, activeUsers: 0, administrators: 1 };
    }

    const teamMembers = getTeamMembers();
    return {
      totalUsers: teamMembers.length + 1, // +1 para o admin
      activeUsers: teamMembers.length + 1, // Assumindo que todos estão ativos
      administrators: 1, // Apenas o master
    };
  }, [currentUser, getTeamMembers]);

  return {
    users: getTeamMembers(),
    allAssignableUsers: getAllAssignableUsers(),
    userStats: getUserStats(),
    loading,
    fetchTeamUsers,
    addSubUser,
  };
};