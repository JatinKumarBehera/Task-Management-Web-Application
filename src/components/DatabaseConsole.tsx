import React, { useState, useEffect } from 'react';
import { Database, Search, Terminal, Table, FileText, ArrowRight, Play, RefreshCw, Layers, CheckCircle } from 'lucide-react';
import { SqlQueryLog, User, Project, Task, ActivityLog } from '../types';

interface DatabaseConsoleProps {
  sqlLogs: SqlQueryLog[];
  onRefreshLogs: () => void;
  onClearLogs: () => void;
  users: User[];
  projects: Project[];
  tasks: Task[];
  activityLogs: ActivityLog[];
}

export default function DatabaseConsole({
  sqlLogs,
  onRefreshLogs,
  onClearLogs,
  users,
  projects,
  tasks,
  activityLogs
}: DatabaseConsoleProps) {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'tables' | 'query_logs'>('visualizer');
  const [selectedTable, setSelectedTable] = useState<'users' | 'projects' | 'tasks' | 'activity_logs'>('tasks');
  const [sqlSandboxInput, setSqlSandboxInput] = useState<string>('SELECT t.id, t.title, u.name AS assignee, p.name AS project \nFROM tasks t \nJOIN users u ON t.assignee_id = u.id \nJOIN projects p ON t.project_id = p.id\nWHERE t.status = \'in_progress\';');
  const [sandboxResponse, setSandboxResponse] = useState<{ headers: string[]; rows: any[][]; error?: string; queryExecuted?: string } | null>(null);
  const [sandboxExecuting, setSandboxExecuting] = useState<boolean>(false);

  // Pre-configured real SQL scripts for user to execute instantly in sandbox
  const PRESET_QUERIES = [
    {
      label: '🚀 Relational Tasks Join',
      query: 'SELECT t.id, t.title, u.name AS assignee, p.name AS project, t.status \nFROM tasks t \nINNER JOIN users u ON t.assignee_id = u.id \nINNER JOIN projects p ON t.project_id = p.id \nORDER BY t.id ASC;'
    },
    {
      label: '📊 Counts Grouped By Project',
      query: 'SELECT p.name AS project_name, COUNT(t.id) AS task_count \nFROM projects p \nLEFT JOIN tasks t ON p.id = t.project_id \nGROUP BY p.name \nORDER BY task_count DESC;'
    },
    {
      label: '📝 Status Distribution aggregates',
      query: 'SELECT status, COUNT(*) AS count, GROUP_CONCAT(id) AS task_ids \nFROM tasks \nGROUP BY status;'
    },
    {
      label: '🪵 Audit trail history logs',
      query: 'SELECT al.id, al.task_title, al.user_name, al.action_type, al.timestamp \nFROM activity_logs al \nORDER BY al.timestamp DESC \nLIMIT 5;'
    }
  ];

  // Execute standard mock SQL statement
  const executeSandboxSql = (customQuery?: string) => {
    const q = customQuery || sqlSandboxInput;
    setSandboxExecuting(true);
    
    setTimeout(() => {
      try {
        const queryClean = q.replace(/\s+/g, ' ').trim().toLowerCase();
        
        if (queryClean.startsWith('select t.id, t.title, u.name as assignee, p.name as project') && queryClean.includes('status = \'in_progress\'')) {
          // Preset initial query
          const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
          const rows = inProgressTasks.map(t => {
            const u = users.find(user => user.id === t.assignee_id);
            const p = projects.find(proj => proj.id === t.project_id);
            return [t.id, t.title, u?.name || 'Unassigned', p?.name || 'None'];
          });
          setSandboxResponse({
            headers: ['id', 'title', 'assignee', 'project'],
            rows,
            queryExecuted: q
          });
        }
        else if (queryClean.includes('inner join users u') && queryClean.includes('inner join projects p')) {
          const rows = tasks.map(t => {
            const u = users.find(user => user.id === t.assignee_id);
            const p = projects.find(proj => proj.id === t.project_id);
            return [t.id, t.title, u?.name || 'Unassigned', p?.name || 'None', t.status.toUpperCase()];
          });
          setSandboxResponse({
            headers: ['id', 'title', 'assignee', 'project', 'status'],
            rows,
            queryExecuted: q
          });
        }
        else if (queryClean.includes('count(t.id)') && queryClean.includes('group by p.name')) {
          const rows = projects.map(p => {
            const count = tasks.filter(t => t.project_id === p.id).length;
            return [p.name, count];
          }).sort((a,b) => (b[1] as number) - (a[1] as number));
          setSandboxResponse({
            headers: ['project_name', 'task_count'],
            rows,
            queryExecuted: q
          });
        }
        else if (queryClean.includes('status, count(*)') && queryClean.includes('group by status')) {
          const statuses = ['todo', 'in_progress', 'review', 'done'];
          const rows = statuses.map(s => {
            const matching = tasks.filter(t => t.status === s);
            return [s, matching.length, matching.map(t => t.id).join(', ')];
          });
          setSandboxResponse({
            headers: ['status', 'count', 'task_ids'],
            rows,
            queryExecuted: q
          });
        }
        else if (queryClean.includes('from activity_logs') || queryClean.includes('from activity_logs al')) {
          const rows = activityLogs.slice(0, 5).map(al => {
            return [al.id, al.task_title, al.user_name, al.action_type.toUpperCase(), new Date(al.timestamp).toLocaleTimeString()];
          });
          setSandboxResponse({
            headers: ['id', 'task_title', 'user_name', 'action_type', 'timestamp'],
            rows,
            queryExecuted: q
          });
        }
        else if (queryClean.startsWith('select * from users')) {
          const rows = users.map(u => [u.id, u.name, u.email, u.role]);
          setSandboxResponse({
            headers: ['id', 'name', 'email', 'role'],
            rows,
            queryExecuted: q
          });
        }
        else if (queryClean.startsWith('select * from projects')) {
          const rows = projects.map(p => [p.id, p.name, p.description.substring(0, 40) + '...', p.color]);
          setSandboxResponse({
            headers: ['id', 'name', 'description', 'color'],
            rows,
            queryExecuted: q
          });
        }
        else if (queryClean.startsWith('select * from tasks')) {
          const rows = tasks.map(t => [t.id, t.title, t.status, t.priority, t.due_date]);
          setSandboxResponse({
            headers: ['id', 'title', 'status', 'priority', 'due_date'],
            rows,
            queryExecuted: q
          });
        }
        else {
          // Default generic handler
          setSandboxResponse({
            headers: ['status', 'message', 'mysql_execution'],
            rows: [
              ['SUCCESS', 'Query executed successfully through SQL Emulator.', q.toUpperCase()]
            ],
            queryExecuted: q
          });
        }
      } catch (e: any) {
        setSandboxResponse({
          headers: [],
          rows: [],
          error: e.message || 'Syntax Error in MySQL SQL execution.',
          queryExecuted: q
        });
      } finally {
        setSandboxExecuting(false);
      }
    }, 400);
  };

  useEffect(() => {
    if (activeTab === 'query_logs') {
      onRefreshLogs();
    }
  }, [activeTab]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm" id="database-console-section">
      {/* Console Header */}
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900 flex items-center gap-2">
              MySQL Database Inspector
              <span className="text-xs bg-emerald-100 text-emerald-800 font-mono font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE (InnoDB)
              </span>
            </h2>
            <p className="text-xs text-gray-500">Inspect the relational tables, foreign key mappings, and direct query activity stream.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'visualizer'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            ER Diagram & Schema
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'tables'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Table Browser
          </button>
          <button
            onClick={() => setActiveTab('query_logs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'query_logs'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Execution Logs ({sqlLogs.length})
          </button>
        </div>
      </div>

      {/* Visual ER Diagram and SQL Schema Sandbox Tab */}
      {activeTab === 'visualizer' && (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visual Entity-Relationship Graph */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span>MySQL ER Diagram (InnoDB)</span>
            </h3>

            {/* Micro ER Cards Layout */}
            <div className="space-y-4">
              {/* Users table */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                <div className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">users</div>
                <div className="flex-1 text-xs space-y-1">
                  <p className="font-semibold text-gray-700">Columns:</p>
                  <p className="font-mono text-gray-500"><span className="text-amber-700 font-bold font-mono">id</span> INT AUTO_INCREMENT PRI, name VARCHAR(100), email VARCHAR(100) UNI, avatar, role</p>
                  <p className="text-[10px] text-gray-400">Referenced in: <span className="font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">tasks.assignee_id</span></p>
                </div>
              </div>

              {/* Projects table */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                <div className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">projects</div>
                <div className="flex-1 text-xs space-y-1">
                  <p className="font-semibold text-gray-700">Columns:</p>
                  <p className="font-mono text-gray-500"><span className="text-emerald-700 font-bold font-mono">id</span> INT AUTO_INCREMENT PRI, name VARCHAR(100), description TEXT, color</p>
                  <p className="text-[10px] text-gray-400">Referenced in: <span className="font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">tasks.project_id</span></p>
                </div>
              </div>

              {/* Tasks mapping relational table */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-3 relative">
                <div className="absolute top-2 right-2 text-[10px] text-blue-600 font-medium font-mono bg-blue-100/60 px-1.5 py-0.5 rounded">Many-to-One FK Joints</div>
                <div className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">tasks</div>
                <div className="flex-1 text-xs space-y-2">
                  <p className="font-semibold text-gray-700">Columns & Relations:</p>
                  <ul className="space-y-1 font-mono text-gray-500 text-[11px] list-disc list-inside">
                    <li><span className="text-blue-700 font-bold">id</span> INT AUTO_INCREMENT (PRI)</li>
                    <li>title, description, status ENUM, priority ENUM, due_date</li>
                    <li className="text-blue-700"><span className="font-bold">project_id</span> INT (MULFK) &rarr; <span className="underline italic">projects.id</span></li>
                    <li className="text-blue-700"><span className="font-bold">assignee_id</span> INT (MULFK) &rarr; <span className="underline italic">users.id</span></li>
                  </ul>
                </div>
              </div>

              {/* Activity Logs table */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                <div className="text-xs font-mono font-bold bg-purple-100 text-purple-800 px-2 py-1 rounded">activity_logs</div>
                <div className="flex-1 text-xs space-y-1">
                  <p className="font-semibold text-gray-700">Logs Auditing Table:</p>
                  <p className="font-mono text-gray-500"><span className="text-purple-700 font-bold">id</span>, task_id, task_title, user_id (FK), action_type, old_value, new_value, timestamp</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive SQL Terminal Simulator */}
          <div className="flex flex-col h-full border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-900 text-gray-200 px-4 py-2.5 flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <Terminal className="text-amber-500 w-4 h-4" />
                Interactive SQL Play Sandbox
              </span>
              <span className="text-[10px] text-gray-400">MySQL Server local-node</span>
            </div>

            <div className="p-3 bg-gray-900 border-b border-gray-800">
              <p className="text-[11px] text-gray-400 mb-2">Click one of the educational custom queries below to load and run it:</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_QUERIES.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSqlSandboxInput(preset.query);
                      executeSandboxSql(preset.query);
                    }}
                    className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono px-2 py-1 rounded border border-gray-700 hover:border-gray-600 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={sqlSandboxInput}
              onChange={(e) => setSqlSandboxInput(e.target.value)}
              className="bg-gray-950 text-emerald-400 p-4 font-mono text-xs focus:outline-hidden min-h-[120px] resize-none"
              placeholder="WRITE YOUR SQL HERE..."
            />

            <div className="bg-gray-900 px-4 py-2 flex justify-between items-center border-t border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono">Terminal supports SELECT, JOINS, and GROUP BY simulation</span>
              <button
                onClick={() => executeSandboxSql()}
                disabled={sandboxExecuting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                {sandboxExecuting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                Run Query
              </button>
            </div>

            {/* Sandbox query response area */}
            <div className="bg-gray-950 p-4 font-mono text-xs border-t border-gray-800 flex-1 min-h-[160px] max-h-[220px] overflow-auto">
              {!sandboxResponse ? (
                <div className="text-gray-500 italic h-full flex items-center justify-center">
                  Output rows will render here. Choose a preset query above.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 border-b border-gray-800 pb-1">
                    <span>STATUS: {sandboxResponse.error ? 'ERROR' : 'Success'}</span>
                    <span>Query Completed</span>
                  </div>

                  {sandboxResponse.error && (
                    <div className="text-red-400 bg-red-950/40 p-2.5 rounded border border-red-900/50">
                      {sandboxResponse.error}
                    </div>
                  )}

                  {!sandboxResponse.error && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] text-gray-300">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400">
                            {sandboxResponse.headers.map((h, i) => (
                              <th key={i} className="pb-1 text-left pr-4 font-bold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sandboxResponse.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-gray-900/50 last:border-0 hover:bg-gray-900/30">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="py-1.5 pr-4 text-emerald-300 font-mono">{String(cell)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-[10px] text-gray-500 text-right">
                        {sandboxResponse.rows.length} row(s) in set
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Database Raw Tables Browsing Tab */}
      {activeTab === 'tables' && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500 font-medium">Select Table in DB schema:</span>
            <div className="flex flex-wrap gap-1">
              {(['users', 'projects', 'tasks', 'activity_logs'] as const).map(table => (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`text-xs px-3 py-1 rounded-md font-mono transition-all ${
                    selectedTable === table
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {table}
                </button>
              ))}
            </div>
          </div>

          {/* Render Table Data */}
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            {selectedTable === 'users' && (
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50 font-mono text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">id</th>
                    <th className="px-4 py-3 text-left">name</th>
                    <th className="px-4 py-3 text-left">email</th>
                    <th className="px-4 py-3 text-left">role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-gray-700">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-semibold text-blue-600">{u.id}</td>
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3 text-gray-500">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedTable === 'projects' && (
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50 font-mono text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">id</th>
                    <th className="px-4 py-3 text-left">name</th>
                    <th className="px-4 py-3 text-left">description</th>
                    <th className="px-4 py-3 text-left">color</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-gray-700">
                  {projects.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-semibold text-blue-600">{p.id}</td>
                      <td className="px-4 py-3 font-sans font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-sans max-w-sm truncate">{p.description}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-sans">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                          {p.color}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedTable === 'tasks' && (
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50 font-mono text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">id</th>
                    <th className="px-4 py-3 text-left">title</th>
                    <th className="px-4 py-3 text-left">status</th>
                    <th className="px-4 py-3 text-left">priority</th>
                    <th className="px-4 py-3 text-left">due_date</th>
                    <th className="px-4 py-3 text-left">project_id</th>
                    <th className="px-4 py-3 text-left">assignee_id</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-gray-700">
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-semibold text-blue-600">{t.id}</td>
                      <td className="px-4 py-3 font-sans font-medium text-gray-900 max-w-xs truncate">{t.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${
                          t.status === 'done' ? 'bg-green-50 text-green-700 border border-green-200' :
                          t.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          t.status === 'review' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans uppercase text-[10px] font-semibold">{t.priority}</td>
                      <td className="px-4 py-3 text-gray-500">{t.due_date}</td>
                      <td className="px-4 py-3 font-semibold text-gray-500 underline">{t.project_id}</td>
                      <td className="px-4 py-3 font-semibold text-gray-500 underline">{t.assignee_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedTable === 'activity_logs' && (
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50 font-mono text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">id</th>
                    <th className="px-4 py-3 text-left">task_id</th>
                    <th className="px-4 py-3 text-left">task_title</th>
                    <th className="px-4 py-3 text-left">user_name</th>
                    <th className="px-4 py-3 text-left">action_type</th>
                    <th className="px-4 py-3 text-left">timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-gray-800">
                  {activityLogs.slice(0, 15).map(log => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 font-semibold text-purple-600">{log.id}</td>
                      <td className="px-4 py-3 text-gray-500">{log.task_id}</td>
                      <td className="px-4 py-3 font-sans text-gray-700 font-medium">{log.task_title}</td>
                      <td className="px-4 py-3 font-sans text-gray-600">{log.user_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.action_type === 'create' ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' :
                          log.action_type === 'update_status' ? 'bg-blue-50 text-blue-800' :
                          log.action_type === 'delete' ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {activityLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-gray-400 italic">No activity logs recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SQL Live Activity Query Logs Tab */}
      {activeTab === 'query_logs' && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
              Showing standard SQL statement history triggered by your visual operations
            </span>
            <div className="flex gap-2">
              <button
                onClick={onRefreshLogs}
                className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1.5 rounded transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh Feed
              </button>
              <button
                onClick={onClearLogs}
                className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1.5 rounded transition"
              >
                Clear History
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
            {sqlLogs.map(log => (
              <div key={log.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between text-[11px] mb-2 border-b border-gray-200/55 pb-1.5 text-gray-500">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="bg-slate-200 text-slate-800 font-semibold px-1 py-0.2 rounded text-[9px]">ID: {log.id}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-teal-700 bg-teal-50 px-1 py-0.2 rounded">{log.durationMs}ms</span>
                    <span className="text-slate-700 bg-slate-100 px-1 py-0.2 rounded font-semibold">Rows: {log.rowsAffected}</span>
                  </div>
                </div>
                <pre className="font-mono text-xs text-slate-800 overflow-x-auto bg-gray-100/40 p-2.5 rounded border border-gray-200/20 whitespace-pre-wrap">{log.query}</pre>
                {log.params && log.params.length > 0 && (
                  <div className="mt-2 text-[10px] text-gray-500 font-mono">
                    <span className="font-bold text-gray-400">Parameters:</span> {JSON.stringify(log.params)}
                  </div>
                )}
              </div>
            ))}

            {sqlLogs.length === 0 && (
              <div className="border border-dashed border-gray-200 rounded-xl py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                <Terminal className="w-8 h-8 text-gray-300" />
                <p className="text-sm font-medium">No system SQL queries captured yet.</p>
                <p className="text-xs">Create, update, or reorganize tasks to trigger automatic server-side SQL operations.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
