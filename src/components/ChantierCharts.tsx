import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

interface ChantierChartsProps {
  chantierId: string;
}

interface Snapshot {
  d: string;
  cout_main_oeuvre: number;
  couts_fixes: number;
  budget_ht: number;
  marge_a_date: number;
  profitability_pct: number;
}

export default function ChantierCharts({ chantierId }: ChantierChartsProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSnapshots() {
    try {
      setLoading(true);
      
      // 1. Charger les snapshots historiques
      const { data, error } = await supabase
        .from('chantier_snapshots')
        .select('*')
        .eq('chantier_id', chantierId)
        .order('d', { ascending: true });

      if (error) {
        console.error('[ChantierCharts] Error loading snapshots:', error);
        setLoading(false);
        return;
      }

      // 2. Charger les métriques temps réel
      const { data: metricsData } = await supabase
        .from('chantier_metrics_realtime')
        .select('metrics')
        .eq('chantier_id', chantierId)
        .maybeSingle();

      const historicalSnapshots = data || [];
      
      // 3. Si on a des métriques temps réel, ajouter un point "aujourd'hui"
      if (metricsData?.metrics) {
        const metrics = metricsData.metrics as any;
        const todaySnapshot: Snapshot = {
          d: format(new Date(), 'yyyy-MM-dd'),
          cout_main_oeuvre: metrics.cout_main_oeuvre_reel || 0,
          couts_fixes: metrics.couts_fixes_engages || 0,
          budget_ht: metrics.budget_ht || 0,
          marge_a_date: metrics.marge_a_date || 0,
          profitability_pct: metrics.profitability_pct || 0,
        };
        
        // Ne pas dupliquer si un snapshot existe déjà pour aujourd'hui
        const hasToday = historicalSnapshots.some(s => s.d === todaySnapshot.d);
        if (!hasToday) {
          setSnapshots([...historicalSnapshots, todaySnapshot]);
        } else {
          // Remplacer le snapshot d'aujourd'hui par la valeur temps réel
          setSnapshots([
            ...historicalSnapshots.filter(s => s.d !== todaySnapshot.d),
            todaySnapshot
          ]);
        }
      } else {
        setSnapshots(historicalSnapshots);
      }
      
      // Si aucun snapshot historique n'existe, créer un snapshot initial
      if (historicalSnapshots.length === 0 && !metricsData?.metrics) {
        console.log('[ChantierCharts] No snapshots found, creating initial snapshot');
        const { error: rpcError } = await supabase.rpc('snapshot_chantier_daily');
        
        if (!rpcError) {
          // Recharger après création
          loadSnapshots();
        }
      }
    } catch (err) {
      console.error('[ChantierCharts] Exception:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!chantierId) return;

    loadSnapshots();

    // ✅ Abonnement Realtime sur les snapshots ET les métriques
    console.log('[ChantierCharts] 🔌 Subscribing to realtime updates...');
    
    const snapshotsChannel = supabase
      .channel(`snapshots:${chantierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chantier_snapshots',
          filter: `chantier_id=eq.${chantierId}`,
        },
        (payload) => {
          console.log('[ChantierCharts] 🔴 Snapshot update:', payload);
          loadSnapshots();
        }
      )
      .subscribe();

    const metricsChannel = supabase
      .channel(`metrics:${chantierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chantier_metrics_realtime',
          filter: `chantier_id=eq.${chantierId}`,
        },
        (payload) => {
          console.log('[ChantierCharts] 🔴 Metrics update:', payload);
          loadSnapshots();
        }
      )
      .subscribe();

    return () => {
      console.log('[ChantierCharts] 🔌 Unsubscribing from channels');
      supabase.removeChannel(snapshotsChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [chantierId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Évolution de la Rentabilité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">
              Historique en cours de construction
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Les données d'évolution seront collectées automatiquement chaque jour pour vous permettre de suivre la rentabilité de votre chantier dans le temps.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = snapshots.map((s) => ({
    date: format(new Date(s.d), 'dd/MM', { locale: fr }),
    dateFull: format(new Date(s.d), 'dd MMM yyyy', { locale: fr }),
    marge: Math.round(s.marge_a_date),
    profitabilite: Number(s.profitability_pct?.toFixed(1)) || 0,
    coutsMO: Math.round(s.cout_main_oeuvre || 0),
    coutsFixes: Math.round(s.couts_fixes || 0),
    budget: Math.round(s.budget_ht || 0),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-sm mb-2">{payload[0]?.payload?.dateFull}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <h3 className="text-xl font-semibold">Évolution temporelle</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Graphique Marge */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="text-base">Marge à date (€)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--danger))" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="marge"
                  name="Marge"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique Profitabilité */}
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="text-base">Profitabilité (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--danger))" strokeDasharray="3 3" />
                <ReferenceLine y={10} stroke="hsl(var(--warning))" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="profitabilite"
                  name="Profitabilité"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique Coûts cumulés */}
        <Card className="hover-lift lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Coûts cumulés vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${Math.round(value / 1000)}k€`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="line"
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget HT"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="coutsMO"
                  name="Main d'œuvre"
                  stroke="hsl(var(--alert))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--alert))', r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="coutsFixes"
                  name="Coûts fixes"
                  stroke="hsl(var(--danger))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--danger))', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
