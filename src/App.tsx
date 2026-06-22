import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Database,
  Terminal,
  User as UserIcon,
  Folder,
  Calendar,
  Search,
  Layers,
  Grid,
  PlusCircle,
  RefreshCw,
  SlidersHorizontal,
  Activity,
  CheckSquare,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { User, Project, Task, PopulateTask, ActivityLog, SqlQueryLog } from './types';
import DatabaseConsole from './components/DatabaseConsole';

export default function App() {
  // DB States
  const [tasks, setTasks] = useState<PopulateTask[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [sqlLogs, setSqlLogs] = useState<SqlQueryLog[]>([]);
  const [stats, setStats] = useState({ total: 0, todo: 0, inInProgress: 0, review: 0, done: 0, overdue: 0 });

  // UI / Filter States
  const [currentView, setCurrentView] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');

  // Modals & Forms State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PopulateTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: new Date().toISOString().split('T')[0],
    project_id: '',
    assignee_id: ''
  });

  // Entity Drawers (Project & User quick insert)
  const [isEntityDrawerOpen, setIsEntityDrawerOpen] = useState(false);
  const [entityType, setEntityType] = useState<'project' | 'user'>('project');
  const [projectForm, setProjectForm] = useState({ name: '', description: '', color: '#3b82f6' });
  const [userForm, setUserForm] = useState({ name: '', email: '', role: '', avatar: '' });

  // Web Matrix Table Column Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortColumn === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
        showToast(`SQL ORDER BY: Sorting tasks by ${field.toUpperCase()} in descending order`);
      } else {
        setSortColumn(null);
        setSortDirection('asc');
        showToast(`SQL ORDER BY: Reset sorting order of tasks`);
      }
    } else {
      setSortColumn(field);
      setSortDirection('asc');
      showToast(`SQL ORDER BY: Sorting tasks by ${field.toUpperCase()} in ascending order`);
    }
  };

  const sortedTasks = useMemo(() => {
    if (!sortColumn) return tasks;
    return [...tasks].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortColumn) {
        case 'id':
          return sortDirection === 'asc' ? a.id - b.id : b.id - a.id;
        case 'title':
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
          break;
        case 'project':
          valA = (a.project_name || '').toLowerCase();
          valB = (b.project_name || '').toLowerCase();
          break;
        case 'assignee':
          valA = (a.assignee_name || '').toLowerCase();
          valB = (b.assignee_name || '').toLowerCase();
          break;
        case 'priority': {
          const priorityOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };
          const pA = priorityOrder[a.priority] || 0;
          const pB = priorityOrder[b.priority] || 0;
          return sortDirection === 'asc' ? pA - pB : pB - pA;
        }
        case 'due_date':
          valA = a.due_date || '';
          valB = b.due_date || '';
          break;
        case 'status': {
          const statusOrder: Record<string, number> = { todo: 1, in_progress: 2, review: 3, done: 4 };
          const sA = statusOrder[a.status] || 0;
          const sB = statusOrder[b.status] || 0;
          return sortDirection === 'asc' ? sA - sB : sB - sA;
        }
        default:
          return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortColumn, sortDirection]);

  const renderSortIcon = (field: string) => {
    if (sortColumn !== field) {
      return (
        <span className="inline-block text-slate-300 group-hover:text-slate-500 transition-colors">
          <ChevronDown className="w-3 h-3 opacity-40 group-hover:opacity-100" />
        </span>
      );
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-600" />
    );
  };

  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch initial relational datasets from MySQL API Express Server
  const fetchAllData = async () => {
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.append('status', statusFilter);
      if (priorityFilter) qs.append('priority', priorityFilter);
      if (projectFilter) qs.append('project_id', projectFilter);
      if (assigneeFilter) qs.append('assignee_id', assigneeFilter);
      if (searchQuery) qs.append('search', searchQuery);

      const [tasksRes, usersRes, projectsRes, logsRes, sqlRes, statsRes] = await Promise.all([
        fetch(`/api/tasks?${qs.toString()}`).then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/activity_logs').then(r => r.json()),
        fetch('/api/sql_logs').then(r => r.json()),
        fetch('/api/stats').then(r => r.json())
      ]);

      if (Array.isArray(tasksRes)) setTasks(tasksRes);
      if (Array.isArray(usersRes)) setUsers(usersRes);
      if (Array.isArray(projectsRes)) {
        setProjects(projectsRes);
        // Set default project ID in tasks form
        if (projectsRes.length > 0 && !taskForm.project_id) {
          setTaskForm(f => ({ ...f, project_id: String(projectsRes[0].id) }));
        }
      }
      if (Array.isArray(logsRes)) setActivityLogs(logsRes);
      if (Array.isArray(sqlRes)) setSqlLogs(sqlRes);
      if (statsRes && !statsRes.error) {
        setStats({
          total: statsRes.total || 0,
          todo: statsRes.todo || 0,
          inInProgress: statsRes.in_progress || statsRes.inProgress || 0,
          review: statsRes.review || 0,
          done: statsRes.done || 0,
          overdue: statsRes.overdue || 0
        });
      }
    } catch (err) {
      console.error('Error synchronizing database dataset:', err);
      showToast('Database server synchronization failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [statusFilter, priorityFilter, projectFilter, assigneeFilter, searchQuery]);

  // Sync users list to auto-select in task forms
  useEffect(() => {
    if (users.length > 0 && !taskForm.assignee_id) {
      setTaskForm(f => ({ ...f, assignee_id: String(users[0].id) }));
    }
  }, [users]);

  // Toast notifier helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Create or Update task handler (Simulating INSERT / UPDATE statements on DB)
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';

      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        status: taskForm.status,
        priority: taskForm.priority,
        due_date: taskForm.due_date,
        project_id: Number(taskForm.project_id),
        assignee_id: Number(taskForm.assignee_id)
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Syntax exception in database execution');
      }

      showToast(
        editingTask 
          ? `UPDATED: SQL UPDATE executed for task ID ${editingTask.id}` 
          : 'CREATED: SQL INSERT completed for new task row.'
      );
      
      // Close modal & reset
      setIsTaskModalOpen(false);
      setEditingTask(null);
      setTaskForm({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        due_date: new Date().toISOString().split('T')[0],
        project_id: projects[0]?.id ? String(projects[0].id) : '',
        assignee_id: users[0]?.id ? String(users[0].id) : ''
      });

      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit database payload.', 'error');
    }
  };

  // Delete task row (Simulating SQL "DELETE FROM tasks WHERE id = ?")
  const handleDeleteTask = async (id: number) => {
    if (!window.confirm('Determine database action: Do you want to DELETE this task record permanently?')) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Database server was unable to execute task deletion.');
      
      showToast(`DELETED: PERMANENT ROW DELETION execution completed for ID ${id}`);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Direct Status Update for quick drag-drop or rapid Kanban click status promote
  const handlePatchStatus = async (id: number, newStatus: Task['status']) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Could not update status');
      
      showToast(`SUCCESS: Promoted Task ID ${id} is now updated to status '${newStatus}'`);
      fetchAllData();
    } catch (err: any) {
      showToast('Error updating status', 'error');
    }
  };

  // Quick Insertion of secondary tables (INSERT INTO users / INSERT INTO projects)
  const handleQuickEntitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (entityType === 'project') {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectForm)
        });
        if (!res.ok) throw new Error('Could not create project');
        showToast('SQL INSERT INTO projects executed standard table row successfully');
        setProjectForm({ name: '', description: '', color: '#3b82f6' });
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userForm)
        });
        if (!res.ok) throw new Error('Could not create user');
        showToast('SQL INSERT INTO users executed standard user profile successfully');
        setUserForm({ name: '', email: '', role: '', avatar: '' });
      }

      setIsEntityDrawerOpen(false);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Pre-populate modal form for editing
  const openEditTaskModal = (task: PopulateTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      project_id: String(task.project_id),
      assignee_id: String(task.assignee_id)
    });
    setIsTaskModalOpen(true);
  };

  const clearDatabaseLogs = async () => {
    try {
      await fetch('/api/sql_logs/clear', { method: 'POST' });
      setSqlLogs([]);
      showToast('MySQL Log buffer cleared on local-node mock server.');
    } catch (err) {
      showToast('Could not clear server SQL logs', 'error');
    }
  };

  // Reset filter variables easily
  const resetFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setProjectFilter('');
    setAssigneeFilter('');
    setSearchQuery('');
    showToast('Reset matching active relational task filters.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 pb-16">
      {/* Toast Notification Box */}
      {notification && (
        <div 
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border animate-fade-in transition-all ${
            notification.type === 'success' 
              ? 'bg-slate-900 text-white border-emerald-500/25' 
              : 'bg-red-900 text-white border-red-500/25'
          }`}
          id="toast-notifier"
        >
          <div className="p-1 rounded-full bg-emerald-500 text-white">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-slate-300">SYSTEM RESPONSE</p>
            <p className="text-sm font-semibold">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Corporate Dashboard Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40" id="main-app-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Title & Slogan */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                TaskForce DB <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold border border-blue-100">CJS Fullstack Host</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Relational schema engine powered by Node Express & MySQL logs</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => {
                setEntityType('project');
                setIsEntityDrawerOpen(true);
              }}
              className="bg-white text-slate-700 hover:text-slate-900 border border-slate-200 px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-slate-50 transition"
              id="quick-add-project-btn"
            >
              <Folder className="w-4 h-4 text-blue-500" />
              Add Project (FK)
            </button>

            <button
              onClick={() => {
                setEntityType('user');
                setIsEntityDrawerOpen(true);
              }}
              className="bg-white text-slate-700 hover:text-slate-900 border border-slate-200 px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-slate-50 transition"
              id="quick-add-user-btn"
            >
              <Users className="w-4 h-4 text-purple-500" />
              Add User (FK)
            </button>

            <button
              onClick={() => {
                setEditingTask(null);
                setTaskForm({
                  title: '',
                  description: '',
                  status: 'todo',
                  priority: 'medium',
                  due_date: new Date().toISOString().split('T')[0],
                  project_id: projects[0]?.id ? String(projects[0].id) : '',
                  assignee_id: users[0]?.id ? String(users[0].id) : ''
                });
                setIsTaskModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition duration-150 shadow-sm active:scale-[0.98]"
              id="create_task_button"
            >
              <Plus className="w-4 h-4" />
              New SQL Task Row
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8" id="dashboard-content-grid">
        {/* Metric Aggregates Row */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="aggregates-ribbon">
          <button 
            onClick={() => setStatusFilter('')}
            className={`p-4 bg-white border border-slate-100 rounded-2xl text-left shadow-2xs hover:shadow-sm transition ${!statusFilter ? 'ring-2 ring-blue-500/50' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-500 font-bold tracking-tight">Total SQL Rows</span>
              <span className="p-1 bg-slate-50 text-slate-500 rounded-lg"><Database className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-bold font-display text-slate-900">{stats.total}</p>
            <p className="text-[10px] text-slate-400 mt-1">tasks table count</p>
          </button>

          <button 
            onClick={() => setStatusFilter('todo')}
            className={`p-4 bg-white border border-slate-100 rounded-2xl text-left shadow-2xs hover:shadow-sm transition ${statusFilter === 'todo' ? 'ring-2 ring-slate-800' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-500 font-bold tracking-tight">To-Do Backlog</span>
              <span className="p-1 bg-slate-50 text-slate-500 rounded-lg"><CheckSquare className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-bold font-display text-slate-950">{stats.todo}</p>
            <p className="text-[10px] text-slate-400 mt-1">status = 'todo'</p>
          </button>

          <button 
            onClick={() => setStatusFilter('in_progress')}
            className={`p-4 bg-white border border-slate-100 rounded-2xl text-left shadow-2xs hover:shadow-sm transition ${statusFilter === 'in_progress' ? 'ring-2 ring-blue-600' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-500 font-bold tracking-tight">In Progress</span>
              <span className="p-1 bg-blue-50 text-blue-600 rounded-lg"><Clock className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-bold font-display text-blue-600">{stats.inInProgress}</p>
            <p className="text-[10px] text-slate-400 mt-1">status = &apos;in_progress&apos;</p>
          </button>

          <button 
            onClick={() => setStatusFilter('review')}
            className={`p-4 bg-white border border-slate-100 rounded-2xl text-left shadow-2xs hover:shadow-sm transition ${statusFilter === 'review' ? 'ring-2 ring-purple-600' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-500 font-bold tracking-tight">QA Review</span>
              <span className="p-1 bg-purple-50 text-purple-600 rounded-lg"><Activity className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-bold font-display text-purple-600">{stats.review}</p>
            <p className="text-[10px] text-slate-400 mt-1">status = 'review'</p>
          </button>

          <button 
            onClick={() => setStatusFilter('done')}
            className={`p-4 bg-white border border-slate-100 rounded-2xl text-left col-span-2 lg:col-span-1 shadow-2xs hover:shadow-sm transition ${statusFilter === 'done' ? 'ring-2 ring-green-600' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-500 font-bold tracking-tight font-sans">Done</span>
              <span className="p-1 bg-green-50 text-green-600 rounded-lg"><CheckCircle className="w-3.5 h-3.5" /></span>
            </div>
            <p className="text-2xl font-bold font-display text-green-600">{stats.done}</p>
            <p className="text-[10px] text-slate-400 mt-1">status = 'done'</p>
          </button>
        </section>

        {/* Dynamic Filters & Controls hub */}
        <section className="bg-white border border-slate-100 rounded-2xl p-6 shadow-2xs" id="interactive-db-filters">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <h3 className="font-display text-sm font-bold text-slate-800">Relational SQL Row Filter Options</h3>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    currentView === 'kanban' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  Kanban Columns
                </button>
                <button
                  onClick={() => setCurrentView('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    currentView === 'table' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  MySQL Row Matrix Table
                </button>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* Search query input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="LIKE '%search_term%'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs font-mono pl-9 pr-3 py-2.5 rounded-xl outline-hidden transition"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs font-semibold px-3 py-2.5 rounded-xl focus:bg-white outline-hidden transition"
                >
                  <option value="">WHERE status = &apos;*&apos;</option>
                  <option value="todo">WHERE status = &apos;todo&apos;</option>
                  <option value="in_progress">WHERE status = &apos;in_progress&apos;</option>
                  <option value="review">WHERE status = &apos;review&apos;</option>
                  <option value="done">WHERE status = &apos;done&apos;</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs font-semibold px-3 py-2.5 rounded-xl focus:bg-white outline-hidden transition"
                >
                  <option value="">WHERE priority = &apos;*&apos;</option>
                  <option value="low">WHERE priority = &apos;low&apos;</option>
                  <option value="medium">WHERE priority = &apos;medium&apos;</option>
                  <option value="high">WHERE priority = &apos;high&apos;</option>
                </select>
              </div>

              {/* Project Filter (Join Key) */}
              <div>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs font-semibold px-3 py-2.5 rounded-xl focus:bg-white outline-hidden transition"
                >
                  <option value="">WHERE project_id = &apos;*&apos;</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      Project FK: {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee Filter (Join Key) */}
              <div>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs font-semibold px-3 py-2.5 rounded-xl focus:bg-white outline-hidden transition"
                >
                  <option value="">WHERE assignee_id = &apos;*&apos;</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      Assignee FK: {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active clear options info */}
            {(statusFilter || priorityFilter || projectFilter || assigneeFilter || searchQuery) && (
              <div className="flex justify-between items-center bg-blue-50/50 hover:bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 transition animate-fade-in">
                <span className="text-[11px] text-blue-700 font-mono">
                  Applied Active Query Filters: {
                    [
                      statusFilter && `status='${statusFilter}'`,
                      priorityFilter && `priority='${priorityFilter}'`,
                      projectFilter && `project_id=${projectFilter}`,
                      assigneeFilter && `assignee_id=${assigneeFilter}`,
                      searchQuery && `title LIKE '%${searchQuery}%'`
                    ].filter(Boolean).join(' AND ')
                  }
                </span>
                <button
                  onClick={resetFilters}
                  className="text-xs font-bold text-red-600 hover:text-red-800 transition"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white border border-slate-150 rounded-2xl">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold">Synchronizing with underlying MySQL DB Server...</p>
          </div>
        )}

        {/* WORKSPACE VIEWS */}
        {!loading && (
          <div id="dashboard-results-container">
            {currentView === 'kanban' ? (
              /* Kanban Columns Grid */
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="kanban-workflow-matrix">
                {/* Column lists configurations */}
                {(['todo', 'in_progress', 'review', 'done'] as const).map(colStatus => {
                  const filteredList = tasks.filter(t => t.status === colStatus);
                  const statusColors = {
                    todo: { text: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-200', title: 'To-Do backlog' },
                    in_progress: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', title: 'In Progress' },
                    review: { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', title: 'QA Review' },
                    done: { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', title: 'Completed' }
                  };
                  return (
                    <div 
                      key={colStatus} 
                      className="bg-slate-100/50 border border-slate-200/40 rounded-2xl p-4 flex flex-col min-h-[500px]"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-200/55">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            colStatus === 'todo' ? 'bg-slate-400' :
                            colStatus === 'in_progress' ? 'bg-blue-500' :
                            colStatus === 'review' ? 'bg-purple-500' : 'bg-green-500'
                          }`}></span>
                          <h4 className="font-display text-sm font-bold text-slate-800 capitalize">{statusColors[colStatus].title}</h4>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                          Rows: {filteredList.length}
                        </span>
                      </div>

                      {/* Task Cards Stack */}
                      <div className="space-y-3.5 flex-1 overflow-auto max-h-[600px] pr-1">
                        {filteredList.map(task => (
                          <div 
                            key={task.id} 
                            className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs hover:shadow-xs transition group relative hover:border-slate-300"
                            id={`task-card-row-${task.id}`}
                          >
                            {/* Project Color Accent bar */}
                            <div 
                              className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" 
                              style={{ backgroundColor: task.project_color || '#3b82f6' }}
                            />

                            <div className="space-y-3 pt-1">
                              {/* Non-overlapping Tags & Action Ribbon */}
                              <div className="flex items-center justify-between gap-1.5">
                                <span 
                                  className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md border truncate max-w-[110px]"
                                  style={{ 
                                    borderColor: `${task.project_color}33`, 
                                    color: task.project_color || '#3b82f6', 
                                    backgroundColor: `${task.project_color}0a` 
                                  }}
                                  title={task.project_name || 'System Project'}
                                >
                                  {task.project_name || 'System Project'}
                                </span>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Edit/Delete visible on hover, structurally positioned next to tags to completely avoid overlap */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/95 pl-1.5 rounded-sm">
                                    <button 
                                      onClick={() => openEditTaskModal(task)}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="Edit task row values"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Delete task row permanently"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <span className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                    task.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-200' :
                                    task.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                              </div>

                              {/* Title */}
                              <div>
                                <h5 className="font-display font-medium text-slate-800 text-sm group-hover:text-blue-600 transition leading-snug">
                                  {task.title}
                                </h5>
                                {task.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Footer assignee & due-date */}
                              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  {task.assignee_avatar ? (
                                    <img 
                                      src={task.assignee_avatar} 
                                      alt="avatar" 
                                      className="w-5 h-5 rounded-full object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 uppercase border border-slate-200">
                                      {task.assignee_name?.substring(0, 2) || 'NA'}
                                    </div>
                                  )}
                                  <span className="text-slate-600 font-semibold">{task.assignee_name || 'Unassigned'}</span>
                                </div>

                                <div className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  <span className="font-mono">{task.due_date}</span>
                                </div>
                              </div>

                              {/* Sleek Enterprise Status Selector Dropdown */}
                              <div className="flex justify-between items-center text-[10px] bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-2">
                                <span className="font-sans text-[10px] font-medium text-slate-500">Update Status:</span>
                                <select
                                  value={task.status}
                                  onChange={(e) => handlePatchStatus(task.id, e.target.value as any)}
                                  className="bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 py-0.5 px-1 rounded cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500/50"
                                >
                                  <option value="todo">todo</option>
                                  <option value="in_progress">in_progress</option>
                                  <option value="review">review</option>
                                  <option value="done">done</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}

                        {filteredList.length === 0 && (
                          <div className="border border-dashed border-slate-200 rounded-xl py-10 text-center text-slate-400 flex flex-col items-center justify-center gap-1">
                            <Database className="w-6 h-6 text-slate-300" />
                            <p className="text-xs font-semibold">Zero matching tasks</p>
                            <p className="text-[10px]">where status = &apos;{colStatus}&apos;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* DENSE RELATIONAL SQL ROW MATRIX SPREADSHEET */
              <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-2xs" id="mysql-live-table-matrix">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                      Query SELECT * FROM tasks_joined;
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Showing {tasks.length} live records</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left divide-y divide-slate-150">
                    <thead className="bg-slate-50 font-mono text-slate-500 uppercase tracking-wider select-none">
                      <tr>
                        <th 
                          onClick={() => handleSort('id')} 
                          className="px-6 py-3.5 text-center font-bold w-20 cursor-pointer hover:bg-slate-100/80 transition duration-150 group"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            ID {renderSortIcon('id')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('title')} 
                          className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/80 transition duration-150 group"
                        >
                          <div className="flex items-center gap-1.5">
                            TITLE & DESCRIPTION {renderSortIcon('title')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('project')} 
                          className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/80 transition duration-150 group"
                        >
                          <div className="flex items-center gap-1.5">
                            RELATIONAL PROJECT {renderSortIcon('project')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('assignee')} 
                          className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/80 transition duration-150 group"
                        >
                          <div className="flex items-center gap-1.5">
                            ASSIGNEE USER {renderSortIcon('assignee')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('priority')} 
                          className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/80 transition duration-150 group"
                        >
                          <div className="flex items-center gap-1.5">
                            PRIORITY {renderSortIcon('priority')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('due_date')} 
                          className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/80 transition duration-150 group"
                        >
                          <div className="flex items-center gap-1.5">
                            DUE_DATE {renderSortIcon('due_date')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('status')} 
                          className="px-6 py-3.5 font-bold cursor-pointer hover:bg-slate-100/80 transition duration-150 group"
                        >
                          <div className="flex items-center gap-1.5">
                            STATUS {renderSortIcon('status')}
                          </div>
                        </th>
                        <th className="px-6 py-3.5 text-right font-bold">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {sortedTasks.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-6 py-4 font-mono font-bold text-blue-600 text-center bg-slate-50/30">{t.id}</td>
                          <td className="px-6 py-4 max-w-sm">
                            <p className="font-semibold text-slate-900">{t.title}</p>
                            {t.description && (
                              <p className="text-slate-500 text-[11px] truncate mt-0.5">{t.description}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: t.project_color || '#3b82f6' }}
                              />
                              <span className="font-medium text-slate-800">{t.project_name}</span>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">FK_{t.project_id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {t.assignee_avatar && (
                                <img src={t.assignee_avatar} alt="avatar" className="w-5 h-5 rounded-full object-cover border border-slate-150" />
                              )}
                              <div>
                                <p className="font-medium text-slate-800">{t.assignee_name}</p>
                                <span className="text-[10px] font-mono text-slate-400">FK_{t.assignee_id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              t.priority === 'high' ? 'bg-red-50 text-red-700 border border-red-200' :
                              t.priority === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-slate-600">{t.due_date}</td>
                          <td className="px-6 py-4">
                            <select
                              value={t.status}
                              onChange={(e) => handlePatchStatus(t.id, e.target.value as any)}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:outline-hidden text-xs font-semibold px-2 py-1 rounded"
                            >
                              <option value="todo">todo</option>
                              <option value="in_progress">in_progress</option>
                              <option value="review">review</option>
                              <option value="done">done</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 text-slate-400">
                              <button 
                                onClick={() => openEditTaskModal(t)}
                                className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit Row"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteTask(t.id)}
                                className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete Task permanent"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {sortedTasks.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-16 text-slate-400 italic">
                            No records found under the specified database query filters. Try resetting matching rules.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Database Console and Audit Logs Section */}
        <section className="mt-12 space-y-8" id="under-the-hood-db-audit">
          <DatabaseConsole
            sqlLogs={sqlLogs}
            onRefreshLogs={() => fetchAllData()}
            onClearLogs={clearDatabaseLogs}
            users={users}
            projects={projects}
            tasks={tasks}
            activityLogs={activityLogs}
          />
        </section>
      </main>

      {/* MODAL WINDOW FOR TASK ROW CREATE/UPDATE */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 transition-opacity" aria-hidden="true" onClick={() => setIsTaskModalOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-middle bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-100">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
                <h3 className="font-display font-bold text-sm tracking-tight flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  {editingTask ? `SQL UPDATE: Task #${editingTask.id}` : 'SQL INSERT: Add New Task Row'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="text-slate-400 hover:text-white transition font-mono text-sm uppercase font-bold"
                >
                  ✕ close
                </button>
              </div>

              <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter explicit visual task details..."
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-hidden transition"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Task Description</label>
                  <textarea
                    placeholder="Describe specific tasks parameters or requirements..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-hidden transition min-h-[70px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Status selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Status (ENUM)</label>
                    <select
                      value={taskForm.status}
                      onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-hidden transition"
                    >
                      <option value="todo">todo (backlog)</option>
                      <option value="in_progress">in_progress</option>
                      <option value="review">review (QA)</option>
                      <option value="done">done (complete)</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Priority (ENUM)</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-hidden transition"
                    >
                      <option value="low">low priority</option>
                      <option value="medium">medium priority</option>
                      <option value="high">high priority</option>
                    </select>
                  </div>
                </div>

                {/* Relational Foreign Key project_id mapping */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Relational Project mapping (FOREIGN KEY project_id)
                  </label>
                  <select
                    value={taskForm.project_id}
                    required
                    onChange={(e) => setTaskForm({ ...taskForm, project_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-hidden transition"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        id: {p.id} &mdash; Project: {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Relational Foreign Key assignee_id mapping */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Relational Assignee mapping (FOREIGN KEY assignee_id)
                  </label>
                  <select
                    value={taskForm.assignee_id}
                    required
                    onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-hidden transition"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        id: {u.id} &mdash; User: {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-hidden transition"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60 font-mono text-[9.5px] text-slate-500">
                  <p className="font-bold text-slate-700 uppercase mb-1">Estimated SQL Execution Output:</p>
                  {editingTask ? (
                    <code className="block break-all text-blue-700 font-bold font-mono">
                      UPDATE tasks SET title=&apos;{taskForm.title || '...'}&apos;, status=&apos;{taskForm.status}&apos;, project_id={taskForm.project_id || '1'}, assignee_id={taskForm.assignee_id || '1'} WHERE id={editingTask.id};
                    </code>
                  ) : (
                    <code className="block break-all text-emerald-700 font-bold font-mono">
                      INSERT INTO tasks (title, description, status, priority, due_date, project_id, assignee_id) VALUES (&apos;{taskForm.title || '...'}&apos;, &apos;{taskForm.description || ''}&apos;, &apos;{taskForm.status}&apos;, &apos;{taskForm.priority}&apos;, &apos;{taskForm.due_date}&apos;, {taskForm.project_id || '1'}, {taskForm.assignee_id || '1'});
                    </code>
                  )}
                </div>

                {/* Submit row button */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTaskModalOpen(false);
                      setEditingTask(null);
                    }}
                    className="bg-slate-150 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold rounded-xl transition"
                  >
                    Cancel Action
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    EXECUTE TRANSACTION
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ENTITY INSERT DRAWER (ADD USER OR PROJECT) */}
      {isEntityDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 transition-opacity" onClick={() => setIsEntityDrawerOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-middle bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full border border-slate-100">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
                <h3 className="font-display font-bold text-sm tracking-tight flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  {entityType === 'project' ? 'SQL INSERT: Add Relational Project' : 'SQL INSERT: Add Relational User'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEntityDrawerOpen(false)}
                  className="text-slate-400 hover:text-white transition font-mono text-sm bg-none border-0"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleQuickEntitySubmit} className="p-6 space-y-4">
                {entityType === 'project' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Project Name (unique) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Marketing Revamp"
                        value={projectForm.name}
                        onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-hidden transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Short Description</label>
                      <input
                        type="text"
                        placeholder="e.g., Overview overhaul guidelines"
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-hidden transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 font-sans">Project Identification Accent Color</label>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          value={projectForm.color}
                          onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                          className="w-10 h-10 rounded border border-slate-200 p-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={projectForm.color}
                          onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:bg-white outline-hidden outline-0"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-[9.5px] text-emerald-700">
                      <code>INSERT INTO projects (name, description, color) VALUES (&apos;{projectForm.name || '?'}&apos;, &apos;{projectForm.description || ''}&apos;, &apos;{projectForm.color}&apos;);</code>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Employee Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Jennifer Aniston"
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-hidden transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Company Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g., jen.a@company.com"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-hidden transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Employee Role/Rank *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Frontend Specialist"
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-hidden transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Optional Avatar URL</label>
                      <input
                        type="text"
                        placeholder="e.g., https://unsplash.com/..."
                        value={userForm.avatar}
                        onChange={(e) => setUserForm({ ...userForm, avatar: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-hidden transition"
                      />
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-[9.5px] text-emerald-700">
                      <code>INSERT INTO users (name, email, role, avatar) VALUES (&apos;{userForm.name || '?'}&apos;, &apos;{userForm.email || '?'}&apos;, &apos;{userForm.role || '?'}&apos;, ...);</code>
                    </div>
                  </>
                )}

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEntityDrawerOpen(false)}
                    className="bg-slate-150 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    Run Table INSERT
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
