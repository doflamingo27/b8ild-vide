import { Shield, MapPin, Headphones, Lock, Clock } from "lucide-react";

const badges = [
  {
    icon: Shield,
    title: "100% RGPD",
    description: "Conformité totale réglementation européenne",
    color: "text-primary",
  },
  {
    icon: MapPin,
    title: "Hébergé en France",
    description: "Serveurs sécurisés en Union Européenne",
    color: "text-blue-500",
  },
  {
    icon: Lock,
    title: "Données chiffrées",
    description: "Chiffrement SSL/TLS et au repos",
    color: "text-purple-500",
  },
  {
    icon: Headphones,
    title: "Support réactif",
    description: "Réponse sous 24h par email",
    color: "text-warning",
  },
  {
    icon: Clock,
    title: "99.9% Uptime",
    description: "Disponibilité garantie",
    color: "text-success",
  },
];

const TrustBadges = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-muted/50 to-muted/20 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold text-primary uppercase tracking-wider mb-2">
            Sécurité et fiabilité
          </p>
          <h3 className="text-2xl font-black text-foreground">
            Vos données BTP en toute confiance
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div
                key={index}
                className="text-center group animate-fade-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-card border border-border mb-3 group-hover:scale-110 group-hover:border-primary/40 transition-smooth">
                  <Icon className={`h-8 w-8 ${badge.color}`} />
                </div>
                <p className="text-sm font-bold text-foreground mb-1">{badge.title}</p>
                <p className="text-xs text-muted-foreground leading-tight">{badge.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
