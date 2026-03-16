export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      crm_users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: "admin" | "manager" | "agent";
          whatsapp_phone: string | null;
          hubspot_owner_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      pipeline_stages: {
        Row: {
          id: string;
          code: string;
          name: string;
          color_token: string;
          stage_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      contact_lists: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          hubspot_list_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          full_name: string;
          first_name: string | null;
          email: string | null;
          whatsapp_phone: string | null;
          form_name: string | null;
          source: string | null;
          notes: string | null;
          current_stage_id: string;
          current_list_id: string | null;
          owner_id: string | null;
          hubspot_contact_id: string | null;
          hubspot_owner_id: string | null;
          hubspot_last_synced_at: string | null;
          entered_at: string;
          last_interaction_at: string | null;
          next_action_at: string | null;
          sale_date: string | null;
          sold_product: "smart" | "mentoria" | null;
          sold_amount: number | null;
          day_trade_status: string | null;
          client_category: "Indicador Free" | "Clear" | "Outros" | null;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      contact_tags: {
        Row: {
          id: string;
          name: string;
          color_token: string | null;
          created_at: string;
        };
      };
      contact_tag_links: {
        Row: {
          contact_id: string;
          tag_id: string;
          created_at: string;
        };
      };
      contact_interactions: {
        Row: {
          id: string;
          contact_id: string;
          interaction_type: "note" | "whatsapp" | "call" | "email" | "movement" | "system";
          description: string;
          happened_at: string;
          created_by: string | null;
          metadata: Json;
          created_at: string;
        };
      };
      contact_stage_history: {
        Row: {
          id: string;
          contact_id: string;
          from_stage_id: string | null;
          to_stage_id: string;
          changed_by: string | null;
          reason: string | null;
          changed_at: string;
        };
      };
      contact_list_history: {
        Row: {
          id: string;
          contact_id: string;
          from_list_id: string | null;
          to_list_id: string | null;
          changed_by: string | null;
          changed_at: string;
        };
      };
      contact_attachments: {
        Row: {
          id: string;
          contact_id: string;
          file_name: string;
          file_path: string;
          file_url: string;
          created_at: string;
        };
      };
      whatsapp_templates: {
        Row: {
          id: string;
          name: string;
          scope_type: "stage" | "list";
          stage_id: string | null;
          list_id: string | null;
          body: string;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      hubspot_sync_log: {
        Row: {
          id: string;
          object_type: "contact" | "list" | "owner";
          object_id: string;
          action: "import" | "upsert" | "archive" | "error";
          status: "pending" | "success" | "error";
          payload: Json;
          error_message: string | null;
          synced_at: string;
        };
      };
    };
  };
}
