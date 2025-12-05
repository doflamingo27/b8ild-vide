import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HardHat } from "lucide-react";

const Legal = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="p-2 rounded-xl bg-primary">
              <HardHat className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-black text-gradient-primary">B8ild</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container py-12 max-w-4xl">
        <h1 className="text-3xl font-black text-foreground mb-8">Conditions Générales d'Utilisation</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">1. Objet</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les présentes conditions générales d'utilisation (CGU) ont pour objet de définir les modalités d'accès et d'utilisation 
              de la plateforme B8ild, solution de gestion de chantiers destinée aux professionnels du BTP.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">2. Acceptation des conditions</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'utilisation de B8ild implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, 
              veuillez ne pas utiliser notre service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">3. Description du service</h2>
            <p className="text-muted-foreground leading-relaxed">
              B8ild est une plateforme de gestion de chantiers permettant aux professionnels du BTP de :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Gérer leurs projets et chantiers</li>
              <li>Suivre la rentabilité en temps réel</li>
              <li>Gérer leurs équipes et affectations</li>
              <li>Importer et traiter des factures fournisseurs</li>
              <li>Générer des rapports financiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">4. Inscription et compte utilisateur</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour utiliser B8ild, vous devez créer un compte en fournissant des informations exactes et à jour. 
              Vous êtes responsable de la confidentialité de vos identifiants de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">5. Tarification</h2>
            <p className="text-muted-foreground leading-relaxed">
              B8ild propose un essai gratuit de 7 jours. Au-delà, l'accès au service nécessite un abonnement payant. 
              Les tarifs sont consultables sur notre page de tarification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">6. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              Tous les éléments de B8ild (logo, design, fonctionnalités, code) sont la propriété exclusive de B8ild. 
              Toute reproduction ou utilisation non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">7. Responsabilité</h2>
            <p className="text-muted-foreground leading-relaxed">
              B8ild s'engage à fournir un service de qualité mais ne peut garantir une disponibilité à 100%. 
              L'utilisateur reste seul responsable de l'utilisation qu'il fait des informations fournies par la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">8. Modification des CGU</h2>
            <p className="text-muted-foreground leading-relaxed">
              B8ild se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés 
              de toute modification substantielle par email ou notification dans l'application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse : contact@b8ild.fr
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Legal;
