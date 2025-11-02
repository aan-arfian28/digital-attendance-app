-- Update default ValidationStatus to PRESENT for new records
ALTER TABLE attendances MODIFY COLUMN validation_status VARCHAR(20) DEFAULT 'PRESENT';

-- Update existing records that are still PENDING to PRESENT
-- (Only update records that haven't been validated yet - ValidatorID is NULL)
UPDATE attendances 
SET validation_status = 'PRESENT' 
WHERE validation_status = 'PENDING' AND validator_id IS NULL;
