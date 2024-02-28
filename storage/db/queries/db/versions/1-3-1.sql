CREATE TABLE IF NOT EXISTS TBARequests (
    url TEXT PRIMARY KEY,
    response TEXT, -- JSON
    updated BIGINT NOT NULL, -- Date of last update (in ms)
    update INTEGER NOT NULL DEFAULT 0
);