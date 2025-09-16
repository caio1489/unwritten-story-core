import React, { useState } from 'react';
import { 
  Users, 
  Kanban, 
  CheckCircle, 
  Settings, 
  BarChart3, 
  Webhook,
  LogOut,
  Menu,
  X,
  Plus,
  Crown
} from 'lucide-react';
import { useAuth } from '@/components/AuthWrapper';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface CRMLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const CRMLayout: React.FC<CRMLayoutProps> = ({ 
  children, 
  currentPage, 
  onPageChange 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Kanban },
    { id: 'sales', name: 'Vendas Concluídas', icon: CheckCircle },
    { id: 'webhooks', name: 'Webhooks', icon: Webhook },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    ...(user?.role === 'master' ? [{ id: 'users', name: 'Usuários', icon: Users }] : []),
    { id: 'settings', name: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'w-64' : 'w-16'
      } transition-all duration-300 bg-card border-r border-card-border flex flex-col shadow-lg`}>
        
        {/* Header */}
        <div className="p-4 border-b border-card-border">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center">
                  <Kanban className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                  ProCRM
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-muted"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-card-border">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold">
                {user?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium truncate text-card-foreground">
                    {user?.name}
                  </p>
                  {user?.role === 'master' && (
                    <Badge variant="secondary" className="bg-gradient-to-r from-warning to-warning text-warning-foreground px-2 py-0.5 text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.id}>
                <Button
                  variant={currentPage === item.id ? "default" : "ghost"}
                  className={`w-full justify-start h-11 ${
                    currentPage === item.id 
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-md' 
                      : 'hover:bg-muted text-card-foreground hover:text-primary'
                  }`}
                  onClick={() => onPageChange(item.id)}
                >
                  <item.icon className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                  {sidebarOpen && item.name}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-card-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:bg-destructive-light hover:text-destructive"
            onClick={logout}
          >
            <LogOut className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && 'Sair'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-card-border px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">
                {navigation.find(nav => nav.id === currentPage)?.name || 'Dashboard'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus leads e vendas de forma eficiente
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-sm text-muted-foreground">
                Usuário ativo: <span className="font-semibold text-card-foreground">{user?.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
};