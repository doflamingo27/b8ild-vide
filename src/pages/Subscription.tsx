import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, Zap, Loader2 } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

const Subscription = () => {
  const { subscribed, planName, subscriptionEnd, loading, openCheckout, openCustomerPortal } = useSubscription();

  const plans = [
    {
      name: "Gratuit",
      price: "0€",
      period: "7 jours d'essai",
      features: [
        "1 chantier maximum",
        "Toutes les fonctionnalités",
        "Support par email",
      ],
      isPopular: false,
    },
    {
      name: "Pro",
      price: "49€",
      period: "/mois",
      priceId: "price_1SJg6KQbGfkLt4CuZqQBG9RQ",
      features: [
        "Chantiers illimités",
        "Calculs automatiques",
        "Alertes en temps réel",
        "Exports PDF/CSV",
        "Support prioritaire",
      ],
      isPopular: true,
    },
    {
      name: "Annuel",
      price: "490€",
      period: "/an",
      priceId: "price_1SJg6LQbGfkLt4Cui1lUWvcf",
      features: [
        "Tout du plan Pro",
        "-2 mois offerts",
        "Support premium",
        "Accès anticipé aux nouvelles fonctionnalités",
      ],
      isPopular: false,
    },
  ];

  const handleSubscribe = async (priceId: string) => {
    await openCheckout(priceId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Mon Abonnement
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre abonnement et votre facturation
        </p>
      </div>

      {/* Statut actuel */}
      <Card>
        <CardHeader>
          <CardTitle>Statut actuel</CardTitle>
          <CardDescription>Votre abonnement en cours</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">Plan {planName}</p>
                  {subscriptionEnd && (
                    <p className="text-sm text-muted-foreground">
                      Expire le {new Date(subscriptionEnd).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <Badge variant={subscribed ? "default" : "secondary"}>
                  {subscribed ? "Actif" : "Essai"}
                </Badge>
              </div>
              {subscribed && (
                <Button variant="outline" className="w-full" onClick={openCustomerPortal}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Gérer mon abonnement
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans disponibles */}
      <div>
        <h2 className="text-2xl font-black mb-4">Plans disponibles</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={plan.isPopular ? "border-accent shadow-glow" : ""}
            >
              <CardHeader>
                {plan.isPopular && (
                  <Badge className="w-fit mb-2 bg-accent text-accent-foreground">
                    <Zap className="h-3 w-3 mr-1" />
                    Populaire
                  </Badge>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-black text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                  onClick={() => plan.priceId && handleSubscribe(plan.priceId)}
                  disabled={loading || plan.name === "Gratuit" || (planName === plan.name && subscribed)}
                >
                  {plan.name === "Gratuit" 
                    ? "Plan actuel" 
                    : (planName === plan.name && subscribed) 
                      ? "Plan actif" 
                      : "Choisir ce plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Informations supplémentaires */}
      <Card>
        <CardHeader>
          <CardTitle>Méthode de paiement</CardTitle>
          <CardDescription>
            Gérez vos informations de paiement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscribed ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Gérez vos informations de paiement via le portail client Stripe.
              </p>
              <Button variant="outline" onClick={openCustomerPortal}>
                <CreditCard className="mr-2 h-4 w-4" />
                Gérer mes moyens de paiement
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Aucune carte enregistrée. Souscrivez à un plan payant pour ajouter une carte.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;
