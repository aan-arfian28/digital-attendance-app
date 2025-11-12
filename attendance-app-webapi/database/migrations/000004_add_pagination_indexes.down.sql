-- Remove indexes for pagination
DROP INDEX IF EXISTS idx_leave_requests_user_start ON leave_requests;
DROP INDEX IF EXISTS idx_leave_requests_start_date ON leave_requests;
DROP INDEX IF EXISTS idx_leave_requests_user_id ON leave_requests;
DROP INDEX IF EXISTS idx_attendance_user_date ON attendance;
DROP INDEX IF EXISTS idx_attendance_date ON attendance;
DROP INDEX IF EXISTS idx_attendance_user_id ON attendance;
DROP INDEX IF EXISTS idx_roles_deleted_at ON roles;
DROP INDEX IF EXISTS idx_users_deleted_at ON users;
