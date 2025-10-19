import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Calendar, Target, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { labels, emptyStates } from "@/lib/content";
import EmptyState from "@/components/EmptyState";

const TendersDashboard = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["tender-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tender_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: todayMatches = [] } = useQuery({
    queryKey: ["today-matches", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tender_matches")
        .select(`
          *,
          tenders (
            id,
            title,
            buyer,
            city,
            budget_min,
            budget_max,
            deadline
          )
        `)
        .eq("user_id", user?.id)
        .gte("score", profile?.score_threshold || 70)
        .order("score", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!profile,
  });

  const { data: stats } = useQuery({
    queryKey: ["tender-stats", user?.id],
    queryFn: async () => {
      const { count: totalMatches } = await supabase
        .from("tender_matches")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      const { data: avgScore } = await supabase
        .from("tender_matches")
        .select("score")
        .eq("user_id", user?.id);

      const average = avgScore?.length
        ? Math.round(avgScore.reduce((sum, m) => sum + m.score, 0) / avgScore.length)
        : 0;

      const { count: upcomingDeadlines } = await supabase
        .from("tender_matches")
        .select("tenders!inner(deadline)", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .gte("tenders.deadline", new Date().toISOString())
        .lte("tenders.deadline", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

      return {
        totalMatches: totalMatches || 0,
        avgScore: average,
        upcomingDeadlines: upcomingDeadlines || 0,
      };
    },
    enabled: !!user,
  });

  if (!profile) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={Target}
          title={emptyStates.tendersDashboard.title}
          text={emptyStates.tendersDashboard.text}
          action={
            <Link to="/tenders/profile">
              <Button size="lg" className="gap-2">
                <Settings className="h-5 w-5" />
                {emptyStates.tendersDashboard.primary}
              </Button>
            </Link>
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{labels.nav.tendersDashboard}</h1>
            <p className="text-muted-foreground mt-1">
              Vos appels d'offres pertinents en un coup d'œil
            </p>
          </div>
          <Link to="/tenders/profile">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Paramètres AO
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AO Suivis</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMatches || 0}</div>
              <p className="text-xs text-muted-foreground">
                Appels d'offres compatibles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compatibilité Moyenne</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgScore || 0}%</div>
              <p className="text-xs text-muted-foreground">
                Score de matching
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deadlines Proches</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.upcomingDeadlines || 0}</div>
              <p className="text-xs text-muted-foreground">
                Dans les 7 prochains jours
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AO du jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayMatches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun AO pertinent aujourd'hui
              </p>
            ) : (
              <div className="space-y-3">
                {todayMatches.map((match: any) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{match.tenders?.title}</h4>
                        <Badge variant={match.score >= 85 ? "default" : "secondary"}>
                          {match.score}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {match.tenders?.buyer} • {match.tenders?.city}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deadline: {match.tenders?.deadline ? new Date(match.tenders.deadline).toLocaleDateString('fr-FR') : 'N/A'}
                      </p>
                    </div>
                    <Link to={`/tenders/catalog?tender=${match.tender_id}`}>
                      <Button size="sm" variant="outline">
                        Voir détails
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link to="/tenders/catalog">
            <Button size="lg" className="gap-2">
              <FileText className="h-5 w-5" />
              Voir le catalogue
            </Button>
          </Link>
          <Link to="/tenders/import">
            <Button size="lg" variant="outline" className="gap-2">
              <FileText className="h-5 w-5" />
              Importer un AO
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TendersDashboard;
