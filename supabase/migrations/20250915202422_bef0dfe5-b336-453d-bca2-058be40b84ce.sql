-- Criar tabela de leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  tags TEXT[] DEFAULT '{}',
  assigned_to UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT DEFAULT '',
  source TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  CONSTRAINT valid_status CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'))
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
CREATE POLICY "Users can view leads assigned to them or their team" 
ON public.leads 
FOR SELECT 
USING (
  assigned_to = auth.uid() OR 
  user_id = auth.uid() OR 
  user_id IN (
    SELECT user_id FROM profiles 
    WHERE master_account_id = auth.uid()
  )
);

CREATE POLICY "Users can create leads for themselves or their team" 
ON public.leads 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT user_id FROM profiles 
    WHERE master_account_id = auth.uid()
  )
);

CREATE POLICY "Users can update leads assigned to them or their team" 
ON public.leads 
FOR UPDATE 
USING (
  assigned_to = auth.uid() OR 
  user_id = auth.uid() OR 
  user_id IN (
    SELECT user_id FROM profiles 
    WHERE master_account_id = auth.uid()
  )
);

CREATE POLICY "Users can delete leads from their team" 
ON public.leads 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  user_id IN (
    SELECT user_id FROM profiles 
    WHERE master_account_id = auth.uid()
  )
);

-- Create lead_feedback table for chat-like feedback
CREATE TABLE public.lead_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lead_feedback
ALTER TABLE public.lead_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for lead_feedback
CREATE POLICY "Users can view feedback for leads they have access to" 
ON public.lead_feedback 
FOR SELECT 
USING (
  lead_id IN (
    SELECT id FROM leads 
    WHERE assigned_to = auth.uid() OR 
          user_id = auth.uid() OR 
          user_id IN (
            SELECT user_id FROM profiles 
            WHERE master_account_id = auth.uid()
          )
  )
);

CREATE POLICY "Users can create feedback for leads they have access to" 
ON public.lead_feedback 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND 
  lead_id IN (
    SELECT id FROM leads 
    WHERE assigned_to = auth.uid() OR 
          user_id = auth.uid() OR 
          user_id IN (
            SELECT user_id FROM profiles 
            WHERE master_account_id = auth.uid()
          )
  )
);

-- Add triggers for updating timestamps
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_feedback_updated_at
BEFORE UPDATE ON public.lead_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_lead_feedback_lead_id ON public.lead_feedback(lead_id);
CREATE INDEX idx_lead_feedback_user_id ON public.lead_feedback(user_id);