import { Link } from "react-router-dom";
import { HardHat } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary">
              <HardHat className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-base font-black text-gradient-primary">B8ild</p>
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} - Conçu pour les pros du BTP
              </p>
            </div>
          </div>
          <div className="flex gap-8 text-sm font-medium">
            <Link 
              to="/conditions" 
              className="text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
            >
              Conditions
            </Link>
            <Link 
              to="/confidentialite" 
              className="text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
            >
              Confidentialité
            </Link>
            <a 
              href="mailto:support@b8ild.fr" 
              className="text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
