import sqlite3 from 'sqlite3';
import { app } from 'electron';
import path from 'path';
import { SourceData, TweetData, TickerConfig } from '../shared/types'; // Corrected path

const IS_DEV = process.env.NODE_ENV !== 'production';

// Define the database path. In development, use a local file.
// In production, use the app's user data path.
const dbPath = IS_DEV 
    ? path.resolve(__dirname, '../../tabloid.db') 
    : path.join(app.getPath('userData'), 'tabloid.db');

let db: sqlite3.Database;

// Example initial sources (replace with actual Twitter User IDs and logos)
const initialSources: Omit<SourceData, 'id'>[] = [
    { name: "Coinbase", handle: "coinbase", twitterUserId: "3437070832", type: 'twitter', bubblePosition: 0, logoUrl: 'https://pbs.twimg.com/profile_images/1758831397866909696/E8pZ3l8o_400x400.jpg' },
    { name: "CZ Binance", handle: "cz_binance", twitterUserId: "902926941413453824", type: 'twitter', bubblePosition: 1, logoUrl: 'https://pbs.twimg.com/profile_images/1707011536194895872/2Evx550a_400x400.jpg' },
    { name: "Glassnode", handle: "glassnode", twitterUserId: "955471816132923392", type: 'twitter', bubblePosition: 2, logoUrl: 'https://pbs.twimg.com/profile_images/1452999896173195270/h_9j5uN5_400x400.png' }, 
    { name: "DeFi Pulse", handle: "defipulse", twitterUserId: "1104038581163393024", type: 'twitter', bubblePosition: 3, logoUrl: 'https://pbs.twimg.com/profile_images/1104038884531228672/p2_1n75p_400x400.png' }, 
    { name: "Wu Blockchain", handle: "WuBlockchain", twitterUserId: "1291227168380317696", type: 'twitter', bubblePosition: 4, logoUrl: 'https://pbs.twimg.com/profile_images/1396635074457014272/9HHe9G4L_400x400.jpg' }, 
    { name: "Hsaka", handle: "HsakaTrades", twitterUserId: "971400609640239104", type: 'twitter', bubblePosition: 5, logoUrl: 'https://pbs.twimg.com/profile_images/1710031006133968896/x25Ab0F9_400x400.jpg' }
];

// Default tickers based on README & Zustand store
const initialTickers: Omit<TickerConfig, 'displayName'>[] = [
    { id: 'bitcoin', symbol: 'BTC', displayOrder: 0 },
    { id: 'ethereum', symbol: 'ETH', displayOrder: 1 },
    { id: 'solana', symbol: 'SOL', displayOrder: 2 },
];

export const addInitialSources = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const dbInstance = getDb();
        dbInstance.serialize(() => {
            dbInstance.get("SELECT COUNT(*) as count FROM sources", (err: Error | null, row: { count: number }) => {
                if (err) return reject(err);
                if (row.count === 0) {
                    const stmt = dbInstance.prepare("INSERT INTO sources (id, name, handle, type, bubble_position, logo_url, twitter_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    initialSources.forEach(s => {
                        stmt.run(s.twitterUserId, s.name, s.handle, s.type, s.bubblePosition, s.logoUrl, s.twitterUserId, (errRun: Error | null) => {
                            if (errRun) console.error('Error inserting initial source:', s.name, errRun);
                        });
                    });
                    stmt.finalize((errFinal: Error | null) => errFinal ? reject(errFinal) : resolve());
                } else {
                    resolve(); // Sources already exist
                }
            });
        });
    });
};

export const getAllSources = (): Promise<SourceData[]> => {
    return new Promise((resolve, reject) => {
        getDb().all("SELECT * FROM sources ORDER BY bubble_position ASC", [], (err, rows: SourceData[]) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

export const updateSourceLastFetchedTweetId = (sourceId: string, lastTweetId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        getDb().run("UPDATE sources SET last_fetched_tweet_id = ? WHERE id = ?", [lastTweetId, sourceId], function(err) {
            if (err) return reject(err);
            if (this.changes === 0) console.warn(`No source found with id ${sourceId} to update last_fetched_tweet_id.`);
            resolve();
        });
    });
};

export const storeTweets = (tweets: TweetData[]): Promise<void[]> => {
    const dbInstance = getDb();
    const stmt = dbInstance.prepare(
        `INSERT OR IGNORE INTO tweets (id, source_id, author_name, author_handle, author_avatar, content, media_urls, likes, retweets, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    const promises = tweets.map(tweet => {
        return new Promise<void>((resolve, reject) => {
            stmt.run(
                tweet.id,
                tweet.sourceId,
                tweet.author.name,
                tweet.author.handle,
                tweet.author.avatarUrl,
                tweet.content,
                tweet.media ? JSON.stringify(tweet.media) : null,
                tweet.metrics?.likes,
                tweet.metrics?.retweets,
                tweet.createdAt,
                (err: Error | null) => {
                    if (err) {
                        console.error("Failed to store tweet:", tweet.id, err);
                        return reject(err);
                    }
                    resolve();
                }
            );
        });
    });

    return Promise.all(promises).finally(() => stmt.finalize());
};

export const addInitialTickers = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const dbInstance = getDb();
        dbInstance.serialize(() => {
            dbInstance.get("SELECT COUNT(*) as count FROM tickers", (err: Error | null, row: { count: number }) => {
                if (err) return reject(err);
                if (row.count === 0) {
                    const stmt = dbInstance.prepare("INSERT INTO tickers (id, symbol, display_order) VALUES (?, ?, ?)");
                    initialTickers.forEach(t => {
                        // displayName is part of TickerConfig but not in the DB table per schema
                        stmt.run(t.id, t.symbol, t.displayOrder, (errRun: Error | null) => {
                            if (errRun) console.error('Error inserting initial ticker:', t.symbol, errRun);
                        });
                    });
                    stmt.finalize((errFinal: Error | null) => errFinal ? reject(errFinal) : resolve());
                } else {
                    resolve(); // Tickers already exist
                }
            });
        });
    });
};

export const getAllTickerConfigs = (): Promise<TickerConfig[]> => {
    return new Promise((resolve, reject) => {
        getDb().all("SELECT id, symbol, display_order FROM tickers ORDER BY display_order ASC", [], (err, rows: any[]) => {
            if (err) return reject(err);
            // Map rows to TickerConfig, creating displayName from symbol for now
            const configs: TickerConfig[] = rows.map(row => ({
                ...row,
                displayName: row.symbol.toUpperCase(), // Or fetch from a mapping if available
            }));
            resolve(configs);
        });
    });
};

// Modify existing getDb to call addInitialSources after table initialization
export const getDb = (): sqlite3.Database => {
    if (!db) {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database', err.message);
            } else {
                console.log('Database connected to', dbPath);
                initializeTables(() => {
                    // After tables are initialized, try to add initial sources
                    addInitialSources().catch(err => console.error("Failed to add initial sources:", err));
                    addInitialTickers().catch(err => console.error("Failed to add initial tickers:", err));
                });
            }
        });
    }
    return db;
};

// Modify initializeTables to accept a callback
const initializeTables = (callback?: () => void) => {
    const tableQueries = [
        `
        CREATE TABLE IF NOT EXISTS tweets (
            id TEXT PRIMARY KEY,
            source_id TEXT NOT NULL,
            author_name TEXT,
            author_handle TEXT,
            author_avatar TEXT,
            content TEXT,
            media_urls TEXT, 
            likes INTEGER,
            retweets INTEGER,
            created_at DATETIME,
            fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS sources (
            id TEXT PRIMARY KEY, 
            name TEXT NOT NULL,
            handle TEXT, 
            type TEXT NOT NULL, 
            bubble_position INTEGER UNIQUE NOT NULL, 
            logo_url TEXT, 
            twitter_user_id TEXT, 
            last_fetched_tweet_id TEXT
        );
        `,
        `
        CREATE TABLE IF NOT EXISTS tickers (
            id TEXT PRIMARY KEY,      -- CoinGecko ID, e.g., "bitcoin"
            symbol TEXT NOT NULL,     -- e.g., "BTC"
            name TEXT NOT NULL,       -- e.g., "Bitcoin"
            display_order INTEGER UNIQUE NOT NULL
        );
        `
    ];

    // Index creation queries - executed after tables are confirmed to exist.
    const indexQueries = [
        `CREATE INDEX IF NOT EXISTS idx_tweets_source_created ON tweets (source_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets (created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_sources_bubble_position ON sources (bubble_position);`,
        `CREATE INDEX IF NOT EXISTS idx_tickers_display_order ON tickers (display_order);`
    ];

    db.serialize(() => {
        let completedTableQueries = 0;
        const totalTableQueries = tableQueries.length;

        if (totalTableQueries === 0) {
            executeIndexQueries(callback); // No tables to create, try creating indexes
            return;
        }

        tableQueries.forEach((query) => {
            db.run(query, (err: Error | null) => {
                if (err) {
                    console.error('Error creating table:', err.message);
                }
                completedTableQueries++;
                if (completedTableQueries === totalTableQueries) {
                    executeIndexQueries(callback); // All tables created, now create indexes
                }
            });
        });
    });

    const executeIndexQueries = (finalCallback?: () => void) => {
        let completedIndexQueries = 0;
        const totalIndexQueries = indexQueries.length;

        if (totalIndexQueries === 0) {
            if (finalCallback) finalCallback();
            return;
        }

        indexQueries.forEach((query) => {
            db.run(query, (err: Error | null) => {
                if (err) {
                    console.error('Error creating index:', err.message);
                }
                completedIndexQueries++;
                if (completedIndexQueries === totalIndexQueries && finalCallback) {
                    finalCallback();
                }
            });
        });
    };
};

getDb(); // Initial call to setup DB

export const deleteOldTweets = (): Promise<number> => {
    return new Promise((resolve, reject) => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        // Use fetched_at to ensure we are deleting based on when we got the tweet,
        // or created_at if that's more aligned with the "ephemeral content" rule.
        // README says "Tweets older than 24 hours automatically disappear" - implies based on tweet's actual creation time.
        getDb().run("DELETE FROM tweets WHERE created_at < ?", [twentyFourHoursAgo], function(err) {
            if (err) {
                console.error('Error deleting old tweets:', err.message);
                return reject(err);
            }
            console.log(`Deleted ${this.changes} tweets older than 24 hours.`);
            resolve(this.changes);
        });
    });
};

export const removeSource = (sourceId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const dbInstance = getDb();
        dbInstance.serialize(() => {
            // Begin a transaction
            dbInstance.run("BEGIN TRANSACTION", (err: Error | null) => {
                if (err) return reject(err);

                // 1. Delete tweets associated with the source
                dbInstance.run("DELETE FROM tweets WHERE source_id = ?", [sourceId], function(errTweets: Error | null) {
                    if (errTweets) {
                        console.error(`Error deleting tweets for source ${sourceId}:`, errTweets.message);
                        // Rollback transaction on error
                        return dbInstance.run("ROLLBACK", () => reject(errTweets)); 
                    }
                    console.log(`Deleted tweets for source ${sourceId}: ${this.changes}`);

                    // 2. Delete the source itself
                    dbInstance.run("DELETE FROM sources WHERE id = ?", [sourceId], function(errSource: Error | null) {
                        if (errSource) {
                            console.error(`Error deleting source ${sourceId}:`, errSource.message);
                            return dbInstance.run("ROLLBACK", () => reject(errSource));
                        }
                        if (this.changes === 0) {
                            console.warn(`No source found with id ${sourceId} to delete.`);
                            // Still commit if no source found, as tweets might have been deleted or none existed
                        }
                        console.log(`Deleted source ${sourceId}: ${this.changes}`);

                        // Commit transaction
                        dbInstance.run("COMMIT", (errCommit: Error | null) => {
                            if (errCommit) return reject(errCommit);
                            resolve();
                        });
                    });
                });
            });
        });
    });
};

export type NewSourceData = Omit<SourceData, 'id' | 'lastFetchedTweetId' | 'type'> & {
    twitterUserId: string; // For Twitter sources, this will be the ID
    // Add other fields if we support non-Twitter sources that need different ID generation
};

export const addSource = (newSource: NewSourceData): Promise<void> => {
    return new Promise((resolve, reject) => {
        const dbInstance = getDb();
        const { name, handle, twitterUserId, bubblePosition, logoUrl } = newSource;

        // For Twitter sources, the twitterUserId is used as the primary 'id'
        const id = twitterUserId; 
        const type = 'twitter'; // Assuming 'twitter' type for now, expand if other types are added

        const sql = `
            INSERT INTO sources (id, name, handle, type, bubble_position, logo_url, twitter_user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        dbInstance.run(sql, [id, name, handle, type, bubblePosition, logoUrl, twitterUserId], function(err: Error | null) {
            if (err) {
                // SQLite specific error codes for constraints:
                // SQLITE_CONSTRAINT_PRIMARYKEY for id (twitterUserId)
                // SQLITE_CONSTRAINT_UNIQUE for bubble_position
                if (err.message.includes("UNIQUE constraint failed: sources.bubble_position")) {
                    console.error('Error adding source: Bubble position already taken.', err.message);
                    return reject(new Error(`Bubble position ${bubblePosition + 1} is already in use.`));
                } else if (err.message.includes("UNIQUE constraint failed: sources.id")) {
                    console.error('Error adding source: Twitter User ID already exists.', err.message);
                    return reject(new Error(`Source with Twitter User ID ${twitterUserId} already exists.`));
                }
                console.error('Error adding new source to database:', err.message);
                return reject(err);
            }
            if (this.changes === 0) {
                // This case should ideally be caught by the constraint violation errors above
                console.warn('No rows inserted when trying to add source, this might indicate an issue.');
                return reject(new Error('Failed to add source, no rows inserted.'));
            }
            console.log(`New source '${name}' added with ID ${id}`);
            resolve();
        });
    });
};

// We can export functions to interact with the DB here, e.g.:
// export const addTweet = (tweet) => { ... }; 