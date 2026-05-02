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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      divisions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          away_team_id: string
          created_at: string
          division_id: string
          home_team_id: string
          id: string
          is_active: boolean
          is_locked: boolean
          match_date: string | null
          round_id: string
          venue: string | null
        }
        Insert: {
          away_team_id: string
          created_at?: string
          division_id: string
          home_team_id: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          match_date?: string | null
          round_id: string
          venue?: string | null
        }
        Update: {
          away_team_id?: string
          created_at?: string
          division_id?: string
          home_team_id?: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          match_date?: string | null
          round_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_login: string | null
          full_name: string | null
          id: string
          is_disabled: boolean
          last_login: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_login?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
          last_login?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          first_login?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
          last_login?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rounds: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          round_number: number
          season: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          round_number: number
          season?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          round_number?: number
          season?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          division_id: string | null
          id: string
          is_active: boolean
          name: string
          short_name: string | null
        }
        Insert: {
          created_at?: string
          division_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          short_name?: string | null
        }
        Update: {
          created_at?: string
          division_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vote_lines: {
        Row: {
          created_at: string
          id: string
          player_name: string
          player_number: number
          submission_id: string
          team_id: string
          votes: number
        }
        Insert: {
          created_at?: string
          id?: string
          player_name: string
          player_number: number
          submission_id: string
          team_id: string
          votes: number
        }
        Update: {
          created_at?: string
          id?: string
          player_name?: string
          player_number?: number
          submission_id?: string
          team_id?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "vote_lines_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "vote_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_lines_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_submissions: {
        Row: {
          away_team_id: string
          deleted_at: string | null
          deleted_by: string | null
          division_id: string
          fixture_id: string
          home_team_id: string
          id: string
          is_approved: boolean
          is_deleted: boolean
          is_locked: boolean
          proxy_reason: string | null
          proxy_submitter_id: string | null
          proxy_submitter_name: string | null
          round_id: string
          submitted_at: string
          submitted_by_admin_id: string | null
          submitted_by_admin_name: string | null
          umpire_id: string
          updated_at: string
        }
        Insert: {
          away_team_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          division_id: string
          fixture_id: string
          home_team_id: string
          id?: string
          is_approved?: boolean
          is_deleted?: boolean
          is_locked?: boolean
          proxy_reason?: string | null
          proxy_submitter_id?: string | null
          proxy_submitter_name?: string | null
          round_id: string
          submitted_at?: string
          submitted_by_admin_id?: string | null
          submitted_by_admin_name?: string | null
          umpire_id: string
          updated_at?: string
        }
        Update: {
          away_team_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          division_id?: string
          fixture_id?: string
          home_team_id?: string
          id?: string
          is_approved?: boolean
          is_deleted?: boolean
          is_locked?: boolean
          proxy_reason?: string | null
          proxy_submitter_id?: string | null
          proxy_submitter_name?: string | null
          round_id?: string
          submitted_at?: string
          submitted_by_admin_id?: string | null
          submitted_by_admin_name?: string | null
          umpire_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_submissions_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_submissions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_submissions_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_submissions_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_submissions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "umpire" | "super_admin"
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
      app_role: ["admin", "umpire", "super_admin"],
    },
  },
} as const
