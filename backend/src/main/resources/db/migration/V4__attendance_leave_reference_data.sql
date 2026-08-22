-- Phase 2 permissions, role grants, and static reference data (leave types, holidays, shifts).

insert into permissions (code, description) values
  ('attendance:read', 'List and search all attendance records'),
  ('attendance:read:reports', 'Read attendance for direct/authorized reports'),
  ('attendance:read:own', 'Read the caller''s own attendance'),
  ('attendance:checkin', 'Check in and check out'),
  ('attendance:correct', 'Request an attendance correction'),
  ('attendance:approve_correction', 'Approve or reject attendance corrections'),
  ('shift:read', 'List shift templates'),
  ('shift:write', 'Create shifts and assign them to employees'),
  ('leave:read', 'List and search all leave requests'),
  ('leave:read:reports', 'Read leave requests for direct/authorized reports'),
  ('leave:read:own', 'Read the caller''s own leave requests and balances'),
  ('leave:request', 'Submit a leave request'),
  ('leave:approve', 'Approve or reject leave requests'),
  ('leave:cancel', 'Cancel a leave request'),
  ('leave:manage_types', 'Create and edit leave types and balances'),
  ('notification:read', 'Read the caller''s own notifications');

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('attendance:read','attendance:read:reports','attendance:read:own','attendance:checkin',
                  'attendance:correct','attendance:approve_correction','shift:read','shift:write',
                  'leave:read','leave:read:reports','leave:read:own','leave:request','leave:approve',
                  'leave:cancel','leave:manage_types','notification:read')
  where r.name = 'SUPER_ADMIN';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('attendance:read','attendance:approve_correction','shift:read','shift:write',
                  'leave:read','leave:approve','leave:manage_types','notification:read',
                  'attendance:checkin','attendance:read:own','leave:read:own','leave:request','leave:cancel')
  where r.name = 'HR_ADMIN';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('attendance:read','attendance:approve_correction','shift:read',
                  'leave:read','leave:approve','notification:read',
                  'attendance:checkin','attendance:read:own','leave:read:own','leave:request','leave:cancel')
  where r.name = 'HR_OFFICER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('attendance:read','leave:read','shift:read','notification:read',
                  'attendance:checkin','attendance:read:own','leave:read:own','leave:request','leave:cancel')
  where r.name = 'PAYROLL_OFFICER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('attendance:read:reports','attendance:read:own','attendance:checkin','attendance:correct',
                  'attendance:approve_correction','shift:read','leave:read:reports','leave:read:own',
                  'leave:request','leave:approve','leave:cancel','notification:read')
  where r.name = 'MANAGER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('attendance:checkin','attendance:read:own','attendance:correct','shift:read',
                  'leave:read:own','leave:request','leave:cancel','notification:read')
  where r.name = 'EMPLOYEE';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('attendance:read','leave:read','shift:read','notification:read',
                  'attendance:checkin','attendance:read:own','leave:read:own','leave:request','leave:cancel')
  where r.name = 'AUDITOR';

insert into leave_types (name, description, requires_approval, max_consecutive_days, paid, active) values
  ('Annual Leave', 'Planned personal time off', true, 20, true, true),
  ('Sick Leave', 'Health-related absence', true, 10, true, true),
  ('Unpaid Leave', 'Leave beyond paid entitlement', true, 30, false, true);

insert into shifts (name, start_time, end_time, grace_minutes, break_minutes) values
  ('General Shift', '09:00:00', '18:00:00', 10, 60),
  ('Early Shift', '07:00:00', '16:00:00', 10, 60);

insert into holidays (holiday_date, name, location) values
  (date '2026-01-26', 'Republic Day', null),
  (date '2026-08-15', 'Independence Day', null),
  (date '2026-10-02', 'Gandhi Jayanti', null),
  (date '2026-12-25', 'Christmas', null);
