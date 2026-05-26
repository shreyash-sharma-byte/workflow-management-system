import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  UserProfile, Role, WorkflowTemplate, TemplateVersion,
  Station, TaskDefinition, TransitionDetail,
  WorkflowInstance, TaskExecution, HistoryEntry,
  DocumentInfo, AdminDashboard, UserDashboard,
  MoveResponse, AllowedTransitions, PaginatedResponse,
} from '../../shared/models/types';

const BASE = 'http://localhost:8000/api/v1';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ── Auth ────────────────────────────────────────────
  me(): Observable<UserProfile> { return this.http.get<UserProfile>(`${BASE}/auth/me/`); }
  roles(): Observable<Role[]> {
    return this.http.get<PaginatedResponse<Role>>(`${BASE}/auth/roles/`).pipe(
      map(r => r.results)
    );
  }

  // ── Dashboard ───────────────────────────────────────
  adminDashboard(): Observable<AdminDashboard> { return this.http.get<AdminDashboard>(`${BASE}/dashboard/admin/`); }
  userDashboard(): Observable<UserDashboard> { return this.http.get<UserDashboard>(`${BASE}/dashboard/user/`); }

  // ── Templates ───────────────────────────────────────
  listTemplates(params?: any): Observable<PaginatedResponse<WorkflowTemplate>> {
    return this.http.get<PaginatedResponse<WorkflowTemplate>>(`${BASE}/templates/`, { params });
  }
  getTemplate(id: number): Observable<WorkflowTemplate> {
    return this.http.get<WorkflowTemplate>(`${BASE}/templates/${id}/`);
  }
  createTemplate(data: any): Observable<WorkflowTemplate> {
    return this.http.post<WorkflowTemplate>(`${BASE}/templates/`, data);
  }
  updateTemplate(id: number, data: any): Observable<WorkflowTemplate> {
    return this.http.put<WorkflowTemplate>(`${BASE}/templates/${id}/`, data);
  }
  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/templates/${id}/`);
  }
  publishTemplate(id: number, notes: string): Observable<any> {
    return this.http.post(`${BASE}/templates/${id}/publish/`, { change_notes: notes });
  }
  createDraft(id: number, notes: string): Observable<any> {
    return this.http.post(`${BASE}/templates/${id}/create_draft/`, { change_notes: notes });
  }
  getVersions(id: number): Observable<{ count: number; results: any[] }> {
    return this.http.get<any>(`${BASE}/templates/${id}/versions/`);
  }
  getVersionDetail(templateId: number, versionId: number): Observable<TemplateVersion> {
    return this.http.get<TemplateVersion>(`${BASE}/templates/${templateId}/versions/${versionId}/`);
  }

  // ── Stations ────────────────────────────────────────
  listStations(templateId: number): Observable<PaginatedResponse<Station>> {
    return this.http.get<PaginatedResponse<Station>>(`${BASE}/templates/${templateId}/stations/`);
  }
  createStation(templateId: number, data: any): Observable<Station> {
    return this.http.post<Station>(`${BASE}/templates/${templateId}/stations/`, data);
  }
  updateStation(templateId: number, id: number, data: any): Observable<Station> {
    return this.http.put<Station>(`${BASE}/templates/${templateId}/stations/${id}/`, data);
  }
  deleteStation(templateId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/templates/${templateId}/stations/${id}/`);
  }

  // ── Tasks ───────────────────────────────────────────
  listTasks(templateId: number, stationId: number): Observable<PaginatedResponse<TaskDefinition>> {
    return this.http.get<PaginatedResponse<TaskDefinition>>(`${BASE}/templates/${templateId}/stations/${stationId}/tasks/`);
  }
  createTask(templateId: number, stationId: number, data: any): Observable<TaskDefinition> {
    return this.http.post<TaskDefinition>(`${BASE}/templates/${templateId}/stations/${stationId}/tasks/`, data);
  }
  updateTask(templateId: number, stationId: number, id: number, data: any): Observable<TaskDefinition> {
    return this.http.put<TaskDefinition>(`${BASE}/templates/${templateId}/stations/${stationId}/tasks/${id}/`, data);
  }
  deleteTask(templateId: number, stationId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/templates/${templateId}/stations/${stationId}/tasks/${id}/`);
  }

  // ── Transitions ─────────────────────────────────────
  listTransitions(templateId: number): Observable<PaginatedResponse<TransitionDetail>> {
    return this.http.get<PaginatedResponse<TransitionDetail>>(`${BASE}/templates/${templateId}/transitions/`);
  }
  createTransition(templateId: number, data: any): Observable<TransitionDetail> {
    return this.http.post<TransitionDetail>(`${BASE}/templates/${templateId}/transitions/`, data);
  }
  deleteTransition(templateId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/templates/${templateId}/transitions/${id}/`);
  }

  // ── Instances ───────────────────────────────────────
  listInstances(params?: any): Observable<PaginatedResponse<WorkflowInstance>> {
    return this.http.get<PaginatedResponse<WorkflowInstance>>(`${BASE}/instances/`, { params });
  }
  getInstance(id: number): Observable<WorkflowInstance> {
    return this.http.get<WorkflowInstance>(`${BASE}/instances/${id}/`);
  }
  createInstance(data: any): Observable<WorkflowInstance> {
    return this.http.post<WorkflowInstance>(`${BASE}/instances/`, data);
  }
  updateInstance(id: number, data: any): Observable<WorkflowInstance> {
    return this.http.put<WorkflowInstance>(`${BASE}/instances/${id}/`, data);
  }

  // ── Move Engine ─────────────────────────────────────
  moveInstance(id: number, toStationId: number, remarks: string): Observable<MoveResponse> {
    return this.http.post<MoveResponse>(`${BASE}/instances/${id}/move/`, { to_station_id: toStationId, remarks });
  }
  getAllowedTransitions(id: number): Observable<AllowedTransitions> {
    return this.http.get<AllowedTransitions>(`${BASE}/instances/${id}/allowed_transitions/`);
  }
  cancelInstance(id: number, remarks: string): Observable<any> {
    return this.http.post(`${BASE}/instances/${id}/cancel/`, { remarks });
  }

  // ── Task Executions ─────────────────────────────────
  listInstanceTasks(instanceId: number): Observable<{ station: any; count: number; results: TaskExecution[] }> {
    return this.http.get<any>(`${BASE}/instances/${instanceId}/tasks/`);
  }
  startTask(instanceId: number, execId: number): Observable<any> {
    return this.http.post(`${BASE}/instances/${instanceId}/tasks/${execId}/start/`, {});
  }
  submitTask(instanceId: number, execId: number, responseData: any, remarks: string): Observable<any> {
    return this.http.post(`${BASE}/instances/${instanceId}/tasks/${execId}/submit/`, { response_data: responseData, remarks });
  }
  saveTaskDraft(instanceId: number, execId: number, responseData: any): Observable<any> {
    return this.http.post(`${BASE}/instances/${instanceId}/tasks/${execId}/save-draft/`, { response_data: responseData });
  }

  // ── History ─────────────────────────────────────────
  listHistory(instanceId: number, params?: any): Observable<PaginatedResponse<HistoryEntry>> {
    return this.http.get<PaginatedResponse<HistoryEntry>>(`${BASE}/instances/${instanceId}/history/`, { params });
  }

  // ── Documents ───────────────────────────────────────
  listDocuments(instanceId: number, params?: any): Observable<PaginatedResponse<DocumentInfo>> {
    return this.http.get<PaginatedResponse<DocumentInfo>>(`${BASE}/instances/${instanceId}/documents/`, { params });
  }
  uploadDocument(instanceId: number, file: File, description?: string, taskExecutionId?: number): Observable<DocumentInfo> {
    const fd = new FormData();
    fd.append('file', file);
    if (description) fd.append('description', description);
    if (taskExecutionId) fd.append('task_execution_id', String(taskExecutionId));
    return this.http.post<DocumentInfo>(`${BASE}/instances/${instanceId}/documents/upload/`, fd);
  }
  getDownloadUrl(instanceId: number, docId: number): string {
    return `${BASE}/instances/${instanceId}/documents/${docId}/download/`;
  }

  downloadDocument(instanceId: number, docId: number, filename: string): void {
    this.http.get(`${BASE}/instances/${instanceId}/documents/${docId}/download/`, {
      responseType: 'blob',
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  // ── Public Instance (Micro-Frontend) ────────────────
  getPublicInstance(token: string): Observable<WorkflowInstance> {
    return this.http.get<WorkflowInstance>(`${BASE}/public/instances/${token}/`);
  }
  listPublicInstanceTasks(token: string): Observable<{ station: any; count: number; results: TaskExecution[] }> {
    return this.http.get<any>(`${BASE}/public/instances/${token}/tasks/`);
  }
  startTaskPublic(token: string, taskPk: number): Observable<any> {
    return this.http.post(`${BASE}/public/instances/${token}/tasks/${taskPk}/start/`, {});
  }
  submitTaskPublic(token: string, taskPk: number, responseData: any, remarks: string): Observable<any> {
    return this.http.post(`${BASE}/public/instances/${token}/tasks/${taskPk}/submit/`, { response_data: responseData, remarks });
  }
  movePublic(token: string, toStationId: number, remarks: string): Observable<any> {
    return this.http.post(`${BASE}/public/instances/${token}/move/`, { to_station_id: toStationId, remarks });
  }

  // ── Notifications ──────────────────────────────────
  getUnreadCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${BASE}/notifications/unread-count/`);
  }
  getNotifications(params?: any): Observable<{ count: number; unread_count: number; results: any[] }> {
    return this.http.get<any>(`${BASE}/notifications/`, { params });
  }
  markNotificationRead(id: number): Observable<any> {
    return this.http.post(`${BASE}/notifications/${id}/read/`, {});
  }
  markAllNotificationsRead(): Observable<any> {
    return this.http.post(`${BASE}/notifications/mark-all-read/`, {});
  }
}
