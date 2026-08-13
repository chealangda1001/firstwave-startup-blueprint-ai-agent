"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CardFormDialog } from "./card-form-dialog";
import {
  deleteKnowledgeBaseCard,
  setKnowledgeBaseCardActive,
  type KnowledgeBaseCardInput,
} from "./actions";

export function CardRowActions({
  card,
}: {
  card: KnowledgeBaseCardInput & { id: string };
}) {
  const [isActive, setIsActive] = useState(card.is_active);
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    setIsActive(next);
    startTransition(async () => {
      try {
        await setKnowledgeBaseCardActive(card.id, next);
      } catch (err) {
        setIsActive(!next);
        toast.error(err instanceof Error ? err.message : "Could not update.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteKnowledgeBaseCard(card.id);
        toast.success("Card deleted.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <Switch checked={isActive} onCheckedChange={handleToggle} disabled={isPending} />

      <CardFormDialog
        initial={card}
        trigger={
          <Button variant="ghost" size="sm" className="text-slate-600">
            Edit
          </Button>
        }
      />

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
              Delete
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{card.title}&quot; will be permanently removed. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
