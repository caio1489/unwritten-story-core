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
  Crown,
  BookOpen
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/5 to-success-light/10 flex">
      {/* Premium Sidebar */}
      <div className={`${
        sidebarOpen ? 'w-72' : 'w-20'
      } transition-all duration-500 ease-out glass-effect border-r border-border/30 flex flex-col shadow-xl backdrop-blur-xl`}>
        
        {/* Premium Header */}
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-primary animate-pulse-glow">
                  <Kanban className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="font-bold text-2xl bg-gradient-to-r from-primary via-primary to-success bg-clip-text text-transparent">
                    ProCRM
                  </span>
                  <p className="text-xs text-muted-foreground font-medium">Premium Edition</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:glass-effect rounded-xl transition-all duration-300 hover:scale-110"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Premium User Info */}
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12 ring-2 ring-primary/20 shadow-lg">
              <AvatarFallback className="bg-gradient-primary text-white font-bold text-lg">
                {user?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-base font-bold truncate text-foreground">
                    {user?.name}
                  </p>
                  {user?.role === 'master' && (
                    <Badge className="bg-gradient-to-r from-warning to-warning/80 text-white px-3 py-1 text-xs font-bold shadow-sm">
                      <Crown className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate font-medium">
                  {user?.email}
                </p>
                <div className="mt-2 w-full bg-border/30 rounded-full h-1">
                  <div className="bg-gradient-primary h-1 rounded-full w-full animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Premium Navigation */}
        <nav className="flex-1 p-6">
          <ul className="space-y-3">
            {navigation.map((item, index) => (
              <li key={item.id} style={{ animationDelay: `${index * 0.1}s` }} className="animate-slide-up">
                <Button
                  variant={currentPage === item.id ? "default" : "ghost"}
                  className={`w-full justify-start h-12 rounded-xl font-semibold transition-all duration-300 ${
                    currentPage === item.id 
                      ? 'bg-gradient-primary text-white shadow-primary scale-105' 
                      : 'hover:glass-effect text-foreground hover:text-primary hover:scale-105 hover:shadow-card'
                  }`}
                  onClick={() => onPageChange(item.id)}
                >
                  <item.icon className={`w-5 h-5 ${sidebarOpen ? 'mr-4' : ''}`} />
                  {sidebarOpen && (
                    <span className="text-sm">{item.name}</span>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Premium Logout */}
        <div className="p-6 border-t border-border/30">
          <Button
            variant="ghost"
            className="w-full justify-start h-12 rounded-xl font-semibold text-destructive hover:bg-destructive-light hover:text-destructive hover:scale-105 transition-all duration-300"
            onClick={logout}
          >
            <LogOut className={`w-5 h-5 ${sidebarOpen ? 'mr-4' : ''}`} />
            {sidebarOpen && <span className="text-sm">Sair</span>}
          </Button>
        </div>
      </div>

      {/* Premium Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Premium Top Bar */}
        <header className="glass-effect border-b border-border/30 px-8 py-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                {navigation.find(nav => nav.id === currentPage)?.name || 'Dashboard'}
              </h1>
              <p className="text-muted-foreground font-medium mt-1">
                Gerencie seus leads e vendas com inteligência premium
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="glass-effect px-4 py-2 rounded-xl">
                <span className="text-sm text-muted-foreground">Usuário ativo:</span>
                <span className="ml-2 font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                  {user?.name}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Premium Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};