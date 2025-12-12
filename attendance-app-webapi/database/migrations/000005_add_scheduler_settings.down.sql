-- Remove email scheduler configuration settings
DELETE FROM settings WHERE `key` IN (
    'email_scheduler_enabled',
    'email_scheduler_days',
    'email_morning_time',
    'email_morning_enabled',
    'email_evening_time',
    'email_evening_enabled',
    'email_scheduler_timezone'
);
