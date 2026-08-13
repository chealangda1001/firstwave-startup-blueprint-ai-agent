import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { KnowledgeBaseCardType } from "@/types/database.types";
import { CardFormDialog } from "./card-form-dialog";
import { CardRowActions } from "./card-row-actions";

const CARD_TYPE_LABEL: Record<KnowledgeBaseCardType, string> = {
  founder_lesson: "Founder lesson",
  market_context: "Market context",
  lead_through_example: "Lead-through example",
};

export default async function AdminKnowledgeBasePage() {
  const supabase = await createClient();

  const { data: cards, error } = await supabase
    .from("knowledge_base")
    .select("id, title, domain, card_type, content, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Knowledge base
          </h1>
          <p className="text-sm text-slate-500">
            Founder lessons, market context, and lead-through examples that
            ground the blueprint agent.
          </p>
        </div>
        <CardFormDialog trigger={<Button>+ New card</Button>} />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load knowledge base: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Title</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Content</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-slate-400"
                >
                  No cards yet — add the first one.
                </TableCell>
              </TableRow>
            )}
            {cards?.map((card) => (
              <TableRow key={card.id} className={card.is_active ? "" : "opacity-50"}>
                <TableCell className="max-w-[180px] truncate text-sm font-medium text-slate-900">
                  {card.title}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {card.domain}
                </TableCell>
                <TableCell>
                  <Badge className="rounded-sm bg-slate-100 font-normal text-slate-700 hover:bg-slate-100">
                    {CARD_TYPE_LABEL[card.card_type]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[320px] truncate text-sm text-slate-500">
                  {card.content}
                </TableCell>
                <TableCell>
                  <CardRowActions
                    card={{
                      id: card.id,
                      title: card.title,
                      domain: card.domain,
                      card_type: card.card_type,
                      content: card.content,
                      is_active: card.is_active,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
