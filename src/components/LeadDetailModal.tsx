import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Phone, 
  Mail, 
  Building, 
  DollarSign,
  Calendar,
  User,
  Tag,
  FileText,
  MapPin,
  Edit
} from 'lucide-react';
import { Lead } from '@/types/crm';
import { useAuth } from './AuthWrapper';

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ 
  lead, 
  open, 
  onOpenChange, 
  onEdit 
}) => {
  const { allAssignableUsers } = useAuth();
  
  if (!lead) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      new: 'Novo Lead',
      contacted: 'Contatado',
      qualified: 'Qualificado',
      proposal: 'Proposta',
      won: 'Fechado',
      lost: 'Perdido',
    };
    return texts[status as keyof typeof texts] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-card-foreground">
              {lead.name}
            </DialogTitle>
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEdit(lead)}
                className="hover:bg-muted"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Badge className={`${getStatusColor(lead.status)} font-semibold px-3 py-1 border`}>
              {getStatusText(lead.status)}
            </Badge>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary-dark text-white font-bold">
                  {(() => {
                    const assignedUser = allAssignableUsers.find(u => u.user_id === lead.assigned_to);
                    return assignedUser ? assignedUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                  })()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-card-foreground flex items-center">
              <Phone className="w-4 h-4 mr-2 text-primary" />
              Informações de Contato
            </h3>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-card-foreground">
                <Mail className="w-4 h-4 mr-3 text-primary flex-shrink-0" />
                <span className="font-medium">{lead.email}</span>
              </div>
              <div className="flex items-center text-sm text-card-foreground">
                <Phone className="w-4 h-4 mr-3 text-primary flex-shrink-0" />
                <span className="font-medium">{lead.phone}</span>
              </div>
              {lead.company && (
                <div className="flex items-center text-sm text-card-foreground">
                  <Building className="w-4 h-4 mr-3 text-primary flex-shrink-0" />
                  <span className="font-medium">{lead.company}</span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned User */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center text-purple-700">
              <User className="w-5 h-5 mr-2" />
              <div>
                <p className="text-sm font-medium">Usuário Responsável</p>
                <p className="font-semibold">
                  {(() => {
                    const assignedUser = allAssignableUsers.find(u => u.user_id === lead.assigned_to);
                    return assignedUser ? assignedUser.name : 'Não atribuído';
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Value and Source */}
          <div className="grid grid-cols-2 gap-4">
            {lead.value && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center text-green-700">
                  <DollarSign className="w-5 h-5 mr-2" />
                  <div>
                    <p className="text-sm font-medium">Valor Estimado</p>
                    <p className="text-lg font-bold">{formatCurrency(lead.value)}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center text-blue-700">
                <MapPin className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">Origem</p>
                  <p className="font-semibold">{lead.source}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-card-foreground flex items-center">
                <Tag className="w-4 h-4 mr-2 text-primary" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="bg-primary/10 text-primary border border-primary/20 font-medium"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="space-y-3">
              <h3 className="font-semibold text-card-foreground flex items-center">
                <FileText className="w-4 h-4 mr-2 text-primary" />
                Observações
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-card-foreground whitespace-pre-wrap">{lead.notes}</p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-muted/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Criado em:</span>
              </div>
              <span className="font-medium">{formatDate(lead.created_at)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Atualizado em:</span>
              </div>
              <span className="font-medium">{formatDate(lead.updated_at)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};