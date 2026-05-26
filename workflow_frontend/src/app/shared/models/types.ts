// ── Auth ─────────────────────────────────────────────
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  roles: string[];
  is_admin: boolean;
}

export interface Role {
  id: number;
  name: string;
  display_name?: string;
}

// ── Template ─────────────────────────────────────────
export interface WorkflowTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  current_version_info: VersionInfo | null;
  draft_version_info: VersionInfo | null;
  has_draft: boolean;
  station_count: number;
  transition_count?: number;
  task_count?: number;
  instance_count: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface VersionInfo {
  id: number;
  version_label: string;
  version_number: number;
  published_by?: string;
  published_at?: string;
  change_notes?: string;
}

export interface TemplateVersion {
  id: number;
  version_label: string;
  version_number: number;
  template_id: number;
  template_name: string;
  published_by: number;
  published_by_name: string;
  published_at: string;
  change_notes: string;
  stations: Station[];
  transitions: TransitionDetail[];
}

// ── Station ──────────────────────────────────────────
export interface Station {
  id: number;
  name: string;
  description: string;
  station_type: 'START' | 'NORMAL' | 'END';
  order: number;
  auto_move: boolean;
  configuration?: any;
  allowed_roles: Role[];
  tasks?: TaskDefinition[];
  task_count?: number;
  outgoing_transition_count?: number;
}

// ── Transition ───────────────────────────────────────
export interface TransitionDetail {
  id: number;
  from_station: { id: number; name: string };
  to_station: { id: number; name: string };
  label: string;
  remarks_required: boolean;
}

// ── Task Definition ──────────────────────────────────
export interface TaskDefinition {
  id: number;
  name: string;
  description: string;
  task_type: 'APPROVAL' | 'FORM' | 'DOCUMENT' | 'CONFIRMATION' | 'PAYMENT' | 'API' | 'EMAIL';
  is_required: boolean;
  order: number;
  task_config: TaskConfig;
  allowed_roles?: Role[];
}

export interface TaskConfig {
  fields?: FormField[];
  checklist?: ChecklistItem[];
  options?: string[];
  remarks_required?: boolean;
  allowed_types?: string[];
  max_file_size_mb?: number;
  min_files?: number;
  max_files?: number;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'date' | 'checkbox' | 'email' | 'url';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  required: boolean;
}

// ── Instance ─────────────────────────────────────────
export interface WorkflowInstance {
  id: number;
  reference: string;
  title: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';
  template_version: number;
  template_name: string;
  version_label: string;
  current_station: number;
  current_station_name: string;
  current_station_type: string;
  current_station_info?: StationInfo;
  current_owner: number | null;
  current_owner_name?: string;
  current_owner_info?: PersonInfo;
  initiated_by: number;
  initiated_by_name: string;
  initiated_by_info?: PersonInfo;
  instance_data: Record<string, any>;
  user_permissions?: UserPermissions;
  progress?: InstanceProgress;
  station_timeline?: TimelineEntry[];
  public_token?: string;
  version: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface StationInfo {
  id: number;
  name: string;
  station_type: string;
  description: string;
  allowed_roles: Role[];
}

export interface PersonInfo {
  id: number;
  username: string;
  full_name: string;
}

export interface UserPermissions {
  can_execute_tasks: boolean;
  can_move_workflow: boolean;
  can_upload_documents: boolean;
  reason_if_blocked: string | null;
}

export interface InstanceProgress {
  total_stations: number;
  completed_stations: number;
  stations: { station: { id: number; name: string; station_type: string }; status: string }[];
}

export interface TimelineEntry {
  timestamp: string;
  action: string;
  by: string;
  detail: string;
  remarks?: string;
}

// ── Task Execution ───────────────────────────────────
export interface TaskExecution {
  id: number;
  task_definition: TaskDefinition;
  station: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  response_data: any;
  executed_by: number | null;
  executed_by_name: string;
  remarks: string;
  documents_info?: { id: number; original_filename: string }[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ── History ──────────────────────────────────────────
export interface HistoryEntry {
  id: number;
  action: string;
  action_by: number;
  action_by_name: string;
  from_station: number | null;
  from_station_name: string | null;
  to_station: number | null;
  to_station_name: string | null;
  task_name: string | null;
  task_type: string | null;
  remarks: string;
  metadata: any;
  timestamp: string;
}

// ── Document ─────────────────────────────────────────
export interface DocumentInfo {
  id: number;
  original_filename: string;
  file_size: number;
  file_size_display: string;
  content_type: string;
  station: { id: number; name: string };
  uploaded_by: { id: number; username: string; full_name: string };
  description: string;
  tags: string[];
  uploaded_at: string;
  download_url: string;
}

// ── Dashboard ────────────────────────────────────────
export interface AdminDashboard {
  total_templates: number;
  published_templates: number;
  draft_templates: number;
  total_instances: number;
  active_instances: number;
  completed_today: number;
  recent_templates: any[];
}

export interface UserDashboard {
  user: PersonInfo;
  my_workload: { assigned_to_me: number; blocked_by_me: number; completed_by_me: number };
  my_initiated: { total: number; in_review: number; completed: number };
  recent_instances: any[];
}

// ── Paginated ────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Move ─────────────────────────────────────────────
export interface MoveResponse {
  success: boolean;
  message: string;
  transition: TransitionDetail;
  instance: {
    id: number; reference: string; status: string;
    current_station: { id: number; name: string; station_type: string };
    version: number; updated_at: string; completed_at: string | null;
  };
  new_tasks_created: { id: number; task_name: string; task_type: string }[];
  history_entry: { id: number; action: string; timestamp: string };
}

export interface AllowedTransitions {
  current_station: { id: number; name: string };
  can_move: boolean;
  blocked_reason: string | null;
  transitions: {
    id: number;
    to_station: { id: number; name: string; station_type: string };
    label: string;
    remarks_required: boolean;
    disabled: boolean;
  }[];
}
