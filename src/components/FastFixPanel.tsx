import React, { useState } from 'react';
import { normalizeNumberFR, normalizeDateFR, checkTotals } from '@/lib/extract/normalize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle } from 'lucide-react';

type Props = {
  previewUrl: string;
  initial?: any;
  onConfirm: (fields:any)=>void;
};

const chips = [
  { key:'ht', label:'HT' },
  { key:'tvaPct', label:'TVA %' },
  { key:'tvaAmt', label:'TVA €' },
  { key:'ttc', label:'TTC' },
  { key:'dateDoc', label:'Date' },
  { key:'siret', label:'SIRET' },
  { key:'numFacture', label:'N° facture' },
  { key:'aoDeadline', label:'(AO) Date limite' },
  { key:'aoOrga', label:'(AO) Organisme' },
  { key:'aoVille', label:'(AO) Ville' },
  { key:'aoCP', label:'(AO) CP' },
  { key:'aoBudget', label:'(AO) Budget' },
  { key:'aoRef', label:'(AO) Référence' },
];

export default function FastFixPanel({ previewUrl, initial, onConfirm }: Props) {
  const [fields, setFields] = useState<any>({...initial?.fields});

  const totalsOk = checkTotals(fields.ht, fields.tvaPct, fields.tvaAmt, fields.ttc ?? fields.net);

  function setField(k:string, v:string) {
    if (k==='dateDoc' || k==='aoDeadline') {
      setFields((f:any)=>({...f, [k]: normalizeDateFR(v)}));
    } else if (['ht','tvaPct','tvaAmt','ttc','aoBudget'].includes(k)) {
      setFields((f:any)=>({...f, [k]: normalizeNumberFR(v)}));
    } else {
      setFields((f:any)=>({...f, [k]: v}));
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-7 space-y-2">
        <iframe src={previewUrl} className="w-full h-[70vh] rounded border" />
        <p className="text-xs text-muted-foreground">
          Astuce : zoomez sur la zone puis copiez-collez la valeur dans le champ ciblé.
        </p>
      </div>
      
      <div className="col-span-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {chips.map(c => (
            <Button 
              key={c.key} 
              variant="outline"
              size="sm"
              onClick={()=>{ 
                const v = prompt(`Valeur pour ${c.label}`) ?? ''; 
                if (v) setField(c.key, v); 
              }}
            >
              {c.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ht">HT</Label>
            <Input id="ht" defaultValue={fields.ht ?? ''} onBlur={(e)=>setField('ht', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tvaPct">TVA %</Label>
            <Input id="tvaPct" defaultValue={fields.tvaPct ?? ''} onBlur={(e)=>setField('tvaPct', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tvaAmt">TVA €</Label>
            <Input id="tvaAmt" defaultValue={fields.tvaAmt ?? ''} onBlur={(e)=>setField('tvaAmt', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ttc">TTC</Label>
            <Input id="ttc" defaultValue={fields.ttc ?? ''} onBlur={(e)=>setField('ttc', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dateDoc">Date</Label>
            <Input id="dateDoc" type="date" defaultValue={fields.dateDoc ?? ''} onBlur={(e)=>setField('dateDoc', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="siret">SIRET</Label>
            <Input id="siret" defaultValue={fields.siret ?? ''} onBlur={(e)=>setField('siret', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="numFacture">N° facture</Label>
            <Input id="numFacture" defaultValue={fields.numFacture ?? ''} onBlur={(e)=>setField('numFacture', e.target.value)} />
          </div>

          <div>
            <Label htmlFor="aoDeadline">(AO) Date limite</Label>
            <Input id="aoDeadline" type="date" defaultValue={fields.aoDeadline ?? ''} onBlur={(e)=>setField('aoDeadline', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="aoCP">(AO) CP</Label>
            <Input id="aoCP" defaultValue={fields.aoCP ?? ''} onBlur={(e)=>setField('aoCP', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="aoOrga">(AO) Organisme</Label>
            <Input id="aoOrga" defaultValue={fields.aoOrga ?? ''} onBlur={(e)=>setField('aoOrga', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="aoVille">(AO) Ville</Label>
            <Input id="aoVille" defaultValue={fields.aoVille ?? ''} onBlur={(e)=>setField('aoVille', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="aoBudget">(AO) Budget</Label>
            <Input id="aoBudget" defaultValue={fields.aoBudget ?? ''} onBlur={(e)=>setField('aoBudget', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="aoRef">(AO) Référence</Label>
            <Input id="aoRef" defaultValue={fields.aoRef ?? ''} onBlur={(e)=>setField('aoRef', e.target.value)} />
          </div>
        </div>

        <div className={`flex items-center gap-2 text-sm ${totalsOk?'text-green-700':'text-amber-700'}`}>
          {totalsOk ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Totaux cohérents HT/TVA/TTC</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Totaux incohérents — vérifiez les valeurs</span>
            </>
          )}
        </div>

        <Button className="w-full" size="lg" onClick={()=>onConfirm(fields)}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
