const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// ==========================================
// OPTIMIZED CONFIGURATION FOR VERCEL
// ==========================================

// Reduced timeouts for serverless environment
const API_TIMEOUT = 8000; // 8 seconds instead of 15
const RATE_LIMIT_DELAY = 200; // Reduced from 500-1000ms
const MAX_PLATFORMS = 3; // Limit concurrent platforms to avoid timeout

// Simple CORS configuration for better performance
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Lightweight middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Simple request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ==========================================
// OPTIMIZED PLATFORM API CLASSES
// ==========================================

class MultiPlatformAPI {
    constructor() {
        this.platforms = {
            leetcode: new LeetCodeAPI(),
            codeforces: new CodeForcesAPI(),
            codechef: new CodeChefAPI(),
            geeksforgeeks: new GeeksForGeeksAPI(),
            hackerrank: new HackerRankAPI(),
            atcoder: new AtCoderAPI(),
            github: new GitHubAPI(),
            interviewbit: new InterviewBitAPI(),
            codestudio: new CodeStudioAPI()
        };
        this.rateLimitDelay = RATE_LIMIT_DELAY;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class LeetCodeAPI {
    constructor() {
        this.baseURL = 'https://alfa-leetcode-api.onrender.com';
        this.timeout = API_TIMEOUT;
    }

    async getUserData(username) {
        try {
            // Only fetch profile for faster response
            const profile = await axios.get(`${this.baseURL}/${username}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'CP-Unified-API' }
            });

            return {
                status: "OK",
                platform: "leetcode",
                username: username,
                profile: profile.data,
                // Skip heavy data for performance
                submissions: null,
                contests: null
            };
        } catch (error) {
            return { 
                status: "FAILED", 
                platform: "leetcode", 
                username: username, 
                error: error.message 
            };
        }
    }
}

class CodeForcesAPI {
    constructor() {
        this.baseURL = 'https://codeforces.com/api';
        this.timeout = API_TIMEOUT;
    }

    async getUserData(handle) {
        try {
            // Only fetch user info for performance
            const userInfo = await axios.get(`${this.baseURL}/user.info?handles=${handle}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'CP-Unified-API' }
            });

            return {
                status: "OK",
                platform: "codeforces",
                username: handle,
                profile: userInfo.data,
                // Skip heavy data
                ratings: null,
                submissions: null
            };
        } catch (error) {
            return { 
                status: "FAILED", 
                platform: "codeforces", 
                username: handle, 
                error: error.message 
            };
        }
    }
}

class CodeChefAPI {
    constructor() {
        this.baseURL = 'https://codechef-api.vercel.app/handle';
        this.timeout = API_TIMEOUT;
    }

    async getUserData(handle) {
        try {
            const response = await axios.get(`${this.baseURL}/${handle}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'CP-Unified-API' }
            });
            return {
                status: "OK",
                platform: "codechef",
                username: handle,
                data: response.data
            };
        } catch (error) {
            return { 
                status: "FAILED", 
                platform: "codechef", 
                username: handle, 
                error: error.message 
            };
        }
    }
}

class GeeksForGeeksAPI {
    constructor() {
        this.baseURL = 'https://geeks-for-geeks-api.vercel.app';
        this.timeout = API_TIMEOUT;
    }

    async getUserData(username) {
        try {
            const response = await axios.get(`${this.baseURL}/${username}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'CP-Unified-API' }
            });
            return {
                status: "OK",
                platform: "geeksforgeeks",
                username: username,
                data: response.data
            };
        } catch (error) {
            return { 
                status: "FAILED", 
                platform: "geeksforgeeks", 
                username: username, 
                error: error.message 
            };
        }
    }
}

class HackerRankAPI {
    async getUserData(username) {
        return {
            status: "NOT_AVAILABLE",
            platform: "hackerrank",
            username: username,
            comment: "HackerRank requires private API access"
        };
    }
}

class AtCoderAPI {
    constructor() {
        this.baseURL = 'https://kenkoooo.com/atcoder/atcoder-api';
        this.timeout = API_TIMEOUT;
    }

    async getUserData(username) {
        try {
            // Only fetch basic submissions count
            const submissions = await axios.get(`${this.baseURL}/v3/user/submissions?user=${username}&from_second=0`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'CP-Unified-API' }
            });

            return {
                status: "OK",
                platform: "atcoder",
                username: username,
                submissions: submissions.data ? submissions.data.slice(0, 10) : null, // Limit data
                rank_info: null
            };
        } catch (error) {
            return { 
                status: "FAILED", 
                platform: "atcoder", 
                username: username, 
                error: error.message 
            };
        }
    }
}

class GitHubAPI {
    constructor() {
        this.baseURL = 'https://api.github.com';
        this.timeout = API_TIMEOUT;
    }

    async getUserData(username) {
        try {
            const headers = {
                'User-Agent': 'CP-Unified-API',
                'Accept': 'application/vnd.github.v3+json'
            };

            if (process.env.GITHUB_TOKEN) {
                headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
            }

            // Only fetch profile for performance
            const profile = await axios.get(`${this.baseURL}/users/${username}`, { 
                timeout: this.timeout, 
                headers 
            });

            return {
                status: "OK",
                platform: "github",
                username: username,
                profile: profile.data,
                repositories: null, // Skip for performance
                recent_activity: null
            };
        } catch (error) {
            return { 
                status: "FAILED", 
                platform: "github", 
                username: username, 
                error: error.message 
            };
        }
    }
}

class InterviewBitAPI {
    async getUserData(username) {
        return {
            status: "NOT_AVAILABLE",
            platform: "interviewbit",
            username: username,
            comment: "InterviewBit doesn't provide public API access"
        };
    }
}

class CodeStudioAPI {
    async getUserData(username) {
        return {
            status: "NOT_AVAILABLE",
            platform: "codestudio",
            username: username,
            comment: "CodeStudio doesn't provide public API access"
        };
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function generateAggregatedStats(platformData) {
    const stats = {
        platforms_connected: 0,
        platform_breakdown: {},
        summary: {
            successful_platforms: [],
            failed_platforms: [],
            not_available_platforms: []
        }
    };

    Object.entries(platformData).forEach(([platform, data]) => {
        if (data.status === "OK") {
            stats.platforms_connected++;
            stats.platform_breakdown[platform] = extractPlatformStats(platform, data);
            stats.summary.successful_platforms.push(platform);
        } else if (data.status === "FAILED") {
            stats.summary.failed_platforms.push(platform);
        } else {
            stats.summary.not_available_platforms.push(platform);
        }
    });

    return stats;
}

function extractPlatformStats(platform, data) {
    switch (platform) {
        case 'leetcode':
            return {
                username: data.username,
                problems_solved: data.profile?.totalSolved || 0,
                easy_solved: data.profile?.easySolved || 0,
                medium_solved: data.profile?.mediumSolved || 0,
                hard_solved: data.profile?.hardSolved || 0,
                rating: data.profile?.ranking || 0
            };
        
        case 'codeforces':
            const userInfo = data.profile?.result?.[0];
            return {
                username: data.username,
                rating: userInfo?.rating || 0,
                max_rating: userInfo?.maxRating || 0,
                rank: userInfo?.rank || "unrated"
            };
        
        case 'codechef':
            return {
                username: data.username,
                rating: data.data?.currentRating || 0,
                max_rating: data.data?.highestRating || 0,
                problems_solved: data.data?.totalProblemsolved || 0
            };
        
        case 'geeksforgeeks':
            return {
                username: data.username,
                problems_solved: data.data?.totalProblemsSolved || 0,
                overall_score: data.data?.overallScore || 0
            };
        
        case 'github':
            return {
                username: data.username,
                public_repos: data.profile?.public_repos || 0,
                followers: data.profile?.followers || 0
            };
        
        case 'atcoder':
            return {
                username: data.username,
                submissions_count: data.submissions?.length || 0
            };
        
        default:
            return { username: data.username };
    }
}

// Initialize APIs
const multiAPI = new MultiPlatformAPI();

// ==========================================
// API ROUTES (OPTIMIZED FOR VERCEL)
// ==========================================

// Root route
app.get('/', (req, res) => {
    res.json({
        status: "OK",
        message: "CP-Unified Multi-Platform Dashboard API",
        version: "3.0.0",
        endpoints: {
            health: "GET /api/health",
            test: "GET /api/test", 
            aggregated_dashboard: "POST /api/dashboard/aggregated",
            single_user: "GET /api/dashboard/aggregated/:username",
            platform_status: "GET /api/platforms/status"
        }
    });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        status: "OK",
        message: "API is working perfectly!",
        timestamp: new Date().toISOString(),
        vercel_deployment: "SUCCESS"
    });
});

// Optimized main aggregated dashboard endpoint
app.post('/api/dashboard/aggregated', async (req, res) => {
    const startTime = Date.now();
    
    // Set response timeout
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({
                status: "TIMEOUT",
                comment: "Request timeout - processing took too long",
                suggestion: "Try with fewer platforms or check platform status"
            });
        }
    }, 25000); // 25 seconds timeout

    try {
        const { usernames } = req.body;

        if (!usernames || typeof usernames !== 'object' || Object.keys(usernames).length === 0) {
            clearTimeout(timeout);
            return res.status(400).json({
                status: "FAILED",
                comment: "usernames object is required with platform-specific usernames",
                example: {
                    usernames: {
                        leetcode: "john_doe",
                        codeforces: "tourist", 
                        github: "torvalds"
                    }
                }
            });
        }

        const result = {
            status: "OK",
            timestamp: new Date().toISOString(),
            usernames: usernames,
            platforms: {},
            aggregated_stats: {},
            processing_time: null
        };

        // Limit to first 3 platforms to avoid timeout
        const limitedUsernames = Object.fromEntries(
            Object.entries(usernames).slice(0, MAX_PLATFORMS)
        );

        console.log(`Processing ${Object.keys(limitedUsernames).length} platforms:`, Object.keys(limitedUsernames));

        // Sequential processing to avoid overwhelming external APIs
        for (const [platform, username] of Object.entries(limitedUsernames)) {
            if (multiAPI.platforms[platform] && username) {
                try {
                    console.log(`Fetching ${platform} data for: ${username}`);
                    const data = await multiAPI.platforms[platform].getUserData(username);
                    result.platforms[platform] = data;
                    
                    // Small delay between requests
                    await multiAPI.sleep(multiAPI.rateLimitDelay);
                } catch (error) {
                    console.error(`Error fetching ${platform} data:`, error);
                    result.platforms[platform] = {
                        status: "FAILED",
                        platform: platform,
                        username: username,
                        error: error.message
                    };
                }
            }
        }

        // Generate aggregated statistics
        result.aggregated_stats = generateAggregatedStats(result.platforms);
        result.processing_time = `${Date.now() - startTime}ms`;

        clearTimeout(timeout);
        
        if (!res.headersSent) {
            console.log(`Request completed in ${result.processing_time}`);
            res.json(result);
        }

    } catch (error) {
        clearTimeout(timeout);
        console.error('Error in aggregated dashboard:', error);
        if (!res.headersSent) {
            res.status(500).json({
                status: "FAILED",
                comment: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
});

// Simple single username endpoint
app.get('/api/dashboard/aggregated/:username', async (req, res) => {
    const { username } = req.params;
    const { platforms = 'leetcode,github' } = req.query; // Default to fast platforms

    try {
        const requestedPlatforms = platforms.split(',').slice(0, 2); // Limit to 2 platforms

        const result = {
            status: "OK",
            username: username,
            timestamp: new Date().toISOString(),
            platforms: {},
            note: "Limited to 2 platforms for optimal performance"
        };

        for (const platform of requestedPlatforms) {
            if (multiAPI.platforms[platform]) {
                try {
                    result.platforms[platform] = await multiAPI.platforms[platform].getUserData(username);
                    await multiAPI.sleep(200);
                } catch (error) {
                    result.platforms[platform] = {
                        status: "FAILED",
                        platform: platform,
                        username: username,
                        error: error.message
                    };
                }
            }
        }

        result.aggregated_stats = generateAggregatedStats(result.platforms);
        res.json(result);

    } catch (error) {
        res.status(500).json({
            status: "FAILED",
            comment: error.message
        });
    }
});

// Platform status endpoint
app.get('/api/platforms/status', (req, res) => {
    const platformStatus = {
        leetcode: "Available - Fast",
        codeforces: "Available - Medium Speed", 
        codechef: "Available - Medium Speed",
        geeksforgeeks: "Available - Fast",
        github: "Available - Fast",
        atcoder: "Available - Slow",
        hackerrank: "Not Available",
        interviewbit: "Not Available",
        codestudio: "Not Available"
    };

    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        platforms: platformStatus,
        recommended_for_fast_response: ["leetcode", "github", "geeksforgeeks"],
        vercel_optimized: true
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: "OK",
        message: "CP-Unified API - Vercel Optimized",
        version: "3.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        deployment: "Vercel Ready",
        optimizations: [
            "Reduced API timeouts",
            "Limited concurrent requests",
            "Sequential processing",
            "Lightweight responses",
            "Function timeout handling"
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    if (!res.headersSent) {
        res.status(500).json({
            status: "FAILED",
            comment: "Internal server error",
            timestamp: new Date().toISOString()
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: "NOT_FOUND",
        comment: "Endpoint not found",
        available_endpoints: [
            'GET /',
            'GET /api/test',
            'GET /api/health', 
            'POST /api/dashboard/aggregated',
            'GET /api/platforms/status'
        ]
    });
});

// Export for Vercel
module.exports = app;

// Only start server if not in serverless environment
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 CP-Unified API running on port ${PORT}`);
        console.log(`🔗 https://cp-unified.vercel.app/api/health`);
    });
}
