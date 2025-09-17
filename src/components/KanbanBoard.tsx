import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MoreHorizontal, 
  Settings,
  Plus,
  AlertCircle,
  TrendingUp,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  Zap,
  List,
  LayoutGrid,
  Phone,
  Search,
  Filter,
  Users,
  Trash2
} from 'lucide-react';
import { Lead, KanbanColumn } from '@/types/crm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthWrapper';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { NewLeadModal } from './NewLeadModal';
import { LeadDetailModal } from './LeadDetailModal';
import { LeadListView } from './LeadListView';

const defaultColumns: KanbanColumn[] = [
  { id: 'new', title: 'Novos Leads', leads: [] },
  { id: 'contacted', title: 'Contatados', leads: [] },
  { id: 'qualified', title: 'Qualificados', leads: [] },
  { id: 'proposal', title: 'Proposta', leads: [] },
  { id: 'won', title: 'Fechado', leads: [] },
  { id: 'lost', title: 'Perdido', leads: [] },
];

const getColumnIcon = (columnId: string) => {
  switch (columnId) {
    case 'new': return Zap;
    case 'contacted': return Phone;
    case 'qualified': return Target;
    case 'proposal': return TrendingUp;
    case 'won': return CheckCircle2;
    case 'lost': return XCircle;
    default: return Clock;
  }
};

export const KanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const { user, allAssignableUsers } = useAuth();
  const { toast } = useToast();
  const [columns, setColumns] = useState<KanbanColumn[]>(defaultColumns);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load kanban stages from settings
  const [kanbanStages] = useLocalStorage(`kanban-stages-${user?.id}`, [
    { id: 'new', name: 'Novos Leads', color: '#3B82F6' },
    { id: 'contacted', name: 'Contatados', color: '#EAB308' },
    { id: 'qualified', name: 'Qualificados', color: '#8B5CF6' },
    { id: 'proposal', name: 'Proposta', color: '#F97316' },
    { id: 'won', name: 'Ganho', color: '#22C55E' },
    { id: 'lost', name: 'Perdido', color: '#EF4444' },
  ]);

  // Fetch leads from Supabase
  useEffect(() => {
    if (!user) return;
    fetchLeads();
  }, [user]);

  // Realtime updates for leads
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, () => {
        fetchLeads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar leads",
          variant: "destructive",
        });
        return;
      }

      setLeads(data as Lead[] || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize columns with leads
  useEffect(() => {
    // Use custom kanban stages from settings
    const stageColumns = kanbanStages.map(stage => ({
      id: stage.id,
      title: stage.name,
      leads: [] as Lead[],
      color: stage.color
    }));

    // Filter leads based on user filter and search term
    let filteredLeads = leads;
    
    if (filterUser !== 'all') {
      filteredLeads = leads.filter(lead => lead.assigned_to === filterUser || lead.user_id === filterUser);
    }

    if (searchTerm) {
      filteredLeads = filteredLeads.filter(lead => 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    const updatedColumns = stageColumns.map(column => ({
      ...column,
      leads: filteredLeads.filter(lead => lead.status === column.id)
    }));
    
    setColumns(updatedColumns);
  }, [leads, user, kanbanStages, filterUser, searchTerm]);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    // Only allow master users to move leads between columns
    if (user?.role !== 'master') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem mover leads entre etapas",
        variant: "destructive",
      });
      return;
    }

    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const leadId = result.draggableId;
    const newStatus = destination.droppableId as Lead['status'];

    // Optimistically update UI
    const updatedLeads = leads.map(lead => 
      lead.id === leadId 
        ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
        : lead
    );
    
    setLeads(updatedLeads);

    try {
      // Update in database
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', leadId);

      if (error) {
        console.error('Error updating lead status:', error);
        // Revert optimistic update on error
        fetchLeads();
        toast({
          title: "Erro",
          description: "Erro ao atualizar status do lead",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Lead atualizado",
        description: `Lead movido para ${columns.find(c => c.id === newStatus)?.title}`,
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      fetchLeads();
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar lead",
        variant: "destructive",
      });
    }
  };

  const getColumnColor = (columnColor: string) => {
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    
    const hsl = hexToHsl(columnColor);
    return `border-[hsl(${hsl})] bg-gradient-to-br from-[hsl(${hsl}/10%)] to-[hsl(${hsl}/20%)] shadow-[hsl(${hsl}/10%)]`;
  };

  const getBadgeColor = (columnId: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700 border-blue-200 font-semibold',
      contacted: 'bg-orange-100 text-orange-700 border-orange-200 font-semibold',
      qualified: 'bg-purple-100 text-purple-700 border-purple-200 font-semibold',
      proposal: 'bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold',
      won: 'bg-green-100 text-green-700 border-green-200 font-semibold',
      lost: 'bg-red-100 text-red-700 border-red-200 font-semibold',
    };
    return colors[columnId as keyof typeof colors] || 'bg-muted text-muted-foreground border-border';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const handleLeadClick = (lead: Lead) => {
    // Navigate to individual lead page instead of modal
    navigate(`/lead/${lead.id}`);
  };

  const handleLeadsUpdate = (updatedLeads: Lead[]) => {
    setLeads(updatedLeads);
  };

  const handleDeleteLead = async (leadId: string, leadName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Previne a navegação ao clicar no botão de deletar
    
    if (user?.role !== 'master') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir leads",
        variant: "destructive",
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir o lead "${leadName}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) {
        console.error('Error deleting lead:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir lead",
          variant: "destructive",
        });
        return;
      }

      const updatedLeads = leads.filter(lead => lead.id !== leadId);
      setLeads(updatedLeads);
      
      toast({
        title: "Sucesso!",
        description: "Lead excluído com sucesso",
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir lead",
        variant: "destructive",
      });
    }
  };

  const allLeads = leads;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/5 to-success-light/10">
      {/* Premium Header */}
      <div className="glass-effect sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-primary animate-pulse-glow">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Pipeline de Vendas
                  </h1>
                  <p className="text-muted-foreground font-medium">Gerencie seus leads com inteligência</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Premium View Toggle */}
                <div className="glass-effect rounded-xl p-1.5 shadow-card">
                  <Button
                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('kanban')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      viewMode === 'kanban' 
                        ? 'bg-gradient-primary text-white shadow-primary' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Kanban
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      viewMode === 'list' 
                        ? 'bg-gradient-primary text-white shadow-primary' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <List className="w-4 h-4 mr-2" />
                    Lista
                  </Button>
                </div>
                
                {user?.role !== 'master' && (
                  <div className="glass-effect text-sm text-warning px-4 py-2 rounded-xl border border-warning/20 bg-warning-light/10">
                    <AlertCircle className="w-4 h-4 mr-2 inline" />
                    Visualização limitada
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center glass-effect px-4 py-2 rounded-xl">
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="ml-2 font-bold text-lg bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                  {allLeads.length}
                </span>
              </div>
              
              <Button 
                onClick={() => setNewLeadModalOpen(true)}
                className="bg-gradient-primary hover:bg-gradient-primary/90 text-white hover:shadow-primary hover:scale-105 transition-all duration-300 px-6 py-3 rounded-xl font-semibold shadow-lg animate-pulse-glow"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Lead
              </Button>
            </div>
          </div>

          {/* Premium Filters */}
          <div className="flex items-center space-x-4 mt-6">
            {/* Premium Search */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Buscar por nome, email, telefone ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 glass-effect border-0 rounded-xl text-base placeholder:text-muted-foreground/70 focus:shadow-primary"
              />
            </div>

            {/* Premium User Filter */}
            {user?.role === 'master' && (
              <div className="flex items-center space-x-3 glass-effect px-4 py-2 rounded-xl">
                <Filter className="w-5 h-5 text-primary" />
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="w-52 border-0 bg-transparent">
                    <SelectValue placeholder="Filtrar por usuário" />
                  </SelectTrigger>
                  <SelectContent className="glass-effect border-border/50">
                    <SelectItem value="all" className="font-medium">Todos os usuários</SelectItem>
                    {allAssignableUsers.map((assignableUser) => (
                      <SelectItem key={assignableUser.id} value={assignableUser.id}>
                        <div className="flex items-center space-x-3">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="font-medium">{assignableUser.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {viewMode === 'kanban' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex space-x-6 overflow-x-auto pb-8 snap-x snap-mandatory">
              {columns.map((column, index) => {
                const IconComponent = getColumnIcon(column.id);
                const totalValue = column.leads?.reduce((sum, lead) => sum + (lead.value || 0), 0) || 0;
                
                return (
                  <div key={column.id} className="flex-shrink-0 w-80 snap-start">
                    <div className="glass-effect rounded-2xl border border-border/30 p-6 h-full shadow-card card-hover animate-slide-up min-h-[600px]"
                         style={{ animationDelay: `${index * 0.1}s` }}>
                      
                      {/* Premium Column Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg animate-float"
                            style={{ 
                              background: `linear-gradient(135deg, ${column.color || '#6B7280'}, ${column.color || '#6B7280'}CC)`,
                              animationDelay: `${index * 0.2}s`
                            }}
                          >
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xl text-foreground mb-1">
                              {column.title}
                            </h3>
                            {totalValue > 0 && (
                              <p className="text-sm font-bold bg-gradient-to-r from-success to-success-dark bg-clip-text text-transparent">
                                {formatCurrency(totalValue)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className="px-3 py-1.5 font-bold border-2 glass-effect"
                            style={{ 
                              backgroundColor: `${column.color || '#6B7280'}15`,
                              borderColor: column.color || '#6B7280',
                              color: column.color || '#6B7280'
                            }}
                          >
                            {column.leads?.length || 0}
                          </Badge>
                          {user?.role === 'master' && (
                            <Button variant="ghost" size="sm" className="hover:bg-white/60 rounded-xl p-2">
                              <Settings className="w-4 h-4 text-slate-600" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Premium Droppable Area */}
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={`space-y-3 min-h-[500px] transition-all duration-500 ease-out ${
                                snapshot.isDraggingOver && user?.role === 'master' 
                                  ? 'bg-gradient-to-b from-primary/5 to-primary/10 rounded-2xl ring-2 ring-primary/30 shadow-inner transform scale-[1.01]' 
                                  : ''
                              }`}
                            >
                            {column.leads?.map((lead, index) => (
                              <Draggable 
                                key={lead.id} 
                                draggableId={lead.id} 
                                index={index} 
                                isDragDisabled={user?.role !== 'master'}
                              >
                                 {(provided, snapshot) => (
                                   <Card
                                     ref={provided.innerRef}
                                     {...provided.draggableProps}
                                     {...provided.dragHandleProps}
                                     onClick={() => handleLeadClick(lead)}
                                     className={`${user?.role === 'master' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} 
                                       transition-all duration-300 ease-out border-0 group
                                       glass-effect shadow-card hover:shadow-lg
                                       ${snapshot.isDragging ? 'dragging' : 'card-hover'} 
                                       ${user?.role !== 'master' ? 'opacity-95' : ''}
                                       rounded-2xl overflow-hidden transform-gpu`}
                                   >
                                     <CardContent className="p-5">
                                       <div className="space-y-4">
                                           {/* Premium Header */}
                                           <div className="flex items-start justify-between">
                                             <div className="flex-1 min-w-0">
                                               <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                                                 {lead.name}
                                               </h3>
                                               {lead.company && (
                                                 <p className="text-sm text-muted-foreground font-medium mt-1 truncate">
                                                   {lead.company}
                                                 </p>
                                               )}
                                             </div>
                                             
                                             <div className="flex items-center space-x-2 ml-3">
                                               {lead.value && (
                                                 <span className="text-sm font-bold bg-gradient-to-r from-success to-success-dark bg-clip-text text-transparent whitespace-nowrap">
                                                   {formatCurrency(lead.value)}
                                                 </span>
                                               )}
                                               {user?.role === 'master' && (
                                                 <Button
                                                   variant="ghost"
                                                   size="sm"
                                                   onClick={(e) => handleDeleteLead(lead.id, lead.name, e)}
                                                   className="opacity-0 group-hover:opacity-100 transition-all duration-300 h-8 w-8 p-0 hover:bg-destructive-light hover:text-destructive rounded-lg"
                                                   title="Excluir lead"
                                                 >
                                                   <Trash2 className="h-4 w-4" />
                                                 </Button>
                                               )}
                                             </div>
                                           </div>

                                          {/* Premium Tags */}
                                          {lead.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                              {lead.tags.slice(0, 2).map((tag) => (
                                                <Badge 
                                                  key={tag} 
                                                  variant="secondary" 
                                                  className="text-xs px-3 py-1 glass-effect border border-primary/20 text-primary font-semibold rounded-full"
                                                >
                                                  {tag}
                                                </Badge>
                                              ))}
                                              {lead.tags.length > 2 && (
                                                <Badge 
                                                  variant="outline" 
                                                  className="text-xs px-3 py-1 border-primary/30 text-primary/70 rounded-full font-semibold glass-effect"
                                                >
                                                  +{lead.tags.length - 2}
                                                </Badge>
                                              )}
                                            </div>
                                          )}

                                          {/* Premium Footer */}
                                          <div className="flex items-center justify-between pt-3 border-t border-border/30">
                                            <div className="flex items-center space-x-2">
                                              <div className="w-2 h-2 rounded-full bg-primary/30"></div>
                                              <span className="text-xs text-muted-foreground font-medium">
                                                {formatDate(lead.created_at)}
                                              </span>
                                            </div>
                                            
                                            <div className="flex items-center space-x-3">
                                              <span className="text-xs text-muted-foreground font-medium truncate max-w-20">
                                                {(() => {
                                                  const assignedUser = allAssignableUsers.find(u => u.user_id === lead.assigned_to);
                                                  return assignedUser ? assignedUser.name.split(' ')[0] : 'Não atribuído';
                                                })()}
                                              </span>
                                              <Avatar className="w-7 h-7 border-2 border-white/50 shadow-sm ring-1 ring-primary/20">
                                                <AvatarFallback className="text-xs bg-gradient-primary text-white font-bold">
                                                  {(() => {
                                                    const assignedUser = allAssignableUsers.find(u => u.user_id === lead.assigned_to);
                                                    return assignedUser ? assignedUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                                                  })()}
                                                </AvatarFallback>
                                              </Avatar>
                                            </div>
                                          </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            
                            {/* Premium Empty State */}
                            {(!column.leads || column.leads.length === 0) && (
                              <div className="flex flex-col items-center justify-center py-16 text-center animate-slide-up">
                                <div 
                                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 glass-effect animate-float"
                                  style={{ backgroundColor: `${column.color || '#6B7280'}15` }}
                                >
                                  <IconComponent 
                                    className="w-10 h-10" 
                                    style={{ color: column.color || '#6B7280' }}
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground font-semibold mb-2">Nenhum lead aqui</p>
                                <p className="text-xs text-muted-foreground/70">
                                  {user?.role === 'master' ? 'Arraste leads para esta etapa' : 'Aguardando leads...'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        ) : (
          <LeadListView 
            leads={allLeads}
            onLeadClick={handleLeadClick}
            onLeadsUpdate={handleLeadsUpdate}
          />
        )}
      </div>

      {/* New Lead Modal */}
      <NewLeadModal 
        open={newLeadModalOpen} 
        onOpenChange={setNewLeadModalOpen}
        onLeadCreated={fetchLeads}
      />

      {/* Lead Detail Modal */}
      <LeadDetailModal 
        lead={selectedLead}
        open={leadDetailOpen}
        onOpenChange={setLeadDetailOpen}
      />
    </div>
  );
};