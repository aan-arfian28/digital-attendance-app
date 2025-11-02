-- Rollback: Change default ValidationStatus back to PENDING
ALTER TABLE attendances MODIFY COLUMN validation_status VARCHAR(20) DEFAULT 'PENDING';
