import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  text: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = ({
  icon: Icon,
  title,
  text,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="mb-6 rounded-full bg-accent/10 p-6">
          <Icon className="h-12 w-12 text-accent" aria-hidden="false" aria-label={title} />
        </div>
      )}
      <h2 className="mb-3 text-2xl font-bold text-foreground">{title}</h2>
      <p className="mb-8 max-w-md text-muted-foreground">{text}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {primaryAction && (
          <Button
            size="lg"
            onClick={primaryAction.onClick}
            aria-label={primaryAction.label}
            title={primaryAction.label}
          >
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            size="lg"
            variant="outline"
            onClick={secondaryAction.onClick}
            aria-label={secondaryAction.label}
            title={secondaryAction.label}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
