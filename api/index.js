const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// ==========================================
// SIMPLIFIED CORS CONFIGURATION FOR VERCEL
// ==========================================

const corsOptions = {
  origin: true, // Allow all origins for now
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ==========================================
// PLATFORM API CLASSES (VERCEL OPTIMIZED)
// ==========================================

class LeetCodeAPI {
    constructor() {
        this.baseURL = 'https://alfa-leetcode-api.onrender.com';
        this.timeout = 8000; // Reduced timeout for serverless
    }

    async getUserData(username) {
        try {
            const response = await axios.get(`${this.baseURL}/${username}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
            });

            return {
                status: "OK",
                platform: "leetcode",
                username: username,
                profile: response.data
            };
        } catch (error) {
            console.error(`LeetCode API Error for ${username}:`, error.message);
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
        this.timeout = 8000;
    }

    async getUserData(handle) {
        try {
            const response = await axios.get(`${this.baseURL}/user.info?handles=${handle}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
            });

            return {
                status: "OK",
                platform: "codeforces",
                username: handle,
                profile: response.data
            };
        } catch (error) {
            console.error(`CodeForces API Error for ${handle}:`, error.message);
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
        this.timeout = 8000;
    }

    async getUserData(handle) {
        try {
            const response = await axios.get(`${this.baseURL}/${handle}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
            });
            return {
                status: "OK",
                platform: "codechef",
                username: handle,
                data: response.data
            };
        } catch (error) {
            console.error(`CodeChef API Error for ${handle}:`, error.message);
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
        this.timeout = 8000;
    }

    async getUserData(username) {
        try {
            const response = await axios.get(`${this.baseURL}/${username}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
            });
            return {
                status: "OK",
                platform: "geeksforgeeks",
                username: username,
                data: response.data
            };
        } catch (error) {
            console.error(`GeeksForGeeks API Error for ${username}:`, error.message);
            return { 
                status: "FAILED", 
                platform: "geeksforgeeks", 
                username: username, 
                error: error.message 
            };
        }
    }
}

class GitHubAPI {
    constructor() {
        this.baseURL = 'https://api.github.com';
        this.timeout = 8000;
    }

    async getUserData(username) {
        try {
            const headers = {
                'User-Agent': 'MultiPlatform-Dashboard-API',
                'Accept': 'application/vnd.github.v3+json'
            };

            const response = await axios.get(`${this.baseURL}/users/${username}`, { 
                timeout: this.timeout, 
                headers 
            });

            return {
                status: "OK",
                platform: "github",
                username: username,
                profile: response.data
            };
        } catch (error) {
            console.error(`GitHub API Error for ${username}:`, error.message);
            return { 
                status: "FAILED", 
                platform: "github", 
                username: username, 
                error: error.message 
            };
        }
    }
}

// Initialize platform APIs
const platforms = {
    leetcode: new LeetCodeAPI(),
    codeforces: new CodeForcesAPI(),
    codechef: new CodeChefAPI(),
    geeksforgeeks: new GeeksForGeeksAPI(),
    github: new GitHubAPI()
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function generateAggregatedStats(platformData) {
    const stats = {
        platforms_connected: 0,
        successful_platforms: [],
        failed_platforms: [],
        platform_breakdown: {}
    };

    Object.entries(platformData).forEach(([platform, data]) => {
        if (data.status === "OK") {
            stats.platforms_connected++;
            stats.successful_platforms.push(platform);
            stats.platform_breakdown[platform] = extractPlatformStats(platform, data);
        } else {
            stats.failed_platforms.push(platform);
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
                problems_solved: data.data?.totalProblemsolved || 0,
                global_rank: data.data?.globalRank || 0
            };
        
        case 'geeksforgeeks':
            return {
                username: data.username,
                problems_solved: data.data?.totalProblemsSolved || 0,
                overall_score: data.data?.overallScore || 0,
                rank: data.data?.rank || 0
            };
        
        case 'github':
            return {
                username: data.username,
                public_repos: data.profile?.public_repos || 0,
                followers: data.profile?.followers || 0,
                following: data.profile?.following || 0
            };
        
        default:
            return { username: data.username };
    }
}

// ==========================================
// API ROUTES
// ==========================================

// Root route
app.get('/', (req, res) => {
    res.json({
        status: "OK",
        message: "Multi-Platform Dashboard API",
        version: "2.0.0",
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: "OK",
        message: "API is running",
        timestamp: new Date().toISOString(),
        supported_platforms: Object.keys(platforms)
    });
});

// Main aggregated dashboard endpoint
app.post('/api/dashboard/aggregated', async (req, res) => {
    try {
        const { usernames } = req.body;

        if (!usernames || typeof usernames !== 'object') {
            return res.status(400).json({
                status: "FAILED",
                message: "usernames object is required",
                example: {
                    usernames: {
                        leetcode: "john_doe",
                        codeforces: "johnD",
                        codechef: "john123",
                        github: "johndoe",
                        geeksforgeeks: "john.doe"
                    }
                }
            });
        }

        const result = {
            status: "OK",
            timestamp: new Date().toISOString(),
            usernames: usernames,
            platforms: {},
            aggregated_stats: {}
        };

        // Fetch data for each platform sequentially to avoid rate limits
        for (const [platform, username] of Object.entries(usernames)) {
            if (platforms[platform] && username) {
                try {
                    console.log(`Fetching ${platform} data for: ${username}`);
                    result.platforms[platform] = await platforms[platform].getUserData(username);
                    
                    // Small delay between requests
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                    console.error(`Error fetching ${platform}:`, error.message);
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

        res.json(result);

    } catch (error) {
        console.error('Error in aggregated dashboard:', error);
        res.status(500).json({
            status: "FAILED",
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Platform status endpoint
app.get('/api/platforms/status', (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        available_platforms: Object.keys(platforms),
        platform_status: {
            leetcode: "Available",
            codeforces: "Available", 
            codechef: "Available",
            geeksforgeeks: "Available",
            github: "Available"
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: "FAILED",
        message: "Endpoint not found",
        available_endpoints: [
            'GET /',
            'GET /api/health', 
            'POST /api/dashboard/aggregated',
            'GET /api/platforms/status'
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        status: "FAILED",
        message: "Internal server error",
        timestamp: new Date().toISOString()
    });
});

module.exports = app;