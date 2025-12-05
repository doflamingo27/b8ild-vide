import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HardHat } from "lucide-react";

const Privacy = () => {
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
        <h1 className="text-3xl font-black text-foreground mb-8">Politique de Confidentialité</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              B8ild s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité explique 
              comment nous collectons, utilisons et protégeons vos données personnelles conformément au RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">2. Données collectées</h2>
            <p className="text-muted-foreground leading-relaxed">Nous collectons les types de données suivants :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong>Données d'identification</strong> : nom, prénom, email</li>
              <li><strong>Données d'entreprise</strong> : nom de l'entreprise, SIRET, adresse</li>
              <li><strong>Données de chantier</strong> : informations sur vos projets, clients, équipes</li>
              <li><strong>Données financières</strong> : factures, devis, paiements</li>
              <li><strong>Données techniques</strong> : logs de connexion, adresse IP</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">3. Utilisation des données</h2>
            <p className="text-muted-foreground leading-relaxed">Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Fournir et améliorer nos services</li>
              <li>Calculer vos indicateurs de rentabilité</li>
              <li>Générer vos rapports et analyses</li>
              <li>Assurer la sécurité de votre compte</li>
              <li>Vous envoyer des notifications importantes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">4. Hébergement et sécurité</h2>
            <p className="text-muted-foreground leading-relaxed">
              Toutes vos données sont hébergées en France sur des serveurs sécurisés. Nous utilisons :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Chiffrement SSL/TLS pour toutes les communications</li>
              <li>Chiffrement des données au repos</li>
              <li>Authentification sécurisée avec mots de passe hachés</li>
              <li>Politiques de sécurité au niveau des lignes (RLS)</li>
              <li>Sauvegardes automatiques quotidiennes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">5. Partage des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous ne vendons jamais vos données. Elles peuvent être partagées uniquement avec :
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Nos sous-traitants techniques (hébergement, paiement) sous contrat RGPD</li>
              <li>Les autorités compétentes si requis par la loi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">6. Vos droits RGPD</h2>
            <p className="text-muted-foreground leading-relaxed">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format standard</li>
              <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous à : rgpd@b8ild.fr
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">7. Conservation des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vos données sont conservées pendant la durée de votre abonnement, puis 3 ans après résiliation 
              pour obligations légales. Les données de facturation sont conservées 10 ans conformément aux 
              obligations comptables françaises.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              B8ild utilise uniquement des cookies essentiels au fonctionnement du service (authentification, 
              préférences de thème). Nous n'utilisons pas de cookies publicitaires ou de tracking tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">9. Contact DPO</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative à la protection de vos données, contactez notre Délégué à la Protection 
              des Données : dpo@b8ild.fr
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
