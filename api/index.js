const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// ==========================================
// COMPREHENSIVE CORS CONFIGURATION
// ==========================================

// CORS configuration to prevent CORS errors
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Define allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:5000',
      'http://localhost:8080',
      'https://cpunified.vercel.app',
      'https://your-custom-domain.com',
      // Add your actual frontend domains here
    ];
    
    // Allow any Vercel app domains
    if (origin.includes('.vercel.app') || 
        origin.includes('localhost') || 
        allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
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

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==========================================
// PLATFORM API CLASSES (OPTIMIZED FOR DEPLOYMENT)
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
        // Reduced delay for serverless environments
        this.rateLimitDelay = process.env.NODE_ENV === 'production' ? 500 : 1000;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class LeetCodeAPI {
    constructor() {
        this.baseURL = 'https://alfa-leetcode-api.onrender.com';
        this.timeout = 15000; // 15 second timeout
    }

    async getUserData(username) {
        try {
            const [profile, submissions, contest] = await Promise.allSettled([
                axios.get(`${this.baseURL}/${username}`, { 
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
                }),
                axios.get(`${this.baseURL}/${username}/submission`, { 
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
                }),
                axios.get(`${this.baseURL}/${username}/contest`, { 
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
                })
            ]);

            return {
                status: "OK",
                platform: "leetcode",
                username: username,
                profile: profile.status === 'fulfilled' ? profile.value.data : null,
                submissions: submissions.status === 'fulfilled' ? submissions.value.data : null,
                contests: contest.status === 'fulfilled' ? contest.value.data : null
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
        this.timeout = 10000;
    }

    async getUserData(handle) {
        try {
            await this.sleep(800); // Reduced delay for serverless
            
            const [userInfo, ratings, submissions] = await Promise.allSettled([
                axios.get(`${this.baseURL}/user.info?handles=${handle}`, { 
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
                }),
                axios.get(`${this.baseURL}/user.rating?handle=${handle}`, { 
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
                }),
                axios.get(`${this.baseURL}/user.status?handle=${handle}&count=100`, { 
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
                })
            ]);

            return {
                status: "OK",
                platform: "codeforces",
                username: handle,
                profile: userInfo.status === 'fulfilled' ? userInfo.value.data : null,
                ratings: ratings.status === 'fulfilled' ? ratings.value.data : null,
                submissions: submissions.status === 'fulfilled' ? submissions.value.data : null
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

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class CodeChefAPI {
    constructor() {
        this.baseURL = 'https://codechef-api.vercel.app/handle';
        this.timeout = 10000;
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
        this.timeout = 10000;
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

class HackerRankAPI {
    async getUserData(username) {
        return {
            status: "NOT_AVAILABLE",
            platform: "hackerrank",
            username: username,
            comment: "HackerRank requires private API access or web scraping"
        };
    }
}

class AtCoderAPI {
    constructor() {
        this.baseURL = 'https://kenkoooo.com/atcoder/atcoder-api';
        this.timeout = 10000;
    }

    async getUserData(username) {
        try {
            const [submissions, rankInfo] = await Promise.allSettled([
                axios.get(`${this.baseURL}/v3/user/submissions?user=${username}&from_second=0`, { 
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
                }),
                axios.get(`${this.baseURL}/v3/user/ac_rank?user=${username}`, { 
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
                })
            ]);

            return {
                status: "OK",
                platform: "atcoder",
                username: username,
                submissions: submissions.status === 'fulfilled' ? submissions.value.data : null,
                rank_info: rankInfo.status === 'fulfilled' ? rankInfo.value.data : null
            };
        } catch (error) {
            console.error(`AtCoder API Error for ${username}:`, error.message);
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
        this.timeout = 10000;
    }

    async getUserData(username) {
        try {
            const headers = {
                'User-Agent': 'MultiPlatform-Dashboard-API',
                'Accept': 'application/vnd.github.v3+json'
            };

            // Add GitHub token if available in environment
            if (process.env.GITHUB_TOKEN) {
                headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
            }

            const [profile, repos, events] = await Promise.allSettled([
                axios.get(`${this.baseURL}/users/${username}`, { 
                    timeout: this.timeout, 
                    headers 
                }),
                axios.get(`${this.baseURL}/users/${username}/repos?sort=updated&per_page=10`, { 
                    timeout: this.timeout, 
                    headers 
                }),
                axios.get(`${this.baseURL}/users/${username}/events/public?per_page=10`, { 
                    timeout: this.timeout, 
                    headers 
                })
            ]);

            return {
                status: "OK",
                platform: "github",
                username: username,
                profile: profile.status === 'fulfilled' ? profile.value.data : null,
                repositories: repos.status === 'fulfilled' ? repos.value.data : null,
                recent_activity: events.status === 'fulfilled' ? events.value.data : null
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
        total_problems_solved: 0,
        total_contests: 0,
        overall_rating: 0,
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
                contests_attended: data.contests?.contestAttend || 0,
                rating: data.profile?.ranking || 0
            };
        
        case 'codeforces':
            const userInfo = data.profile?.result?.[0];
            return {
                username: data.username,
                rating: userInfo?.rating || 0,
                max_rating: userInfo?.maxRating || 0,
                rank: userInfo?.rank || "unrated",
                contests_attended: data.ratings?.result?.length || 0,
                problems_solved: data.submissions?.result ? 
                    new Set(data.submissions.result
                        .filter(s => s.verdict === "OK")
                        .map(s => `${s.problem.contestId}-${s.problem.index}`)).size : 0
            };
        
        case 'codechef':
            return {
                username: data.username,
                rating: data.data?.currentRating || 0,
                max_rating: data.data?.highestRating || 0,
                problems_solved: data.data?.totalProblemsolved || 0,
                contests_attended: data.data?.contestsAttended || 0,
                global_rank: data.data?.globalRank || 0,
                country_rank: data.data?.countryRank || 0
            };
        
        case 'geeksforgeeks':
            return {
                username: data.username,
                problems_solved: data.data?.totalProblemsSolved || 0,
                overall_score: data.data?.overallScore || 0,
                monthly_score: data.data?.monthlyScore || 0,
                rank: data.data?.rank || 0
            };
        
        case 'github':
            return {
                username: data.username,
                public_repos: data.profile?.public_repos || 0,
                followers: data.profile?.followers || 0,
                following: data.profile?.following || 0,
                recent_commits: data.recent_activity?.length || 0
            };
        
        case 'atcoder':
            return {
                username: data.username,
                submissions_count: data.submissions?.length || 0,
                rank_info: data.rank_info || null
            };
        
        default:
            return { username: data.username };
    }
}

// Initialize APIs
const multiAPI = new MultiPlatformAPI();

// ==========================================
// API ROUTES
// ==========================================

// Root route
app.get('/', (req, res) => {
    res.json({
        status: "OK",
        message: "Multi-Platform Dashboard API",
        version: "2.0.0",
        documentation: "/api/health",
        endpoints: {
            health: "GET /api/health",
            aggregated_dashboard: "POST /api/dashboard/aggregated",
            single_user: "GET /api/dashboard/aggregated/:username",
            platform_status: "GET /api/platforms/status"
        }
    });
});

// Main aggregated dashboard endpoint
app.post('/api/dashboard/aggregated', async (req, res) => {
    const { usernames } = req.body;

    if (!usernames || typeof usernames !== 'object') {
        return res.status(400).json({
            status: "FAILED",
            comment: "usernames object is required with platform-specific usernames",
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

    try {
        const result = {
            status: "OK",
            timestamp: new Date().toISOString(),
            usernames: usernames,
            platforms: {},
            aggregated_stats: {}
        };

        console.log(`Fetching data for usernames:`, usernames);

        // Fetch data with improved error handling
        const fetchPromises = Object.entries(usernames).map(async ([platform, username]) => {
            if (multiAPI.platforms[platform] && username) {
                try {
                    console.log(`Fetching ${platform} data for username: ${username}`);
                    const data = await multiAPI.platforms[platform].getUserData(username);
                    result.platforms[platform] = data;
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
        });

        await Promise.all(fetchPromises);

        // Generate aggregated statistics
        result.aggregated_stats = generateAggregatedStats(result.platforms);

        console.log('Aggregated dashboard data fetched successfully');
        res.json(result);

    } catch (error) {
        console.error('Error in aggregated dashboard:', error);
        res.status(500).json({
            status: "FAILED",
            comment: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Single username fallback
app.get('/api/dashboard/aggregated/:username', async (req, res) => {
    const { username } = req.params;
    const { platforms = 'leetcode,codeforces,codechef,geeksforgeeks,github,atcoder' } = req.query;

    const requestedPlatforms = platforms.split(',');

    try {
        const result = {
            status: "OK",
            username: username,
            timestamp: new Date().toISOString(),
            platforms: {},
            aggregated_stats: {},
            note: "This endpoint assumes same username across all platforms. Use POST /api/dashboard/aggregated for different usernames."
        };

        console.log(`Fetching data for ${username} from platforms: ${requestedPlatforms.join(', ')}`);

        for (const platform of requestedPlatforms) {
            if (multiAPI.platforms[platform]) {
                try {
                    console.log(`Fetching ${platform} data...`);
                    result.platforms[platform] = await multiAPI.platforms[platform].getUserData(username);
                    await multiAPI.sleep(multiAPI.rateLimitDelay);
                } catch (error) {
                    console.error(`Error fetching ${platform}:`, error);
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
        console.error('Error in aggregated dashboard:', error);
        res.status(500).json({
            status: "FAILED",
            comment: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Platform status endpoint
app.get('/api/platforms/status', (req, res) => {
    const platformStatus = {
        leetcode: "Available - Profile, submissions, contests",
        codeforces: "Available - Profile, ratings, submissions", 
        codechef: "Available - Profile, contests, problems solved",
        geeksforgeeks: "Available - Profile, problems solved, scores",
        github: "Available - Profile, repositories, activity",
        atcoder: "Available - Submissions, rankings",
        hackerrank: "Not Available - Requires private API",
        interviewbit: "Not Available - No public API",
        codestudio: "Not Available - No public API"
    };

    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        platforms: platformStatus,
        available_platforms: Object.keys(platformStatus).filter(p => 
            platformStatus[p].includes("Available")
        ),
        cors_enabled: true,
        deployment_ready: true
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: "OK",
        message: "Multi-Platform Dashboard API - Deployment Ready",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        cors_enabled: true,
        supported_platforms: Object.keys(multiAPI.platforms),
        endpoints: [
            'POST /api/dashboard/aggregated - Aggregated dashboard with different usernames',
            'GET /api/dashboard/aggregated/:username - Single username across platforms',
            'GET /api/platforms/status - Platform availability',
            'GET /api/health - Health check'
        ],
        deployment: {
            vercel_ready: true,
            netlify_ready: true,
            railway_ready: true,
            render_ready: true
        }
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        status: "FAILED",
        comment: "Internal server error",
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        status: "FAILED",
        comment: "Endpoint not found",
        available_endpoints: [
            'GET /',
            'GET /api/health', 
            'POST /api/dashboard/aggregated',
            'GET /api/dashboard/aggregated/:username',
            'GET /api/platforms/status'
        ]
    });
});

// Export for serverless deployment
module.exports = app;

// Start server only if not in serverless environment
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Multi-Platform Dashboard API running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🎯 CORS enabled for all origins in development`);
        console.log(`🌍 Deployment ready for Vercel, Netlify, Railway, Render`);
    });
}
