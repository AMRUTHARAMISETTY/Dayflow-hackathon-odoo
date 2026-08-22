insert into permissions (code, description) values
  ('automation:read', 'List automation rules and their execution history'),
  ('automation:write', 'Create, edit and toggle automation rules'),
  ('automation:run', 'Manually run or dry-run an automation rule');

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('automation:read','automation:write','automation:run')
  where r.name = 'SUPER_ADMIN';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('automation:read','automation:write','automation:run')
  where r.name = 'HR_ADMIN';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('automation:read')
  where r.name = 'HR_OFFICER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('automation:read')
  where r.name = 'AUDITOR';

insert into automation_rules (code, name, description, trigger_type, config, active, test_mode, high_risk) values
  ('ATTENDANCE_MISSING_CHECKOUT', 'Missing checkout reminder',
   'Notifies an employee when they checked in but never checked out on a past day.',
   'SCHEDULED', '{}', true, false, false),
  ('LEAVE_PENDING_REMINDER', 'Leave approval reminder & escalation',
   'Reminds the approver when a leave request has been pending too long, then escalates to HR if it is still unresolved.',
   'SCHEDULED', '{"reminderAfterHours":24,"escalateAfterHours":48}', true, false, false);
