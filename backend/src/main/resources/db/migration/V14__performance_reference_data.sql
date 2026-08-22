insert into permissions (code, description) values
  ('performance:read', 'View any employee''s goals and performance reviews'),
  ('performance:read:own', 'View the caller''s own goals and performance reviews'),
  ('performance:manage', 'Create and manage goals and performance reviews for any employee'),
  ('performance:manage:reports', 'Create and manage goals and performance reviews for direct reports'),
  ('insights:read', 'View workforce insights (headcount trend, attrition risk)');

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('performance:read', 'performance:read:own', 'performance:manage', 'insights:read')
  where r.name in ('SUPER_ADMIN', 'HR_ADMIN');

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('performance:read', 'performance:read:own', 'insights:read')
  where r.name = 'HR_OFFICER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('performance:read:own', 'performance:manage:reports')
  where r.name = 'MANAGER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p on p.code = 'performance:read:own'
  where r.name in ('EMPLOYEE', 'PAYROLL_OFFICER');

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('performance:read', 'insights:read')
  where r.name = 'AUDITOR';
