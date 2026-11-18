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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      allowed_domains: {
        Row: {
          created_at: string
          domain: string
        }
        Insert: {
          created_at?: string
          domain: string
        }
        Update: {
          created_at?: string
          domain?: string
        }
        Relationships: []
      }
      assignment_completions: {
        Row: {
          assignment_id: string
          completed_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          branch: string | null
          created_at: string
          created_by: string
          created_by_name: string | null
          description: string | null
          due_date: string
          id: string
          reminder_sent: boolean
          semester: number | null
          subject: string
          title: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          created_by: string
          created_by_name?: string | null
          description?: string | null
          due_date: string
          id?: string
          reminder_sent?: boolean
          semester?: number | null
          subject: string
          title: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          description?: string | null
          due_date?: string
          id?: string
          reminder_sent?: boolean
          semester?: number | null
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          item_id: string
          phone: string
          reason: string
          reviewed_at: string | null
          roll_number: string
          status: Database["public"]["Enums"]["claim_status"]
          student_name: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          item_id: string
          phone: string
          reason: string
          reviewed_at?: string | null
          roll_number: string
          status?: Database["public"]["Enums"]["claim_status"]
          student_name: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          item_id?: string
          phone?: string
          reason?: string
          reviewed_at?: string | null
          roll_number?: string
          status?: Database["public"]["Enums"]["claim_status"]
          student_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "lost_found"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          banner_url: string | null
          capacity: number | null
          created_at: string
          created_by: string
          description: string
          event_date: string
          id: string
          organizer: string
          start_time: string
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          banner_url?: string | null
          capacity?: number | null
          created_at?: string
          created_by: string
          description: string
          event_date: string
          id?: string
          organizer: string
          start_time: string
          title: string
          updated_at?: string
          venue: string
        }
        Update: {
          banner_url?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string
          description?: string
          event_date?: string
          id?: string
          organizer?: string
          start_time?: string
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_found: {
        Row: {
          category: string
          created_at: string
          created_by: string
          date_found: string
          description: string | null
          id: string
          image_url: string | null
          item_name: string
          location_found: string
          status: Database["public"]["Enums"]["item_status"]
          storage_number: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          date_found: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_name: string
          location_found: string
          status?: Database["public"]["Enums"]["item_status"]
          storage_number: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          date_found?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_name?: string
          location_found?: string
          status?: Database["public"]["Enums"]["item_status"]
          storage_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_found_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          branch: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          semester: number
          subject: string
          title: string
          uploaded_by: string
          uploaded_by_name: string | null
        }
        Insert: {
          branch: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          semester: number
          subject: string
          title: string
          uploaded_by: string
          uploaded_by_name?: string | null
        }
        Update: {
          branch?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          semester?: number
          subject?: string
          title?: string
          uploaded_by?: string
          uploaded_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author_id: string
          author_name: string | null
          category: Database["public"]["Enums"]["notice_category"]
          content: string
          created_at: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          category?: Database["public"]["Enums"]["notice_category"]
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          category?: Database["public"]["Enums"]["notice_category"]
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          college_name: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          profile_completed: boolean
          roll_number: string | null
          section: string | null
          semester: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          college_name?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          phone?: string | null
          profile_completed?: boolean
          roll_number?: string | null
          section?: string | null
          semester?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          college_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          profile_completed?: boolean
          roll_number?: string | null
          section?: string | null
          semester?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role_name: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      event_registration_counts: {
        Args: never
        Returns: {
          event_id: string
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_allowed_email: { Args: { _email: string }; Returns: boolean }
      is_member: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      notify_students: {
        Args: {
          _body: string
          _branch?: string
          _exclude: string
          _link: string
          _semester?: number
          _title: string
          _type: string
        }
        Returns: undefined
      }
      profile_name: { Args: { _id: string }; Returns: string }
      send_assignment_reminders: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "student" | "faculty" | "admin"
      claim_status: "pending" | "approved" | "rejected"
      item_status:
        | "available"
        | "claim_requested"
        | "approved"
        | "collected"
        | "archived"
      notice_category:
        | "academic"
        | "exam"
        | "placement"
        | "holiday"
        | "sports"
        | "general"
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
  public: {
    Enums: {
      app_role: ["student", "faculty", "admin"],
      claim_status: ["pending", "approved", "rejected"],
      item_status: [
        "available",
        "claim_requested",
        "approved",
        "collected",
        "archived",
      ],
      notice_category: [
        "academic",
        "exam",
        "placement",
        "holiday",
        "sports",
        "general",
      ],
    },
  },
} as const
