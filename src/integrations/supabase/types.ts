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
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          disclaimer: string | null
          id: string
          profile_id: string
          refs: Json | null
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          disclaimer?: string | null
          id?: string
          profile_id: string
          refs?: Json | null
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          disclaimer?: string | null
          id?: string
          profile_id?: string
          refs?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          engine_cc: number
          fuel_type: string
          id: string
          license_plate: string
          name: string
          phone: string
          qr_code_path: string | null
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          engine_cc: number
          fuel_type: string
          id?: string
          license_plate: string
          name: string
          phone: string
          qr_code_path?: string | null
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          created_at?: string
          engine_cc?: number
          fuel_type?: string
          id?: string
          license_plate?: string
          name?: string
          phone?: string
          qr_code_path?: string | null
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      report_confirmations: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          report_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          report_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_confirmations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_confirmations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_confirmations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          fuel_type: string
          id: string
          note: string | null
          profile_id: string | null
          queue_level: string | null
          station_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          fuel_type: string
          id?: string
          note?: string | null
          profile_id?: string | null
          queue_level?: string | null
          station_id: string
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          fuel_type?: string
          id?: string
          note?: string | null
          profile_id?: string | null
          queue_level?: string | null
          station_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_fuels: {
        Row: {
          created_at: string
          fuel_type: string
          id: string
          is_offered: boolean
          station_id: string
        }
        Insert: {
          created_at?: string
          fuel_type: string
          id?: string
          is_offered?: boolean
          station_id: string
        }
        Update: {
          created_at?: string
          fuel_type?: string
          id?: string
          is_offered?: boolean
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_fuels_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          address: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
        }
        Insert: {
          address: string
          created_at?: string
          id: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      report_confirmation_counts: {
        Row: {
          count: number | null
          report_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_confirmations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_confirmations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reports_public: {
        Row: {
          created_at: string | null
          fuel_type: string | null
          id: string | null
          queue_level: string | null
          station_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          fuel_type?: string | null
          id?: string | null
          queue_level?: string | null
          station_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          fuel_type?: string | null
          id?: string | null
          queue_level?: string | null
          station_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      clear_chat_messages: {
        Args: { _id: string; _phone: string }
        Returns: undefined
      }
      get_chat_messages: {
        Args: { _id: string; _phone: string }
        Returns: {
          content: string
          created_at: string
          disclaimer: string
          id: string
          refs: Json
          role: string
        }[]
      }
      get_profile_by_id: {
        Args: { _id: string }
        Returns: {
          engine_cc: number
          fuel_type: string
          id: string
          license_plate: string
          name: string
          phone: string
          qr_code_path: string
          vehicle_type: string
        }[]
      }
      get_profile_by_phone: {
        Args: { _phone: string }
        Returns: {
          engine_cc: number
          fuel_type: string
          id: string
          license_plate: string
          name: string
          phone: string
          qr_code_path: string
          vehicle_type: string
        }[]
      }
      set_profile_qr: {
        Args: { _id: string; _phone: string; _qr_path: string }
        Returns: {
          engine_cc: number
          fuel_type: string
          id: string
          license_plate: string
          name: string
          phone: string
          qr_code_path: string
          vehicle_type: string
        }[]
      }
      update_profile_by_phone: {
        Args: {
          _engine_cc: number
          _fuel_type: string
          _id: string
          _license_plate: string
          _name: string
          _phone: string
          _vehicle_type: string
        }
        Returns: {
          engine_cc: number
          fuel_type: string
          id: string
          license_plate: string
          name: string
          phone: string
          qr_code_path: string
          vehicle_type: string
        }[]
      }
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
    Enums: {},
  },
} as const
