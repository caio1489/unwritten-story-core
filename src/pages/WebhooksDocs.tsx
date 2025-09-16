import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, CheckCircle2, Globe, LinkIcon, Code2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const WebhooksDocs: React.FC = () => {
  useEffect(() => {
    // Basic SEO tags
    document.title = 'Webhooks - Documentação e Guia Rápido';
    const desc = 'Documentação de Webhooks: receba leads (POST/GET) e envie eventos. URLs públicas, exemplos cURL e payload padrão.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
  }, []);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const exampleUrl = 'https://vwegyduejazsqawtidsn.supabase.co/functions/v1/webhook-lead?webhook_id={seu_id}&user_id={uuid_do_usuario}';
  const exampleJson = `{
  "name": "João Silva",
  "email": "joao@empresa.com",
  "phone": "+55 11 99999-0000",
  "company": "Empresa X",
  "value": 5000,
  "tags": ["interessado", "premium"],
  "notes": "Chegou pelo site",
  "source": "Site institucional"
}`;
  const exampleCurl = `curl -X POST \
  '${exampleUrl}' \
  -H 'Content-Type: application/json' \
  -d '${exampleJson.replace(/\n/g, ' ')}'`;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-card-foreground">Documentação de Webhooks</h1>
        <p className="text-muted-foreground">Guia completo para integrar formulários e sistemas externos ao CRM.</p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Endpoints Públicos (sem JWT)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Use as URLs abaixo para integrar sem autenticação. Não exponha dados sensíveis.</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm break-words">
              <div className="flex items-center justify-between gap-4">
                <code className="text-card-foreground">{exampleUrl}</code>
                <Button variant="outline" size="sm" onClick={() => copy(exampleUrl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Parâmetros obrigatórios: webhook_id (string) e user_id (UUID válido).</p>
            </div>
            <div className="text-xs text-muted-foreground">
              • Métodos aceitos: <Badge variant="outline">POST</Badge> e <Badge variant="outline">GET</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" /> Payload Padrão (POST JSON)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Campos mínimos: name, email, phone. Demais são opcionais.</p>
            <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-auto">
{exampleJson}
            </pre>
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs break-words">
              <div className="flex items-center justify-between gap-4">
                <code className="text-card-foreground">{exampleCurl}</code>
                <Button variant="outline" size="sm" onClick={() => copy(exampleCurl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" /> Envio via GET (query string)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Exemplo (compacte e encode os valores):</p>
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs break-words">
              https://vwegyduejazsqawtidsn.supabase.co/functions/v1/webhook-lead?webhook_id=123&user_id=00000000-0000-0000-0000-000000000000&name=Joao%20Silva&email=joao%40empresa.com&phone=11%2099999-0000&source=Site
            </div>
            <p className="text-xs text-muted-foreground">Dica: nunca deixe um "?" ao final do UUID. Se ocorrer, o servidor rejeitará com erro de UUID inválido.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Validações & Regras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>user_id deve ser um UUID válido do seu time. É obrigatório.</li>
              <li>name, email e phone são obrigatórios.</li>
              <li>Leads entram sempre com status "new" e ficam visíveis para o usuário do UUID informado.</li>
              <li>Tags aceitam vírgulas em GET (ex.: tags=a,b,c) e array em POST.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" /> Resposta de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-auto">
{`{
  "success": true,
  "message": "Lead received successfully",
  "leadId": "<uuid>",
  "leadData": { /* eco do lead salvo */ }
}`}
            </pre>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Solução de Problemas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Erro "Missing or invalid user_id": verifique se o parâmetro user_id é um UUID válido e sem caracteres extras.</li>
              <li>Erros 400: confirme os campos obrigatórios (name, email, phone).</li>
              <li>Veja os logs do Edge Function para detalhes.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebhooksDocs;
