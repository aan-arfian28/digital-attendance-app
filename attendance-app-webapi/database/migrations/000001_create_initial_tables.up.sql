CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `name` longtext NOT NULL,
  `position` varchar(255) NOT NULL,
  `position_level` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_roles_position_position_level` (`position`,`position_level`),
  KEY `idx_roles_deleted_at` (`deleted_at`)
);

CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `username` varchar(32) NOT NULL,
  `password` varchar(72) NOT NULL,
  `email` longtext,
  `role_id` bigint unsigned DEFAULT NULL,
  `supervisor_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_users_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_users_supervisor` FOREIGN KEY (`supervisor_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE `user_details` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `name` longtext,
  PRIMARY KEY (`id`),
  KEY `idx_user_details_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_user_details_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
);
