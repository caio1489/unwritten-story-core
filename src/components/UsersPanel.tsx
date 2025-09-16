import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Users, 
  Crown, 
  User, 
  Mail, 
  Calendar,
  MoreHorizontal,
  Trash2,
  Settings,
  Shield,
  Activity,
  Clock
} from 'lucide-react';
import { useAuth } from './AuthWrapper';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const UsersPanel: React.FC = () => {
  const { user, userStats, users, addSubUser, userManagementLoading } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Only master users can access this panel
  if (user?.role !== 'master') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">Acesso Restrito</h3>
          <p className="text-muted-foreground">Apenas administradores podem gerenciar usuários</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const success = await addSubUser(newUser.name, newUser.email, newUser.password);
    
    if (success) {
      setNewUser({ name: '', email: '', password: '' });
      setIsDialogOpen(false);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !user) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-subuser', {
        body: { subUserId: userToDelete.id },
      });

      if (error) {
        console.error('Error deleting user via function:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao excluir usuário',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Usuário removido',
        description: `${userToDelete.name} foi removido da equipe`,
      });

      window.location.reload();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao remover usuário',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  };

  // Ativar/Desativar usuário
  const toggleUserActive = async (subUserId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
        .eq('user_id', subUserId);

      if (error) {
        console.error('Erro ao atualizar status do usuário:', error);
        toast({ title: 'Erro', description: 'Não foi possível atualizar o status', variant: 'destructive' });
        return;
      }

      toast({ title: 'Status atualizado', description: `Usuário ${!currentActive ? 'ativado' : 'desativado'}` });
      window.location.reload();
    } catch (e) {
      console.error('Erro ao alternar status do usuário:', e);
      toast({ title: 'Erro', description: 'Erro inesperado ao atualizar status', variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatLastSeen = (lastSeenString?: string) => {
    if (!lastSeenString) return 'Nunca';
    
    const lastSeen = new Date(lastSeenString);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Online (último ping dentro de 5 minutos)
    if (diffMinutes < 5) return 'Online';
    
    // Primeiro dia: mostrar em minutos/horas
    if (diffDays === 0) {
      if (diffHours === 0) {
        return `Online há ${diffMinutes} min`;
      }
      return `Online há ${diffHours}h`;
    }
    
    // De 1 a 30 dias
    if (diffDays <= 30) {
      return `Online há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    }
    
    // Mais de 30 dias
    return 'Online há mais de 30 dias';
  };

  const getPresenceColor = (lastSeenString?: string) => {
    if (!lastSeenString) return 'bg-muted text-muted-foreground';
    
    const lastSeen = new Date(lastSeenString);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Online (último ping dentro de 5 minutos)
    if (diffMinutes < 5) return 'bg-success-light text-success border-success';
    
    // Primeiro dia
    if (diffDays === 0) return 'bg-warning-light text-warning border-warning';
    
    // De 1 a 7 dias - amarelo mais claro
    if (diffDays <= 7) return 'bg-orange-100 text-orange-600 border-orange-200';
    
    // Mais de 7 dias - vermelho
    return 'bg-destructive-light text-destructive border-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Gerenciar Usuários</h2>
          <p className="text-muted-foreground">Adicione e gerencie usuários da sua equipe</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground">Nome Completo</label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Nome do usuário"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground">Email</label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground">Senha Inicial</label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Digite uma senha inicial"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O usuário poderá fazer login imediatamente após a criação
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-primary to-primary-dark">
                  Criar Usuário
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary-muted rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold text-primary">{userStats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-success-light rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuários Ativos</p>
                <p className="text-2xl font-bold text-success">{userStats.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-warning-light rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Administradores</p>
                <p className="text-2xl font-bold text-warning">{userStats.administrators}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {/* Master User */}
        <Card className="border-warning-light bg-warning-light/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-br from-warning to-warning text-warning-foreground font-bold text-lg">
                    {user?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-card-foreground">{user?.name}</h3>
                    <Badge className="bg-gradient-to-r from-warning to-warning text-warning-foreground">
                      <Crown className="w-3 h-3 mr-1" />
                      Administrador
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span>{user?.email}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Criado em {formatDate(user?.createdAt || '')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-success-light text-success border-success">
                  <Activity className="w-3 h-3 mr-1" />
                  Online
                </Badge>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sub Users */}
        {userManagementLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando usuários...</p>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">Nenhum usuário adicionado</h3>
              <p className="text-muted-foreground">
                Adicione membros da sua equipe para colaborar no CRM
              </p>
            </CardContent>
          </Card>
        ) : (
          users.map((subUser) => (
            <Card key={subUser.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-bold text-lg">
                        {subUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-card-foreground">{subUser.name}</h3>
                        <Badge variant="secondary">
                          <User className="w-3 h-3 mr-1" />
                          Usuário
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span>{subUser.email}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Adicionado em {formatDate(subUser.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getPresenceColor(subUser.last_seen_at)}>
                        <Clock className="w-3 h-3 mr-1" />
                        {formatLastSeen(subUser.last_seen_at)}
                      </Badge>
                      <Badge variant="outline" className={subUser.is_active ? "bg-success-light text-success border-success" : "bg-muted text-muted-foreground"}>
                        <Activity className="w-3 h-3 mr-1" />
                        {subUser.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleUserActive(subUser.id, !!subUser.is_active)}
                      >
                        {subUser.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteUser(subUser.id, subUser.name)}
                        className="text-destructive hover:bg-destructive-light"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Permissions Info */}
      <Card className="border-primary-muted bg-primary-muted/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary" />
            <span>Permissões de Usuário</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium text-card-foreground flex items-center space-x-2">
              <Crown className="w-4 h-4 text-warning" />
              <span>Administrador (Você)</span>
            </h4>
            <p className="text-sm text-muted-foreground">
              Acesso total: gerenciar usuários, ver todos os leads, configurar webhooks, 
              acessar analytics completo e configurações do sistema.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-card-foreground flex items-center space-x-2">
              <User className="w-4 h-4 text-primary" />
              <span>Usuário da Equipe</span>
            </h4>
            <p className="text-sm text-muted-foreground">
              Acesso limitado: gerenciar apenas seus próprios leads, registrar vendas, 
              ver analytics pessoais. Não pode adicionar usuários ou modificar configurações.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{userToDelete?.name}</strong> da equipe? 
              Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};