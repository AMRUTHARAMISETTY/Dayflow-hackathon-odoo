-- Static reference data: roles, permissions and their grants (spec section 2),
-- plus a starter department list. Demo people/accounts are seeded at application
-- startup (DemoDataSeeder) so passwords can be hashed with the real encoder.

insert into roles (name, description) values
  ('SUPER_ADMIN', 'Organization, roles, security, integrations, all modules'),
  ('HR_ADMIN', 'Employees, leave, attendance, payroll, documents, reports'),
  ('HR_OFFICER', 'Assigned employees, requests, documents, tickets'),
  ('PAYROLL_OFFICER', 'Salary structures, payroll cycles and reports'),
  ('MANAGER', 'Team attendance, leave approvals, reviews'),
  ('EMPLOYEE', 'Own profile, attendance, leave, payroll and documents'),
  ('AUDITOR', 'Read-only authorized records and audit logs');

insert into permissions (code, description) values
  ('employee:read', 'List and search all employee records'),
  ('employee:read:reports', 'Read employee records for direct/authorized reports'),
  ('employee:read:own', 'Read the caller''s own employee record'),
  ('employee:write', 'Create employees and edit non-sensitive fields'),
  ('employee:write:sensitive', 'Edit department, manager, employment type and status'),
  ('employee:suspend', 'Suspend an employee'),
  ('employee:archive', 'Archive/offboard an employee'),
  ('department:read', 'List departments'),
  ('department:write', 'Create and edit departments'),
  ('invitation:write', 'Create and revoke secure invitations'),
  ('invitation:read', 'List invitations'),
  ('role:read', 'List roles and their permission grants'),
  ('audit:read', 'Read the immutable audit log'),
  ('dashboard:read', 'View the HR home dashboard'),
  ('orgchart:read', 'View the organization chart');

-- Super Admin: every permission.
insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r cross join permissions p where r.name = 'SUPER_ADMIN';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('employee:read','employee:write','employee:write:sensitive','employee:suspend',
                  'employee:archive','department:read','department:write','invitation:write',
                  'invitation:read','role:read','audit:read','dashboard:read','orgchart:read')
  where r.name = 'HR_ADMIN';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('employee:read','employee:write','department:read','invitation:read',
                  'dashboard:read','orgchart:read')
  where r.name = 'HR_OFFICER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('employee:read','department:read','dashboard:read')
  where r.name = 'PAYROLL_OFFICER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('employee:read:own','employee:read:reports','dashboard:read','orgchart:read')
  where r.name = 'MANAGER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('employee:read:own','dashboard:read')
  where r.name = 'EMPLOYEE';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('employee:read','department:read','dashboard:read','orgchart:read','audit:read','role:read')
  where r.name = 'AUDITOR';

insert into departments (name, location) values
  ('Administration', 'Bengaluru'),
  ('People Operations', 'Bengaluru'),
  ('Engineering', 'Hyderabad'),
  ('Finance', 'Mumbai');
