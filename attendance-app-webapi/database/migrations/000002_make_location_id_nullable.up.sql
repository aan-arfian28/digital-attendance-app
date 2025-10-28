-- Make location_id nullable to support leave requests and pending records
ALTER TABLE `attendances` 
MODIFY COLUMN `location_id` bigint unsigned NULL;

-- Update the foreign key constraint to allow NULL
ALTER TABLE `attendances`
DROP FOREIGN KEY `fk_locations_attendances`,
ADD CONSTRAINT `fk_locations_attendances` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
