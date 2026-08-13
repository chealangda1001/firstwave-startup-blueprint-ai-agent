"use client";

import { useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KnowledgeBaseCardType } from "@/types/database.types";
import {
  createKnowledgeBaseCard,
  updateKnowledgeBaseCard,
  type KnowledgeBaseCardInput,
} from "./actions";

const CARD_TYPE_LABEL: Record<KnowledgeBaseCardType, string> = {
  founder_lesson: "Founder lesson",
  market_context: "Market context",
  lead_through_example: "Lead-through example",
};

export function CardFormDialog({
  trigger,
  initial,
}: {
  trigger: ReactElement;
  initial?: KnowledgeBaseCardInput & { id: string };
}) {
  const isEdit = Boolean(initial);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [cardType, setCardType] = useState<KnowledgeBaseCardType>(
    initial?.card_type ?? "founder_lesson"
  );
  const [content, setContent] = useState(initial?.content ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: KnowledgeBaseCardInput = {
      title,
      domain,
      card_type: cardType,
      content,
      is_active: isActive,
    };

    startTransition(async () => {
      try {
        if (isEdit && initial) {
          await updateKnowledgeBaseCard(initial.id, input);
          toast.success("Card updated.");
        } else {
          await createKnowledgeBaseCard(input);
          toast.success("Card created.");
          setTitle("");
          setDomain("");
          setContent("");
          setCardType("founder_lesson");
          setIsActive(true);
        }
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit card" : "New knowledge base card"}</DialogTitle>
            <DialogDescription>
              Grounds the blueprint agent&apos;s questions and follow-ups.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kb-title">Title</Label>
              <Input
                id="kb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kb-domain">Domain tag</Label>
                <Input
                  id="kb-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="hospitality tech"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Card type</Label>
                <Select
                  value={cardType}
                  onValueChange={(v) => setCardType(v as KnowledgeBaseCardType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CARD_TYPE_LABEL) as KnowledgeBaseCardType[]).map(
                      (type) => (
                        <SelectItem key={type} value={type}>
                          {CARD_TYPE_LABEL[type]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kb-content">Content</Label>
              <Textarea
                id="kb-content"
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <Label htmlFor="kb-active" className="text-sm">
                Active
              </Label>
              <Switch
                id="kb-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
