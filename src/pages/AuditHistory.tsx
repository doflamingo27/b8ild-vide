import AuditLog from "@/components/AuditLog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

const AuditHistory = () => {
  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
          <History className="h-9 w-9 text-primary" aria-hidden="true" />
          Historique des modifications
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Consultez l'historique complet de toutes les modifications
        </p>
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-2xl font-black">Journal d'audit</CardTitle>
          <CardDescription className="text-base">
            Traçabilité complète des actions sur vos données
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLog />
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditHistory;
