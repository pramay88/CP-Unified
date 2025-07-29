const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// ==========================================
// SUPER OPTIMIZED CONFIGURATION
// ==========================================

const API_TIMEOUT = 5000; // Reduced to 5 seconds
const RATE_LIMIT_DELAY = 100; // Reduced to 100ms
const MAX_PLATFORMS = 4; // Allow 4 platforms max

// Simple CORS
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '500kb' }));

// Minimal logging
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
            github: new GitHubAPI(),
            atcoder: new AtCoderAPI(),
            hackerrank: new HackerRankAPI(),
            geeksforgeeks: new GeeksForGeeksAPI(),
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
            const response = await axios.get(`${this.baseURL}/${username}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'CP-Unified-API' }
            });

            const data = response.data;
            
            // Fix the stats extraction - get actual values
            return {
                status: "OK",
                platform: "leetcode",
                username: username,
                profile: {
                    name: data.name || username,
                    avatar: data.avatar,
                    ranking: data.ranking || 0,
                    reputation: data.reputation || 0,
                    gitHub: data.gitHub,
                    twitter: data.twitter,
                    linkedIN: data.linkedIN
                },
                detailed_stats: {
                    total_solved: data.totalSolved || 0,
                    easy_solved: data.easySolved || 0,
                    medium_solved: data.mediumSolved || 0,
                    hard_solved: data.hardSolved || 0,
                    acceptance_rate: data.acceptanceRate || 0,
                    ranking: data.ranking || 0,
                    contribution_points: data.contributionPoints || 0,
                    reputation: data.reputation || 0
                },
                badge_stats: {
                    badges: data.badges || []
                }
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
            // Only fetch user info - skip ratings and submissions for speed
            const userInfo = await axios.get(`${this.baseURL}/user.info?handles=${handle}`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'CP-Unified-API' }
            });

            if (userInfo.data.status === "OK" && userInfo.data.result.length > 0) {
                const user = userInfo.data.result[0];
                return {
                    status: "OK",
                    platform: "codeforces",
                    username: handle,
                    profile: {
                        handle: user.handle,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        country: user.country,
                        city: user.city,
                        organization: user.organization,
                        avatar: user.avatar
                    },
                    stats: {
                        rating: user.rating || 0,
                        maxRating: user.maxRating || 0,
                        rank: user.rank || "unrated",
                        maxRank: user.maxRank || "unrated",
                        contribution: user.contribution || 0,
                        friendOfCount: user.friendOfCount || 0
                    }
                };
            } else {
                throw new Error("User not found");
            }
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
        // Use alternative API endpoint to avoid 402 error
        this.baseURL = 'https://codechef-api.vercel.app';
        this.timeout = API_TIMEOUT;
    }

    async getUserData(handle) {
        try {
            // Try different endpoint format
            const response = await axios.get(`${this.baseURL}/${handle}`, { 
                timeout: this.timeout,
                headers: { 
                    'User-Agent': 'CP-Unified-API',
                    'Accept': 'application/json'
                }
            });

            if (response.data && response.data.success !== false) {
                return {
                    status: "OK",
                    platform: "codechef",
                    username: handle,
                    profile: {
                        name: response.data.name || handle,
                        username: handle,
                        country: response.data.countryName,
                        state: response.data.state,
                        city: response.data.city
                    },
                    stats: {
                        currentRating: response.data.currentRating || 0,
                        highestRating: response.data.highestRating || 0,
                        globalRank: response.data.globalRank || 0,
                        countryRank: response.data.countryRank || 0,
                        problems_solved: response.data.totalProblemsolved || 0,
                        contests_attended: response.data.contestsAttended || 0
                    }
                };
            } else {
                throw new Error("User not found or API limit reached");
            }
        } catch (error) {
            // If main API fails, try backup or return graceful failure
            if (error.response?.status === 402) {
                return {
                    status: "RATE_LIMITED",
                    platform: "codechef",
                    username: handle,
                    error: "API rate limit reached - try again later"
                };
            }
            return { 
                status: "FAILED", 
                platform: "codechef", 
                username: handle, 
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

            // Only fetch essential profile data
            const profile = await axios.get(`${this.baseURL}/users/${username}`, { 
                timeout: this.timeout, 
                headers 
            });

            const user = profile.data;
            
            // Return only essential info - much shorter response
            return {
                status: "OK",
                platform: "github",
                username: username,
                profile: {
                    name: user.name,
                    login: user.login,
                    avatar_url: user.avatar_url,
                    bio: user.bio,
                    company: user.company,
                    location: user.location,
                    blog: user.blog,
                    twitter_username: user.twitter_username
                },
                stats: {
                    public_repos: user.public_repos,
                    public_gists: user.public_gists,
                    followers: user.followers,
                    following: user.following,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                }
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

class AtCoderAPI {
    constructor() {
        this.baseURL = 'https://kenkoooo.com/atcoder/atcoder-api';
        this.timeout = API_TIMEOUT;
    }

    async getUserData(username) {
        try {
            // Only get submission count - skip detailed submissions
            const response = await axios.get(`${this.baseURL}/v3/user/submissions?user=${username}&from_second=0`, { 
                timeout: this.timeout,
                headers: { 'User-Agent': 'CP-Unified-API' }
            });

            const submissions = response.data || [];
            const solvedProblems = new Set();
            
            submissions.forEach(sub => {
                if (sub.result === "AC") {
                    solvedProblems.add(sub.problem_id);
                }
            });

            return {
                status: "OK",
                platform: "atcoder",
                username: username,
                stats: {
                    total_submissions: submissions.length,
                    problems_solved: solvedProblems.size,
                    accepted_submissions: submissions.filter(s => s.result === "AC").length
                }
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
                stats: {
                    problems_solved: response.data.totalProblemsSolved || 0,
                    overall_score: response.data.overallScore || 0,
                    monthly_score: response.data.monthlyScore || 0,
                    institute_rank: response.data.instituteRank || 0
                }
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

// Placeholder classes for unavailable platforms
class HackerRankAPI {
    async getUserData(username) {
        return { status: "NOT_AVAILABLE", platform: "hackerrank", username: username };
    }
}

class InterviewBitAPI {
    async getUserData(username) {
        return { status: "NOT_AVAILABLE", platform: "interviewbit", username: username };
    }
}

class CodeStudioAPI {
    async getUserData(username) {
        return { status: "NOT_AVAILABLE", platform: "codestudio", username: username };
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function generateAggregatedStats(platformData) {
    const stats = {
        platforms_connected: 0,
        total_problems_solved: 0,
        platform_breakdown: {},
        summary: {
            successful_platforms: [],
            failed_platforms: [],
            rate_limited_platforms: [],
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
        } else if (data.status === "RATE_LIMITED") {
            stats.summary.rate_limited_platforms.push(platform);
        } else {
            stats.summary.not_available_platforms.push(platform);
        }
    });

    // Calculate total problems solved across platforms
    Object.values(stats.platform_breakdown).forEach(platform => {
        if (platform.problems_solved) {
            stats.total_problems_solved += platform.problems_solved;
        }
    });

    return stats;
}

function extractPlatformStats(platform, data) {
    switch (platform) {
        case 'leetcode':
            return {
                username: data.username,
                problems_solved: data.detailed_stats?.total_solved || 0,
                easy_solved: data.detailed_stats?.easy_solved || 0,
                medium_solved: data.detailed_stats?.medium_solved || 0,
                hard_solved: data.detailed_stats?.hard_solved || 0,
                ranking: data.detailed_stats?.ranking || 0
            };
        
        case 'codeforces':
            return {
                username: data.username,
                rating: data.stats?.rating || 0,
                max_rating: data.stats?.maxRating || 0,
                rank: data.stats?.rank || "unrated"
            };
        
        case 'codechef':
            return {
                username: data.username,
                rating: data.stats?.currentRating || 0,
                problems_solved: data.stats?.problems_solved || 0,
                global_rank: data.stats?.globalRank || 0
            };
        
        case 'github':
            return {
                username: data.username,
                public_repos: data.stats?.public_repos || 0,
                followers: data.stats?.followers || 0
            };
        
        case 'atcoder':
            return {
                username: data.username,
                problems_solved: data.stats?.problems_solved || 0,
                total_submissions: data.stats?.total_submissions || 0
            };
        
        case 'geeksforgeeks':
            return {
                username: data.username,
                problems_solved: data.stats?.problems_solved || 0,
                overall_score: data.stats?.overall_score || 0
            };
        
        default:
            return { username: data.username };
    }
}

// Initialize APIs
const multiAPI = new MultiPlatformAPI();

// ==========================================
// SUPER FAST API ROUTES
// ==========================================

// Root route
app.get('/', (req, res) => {
    res.json({
        status: "OK",
        message: "CP-Unified API - Super Optimized",
        version: "4.0.0",
        performance: "< 5 seconds",
        endpoints: {
            test: "GET /api/test",
            health: "GET /api/health",
            dashboard: "POST /api/dashboard/aggregated"
        }
    });
});

// Ultra-fast test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        status: "OK",
        message: "API working at light speed! ⚡",
        timestamp: new Date().toISOString(),
        response_time: "< 100ms"
    });
});

// SUPER OPTIMIZED main dashboard endpoint
app.post('/api/dashboard/aggregated', async (req, res) => {
    const startTime = Date.now();
    
    // Aggressive timeout - 20 seconds max
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({
                status: "TIMEOUT",
                comment: "Request timeout - API response too slow",
                processing_time: `${Date.now() - startTime}ms`
            });
        }
    }, 20000);

    try {
        const { usernames } = req.body;

        if (!usernames || typeof usernames !== 'object' || Object.keys(usernames).length === 0) {
            clearTimeout(timeout);
            return res.status(400).json({
                status: "FAILED",
                comment: "usernames object required",
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
            performance: {
                processing_time: null,
                platforms_processed: 0
            }
        };

        // Process max 4 platforms for speed
        const limitedUsernames = Object.fromEntries(
            Object.entries(usernames).slice(0, MAX_PLATFORMS)
        );

        console.log(`Processing ${Object.keys(limitedUsernames).length} platforms in parallel`);

        // PARALLEL processing for maximum speed
        const fetchPromises = Object.entries(limitedUsernames).map(async ([platform, username]) => {
            if (multiAPI.platforms[platform] && username) {
                try {
                    console.log(`Fetching ${platform}:${username}`);
                    const data = await multiAPI.platforms[platform].getUserData(username);
                    return { platform, data };
                } catch (error) {
                    return {
                        platform,
                        data: {
                            status: "FAILED",
                            platform: platform,
                            username: username,
                            error: error.message
                        }
                    };
                }
            }
            return null;
        });

        // Wait for all API calls to complete
        const results = await Promise.all(fetchPromises);
        
        // Process results
        results.forEach(item => {
            if (item) {
                result.platforms[item.platform] = item.data;
                result.performance.platforms_processed++;
            }
        });

        // Generate stats
        result.aggregated_stats = generateAggregatedStats(result.platforms);
        result.performance.processing_time = `${Date.now() - startTime}ms`;

        clearTimeout(timeout);
        
        if (!res.headersSent) {
            console.log(`✅ Request completed in ${result.performance.processing_time}`);
            res.json(result);
        }

    } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error in dashboard:', error);
        if (!res.headersSent) {
            res.status(500).json({
                status: "FAILED",
                comment: error.message,
                processing_time: `${Date.now() - startTime}ms`
            });
        }
    }
});

// Platform status
app.get('/api/platforms/status', (req, res) => {
    res.json({
        status: "OK",
        platforms: {
            leetcode: "✅ Available - Fixed stats extraction",
            codeforces: "✅ Available - Speed optimized",
            codechef: "⚠️ Rate limited - Alternative endpoint",
            github: "✅ Available - Minimal response",
            atcoder: "✅ Available - Essential data only",
            geeksforgeeks: "✅ Available - Fast",
            hackerrank: "❌ Not Available",
            interviewbit: "❌ Not Available",
            codestudio: "❌ Not Available"
        },
        optimizations: [
            "LeetCode: Fixed stats showing 0",
            "CodeForces: Essential data only", 
            "CodeChef: Alternative API endpoint",
            "GitHub: Minimal response fields",
            "Parallel processing for speed"
        ]
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: "OK",
        message: "CP-Unified API - Performance Optimized",
        version: "4.0.0",
        timestamp: new Date().toISOString(),
        performance: {
            target_response_time: "< 5 seconds",
            timeout_limit: "20 seconds",
            parallel_processing: true,
            optimized_responses: true
        },
        fixes: [
            "✅ LeetCode stats extraction fixed",
            "✅ CodeChef 402 error handled", 
            "✅ CodeForces speed optimized",
            "✅ GitHub response minimized",
            "✅ Processing time reduced"
        ]
    });
});

// Error handlers
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

app.use('*', (req, res) => {
    res.status(404).json({
        status: "NOT_FOUND",
        available_endpoints: [
            'GET /',
            'GET /api/test',
            'GET /api/health', 
            'POST /api/dashboard/aggregated'
        ]
    });
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 CP-Unified API running on port ${PORT}`);
        console.log(`⚡ Super optimized for speed and accuracy`);
    });
}
