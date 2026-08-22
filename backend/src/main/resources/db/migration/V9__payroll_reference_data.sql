insert into permissions (code, description) values
  ('salary:read', 'View salary structures'),
  ('salary:write', 'Create and edit salary structures and bank/tax verification flags'),
  ('payroll:read', 'View all payroll runs, lines and anomalies'),
  ('payroll:read:own', 'View the caller''s own published salary slips'),
  ('payroll:manage', 'Create and calculate payroll runs'),
  ('payroll:approve', 'Approve a calculated payroll run (maker-checker: must differ from who calculated it)'),
  ('payroll:publish', 'Publish an approved payroll run, issuing salary slips');

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('salary:read','salary:write','payroll:read','payroll:read:own','payroll:manage',
                  'payroll:approve','payroll:publish')
  where r.name = 'SUPER_ADMIN';

-- HR Admin decides compensation (salary:write); Payroll Officer runs the cycle. Kept separate
-- on purpose (spec section 2: "Payroll permissions must be separated from general HR permissions").
insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('salary:read','salary:write','payroll:read','payroll:read:own')
  where r.name = 'HR_ADMIN';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('salary:read','payroll:read','payroll:read:own','payroll:manage','payroll:approve','payroll:publish')
  where r.name = 'PAYROLL_OFFICER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('salary:read','payroll:read')
  where r.name = 'AUDITOR';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p on p.code = 'payroll:read:own'
  where r.name in ('HR_OFFICER', 'MANAGER', 'EMPLOYEE');
