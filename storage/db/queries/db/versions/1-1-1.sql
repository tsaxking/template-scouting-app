CREATE TABLE IF NOT EXISTS ServerRequests (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    body TEXT NOT NULL,
    response TEXT,
    date TEXT NOT NULL
);