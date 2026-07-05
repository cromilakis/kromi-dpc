export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assessment_controls: {
        Row: {
          assessment_id: string
          control_id: string
          created_at: string
          evaluated_at: string | null
          findings: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["control_result"]
          updated_at: string
        }
        Insert: {
          assessment_id: string
          control_id: string
          created_at?: string
          evaluated_at?: string | null
          findings?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["control_result"]
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          control_id?: string
          created_at?: string
          evaluated_at?: string | null
          findings?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["control_result"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_controls_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_controls_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          cycle: number
          id: string
          started_at: string
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          cycle?: number
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          cycle?: number
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_client_view"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      certificates: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          issued_at: string
          revalidated_at: string | null
          sha256_hash: string
          status: Database["public"]["Enums"]["certificate_status"]
          updated_at: string
          valid_until: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          issued_at?: string
          revalidated_at?: string | null
          sha256_hash: string
          status?: Database["public"]["Enums"]["certificate_status"]
          updated_at?: string
          valid_until: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          revalidated_at?: string | null
          sha256_hash?: string
          status?: Database["public"]["Enums"]["certificate_status"]
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_client_view"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          complexity_score: number | null
          contact: Json
          created_at: string
          employees_count: number | null
          factors: string[]
          id: string
          name: string
          notes: string | null
          phase: Database["public"]["Enums"]["company_phase"]
          rut: string | null
          sector_id: string | null
          size_tier: Database["public"]["Enums"]["company_size_tier"] | null
          updated_at: string
        }
        Insert: {
          complexity_score?: number | null
          contact?: Json
          created_at?: string
          employees_count?: number | null
          factors?: string[]
          id?: string
          name: string
          notes?: string | null
          phase?: Database["public"]["Enums"]["company_phase"]
          rut?: string | null
          sector_id?: string | null
          size_tier?: Database["public"]["Enums"]["company_size_tier"] | null
          updated_at?: string
        }
        Update: {
          complexity_score?: number | null
          contact?: Json
          created_at?: string
          employees_count?: number | null
          factors?: string[]
          id?: string
          name?: string
          notes?: string | null
          phase?: Database["public"]["Enums"]["company_phase"]
          rut?: string | null
          sector_id?: string | null
          size_tier?: Database["public"]["Enums"]["company_size_tier"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_client_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_risks: {
        Row: {
          company_id: string
          created_at: string
          id: string
          impact: number
          notes: string | null
          probability: number
          risk_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          impact: number
          notes?: string | null
          probability: number
          risk_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          impact?: number
          notes?: string | null
          probability?: number
          risk_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_risks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_risks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_client_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_risks_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risk_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      controls: {
        Row: {
          applies_when: Json | null
          code: string
          created_at: string
          detail: string | null
          domain_id: string
          id: string
          laws: string[]
          legal_connected: string | null
          legal_primary: string | null
          name: string
          objective: string | null
          required_evidences: string[]
          risk_mitigated: string | null
          sector_scope: string[] | null
          sort: number
          updated_at: string
          verification_criteria: string[]
        }
        Insert: {
          applies_when?: Json | null
          code: string
          created_at?: string
          detail?: string | null
          domain_id: string
          id?: string
          laws?: string[]
          legal_connected?: string | null
          legal_primary?: string | null
          name: string
          objective?: string | null
          required_evidences?: string[]
          risk_mitigated?: string | null
          sector_scope?: string[] | null
          sort?: number
          updated_at?: string
          verification_criteria?: string[]
        }
        Update: {
          applies_when?: Json | null
          code?: string
          created_at?: string
          detail?: string | null
          domain_id?: string
          id?: string
          laws?: string[]
          legal_connected?: string | null
          legal_primary?: string | null
          name?: string
          objective?: string | null
          required_evidences?: string[]
          risk_mitigated?: string | null
          sector_scope?: string[] | null
          sort?: number
          updated_at?: string
          verification_criteria?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "controls_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["domain_kind"]
          name: string
          principle: string | null
          sort: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["domain_kind"]
          name: string
          principle?: string | null
          sort?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["domain_kind"]
          name?: string
          principle?: string | null
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      evidences: {
        Row: {
          company_id: string
          control_id: string | null
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["evidence_status"]
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          company_id: string
          control_id?: string | null
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["evidence_status"]
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          company_id?: string
          control_id?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["evidence_status"]
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_client_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          ai_extraction: Json | null
          answers: Json
          assessment_id: string | null
          company_id: string
          id: string
          mode: Database["public"]["Enums"]["interview_mode"]
          progress: number
          respondent: Json
          reviewed_at: string | null
          started_at: string
          status: Database["public"]["Enums"]["interview_status"]
          submitted_at: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          ai_extraction?: Json | null
          answers?: Json
          assessment_id?: string | null
          company_id: string
          id?: string
          mode?: Database["public"]["Enums"]["interview_mode"]
          progress?: number
          respondent?: Json
          reviewed_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["interview_status"]
          submitted_at?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          ai_extraction?: Json | null
          answers?: Json
          assessment_id?: string | null
          company_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["interview_mode"]
          progress?: number
          respondent?: Json
          reviewed_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["interview_status"]
          submitted_at?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_client_view"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_activities: {
        Row: {
          area: string
          company_id: string
          created_at: string
          data_categories: string[]
          data_subjects: string[]
          id: string
          intl_countries: string[]
          intl_transfer: boolean
          is_sensitive: boolean
          legal_basis: string
          name: string
          notes: string | null
          processors: string[]
          purpose: string
          recipients: string[]
          retention: string
          security_measures: string[]
          source: string
          source_session_id: string | null
          updated_at: string
        }
        Insert: {
          area: string
          company_id: string
          created_at?: string
          data_categories?: string[]
          data_subjects?: string[]
          id?: string
          intl_countries?: string[]
          intl_transfer?: boolean
          is_sensitive?: boolean
          legal_basis?: string
          name: string
          notes?: string | null
          processors?: string[]
          purpose?: string
          recipients?: string[]
          retention?: string
          security_measures?: string[]
          source?: string
          source_session_id?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          company_id?: string
          created_at?: string
          data_categories?: string[]
          data_subjects?: string[]
          id?: string
          intl_countries?: string[]
          intl_transfer?: boolean
          is_sensitive?: boolean
          legal_basis?: string
          name?: string
          notes?: string | null
          processors?: string[]
          purpose?: string
          recipients?: string[]
          retention?: string
          security_measures?: string[]
          source?: string
          source_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_client_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_activities_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      remediation_items: {
        Row: {
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          responsible: string | null
          solution_id: string | null
          status: Database["public"]["Enums"]["remediation_status"]
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          responsible?: string | null
          solution_id?: string | null
          status?: Database["public"]["Enums"]["remediation_status"]
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          responsible?: string | null
          solution_id?: string | null
          status?: Database["public"]["Enums"]["remediation_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remediation_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remediation_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_client_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remediation_items_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solution_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_catalog: {
        Row: {
          classification: Database["public"]["Enums"]["risk_classification"]
          code: string
          created_at: string
          default_impact: number
          default_probability: number
          description: string
          domain_id: string | null
          id: string
          sector_tags: string[]
          updated_at: string
        }
        Insert: {
          classification?: Database["public"]["Enums"]["risk_classification"]
          code: string
          created_at?: string
          default_impact: number
          default_probability: number
          description: string
          domain_id?: string | null
          id?: string
          sector_tags?: string[]
          updated_at?: string
        }
        Update: {
          classification?: Database["public"]["Enums"]["risk_classification"]
          code?: string
          created_at?: string
          default_impact?: number
          default_probability?: number
          description?: string
          domain_id?: string | null
          id?: string
          sector_tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_catalog_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          code: string
          complexity_multiplier: number
          created_at: string
          id: string
          laws: string[]
          name: string
          sort: number
          updated_at: string
        }
        Insert: {
          code: string
          complexity_multiplier?: number
          created_at?: string
          id?: string
          laws?: string[]
          name: string
          sort?: number
          updated_at?: string
        }
        Update: {
          code?: string
          complexity_multiplier?: number
          created_at?: string
          id?: string
          laws?: string[]
          name?: string
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      self_assessments: {
        Row: {
          answers: Json
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          estimated_tier: string | null
          id: string
          risk_factors: string[]
          sector_code: string | null
          size_tier: Database["public"]["Enums"]["company_size_tier"] | null
        }
        Insert: {
          answers?: Json
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          estimated_tier?: string | null
          id?: string
          risk_factors?: string[]
          sector_code?: string | null
          size_tier?: Database["public"]["Enums"]["company_size_tier"] | null
        }
        Update: {
          answers?: Json
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          estimated_tier?: string | null
          id?: string
          risk_factors?: string[]
          sector_code?: string | null
          size_tier?: Database["public"]["Enums"]["company_size_tier"] | null
        }
        Relationships: []
      }
      share_links: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["share_kind"]
          revoked_at: string | null
          target_id: string
          token_hash: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["share_kind"]
          revoked_at?: string | null
          target_id: string
          token_hash: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["share_kind"]
          revoked_at?: string | null
          target_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_client_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      solution_catalog: {
        Row: {
          control_id: string | null
          created_at: string
          description: string | null
          id: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          control_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          control_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_catalog_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_client_view: {
        Row: {
          contact: Json | null
          created_at: string | null
          id: string | null
          name: string | null
          phase: Database["public"]["Enums"]["company_phase"] | null
          rut: string | null
          sector_id: string | null
          size_tier: Database["public"]["Enums"]["company_size_tier"] | null
        }
        Insert: {
          contact?: Json | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          phase?: Database["public"]["Enums"]["company_phase"] | null
          rut?: string | null
          sector_id?: string | null
          size_tier?: Database["public"]["Enums"]["company_size_tier"] | null
        }
        Update: {
          contact?: Json | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          phase?: Database["public"]["Enums"]["company_phase"] | null
          rut?: string | null
          sector_id?: string | null
          size_tier?: Database["public"]["Enums"]["company_size_tier"] | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      diagnosis_questions: {
        Args: { p_token: string }
        Returns: {
          code: string
          name: string
          verification_criteria: string[]
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_client: { Args: never; Returns: boolean }
      is_consultant: { Args: never; Returns: boolean }
      open_diagnosis: {
        Args: { p_token: string }
        Returns: {
          answers: Json
          company_name: string
          session_id: string
          status: Database["public"]["Enums"]["interview_status"]
        }[]
      }
      save_diagnosis_answers: {
        Args: { p_answers: Json; p_token: string }
        Returns: undefined
      }
      verify_certificate: {
        Args: { cert_code: string }
        Returns: {
          company_name: string
          issued_at: string
          status: string
          valid_until: string
        }[]
      }
    }
    Enums: {
      assessment_status: "open" | "in_review" | "closed"
      certificate_status: "active" | "expired" | "revoked"
      company_phase:
        | "diagnostico"
        | "propuesta"
        | "certificacion"
        | "revalidacion"
      company_size_tier: "micro" | "small" | "enterprise"
      control_result:
        | "pending"
        | "compliant"
        | "partial"
        | "non_compliant"
        | "not_applicable"
      domain_kind: "principle" | "complementary"
      evidence_status: "validated" | "partial" | "missing" | "rejected"
      interview_mode: "assisted" | "self"
      interview_status: "draft" | "in_progress" | "submitted" | "reviewed"
      remediation_status: "pending" | "in_progress" | "done"
      risk_classification: "transversal" | "sectorial"
      share_kind: "diagnosis" | "certificate" | "document"
      user_role: "consultant" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assessment_status: ["open", "in_review", "closed"],
      certificate_status: ["active", "expired", "revoked"],
      company_phase: [
        "diagnostico",
        "propuesta",
        "certificacion",
        "revalidacion",
      ],
      company_size_tier: ["micro", "small", "enterprise"],
      control_result: [
        "pending",
        "compliant",
        "partial",
        "non_compliant",
        "not_applicable",
      ],
      domain_kind: ["principle", "complementary"],
      evidence_status: ["validated", "partial", "missing", "rejected"],
      interview_mode: ["assisted", "self"],
      interview_status: ["draft", "in_progress", "submitted", "reviewed"],
      remediation_status: ["pending", "in_progress", "done"],
      risk_classification: ["transversal", "sectorial"],
      share_kind: ["diagnosis", "certificate", "document"],
      user_role: ["consultant", "admin"],
    },
  },
} as const

