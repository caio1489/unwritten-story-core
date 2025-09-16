import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { Lead, Sale } from '@/types/crm';
import { useAuth } from './AuthWrapper';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const AnalyticsPanel: React.FC = () => {
  const { user } = useAuth();
  const [leads] = useLocalStorage<Lead[]>(`leads-${user?.id}`, []);
  const [sales] = useLocalStorage<Sale[]>(`sales-${user?.id}`, []);

  const filteredLeads = leads.filter(lead => 
    user?.role === 'master' || lead.assigned_to === user?.user_id
  );

  const filteredSales = sales.filter(sale => 
    user?.role === 'master' || sale.userId === user?.id
  );

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.value, 0);
    const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Leads by status
    const leadsByStatus = filteredLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = [
      { name: 'Novos', value: leadsByStatus.new || 0, color: '#3B82F6' },
      { name: 'Contatados', value: leadsByStatus.contacted || 0, color: '#EAB308' },
      { name: 'Qualificados', value: leadsByStatus.qualified || 0, color: '#8B5CF6' },
      { name: 'Proposta', value: leadsByStatus.proposal || 0, color: '#F97316' },
      { name: 'Ganho', value: leadsByStatus.won || 0, color: '#22C55E' },
      { name: 'Perdido', value: leadsByStatus.lost || 0, color: '#EF4444' },
    ].filter(item => item.value > 0);

    // Sales by month (last 6 months)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date;
    }).reverse();

    const salesByMonth = last6Months.map(month => {
      const monthSales = filteredSales.filter(sale => {
        const saleDate = new Date(sale.completedAt);
        return saleDate.getMonth() === month.getMonth() && 
               saleDate.getFullYear() === month.getFullYear();
      });

      return {
        month: month.toLocaleDateString('pt-BR', { month: 'short' }),
        sales: monthSales.length,
        revenue: monthSales.reduce((sum, sale) => sum + sale.value, 0)
      };
    });

    // Top products
    const productSales = filteredSales.reduce((acc, sale) => {
      acc[sale.product] = (acc[sale.product] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([product, count]) => ({ product, count }));

    return {
      totalLeads,
      totalSales,
      totalRevenue,
      conversionRate,
      avgTicket,
      statusData,
      salesByMonth,
      topProducts
    };
  }, [filteredLeads, filteredSales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Analytics</h2>
          <p className="text-muted-foreground">Acompanhe o desempenho das suas vendas e conversões</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" className="hover:bg-muted">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" className="hover:bg-muted">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Leads</p>
                <p className="text-3xl font-bold text-primary">{analytics.totalLeads}</p>
              </div>
              <div className="w-12 h-12 bg-primary-muted rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Badge variant="secondary" className="bg-primary-muted text-primary">
                <TrendingUp className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendas Realizadas</p>
                <p className="text-3xl font-bold text-success">{analytics.totalSales}</p>
              </div>
              <div className="w-12 h-12 bg-success-light rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-success" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Badge variant="secondary" className="bg-success-light text-success">
                <TrendingUp className="w-3 h-3 mr-1" />
                {formatPercentage(analytics.conversionRate)} conversão
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                <p className="text-3xl font-bold text-success">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 bg-success-light rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Badge variant="secondary" className="bg-success-light text-success">
                <Calendar className="w-3 h-3 mr-1" />
                Mensal
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
                <p className="text-3xl font-bold text-warning">{formatCurrency(analytics.avgTicket)}</p>
              </div>
              <div className="w-12 h-12 bg-warning-light rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Badge variant="secondary" className="bg-warning-light text-warning">
                Média geral
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Temporariamente simplificados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.statusData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between p-3 border border-card-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium">{entry.name}</span>
                  </div>
                  <Badge variant="secondary">{entry.value} leads</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.salesByMonth.map((month) => (
                <div key={month.month} className="flex items-center justify-between p-3 border border-card-border rounded-lg">
                  <span className="font-medium">{month.month}</span>
                  <div className="text-right">
                    <p className="font-semibold text-success">{formatCurrency(month.revenue)}</p>
                    <p className="text-sm text-muted-foreground">{month.sales} vendas</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary - Simplificado */}
      <Card>
        <CardHeader>
          <CardTitle>Receita por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.salesByMonth.slice(-3).map((month) => (
              <div key={month.month} className="text-center p-4 border border-card-border rounded-lg">
                <h3 className="font-semibold text-lg text-card-foreground">{month.month}</h3>
                <p className="text-2xl font-bold text-success mt-2">{formatCurrency(month.revenue)}</p>
                <p className="text-sm text-muted-foreground">{month.sales} vendas</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      {analytics.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topProducts.map((product, index) => (
                <div key={product.product} className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-primary-muted rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-card-foreground">{product.product}</p>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div 
                        className="bg-gradient-to-r from-primary to-primary-dark h-2 rounded-full transition-all"
                        style={{ width: `${(product.count / analytics.topProducts[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {product.count} vendas
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};