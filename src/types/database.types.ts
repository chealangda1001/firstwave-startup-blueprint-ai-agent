/**
 * Hand-written Supabase types mirroring supabase/migrations/0001_init.sql.
 *
 * Once the project is linked to a real Supabase instance, regenerate with:
 *   npx supabase gen types typescript --linked > src/types/database.types.ts
 * (or --local if running `supabase start` against the local Docker stack)
 * and this file becomes redundant.
 */

export type CanvasType = "lean" | "bmc";
export type SessionStatus = "in_progress" | "complete" | "abandoned";
export type ConfidenceLevel = "high" | "medium" | "low";
export type MessageRole = "user" | "assistant" | "log";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          company_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      sessions: {
        Row: {
          id: string;
          founder_id: string;
          status: SessionStatus;
          canvas_type: CanvasType | null;
          canvas_selection_reasoning: string | null;
          current_stage: string;
          domain: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["sessions"]["Row"]> & {
          founder_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Row"]>;
      };
      session_files: {
        Row: {
          id: string;
          session_id: string;
          file_name: string;
          storage_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["session_files"]["Row"]
        > & {
          session_id: string;
          file_name: string;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["session_files"]["Row"]>;
      };
      session_messages: {
        Row: {
          id: string;
          session_id: string;
          role: MessageRole;
          stage: string | null;
          content: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["session_messages"]["Row"]
        > & {
          session_id: string;
          role: MessageRole;
          content: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["session_messages"]["Row"]
        >;
      };
      blueprints: {
        Row: {
          id: string;
          session_id: string;
          canvas_type: CanvasType;
          section_1_problem: Record<string, unknown>;
          section_1_confidence: ConfidenceLevel | null;
          section_1_gaps: string[];
          section_2_users: Record<string, unknown>;
          section_2_confidence: ConfidenceLevel | null;
          section_2_gaps: string[];
          section_3_canvas: Record<string, unknown>;
          section_3_confidence: ConfidenceLevel | null;
          section_3_gaps: string[];
          section_4_mvp_scope: Record<string, unknown>;
          section_5_success_metrics: Record<string, unknown>;
          section_6_risks: Array<Record<string, unknown>>;
          section_7_roadmap: Record<string, unknown>;
          section_8_open_questions: string[];
          section_9_founder_market_fit: Record<string, unknown>;
          raw_artifact: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["blueprints"]["Row"]> & {
          session_id: string;
          canvas_type: CanvasType;
        };
        Update: Partial<Database["public"]["Tables"]["blueprints"]["Row"]>;
      };
      knowledge_base: {
        Row: {
          id: string;
          domain: string;
          tags: string[];
          title: string;
          content: string;
          source: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["knowledge_base"]["Row"]
        > & {
          domain: string;
          title: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["knowledge_base"]["Row"]>;
      };
    };
  };
}
