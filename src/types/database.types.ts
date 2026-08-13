// NOTE: this file is generated from the live schema. Regenerate with:
//   npx supabase gen types typescript --linked > src/types/database.types.ts
// Do not hand-edit the generated sections below the Database type.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      blueprints: {
        Row: {
          canvas_type: Database["public"]["Enums"]["canvas_type"]
          created_at: string
          id: string
          raw_artifact: Json
          section_1_confidence:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          section_1_gaps: string[]
          section_1_problem: Json
          section_2_confidence:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          section_2_gaps: string[]
          section_2_users: Json
          section_3_canvas: Json
          section_3_confidence:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          section_3_gaps: string[]
          section_4_mvp_scope: Json
          section_5_success_metrics: Json
          section_6_risks: Json
          section_7_roadmap: Json
          section_8_open_questions: string[]
          section_9_founder_market_fit: Json
          session_id: string
          updated_at: string
        }
        Insert: {
          canvas_type: Database["public"]["Enums"]["canvas_type"]
          created_at?: string
          id?: string
          raw_artifact?: Json
          section_1_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          section_1_gaps?: string[]
          section_1_problem?: Json
          section_2_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          section_2_gaps?: string[]
          section_2_users?: Json
          section_3_canvas?: Json
          section_3_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          section_3_gaps?: string[]
          section_4_mvp_scope?: Json
          section_5_success_metrics?: Json
          section_6_risks?: Json
          section_7_roadmap?: Json
          section_8_open_questions?: string[]
          section_9_founder_market_fit?: Json
          session_id: string
          updated_at?: string
        }
        Update: {
          canvas_type?: Database["public"]["Enums"]["canvas_type"]
          created_at?: string
          id?: string
          raw_artifact?: Json
          section_1_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          section_1_gaps?: string[]
          section_1_problem?: Json
          section_2_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          section_2_gaps?: string[]
          section_2_users?: Json
          section_3_canvas?: Json
          section_3_confidence?:
            | Database["public"]["Enums"]["confidence_level"]
            | null
          section_3_gaps?: string[]
          section_4_mvp_scope?: Json
          section_5_success_metrics?: Json
          section_6_risks?: Json
          section_7_roadmap?: Json
          section_8_open_questions?: string[]
          section_9_founder_market_fit?: Json
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprints_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          content: string
          created_at: string
          domain: string
          id: string
          source: string | null
          tags: string[]
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          domain: string
          id?: string
          source?: string | null
          tags?: string[]
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          domain?: string
          id?: string
          source?: string | null
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_files: {
        Row: {
          file_name: string
          id: string
          mime_type: string | null
          session_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          id?: string
          mime_type?: string | null
          session_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          id?: string
          mime_type?: string | null
          session_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          stage: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
          stage?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["message_role"]
          session_id?: string
          stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          canvas_selection_reasoning: string | null
          canvas_type: Database["public"]["Enums"]["canvas_type"] | null
          created_at: string
          current_stage: string
          domain: string | null
          founder_id: string
          id: string
          status: Database["public"]["Enums"]["session_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          canvas_selection_reasoning?: string | null
          canvas_type?: Database["public"]["Enums"]["canvas_type"] | null
          created_at?: string
          current_stage?: string
          domain?: string | null
          founder_id: string
          id?: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          canvas_selection_reasoning?: string | null
          canvas_type?: Database["public"]["Enums"]["canvas_type"] | null
          created_at?: string
          current_stage?: string
          domain?: string | null
          founder_id?: string
          id?: string
          status?: Database["public"]["Enums"]["session_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      canvas_type: "lean" | "bmc"
      confidence_level: "high" | "medium" | "low"
      message_role: "user" | "assistant" | "log"
      session_status: "in_progress" | "complete" | "abandoned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      canvas_type: ["lean", "bmc"],
      confidence_level: ["high", "medium", "low"],
      message_role: ["user", "assistant", "log"],
      session_status: ["in_progress", "complete", "abandoned"],
    },
  },
} as const

// Convenience aliases used across the app instead of the verbose
// Database["public"]["Enums"][...] access path.
export type CanvasType = Database["public"]["Enums"]["canvas_type"]
export type SessionStatus = Database["public"]["Enums"]["session_status"]
export type ConfidenceLevel = Database["public"]["Enums"]["confidence_level"]
export type MessageRole = Database["public"]["Enums"]["message_role"]
