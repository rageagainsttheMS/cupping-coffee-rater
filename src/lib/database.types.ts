
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "cafes": {
                  Row: {
                    "created_at": string,"google_place_id": string,"id": string,"location": unknown,"name": string,"refreshed_at": string,"suburb": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"google_place_id": string,"id"?: string,"location": unknown,"name": string,"refreshed_at"?: string,"suburb"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"google_place_id"?: string,"id"?: string,"location"?: unknown,"name"?: string,"refreshed_at"?: string,"suburb"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"drinks": {
                  Row: {
                    "active": boolean,"counts_toward_coffee": boolean,"drink_group": Database["public"]['Enums']["drink_group"],"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"counts_toward_coffee"?: boolean,"drink_group": Database["public"]['Enums']["drink_group"],"id"?: never,"name": string,"slug": string,"sort_order": number
                  }
                  Update: {
                    "active"?: boolean,"counts_toward_coffee"?: boolean,"drink_group"?: Database["public"]['Enums']["drink_group"],"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"places_search_log": {
                  Row: {
                    "result_count": number,"search_key": string,"searched_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "result_count"?: number,"search_key": string,"searched_at"?: string
                  }
                  Update: {
                    "result_count"?: number,"search_key"?: string,"searched_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "accepted_terms_at": string | null,"avatar_url": string | null,"created_at": string,"display_name": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_terms_at"?: string | null,"avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"id": string
                  }
                  Update: {
                    "accepted_terms_at"?: string | null,"avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"review_drinks": {
                  Row: {
                    "drink_id": number,"id": string,"milk": Database["public"]['Enums']["milk_type"] | null,"price_aud": number | null,"rating": number,"review_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "drink_id": number,"id"?: string,"milk"?: Database["public"]['Enums']["milk_type"] | null,"price_aud"?: number | null,"rating": number,"review_id": string
                  }
                  Update: {
                    "drink_id"?: number,"id"?: string,"milk"?: Database["public"]['Enums']["milk_type"] | null,"price_aud"?: number | null,"rating"?: number,"review_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_drinks_drink_id_fkey"
      columns: ["drink_id"]
isOneToOne: false
      referencedRelation: "drinks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_drinks_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"review_photos": {
                  Row: {
                    "height": number | null,"review_id": string,"storage_path": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "height"?: number | null,"review_id": string,"storage_path": string,"width"?: number | null
                  }
                  Update: {
                    "height"?: number | null,"review_id"?: string,"storage_path"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_photos_review_id_fkey"
      columns: ["review_id"]
isOneToOne: true
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"review_ratings": {
                  Row: {
                    "metric": Database["public"]['Enums']["metric"],"rating": number | null,"review_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "metric": Database["public"]['Enums']["metric"],"rating"?: number | null,"review_id": string
                  }
                  Update: {
                    "metric"?: Database["public"]['Enums']["metric"],"rating"?: number | null,"review_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_ratings_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"review_reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string,"resolved_at": string | null,"review_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string,"resolved_at"?: string | null,"review_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string,"resolved_at"?: string | null,"review_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_reports_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"review_tags": {
                  Row: {
                    "review_id": string,"tag_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "review_id": string,"tag_id": number
                  }
                  Update: {
                    "review_id"?: string,"tag_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_tags_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "cafe_tag_counts"
      referencedColumns: ["tag_id"]
    },{
      foreignKeyName: "review_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "beans": string | null,"cafe_id": string,"comment": string,"created_at": string,"hidden_at": string | null,"id": string,"user_id": string,"verified": boolean,"visit_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "beans"?: string | null,"cafe_id": string,"comment": string,"created_at"?: string,"hidden_at"?: string | null,"id"?: string,"user_id": string,"verified"?: boolean,"visit_date"?: string
                  }
                  Update: {
                    "beans"?: string | null,"cafe_id"?: string,"comment"?: string,"created_at"?: string,"hidden_at"?: string | null,"id"?: string,"user_id"?: string,"verified"?: boolean,"visit_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_cafe_id_fkey"
      columns: ["cafe_id"]
isOneToOne: false
      referencedRelation: "cafes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_cafes": {
                  Row: {
                    "cafe_id": string,"saved_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cafe_id": string,"saved_at"?: string,"user_id": string
                  }
                  Update: {
                    "cafe_id"?: string,"saved_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_cafes_cafe_id_fkey"
      columns: ["cafe_id"]
isOneToOne: false
      referencedRelation: "cafes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_cafes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "active": boolean,"id": number,"label": string,"metric": Database["public"]['Enums']["metric"],"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: never,"label": string,"metric": Database["public"]['Enums']["metric"],"sort_order": number
                  }
                  Update: {
                    "active"?: boolean,"id"?: never,"label"?: string,"metric"?: Database["public"]['Enums']["metric"],"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"user_blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "cafe_drink_scores": {
                  Row: {
                    "cafe_id": string | null,"drink_id": number | null,"median_price": number | null,"price_reports": number | null,"rating_count": number | null,"score": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "review_drinks_drink_id_fkey"
      columns: ["drink_id"]
isOneToOne: false
      referencedRelation: "drinks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_cafe_id_fkey"
      columns: ["cafe_id"]
isOneToOne: false
      referencedRelation: "cafes"
      referencedColumns: ["id"]
    }
                  ]
                },"cafe_scores": {
                  Row: {
                    "cafe_id": string | null,"metric": Database["public"]['Enums']["metric"] | null,"rating_count": number | null,"score": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"cafe_tag_counts": {
                  Row: {
                    "cafe_id": string | null,"label": string | null,"metric": Database["public"]['Enums']["metric"] | null,"sort_order": number | null,"tag_count": number | null,"tag_id": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "reviews_cafe_id_fkey"
      columns: ["cafe_id"]
isOneToOne: false
      referencedRelation: "cafes"
      referencedColumns: ["id"]
    }
                  ]
                },"cafe_top_beans": {
                  Row: {
                    "beans": string | null,"cafe_id": string | null,"report_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "reviews_cafe_id_fkey"
      columns: ["cafe_id"]
isOneToOne: false
      referencedRelation: "cafes"
      referencedColumns: ["id"]
    }
                  ]
                },"city_averages": {
                  Row: {
                    "avg_rating": number | null,"metric": Database["public"]['Enums']["metric"] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"metric_ratings": {
                  Row: {
                    "cafe_id": string | null,"drink_id": number | null,"metric": Database["public"]['Enums']["metric"] | null,"rating": number | null,"review_id": string | null,"visit_date": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "cafe_detail":
{ Args: { "p_cafe_id": string }; Returns: Json
                           },
"cafe_reviews":
{ Args: { "p_before_created_at"?: string,"p_before_id"?: string,"p_cafe_id": string,"p_drink_id"?: number,"p_metric"?: Database["public"]['Enums']["metric"],"p_page_size"?: number,"p_sort"?: string }; Returns: {
              "author_name": string,"beans": string,"comment": string,"created_at": string,"drinks": Json,"photo_height": number,"photo_path": string,"photo_width": number,"ratings": Json,"review_id": string,"tags": Json,"user_id": string,"verified": boolean,"visit_date": string
            }[]
                           },
"cafes_in_view":
{ Args: { "max_lat": number,"max_lng": number,"min_lat": number,"min_lng": number,"p_metric": Database["public"]['Enums']["metric"] }; Returns: {
              "best_drink": string,"best_drink_score": number,"coffee_count": number,"coffee_score": number,"food_count": number,"food_score": number,"google_place_id": string,"has_ratings": boolean,"id": string,"lat": number,"lng": number,"name": string,"rating_count": number,"score": number,"suburb": string,"vibe_count": number,"vibe_score": number,"work_count": number,"work_score": number
            }[]
                           },
"count_cafes_in_box":
{ Args: { "max_lat": number,"max_lng": number,"min_lat": number,"min_lng": number }; Returns: number
                           },
"my_saved_cafes":
{ Args: Record<PropertyKey, never>; Returns: {
              "coffee_count": number,"coffee_score": number,"food_count": number,"food_score": number,"google_place_id": string,"id": string,"last_drink_name": string,"last_rating": number,"lat": number,"lng": number,"name": string,"saved_at": string,"suburb": string,"vibe_count": number,"vibe_score": number,"work_count": number,"work_score": number
            }[]
                           },
"nearby_cafes":
{ Args: { "p_lat": number,"p_limit"?: number,"p_lng": number }; Returns: {
              "distance_m": number,"google_place_id": string,"id": string,"lat": number,"lng": number,"name": string,"suburb": string
            }[]
                           },
"refresh_cafe":
{ Args: { "p_cafe_id": string,"p_lat": number,"p_lng": number,"p_name": string }; Returns: undefined
                           },
"review_rate_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"scoring_constants":
{ Args: Record<PropertyKey, never>; Returns: {
              "half_life_days": number,"k": number,"min_count": number
            }[]
                           },
"search_cafes":
{ Args: { "p_lat"?: number,"p_lng"?: number,"p_q": string }; Returns: {
              "distance_m": number,"google_place_id": string,"id": string,"lat": number,"lng": number,"name": string,"suburb": string
            }[]
                           },
"submit_review":
{ Args: { "p_beans"?: string,"p_cafe_id": string,"p_comment"?: string,"p_drinks": Json,"p_food"?: number,"p_lat"?: number,"p_lng"?: number,"p_photo_height"?: number,"p_photo_path"?: string,"p_photo_width"?: number,"p_review_id": string,"p_tags"?: Json,"p_vibe"?: number,"p_work"?: number }; Returns: Json
                           },
"update_review_ratings":
{ Args: { "p_food"?: number,"p_review_id": string,"p_tags"?: Json,"p_vibe"?: number,"p_work"?: number }; Returns: Json
                           },
"upsert_cafes":
{ Args: { "p_cafes": Json }; Returns: {
              "google_place_id": string,"id": string,"lat": number,"lng": number,"name": string,"suburb": string
            }[]
                           },
"verified_radius_m":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            "drink_group": "espresso"|"brewed"|"iced"|"other","metric": "coffee"|"food"|"vibe"|"work","milk_type": "full_cream"|"skim"|"oat"|"soy"|"almond"|"lactose_free","report_reason": "spam"|"offensive"|"fake"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "drink_group": ["espresso", "brewed", "iced", "other"],"metric": ["coffee", "food", "vibe", "work"],"milk_type": ["full_cream", "skim", "oat", "soy", "almond", "lactose_free"],"report_reason": ["spam", "offensive", "fake", "other"]
          }
        }
} as const
