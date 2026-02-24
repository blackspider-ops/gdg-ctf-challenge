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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      certificates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          challenges_solved: number
          created_at: string | null
          id: number
          rejected_at: string | null
          requested_at: string | null
          status: string
          total_challenges: number
          total_points: number
          total_time_seconds: number
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          challenges_solved?: number
          created_at?: string | null
          id?: number
          rejected_at?: string | null
          requested_at?: string | null
          status?: string
          total_challenges?: number
          total_points?: number
          total_time_seconds?: number
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          challenges_solved?: number
          created_at?: string | null
          id?: number
          rejected_at?: string | null
          requested_at?: string | null
          status?: string
          total_challenges?: number
          total_points?: number
          total_time_seconds?: number
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          attempts: number
          challenge_id: number
          created_at: string
          duration_seconds: number | null
          id: number
          incorrect_attempts: number
          solved_at: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          challenge_id: number
          created_at?: string
          duration_seconds?: number | null
          id?: number
          incorrect_attempts?: number
          solved_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          challenge_id?: number
          created_at?: string
          duration_seconds?: number | null
          id?: number
          incorrect_attempts?: number
          solved_at?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          answer_pattern: string
          created_at: string
          hint_md: string | null
          id: number
          is_active: boolean
          is_regex: boolean
          order_index: number
          points: number
          prompt_md: string
          title: string
          updated_at: string
        }
        Insert: {
          answer_pattern: string
          created_at?: string
          hint_md?: string | null
          id?: number
          is_active?: boolean
          is_regex?: boolean
          order_index: number
          points?: number
          prompt_md: string
          title: string
          updated_at?: string
        }
        Update: {
          answer_pattern?: string
          created_at?: string
          hint_md?: string | null
          id?: number
          is_active?: boolean
          is_regex?: boolean
          order_index?: number
          points?: number
          prompt_md?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_settings: {
        Row: {
          created_at: string
          description: string | null
          id: number
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_summary: {
        Row: {
          challenges_solved: number
          created_at: string
          current_challenge_index: number
          email: string
          full_name: string
          last_solve_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          total_points: number
          total_time_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenges_solved?: number
          created_at?: string
          current_challenge_index?: number
          email?: string
          full_name?: string
          last_solve_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          total_points?: number
          total_time_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenges_solved?: number
          created_at?: string
          current_challenge_index?: number
          email?: string
          full_name?: string
          last_solve_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          total_points?: number
          total_time_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      certificate_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          challenges_solved: number | null
          created_at: string | null
          id: number | null
          rejected_at: string | null
          requested_at: string | null
          status: string | null
          total_challenges: number | null
          total_points: number | null
          total_time_seconds: number | null
          type: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_challenge_points: {
        Args: {
          base_points: number
          duration_seconds: number
          incorrect_attempts: number
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "player" | "admin" | "owner"
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
  public: {
    Enums: {
      app_role: ["player", "admin", "owner"],
    },
  },
} as const
