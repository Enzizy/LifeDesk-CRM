// Generated from the linked Supabase project. Kept alongside the Edge Functions
// so `supabase functions deploy` can bundle it without reaching outside
// supabase/. Regenerate both copies with `npm run supabase:types`.

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
    PostgrestVersion: "14.5"
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
      activities: {
        Row: {
          created_at: string
          id: number
          kind: string
          metadata: Json
          prospect_id: number
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          kind: string
          metadata?: Json
          prospect_id: number
          summary: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          kind?: string
          metadata?: Json
          prospect_id?: number
          summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_prospect_id_fkey"
            columns: ["user_id", "prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          created_at: string
          id: number
          input_tokens: number | null
          metadata: Json
          model: string
          operation: string
          output_tokens: number | null
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          input_tokens?: number | null
          metadata?: Json
          model: string
          operation: string
          output_tokens?: number | null
          provider: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          input_tokens?: number | null
          metadata?: Json
          model?: string
          operation?: string
          output_tokens?: number | null
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      discovery_candidates: {
        Row: {
          category: string
          confidence: string
          created_at: string
          discovery_run_id: number
          email: string | null
          id: number
          lat: number | null
          location: string
          lon: number | null
          name: string
          phone: string | null
          provider: string
          provider_place_id: string | null
          qualification_reason: string
          review_status: string
          reviewed_at: string | null
          socials: Json
          source_payload: Json
          suggested_service: string
          user_id: string
          website: string | null
        }
        Insert: {
          category?: string
          confidence?: string
          created_at?: string
          discovery_run_id: number
          email?: string | null
          id?: never
          lat?: number | null
          location?: string
          lon?: number | null
          name: string
          phone?: string | null
          provider?: string
          provider_place_id?: string | null
          qualification_reason?: string
          review_status?: string
          reviewed_at?: string | null
          socials?: Json
          source_payload?: Json
          suggested_service?: string
          user_id: string
          website?: string | null
        }
        Update: {
          category?: string
          confidence?: string
          created_at?: string
          discovery_run_id?: number
          email?: string | null
          id?: never
          lat?: number | null
          location?: string
          lon?: number | null
          name?: string
          phone?: string | null
          provider?: string
          provider_place_id?: string | null
          qualification_reason?: string
          review_status?: string
          reviewed_at?: string | null
          socials?: Json
          source_payload?: Json
          suggested_service?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovery_candidates_user_id_discovery_run_id_provider_fkey"
            columns: ["user_id", "discovery_run_id", "provider"]
            isOneToOne: false
            referencedRelation: "discovery_runs"
            referencedColumns: ["user_id", "id", "provider"]
          },
        ]
      }
      discovery_runs: {
        Row: {
          command: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: number
          interpreted_filters: Json
          provider: string
          result_limit: number
          status: string
          user_id: string
        }
        Insert: {
          command: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: never
          interpreted_filters?: Json
          provider?: string
          result_limit?: number
          status?: string
          user_id: string
        }
        Update: {
          command?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: never
          interpreted_filters?: Json
          provider?: string
          result_limit?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      message_drafts: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: number
          kind: string
          model: string | null
          prospect_id: number
          status: string
          subject: string
          user_id: string
          version: number
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: never
          kind?: string
          model?: string | null
          prospect_id: number
          status?: string
          subject?: string
          user_id: string
          version?: number
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: never
          kind?: string
          model?: string | null
          prospect_id?: number
          status?: string
          subject?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_drafts_user_id_prospect_id_fkey"
            columns: ["user_id", "prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      prospects: {
        Row: {
          category: string
          confidence: string
          contact: string
          created_at: string
          discovered_at: string | null
          email: string | null
          enrichment: Json
          estimated_value: number
          gaps: string[]
          id: number
          initials: string
          lat: number | null
          location: string
          lon: number | null
          name: string
          next_action: string
          notes: string
          phone: string | null
          qualification_reason: string
          qualified_at: string | null
          service: string
          socials: Json
          source: string
          source_ref: string | null
          stage: string
          tone: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          category?: string
          confidence?: string
          contact?: string
          created_at?: string
          discovered_at?: string | null
          email?: string | null
          enrichment?: Json
          estimated_value?: number
          gaps?: string[]
          id?: never
          initials?: string
          lat?: number | null
          location?: string
          lon?: number | null
          name: string
          next_action?: string
          notes?: string
          phone?: string | null
          qualification_reason?: string
          qualified_at?: string | null
          service?: string
          socials?: Json
          source?: string
          source_ref?: string | null
          stage?: string
          tone?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          category?: string
          confidence?: string
          contact?: string
          created_at?: string
          discovered_at?: string | null
          email?: string | null
          enrichment?: Json
          estimated_value?: number
          gaps?: string[]
          id?: never
          initials?: string
          lat?: number | null
          location?: string
          lon?: number | null
          name?: string
          next_action?: string
          notes?: string
          phone?: string | null
          qualification_reason?: string
          qualified_at?: string | null
          service?: string
          socials?: Json
          source?: string
          source_ref?: string | null
          stage?: string
          tone?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          details: string
          due_at: string | null
          id: number
          prospect_id: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: string
          due_at?: string | null
          id?: never
          prospect_id?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: string
          due_at?: string | null
          id?: never
          prospect_id?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_prospect_id_fkey"
            columns: ["user_id", "prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          currency_code: string
          default_location: string
          discovery_limit: number
          gemini_model: string
          service_offers: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          default_location?: string
          discovery_limit?: number
          gemini_model?: string
          service_offers?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          default_location?: string
          discovery_limit?: number
          gemini_model?: string
          service_offers?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {},
  },
} as const
