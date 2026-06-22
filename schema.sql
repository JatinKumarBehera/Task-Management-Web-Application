-- MySQL Schema for Task Management Web Application
-- This schema represents the MySQL relational structure running behind the app.

CREATE DATABASE IF NOT EXISTS task_manager_db;
USE task_manager_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  avatar VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT 'blue',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status ENUM('todo', 'in_progress', 'review', 'done') DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  due_date DATE NOT NULL,
  project_id INT NOT NULL,
  assignee_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_status(status),
  INDEX idx_due_date(due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT, -- Soft ref to show deleted task numbers
  task_title VARCHAR(200) NOT NULL,
  user_id INT NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  action_type ENUM('create', 'update_status', 'update_task', 'delete') NOT NULL,
  old_value VARCHAR(255),
  new_value VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seeding Default Mock Data
INSERT INTO users (id, name, email, avatar, role) VALUES
(1, 'Sarah Jenkins', 'sarah.j@company.com', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop', 'Lead Designer'),
(2, 'Alex Rivera', 'alex.r@company.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop', 'Fullstack Engineer'),
(3, 'Marcus Vance', 'marcus.v@company.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop', 'Product Manager'),
(4, 'Elena Rostov', 'elena.r@company.com', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop', 'QA Automator');

INSERT INTO projects (id, name, description, color) VALUES
(1, 'Alpha Redesign', 'Complete visual overhauled user dashboard for client feedback.', '#3b82f6'), -- blue
(2, 'Mobile App', 'Sprint 3 implementation of React Native modules and notifications.', '#8b5cf6'), -- purple
(3, 'API Integration', 'Stripe payment webhooks and telemetry database pipelines.', '#10b981'), -- green
(4, 'Client Onboarding', 'Refining steps to sign up, configure profile, and quick tours.', '#f59e0b'); -- amber

INSERT INTO tasks (id, title, description, status, priority, due_date, project_id, assignee_id) VALUES
(1, 'Design new landing page style guide', 'Develop visual system with typography and primary/secondary colors.', 'in_progress', 'high', '2026-06-25', 1, 1),
(2, 'Draft authentication flow visual sequence', 'Map the OAuth and signup screen progression layouts.', 'todo', 'low', '2026-06-30', 1, 3),
(3, 'Deploy staging backend cluster', 'Setup the Node.js server to run on sandbox instances.', 'done', 'high', '2026-06-18', 3, 2),
(4, 'Refactor invoice query execution speed', 'Optimize subqueries and compile direct relational indexes.', 'review', 'medium', '2026-06-24', 3, 2),
(5, 'Write device notifications payload specs', 'Document notifications JSON format for iOS and Android platforms.', 'todo', 'medium', '2026-06-28', 2, 3),
(6, 'Perform accessibility compliance review', 'Audit components against standard WCAG AA design profiles.', 'todo', 'low', '2026-07-02', 1, 1),
(7, 'Implement validation for email registrations', 'Prevent incorrect signup profiles with robust server tests.', 'done', 'medium', '2026-06-15', 4, 4);
