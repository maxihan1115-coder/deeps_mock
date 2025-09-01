-- Performance optimization: Add indexes for frequently queried columns

-- quest_participation table: gameUuid lookup optimization
CREATE INDEX IF NOT EXISTS idx_quest_participation_game_uuid ON quest_participation(gameUuid);

-- high_scores table: user aggregation optimization  
CREATE INDEX IF NOT EXISTS idx_high_scores_user_score ON high_scores(userId, score DESC);
CREATE INDEX IF NOT EXISTS idx_high_scores_user_created ON high_scores(userId, createdAt DESC);

-- attendance_records table: user count optimization
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(userId);

-- platform_links table: gameUuid lookup (already has UNIQUE, but explicit index)
CREATE INDEX IF NOT EXISTS idx_platform_links_game_uuid ON platform_links(gameUuid);

-- users table: uuid lookup (already has UNIQUE, but explicit index)  
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);

-- quests table: user lookup optimization
CREATE INDEX IF NOT EXISTS idx_quests_user ON quests(userId);
CREATE INDEX IF NOT EXISTS idx_quests_user_type ON quests(userId, type);
