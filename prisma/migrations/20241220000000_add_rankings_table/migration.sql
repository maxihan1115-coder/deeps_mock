-- CreateTable
CREATE TABLE `rankings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(255) NOT NULL,
    `game_uuid` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,
    `level` INTEGER NOT NULL,
    `lines` INTEGER NOT NULL,
    `ranking_period` VARCHAR(50) NOT NULL,
    `period_start_date` DATETIME(3) NOT NULL,
    `period_end_date` DATETIME(3) NOT NULL,
    `rank_position` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_user_period`(`user_id`, `ranking_period`, `period_start_date`),
    INDEX `idx_period_rank`(`ranking_period`, `period_start_date`, `rank_position`),
    INDEX `idx_game_uuid`(`game_uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
