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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: number
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: never
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_templates: {
        Row: {
          created_at: string | null
          description: string | null
          html_template: string
          id: number
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          html_template: string
          id?: number
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          html_template?: string
          id?: number
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          approved_at: string | null
          certificate_url: string | null
          challenges_solved: number
          created_at: string | null
          description: string | null
          id: number
          requested_at: string | null
          status: string
          title: string | null
          total_challenges: number
          total_points: number
          total_time_seconds: number
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          certificate_url?: string | null
          challenges_solved?: number
          created_at?: string | null
          description?: string | null
          id?: number
          requested_at?: string | null
          status?: string
          title?: string | null
          total_challenges?: number
          total_points?: number
          total_time_seconds?: number
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          certificate_url?: string | null
          challenges_solved?: number
          created_at?: string | null
          description?: string | null
          id?: number
          requested_at?: string | null
          status?: string
          title?: string | null
          total_challenges?: number
          total_points?: number
          total_time_seconds?: number
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          attempts: number
          challenge_id: number
          created_at: string | null
          duration_seconds: number | null
          hints_used: number
          id: number
          incorrect_attempts: number
          is_paused: boolean
          paused_at: string | null
          pauses_used: number
          solved_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["challenge_status"]
          tab_switch_penalties: number
          total_paused_seconds: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          challenge_id: number
          created_at?: string | null
          duration_seconds?: number | null
          hints_used?: number
          id?: never
          incorrect_attempts?: number
          is_paused?: boolean
          paused_at?: string | null
          pauses_used?: number
          solved_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          tab_switch_penalties?: number
          total_paused_seconds?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          challenge_id?: number
          created_at?: string | null
          duration_seconds?: number | null
          hints_used?: number
          id?: never
          incorrect_attempts?: number
          is_paused?: boolean
          paused_at?: string | null
          pauses_used?: number
          solved_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          tab_switch_penalties?: number
          total_paused_seconds?: number
          updated_at?: string | null
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
          {
            foreignKeyName: "challenge_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          answer_pattern: string
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          hint_md: string | null
          id: number
          image_name: string | null
          image_url: string | null
          is_active: boolean
          is_regex: boolean
          order_index: number
          points: number
          prompt_md: string
          title: string
          updated_at: string | null
        }
        Insert: {
          answer_pattern: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          hint_md?: string | null
          id?: never
          image_name?: string | null
          image_url?: string | null
          is_active?: boolean
          is_regex?: boolean
          order_index: number
          points?: number
          prompt_md: string
          title: string
          updated_at?: string | null
        }
        Update: {
          answer_pattern?: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          hint_md?: string | null
          id?: never
          image_name?: string | null
          image_url?: string | null
          is_active?: boolean
          is_regex?: boolean
          order_index?: number
          points?: number
          prompt_md?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_settings: {
        Row: {
          about_md: string | null
          coc_md: string | null
          event_datetime: string | null
          event_duration_hours: number | null
          event_location: string | null
          event_title: string | null
          faq_md: string | null
          id: number
          prizes_md: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string | null
        }
        Insert: {
          about_md?: string | null
          coc_md?: string | null
          event_datetime?: string | null
          event_duration_hours?: number | null
          event_location?: string | null
          event_title?: string | null
          faq_md?: string | null
          id?: number
          prizes_md?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string | null
        }
        Update: {
          about_md?: string | null
          coc_md?: string | null
          event_datetime?: string | null
          event_duration_hours?: number | null
          event_location?: string | null
          event_title?: string | null
          faq_md?: string | null
          id?: number
          prizes_md?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      user_summary: {
        Row: {
          current_challenge_index: number | null
          last_solve_at: string | null
          solved_count: number
          total_points: number
          total_time_seconds: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_challenge_index?: number | null
          last_solve_at?: string | null
          solved_count?: number
          total_points?: number
          total_time_seconds?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_challenge_index?: number | null
          last_solve_at?: string | null
          solved_count?: number
          total_points?: number
          total_time_seconds?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      get_challenge_file_url: {
        Args: { challenge_id_param: number }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      reset_all_progress: { Args: never; Returns: undefined }
      reset_user_progress: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      set_owner_by_email: { Args: { owner_email: string }; Returns: string }
      update_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      upsert_challenge_progress: {
        Args: {
          p_attempts: number
          p_challenge_id: number
          p_hints_used: number
          p_incorrect_attempts: number
          p_started_at: string
          p_status: Database["public"]["Enums"]["challenge_status"]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      challenge_status: "in_progress" | "solved" | "given_up"
      event_status: "not_started" | "live" | "paused" | "ended"
      user_role: "player" | "admin" | "owner"
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
      challenge_status: ["in_progress", "solved", "given_up"],
      event_status: ["not_started", "live", "paused", "ended"],
      user_role: ["player", "admin", "owner"],
    },
  },
} as const
