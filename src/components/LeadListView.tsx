import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Phone, 
  Mail, 
  Building, 
  DollarSign,
  Calendar,
  User,
  Users,
  Send,
  Search,
  Trash2
} from 'lucide-react';
import { Lead } from '@/types/crm';
import { useAuth } from './AuthWrapper';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

interface LeadListViewProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onLeadsUpdate: (leads: Lead[]) => void;
}

export const LeadListView: React.FC<LeadListViewProps> = ({ 
  leads, 
  onLeadClick, 
  onLeadsUpdate 
}) => {
  const { user, users, allAssignableUsers } = useAuth();
  const { toast } = useToast();
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [assignToUser, setAssignToUser] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700 border-blue-200',
      contacted: 'bg-orange-100 text-orange-700 border-orange-200',
      qualified: 'bg-purple-100 text-purple-700 border-purple-200',
      proposal: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      won: 'bg-green-100 text-green-700 border-green-200',
      lost: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  const getStatusText = (status: string) => {
    const texts = {
      new: 'Novo',
      contacted: 'Contatado',
      qualified: 'Qualificado',
      proposal: 'Proposta',
      won: 'Fechado',
      lost: 'Perdido',
    };
    return texts[status as keyof typeof texts] || status;
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleAssignLeads = async () => {
    if (!assignToUser || selectedLeads.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione leads e um responsável",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: assignToUser, updated_at: new Date().toISOString() })
        .in('id', selectedLeads);

      if (error) {
        console.error('Erro ao delegar leads:', error);
        toast({
          title: "Erro",
          description: "Não foi possível delegar os leads",
          variant: "destructive",
        });
        return;
      }

      const updatedLeads = leads.map(lead => 
        selectedLeads.includes(lead.id) 
          ? { ...lead, assigned_to: assignToUser, updated_at: new Date().toISOString() }
          : lead
      );

      onLeadsUpdate(updatedLeads);
      
      const assignedUser = users.find(u => u.id === assignToUser);
      toast({
        title: "Leads delegados",
        description: `${selectedLeads.length} lead(s) atribuído(s) para ${assignedUser?.name}`,
      });

      setSelectedLeads([]);
      setAssignToUser('');
    } catch (err) {
      console.error('Erro inesperado ao delegar:', err);
      toast({
        title: "Erro",
        description: "Erro inesperado ao delegar leads",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLeads = async () => {
    if (selectedLeads.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione leads para excluir",
        variant: "destructive",
      });
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir ${selectedLeads.length} lead(s)? Esta ação não pode ser desfeita.`
    );

    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedLeads);

      if (error) {
        console.error('Erro ao excluir leads:', error);
        toast({
          title: "Erro",
          description: "Não foi possível excluir os leads",
          variant: "destructive",
        });
        return;
      }

      const updatedLeads = leads.filter(lead => !selectedLeads.includes(lead.id));
      onLeadsUpdate(updatedLeads);
      
      toast({
        title: "Leads excluídos",
        description: `${selectedLeads.length} lead(s) excluído(s) com sucesso`,
      });

      setSelectedLeads([]);
    } catch (err) {
      console.error('Erro inesperado ao excluir:', err);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir leads",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getMasterUsers = () => {
    if (user?.role !== 'master') return [user!];
    return [user, ...users]; // Inclui o admin atual + membros da equipe
  };

  // Filter leads based on user permissions, search term, and user filter
  let filteredLeads = leads;
  
  // Filter by user role permissions
  if (user?.role !== 'master') {
    filteredLeads = filteredLeads.filter(lead => 
      lead.assigned_to === user?.user_id || lead.user_id === user?.user_id
    );
  }
  
  // Filter by selected user
  if (filterUser !== 'all') {
    filteredLeads = filteredLeads.filter(lead => 
      lead.assigned_to === filterUser || lead.user_id === filterUser
    );
  }
  
  // Filter by search term
  if (searchTerm) {
    filteredLeads = filteredLeads.filter(lead => 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lead.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }
  
  const visibleLeads = filteredLeads;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome, email, telefone ou tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {allAssignableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{u.name}</span>
                        {u.id === user?.id && <span className="text-xs text-muted-foreground">(Você)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {user?.role === 'master' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Checkbox
                  checked={selectedLeads.length === visibleLeads.length && visibleLeads.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedLeads.length > 0 ? `${selectedLeads.length} selecionado(s)` : 'Selecionar todos'}
                </span>
              </div>
              
              {selectedLeads.length > 0 && (
                <div className="flex items-center space-x-3">
                  <Select value={assignToUser} onValueChange={setAssignToUser}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Delegar para..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getMasterUsers().map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>{u.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAssignLeads}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Delegar
                  </Button>
                  <Button 
                    onClick={handleDeleteLeads}
                    disabled={deleting}
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    {deleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leads List */}
      <div className="space-y-3">
        {visibleLeads.map((lead) => (
          <Card 
            key={lead.id} 
            className="hover:shadow-md transition-all duration-200 cursor-pointer group"
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                {/* Checkbox */}
                {user?.role === 'master' && (
                  <Checkbox
                    checked={selectedLeads.includes(lead.id)}
                    onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}

                {/* Lead Info */}
                <div 
                  className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center"
                  onClick={() => onLeadClick(lead)}
                >
                  {/* Name & Tags */}
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                      {lead.name}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.slice(0, 2).map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="text-xs bg-primary/10 text-primary border border-primary/20"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {lead.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{lead.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="w-3 h-3 mr-2 text-primary" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="w-3 h-3 mr-2 text-primary" />
                      <span>{lead.phone}</span>
                    </div>
                  </div>

                  {/* Company */}
                  <div className="hidden md:block">
                    {lead.company && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Building className="w-3 h-3 mr-2 text-primary" />
                        <span className="truncate">{lead.company}</span>
                      </div>
                    )}
                  </div>

                  {/* Value */}
                  <div className="hidden md:block">
                    {lead.value && (
                      <div className="flex items-center text-sm font-semibold text-green-700">
                        <DollarSign className="w-3 h-3 mr-1" />
                        <span>{formatCurrency(lead.value)}</span>
                      </div>
                    )}
                  </div>

                  {/* Status & Date */}
                  <div className="flex items-center justify-between md:flex-col md:items-end space-y-2">
                    <Badge className={`${getStatusColor(lead.status)} text-xs font-medium border`}>
                      {getStatusText(lead.status)}
                    </Badge>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Assigned User */}
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary-dark text-white font-bold">
                      {(() => {
                        const assignedUser = allAssignableUsers.find(u => u.id === lead.assigned_to);
                        return assignedUser ? assignedUser.name.slice(0, 2).toUpperCase() : 'NN';
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {(() => {
                      const assignedUser = allAssignableUsers.find(u => u.id === lead.assigned_to);
                      return assignedUser?.name || 'N/A';
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {visibleLeads.length === 0 && (
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum lead encontrado</p>
              <p className="text-sm text-muted-foreground/60">Crie um novo lead para começar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};