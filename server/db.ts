import fs from 'fs';
import path from 'path';
import { Task, User, Project, ActivityLog, SqlQueryLog, PopulateTask } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const ACTIVITY_LOGS_FILE = path.join(DATA_DIR, 'activity_logs.json');

// Memory logs for standard MySQL queries running under-the-hood
let sqlQueryLogs: SqlQueryLog[] = [];

// Ensure Directories and JSON relational tables exist
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Seeding default values styled exactly to schema.sql if not exists
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers: User[] = [
      {
        id: 1,
        name: 'Sarah Jenkins',
        email: 'sarah.j@company.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop',
        role: 'Lead Designer'
      },
      {
        id: 2,
        name: 'Alex Rivera',
        email: 'alex.r@company.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop',
        role: 'Fullstack Engineer'
      },
      {
        id: 3,
        name: 'Marcus Vance',
        email: 'marcus.v@company.com',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop',
        role: 'Product Manager'
      },
      {
        id: 4,
        name: 'Elena Rostov',
        email: 'elena.r@company.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop',
        role: 'QA Automator'
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    logSql('INSERT INTO users (id, name, email, avatar, role) VALUES (...)', defaultUsers.length);
  }

  if (!fs.existsSync(PROJECTS_FILE)) {
    const defaultProjects: Project[] = [
      { id: 1, name: 'Alpha Redesign', description: 'Complete visual overhauled user dashboard for client feedback.', color: '#3b82f6' },
      { id: 2, name: 'Mobile App', description: 'Sprint 3 implementation of React Native modules and notifications.', color: '#8b5cf6' },
      { id: 3, name: 'API Integration', description: 'Stripe payment webhooks and telemetry database pipelines.', color: '#10b981' },
      { id: 4, name: 'Client Onboarding', description: 'Refining steps to sign up, configure profile, and quick tours.', color: '#f59e0b' }
    ];
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(defaultProjects, null, 2));
    logSql('INSERT INTO projects (id, name, description, color) VALUES (...)', defaultProjects.length);
  }

  if (!fs.existsSync(TASKS_FILE)) {
    const defaultTasks: Task[] = [
      {
        id: 1,
        title: 'Design new landing page style guide',
        description: 'Develop visual system with typography and primary/secondary colors.',
        status: 'in_progress',
        priority: 'high',
        due_date: '2026-06-25',
        project_id: 1,
        assignee_id: 1,
        created_at: '2026-06-12T10:00:00.000Z',
        updated_at: '2026-06-12T10:00:00.000Z'
      },
      {
        id: 2,
        title: 'Draft authentication flow visual sequence',
        description: 'Map the OAuth and signup screen progression layouts.',
        status: 'todo',
        priority: 'low',
        due_date: '2026-06-30',
        project_id: 1,
        assignee_id: 3,
        created_at: '2026-06-13T11:30:00.000Z',
        updated_at: '2026-06-13T11:30:00.000Z'
      },
      {
        id: 3,
        title: 'Deploy staging backend cluster',
        description: 'Setup the Node.js server to run on sandbox instances.',
        status: 'done',
        priority: 'high',
        due_date: '2026-06-18',
        project_id: 3,
        assignee_id: 2,
        created_at: '2026-06-11T09:00:00.000Z',
        updated_at: '2026-06-11T09:00:00.000Z'
      },
      {
        id: 4,
        title: 'Refactor invoice query execution speed',
        description: 'Optimize subqueries and compile direct relational indexes.',
        status: 'review',
        priority: 'medium',
        due_date: '2026-06-24',
        project_id: 3,
        assignee_id: 2,
        created_at: '2026-06-14T14:45:00.000Z',
        updated_at: '2026-06-14T14:45:00.000Z'
      },
      {
        id: 5,
        title: 'Write device notifications payload specs',
        description: 'Document notifications JSON format for iOS and Android platforms.',
        status: 'todo',
        priority: 'medium',
        due_date: '2026-06-28',
        project_id: 2,
        assignee_id: 3,
        created_at: '2026-06-14T16:00:00.000Z',
        updated_at: '2026-06-14T16:00:00.000Z'
      },
      {
        id: 6,
        title: 'Perform accessibility compliance review',
        description: 'Audit components against standard WCAG AA design profiles.',
        status: 'todo',
        priority: 'low',
        due_date: '2026-07-02',
        project_id: 1,
        assignee_id: 1,
        created_at: '2026-06-15T08:30:00.000Z',
        updated_at: '2026-06-15T08:30:00.000Z'
      },
      {
        id: 7,
        title: 'Implement validation for email registrations',
        description: 'Prevent incorrect signup profiles with robust server tests.',
        status: 'done',
        priority: 'medium',
        due_date: '2026-06-15',
        project_id: 4,
        assignee_id: 4,
        created_at: '2026-06-10T09:15:00.000Z',
        updated_at: '2026-06-10T09:15:00.000Z'
      }
    ];
    fs.writeFileSync(TASKS_FILE, JSON.stringify(defaultTasks, null, 2));
    logSql('INSERT INTO tasks (title, description, status, priority, due_date, project_id, assignee_id) VALUES (...)', defaultTasks.length);
  }

  if (!fs.existsSync(ACTIVITY_LOGS_FILE)) {
    const defaultActivity: ActivityLog[] = [
      {
        id: 1,
        task_id: 3,
        task_title: 'Deploy staging backend cluster',
        user_id: 2,
        user_name: 'Alex Rivera',
        action_type: 'create',
        timestamp: '2026-06-11T09:00:00.000Z'
      },
      {
        id: 2,
        task_id: 7,
        task_title: 'Implement validation for email registrations',
        user_id: 4,
        user_name: 'Elena Rostov',
        action_type: 'create',
        timestamp: '2026-06-10T09:15:00.000Z'
      }
    ];
    fs.writeFileSync(ACTIVITY_LOGS_FILE, JSON.stringify(defaultActivity, null, 2));
    logSql('INSERT INTO activity_logs (task_id, task_title, user_id, user_name, action_type) VALUES (...)', defaultActivity.length);
  }
}

// Log standard queries nicely to build high pedagogical value SQL activity feed
function logSql(query: string, rowsAffected: number = 0, params?: any[]) {
  const durationMs = Math.round((Math.random() * 1.5 + 0.1) * 100) / 100;
  const newLog: SqlQueryLog = {
    id: Math.random().toString(36).substring(2, 9),
    query,
    params,
    timestamp: new Date().toISOString(),
    durationMs,
    rowsAffected
  };
  sqlQueryLogs = [newLog, ...sqlQueryLogs].slice(0, 50); // Keep last 50 queries
}

// Helper to load files
function readJSONFile<T>(filePath: string): T {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (err) {
    return [] as unknown as T;
  }
}

// Helper to write files
function writeJSONFile<T>(filePath: string, data: T) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Init database tables
initDatabase();

// DATABASE API IMPLEMENTATIONS
export const db = {
  // Query SQL logs
  getSqlQueryLogs(): SqlQueryLog[] {
    return sqlQueryLogs;
  },

  // Clear query logs
  clearSqlQueryLogs() {
    sqlQueryLogs = [];
  },

  // USERS Table
  getUsers(): User[] {
    const startTime = Date.now();
    const users = readJSONFile<User[]>(USERS_FILE);
    const query = 'SELECT * FROM users ORDER BY name ASC;';
    logSql(query, users.length);
    return users;
  },

  createUser(name: string, email: string, role: string, avatar: string): User {
    const users = readJSONFile<User[]>(USERS_FILE);
    const id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser: User = { id, name, email, role, avatar };
    users.push(newUser);
    writeJSONFile(USERS_FILE, users);

    const query = 'INSERT INTO users (name, email, role, avatar) VALUES (?, ?, ?, ?);';
    logSql(query, 1, [name, email, role, avatar]);
    return newUser;
  },

  // PROJECTS Table
  getProjects(): Project[] {
    const projects = readJSONFile<Project[]>(PROJECTS_FILE);
    const query = 'SELECT * FROM projects ORDER BY name ASC;';
    logSql(query, projects.length);
    return projects;
  },

  createProject(name: string, description: string, color: string): Project {
    const projects = readJSONFile<Project[]>(PROJECTS_FILE);
    const id = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
    const newProject: Project = { id, name, description, color };
    projects.push(newProject);
    writeJSONFile(PROJECTS_FILE, projects);

    const query = 'INSERT INTO projects (name, description, color) VALUES (?, ?, ?);';
    logSql(query, 1, [name, description, color]);
    return newProject;
  },

  // TASKS Table (Full Joins using Relational ID structure)
  getTasks(filters?: {
    status?: string;
    priority?: string;
    project_id?: number;
    assignee_id?: number;
    search?: string;
  }): PopulateTask[] {
    const tasks = readJSONFile<Task[]>(TASKS_FILE);
    const users = readJSONFile<User[]>(USERS_FILE);
    const projects = readJSONFile<Project[]>(PROJECTS_FILE);

    // SQL simulation
    let filtered = tasks;
    let queryLines = [
      'SELECT t.*, u.name AS assignee_name, u.email AS assignee_email, u.avatar AS assignee_avatar, p.name AS project_name, p.color AS project_color',
      'FROM tasks t',
      'LEFT JOIN users u ON t.assignee_id = u.id',
      'LEFT JOIN projects p ON t.project_id = p.id',
      'WHERE 1=1'
    ];
    const params: any[] = [];

    if (filters?.status) {
      filtered = filtered.filter(t => t.status === filters.status);
      queryLines.push('AND t.status = ?');
      params.push(filters.status);
    }
    if (filters?.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
      queryLines.push('AND t.priority = ?');
      params.push(filters.priority);
    }
    if (filters?.project_id) {
      filtered = filtered.filter(t => t.project_id === filters.project_id);
      queryLines.push('AND t.project_id = ?');
      params.push(filters.project_id);
    }
    if (filters?.assignee_id) {
      filtered = filtered.filter(t => t.assignee_id === filters.assignee_id);
      queryLines.push('AND t.assignee_id = ?');
      params.push(filters.assignee_id);
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
      queryLines.push('AND (t.title LIKE ? OR t.description LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    queryLines.push('ORDER BY t.due_date ASC;');

    const result: PopulateTask[] = filtered.map(t => {
      const user = users.find(u => u.id === t.assignee_id);
      const project = projects.find(p => p.id === t.project_id);
      return {
        ...t,
        assignee_name: user?.name,
        assignee_email: user?.email,
        assignee_avatar: user?.avatar,
        project_name: project?.name,
        project_color: project?.color
      };
    });

    logSql(queryLines.join('\n'), result.length, params.length > 0 ? params : undefined);
    return result;
  },

  createTask(data: Partial<Task>): PopulateTask {
    const tasks = readJSONFile<Task[]>(TASKS_FILE);
    const users = readJSONFile<User[]>(USERS_FILE);
    const projects = readJSONFile<Project[]>(PROJECTS_FILE);

    const id = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const nowStr = new Date().toISOString();

    const newTask: Task = {
      id,
      title: data.title || 'Untitled Task',
      description: data.description || '',
      status: (data.status as any) || 'todo',
      priority: (data.priority as any) || 'medium',
      due_date: data.due_date || new Date().toISOString().split('T')[0],
      project_id: Number(data.project_id) || 1,
      assignee_id: Number(data.assignee_id) || 1,
      created_at: nowStr,
      updated_at: nowStr
    };

    tasks.push(newTask);
    writeJSONFile(TASKS_FILE, tasks);

    // Log Activity
    const creator = users.find(u => u.id === newTask.assignee_id) || users[0];
    this.createActivityLog(newTask.id, newTask.title, creator?.id || 1, creator?.name || 'System', 'create');

    const query = `
INSERT INTO tasks (title, description, status, priority, due_date, project_id, assignee_id, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `.trim();
    logSql(query, 1, [
      newTask.title,
      newTask.description,
      newTask.status,
      newTask.priority,
      newTask.due_date,
      newTask.project_id,
      newTask.assignee_id,
      newTask.created_at,
      newTask.updated_at
    ]);

    const user = users.find(u => u.id === newTask.assignee_id);
    const project = projects.find(p => p.id === newTask.project_id);
    return {
      ...newTask,
      assignee_name: user?.name,
      assignee_email: user?.email,
      assignee_avatar: user?.avatar,
      project_name: project?.name,
      project_color: project?.color
    };
  },

  updateTask(id: number, data: Partial<Task>): PopulateTask | null {
    const tasks = readJSONFile<Task[]>(TASKS_FILE);
    const users = readJSONFile<User[]>(USERS_FILE);
    const projects = readJSONFile<Project[]>(PROJECTS_FILE);

    const matchIndex = tasks.findIndex(t => t.id === id);
    if (matchIndex === -1) return null;

    const oldTask = tasks[matchIndex];
    const nowStr = new Date().toISOString();

    const updatedTask: Task = {
      ...oldTask,
      ...data,
      id, // ensure ID can't be updated
      updated_at: nowStr
    };

    tasks[matchIndex] = updatedTask;
    writeJSONFile(TASKS_FILE, tasks);

    // Trace modifications for Activity Log
    let logAction: 'update_status' | 'update_task' = 'update_task';
    let labelOld = '';
    let labelNew = '';

    if (data.status && data.status !== oldTask.status) {
      logAction = 'update_status';
      labelOld = oldTask.status;
      labelNew = data.status;
    } else {
      labelOld = oldTask.title;
      labelNew = updatedTask.title;
    }

    const modifier = users.find(u => u.id === updatedTask.assignee_id) || users[0];
    this.createActivityLog(id, updatedTask.title, modifier?.id || 1, modifier?.name || 'System', logAction, labelOld, labelNew);

    const updateFields = Object.keys(data).filter(key => key !== 'id');
    const placeholders = updateFields.map(field => `${field} = ?`).join(', ');
    const params = updateFields.map(field => (data as any)[field]);
    params.push(id);

    const query = `UPDATE tasks SET ${placeholders}, updated_at = NOW() WHERE id = ?;`;
    logSql(query, 1, params);

    const user = users.find(u => u.id === updatedTask.assignee_id);
    const project = projects.find(p => p.id === updatedTask.project_id);

    return {
      ...updatedTask,
      assignee_name: user?.name,
      assignee_email: user?.email,
      assignee_avatar: user?.avatar,
      project_name: project?.name,
      project_color: project?.color
    };
  },

  deleteTask(id: number): boolean {
    const tasks = readJSONFile<Task[]>(TASKS_FILE);
    const users = readJSONFile<User[]>(USERS_FILE);

    const targetIndex = tasks.findIndex(t => t.id === id);
    if (targetIndex === -1) return false;

    const task = tasks[targetIndex];
    tasks.splice(targetIndex, 1);
    writeJSONFile(TASKS_FILE, tasks);

    // Log deletion
    this.createActivityLog(id, task.title, 1, 'Sarah Jenkins', 'delete', task.title);

    const query = 'DELETE FROM tasks WHERE id = ?;';
    logSql(query, 1, [id]);
    return true;
  },

  // ACTIVITY LOGS Table
  getActivityLogs(): ActivityLog[] {
    const logs = readJSONFile<ActivityLog[]>(ACTIVITY_LOGS_FILE);
    const query = 'SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 30;';
    logSql(query, logs.length);
    return logs;
  },

  createActivityLog(
    task_id: number,
    task_title: string,
    user_id: number,
    user_name: string,
    action_type: 'create' | 'update_status' | 'update_task' | 'delete',
    old_value?: string,
    new_value?: string
  ): ActivityLog {
    const logs = readJSONFile<ActivityLog[]>(ACTIVITY_LOGS_FILE);
    const id = logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1;
    const newLog: ActivityLog = {
      id,
      task_id,
      task_title,
      user_id,
      user_name,
      action_type,
      old_value,
      new_value,
      timestamp: new Date().toISOString()
    };
    logs.push(newLog);
    writeJSONFile(ACTIVITY_LOGS_FILE, logs.slice(-100)); // cap at 100 entries

    // Not logging inner insert of activity to avoid infinite logger loops
    return newLog;
  },

  // Dashboard Aggregates simulating MySQL GROUP BY queries
  getDashboardStats() {
    const tasks = readJSONFile<Task[]>(TASKS_FILE);
    
    // Total numbers
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const done = tasks.filter(t => t.status === 'done').length;

    // Overdue tasks
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter(t => t.status !== 'done' && t.due_date < todayStr).length;

    // Build standard MySQL GROUP BY select logs for pedagogical visuals
    const queries = [
      'SELECT status, COUNT(*) as cnt FROM tasks GROUP BY status;',
      `SELECT COUNT(*) FROM tasks WHERE status != 'done' AND due_date < '${todayStr}';`
    ];
    queries.forEach(q => logSql(q, 1));

    return { total, todo, inProgress, review, done, overdue };
  }
};
