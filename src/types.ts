/**
 * Shared Type Definitions for Task Management Web Application
 */

export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  created_at: string;
  updated_at: string;
  project_id: number;
  assignee_id: number;
}

// Relational Task Object populated with User and Project info of SQL-like Joins
export interface PopulateTask extends Task {
  assignee_name?: string;
  assignee_email?: string;
  assignee_avatar?: string;
  project_name?: string;
  project_color?: string;
}

export interface ActivityLog {
  id: number;
  task_id: number;
  task_title: string;
  user_id: number;
  user_name: string;
  action_type: 'create' | 'update_status' | 'update_task' | 'delete';
  old_value?: string;
  new_value?: string;
  timestamp: string;
}

export interface SqlQueryLog {
  id: string;
  query: string;
  params?: any[];
  timestamp: string;
  durationMs: number;
  rowsAffected: number;
}
