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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      doc: {
        Row: {
          aprovado: boolean | null
          created_at: string | null
          data_referencia: string
          descricao: string
          folder_id: string | null
          id: string
          updated_at: string | null
          usuario_criador_id: string
        }
        Insert: {
          aprovado?: boolean | null
          created_at?: string | null
          data_referencia: string
          descricao: string
          folder_id?: string | null
          id?: string
          updated_at?: string | null
          usuario_criador_id: string
        }
        Update: {
          aprovado?: boolean | null
          created_at?: string | null
          data_referencia?: string
          descricao?: string
          folder_id?: string | null
          id?: string
          updated_at?: string | null
          usuario_criador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folder"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_entity: {
        Row: {
          created_at: string | null
          doc_id: string
          entity_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          doc_id: string
          entity_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          doc_id?: string
          entity_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_entity_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "doc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_entity_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entity"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_file: {
        Row: {
          created_at: string | null
          doc_id: string | null
          hash: string | null
          id: string
          metadados: Json | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
          tipo_mime: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doc_id?: string | null
          hash?: string | null
          id?: string
          metadados?: Json | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo_mime?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doc_id?: string | null
          hash?: string | null
          id?: string
          metadados?: Json | null
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo_mime?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_file_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "doc"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_queue: {
        Row: {
          created_at: string | null
          dados_extraidos: Json | null
          doc_file_id_original: string | null
          extracted_text: string | null
          file_date: string | null
          hash: string
          id: string
          is_duplicate: boolean | null
          mensagem_atual: string | null
          nome_arquivo: string
          pasta_id: string | null
          processando_desde: string | null
          status: string
          storage_path: string
          tentativas_processamento: number | null
          ultima_tentativa_em: string | null
          updated_at: string | null
          usuario_criador_id: string
        }
        Insert: {
          created_at?: string | null
          dados_extraidos?: Json | null
          doc_file_id_original?: string | null
          extracted_text?: string | null
          file_date?: string | null
          hash: string
          id?: string
          is_duplicate?: boolean | null
          mensagem_atual?: string | null
          nome_arquivo: string
          pasta_id?: string | null
          processando_desde?: string | null
          status: string
          storage_path: string
          tentativas_processamento?: number | null
          ultima_tentativa_em?: string | null
          updated_at?: string | null
          usuario_criador_id: string
        }
        Update: {
          created_at?: string | null
          dados_extraidos?: Json | null
          doc_file_id_original?: string | null
          extracted_text?: string | null
          file_date?: string | null
          hash?: string
          id?: string
          is_duplicate?: boolean | null
          mensagem_atual?: string | null
          nome_arquivo?: string
          pasta_id?: string | null
          processando_desde?: string | null
          status?: string
          storage_path?: string
          tentativas_processamento?: number | null
          ultima_tentativa_em?: string | null
          updated_at?: string | null
          usuario_criador_id?: string
        }
        Relationships: []
      }
      entity: {
        Row: {
          created_at: string | null
          entity_type_id: string
          id: string
          identificador_1: string
          identificador_2: string | null
          nome: string
          updated_at: string | null
          usuario_criador_id: string
        }
        Insert: {
          created_at?: string | null
          entity_type_id: string
          id?: string
          identificador_1: string
          identificador_2?: string | null
          nome: string
          updated_at?: string | null
          usuario_criador_id: string
        }
        Update: {
          created_at?: string | null
          entity_type_id?: string
          id?: string
          identificador_1?: string
          identificador_2?: string | null
          nome?: string
          updated_at?: string | null
          usuario_criador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "entity_type"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_type: {
        Row: {
          created_at: string | null
          descricao: string
          extraction_method: string
          icone: string | null
          id: string
          nome: string
          nome_ident_1: string | null
          nome_ident_2: string | null
          prompt: string
          regex_pattern: string | null
          requires_validation: boolean | null
          spacy_label: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao: string
          extraction_method?: string
          icone?: string | null
          id?: string
          nome: string
          nome_ident_1?: string | null
          nome_ident_2?: string | null
          prompt: string
          regex_pattern?: string | null
          requires_validation?: boolean | null
          spacy_label?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string
          extraction_method?: string
          icone?: string | null
          id?: string
          nome?: string
          nome_ident_1?: string | null
          nome_ident_2?: string | null
          prompt?: string
          regex_pattern?: string | null
          requires_validation?: boolean | null
          spacy_label?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      folder: {
        Row: {
          created_at: string | null
          descricao: string
          id: string
          updated_at: string | null
          usuario_criador_id: string
        }
        Insert: {
          created_at?: string | null
          descricao: string
          id?: string
          updated_at?: string | null
          usuario_criador_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string
          id?: string
          updated_at?: string | null
          usuario_criador_id?: string
        }
        Relationships: []
      }
      folder_share: {
        Row: {
          confirmed: boolean | null
          created_at: string
          folder_id: string
          guest_email: string
          user_guest_id: string | null
          usuario_criador_id: string
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string
          folder_id: string
          guest_email: string
          user_guest_id?: string | null
          usuario_criador_id: string
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string
          folder_id?: string
          guest_email?: string
          user_guest_id?: string | null
          usuario_criador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_share_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folder"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_share_user_guest_id_fkey"
            columns: ["user_guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_share_usuario_criador_id_fkey"
            columns: ["usuario_criador_id"]
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
          full_name: string
          id: string
          last_folder: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          last_folder?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          last_folder?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      get_user_email_by_id: { Args: { user_uuid: string }; Returns: string }
      get_user_id_by_email: { Args: { user_email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      user_owns_doc_file: { Args: { _doc_file_id: string }; Returns: boolean }
      user_owns_storage_object: {
        Args: { _storage_path: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      tipo_evento:
        | "contrato"
        | "pagamento"
        | "assembleia"
        | "manutencao"
        | "outro"
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
      tipo_evento: [
        "contrato",
        "pagamento",
        "assembleia",
        "manutencao",
        "outro",
      ],
    },
  },
} as const
