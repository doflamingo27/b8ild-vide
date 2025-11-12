import { useChantierMetrics } from "@/hooks/useChantierMetrics";
import ProjectCard from "./ProjectCard";

interface RealtimeProjectCardProps {
  project: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

const RealtimeProjectCard = ({ project, onEdit, onDelete }: RealtimeProjectCardProps) => {
  const { metrics, loading } = useChantierMetrics(project.id);

  const rentabilite = metrics?.profitability_pct || 0;
  const joursRestants = metrics?.jours_restants_rentables ?? project.duree_estimee_jours;

  console.log('[RealtimeProjectCard]', project.nom_chantier, {
    loading,
    hasMetrics: !!metrics,
    rentabilite,
    joursRestants,
    rawMetrics: metrics
  });

  return (
    <ProjectCard
      key={project.id}
      id={project.id}
      nom_chantier={project.nom_chantier}
      client={project.client}
      rentabilite={rentabilite}
      jours_restants={joursRestants}
      etat_chantier={project.etat_chantier}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
};

export default RealtimeProjectCard;
