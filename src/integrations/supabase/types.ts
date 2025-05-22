export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string | null
          description: string
          icon: string | null
          id: string
          name: string
          points: number
        }
        Insert: {
          created_at?: string | null
          description: string
          icon?: string | null
          id?: string
          name: string
          points: number
        }
        Update: {
          created_at?: string | null
          description?: string
          icon?: string | null
          id?: string
          name?: string
          points?: number
        }
        Relationships: []
      }
      bubble_messages: {
        Row: {
          bubble_id: string | null
          content: string
          created_at: string | null
          id: string
          username: string
        }
        Insert: {
          bubble_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          username: string
        }
        Update: {
          bubble_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "bubble_messages_bubble_id_fkey"
            columns: ["bubble_id"]
            isOneToOne: false
            referencedRelation: "bubbles"
            referencedColumns: ["id"]
          },
        ]
      }
      bubble_updates: {
        Row: {
          bubble_id: string
          created_at: string | null
          id: string
          payload: Json | null
          type: string | null
        }
        Insert: {
          bubble_id: string
          created_at?: string | null
          id?: string
          payload?: Json | null
          type?: string | null
        }
        Update: {
          bubble_id?: string
          created_at?: string | null
          id?: string
          payload?: Json | null
          type?: string | null
        }
        Relationships: []
      }
      bubbles: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string
          id: string
          name: string
          reflect_count: number | null
          size: string
          topic: string
          username: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at: string
          id?: string
          name: string
          reflect_count?: number | null
          size: string
          topic: string
          username: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string
          id?: string
          name?: string
          reflect_count?: number | null
          size?: string
          topic?: string
          username?: string
        }
        Relationships: []
      }
      gamification_profiles: {
        Row: {
          achievements: Json
          bubble_points: number
          created_at: string | null
          daily_streak: number
          id: string
          last_active: string | null
          level: number
          message_points: number
          points: number
          reflection_points: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          achievements?: Json
          bubble_points?: number
          created_at?: string | null
          daily_streak?: number
          id?: string
          last_active?: string | null
          level?: number
          message_points?: number
          points?: number
          reflection_points?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievements?: Json
          bubble_points?: number
          created_at?: string | null
          daily_streak?: number
          id?: string
          last_active?: string | null
          level?: number
          message_points?: number
          points?: number
          reflection_points?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          icon_type: string | null
          id: string
          message: string
          points: number | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon_type?: string | null
          id?: string
          message: string
          points?: number | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon_type?: string | null
          id?: string
          message?: string
          points?: number | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          shares_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          shares_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          shares_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
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
          created_at: string | null
          daily_streak: number | null
          display_name: string | null
          experience: number | null
          id: string
          last_streak_date: string | null
          level: number | null
          total_points: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          daily_streak?: number | null
          display_name?: string | null
          experience?: number | null
          id: string
          last_streak_date?: string | null
          level?: number | null
          total_points?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          daily_streak?: number | null
          display_name?: string | null
          experience?: number | null
          id?: string
          last_streak_date?: string | null
          level?: number | null
          total_points?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      reflects: {
        Row: {
          bubble_id: string | null
          created_at: string | null
          id: string
          username: string
        }
        Insert: {
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          username: string
        }
        Update: {
          bubble_id?: string | null
          created_at?: string | null
          id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflects_bubble_id_fkey"
            columns: ["bubble_id"]
            isOneToOne: false
            referencedRelation: "bubbles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          completed_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          completed_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          completed_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
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
      increment_reflect_count: {
        Args: { bubble_id: string }
        Returns: undefined
      }
      toggle_post_like: {
        Args: { post_id: string; user_id: string }
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
