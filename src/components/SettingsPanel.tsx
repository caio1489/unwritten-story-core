import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Kanban,
  Save,
  Plus,
  Trash2,
  Edit3,
  GripVertical
} from 'lucide-react';
import { useAuth } from './AuthWrapper';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface KanbanStage {
  id: string;
  name: string;
  color: string;
}

export const SettingsPanel: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  // Kanban stages configuration
  const [kanbanStages, setKanbanStages] = useLocalStorage<KanbanStage[]>(`kanban-stages-${user?.id}`, [
    { id: 'new', name: 'Novos Leads', color: '#3B82F6' },
    { id: 'contacted', name: 'Contatados', color: '#EAB308' },
    { id: 'qualified', name: 'Qualificados', color: '#8B5CF6' },
    { id: 'proposal', name: 'Proposta', color: '#F97316' },
    { id: 'won', name: 'Ganho', color: '#22C55E' },
    { id: 'lost', name: 'Perdido', color: '#EF4444' },
  ]);

  // User preferences
  const [preferences, setPreferences] = useLocalStorage(`preferences-${user?.id}`, {
    emailNotifications: true,
    browserNotifications: true,
    dailyReports: true,
    weeklyReports: false,
    autoAssignLeads: false,
    showWelcomeTour: true,
  });

  // Profile settings
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    company: '',
  });

  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [editingColor, setEditingColor] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileData.name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar perfil: " + error.message,
          variant: "destructive",
        });
        return;
      }

      await refreshProfile();
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso",
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar perfil",
        variant: "destructive",
      });
    }
  };

  const handlePreferenceChange = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    
    toast({
      title: "Preferência atualizada",
      description: "Configuração salva com sucesso",
    });
  };

  const handleStageEdit = (stageId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedStages = kanbanStages.map(stage =>
      stage.id === stageId ? { ...stage, name: newName } : stage
    );
    
    setKanbanStages(updatedStages);
    setEditingStage(null);
    setNewStageName('');
    
    toast({
      title: "Etapa atualizada",
      description: "O nome da etapa foi alterado com sucesso",
    });
  };

  const handleColorChange = (stageId: string, newColor: string) => {
    const updatedStages = kanbanStages.map(stage =>
      stage.id === stageId ? { ...stage, color: newColor } : stage
    );
    
    setKanbanStages(updatedStages);
    setEditingColor(null);
    
    toast({
      title: "Cor atualizada",
      description: "A cor da etapa foi alterada com sucesso",
    });
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(kanbanStages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setKanbanStages(items);
    
    toast({
      title: "Ordem atualizada",
      description: "As etapas foram reordenadas com sucesso",
    });
  };

  const addNewStage = () => {
    if (!newStageName.trim()) return;

    const newStage: KanbanStage = {
      id: Date.now().toString(),
      name: newStageName,
      color: '#6B7280' // Default gray color
    };

    setKanbanStages([...kanbanStages, newStage]);
    setNewStageName('');
    
    toast({
      title: "Etapa criada",
      description: "Nova etapa adicionada ao kanban",
    });
  };

  const deleteStage = (stageId: string) => {
    if (kanbanStages.length <= 2) {
      toast({
        title: "Erro",
        description: "Você precisa ter pelo menos 2 etapas",
        variant: "destructive",
      });
      return;
    }

    setKanbanStages(kanbanStages.filter(stage => stage.id !== stageId));
    toast({
      title: "Etapa removida",
      description: "A etapa foi removida do kanban",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Configurações</h2>
          <p className="text-muted-foreground">Personalize seu CRM e preferências</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Perfil do Usuário</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-card-foreground">Nome Completo</label>
              <Input
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({...prev, name: e.target.value}))}
                placeholder="Seu nome completo"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-card-foreground">Email</label>
              <Input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({...prev, email: e.target.value}))}
                placeholder="seu@email.com"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email não pode ser alterado
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground">Telefone</label>
              <Input
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({...prev, phone: e.target.value}))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground">Empresa</label>
              <Input
                value={profileData.company}
                onChange={(e) => setProfileData(prev => ({...prev, company: e.target.value}))}
                placeholder="Nome da sua empresa"
              />
            </div>

            <Button 
              onClick={handleSaveProfile}
              className="w-full bg-gradient-to-r from-primary to-primary-dark"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Perfil
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notificações</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Notificações por Email</p>
                <p className="text-sm text-muted-foreground">
                  Receber notificações importantes por email
                </p>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(value) => handlePreferenceChange('emailNotifications', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Notificações do Navegador</p>
                <p className="text-sm text-muted-foreground">
                  Receber notificações push no navegador
                </p>
              </div>
              <Switch
                checked={preferences.browserNotifications}
                onCheckedChange={(value) => handlePreferenceChange('browserNotifications', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Relatórios Diários</p>
                <p className="text-sm text-muted-foreground">
                  Receber resumo diário das atividades
                </p>
              </div>
              <Switch
                checked={preferences.dailyReports}
                onCheckedChange={(value) => handlePreferenceChange('dailyReports', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Relatórios Semanais</p>
                <p className="text-sm text-muted-foreground">
                  Receber resumo semanal detalhado
                </p>
              </div>
              <Switch
                checked={preferences.weeklyReports}
                onCheckedChange={(value) => handlePreferenceChange('weeklyReports', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground">Auto-atribuir Leads</p>
                <p className="text-sm text-muted-foreground">
                  Atribuir automaticamente novos leads para você
                </p>
              </div>
              <Switch
                checked={preferences.autoAssignLeads}
                onCheckedChange={(value) => handlePreferenceChange('autoAssignLeads', value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Configuration - Only for master users */}
      {user?.role === 'master' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Kanban className="w-5 h-5" />
              <span>Configuração do Kanban</span>
            </CardTitle>
          </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure as etapas do seu funil de vendas. Você pode editar os nomes, 
              adicionar novas etapas ou remover as existentes.
            </p>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="stages">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {kanbanStages.map((stage, index) => (
                      <Draggable key={stage.id} draggableId={stage.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center space-x-3 p-3 border border-card-border rounded-lg bg-card transition-all duration-200 ${
                              snapshot.isDragging ? 'shadow-lg scale-105 rotate-1' : 'hover:shadow-md'
                            }`}
                          >
                            <div {...provided.dragHandleProps} className="cursor-move">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm cursor-pointer"
                              style={{ backgroundColor: stage.color }}
                              onClick={() => setEditingColor(editingColor === stage.id ? null : stage.id)}
                            />
                            
                            {editingColor === stage.id && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="color"
                                  value={stage.color}
                                  onChange={(e) => handleColorChange(stage.id, e.target.value)}
                                  className="w-8 h-8 rounded border border-card-border cursor-pointer"
                                />
                              </div>
                            )}
                            
                            <span className="text-sm font-medium text-muted-foreground w-8">
                              #{index + 1}
                            </span>
                            
                            {editingStage === stage.id ? (
                              <div className="flex-1 flex items-center space-x-2">
                                <Input
                                  value={newStageName}
                                  onChange={(e) => setNewStageName(e.target.value)}
                                  placeholder="Nome da etapa"
                                  className="flex-1"
                                  autoFocus
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => handleStageEdit(stage.id, newStageName)}
                                  className="bg-success text-success-foreground"
                                >
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setEditingStage(null);
                                    setNewStageName('');
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-between">
                                <span className="font-medium text-card-foreground">{stage.name}</span>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingColor(editingColor === stage.id ? null : stage.id)}
                                  >
                                    <Palette className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingStage(stage.id);
                                      setNewStageName(stage.name);
                                    }}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </Button>
                                  {kanbanStages.length > 2 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => deleteStage(stage.id)}
                                      className="text-destructive hover:bg-destructive-light"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Add New Stage */}
            <div className="flex items-center space-x-2 pt-4 border-t border-card-border">
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="Nome da nova etapa"
                className="flex-1"
              />
              <Button 
                onClick={addNewStage}
                className="bg-gradient-to-r from-primary to-primary-dark"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Etapa
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>
      )}

      {/* System Info */}
      <Card className="border-primary-muted bg-primary-muted/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>Informações do Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-card-foreground">Versão do CRM</span>
            <Badge variant="outline">v1.0.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-card-foreground">Tipo de Conta</span>
            <Badge className="bg-gradient-to-r from-warning to-warning text-warning-foreground">
              {user?.role === 'master' ? 'Administrador' : 'Usuário'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-card-foreground">Data de Criação</span>
            <span className="text-sm text-muted-foreground">
              {new Date(user?.createdAt || '').toLocaleDateString('pt-BR')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};