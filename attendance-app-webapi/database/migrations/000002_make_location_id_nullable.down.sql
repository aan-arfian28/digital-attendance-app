-- Revert location_id to NOT NULL
ALTER TABLE `attendances` 
MODIFY COLUMN `location_id` bigint unsigned NOT NULL;

-- Restore the foreign key constraint
ALTER TABLE `attendances`
DROP FOREIGN KEY `fk_locations_attendances`,
ADD CONSTRAINT `fk_locations_attendances` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
