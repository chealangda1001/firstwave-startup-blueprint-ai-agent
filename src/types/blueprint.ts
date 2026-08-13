/**
 * Types mirroring the OUTPUT CONTRACT in docs/blueprint-agent-system-prompt.md.
 * This is the shape the blueprint agent must emit; it is persisted into
 * public.blueprints.raw_artifact and mapped into the individual section
 * columns.
 */

import type { CanvasType, ConfidenceLevel } from "./database.types";

export interface Section1Problem {
  existence: string;
  frequency_and_cost: string;
  current_solution: string;
  why_now: string;
  confidence: ConfidenceLevel;
  gaps: string[];
}

export interface Section2Users {
  primary_user: string;
  decision_maker: string;
  tech_sophistication: string;
  real_motivation: string;
  confidence: ConfidenceLevel;
  gaps: string[];
}

export interface LeanCanvasFields {
  problem: string;
  customer_segments: string;
  unique_value_proposition: string;
  solution: string;
  channels: string;
  revenue_streams: string;
  cost_structure: string;
  key_metrics: string;
  unfair_advantage: string;
}

export interface BmcFields {
  key_partners: string;
  key_activities: string;
  key_resources: string;
  value_propositions: string;
  customer_relationships: string;
  channels: string;
  customer_segments: string;
  cost_structure: string;
  revenue_streams: string;
}

export interface Section3Canvas {
  type: CanvasType;
  fields: {
    lean?: LeanCanvasFields;
    bmc?: BmcFields;
  };
  confidence: ConfidenceLevel;
  gaps: string[];
}

export interface Section4MvpScope {
  in_scope: string[];
  out_of_scope: string[];
  gaps: string[];
}

export interface Section5SuccessMetrics {
  product: string;
  marketing: string;
  finance: string;
  gaps: string[];
}

export interface Section6Risk {
  assumption: string;
  risk_if_wrong: string;
  danger_level: "high" | "medium" | "low";
}

export interface RoadmapPhase {
  goal: string;
  timing: string;
  scope: string[];
}

export interface Section7Roadmap {
  phase_1: RoadmapPhase;
  phase_2: RoadmapPhase;
  phase_3: RoadmapPhase;
}

export interface Section9FounderMarketFit {
  strengths: string;
  gaps: string;
  suggestion: string;
  narrative: string;
}

export interface BlueprintArtifact {
  session_id: string;
  canvas_type: CanvasType;
  created_at: string;
  blueprint: {
    section_1_problem: Section1Problem;
    section_2_users: Section2Users;
    section_3_canvas: Section3Canvas;
    section_4_mvp_scope: Section4MvpScope;
    section_5_success_metrics: Section5SuccessMetrics;
    section_6_risks: Section6Risk[];
    section_7_roadmap: Section7Roadmap;
    section_8_open_questions: string[];
    section_9_founder_market_fit: Section9FounderMarketFit;
  };
  log_messages: Array<{ stage: string; message: string }>;
}
