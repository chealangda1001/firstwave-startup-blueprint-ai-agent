"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setUserAdmin } from "./actions";

export function UserAdminToggle({
  userId,
  isAdmin,
  isSelf,
}: {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const [checked, setChecked] = useState(isAdmin);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      try {
        await setUserAdmin(userId, next);
        toast.success(next ? "Promoted to admin." : "Admin access removed.");
      } catch (err) {
        setChecked(!next);
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Switch
      checked={checked}
      onCheckedChange={handleChange}
      disabled={isPending || isSelf}
      title={isSelf ? "You can't remove your own admin access." : undefined}
    />
  );
}
