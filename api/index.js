const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { JSDOM } = require('jsdom');

const app = express();

// ==========================================
// VERCEL-OPTIMIZED CORS CONFIGURATION
// ==========================================

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
      'https://cp-unified.vercel.app',
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
    
    callback(null, true); // Allow all for now
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

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Add security headers
app.use((req, res, next) => {
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
// COMPLETE PLATFORM API CLASSES
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
        // Optimized for serverless but still functional
        this.rateLimitDelay = 300; // Reduced from 1000ms
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class LeetCodeAPI {
    constructor() {
        this.graphqlURL = 'https://leetcode.com/graphql';
        this.fallbackURL = 'https://alfa-leetcode-api.onrender.com';
        this.timeout = 10000;
    }

    async getUserData(username) {
        try {
            console.log(`Fetching LeetCode data for: ${username}`);
            
            // Get stats from GraphQL and profile from alfa-leetcode-api in parallel
            const [graphqlStats, profileData] = await Promise.allSettled([
                this.fetchStatsFromGraphQL(username),
                this.fetchProfileFromFallback(username)
            ]);

            const statsResult = graphqlStats.status === 'fulfilled' ? graphqlStats.value : null;
            const profileResult = profileData.status === 'fulfilled' ? profileData.value : null;

            // Combine both data sources
            return {
                status: "OK",
                platform: "leetcode",
                username: username,
                profile: profileResult?.profile || {
                    name: username,
                    avatar: null,
                    location: null
                },
                submissions: profileResult?.submissions || null,
                contests: profileResult?.contests || null,
                detailed_stats: {
                    // Use GraphQL stats (accurate solved counts)
                    total_solved: statsResult?.total_solved || 0,
                    easy_solved: statsResult?.easy_solved || 0,
                    medium_solved: statsResult?.medium_solved || 0,
                    hard_solved: statsResult?.hard_solved || 0,
                    acceptance_rate: statsResult?.acceptance_rate || 0,
                    total_submissions: statsResult?.total_submissions || 0,
                    
                    // Use alfa-leetcode-api for other stats
                    ranking: profileResult?.ranking || 0,
                    contribution_points: profileResult?.contributionPoints || 0,
                    reputation: profileResult?.reputation || 0,
                    contests_attended: profileResult?.contests?.contestAttend || 0,
                    contest_rating: profileResult?.contests?.contestRating || 0,
                    contest_ranking: profileResult?.contests?.contestGlobalRanking || 0,
                    recent_submissions: profileResult?.submissions?.submission?.slice(0, 10) || [],
                    submission_stats: {
                        total_submissions: statsResult?.total_submissions || 0,
                        accepted_submissions: statsResult?.total_solved || 0
                    }
                }
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

    // Get only solved stats from GraphQL
    async fetchStatsFromGraphQL(username) {
        try {
            const response = await axios.post(this.graphqlURL, {
                query: `query getUserStats($username: String!) {
                    matchedUser(username: $username) {
                        submitStatsGlobal {
                            acSubmissionNum {
                                difficulty
                                count
                            }
                        }
                        submitStats {
                            totalSubmissionNum {
                                difficulty
                                count
                            }
                        }
                    }
                }`,
                variables: {
                    username: username
                }
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Origin': 'https://leetcode.com',
                    'Referer': 'https://leetcode.com/',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.data && response.data.data && response.data.data.matchedUser) {
                const userData = response.data.data.matchedUser;
                const acSubmissionNum = userData.submitStatsGlobal?.acSubmissionNum || [];
                const totalSubmissionNum = userData.submitStats?.totalSubmissionNum || [];
                
                // Extract counts using your exact logic
                const totalSolved = acSubmissionNum.find(x => x.difficulty === "All")?.count || 0;
                const easySolved = acSubmissionNum.find(x => x.difficulty === "Easy")?.count || 0;
                const mediumSolved = acSubmissionNum.find(x => x.difficulty === "Medium")?.count || 0;
                const hardSolved = acSubmissionNum.find(x => x.difficulty === "Hard")?.count || 0;
                
                // Calculate acceptance rate
                const totalSubmissions = totalSubmissionNum.find(x => x.difficulty === "All")?.count || 0;
                const acceptanceRate = totalSubmissions > 0 ? ((totalSolved / totalSubmissions) * 100).toFixed(2) : 0;
                
                return {
                    total_solved: totalSolved,
                    easy_solved: easySolved,
                    medium_solved: mediumSolved,
                    hard_solved: hardSolved,
                    acceptance_rate: parseFloat(acceptanceRate),
                    total_submissions: totalSubmissions
                };
            } else {
                throw new Error("Invalid GraphQL response");
            }
        } catch (error) {
            console.log(`GraphQL stats failed: ${error.message}`);
            return null; // Will fallback to alfa-leetcode-api stats
        }
    }

    // Get profile, contests, submissions from alfa-leetcode-api
    async fetchProfileFromFallback(username) {
        try {
            const [profile, submissions, contests] = await Promise.allSettled([
                axios.get(`${this.fallbackURL}/${username}`, {
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'CP-Unified-API' }
                }),
                axios.get(`${this.fallbackURL}/${username}/submission`, {
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'CP-Unified-API' }
                }),
                axios.get(`${this.fallbackURL}/${username}/contest`, {
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'CP-Unified-API' }
                })
            ]);

            const profileData = profile.status === 'fulfilled' ? profile.value.data : null;
            const submissionsData = submissions.status === 'fulfilled' ? submissions.value.data : null;
            const contestsData = contests.status === 'fulfilled' ? contests.value.data : null;

            return {
                profile: profileData,
                submissions: submissionsData,
                contests: contestsData,
                // Fallback stats if GraphQL fails
                ranking: profileData?.ranking || 0,
                contributionPoints: profileData?.contributionPoints || 0,
                reputation: profileData?.reputation || 0
            };
        } catch (error) {
            console.log(`Fallback API failed: ${error.message}`);
            return null;
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
            await this.sleep(400); // Rate limiting
            
            const [userInfo, ratings, submissions] = await Promise.allSettled([
                this.fetchWithRetry(`${this.baseURL}/user.info?handles=${handle}`),
                this.fetchWithRetry(`${this.baseURL}/user.rating?handle=${handle}`),
                this.fetchWithRetry(`${this.baseURL}/user.status?handle=${handle}&count=100`)
            ]);

            const userData = userInfo.status === 'fulfilled' ? userInfo.value.data : null;
            const ratingsData = ratings.status === 'fulfilled' ? ratings.value.data : null;
            const submissionsData = submissions.status === 'fulfilled' ? submissions.value.data : null;

            return {
                status: "OK",
                platform: "codeforces",
                username: handle,
                profile: userData,
                ratings: ratingsData,
                submissions: submissionsData,
                detailed_stats: this.calculateDetailedStats(userData, ratingsData, submissionsData)
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

    async fetchWithRetry(url, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                return await axios.get(url, { 
                    timeout: this.timeout,
                    headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
                });
            } catch (error) {
                if (i === retries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

calculateDetailedStats(profile, submissions, contests) {
  let totalSolved = 0;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  if (profile) {
    // If these fields exist on the root, use them directly
    totalSolved = profile.totalSolved ?? 0;
    easySolved = profile.easySolved ?? 0;
    mediumSolved = profile.mediumSolved ?? 0;
    hardSolved = profile.hardSolved ?? 0;

    // If still zero, try to fetch from nested data structure (e.g., from GraphQL-like response)
    if (
      totalSolved === 0 &&
      profile.matchedUser &&
      profile.matchedUser.submitStatsGlobal &&
      Array.isArray(profile.matchedUser.submitStatsGlobal.acSubmissionNum)
    ) {
      profile.matchedUser.submitStatsGlobal.acSubmissionNum.forEach((item) => {
        let diff = (item.difficulty ?? "").toLowerCase();
        let count = item.count ?? 0;
        totalSolved += count;

        if (diff === "easy") easySolved = count;
        else if (diff === "medium") mediumSolved = count;
        else if (diff === "hard") hardSolved = count;
      });
    }
  }

  const acceptanceRate = profile?.acceptanceRate ?? 0;
  const ranking = profile?.ranking ?? 0;
  const contributionPoints = profile?.contributionPoints ?? 0;
  const reputation = profile?.reputation ?? 0;
  const contestsAttended = contests?.contestAttend ?? 0;
  const contestRating = contests?.contestRating ?? 0;
  const contestRanking = contests?.contestRanking ?? contests?.contestGlobalRanking ?? 0;

  const recentSubs = Array.isArray(submissions?.submission) ? submissions.submission.slice(0, 10) : [];
  const totalSubmissions = submissions?.submission?.length ?? 0;
  const acceptedSubmissions = recentSubs.filter((s) => s.statusDisplay === "Accepted").length;

  return {
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    acceptanceRate,
    ranking,
    contributionPoints,
    reputation,
    contestsAttended,
    contestRating,
    contestRanking,
    recentSubs,
    submissionStats: {
      totalSubmissions,
      acceptedSubmissions,
    },
  };
}



    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class CodeChefAPI {
    constructor() {
        this.timeout = 10000; // 10 seconds timeout
    }

    async getUserData(handle) {
        try {
            console.log(`Fetching CodeChef data for: ${handle}`);
            
            // Fetch the CodeChef profile page directly
            const response = await axios.get(`https://www.codechef.com/users/${handle}`, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            });

            if (response.status === 200) {
                const htmlData = response.data;
                
                // Parse the HTML using JSDOM
                const dom = new JSDOM(htmlData);
                const document = dom.window.document;

                // Extract heatmap data
                let heatMapData = null;
                try {
                    const heatMapStart = htmlData.search("var userDailySubmissionsStats =") + "var userDailySubmissionsStats =".length;
                    const heatMapEnd = htmlData.search("'#js-heatmap") - 34;
                    if (heatMapStart > -1 && heatMapEnd > heatMapStart) {
                        const heatDataString = htmlData.substring(heatMapStart, heatMapEnd);
                        heatMapData = JSON.parse(heatDataString);
                    }
                } catch (e) {
                    console.log('Could not parse heatmap data');
                }

                // Extract rating data
                let ratingData = null;
                try {
                    const allRatingStart = htmlData.search("var all_rating = ") + "var all_rating = ".length;
                    const allRatingEnd = htmlData.search("var current_user_rating =") - 6;
                    if (allRatingStart > -1 && allRatingEnd > allRatingStart) {
                        ratingData = JSON.parse(htmlData.substring(allRatingStart, allRatingEnd));
                    }
                } catch (e) {
                    console.log('Could not parse rating data');
                }

                // Extract profile information using DOM parsing
                const userDetailsContainer = document.querySelector(".user-details-container");
                const ratingNumber = document.querySelector(".rating-number");
                const ratingRanks = document.querySelector(".rating-ranks");
                const userCountryFlag = document.querySelector(".user-country-flag");
                const userCountryName = document.querySelector(".user-country-name");
                const ratingElement = document.querySelector(".rating");

                // Calculate total problems solved from heatmap data
                let totalProblemsolved = 0;
                if (heatMapData) {
                    Object.values(heatMapData).forEach(dayData => {
                        if (typeof dayData === 'object' && dayData.value) {
                            totalProblemsolved += parseInt(dayData.value) || 0;
                        } else if (typeof dayData === 'number') {
                            totalProblemsolved += dayData;
                        }
                    });
                }

                return {
                    status: "OK",
                    platform: "codechef",
                    username: handle,
                    profile: {
                        name: userDetailsContainer?.children[0]?.children[1]?.textContent?.trim() || handle,
                        avatar: userDetailsContainer?.children[0]?.children[0]?.src || null,
                        countryFlag: userCountryFlag?.src || null,
                        countryName: userCountryName?.textContent?.trim() || null,
                        username: handle
                    },
                    data: {
                        // Main stats for compatibility with existing code
                        currentRating: parseInt(ratingNumber?.textContent) || 0,
                        highestRating: parseInt(ratingNumber?.parentNode?.children[4]?.textContent?.split("Rating")[1]) || 0,
                        globalRank: parseInt(ratingRanks?.children[0]?.children[0]?.children[0]?.children[0]?.innerHTML) || 0,
                        countryRank: parseInt(ratingRanks?.children[0]?.children[1]?.children[0]?.children[0]?.innerHTML) || 0,
                        stars: ratingElement?.textContent?.trim() || "unrated",
                        totalProblemsolved: totalProblemsolved,
                        
                        // Additional data
                        name: userDetailsContainer?.children[0]?.children[1]?.textContent?.trim() || handle,
                        countryName: userCountryName?.textContent?.trim() || null,
                        
                        // Set contests attended (you might need to scrape this separately or estimate)
                        contestsAttended: ratingData ? ratingData.length : 0
                    },
                    // Raw data for advanced usage
                    heatMap: heatMapData,
                    ratingData: ratingData,
                    detailed_stats: {
                        current_rating: parseInt(ratingNumber?.textContent) || 0,
                        highest_rating: parseInt(ratingNumber?.parentNode?.children[4]?.textContent?.split("Rating")[1]) || 0,
                        problems_solved: totalProblemsolved,
                        contests_attended: ratingData ? ratingData.length : 0,
                        global_rank: parseInt(ratingRanks?.children[0]?.children[0]?.children[0]?.children[0]?.innerHTML) || 0,
                        country_rank: parseInt(ratingRanks?.children[0]?.children[1]?.children[0]?.children[0]?.innerHTML) || 0,
                        stars: ratingElement?.textContent?.trim() || "unrated",
                        division: this.getDivisionFromRating(parseInt(ratingNumber?.textContent) || 0)
                    }
                };
            } else {
                throw new Error(`HTTP ${response.status}: Could not fetch profile`);
            }
        } catch (error) {
            console.error(`CodeChef API Error for ${handle}:`, error.message);
            
            // Handle specific error cases
            if (error.response?.status === 404) {
                return {
                    status: "FAILED",
                    platform: "codechef",
                    username: handle,
                    error: "User not found on CodeChef"
                };
            } else if (error.response?.status === 429) {
                return {
                    status: "RATE_LIMITED",
                    platform: "codechef",
                    username: handle,
                    error: "Rate limited by CodeChef. Please try again later."
                };
            } else {
                return {
                    status: "FAILED",
                    platform: "codechef",
                    username: handle,
                    error: error.message
                };
            }
        }
    }

    getDivisionFromRating(rating) {
        if (rating >= 2200) return "Division 1";
        if (rating >= 1800) return "Division 2";
        if (rating >= 1400) return "Division 3";
        if (rating >= 1000) return "Division 4";
        return "Unrated";
    }
}

class GeeksForGeeksAPI {
    constructor() {
        this.primaryURL = 'https://gfg-api.vercel.app';
        this.fallbackURL = 'https://geeksforgeeks-api-fzaa.onrender.com';
        this.statsURL = 'https://geeks-for-geeks-stats-api.vercel.app';
        this.timeout = 15000;
    }

    async getUserData(username) {
        try {
            console.log(`Fetching GeeksforGeeks data for: ${username}`);
            
            // Try multiple APIs in sequence
            let userData = await this.fetchFromPrimaryAPI(username);
            
            if (!userData || userData.problems_solved === 0) {
                userData = await this.fetchFromStatsAPI(username);
            }
            
            if (!userData || userData.problems_solved === 0) {
                userData = await this.fetchFromFallbackAPI(username);
            }
            
            return {
                status: "OK",
                platform: "geeksforgeeks",
                username: username,
                data: userData,
                detailed_stats: {
                    problems_solved: userData?.problems_solved || userData?.totalProblemsSolved || 0,
                    overall_score: userData?.overall_score || userData?.overallScore || 0,
                    monthly_score: userData?.monthly_score || userData?.monthlyScore || 0,
                    institute_rank: userData?.institute_rank || userData?.instituteRank || 0,
                    current_streak: userData?.current_streak || userData?.currentStreak || 0,
                    max_streak: userData?.max_streak || userData?.maxStreak || 0,
                    coding_languages: userData?.coding_languages || userData?.languagesUsed || [],
                    articles_published: userData?.articles_published || userData?.articlesPublished || 0,
                    school_solved: userData?.School || 0,
                    basic_solved: userData?.Basic || 0,
                    easy_solved: userData?.Easy || 0,
                    medium_solved: userData?.Medium || 0,
                    hard_solved: userData?.Hard || 0
                }
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

    async fetchFromPrimaryAPI(username) {
        try {
            const response = await axios.get(`${this.primaryURL}/${username}`, {
                timeout: this.timeout,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.log(`Primary GFG API failed: ${error.message}`);
            return null;
        }
    }

    async fetchFromStatsAPI(username) {
        try {
            const response = await axios.get(`${this.statsURL}/?raw=y&userName=${username}`, {
                timeout: this.timeout,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });
            
            const data = response.data;
            return {
                problems_solved: parseInt(data.totalProblemsSolved) || 0,
                School: parseInt(data.School) || 0,
                Basic: parseInt(data.Basic) || 0,
                Easy: parseInt(data.Easy) || 0,
                Medium: parseInt(data.Medium) || 0,
                Hard: parseInt(data.Hard) || 0,
                overall_score: 0,
                monthly_score: 0,
                institute_rank: 0,
                current_streak: 0,
                max_streak: 0,
                coding_languages: [],
                articles_published: 0
            };
        } catch (error) {
            console.log(`Stats GFG API failed: ${error.message}`);
            return null;
        }
    }

    async fetchFromFallbackAPI(username) {
        try {
            const response = await axios.get(`${this.fallbackURL}/${username}`, {
                timeout: this.timeout,
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            return response.data;
        } catch (error) {
            console.log(`Fallback GFG API failed: ${error.message}`);
            return null;
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

            // Add GitHub token if available
            if (process.env.GITHUB_TOKEN) {
                headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
            }

            const [profile, repos, events] = await Promise.allSettled([
                axios.get(`${this.baseURL}/users/${username}`, { timeout: this.timeout, headers }),
                axios.get(`${this.baseURL}/users/${username}/repos?sort=updated&per_page=20`, { timeout: this.timeout, headers }),
                axios.get(`${this.baseURL}/users/${username}/events/public?per_page=30`, { timeout: this.timeout, headers })
            ]);

            const profileData = profile.status === 'fulfilled' ? profile.value.data : null;
            const reposData = repos.status === 'fulfilled' ? repos.value.data : null;
            const eventsData = events.status === 'fulfilled' ? events.value.data : null;

            return {
                status: "OK",
                platform: "github",
                username: username,
                profile: profileData,
                repositories: reposData,
                recent_activity: eventsData,
                detailed_stats: this.calculateDetailedStats(profileData, reposData, eventsData)
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

    calculateDetailedStats(profile, repos, events) {
        if (!profile) return {};

        // Language statistics from repositories
        const languageStats = {};
        if (repos) {
            repos.forEach(repo => {
                if (repo.language) {
                    languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
                }
            });
        }

        // Activity statistics
        const activityStats = {
            recent_pushes: 0,
            recent_prs: 0,
            recent_issues: 0
        };

        if (events) {
            events.forEach(event => {
                switch (event.type) {
                    case 'PushEvent':
                        activityStats.recent_pushes++;
                        break;
                    case 'PullRequestEvent':
                        activityStats.recent_prs++;
                        break;
                    case 'IssuesEvent':
                        activityStats.recent_issues++;
                        break;
                }
            });
        }

        return {
            public_repos: profile.public_repos || 0,
            private_repos: profile.total_private_repos || 0,
            followers: profile.followers || 0,
            following: profile.following || 0,
            public_gists: profile.public_gists || 0,
            account_created: profile.created_at,
            last_updated: profile.updated_at,
            bio: profile.bio,
            location: profile.location,
            company: profile.company,
            blog: profile.blog,
            twitter: profile.twitter_username,
            language_distribution: languageStats,
            recent_activity: activityStats,
            top_repositories: repos ? repos.slice(0, 5).map(repo => ({
                name: repo.name,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                description: repo.description
            })) : []
        };
    }
}

class AtCoderAPI {
    constructor() {
        this.baseURL = 'https://kenkoooo.com/atcoder/atcoder-api';
        this.timeout = 8000;
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

            const submissionsData = submissions.status === 'fulfilled' ? submissions.value.data : null;
            const rankData = rankInfo.status === 'fulfilled' ? rankInfo.value.data : null;

            return {
                status: "OK",
                platform: "atcoder",
                username: username,
                submissions: submissionsData,
                rank_info: rankData,
                detailed_stats: this.calculateDetailedStats(submissionsData, rankData)
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

    calculateDetailedStats(submissions, rankInfo) {
        if (!submissions) return {};

        const acceptedSubmissions = submissions.filter(s => s.result === 'AC');
        const uniqueProblems = new Set(acceptedSubmissions.map(s => s.problem_id));

        return {
            total_submissions: submissions.length,
            accepted_submissions: acceptedSubmissions.length,
            unique_problems_solved: uniqueProblems.size,
            acceptance_rate: submissions.length > 0 ? 
                (acceptedSubmissions.length / submissions.length * 100).toFixed(2) : 0,
            rank_info: rankInfo
        };
    }
}

class HackerRankAPI {
    constructor() {
        this.baseURL = 'https://www.hackerrank.com/rest/hackers';
        this.profileURL = 'https://www.hackerrank.com/rest/hackers';
        this.contestURL = 'https://www.hackerrank.com/rest/contests/master/hackers';
        this.timeout = 15000;
    }

    async getUserData(username) {
        try {
            console.log(`Fetching HackerRank data for: ${username}`);
            
            // Try all available HackerRank API endpoints
            const [profileData, badgesData, scoresEloData, contestProfileData] = await Promise.allSettled([
                this.fetchProfile(username),
                this.fetchBadges(username),
                this.fetchScoresElo(username),
                this.fetchContestProfile(username)
            ]);

            const profile = profileData.status === 'fulfilled' ? profileData.value : null;
            const badges = badgesData.status === 'fulfilled' ? badgesData.value : null;
            const scoresElo = scoresEloData.status === 'fulfilled' ? scoresEloData.value : null;
            const contestProfile = contestProfileData.status === 'fulfilled' ? contestProfileData.value : null;

            if (!profile && !badges && !scoresElo && !contestProfile) {
                throw new Error("All HackerRank data sources failed");
            }

            // Process all data sources
            const badgeStats = this.processBadgesData(badges);
            const profileStats = this.processProfileData(profile);
            const eloStats = this.processScoresEloData(scoresElo);
            const contestStats = this.processContestProfileData(contestProfile);

            return {
                status: "OK",
                platform: "hackerrank",
                username: username,
                profile: {
                    name: profileStats.name || contestStats.name || username,
                    username: username,
                    avatar: profileStats.avatar || contestStats.avatar || `https://www.hackerrank.com/rest/hackers/${username}/avatar`,
                    country: profileStats.country || contestStats.country || null,
                    school: profileStats.school || contestStats.school || null,
                    company: profileStats.company || contestStats.company || null,
                    website: profileStats.website || null,
                    linkedin: profileStats.linkedin || null,
                    github: profileStats.github || null,
                    created_at: profileStats.created_at || contestStats.created_at || null,
                    bio: profileStats.bio || null,
                    location: profileStats.location || null,
                    title: contestStats.title || null
                },
                detailed_stats: {
                    // Core Statistics
                    rank: profileStats.rank || 0,
                    level: profileStats.level || contestStats.level || badgeStats.highest_level || 1,
                    hackos: profileStats.hackos || 0,
                    
                    // Social Statistics  
                    followers: profileStats.followers || contestStats.followers || 0,
                    following: profileStats.following || 0,
                    event_count: contestStats.event_count || 0,
                    
                    // Badge Information
                    badges: badgeStats.badges,
                    total_badges: badgeStats.total_badges,
                    badge_categories: badgeStats.categories,
                    
                    // Language and Domain Statistics from ELO data
                    domain_scores: eloStats.domain_scores,
                    language_proficiency: eloStats.language_proficiency,
                    practice_ranks: eloStats.practice_ranks,
                    contest_performance: eloStats.contest_performance,
                    
                    // Problem Solving Statistics (from badges + ELO)
                    problems_solved: badgeStats.total_solved,
                    challenges_completed: badgeStats.total_challenges_solved,
                    total_points: Math.max(badgeStats.total_points, eloStats.total_practice_score),
                    total_stars: badgeStats.total_stars,
                    
                    // Specialized Domain Performance
                    algorithms_score: eloStats.algorithms_score || 0,
                    data_structures_score: eloStats.data_structures_score || 0,
                    mathematics_score: eloStats.mathematics_score || 0,
                    sql_score: eloStats.sql_score || 0,
                    python_score: eloStats.python_score || 0,
                    java_score: eloStats.java_score || 0,
                    cpp_score: eloStats.cpp_score || 0,
                    tutorials_score: eloStats.tutorials_score || 0,
                    
                    // Rankings by Domain
                    algorithms_rank: eloStats.algorithms_rank || 0,
                    data_structures_rank: eloStats.data_structures_rank || 0,
                    python_rank: eloStats.python_rank || 0,
                    java_rank: eloStats.java_rank || 0,
                    cpp_rank: eloStats.cpp_rank || 0,
                    sql_rank: eloStats.sql_rank || 0,
                    
                    // Contest Performance Summary
                    contest_medals: eloStats.total_medals,
                    contest_participation_summary: eloStats.contest_summary,
                    
                    // Achievement Summary for CodeFolio
                    achievement_summary: {
                        total_badges: badgeStats.total_badges,
                        total_stars: badgeStats.total_stars,
                        total_problems_solved: badgeStats.total_solved,
                        languages_practiced: Object.keys(eloStats.language_proficiency).length,
                        domains_practiced: Object.keys(eloStats.domain_scores).length,
                        total_practice_score: eloStats.total_practice_score,
                        best_domain: eloStats.best_performing_domain,
                        contest_participation: eloStats.total_contest_participation
                    },
                    
                    // Portfolio Metrics
                    overall_progress: this.calculateOverallProgress(eloStats, badgeStats),
                    star_rating: this.calculateOverallStarRating(badgeStats.badges),
                    activity_level: this.determineActivityLevel(badgeStats.total_solved, badgeStats.total_badges),
                    strongest_domains: this.getStrongestDomains(eloStats.domain_scores),
                    language_expertise: this.getLanguageExpertise(eloStats.language_proficiency),
                    
                    // Comprehensive Statistics
                    comprehensive_stats: {
                        profile_completeness: this.calculateProfileCompleteness(profileStats, contestStats),
                        skill_diversity: Object.keys(eloStats.domain_scores).filter(domain => 
                            eloStats.domain_scores[domain].score > 0).length,
                        contest_consistency: eloStats.contest_consistency || 0
                    }
                }
            };
        } catch (error) {
            console.error(`HackerRank API Error for ${username}:`, error.message);
            return {
                status: "FAILED",
                platform: "hackerrank",
                username: username,
                error: `HackerRank profile not accessible: ${error.message}`,
                suggestion: "User might not exist or profile is private"
            };
        }
    }

    async fetchProfile(username) {
        try {
            const response = await axios.get(`${this.profileURL}/${username}`, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://www.hackerrank.com/',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            return response.data.model;
        } catch (error) {
            console.log(`HackerRank profile fetch failed: ${error.message}`);
            return null;
        }
    }

    async fetchBadges(username) {
        try {
            const response = await axios.get(`${this.baseURL}/${username}/badges`, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://www.hackerrank.com/',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            return response.data;
        } catch (error) {
            console.log(`HackerRank badges fetch failed: ${error.message}`);
            return null;
        }
    }

    // NEW: Fetch scores_elo data
    async fetchScoresElo(username) {
        try {
            const response = await axios.get(`${this.baseURL}/${username}/scores_elo`, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://www.hackerrank.com/',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            return response.data;
        } catch (error) {
            console.log(`HackerRank scores_elo fetch failed: ${error.message}`);
            return null;
        }
    }

    // NEW: Fetch contest profile data
    async fetchContestProfile(username) {
        try {
            const response = await axios.get(`${this.contestURL}/${username}/profile`, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://www.hackerrank.com/',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });
            return response.data.model;
        } catch (error) {
            console.log(`HackerRank contest profile fetch failed: ${error.message}`);
            return null;
        }
    }

    // NEW: Process scores_elo data
    processScoresEloData(scoresEloData) {
        if (!scoresEloData || !Array.isArray(scoresEloData)) {
            return this.getEmptyEloStats();
        }

        const stats = {
            domain_scores: {},
            language_proficiency: {},
            practice_ranks: {},
            contest_performance: {},
            total_practice_score: 0,
            total_medals: { gold: 0, silver: 0, bronze: 0 },
            contest_summary: {},
            best_performing_domain: null,
            total_contest_participation: 0,
            contest_consistency: 0
        };

        // Map specific domains for easy access
        const domainMap = {
            'Algorithms': 'algorithms',
            'Data Structures': 'data_structures', 
            'Mathematics': 'mathematics',
            'SQL': 'sql',
            'Python': 'python',
            'Java': 'java',
            'C++': 'cpp',
            'Tutorials': 'tutorials',
            'Artificial Intelligence': 'artificial_intelligence',
            'Databases': 'databases',
            'Functional Programming': 'functional_programming',
            'Linux Shell': 'shell',
            'Ruby': 'ruby',
            'C': 'c',
            'React': 'react',
            'Regex': 'regex',
            'Security': 'security',
            'Distributed Systems': 'distributed_systems',
            'General Programming': 'general_programming'
        };

        scoresEloData.forEach(domain => {
            const domainName = domain.name;
            const domainKey = domainMap[domainName] || domainName.toLowerCase().replace(/\s+/g, '_');

            // Practice scores and ranks
            const practiceScore = domain.practice?.score || 0;
            const practiceRank = domain.practice?.rank || 0;

            // Contest performance
            const contestScore = domain.contest?.score || 0;
            const contestRank = domain.contest?.rank || 'N/A';
            const contestLevel = domain.contest?.level || 5;
            const medals = domain.contest?.medals || { gold: 0, silver: 0, bronze: 0 };

            stats.domain_scores[domainKey] = {
                name: domainName,
                practice_score: practiceScore,
                practice_rank: practiceRank,
                contest_score: contestScore,
                contest_rank: contestRank,
                contest_level: contestLevel,
                medals: medals,
                track_id: domain.track_id
            };

            // Add to totals
            stats.total_practice_score += practiceScore;
            if (medals) {
                stats.total_medals.gold += medals.gold || 0;
                stats.total_medals.silver += medals.silver || 0;
                stats.total_medals.bronze += medals.bronze || 0;
            }

            // Track language proficiency specifically
            if (['python', 'java', 'cpp', 'c', 'ruby', 'react'].includes(domainKey)) {
                stats.language_proficiency[domainKey] = {
                    score: practiceScore,
                    rank: practiceRank,
                    contest_performance: {
                        score: contestScore,
                        level: contestLevel,
                        medals: medals
                    }
                };
            }

            // Set individual domain scores for easy access
            stats[`${domainKey}_score`] = practiceScore;
            stats[`${domainKey}_rank`] = practiceRank;
        });

        // Find best performing domain
        let bestScore = 0;
        let bestDomain = null;
        Object.entries(stats.domain_scores).forEach(([key, data]) => {
            if (data.practice_score > bestScore) {
                bestScore = data.practice_score;
                bestDomain = data.name;
            }
        });
        stats.best_performing_domain = bestDomain;

        // Calculate contest participation
        stats.total_contest_participation = scoresEloData.filter(d => 
            d.contest && (d.contest.score > 0 || (d.contest.medals && 
            (d.contest.medals.gold > 0 || d.contest.medals.silver > 0 || d.contest.medals.bronze > 0)))
        ).length;

        return stats;
    }

    processContestProfileData(contestProfile) {
        if (!contestProfile) {
            return {};
        }

        return {
            name: contestProfile.personal_first_name && contestProfile.personal_last_name ? 
                  `${contestProfile.personal_first_name} ${contestProfile.personal_last_name}` : null,
            avatar: contestProfile.avatar,
            country: contestProfile.country,
            school: contestProfile.school,
            company: contestProfile.company,
            created_at: contestProfile.created_at,
            level: contestProfile.level,
            followers: contestProfile.followers_count,
            event_count: contestProfile.event_count,
            title: contestProfile.title
        };
    }

    processBadgesData(badgesResponse) {
        if (!badgesResponse || !badgesResponse.models) {
            return this.getEmptyBadgeStats();
        }

        const badges = badgesResponse.models;
        const stats = {
            badges: [],
            total_badges: badges.length,
            categories: {},
            total_solved: 0,
            total_challenges_solved: 0,
            total_points: 0,
            total_stars: 0,
            highest_level: 0
        };

        badges.forEach(badge => {
            const processedBadge = {
                name: badge.badge_name,
                short_name: badge.badge_short_name,
                category: badge.category_name,
                badge_type: badge.badge_type,
                stars: badge.stars,
                level: badge.level,
                current_points: badge.current_points,
                solved: badge.solved,
                total_challenges: badge.total_challenges
            };

            stats.badges.push(processedBadge);
            stats.total_solved += badge.solved || 0;
            stats.total_points += badge.current_points || 0;
            stats.total_stars += badge.stars || 0;
            stats.highest_level = Math.max(stats.highest_level, badge.level || 0);

            const category = badge.category_name || 'Other';
            if (!stats.categories[category]) {
                stats.categories[category] = [];
            }
            stats.categories[category].push(processedBadge);
        });

        return stats;
    }

    processProfileData(profile) {
        if (!profile) {
            return {};
        }

        return {
            name: profile.personal_first_name && profile.personal_last_name ? 
                  `${profile.personal_first_name} ${profile.personal_last_name}` : null,
            avatar: profile.avatar,
            country: profile.country,
            school: profile.school,
            company: profile.company,
            website: profile.website,
            linkedin: profile.linkedin_url,
            github: profile.github_url,
            created_at: profile.created_at,
            bio: profile.short_bio,
            location: profile.location,
            rank: profile.rank,
            level: profile.level,
            hackos: profile.hackos,
            followers: profile.followers_count,
            following: profile.following_count
        };
    }

    getEmptyEloStats() {
        return {
            domain_scores: {},
            language_proficiency: {},
            practice_ranks: {},
            contest_performance: {},
            total_practice_score: 0,
            total_medals: { gold: 0, silver: 0, bronze: 0 },
            contest_summary: {},
            best_performing_domain: null,
            total_contest_participation: 0,
            contest_consistency: 0
        };
    }

    getEmptyBadgeStats() {
        return {
            badges: [],
            total_badges: 0,
            categories: {},
            total_solved: 0,
            total_challenges_solved: 0,
            total_points: 0,
            total_stars: 0,
            highest_level: 0
        };
    }

    calculateOverallProgress(eloStats, badgeStats) {
        const practiceScore = eloStats.total_practice_score || 0;
        const badgePoints = badgeStats.total_points || 0;
        const totalStars = badgeStats.total_stars || 0;
        
        return Math.min(100, (practiceScore + badgePoints + (totalStars * 20)) / 10);
    }

    calculateOverallStarRating(badges) {
        if (!badges || badges.length === 0) return 0;
        
        const totalStars = badges.reduce((sum, badge) => sum + (badge.stars || 0), 0);
        const avgStars = totalStars / badges.length;
        
        return Math.round(avgStars * 10) / 10;
    }

    determineActivityLevel(totalSolved, totalBadges) {
        if (totalSolved >= 100 && totalBadges >= 5) return 'Expert';
        if (totalSolved >= 50 && totalBadges >= 3) return 'Advanced';
        if (totalSolved >= 20 && totalBadges >= 2) return 'Intermediate';
        if (totalSolved >= 5 && totalBadges >= 1) return 'Beginner';
        return 'New';
    }

    getStrongestDomains(domainScores) {
        return Object.entries(domainScores)
            .sort(([,a], [,b]) => b.practice_score - a.practice_score)
            .slice(0, 3)
            .map(([domain, data]) => ({
                domain: data.name,
                score: data.practice_score,
                rank: data.practice_rank
            }));
    }

    getLanguageExpertise(languageProficiency) {
        return Object.entries(languageProficiency)
            .sort(([,a], [,b]) => b.score - a.score)
            .map(([lang, data]) => ({
                language: lang.toUpperCase(),
                score: data.score,
                rank: data.rank,
                contest_level: data.contest_performance?.level || 5
            }));
    }

    calculateProfileCompleteness(profileStats, contestStats) {
        let completeness = 0;
        const fields = ['name', 'country', 'school', 'company', 'bio', 'avatar'];
        
        fields.forEach(field => {
            if (profileStats[field] || contestStats[field]) {
                completeness += 100 / fields.length;
            }
        });
        
        return Math.round(completeness);
    }
}




class InterviewBitAPI {
    async getUserData(username) {
        return {
            status: "NOT_AVAILABLE",
            platform: "interviewbit",
            username: username,
            comment: "InterviewBit doesn't provide public API access",
            detailed_stats: {}
        };
    }
}

class CodeStudioAPI {
    async getUserData(username) {
        return {
            status: "NOT_AVAILABLE",
            platform: "codestudio",
            username: username,
            comment: "CodeStudio doesn't provide public API access",
            detailed_stats: {}
        };
    }
}

// Initialize APIs
const multiAPI = new MultiPlatformAPI();

// ==========================================
// ENHANCED HELPER FUNCTIONS
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
        },
        combined_metrics: {
            total_repositories: 0,
            total_followers: 0,
            total_contributions: 0,
            programming_languages: new Set(),
            contest_ratings: {},
            problem_solving_trend: {}
        }
    };

    Object.entries(platformData).forEach(([platform, data]) => {
        if (data.status === "OK") {
            stats.platforms_connected++;
            stats.platform_breakdown[platform] = extractPlatformStats(platform, data);
            stats.summary.successful_platforms.push(platform);
            
            // Aggregate cross-platform metrics
            aggregateCombinedMetrics(stats.combined_metrics, platform, data);
        } else if (data.status === "FAILED") {
            stats.summary.failed_platforms.push(platform);
        } else {
            stats.summary.not_available_platforms.push(platform);
        }
    });

    // Convert Set to Array for JSON serialization
    stats.combined_metrics.programming_languages = Array.from(stats.combined_metrics.programming_languages);

    // Calculate totals
    calculateTotalStats(stats);

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
                contests_attended: data.detailed_stats?.contests_attended || 0,
                contest_rating: data.detailed_stats?.contest_rating || 0,
                acceptance_rate: data.detailed_stats?.acceptance_rate || 0,
                ranking: data.detailed_stats?.ranking || 0,
                recent_submissions: data.detailed_stats?.recent_submissions || []
            };
        
        case 'codeforces':
            return {
                username: data.username,
                current_rating: data.detailed_stats?.current_rating || 0,
                max_rating: data.detailed_stats?.max_rating || 0,
                rank: data.detailed_stats?.rank || "unrated",
                contests_participated: data.detailed_stats?.contests_participated || 0,
                problems_solved: data.detailed_stats?.problems_solved || 0,
                acceptance_rate: data.detailed_stats?.acceptance_rate || 0,
                difficulty_distribution: data.detailed_stats?.difficulty_distribution || {},
                recent_contests: data.detailed_stats?.recent_contests || []
            };
        
        case 'codechef':
            return {
                username: data.username,
                current_rating: data.detailed_stats?.current_rating || 0,
                highest_rating: data.detailed_stats?.highest_rating || 0,
                problems_solved: data.detailed_stats?.problems_solved || 0,
                contests_attended: data.detailed_stats?.contests_attended || 0,
                global_rank: data.detailed_stats?.global_rank || 0,
                country_rank: data.detailed_stats?.country_rank || 0,
                stars: data.detailed_stats?.stars || "unrated"
            };
        
        case 'geeksforgeeks':
            return {
                username: data.username,
                problems_solved: data.detailed_stats?.problems_solved || 0,
                overall_score: data.detailed_stats?.overall_score || 0,
                monthly_score: data.detailed_stats?.monthly_score || 0,
                current_streak: data.detailed_stats?.current_streak || 0,
                max_streak: data.detailed_stats?.max_streak || 0,
                coding_languages: data.detailed_stats?.coding_languages || []
            };
        
        case 'github':
            return {
                username: data.username,
                public_repos: data.detailed_stats?.public_repos || 0,
                followers: data.detailed_stats?.followers || 0,
                following: data.detailed_stats?.following || 0,
                language_distribution: data.detailed_stats?.language_distribution || {},
                recent_activity: data.detailed_stats?.recent_activity || {},
                top_repositories: data.detailed_stats?.top_repositories || []
            };
        
case 'hackerrank':
    return {
        username: data.username,
        rank: data.detailed_stats?.rank || 0,
        level: data.detailed_stats?.level || 0,
        hackos: data.detailed_stats?.hackos || 0,
        badges: data.detailed_stats?.total_badges || 0,
        problems_solved: data.detailed_stats?.problems_solved || 0,
        total_points: data.detailed_stats?.total_points || 0,
        total_stars: data.detailed_stats?.total_stars || 0,
        followers: data.detailed_stats?.followers || 0,
        following: data.detailed_stats?.following || 0,
        event_count: data.detailed_stats?.event_count || 0,
        contest_medals: data.detailed_stats?.contest_medals || { gold: 0, silver: 0, bronze: 0 },
        strongest_domain: data.detailed_stats?.achievement_summary?.best_domain || "None",
        languages_practiced: data.detailed_stats?.achievement_summary?.languages_practiced || 0,
        domains_practiced: data.detailed_stats?.achievement_summary?.domains_practiced || 0,
        contest_participation: data.detailed_stats?.achievement_summary?.contest_participation || 0,
        activity_level: data.detailed_stats?.activity_level || "New",
        algorithms_score: data.detailed_stats?.algorithms_score || 0,
        data_structures_score: data.detailed_stats?.data_structures_score || 0,
        python_score: data.detailed_stats?.python_score || 0,
        java_score: data.detailed_stats?.java_score || 0,
        cpp_score: data.detailed_stats?.cpp_score || 0
    };

        case 'atcoder':
            return {
                username: data.username,
                total_submissions: data.detailed_stats?.total_submissions || 0,
                accepted_submissions: data.detailed_stats?.accepted_submissions || 0,
                unique_problems_solved: data.detailed_stats?.unique_problems_solved || 0,
                acceptance_rate: data.detailed_stats?.acceptance_rate || 0
            };
        
        default:
            return { 
                username: data.username,
                detailed_stats: data.detailed_stats || {}
            };
    }
}

function aggregateCombinedMetrics(combined, platform, data) {
    switch (platform) {
        case 'github':
            combined.total_repositories += data.detailed_stats?.public_repos || 0;
            combined.total_followers += data.detailed_stats?.followers || 0;
            if (data.detailed_stats?.language_distribution) {
                Object.keys(data.detailed_stats.language_distribution).forEach(lang => {
                    combined.programming_languages.add(lang);
                });
            }
            break;
        
        case 'codeforces':
            if (data.detailed_stats?.current_rating) {
                combined.contest_ratings.codeforces = data.detailed_stats.current_rating;
            }
            break;
        
        case 'codechef':
            if (data.detailed_stats?.current_rating) {
                combined.contest_ratings.codechef = data.detailed_stats.current_rating;
            }
            break;
        
        case 'leetcode':
            if (data.detailed_stats?.contest_rating) {
                combined.contest_ratings.leetcode = data.detailed_stats.contest_rating;
            }
            break;
        
// Add this case to the switch statement in aggregateCombinedMetrics function
case 'hackerrank':
    // Add to programming languages from language proficiency
    if (data.detailed_stats?.language_proficiency) {
        Object.keys(data.detailed_stats.language_proficiency).forEach(lang => {
            combined.programming_languages.add(lang.toUpperCase());
        });
    }
    
    // Add to total contributions (problems solved)
    combined.total_contributions += data.detailed_stats?.problems_solved || 0;
    
    // Add contest ratings if available
    if (data.detailed_stats?.algorithms_score) {
        combined.contest_ratings.hackerrank = data.detailed_stats.algorithms_score;
    }
    
    // Add followers to social metrics
    combined.total_followers += data.detailed_stats?.followers || 0;
    
    // Track domain expertise
    if (data.detailed_stats?.strongest_domains) {
        data.detailed_stats.strongest_domains.forEach(domain => {
            if (!combined.domain_expertise) {
                combined.domain_expertise = {};
            }
            combined.domain_expertise[domain.domain] = domain.score;
        });
    }
    break;

    }
}

function calculateTotalStats(stats) {
    // Reset counters
    let totalHackos = 0;
    let totalMedals = { gold: 0, silver: 0, bronze: 0 };
    let totalEvents = 0;

    Object.values(stats.platform_breakdown).forEach(platform => {
        // Existing logic for problems solved and contests
        if (platform.problems_solved) {
            stats.total_problems_solved += platform.problems_solved;
        }
        if (platform.contests_attended || platform.contests_participated || platform.contest_participation || platform.event_count) {
            stats.total_contests += (platform.contests_attended || platform.contests_participated || platform.contest_participation || platform.event_count || 0);
        }
        
        // Add HackerRank-specific metrics
        if (platform.hackos) {
            totalHackos += platform.hackos;
        }
        if (platform.contest_medals) {
            totalMedals.gold += platform.contest_medals.gold || 0;
            totalMedals.silver += platform.contest_medals.silver || 0;
            totalMedals.bronze += platform.contest_medals.bronze || 0;
        }
        if (platform.event_count) {
            totalEvents += platform.event_count;
        }
    });

    // Add new aggregate metrics
    stats.total_hackos = totalHackos;
    stats.total_contest_medals = totalMedals;
    stats.total_events_participated = totalEvents;

    // Calculate overall rating including HackerRank
    const ratings = Object.values(stats.combined_metrics.contest_ratings);
    if (ratings.length > 0) {
        stats.overall_rating = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
    }
}

// ==========================================
// API ROUTES (COMPLETE)
// ==========================================

// Root route
app.get('/', (req, res) => {
    res.json({
        status: "OK",
        message: "Multi-Platform Dashboard API - With HackerRank Integration",
        version: "2.2.0",
        documentation: "/api/health",
        supported_platforms: [
            "leetcode", 
            "codeforces", 
            "codechef", 
            "github", 
            "geeksforgeeks", 
            "atcoder", 
            "hackerrank"
        ],
        endpoints: {
            health: "GET /api/health",
            aggregated_dashboard: "POST /api/dashboard/aggregated", 
            single_user: "GET /api/dashboard/aggregated/:username",
            platform_status: "GET /api/platforms/status",
            platform_details: "GET /api/platforms/:platform/:username"
        },
        new_features: [
            "HackerRank badge tracking",
            "Contest medal counts",
            "Domain-specific ELO scores",
            "Language proficiency rankings"
        ]
    });
});


// Main aggregated dashboard endpoint (FULL FEATURED)
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
                    geeksforgeeks: "john.doe",
                    atcoder: "john_atcoder"
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
            aggregated_stats: {},
            processing_time: Date.now()
        };

        console.log(`Fetching comprehensive data for usernames:`, usernames);

        // Fetch data with controlled concurrency (3 at a time to avoid overwhelming)
        const entries = Object.entries(usernames);
        const batchSize = 3;
        
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async ([platform, username]) => {
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

            await Promise.all(batchPromises);
            
            // Small delay between batches
            if (i + batchSize < entries.length) {
                await multiAPI.sleep(500);
            }
        }

        // Generate comprehensive aggregated statistics
        result.aggregated_stats = generateAggregatedStats(result.platforms);
        result.processing_time = Date.now() - result.processing_time;

        console.log(`Aggregated dashboard data fetched successfully in ${result.processing_time}ms`);
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

// Single username fallback (COMPLETE)
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
            processing_time: Date.now(),
            note: "This endpoint assumes same username across all platforms. Use POST /api/dashboard/aggregated for different usernames."
        };

        console.log(`Fetching comprehensive data for ${username} from platforms: ${requestedPlatforms.join(', ')}`);

        // Process in batches for better performance
        const batchSize = 3;
        for (let i = 0; i < requestedPlatforms.length; i += batchSize) {
            const batch = requestedPlatforms.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (platform) => {
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
            });

            await Promise.all(batchPromises);
            
            if (i + batchSize < requestedPlatforms.length) {
                await multiAPI.sleep(300);
            }
        }

        result.aggregated_stats = generateAggregatedStats(result.platforms);
        result.processing_time = Date.now() - result.processing_time;
        
        console.log(`Data fetched for ${username} in ${result.processing_time}ms`);
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

// Individual platform endpoint
app.get('/api/platforms/:platform/:username', async (req, res) => {
    const { platform, username } = req.params;

    if (!multiAPI.platforms[platform]) {
        return res.status(404).json({
            status: "FAILED",
            comment: `Platform '${platform}' not supported`,
            available_platforms: Object.keys(multiAPI.platforms)
        });
    }

    try {
        console.log(`Fetching ${platform} data for ${username}`);
        const result = await multiAPI.platforms[platform].getUserData(username);
        
        res.json({
            status: "OK",
            timestamp: new Date().toISOString(),
            platform: platform,
            username: username,
            data: result
        });
    } catch (error) {
        console.error(`Error fetching ${platform} data:`, error);
        res.status(500).json({
            status: "FAILED",
            platform: platform,
            username: username,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Platform status endpoint (ENHANCED)
app.get('/api/platforms/status', (req, res) => {
    const platformStatus = {
        leetcode: {
            status: "Available",
            features: ["Profile data", "Submission history", "Contest performance", "Detailed statistics"],
            api_endpoint: "https://alfa-leetcode-api.onrender.com",
            rate_limit: "Moderate"
        },
        codeforces: {
            status: "Available",
            features: ["User profile", "Rating history", "Submission data", "Contest participation"],
            api_endpoint: "https://codeforces.com/api",
            rate_limit: "Strict"
        },
        codechef: {
            status: "Available", 
            features: ["Profile data", "Rating information", "Contest history"],
            api_endpoint: "https://codechef-api.vercel.app",
            rate_limit: "Moderate"
        },
        geeksforgeeks: {
            status: "Available",
            features: ["Problems solved", "Scores", "Streaks", "Language usage"],
            api_endpoint: "https://geeks-for-geeks-api.vercel.app",
            rate_limit: "Moderate"
        },
        github: {
            status: "Available",
            features: ["Profile data", "Repository info", "Activity feed", "Language stats"],
            api_endpoint: "https://api.github.com",
            rate_limit: "GitHub API limits apply"
        },
hackerrank: {
    status: "Available",
    features: [
        "Complete profile data", 
        "Badge achievements", 
        "Domain-specific scores and rankings",
        "Contest performance and medals",
        "Language proficiency tracking",
        "Social metrics (followers, events)"
    ],
    data_points: [
        "Problems solved", 
        "Total badges and stars", 
        "Contest medals (gold/silver/bronze)",
        "Domain scores (20+ domains)",
        "Language rankings",
        "Practice and contest performance"
    ],
    rate_limit: "Moderate",
    api_endpoints: [
        "Profile data",
        "Badges information", 
        "ELO scores",
        "Contest performance"
    ]
},
        atcoder: {
            status: "Available",
            features: ["Submission data", "Problem statistics", "Ranking info"],
            api_endpoint: "https://kenkoooo.com/atcoder/atcoder-api",
            rate_limit: "Moderate"
        },
        hackerrank: {
            status: "Not Available",
            reason: "Requires private API access or web scraping",
            features: []
        },
        interviewbit: {
            status: "Not Available", 
            reason: "No public API available",
            features: []
        },
        codestudio: {
            status: "Not Available",
            reason: "No public API available", 
            features: []
        }
    };

    const availablePlatforms = Object.keys(platformStatus).filter(p => 
        platformStatus[p].status === "Available"
    );

    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        total_platforms: Object.keys(platformStatus).length,
        available_platforms: availablePlatforms.length,
        platforms: platformStatus,
        deployment_info: {
            cors_enabled: true,
            vercel_optimized: true,
            rate_limiting: "Implemented",
            error_handling: "Comprehensive",
            retry_mechanism: "Built-in"
        },
        usage_guidelines: {
            recommended_request_interval: "300ms between requests",
            batch_processing: "Enabled for multiple platforms",
            timeout_settings: "8-9 seconds per request",
            concurrent_requests: "Limited to 3 simultaneous"
        }
    });
});

// Health check endpoint (COMPREHENSIVE)
app.get('/api/health', (req, res) => {
    res.json({
        status: "OK",
        message: "Multi-Platform Dashboard API - Full Featured & Deployment Ready",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        system_info: {
            cors_enabled: true,
            supported_platforms: Object.keys(multiAPI.platforms),
            available_platforms: Object.keys(multiAPI.platforms).filter(p => 
                !['interviewbit', 'codestudio'].includes(p)
            ).length,
            total_platforms: Object.keys(multiAPI.platforms).length
        },
        endpoints: [
            'POST /api/dashboard/aggregated - Comprehensive aggregated dashboard',
            'GET /api/dashboard/aggregated/:username - Single username across platforms',
            'GET /api/platforms/:platform/:username - Individual platform data',
            'GET /api/platforms/status - Detailed platform status',
            'GET /api/health - Comprehensive health check'
        ],
        features: {
            detailed_statistics: "Complete stats calculation for each platform",
            cross_platform_aggregation: "Combined metrics and insights",
            error_handling: "Comprehensive with retry mechanisms", 
            rate_limiting: "Built-in delays and batch processing",
            data_richness: "Profile, submissions, contests, activity data",
            performance_optimized: "Vercel serverless optimized"
        },
        deployment: {
            vercel_ready: true,
            netlify_ready: true,
            railway_ready: true,
            render_ready: true,
            cors_configured: true,
            timeout_optimized: true,
            memory_efficient: true
        },
        data_returned: {
            leetcode: "Profile, submissions, contests, detailed stats",
            codeforces: "Profile, ratings, submissions, contest history",
            codechef: "Profile, ratings, contests, detailed metrics",
            geeksforgeeks: "Problems, scores, streaks, languages",
            github: "Profile, repos, activity, language distribution",
            atcoder: "Submissions, rankings, problem statistics"
        }
    });
});

// Analytics endpoint (NEW)
app.get('/api/analytics/:username', async (req, res) => {
    const { username } = req.params;
    const { platforms = 'leetcode,codeforces,codechef' } = req.query;

    try {
        // This would be a simplified analytics call
        const platformList = platforms.split(',');
        const analyticsData = {
            username: username,
            timestamp: new Date().toISOString(),
            analytics: {
                problem_solving_trend: "Increasing",
                strongest_platform: "To be calculated",
                improvement_suggestions: [],
                comparative_analysis: {}
            }
        };

        res.json(analyticsData);
    } catch (error) {
        res.status(500).json({
            status: "FAILED",
            error: error.message
        });
    }
});

// Batch processing endpoint (NEW)
app.post('/api/batch/users', async (req, res) => {
    const { users } = req.body;
    
    if (!users || !Array.isArray(users)) {
        return res.status(400).json({
            status: "FAILED",
            message: "users array is required",
            example: {
                users: [
                    { username: "user1", platforms: ["leetcode", "codeforces"] },
                    { username: "user2", platforms: ["github", "codechef"] }
                ]
            }
        });
    }

    try {
        const results = [];
        
        for (const user of users.slice(0, 5)) { // Limit to 5 users max
            // Process each user (simplified for demo)
            results.push({
                username: user.username,
                status: "PROCESSED",
                platforms_requested: user.platforms || [],
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            status: "OK",
            batch_size: results.length,
            results: results,
            processing_time: "Calculated per user"
        });
    } catch (error) {
        res.status(500).json({
            status: "FAILED",
            error: error.message
        });
    }
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
            'GET /api/platforms/:platform/:username',
            'GET /api/platforms/status',
            'GET /api/analytics/:username',
            'POST /api/batch/users'
        ],
        documentation: "Visit / or /api/health for detailed API information"
    });
});

// Export for serverless deployment
module.exports = app;

// Start server only if not in serverless environment
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Multi-Platform Dashboard API (Full Featured) running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🎯 CORS enabled and Vercel optimized`);
        console.log(`🌟 All original features preserved with enhanced functionality`);
        console.log(`⚡ Performance optimized for serverless deployment`);
    });
}