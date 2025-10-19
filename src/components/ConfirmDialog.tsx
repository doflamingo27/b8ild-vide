import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { modals } from "@/lib/content";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  variant?: "delete" | "upgrade" | "unsaved";
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  variant = "delete",
}: ConfirmDialogProps) => {
  const config = variant === "delete" ? modals.deleteConfirm :
                 variant === "upgrade" ? modals.upgradeNeeded :
                 modals.leaveUnsaved;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>{config.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{config.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {config.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
