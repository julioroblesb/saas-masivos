// Generated from Supabase project ywpafptrcvgoyaoqgzkz. Do not edit manually.
// Regenerate after every schema migration.

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
      companies: {
        Row: {
          created_at: string
          id: string
          is_demo: boolean | null
          name: string
          plan_type: string | null
          settings: Json | null
          status: string
          subscription_end_at: string | null
          subscription_start_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_demo?: boolean | null
          name: string
          plan_type?: string | null
          settings?: Json | null
          status?: string
          subscription_end_at?: string | null
          subscription_start_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_demo?: boolean | null
          name?: string
          plan_type?: string | null
          settings?: Json | null
          status?: string
          subscription_end_at?: string | null
          subscription_start_at?: string | null
        }
        Relationships: []
      }
      crm_marketing_contacts: {
        Row: {
          allergies_and_conditions: string | null
          birthday: string | null
          company_id: string
          created_at: string
          customer_segment: string | null
          document_number: string | null
          email: string | null
          id: string
          internal_notes: string | null
          is_archived: boolean | null
          last_visit_date: string | null
          name: string | null
          notes: string | null
          opt_in_source: string | null
          phone: string
          preferences: string | null
          tags: string[] | null
          total_spent: number | null
          total_visits: number | null
          updated_at: string | null
        }
        Insert: {
          allergies_and_conditions?: string | null
          birthday?: string | null
          company_id: string
          created_at?: string
          customer_segment?: string | null
          document_number?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean | null
          last_visit_date?: string | null
          name?: string | null
          notes?: string | null
          opt_in_source?: string | null
          phone: string
          preferences?: string | null
          tags?: string[] | null
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string | null
        }
        Update: {
          allergies_and_conditions?: string | null
          birthday?: string | null
          company_id?: string
          created_at?: string
          customer_segment?: string | null
          document_number?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean | null
          last_visit_date?: string | null
          name?: string | null
          notes?: string | null
          opt_in_source?: string | null
          phone?: string
          preferences?: string | null
          tags?: string[] | null
          total_spent?: number | null
          total_visits?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marketing_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_wa_campaigns: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          failed_count: number | null
          id: string
          max_delay_sec: number | null
          message_template: string
          min_delay_sec: number | null
          name: string
          replied_count: number | null
          sent_count: number | null
          sequence: Json | null
          started_at: string | null
          status: string
          total_contacts: number | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          id?: string
          max_delay_sec?: number | null
          message_template: string
          min_delay_sec?: number | null
          name: string
          replied_count?: number | null
          sent_count?: number | null
          sequence?: Json | null
          started_at?: string | null
          status?: string
          total_contacts?: number | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          id?: string
          max_delay_sec?: number | null
          message_template?: string
          min_delay_sec?: number | null
          name?: string
          replied_count?: number | null
          sent_count?: number | null
          sequence?: Json | null
          started_at?: string | null
          status?: string
          total_contacts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_wa_campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_wa_queue: {
        Row: {
          campaign_id: string | null
          company_id: string
          contact_id: string | null
          created_at: string
          delay_after_ms: number | null
          error_message: string | null
          id: string
          media_url: string | null
          message: string
          phone: string
          processing_started_at: string | null
          replied: boolean | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          visit_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          company_id: string
          contact_id?: string | null
          created_at?: string
          delay_after_ms?: number | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message: string
          phone: string
          processing_started_at?: string | null
          replied?: boolean | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          visit_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          company_id?: string
          contact_id?: string | null
          created_at?: string
          delay_after_ms?: number | null
          error_message?: string | null
          id?: string
          media_url?: string | null
          message?: string
          phone?: string
          processing_started_at?: string | null
          replied?: boolean | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_wa_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_wa_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_wa_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_wa_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_marketing_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_wa_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "view_crm_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_wa_queue_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "spa_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_follow_ups: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string | null
          id: string
          media_url: string | null
          message: string
          phone: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          type: string
          visit_id: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          message: string
          phone: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          type: string
          visit_id?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          media_url?: string | null
          message?: string
          phone?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          type?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_follow_ups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_follow_ups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_marketing_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_follow_ups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "view_crm_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_follow_ups_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "spa_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string
          visit_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method: string
          visit_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spa_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_payments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "spa_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_products: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_services: {
        Row: {
          care_image_url: string | null
          care_instructions: string | null
          company_id: string
          created_at: string | null
          description: string | null
          duration_days: number
          id: string
          is_active: boolean | null
          min_price: number | null
          name: string
          price: number
          promo_price: number | null
          updated_at: string | null
        }
        Insert: {
          care_image_url?: string | null
          care_instructions?: string | null
          company_id: string
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          min_price?: number | null
          name: string
          price: number
          promo_price?: number | null
          updated_at?: string | null
        }
        Update: {
          care_image_url?: string | null
          care_instructions?: string | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          min_price?: number | null
          name?: string
          price?: number
          promo_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_staff: {
        Row: {
          birthday: string | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          birthday?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          birthday?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_staff_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_staff_blocks: {
        Row: {
          block_date: string
          company_id: string
          created_at: string | null
          end_time: string
          id: string
          reason: string | null
          staff_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          block_date: string
          company_id: string
          created_at?: string | null
          end_time: string
          id?: string
          reason?: string | null
          staff_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          block_date?: string
          company_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          reason?: string | null
          staff_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_staff_blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_staff_blocks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "spa_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_staff_schedules: {
        Row: {
          company_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_working: boolean | null
          staff_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          day_of_week: number
          end_time?: string
          id?: string
          is_working?: boolean | null
          staff_id: string
          start_time?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_working?: boolean | null
          staff_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_staff_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_staff_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "spa_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_staff_services: {
        Row: {
          service_id: string
          staff_id: string
        }
        Insert: {
          service_id: string
          staff_id: string
        }
        Update: {
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spa_staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "spa_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "spa_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_visits: {
        Row: {
          care_sent: boolean | null
          company_id: string
          completed_at: string | null
          contact_id: string
          created_at: string | null
          debt_due_date: string | null
          duration_minutes: number | null
          follow_up_date: string | null
          follow_up_sent: boolean | null
          id: string
          notes: string | null
          payment_status: string | null
          price_charged: number | null
          scheduled_date: string | null
          service_id: string
          staff_id: string | null
          status: string
          visit_date: string | null
        }
        Insert: {
          care_sent?: boolean | null
          company_id: string
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          debt_due_date?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_sent?: boolean | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          price_charged?: number | null
          scheduled_date?: string | null
          service_id: string
          staff_id?: string | null
          status?: string
          visit_date?: string | null
        }
        Update: {
          care_sent?: boolean | null
          company_id?: string
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          debt_due_date?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_sent?: boolean | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          price_charged?: number | null
          scheduled_date?: string | null
          service_id?: string
          staff_id?: string | null
          status?: string
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spa_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_visits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_marketing_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_visits_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "view_crm_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_visits_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "spa_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_visits_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "spa_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_auth_state: {
        Row: {
          company_id: string
          creds: Json
          keys: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          creds: Json
          keys: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          creds?: Json
          keys?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_auth_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_sessions: {
        Row: {
          bb_host: string | null
          bb_project_id: string | null
          company_id: string
          connection_started_at: string | null
          consecutive_errors: number | null
          daily_reset_at: string | null
          daily_sent_count: number | null
          last_connected_at: string | null
          last_disconnect_reason: string | null
          last_message_sent_at: string | null
          next_allowed_send_at: string | null
          phone_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bb_host?: string | null
          bb_project_id?: string | null
          company_id: string
          connection_started_at?: string | null
          consecutive_errors?: number | null
          daily_reset_at?: string | null
          daily_sent_count?: number | null
          last_connected_at?: string | null
          last_disconnect_reason?: string | null
          last_message_sent_at?: string | null
          next_allowed_send_at?: string | null
          phone_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bb_host?: string | null
          bb_project_id?: string | null
          company_id?: string
          connection_started_at?: string | null
          consecutive_errors?: number | null
          daily_reset_at?: string | null
          daily_sent_count?: number | null
          last_connected_at?: string | null
          last_disconnect_reason?: string | null
          last_message_sent_at?: string | null
          next_allowed_send_at?: string | null
          phone_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_crm_profiles: {
        Row: {
          age: number | null
          allergies_and_conditions: string | null
          birthday: string | null
          company_id: string | null
          created_at: string | null
          customer_segment: string | null
          email: string | null
          id: string | null
          internal_notes: string | null
          last_visit_date: string | null
          name: string | null
          phone: string | null
          preferences: string | null
          tags: string[] | null
          total_spent: number | null
          total_visits: number | null
        }
        Insert: {
          age?: never
          allergies_and_conditions?: string | null
          birthday?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_segment?: string | null
          email?: string | null
          id?: string | null
          internal_notes?: string | null
          last_visit_date?: string | null
          name?: string | null
          phone?: string | null
          preferences?: string | null
          tags?: string[] | null
          total_spent?: number | null
          total_visits?: number | null
        }
        Update: {
          age?: never
          allergies_and_conditions?: string | null
          birthday?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_segment?: string | null
          email?: string | null
          id?: string | null
          internal_notes?: string | null
          last_visit_date?: string | null
          name?: string | null
          phone?: string | null
          preferences?: string | null
          tags?: string[] | null
          total_spent?: number | null
          total_visits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_marketing_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_company_id: { Args: never; Returns: string }
      check_visit_overlap: {
        Args: {
          p_duration_minutes: number
          p_exclude_visit_id?: string
          p_staff_id: string
          p_visit_date: string
        }
        Returns: boolean
      }
      current_tenant_id: { Args: never; Returns: string }
      increment_campaign_failed: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      increment_campaign_sent: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      rpc_archive_contacts: {
        Args: { p_archive: boolean; p_contact_ids: string[] }
        Returns: undefined
      }
      rpc_batch_insert_marketing_contacts: {
        Args: { p_contacts: Json }
        Returns: Json
      }
      rpc_cancel_campaign: { Args: { p_campaign_id: string }; Returns: Json }
      rpc_cleanup_demo_companies: { Args: never; Returns: Json }
      rpc_clone_demo_company: {
        Args: { p_template_company_id: string }
        Returns: Json
      }
      rpc_complete_visit: { Args: { p_visit_id: string }; Returns: Json }
      rpc_count_contacts_by_tag: {
        Args: { p_target_tag: string }
        Returns: number
      }
      rpc_create_campaign:
        | {
            Args: {
              p_contacts: Json
              p_created_by: string
              p_max_delay_sec: number
              p_min_delay_sec: number
              p_name: string
              p_sequence: Json
              p_target_tag: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_max_delay_sec: number
              p_min_delay_sec: number
              p_name: string
              p_sequence: Json
              p_target_tag: string
            }
            Returns: Json
          }
      rpc_delete_marketing_contact: {
        Args: { p_contact_id: string }
        Returns: Json
      }
      rpc_delete_marketing_contacts_by_tag: {
        Args: { p_tag: string }
        Returns: undefined
      }
      rpc_get_clients_metrics: {
        Args: never
        Returns: {
          allergies_and_conditions: string
          birthday: string
          campaigns_count: number
          created_at: string
          customer_segment: string
          email: string
          id: string
          internal_notes: string
          is_archived: boolean
          last_message_sent_at: string
          last_reply_at: string
          last_service_name: string
          last_visit_at: string
          name: string
          phone: string
          preferences: string
          total_spent: number
          total_visits: number
        }[]
      }
      rpc_get_spa_dashboard: { Args: never; Returns: Json }
      rpc_get_unique_tags: { Args: never; Returns: string[] }
      rpc_recalculate_customer_segment: {
        Args: { p_contact_id: string }
        Returns: string
      }
      rpc_update_company_settings: {
        Args: { p_name?: string; p_settings?: Json }
        Returns: Json
      }
      rpc_upsert_marketing_contact:
        | {
            Args: {
              p_allergies_and_conditions?: string
              p_birthday?: string
              p_document_number?: string
              p_email?: string
              p_internal_notes?: string
              p_name: string
              p_opt_in_source?: string
              p_phone: string
              p_preferences?: string
              p_tags: string[]
            }
            Returns: Json
          }
        | {
            Args: {
              p_birthday?: string
              p_email?: string
              p_name: string
              p_notes?: string
              p_opt_in_source?: string
              p_phone: string
              p_tags: string[]
            }
            Returns: Json
          }
      search_contacts:
        | {
            Args: {
              p_company_id: string
              p_limit?: number
              p_offset?: number
              p_query: string
            }
            Returns: {
              allergies_and_conditions: string | null
              birthday: string | null
              company_id: string
              created_at: string
              customer_segment: string | null
              document_number: string | null
              email: string | null
              id: string
              internal_notes: string | null
              is_archived: boolean | null
              last_visit_date: string | null
              name: string | null
              notes: string | null
              opt_in_source: string | null
              phone: string
              preferences: string | null
              tags: string[] | null
              total_spent: number | null
              total_visits: number | null
              updated_at: string | null
            }[]
            SetofOptions: {
              from: "*"
              to: "crm_marketing_contacts"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { search_term: string }
            Returns: {
              allergies_and_conditions: string | null
              birthday: string | null
              company_id: string
              created_at: string
              customer_segment: string | null
              document_number: string | null
              email: string | null
              id: string
              internal_notes: string | null
              is_archived: boolean | null
              last_visit_date: string | null
              name: string | null
              notes: string | null
              opt_in_source: string | null
              phone: string
              preferences: string | null
              tags: string[] | null
              total_spent: number | null
              total_visits: number | null
              updated_at: string | null
            }[]
            SetofOptions: {
              from: "*"
              to: "crm_marketing_contacts"
              isOneToOne: false
              isSetofReturn: true
            }
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
