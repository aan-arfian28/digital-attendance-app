-- Add email scheduler configuration settings
INSERT INTO settings (`key`, `value`, `description`, created_at, updated_at) VALUES
('email_scheduler_enabled', 'true', 'Master switch to enable/disable email reminder scheduler', NOW(), NOW()),
('email_scheduler_days', '1,2,3,4,5', 'Days of week for reminders (1=Monday, 2=Tuesday, ..., 7=Sunday). Comma-separated list.', NOW(), NOW()),
('email_morning_time', '07:30', 'Morning clock-in reminder time in HH:MM format (24-hour)', NOW(), NOW()),
('email_morning_enabled', 'true', 'Enable/disable morning clock-in reminder', NOW(), NOW()),
('email_evening_time', '17:00', 'Evening clock-out reminder time in HH:MM format (24-hour)', NOW(), NOW()),
('email_evening_enabled', 'true', 'Enable/disable evening clock-out reminder', NOW(), NOW()),
('email_scheduler_timezone', 'Asia/Jakarta', 'Timezone for scheduler (IANA timezone format)', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
    `value` = VALUES(`value`),
    `description` = VALUES(`description`),
    updated_at = NOW();
