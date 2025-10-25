import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-construction.jpg";
import { labels, microcopy } from "@/lib/content";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-24 lg:py-32">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute h-96 w-96 rounded-full bg-accent blur-3xl top-10 left-10 animate-pulse" />
        <div className="absolute h-96 w-96 rounded-full bg-primary-light blur-3xl bottom-10 right-10 animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      
      <div className="container relative z-10 mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-8 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-semibold text-accent">
                Solution BTP 100% Française
              </span>
            </div>
            
            <h1 className="text-4xl font-extrabold leading-tight text-white lg:text-5xl xl:text-6xl">
              {microcopy.heroTitle}
            </h1>
            
            <p className="text-lg text-white/90 lg:text-xl max-w-xl">
              {microcopy.heroSubtitle}
            </p>
            
            <p className="text-xl font-bold text-accent animate-fade-up" style={{ animationDelay: "0.2s" }}>
              Ne perdez plus un seul euro sur vos chantiers.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row animate-fade-up" style={{ animationDelay: "0.4s" }}>
              <Button 
                size="lg" 
                className="gap-2 hover-glow text-base font-bold shadow-xl hover:scale-105 transition-all" 
                asChild
                aria-label={labels.actions.tryFree}
                title={labels.actions.tryFree}
              >
                <Link to="/auth?mode=signup">
                  {labels.actions.tryFree}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2 border-2 border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm" 
                asChild
                aria-label={labels.actions.startDemo}
                title={labels.actions.startDemo}
              >
                <a href="#how-it-works">
                  <Play className="h-5 w-5" aria-hidden="true" />
                  {labels.actions.startDemo}
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap gap-8 pt-6 animate-fade-up" style={{ animationDelay: "0.6s" }}>
              <div className="space-y-1">
                <div className="text-4xl font-black text-accent font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">68%</div>
                <div className="text-sm text-white/90 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">d'artisans découvrent leurs pertes après</div>
              </div>
              <div className="space-y-1">
                <div className="text-4xl font-black text-accent font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">-15k€</div>
                <div className="text-sm text-white/90 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">perte moyenne par chantier non suivi</div>
              </div>
            </div>
          </div>

          <div className="relative animate-slide-in-right">
            <div className="relative overflow-hidden rounded-2xl border-2 border-white/20 bg-white/5 p-3 backdrop-blur-md shadow-2xl hover-lift">
              <img
                src={heroImage}
                alt="Interface B8ild - Dashboard de gestion de chantier"
                className="w-full rounded-xl shadow-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl" />
            </div>
            <div className="absolute -bottom-8 -right-8 h-80 w-80 rounded-full bg-accent/20 blur-3xl animate-pulse" />
            <div className="absolute -left-8 -top-8 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
