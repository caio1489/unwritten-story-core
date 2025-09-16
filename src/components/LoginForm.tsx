import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

interface LoginFormProps {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export const LoginForm: React.FC<LoginFormProps> = ({ login, register }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          toast({
            title: "Erro no login",
            description: result.error || "Email ou senha incorretos",
            variant: "destructive",
          });
        }
      } else {
        const result = await register(formData.name, formData.email, formData.password);
        if (!result.success) {
          toast({
            title: "Erro no cadastro",
            description: result.error || "Erro ao criar conta",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Conta criada!",
            description: "Verifique seu email para confirmar a conta",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-card-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center shadow-primary">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            {isLogin ? 'Entrar no CRM' : 'Criar Conta'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Input
                  name="name"
                  type="text"
                  placeholder="Nome completo"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="h-11"
                />
              </div>
            )}
            <div>
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="h-11"
              />
            </div>
            <div>
              <Input
                name="password"
                type="password"
                placeholder="Senha"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="h-11"
              />
            </div>
            
            {isLogin && (
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <strong>Dica:</strong> Usuários da equipe podem fazer login imediatamente após serem criados pelo administrador. 
                Contas master precisam confirmar o email primeiro.
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-md"
              disabled={isLoading}
            >
              {isLoading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', email: '', password: '' });
              }}
              className="text-muted-foreground hover:text-primary"
            >
              {isLogin
                ? 'Não tem conta? Cadastre-se'
                : 'Já tem conta? Faça login'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};