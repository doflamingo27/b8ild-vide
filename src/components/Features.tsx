import { Calculator, AlertTriangle, Users, TrendingUp, FileText, Bell, Sparkles, BarChart3, Clock } from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "Calcul automatique de rentabilité",
    description: "Suivez en temps réel le coût de votre main-d'œuvre, vos charges et votre marge sur chaque chantier BTP.",
    details: [
      "Addition automatique des coûts : matériaux, main-d'œuvre et frais annexes.",
      "Marge actuelle et marge finale estimée mises à jour en temps réel.",
      "Vue claire chantier par chantier, sans Excel ni calculatrice.",
    ],
    color: "text-accent",
    image: "https://images.unsplash.com/photo-1590490359854-dfba19688d70?w=600&h=400&fit=crop",
    direction: "left",
    badge: "Nouveau",
  },
  {
    icon: AlertTriangle,
    title: "Alertes avant déficit",
    description: "Recevez des notifications 7, 3 et 1 jour avant que votre chantier BTP ne devienne déficitaire.",
    details: [
      "Notifications 7, 3 et 1 jour avant le passage en déficit.",
      "Emails et alertes in-app claires pour chaque chantier.",
      "Priorisation des chantiers à risque pour agir au bon endroit.",
    ],
    color: "text-danger",
    image: "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=600&h=400&fit=crop",
    direction: "right",
  },
  {
    icon: Users,
    title: "Gestion d'équipe complète",
    description: "Gérez vos équipes chantier, coûts horaires, charges sociales et affectations par chantier.",
    details: [
      "Coût/jour calculé automatiquement pour chaque membre.",
      "Planning des affectations par chantier BTP.",
      "Suivi simple des absences, congés et statut terrain.",
    ],
    color: "text-primary",
    image: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8c?w=600&h=400&fit=crop",
    direction: "left",
  },
  {
    icon: TrendingUp,
    title: "Jour critique précis",
    description: "Connaissez exactement le jour où votre chantier bascule en perte.",
    details: [
      "Jour exact où le chantier passe en perte calculé automatiquement.",
      "Courbe simple marge / temps pour expliquer la situation à votre client.",
      "Nombre de jours rentables restants toujours visible.",
    ],
    color: "text-success",
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=400&fit=crop",
    direction: "right",
    badge: "Populaire",
  },
  {
    icon: FileText,
    title: "Import factures intelligent",
    description: "Importez vos devis et factures fournisseurs BTP en 1 clic grâce à l'OCR avancé.",
    details: [
      "Import PDF ou photo de facture en 1 clic.",
      "Extraction automatique HT, TVA, TTC, fournisseur et date.",
      "Rattachement direct au bon chantier via la référence.",
    ],
    color: "text-accent",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop",
    direction: "left",
  },
  {
    icon: BarChart3,
    title: "Rapports PDF enrichis",
    description: "Exportez des bilans financiers complets avec graphiques et métriques détaillées pour vos chantiers BTP.",
    details: [
      "Rapport PDF clair par chantier ou par période.",
      "Synthèse de rentabilité avec code couleur BTP.",
      "Détail devis, factures, équipe et coûts annexes en une vue.",
    ],
    color: "text-purple-500",
    image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&h=400&fit=crop",
    direction: "right",
  },
  {
    icon: Sparkles,
    title: "IA d'analyse de chantier",
    description: "Intelligence artificielle qui analyse vos chantiers BTP et recommande des optimisations.",
    details: [
      "Analyse automatique des données de vos chantiers BTP.",
      "Liste des risques, points forts et actions prioritaires.",
      "Comparaison à des marges et délais cibles du secteur.",
    ],
    color: "text-pink-500",
    image: "https://images.unsplash.com/photo-1582719478250-c2c9e2684b1c?w=600&h=400&fit=crop",
    direction: "left",
    badge: "IA",
  },
  {
    icon: Clock,
    title: "Simulateur pénalités retard",
    description: "Anticipez l'impact financier des retards avec des simulations instantanées.",
    details: [
      "Configuration des clauses de pénalités de vos marchés.",
      "Simulation instantanée de l'impact de X jours de retard.",
      "Visualisation de la marge avant et après pénalités.",
    ],
    color: "text-orange-500",
    image: "https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=600&h=400&fit=crop",
    direction: "right",
  },
  {
    icon: Bell,
    title: "Notifications intelligentes",
    description: "Alertes par email et dans l'app pour ne jamais manquer un seuil critique.",
    details: [
      "Paramétrez uniquement les alertes réellement utiles.",
      "Résumé quotidien des chantiers clés pour le dirigeant.",
      "Historique clair de qui a fait quoi et quand.",
    ],
    color: "text-warning",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop",
    direction: "left",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center animate-fade-up">
          <h2 className="mb-4 text-4xl font-black text-gradient-primary lg:text-5xl">
            Anticipez, ajustez, <span className="text-gradient-accent">rentabilisez</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Tous les outils dont vous avez besoin pour piloter la rentabilité de vos chantiers BTP — conçu exclusivement pour artisans et PME du secteur.
          </p>
          <p className="mt-3 text-sm font-semibold text-accent">
            Pensé uniquement pour les entreprises du BTP, pas pour les autres secteurs.
          </p>
        </div>

        <div className="space-y-24">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isLeft = feature.direction === "left";
            
            return (
              <div
                key={index}
                className={`grid gap-12 lg:grid-cols-2 items-center animate-fade-up ${
                  isLeft ? "" : "lg:grid-flow-dense"
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image */}
                <div className={`relative group ${isLeft ? "" : "lg:col-start-2"}`}>
                  <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-2xl group-hover:opacity-30 transition-smooth rounded-3xl"></div>
                  <div className="relative overflow-hidden rounded-2xl shadow-elegant border border-border">
                    <img
                      src={feature.image}
                      alt={`${feature.title} - logiciel BTP pour rentabilité de chantier`}
                      className="w-full h-[300px] object-cover group-hover:scale-105 transition-smooth"
                    />
                    {feature.badge && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                        {feature.badge}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={isLeft ? "" : "lg:col-start-1 lg:row-start-1"}>
                  <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 hover:scale-110 transition-smooth`}>
                    <Icon className={`h-8 w-8 ${feature.color}`} />
                  </div>

                  <h3 className="mb-4 text-3xl font-black text-foreground">
                    {feature.title}
                  </h3>

                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    {feature.description}
                  </p>

                  <ul className="space-y-3">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                        <div className={`h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <div className={`h-2 w-2 rounded-full ${feature.color.replace('text-', 'bg-')}`}></div>
                        </div>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
