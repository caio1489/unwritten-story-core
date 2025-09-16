export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  value?: number;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  tags: string[];
  assigned_to: string; // User ID
  created_at: string;
  updated_at: string;
  notes: string;
  source: string;
  user_id: string;
}

export interface Sale {
  id: string;
  leadId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  product: string;
  value: number;
  tags: string[];
  proof?: File | string; // File attachment or base64
  appointmentDate?: string;
  completedAt: string;
  userId: string;
  notes: string;
  status: 'entry' | 'completed'; // entrada ou venda concluída
}

export interface KanbanColumn {
  id: string;
  title: string;
  leads: Lead[];
  color?: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  type: 'incoming' | 'outgoing';
  events: string[];
  isActive: boolean;
  createdAt: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  destinationUrl?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
}