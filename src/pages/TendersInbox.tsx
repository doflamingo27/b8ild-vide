import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle, XCircle, Trash2, Copy } from "lucide-react";
import { labels, emptyStates, toasts } from "@/lib/content";
import EmptyState from "@/components/EmptyState";

const TendersInbox = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: inboxItems = [], isLoading } = useQuery({
    queryKey: ["tender-inbox", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tender_inbox")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const convertMutation = useMutation({
    mutationFn: async (inboxId: string) => {
      // Appeler l'edge function pour parser et créer l'AO
      const { data, error } = await supabase.functions.invoke('parse-tender-email', {
        body: { inbox_id: inboxId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["tenders-catalog"] });
      toast({
        title: toasts.aoConverted,
      });
    },
    onError: (error) => {
      console.error("Error converting email:", error);
      toast({
        title: "Erreur",
        description: toasts.errorGeneric,
        variant: "destructive",
      });
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: async (inboxId: string) => {
      const { error } = await supabase
        .from("tender_inbox")
        .update({ status: 'ignored' })
        .eq("id", inboxId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender-inbox"] });
      toast({
        title: "Email ignoré",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (inboxId: string) => {
      const { error } = await supabase
        .from("tender_inbox")
        .delete()
        .eq("id", inboxId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender-inbox"] });
      toast({
        title: toasts.deleted,
      });
    },
  });

  const copyEmailAddress = () => {
    const email = `ao-${user?.id?.substring(0, 8)}@b8ild.app`;
    navigator.clipboard.writeText(email);
    toast({
      title: "Copié !",
      description: "Adresse email copiée dans le presse-papier",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{labels.nav.tendersInbox}</h1>
            <p className="text-muted-foreground">
              Recevez et convertissez vos emails d'AO automatiquement
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Adresse de collecte dédiée</CardTitle>
            <CardDescription>
              Transférez vos emails d'appels d'offres vers cette adresse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-accent rounded-lg font-mono text-sm">
                ao-{user?.id?.substring(0, 8)}@b8ild.app
              </code>
              <Button variant="outline" size="sm" onClick={copyEmailAddress} className="gap-2">
                <Copy className="h-4 w-4" />
                Copier
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Les emails envoyés à cette adresse seront analysés automatiquement
            </p>
          </CardContent>
        </Card>

        {inboxItems.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={emptyStates.tendersInbox.title}
            text={emptyStates.tendersInbox.text}
          />
        ) : (
          <div className="space-y-3">
            {inboxItems.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{item.email_subject}</h3>
                        <Badge variant={
                          item.status === 'converted' ? 'default' :
                          item.status === 'ignored' ? 'secondary' :
                          'outline'
                        }>
                          {item.status === 'converted' ? 'Converti' :
                           item.status === 'ignored' ? 'Ignoré' :
                           'En attente'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        De: {item.email_sender}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reçu le: {new Date(item.created_at).toLocaleString('fr-FR')}
                      </p>
                      {item.attachments && item.attachments.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📎 {item.attachments.length} pièce(s) jointe(s)
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {item.status === 'pending' && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => convertMutation.mutate(item.id)}
                            disabled={convertMutation.isPending}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Convertir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => ignoreMutation.mutate(item.id)}
                            disabled={ignoreMutation.isPending}
                            className="gap-2"
                          >
                            <XCircle className="h-4 w-4" />
                            Ignorer
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        className="gap-2 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TendersInbox;
