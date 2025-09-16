import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { EditLeadModal } from '@/components/EditLeadModal';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  DollarSign, 
  Calendar, 
  Tag, 
  MessageSquare,
  Send,
  Clock,
  User,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthWrapper';
import { useToast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  value?: number;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  tags: string[];
  assigned_to: string;
  created_at: string;
  updated_at: string;
  notes: string;
  source: string;
  user_id: string;
}

interface LeadFeedback {
  id: string;
  lead_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    name: string;
  };
}

const statusColors = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  contacted: 'bg-orange-100 text-orange-700 border-orange-200',
  qualified: 'bg-purple-100 text-purple-700 border-purple-200',
  proposal: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  won: 'bg-green-100 text-green-700 border-green-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
};

const statusNames = {
  new: 'Novo Lead',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  proposal: 'Proposta',
  won: 'Fechado',
  lost: 'Perdido',
};

export const LeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [feedback, setFeedback] = useState<LeadFeedback[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (!leadId || !user) return;
    
    fetchLead();
    fetchFeedback();
  }, [leadId, user]);

  const fetchLead = async () => {
    if (!leadId || !user) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) {
        console.error('Error fetching lead:', error);
        toast({
          title: "Erro",
          description: "Lead não encontrado",
          variant: "destructive",
        });
        navigate('/crm');
        return;
      }

      setLead(data as Lead);
    } catch (error) {
      console.error('Error fetching lead:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    if (!leadId) return;

    try {
      const { data, error } = await supabase
        .from('lead_feedback')
        .select(`
          *,
          profiles:user_id (name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching feedback:', error);
        return;
      }

      setFeedback(data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !leadId || !user || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('lead_feedback')
        .insert({
          lead_id: leadId,
          user_id: user.user_id,
          message: newMessage.trim(),
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Erro",
          description: "Erro ao enviar mensagem",
          variant: "destructive",
        });
        return;
      }

      setNewMessage('');
      await fetchFeedback();
      
      toast({
        title: "Sucesso!",
        description: "Mensagem enviada",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Lead não encontrado</h2>
          <Button onClick={() => navigate('/crm')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao CRM
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/crm')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{lead.name}</h1>
              <p className="text-slate-600">Detalhes do Lead</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setEditModalOpen(true)}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Editar</span>
            </Button>
            <Badge className={`${statusColors[lead.status]} px-4 py-2 text-sm font-semibold`}>
              {statusNames[lead.status]}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lead Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Informações Básicas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{lead.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{lead.phone}</p>
                    </div>
                  </div>
                  
                  {lead.company && (
                    <div className="flex items-center space-x-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Empresa</p>
                        <p className="font-medium">{lead.company}</p>
                      </div>
                    </div>
                  )}
                  
                  {lead.value && lead.value > 0 && (
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Valor</p>
                        <p className="font-medium text-green-600">{formatCurrency(lead.value)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Tags</span>
                  </div>
                  {lead.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-primary/10 text-primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhuma tag atribuída</p>
                  )}
                </div>

                {lead.notes && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium">Notas</h4>
                      <p className="text-muted-foreground">{lead.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline/Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="font-medium">{formatDate(lead.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Última atualização</p>
                    <p className="font-medium">{formatDate(lead.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fonte</p>
                    <p className="font-medium">{lead.source}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat/Feedback Section */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Feedback & Notas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Messages */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {feedback.length > 0 ? (
                    feedback.map((msg) => (
                      <div key={msg.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {msg.profiles?.name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {msg.profiles?.name || 'Usuário'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{msg.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma conversa ainda</p>
                      <p className="text-xs">Inicie a conversa abaixo</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* New Message */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Digite uma nota ou feedback..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="w-full"
                    size="sm"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Lead Modal */}
      <EditLeadModal
        lead={lead}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onLeadUpdated={fetchLead}
      />
    </div>
  );
};