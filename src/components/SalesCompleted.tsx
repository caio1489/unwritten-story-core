import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  FileText, 
  Calendar, 
  DollarSign, 
  User, 
  Phone, 
  Mail,
  Building,
  Tag as TagIcon,
  Download,
  Search,
  Edit3,
  Trash2,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Sale, Tag } from '@/types/crm';
import { useAuth } from './AuthWrapper';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';

export const SalesCompleted: React.FC = () => {
  const { user, allAssignableUsers } = useAuth();
  const { toast } = useToast();
  
  // Sistema de sincronização para master ver vendas dos subordinados
  const getMasterAccountId = () => {
    return user?.role === 'master' ? user.id : user?.masterAccountId || user?.id;
  };
  
  // Chave unificada para equipe (master + subordinados)
  const getTeamSalesKey = () => `team-sales-${getMasterAccountId()}`;
  
  const [sales, setSales] = useLocalStorage<Sale[]>(getTeamSalesKey(), []);
  const [tags, setTags] = useLocalStorage<Tag[]>(`tags-${getMasterAccountId()}`, []);

  // Função para sincronizar vendas quando o componente carrega
  useEffect(() => {
    if (user?.role === 'master') {
      // Se é master, carregar vendas de todos os membros da equipe
      const teamSales: Sale[] = [];
      
      // Adicionar vendas próprias do master
      const masterSales = JSON.parse(localStorage.getItem(`sales-${user.id}`) || '[]');
      teamSales.push(...masterSales);
      
      // Adicionar vendas dos subordinados
      allAssignableUsers.forEach(u => {
        if (u.id !== user.id) { // Não duplicar vendas do master
          const userSales = JSON.parse(localStorage.getItem(`sales-${u.id}`) || '[]');
          teamSales.push(...userSales);
        }
      });
      
      // Atualizar o estado com todas as vendas da equipe
      setSales(teamSales);
    }
  }, [user, allAssignableUsers]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [newSale, setNewSale] = useState<Partial<Sale>>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    product: '',
    value: 0,
    tags: [],
    appointmentDate: '',
    notes: '',
    status: 'completed', // 'entry' ou 'completed'
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUser = userFilter === 'all' || sale.userId === userFilter;
    
    const hasAccess = user?.role === 'master' || sale.userId === user?.id;
    
    return hasAccess && matchesSearch && matchesUser;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSale.customerName || !newSale.customerEmail || !newSale.product || !newSale.value) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const sale: Sale = {
      id: editingSale?.id || Date.now().toString(),
      customerName: newSale.customerName!,
      customerEmail: newSale.customerEmail!,
      customerPhone: newSale.customerPhone!,
      product: newSale.product!,
      value: newSale.value!,
      tags: newSale.tags || [],
      appointmentDate: newSale.appointmentDate,
      completedAt: editingSale?.completedAt || new Date().toISOString(),
      userId: user?.id || '',
      notes: newSale.notes || '',
      status: newSale.status as 'entry' | 'completed' || 'completed',
    };

    if (editingSale) {
      // Editando
      setSales(sales.map(s => s.id === editingSale.id ? sale : s));
      
      // Sincronizar com localStorage individual do usuário
      const userKey = `sales-${sale.userId}`;
      const userSales = JSON.parse(localStorage.getItem(userKey) || '[]');
      const updatedUserSales = userSales.map((s: Sale) => s.id === editingSale.id ? sale : s);
      localStorage.setItem(userKey, JSON.stringify(updatedUserSales));
      
      toast({
        title: "Venda atualizada!",
        description: "A venda foi atualizada com sucesso",
      });
    } else {
      // Criando nova
      setSales([...sales, sale]);
      
      // Sincronizar com localStorage individual do usuário
      const userKey = `sales-${sale.userId}`;
      const userSales = JSON.parse(localStorage.getItem(userKey) || '[]');
      localStorage.setItem(userKey, JSON.stringify([...userSales, sale]));
      
      toast({
        title: "Venda registrada!",
        description: "A venda foi registrada com sucesso",
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewSale({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      product: '',
      value: 0,
      tags: [],
      appointmentDate: '',
      notes: '',
      status: 'completed',
    });
    setEditingSale(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setNewSale({
      customerName: sale.customerName,
      customerEmail: sale.customerEmail,
      customerPhone: sale.customerPhone,
      product: sale.product,
      value: sale.value,
      tags: sale.tags,
      appointmentDate: sale.appointmentDate,
      notes: sale.notes,
      status: sale.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (saleId: string) => {
    setSaleToDelete(saleId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      const saleToRemove = sales.find(s => s.id === saleToDelete);
      
      // Remover da estrutura da equipe
      setSales(sales.filter(s => s.id !== saleToDelete));
      
      // Sincronizar com localStorage individual do usuário
      if (saleToRemove) {
        const userKey = `sales-${saleToRemove.userId}`;
        const userSales = JSON.parse(localStorage.getItem(userKey) || '[]');
        const updatedUserSales = userSales.filter((s: Sale) => s.id !== saleToDelete);
        localStorage.setItem(userKey, JSON.stringify(updatedUserSales));
      }
      
      toast({
        title: "Venda excluída",
        description: "A venda foi removida com sucesso",
      });
    }
    setDeleteConfirmOpen(false);
    setSaleToDelete(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setNewSale(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const totalSales = filteredSales.filter(sale => sale.status === 'completed').reduce((sum, sale) => sum + sale.value, 0);
  const totalEntries = filteredSales.filter(sale => sale.status === 'entry').reduce((sum, sale) => sum + sale.value, 0);

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const exportData = filteredSales.map(sale => ({
        'Nome do Cliente': sale.customerName,
        'Email': sale.customerEmail,
        'Telefone': sale.customerPhone,
        'Produto/Serviço': sale.product,
        'Valor': sale.value,
        'Status': sale.status === 'completed' ? 'Concluída' : 'Entrada',
        'Data de Conclusão': formatDate(sale.completedAt),
        'Data de Atendimento': sale.appointmentDate ? formatDate(sale.appointmentDate) : '',
        'Observações': sale.notes,
        'Tags': sale.tags.join(', '),
        'Responsável': allAssignableUsers.find(u => u.id === sale.userId)?.name || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
      
      const fileName = `vendas_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "Exportação concluída!",
        description: `Arquivo ${fileName} foi baixado com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Vendas Concluídas</h2>
          <p className="text-muted-foreground">Gerencie e acompanhe suas vendas finalizadas</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-success to-success text-success-foreground shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSale ? 'Editar Venda' : 'Registrar Nova Venda'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground">Nome do Cliente *</label>
                  <Input
                    value={newSale.customerName || ''}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-card-foreground">Email *</label>
                  <Input
                    type="email"
                    value={newSale.customerEmail || ''}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground">Telefone</label>
                  <Input
                    value={newSale.customerPhone || ''}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-card-foreground">Produto/Serviço *</label>
                  <Input
                    value={newSale.product || ''}
                    onChange={(e) => handleInputChange('product', e.target.value)}
                    placeholder="Nome do produto ou serviço"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-card-foreground">Valor *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newSale.value || ''}
                    onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-card-foreground">Status da Venda *</label>
                  <Select 
                    value={newSale.status || 'completed'} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span>Entrada (Pagamento Parcial)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Venda Concluída</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-card-foreground">Data de Atendimento</label>
                  <Input
                    type="datetime-local"
                    value={newSale.appointmentDate || ''}
                    onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground">Observações</label>
                <Textarea
                  value={newSale.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Adicione observações sobre a venda..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-success to-success text-success-foreground"
                >
                  {editingSale ? 'Atualizar Venda' : 'Registrar Venda'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-success-light rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendas Concluídas</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entradas (Parciais)</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalEntries)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary-muted rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendas Realizadas</p>
                <p className="text-2xl font-bold text-primary">{filteredSales.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-warning-light rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold text-warning">
                  {filteredSales.length > 0 ? formatCurrency((totalSales + totalEntries) / filteredSales.length) : 'R$ 0,00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar vendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {user?.role === 'master' && (
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {allAssignableUsers.map((assignUser) => (
                <SelectItem key={assignUser.id} value={assignUser.id}>
                  {assignUser.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        <Button
          variant="outline"
          onClick={exportToExcel}
          className="flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Excel</span>
        </Button>
      </div>

      {/* Sales List */}
      <div className="grid gap-4">
        {filteredSales.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">Nenhuma venda encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma venda corresponde à sua busca' : 'Registre sua primeira venda para começar'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-card-foreground">{sale.customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span>{sale.customerEmail}</span>
                    </div>
                    {sale.customerPhone && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{sale.customerPhone}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-card-foreground">{sale.product}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <DollarSign className="w-3 h-3 text-success" />
                      <span className="font-semibold text-success">{formatCurrency(sale.value)}</span>
                    </div>
                    {/* Status Badge */}
                    <div className="flex items-center space-x-2">
                      {sale.status === 'entry' ? (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Entrada
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Concluída
                        </Badge>
                      )}
                    </div>
                  </div>

                    <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>Concluída: {formatDate(sale.completedAt)}</span>
                    </div>
                    {sale.appointmentDate && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Atendimento: {formatDate(sale.appointmentDate)}</span>
                      </div>
                    )}
                    {/* Usuário Responsável */}
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>Responsável: {(() => {
                        const responsibleUser = allAssignableUsers.find(u => u.id === sale.userId);
                        return responsibleUser?.name || 'Usuário não encontrado';
                      })()}</span>
                    </div>
                    {sale.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sale.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <TagIcon className="w-2 h-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(sale)}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    {/* Botão de excluir - apenas para admins */}
                    {user?.role === 'master' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(sale.id)}
                        className="text-destructive hover:bg-destructive-light"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
                
                {sale.notes && (
                  <div className="mt-4 pt-4 border-t border-card-border">
                    <p className="text-sm text-muted-foreground">{sale.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};