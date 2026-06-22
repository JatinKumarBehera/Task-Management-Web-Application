import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- API ROUTES ---

  // Tasks endpoints
  app.get('/api/tasks', (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
        assignee_id: req.query.assignee_id ? Number(req.query.assignee_id) : undefined,
        search: req.query.search as string,
      };
      const tasks = db.getTasks(filters);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tasks', (req, res) => {
    try {
      const task = db.createTask(req.body);
      res.status(201).json(task);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/tasks/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      const updated = db.updateTask(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: `Task with ID ${id} not found` });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/tasks/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      const deleted = db.deleteTask(id);
      if (!deleted) {
        return res.status(404).json({ error: `Task with ID ${id} not found or could not be deleted` });
      }
      res.json({ success: true, message: `Task ${id} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Users endpoints
  app.get('/api/users', (req, res) => {
    try {
      const users = db.getUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', (req, res) => {
    try {
      const { name, email, role, avatar } = req.body;
      if (!name || !email || !role) {
        return res.status(400).json({ error: 'Missing name, email or role parameters' });
      }
      const defaultAvatar = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      const newUser = db.createUser(name, email, role, defaultAvatar);
      res.status(201).json(newUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Projects endpoints
  app.get('/api/projects', (req, res) => {
    try {
      const projects = db.getProjects();
      res.json(projects);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/projects', (req, res) => {
    try {
      const { name, description, color } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }
      const defaultColor = color || '#' + Math.floor(Math.random() * 16777215).toString(16);
      const newProject = db.createProject(name, description || '', defaultColor);
      res.status(201).json(newProject);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Activity logs endpoint
  app.get('/api/activity_logs', (req, res) => {
    try {
      const logs = db.getActivityLogs();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SQL Execution feed audit endpoint
  app.get('/api/sql_logs', (req, res) => {
    try {
      const queryLogs = db.getSqlQueryLogs();
      res.json(queryLogs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sql_logs/clear', (req, res) => {
    try {
      db.clearSqlQueryLogs();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Aggregate Stats endpoint
  app.get('/api/stats', (req, res) => {
    try {
      const stats = db.getDashboardStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE & STATIC FILE SERVING FOR FULL-STACK DEPLOYMENT ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serving client static assets from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] SQL-Simulated Express backend running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[Startup Error] Failed to boot full-stack microservice:', error);
});
