const db = require('../db');

class StatsService {
    static getStats() {
        const stats = db.prepare('SELECT COUNT(DISTINCT user_id) as users, COUNT(*) as requests, AVG(processing_time_ms) as avgTime FROM activity').get();
        return { totalUsers: stats.users || 0, totalRequests: stats.requests || 0, avgResponseTime: Math.round(stats.avgTime) || 0 };
    }

    static getTopUsers(limit = 5) {
        return db.prepare('SELECT u.id, u.username, COUNT(a.id) as count FROM activity a JOIN users u ON a.user_id = u.id GROUP BY u.id ORDER BY count DESC LIMIT ?').all(limit);
    }

    static getBanStats() {
        const bans = db.prepare('SELECT COUNT(*) as count FROM bans').get().count;
        return { totalBans: bans };
    }
}

module.exports = StatsService;
