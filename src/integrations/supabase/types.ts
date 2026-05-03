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
      messages: {
        Row: {
          body: string
          buyer_id: string
          created_at: string
          id: string
          product_id: number
          seller_name: string
          sender: Database["public"]["Enums"]["message_sender"]
        }
        Insert: {
          body: string
          buyer_id: string
          created_at?: string
          id?: string
          product_id: number
          seller_name: string
          sender: Database["public"]["Enums"]["message_sender"]
        }
        Update: {
          body?: string
          buyer_id?: string
          created_at?: string
          id?: string
          product_id?: number
          seller_name?: string
          sender?: Database["public"]["Enums"]["message_sender"]
        }
        Relationships: []
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
          type?: string
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
        Relationships: []
      }
      orders: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          payment_status: string
          seller_earnings: number
          seller_id: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          payment_status?: string
          seller_earnings?: number
          seller_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          payment_status?: string
          seller_earnings?: number
          seller_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_earnings: {
        Row: {
          available_balance: number
          id: boolean
          total_commission_earned: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          id?: boolean
          total_commission_earned?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          id?: boolean
          total_commission_earned?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_purchases: {
        Row: {
          buyer_id: string | null
          created_at: string
          id: string
          product_id: number
          qty: number
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          product_id: number
          qty?: number
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          product_id?: number
          qty?: number
        }
        Relationships: []
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          product_id: number
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: number
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: number
          viewer_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sellers: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          net_earnings: number
          pending_balance: number
          total_commission_paid: number
          total_earnings: number
          total_sales: number
          updated_at: string
          user_id: string
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          net_earnings?: number
          pending_balance?: number
          total_commission_paid?: number
          total_earnings?: number
          total_sales?: number
          updated_at?: string
          user_id: string
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          net_earnings?: number
          pending_balance?: number
          total_commission_paid?: number
          total_earnings?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      shipments: {
        Row: {
          cost: number | null
          courier_id: string | null
          courier_name: string | null
          created_at: string
          currency: string | null
          easyship_shipment_id: string | null
          id: string
          label_url: string | null
          order_id: string | null
          parcel: Json
          raw_response: Json | null
          receiver: Json
          sender: Json
          status: string
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          courier_id?: string | null
          courier_name?: string | null
          created_at?: string
          currency?: string | null
          easyship_shipment_id?: string | null
          id?: string
          label_url?: string | null
          order_id?: string | null
          parcel: Json
          raw_response?: Json | null
          receiver: Json
          sender: Json
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          courier_id?: string | null
          courier_name?: string | null
          created_at?: string
          currency?: string | null
          easyship_shipment_id?: string | null
          id?: string
          label_url?: string | null
          order_id?: string | null
          parcel?: Json
          raw_response?: Json | null
          receiver?: Json
          sender?: Json
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
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
      get_admin_revenue_stats: {
        Args: never
        Returns: {
          total_commission: number
          total_orders: number
          total_sellers: number
        }[]
      }
      get_top_selling_products: {
        Args: { _limit?: number }
        Returns: {
          product_id: number
          units_sold: number
        }[]
      }
      get_top_viewed_products: {
        Args: { _limit?: number }
        Returns: {
          product_id: number
          view_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      message_sender: "buyer" | "seller"
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
      app_role: ["admin", "user"],
      message_sender: ["buyer", "seller"],
    },
  },
} as const
