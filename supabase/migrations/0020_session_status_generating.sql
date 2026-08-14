-- Splits "conversation done" from "blueprint synthesis done" into two
-- distinct, founder-visible states. Previously both the fast closing reply
-- and the slow (high-effort) artifact synthesis happened inside one silent
-- server round-trip, so the founder had no honest signal for the part that
-- actually takes a while — see runTurnAndPersist / generateBlueprintForSession
-- in src/app/(app)/sessions/[id]/actions.ts.
alter type public.session_status add value if not exists 'generating';
