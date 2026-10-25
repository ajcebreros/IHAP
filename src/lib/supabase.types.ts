export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string;
          college: string | null;
          department: string | null;
          role: 'admin' | 'user';
          avatar: string;
          total_sheets: number;
          monthly_sheets: number;
          office_sheets: number;
          personal_sheets: number;
          status: 'active' | 'inactive';
          printing_allowed: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string;
          college?: string | null;
          department?: string | null;
          role?: 'admin' | 'user';
          avatar?: string;
          total_sheets?: number;
          monthly_sheets?: number;
          office_sheets?: number;
          personal_sheets?: number;
          status?: 'active' | 'inactive';
          printing_allowed?: boolean;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          name?: string;
          college?: string | null;
          department?: string | null;
          role?: 'admin' | 'user';
          avatar?: string;
          total_sheets?: number;
          monthly_sheets?: number;
          office_sheets?: number;
          personal_sheets?: number;
          status?: 'active' | 'inactive';
          printing_allowed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      printers: {
        Row: {
          id: string;
          name: string;
          location: string;
          department: string;
          online: boolean;
          paper_remaining: number;
          max_capacity: number;
          queue: number;
          pages_today: number;
          daily_avg: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string;
          department?: string;
          online?: boolean;
          paper_remaining?: number;
          max_capacity?: number;
          queue?: number;
          pages_today?: number;
          daily_avg?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          location?: string;
          department?: string;
          online?: boolean;
          paper_remaining?: number;
          max_capacity?: number;
          queue?: number;
          pages_today?: number;
          daily_avg?: number;
        };
        Relationships: [];
      };
      print_jobs: {
        Row: {
          id: string;
          user_id: string | null;
          user_name: string;
          department: string;
          document: string;
          document_type: string;
          pages: number;
          copies: number;
          paper_used: number;
          purpose: 'Office' | 'Personal' | 'Unclassified';
          confidence: number;
          printer: string;
          cost: number;
          paper_size: string;
          paper_type: string;
          reasons: string[];
          is_duplex: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_name: string;
          department: string;
          document: string;
          document_type?: string;
          pages: number;
          copies: number;
          paper_used: number;
          purpose: 'Office' | 'Personal' | 'Unclassified';
          confidence?: number;
          printer: string;
          cost: number;
          paper_size?: string;
          paper_type?: string;
          reasons?: string[];
          is_duplex?: boolean;
          created_at?: string;
        };
        Update: {
          purpose?: 'Office' | 'Personal' | 'Unclassified';
        };
        Relationships: [];
      };
      print_job_events: {
        Row: {
          id: number;
          agent_id: string;
          event_record_id: number;
          source_job_id: number | null;
          printer_name: string | null;
          windows_username: string | null;
          machine_name: string | null;
          document_name: string | null;
          port_name: string | null;
          pages_printed: number | null;
          job_size_bytes: number | null;
          printed_at: string;
          received_at: string | null;
        };
        Insert: {
          id?: number;
          agent_id: string;
          event_record_id: number;
          source_job_id?: number | null;
          printer_name?: string | null;
          windows_username?: string | null;
          machine_name?: string | null;
          document_name?: string | null;
          port_name?: string | null;
          pages_printed?: number | null;
          job_size_bytes?: number | null;
          printed_at: string;
          received_at?: string | null;
        };
        Update: {
          source_job_id?: number | null;
          printer_name?: string | null;
          windows_username?: string | null;
          machine_name?: string | null;
          document_name?: string | null;
          port_name?: string | null;
          pages_printed?: number | null;
          job_size_bytes?: number | null;
          printed_at?: string;
          received_at?: string | null;
        };
        Relationships: [];
      };
      alerts: {
        Row: {
          id: string;
          level: 'info' | 'low' | 'critical' | 'empty';
          title: string;
          message: string;
          printer: string | null;
          acknowledged: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          level: 'info' | 'low' | 'critical' | 'empty';
          title: string;
          message: string;
          printer?: string | null;
          acknowledged?: boolean;
          created_at?: string;
        };
        Update: {
          acknowledged?: boolean;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: boolean;
          paper_cost_per_sheet: number;
          max_printer_capacity: number;
          low_paper_threshold: number;
          critical_paper_threshold: number;
          classification_enabled: boolean;
          confidence_threshold: number;
          require_confirmation: boolean;
          low_paper_alerts: boolean;
          critical_paper_alerts: boolean;
          high_consumption_alerts: boolean;
          email_notifications: boolean;
          in_app_notifications: boolean;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          paper_cost_per_sheet?: number;
          max_printer_capacity?: number;
          low_paper_threshold?: number;
          critical_paper_threshold?: number;
          classification_enabled?: boolean;
          confidence_threshold?: number;
          require_confirmation?: boolean;
          low_paper_alerts?: boolean;
          critical_paper_alerts?: boolean;
          high_consumption_alerts?: boolean;
          email_notifications?: boolean;
          in_app_notifications?: boolean;
          updated_at?: string;
        };
        Update: {
          paper_cost_per_sheet?: number;
          max_printer_capacity?: number;
          low_paper_threshold?: number;
          critical_paper_threshold?: number;
          classification_enabled?: boolean;
          confidence_threshold?: number;
          require_confirmation?: boolean;
          low_paper_alerts?: boolean;
          critical_paper_alerts?: boolean;
          high_consumption_alerts?: boolean;
          email_notifications?: boolean;
          in_app_notifications?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_user_account: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
