insert into permissions (code, description) values
  ('email:read', 'View sent, scheduled and draft HR email'),
  ('email:send', 'Compose, schedule and send HR email'),
  ('email:templates:manage', 'Create and edit email templates'),
  ('ticket:read', 'View all HR help desk tickets'),
  ('ticket:read:own', 'View and create the caller''s own HR help desk tickets'),
  ('ticket:manage', 'Assign, reply to and change the status of HR help desk tickets'),
  ('ticket:confidential:read', 'View confidential grievance tickets'),
  ('policy:read', 'Read company policies'),
  ('policy:manage', 'Create and edit company policies'),
  ('assistant:use', 'Use the employee self-service assistant');

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('email:read','email:send','email:templates:manage','ticket:read','ticket:read:own',
                  'ticket:manage','ticket:confidential:read','policy:read','policy:manage','assistant:use')
  where r.name = 'SUPER_ADMIN';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('email:read','email:send','email:templates:manage','ticket:read','ticket:read:own',
                  'ticket:manage','ticket:confidential:read','policy:read','policy:manage','assistant:use')
  where r.name = 'HR_ADMIN';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p
    on p.code in ('email:read','email:send','ticket:read','ticket:read:own','ticket:manage','policy:read','assistant:use')
  where r.name = 'HR_OFFICER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p on p.code in ('policy:read','assistant:use','ticket:read:own')
  where r.name = 'PAYROLL_OFFICER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p on p.code in ('policy:read','assistant:use','ticket:read:own')
  where r.name = 'MANAGER';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p on p.code in ('policy:read','assistant:use','ticket:read:own')
  where r.name = 'EMPLOYEE';

insert into role_permissions (role_id, permission_id)
  select r.id, p.id from roles r join permissions p on p.code in ('email:read','ticket:read','policy:read')
  where r.name = 'AUDITOR';

insert into email_templates (code, category, name, subject, body) values
  ('WELCOME', 'lifecycle', 'Welcome email', 'Welcome to Dayflow, {{employee_name}}!',
   'Hi {{employee_name}},\n\nWelcome aboard! Your Dayflow account is ready. If you have any questions, reach out to HR any time.\n\n— {{organization_name}} HR'),
  ('ONBOARDING_REMINDER', 'lifecycle', 'Onboarding reminder', 'Finish setting up your Dayflow profile',
   'Hi {{employee_name}},\n\nA few onboarding steps are still open. Please complete your profile so we can get you fully set up.\n\n— HR'),
  ('LEAVE_APPROVED', 'leave', 'Leave decision — approved', 'Your leave request has been approved',
   'Hi {{employee_name}},\n\nYour leave request for {{leave_dates}} has been approved.\n\n— HR'),
  ('LEAVE_REJECTED', 'leave', 'Leave decision — rejected', 'Your leave request needs a follow-up',
   'Hi {{employee_name}},\n\nYour leave request for {{leave_dates}} could not be approved as submitted. Your manager or HR will follow up with details.\n\n— HR'),
  ('MISSING_CHECKOUT', 'attendance', 'Missing checkout reminder', 'Reminder: missing checkout on {{due_date}}',
   'Hi {{employee_name}},\n\nOur records show a missing checkout on {{due_date}}. If this looks wrong, please submit a correction in Dayflow.\n\n— HR'),
  ('DOCUMENT_EXPIRY', 'documents', 'Document expiry reminder', 'Action needed: {{document_name}} is expiring soon',
   'Hi {{employee_name}},\n\n{{document_name}} is expiring soon. Please upload a renewed copy at your earliest convenience.\n\n— HR'),
  ('PAYROLL_PUBLISHED', 'payroll', 'Salary slip available', 'Your salary slip for {{salary_month}} is available',
   'Hi {{employee_name}},\n\nYour salary slip for {{salary_month}} has been published and is available in Dayflow.\n\n— Payroll'),
  ('BIRTHDAY', 'engagement', 'Birthday greeting', 'Happy Birthday, {{employee_name}}!',
   'Hi {{employee_name}},\n\nWishing you a fantastic birthday from all of us at {{organization_name}}!\n\n— HR'),
  ('ANNOUNCEMENT', 'engagement', 'Custom HR announcement', '{{organization_name}} announcement',
   'Hi {{employee_name}},\n\n(Write your announcement here.)\n\n— HR');

insert into policies (code, title, category, effective_date, body) values
  ('LEAVE_POLICY', 'Leave Policy', 'Leave',
   date '2026-01-01',
   'Employees accrue Annual Leave and Sick Leave per the balances shown in Dayflow. A single working day of leave with sufficient balance is auto-approved; longer requests are routed to your manager, with HR as a fallback approver. Unpaid Leave is available beyond your paid entitlement and always requires approval. Cancel a pending or not-yet-started approved request any time from the Leave page; approved leave restores your balance automatically on cancellation.'),
  ('REMOTE_WORK_POLICY', 'Remote & Hybrid Work Policy', 'Work Arrangements',
   date '2026-01-01',
   'Remote and hybrid work arrangements are set per role and team by your manager and HR. Attendance is still tracked via check-in/check-out for whichever hours you are scheduled to work, regardless of location. Speak with your manager if your work location needs to change.'),
  ('ATTENDANCE_POLICY', 'Attendance & Punctuality Policy', 'Attendance',
   date '2026-01-01',
   'Check in and check out using Dayflow; server timestamps are authoritative. Arriving after your shift''s grace period is recorded as late; leaving before your shift end is recorded as an early departure. If you forget to check out, Dayflow will notify you and you can request a correction with a brief explanation, which your manager or HR will review.'),
  ('CODE_OF_CONDUCT', 'Code of Conduct', 'Conduct',
   date '2026-01-01',
   'All employees are expected to treat colleagues with respect and act with integrity. Workplace issues can be raised confidentially through an HR Help Desk ticket marked confidential, which is only visible to HR Admin and the assigned HR contact.');
