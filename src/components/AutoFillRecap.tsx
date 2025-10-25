import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle, Edit } from 'lucide-react';

type Props = {
  module: 'ao' | 'factures' | 'frais';
  confidence: number;
  fields: any;
  onEdit?: () => void;
};

export default function AutoFillRecap({ module, confidence, fields, onEdit }: Props) {
  const getConfidenceBadge = () => {
    if (confidence >= 0.80) {
      return (
        <Badge className="gap-2 bg-green-500 hover:bg-green-600 text-white border-green-600">
          <CheckCircle2 className="h-4 w-4" />
          Excellente extraction ({Math.round(confidence * 100)}%)
        </Badge>
      );
    }
    if (confidence >= 0.60) {
      return (
        <Badge className="gap-2 bg-orange-500 hover:bg-orange-600 text-white border-orange-600">
          <AlertCircle className="h-4 w-4" />
          Vérification recommandée ({Math.round(confidence * 100)}%)
        </Badge>
      );
    }
    return (
      <Badge className="gap-2 bg-red-500 hover:bg-red-600 text-white border-red-600">
        <XCircle className="h-4 w-4" />
        Qualité faible ({Math.round(confidence * 100)}%)
      </Badge>
    );
  };

  const getConfidenceMessage = () => {
    if (confidence >= 0.80) return "Extraction terminée — c'est prêt.";
    if (confidence >= 0.60) return "Extraction terminée — vérifiez rapidement.";
    return "Extraction terminée — qualité faible, pensez à vérifier.";
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') return val.toLocaleString('fr-FR');
    return String(val);
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Extraction automatique terminée</CardTitle>
            <CardDescription className="text-base mt-2">{getConfidenceMessage()}</CardDescription>
          </div>
          {getConfidenceBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section Montants (factures/frais) */}
        {(module === 'factures' || module === 'frais') && (
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Montants</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">HT</p>
                <p className="font-medium">{formatValue(fields.ht)} €</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">TVA %</p>
                <p className="font-medium">{formatValue(fields.tvaPct)} %</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">TVA €</p>
                <p className="font-medium">{formatValue(fields.tvaAmt)} €</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">TTC / Net</p>
                <p className="font-medium">{formatValue(fields.ttc || fields.net)} €</p>
              </div>
            </div>
          </div>
        )}

        {/* Section Identification (factures) */}
        {module === 'factures' && (
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Identification</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">N° facture</p>
                <p className="font-medium">{formatValue(fields.numFacture)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{formatValue(fields.dateDoc)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">SIRET</p>
                <p className="font-medium">{formatValue(fields.siret)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Devise</p>
                <p className="font-medium">{formatValue(fields.currency)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Section AO */}
        {module === 'ao' && (
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">Appel d'offres</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Organisme</p>
                <p className="font-medium">{formatValue(fields.aoOrga)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Référence</p>
                <p className="font-medium">{formatValue(fields.aoRef)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Ville</p>
                <p className="font-medium">{formatValue(fields.aoVille)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Code postal</p>
                <p className="font-medium">{formatValue(fields.aoCP)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Date limite</p>
                <p className="font-medium">{formatValue(fields.aoDeadline)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Budget estimé</p>
                <p className="font-medium">{formatValue(fields.aoBudget)} €</p>
              </div>
            </div>
          </div>
        )}

        {/* Bouton Modifier */}
        {onEdit && (
          <div className="pt-4 border-t">
            <Button onClick={onEdit} variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Modifier les données
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
