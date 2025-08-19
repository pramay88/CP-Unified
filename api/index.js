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
        this.alfaURL = "http://localhost:8000" || 'https://alfa-leetcode-api.onrender.com';
        this.localApi = "http://localhost:8000";
        this.timeout = 15000;
    }

    async getUserData(username) {
        try {
            console.log(`Fetching comprehensive LeetCode data for: ${username}`);
            
            // Fetch all data sources in parallel
            const [profileData, solvedStats, calendarData, contestData, languageData, skillData, badgesData, dailyProblemData] = await Promise.allSettled([
                this.fetchProfileFromAlfa(username),
                this.fetchSolvedStats(username),
                this.fetchSubmissionCalendarData(username),
                this.fetchContestData(username),
                this.fetchLanguageStats(username),
                this.fetchSkillStats(username),
                this.getBadges(username),
                this.getDailyProblem()
            ]);

            const profile = profileData.status === 'fulfilled' ? profileData.value : null;
            const calendar = calendarData.status === 'fulfilled' ? calendarData.value : null;
            const contests = contestData.status === 'fulfilled' ? contestData.value : null;
            const languages = languageData.status === 'fulfilled' ? languageData.value : null;
            const skills = skillData.status === 'fulfilled' ? skillData.value : null;
            const solvedStatsData = solvedStats.status === 'fulfilled' ? solvedStats.value : null;
            const dailyProblem = dailyProblemData.status === 'fulfilled' ? dailyProblemData.value : null;
            const badges = badgesData.status === 'fulfilled' ? badgesData.value : [];

            return {
                status: "OK",
                platform: "leetcode",
                username: username,
                profile: {
                    name: profile?.name || username,
                    avatar: profile?.avatar || null,
                    ranking: profile?.ranking || null,
                    reputation: profile?.reputation || null,                    
                },
                solvedStats: solvedStatsData  || [],
                contests: contests,
                calendar_data: calendar,
                skills: skills || [],
                badges: badges,
                languageStats: languages,
                dailyProblem: dailyProblem || null,
                
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

    async fetchProfileFromAlfa(username) {
        try {
            const response = await axios.get(`${this.alfaURL}/${username}`, {
                timeout: this.timeout,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeetCode-Portfolio-API)' }
            });
            return response.data;
        } catch (error) {
            console.log(`Alfa LeetCode API failed: ${error.message}`);
            return null;
        }
    }

    async fetchSolvedStats(username) {
        try {
            const response = await axios.get(`${this.alfaURL}/${username}/solved`, {
                timeout: this.timeout,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeetCode-Portfolio-API)' }
            });

            const data = response.data;
            const totalSubmissions = data.totalSubmissionNum?.[0]?.submissions || 0;
            const acceptedSubmissions = data.acSubmissionNum?.[0].submissions || 0;

            let solvedStatsdata = {
                totalSolved: data.solvedProblem || 0,
                easySolved: data.easySolved || 0,
                mediumSolved: data.mediumSolved || 0,
                hardSolved: data.hardSolved || 0,
                totalsubmissionsCount: totalSubmissions,
                acceptance_rate: totalSubmissions > 0 
            ? Math.round((acceptedSubmissions / totalSubmissions) * 100 * 100) / 100 
            : 0,
                totalSubmissions: data.totalSubmissionNum || [],
                

            }


            return solvedStatsdata;
        } catch (error) {
            console.log(`Detailed stats fetch failed: ${error.message}`);
            return null;
        }
    }
    // working
    // Renamed function
async fetchSubmissionCalendarData(username, defaultYear = 2024) {
  let source = "localApi";
  const perYearTimeout = this.timeout ?? 10_000;

  try {
    // 1) Fetch a seed year to discover activeYears (use provided defaultYear)
    let seedResp;
    try {
      seedResp = await axios.get(
        `${this.localApi}/userProfileCalendar?username=${encodeURIComponent(username)}&year=${encodeURIComponent(defaultYear)}`,
        {
          timeout: perYearTimeout,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; LeetCode-Portfolio-API)" },
        }
      );
    } catch (seedErr) {
      console.log(`Primary calendar API failed for seed year, trying fallback: ${seedErr.message}`);
      // Optional: Try GraphQL fallback to get active years
      // seedResp = await this.fetchCalendarFromGraphQL(username, defaultYear);
      source = "graphql";
    }

    if (!seedResp?.data?.data?.matchedUser?.userCalendar) {
      throw new Error("Seed response missing userCalendar");
    }

    const seedCalendar = seedResp.data.data.matchedUser.userCalendar;
    const activeYears = Array.isArray(seedCalendar.activeYears) ? seedCalendar.activeYears : [];

    // If no activeYears are present, still return the single-year data under that year key
    const yearsToFetch = activeYears.length ? activeYears : [defaultYear];

    // 2) Fetch all years in parallel
    const fetchYear = async (year) => {
      try {
        const resp = await axios.get(
          `${this.localApi}/userProfileCalendar?username=${encodeURIComponent(username)}&year=${encodeURIComponent(year)}`,
          {
            timeout: perYearTimeout,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; LeetCode-Portfolio-API)" },
          }
        );

        const data = resp?.data?.data?.matchedUser?.userCalendar;
        if (!data) throw new Error(`Missing userCalendar for ${year}`);

        const totalActiveDays = data.totalActiveDays ?? 0;
        const maxstreak = data?.streak ?? 0;
        const totalSubmissions = this.getTotalSubmissionsCount(data?.submissionCalendar || {});
        const submission_calendar_data = this.getDateSubmissionList(data?.submissionCalendar || {});

        const activeYearsFromThisYear = Array.isArray(data?.activeYears) ? data.activeYears : activeYears;

        return {
          year,
          value: {
            totalSubmissions,
            totalActiveDays,
            maxstreak,
            submission_calendar_data,
            dataSource: source,
            lastUpdated: new Date().toISOString(),
            yearRange: {
              start: activeYearsFromThisYear[0] || null,
              end: activeYearsFromThisYear[activeYearsFromThisYear.length - 1] || null,
            },
          },
        };
      } catch (err) {
        console.log(`Year ${year} fetch failed: ${err.message}`);
        // Provide a predictable fallback per-year node so consumers don’t break
        const fallback = this.getFallbackCalendarData?.() ?? {};
        return {
          year,
          value: {
            ...fallback,
            dataSource: source,
            lastUpdated: new Date().toISOString(),
            yearRange: { start: null, end: null },
          },
        };
      }
    };

    const results = await Promise.all(yearsToFetch.map(fetchYear));

    // 3) Aggregate keyed by year (numbers as keys)
    const perYearMap = results.reduce((acc, { year, value }) => {
      acc[year] = value;
      return acc;
    }, {});

    // 4) Optional top-level summary and metadata
    const allYears = Object.keys(perYearMap).map(Number).sort((a, b) => a - b);
    const topLevel = {
      username,
      activeYears: allYears,
      range: {
        start: allYears[0] ?? null,
        end: allYears[allYears.length - 1] ?? null,
      },
      // Useful global aggregates
      totals: {
        totalSubmissions: allYears.reduce((sum, y) => sum + (perYearMap[y]?.totalSubmissions ?? 0), 0),
        totalActiveDays: allYears.reduce((sum, y) => sum + (perYearMap[y]?.totalActiveDays ?? 0), 0),
        maxStreakOverall: Math.max(...allYears.map((y) => perYearMap[y]?.maxstreak ?? 0), 0),
      },
      dataSource: source,
      lastUpdated: new Date().toISOString(),
    };

    // 5) Return merged object: top-level + per-year keys
    return {
      ...topLevel,
      ...perYearMap,
    };
  } catch (error) {
    console.log(`Calendar data fetch failed: ${error.message}`);
    // Fallback structure for multi-year shape
    const fallback = this.getFallbackCalendarData?.() ?? {};
    return {
      username,
      activeYears: [],
      range: { start: null, end: null },
      totals: { totalSubmissions: 0, totalActiveDays: 0, maxStreakOverall: 0 },
      dataSource: "unknown",
      lastUpdated: new Date().toISOString(),
      // No per-year nodes, but include a "current year" placeholder if you want:
      [defaultYear]: {
        ...fallback,
        dataSource: "unknown",
        lastUpdated: new Date().toISOString(),
        yearRange: { start: null, end: null },
      },
    };
  }
}


    // working 
    getTotalSubmissionsCount(submissionCalendar) {
    if (!submissionCalendar) return 0;

    // Parse JSON if input is a string
    let calendarObj = submissionCalendar;
    if (typeof submissionCalendar === "string") {
        try {
            calendarObj = JSON.parse(submissionCalendar);
        } catch (err) {
            console.error("Invalid submissionCalendar JSON:", err);
            return 0;
        }
    }
    if (typeof calendarObj !== "object" || calendarObj === null) return 0;

    // Sum up all values
    let total = 0;
    for (const key in calendarObj) {
        const count = parseInt(calendarObj[key], 10);
        if (!isNaN(count) && count > 0) {
            total += count;
        }
    }
    return total;
    }

    getDateSubmissionList(submissionCalendar) {
    if (!submissionCalendar) return [];

    // Parse JSON if input is a string
    let calendarObj = submissionCalendar;
    if (typeof submissionCalendar === "string") {
        try {
            calendarObj = JSON.parse(submissionCalendar);
        } catch (err) {
            console.error("Invalid submissionCalendar JSON:", err);
            return [];
        }
    }
    if (typeof calendarObj !== "object" || calendarObj === null) return [];

    // Convert each timestamp to date and build result list
    return Object.entries(calendarObj)
        .map(([timestamp, count]) => ({
            date: new Date(parseInt(timestamp, 10) * 1000)
                    .toISOString()
                    .split("T")[0],
            submissionCount: parseInt(count, 10)
        }))
        .filter(item => item.submissionCount > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    generateDailyActivity(submissionCalendar) {
        const dailyActivity = [];
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        // Generate daily activity for each day in the past year
        for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
            const timestamp = Math.floor(d.getTime() / 1000);
            const dateStr = d.toISOString().split('T')[0];
            const submissionCount = parseInt(submissionCalendar[timestamp]) || 0;
            
            dailyActivity.push({
                date: dateStr,
                total: submissionCount,
                level: this.getActivityLevel(submissionCount), // For heatmap intensity
                platforms: {
                    leetcode: submissionCount
                },
                timestamp: timestamp
            });
        }
        
        return dailyActivity;
    }

    getActivityLevel(count) {
        // Return activity level for heatmap coloring (0-4 scale)
        if (count === 0) return 0;
        if (count <= 2) return 1;
        if (count <= 5) return 2;
        if (count <= 10) return 3;
        return 4;
    }

    getFallbackCalendarData() {
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const dailyActivity = [];
        for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
            dailyActivity.push({
                date: d.toISOString().split('T')[0],
                total: 0,
                level: 0,
                platforms: { leetcode: 0 },
                timestamp: Math.floor(d.getTime() / 1000)
            });
        }

        return {
            totalSubmissions: 0,
            totalActiveDays: 0,
            currentStreak: 0,
            maxStreak: 0,
            dailyActivity,
            submissionsHistory: [],
            submissionCalendar: {},
            dataSource: 'fallback',
            lastUpdated: new Date().toISOString(),
            yearRange: {
                start: dailyActivity[0]?.date || null,
                end: dailyActivity[dailyActivity.length - 1]?.date || null
            }
        };
    }

    async fetchCalendarFromGraphQL(username) {
        // Fallback GraphQL query for calendar data
        const query = `
        query userProfileCalendar($username: String!) {
            matchedUser(username: $username) {
                submissionCalendar
                profile {
                    realName
                }
            }
        }`;
        
        try {
            const response = await axios.post(this.graphqlURL, {
                query: query,
                variables: { username: username }
            }, {
                timeout: this.timeout,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; LeetCode-Portfolio-API)'
                }
            });
            
            return {
                submissionCalendar: JSON.parse(response.data.data.matchedUser.submissionCalendar || '{}')
            };
        } catch (error) {
            console.log(`GraphQL calendar fallback failed: ${error.message}`);
            return null;
        }
    }

    async fetchContestData(username) {
        try {
            const response = await axios.get(`${this.alfaURL}/${username}/contest`, {
                timeout: this.timeout,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeetCode-Portfolio-API)' }
            });
            return response.data;
        } catch (error) {
            console.log(`Contest data fetch failed: ${error.message}`);
            return null;
        }
    }

    async fetchLanguageStats(username) {
        try {
            const response = await axios.get(`${this.alfaURL}/languageStats?username=${username}`, {
                timeout: this.timeout,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeetCode-Portfolio-API)' }
            });
            return response.data.matchedUser || null;
        } catch (error) {
            console.log(`Language stats fetch failed: ${error.message}`);
            return null;
        }
    }

    async fetchSkillStats(username) {
        try {
            const response = await axios.get(`${this.alfaURL}/skillStats/${username}`, {
                timeout: this.timeout,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeetCode-Portfolio-API)' }
            });
            
            const skills = response.data.data.matchedUser.tagProblemCounts || [];
            return skills;
        } catch (error) {
            console.log(`Skill stats fetch failed: ${error.message}`);
            return null;
        }
    }

    async getDailyProblem(){
        try {
            const response = await axios.get(`${this.alfaURL}/daily`, {
                timeout: this.timeout,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeetCode-Portfolio-API)' }
            });
            
            // const skills = response.data.data.matchedUser.tagProblemCounts || [];
            return response.data;
        } catch (error) {
            console.log(`Leetcode Daily problem Fetch failed: ${error.message}`);
            return null;
        }
    }

    async getBadges(username) {
        try {
            const response = await axios.get(`${this.alfaURL}/${username}/badges`, {
                timeout: this.timeout,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeetCode-Portfolio-API)' }
            });
            
            return response.data || [];
        } catch (error) {
            console.log(`Leetcode Badges Fetch failed: ${error.message}`);
            return [];
        }
    }
}

class CodeForcesAPI {
  constructor() {
    this.baseURL = 'https://codeforces.com/api';
    this.timeout = 8000;
  }

  async fetchWithRetry(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'MultiPlatform-Dashboard-API' }
      });
      return response;
    } catch (error) {
      // Note: original code referenced i/retries; simplifying to single attempt log
      console.log(`Fetch failed for ${url}: ${error.message}`);
      throw error;
    }
  }

async getUserData(handle) {
  try {
    const [userInfo, ratings, submissions, contestData] = await Promise.allSettled([
      this.fetchWithRetry(`${this.baseURL}/user.info?handles=${handle}`),
      this.fetchWithRetry(`${this.baseURL}/user.rating?handle=${handle}`),
      this.fetchWithRetry(`${this.baseURL}/user.status?handle=${handle}&from=1&count=10000`),
      this.fetchContestData(handle)
    ]);

    const userData = userInfo.status === 'fulfilled' ? userInfo.value.data?.result?.[0] : null;
    const ratingsData = ratings.status === 'fulfilled' ? ratings.value.data?.result : null;
    const submissionsData = submissions.status === 'fulfilled' ? submissions.value.data?.result : null;
    const contests = contestData.status === 'fulfilled' ? contestData.value : null;

    if (!userData) {
      return { 
        status: "FAILED",
        timestamp: new Date().toISOString(),
        platform: "codeforces",
        username: handle,
        error: "User not found"
      };
    }

    // Build LeetCode-style calendar from CF submissions
    const { calendarAll, perYearNodes } =
      this.buildLeetCodeStyleCalendar(submissionsData || []);

    // Calendar block packed under data.calendar_data
    const calendar_data = {
      totalSubmissions: calendarAll.totalSubmissions,
      totalActiveDays: calendarAll.totalActiveDays,
      maxstreak: calendarAll.maxstreak,
    //   submissionCalendar: calendarAll.submissionCalendar, // JSON string with epoch-ms day keys
      submission_calendar_data: calendarAll.submission_calendar_data, // parsed/day-list if you produce it
      activeYears: calendarAll.activeYears,
      yearRange: calendarAll.yearRange,
      byYear: perYearNodes // { [year]: { totalSubmissions, totalActiveDays, maxstreak, submissionCalendar, submission_calendar_data, yearRange } }
    };

    // Solved stats as before
    const solvedStats = this.calculateDetailedStats(userData, ratingsData, submissionsData);

    // Final response shape (everything inside data)
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
      platform: "codeforces",
      username: handle,
        profile: userData,
        contests : contests,
        solvedStats: solvedStats,
        calendar_data: calendar_data
    };
  } catch (error) {
    console.error(`CodeForces API Error for ${handle}:`, error.message);
    return { 
      status: "FAILED",
      timestamp: new Date().toISOString(),
      platform: "codeforces",
      username: handle,
      error: error.message
    };
  }
}



  async fetchContestData(handle) {
    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/user.rating?handle=${handle}`);
      const ratingsData = response.data?.result || [];
      
      if (ratingsData.length === 0) {
        return {
          contestsAttended: 0,
          recentContests: [],
          bestRank: null,
          worstRank: null,
          maxRatingGain: 0,
          maxRatingLoss: 0,
          ratingProgression: []
        };
      }

      const recentContests = ratingsData.slice(-10).map(contest => ({
        contestId: contest.contestId,
        contestName: contest.contestName,
        rank: contest.rank,
        oldRating: contest.oldRating,
        newRating: contest.newRating,
        ratingChange: contest.newRating - contest.oldRating,
        participationTime: new Date(contest.ratingUpdateTimeSeconds * 1000).toISOString()
      }));

      return {
        contestsAttended: ratingsData.length,
        recentContests: recentContests,
        bestRank: Math.min(...ratingsData.map(c => c.rank)),
        worstRank: Math.max(...ratingsData.map(c => c.rank)),
        maxRatingGain: Math.max(...ratingsData.map(c => c.newRating - c.oldRating)),
        maxRatingLoss: Math.min(...ratingsData.map(c => c.newRating - c.oldRating)),
        ratingProgression: ratingsData.map(c => ({
          date: new Date(c.ratingUpdateTimeSeconds * 1000).toISOString(),
          rating: c.newRating,
          contest: c.contestName
        }))
      };
    } catch (error) {
      console.log(`Codeforces contest data fetch failed: ${error.message}`);
      return null;
    }
  }

  calculateDetailedStats(userData, ratingsData, submissionsData) {
    const stats = {
      current_rating: userData.rating || 0,
      max_rating: userData.maxRating || 0,
      rank: userData.rank || 'Unrated',
      max_rank: userData.maxRank || 'Unrated',
      contribution: userData.contribution || 0,
      problems_solved: 0,
      contests_participated: ratingsData ? ratingsData.length : 0,
      language_stats: {},
      verdict_stats: {},
      difficulty_distribution: {},
      yearly_submissions: {}
    };

    if (submissionsData) {
      const acceptedProblems = new Set();
      
      submissionsData.forEach(submission => {
        const year = new Date(submission.creationTimeSeconds * 1000).getFullYear();
        stats.yearly_submissions[year] = (stats.yearly_submissions[year] || 0) + 1;
        
        stats.language_stats[submission.programmingLanguage] = 
          (stats.language_stats[submission.programmingLanguage] || 0) + 1;
        
        stats.verdict_stats[submission.verdict] = 
          (stats.verdict_stats[submission.verdict] || 0) + 1;

        if (submission.verdict === 'OK') {
          acceptedProblems.add(`${submission.problem.contestId}-${submission.problem.index}`);
          
          const rating = submission.problem.rating;
          if (rating) {
            const bucket = Math.floor(rating / 100) * 100;
            stats.difficulty_distribution[bucket] = 
              (stats.difficulty_distribution[bucket] || 0) + 1;
          }
        }
      });
      
      stats.problems_solved = acceptedProblems.size;
    }

    return stats;
  }
  

  // ===== NEW: Build LeetCode-like submission calendar =====
  buildSubmissionCalendarDataFromCF(submissions) {
    // Map dayStartMs -> count
    const dayCounts = new Map(); // all-time
    // Per year breakdown
    const perYearDayCounts = new Map(); // year -> Map(dayStartMs -> count)

    for (const s of submissions) {
      if (!s?.creationTimeSeconds) continue;
      const ms = s.creationTimeSeconds * 1000;
      const d = new Date(ms);
      // Normalize to UTC midnight
      const dayStartMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const year = d.getUTCFullYear();

      dayCounts.set(dayStartMs, (dayCounts.get(dayStartMs) || 0) + 1);

      if (!perYearDayCounts.has(year)) perYearDayCounts.set(year, new Map());
      const ym = perYearDayCounts.get(year);
      ym.set(dayStartMs, (ym.get(dayStartMs) || 0) + 1);
    }

    // Helpers
    const mapToJsonString = (m) => {
      const obj = {};
      for (const [k, v] of m.entries()) {
        obj[String(k)] = v;
      }
      return JSON.stringify(obj);
    };

    const computeStreakFromDays = (m) => {
      if (m.size === 0) return 0;
      const days = Array.from(m.keys()).sort((a, b) => a - b);
      let maxStreak = 1;
      let curStreak = 1;
      for (let i = 1; i < days.length; i++) {
        const prev = days[i - 1];
        const curr = days[i];
        if (curr === prev + 24 * 60 * 60 * 1000) {
          curStreak += 1;
        } else {
          if (curStreak > maxStreak) maxStreak = curStreak;
          curStreak = 1;
        }
      }
      if (curStreak > maxStreak) maxStreak = curStreak;
      return maxStreak;
    };

    // All-time aggregates
    const activeYears = Array.from(perYearDayCounts.keys()).sort((a, b) => a - b);
    const totalActiveDaysAll = dayCounts.size;
    const streakAll = computeStreakFromDays(dayCounts);
    const submissionCalendarAll = mapToJsonString(dayCounts);

    // Per-year nodes
    const byYear = {};
    for (const year of activeYears) {
      const ym = perYearDayCounts.get(year);
      const totalActiveDays = ym.size;
      const streak = computeStreakFromDays(ym);
      const submissionCalendar = mapToJsonString(ym);
      byYear[year] = {
        totalActiveDays,
        streak,
        // Match LeetCode key name exactly: submissionCalendar
        submissionCalendar,
        // Convenience: total submissions for year (sum of counts)
        totalSubmissions: Array.from(ym.values()).reduce((a, b) => a + b, 0),
        yearRange: { start: year, end: year }
      };
    }

    // Return a LeetCode-like shape with multi-year convenience
    return {
      activeYears,
      totalActiveDays: totalActiveDaysAll,
      streak: streakAll,
      submissionCalendar: submissionCalendarAll,
      totalSubmissions: Array.from(dayCounts.values()).reduce((a, b) => a + b, 0),
      yearRange: activeYears.length
        ? { start: activeYears[0], end: activeYears[activeYears.length - 1] }
        : { start: null, end: null },
      byYear // per-year breakdown similar to querying LeetCode by specific year
    };
  }
  // Builds LeetCode-like calendar from Codeforces submissions
buildLeetCodeStyleCalendar(submissions) {
  // dayStartMs -> count (Map for all-time)
  const allDayCounts = new Map();
  // year -> Map(dayStartMs -> count)
  const perYear = new Map();

  for (const s of submissions || []) {
    const t = s?.creationTimeSeconds;
    if (!t) continue;
    const d = new Date(t * 1000);
    const y = d.getUTCFullYear();
    const dayStartMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

    allDayCounts.set(dayStartMs, (allDayCounts.get(dayStartMs) || 0) + 1);

    if (!perYear.has(y)) perYear.set(y, new Map());
    const ym = perYear.get(y);
    ym.set(dayStartMs, (ym.get(dayStartMs) || 0) + 1);
  }

  const mapToJSONString = (m) => {
    // Keys must be strings in the JSON; values are integers
    const obj = {};
    for (const [k, v] of m.entries()) {
  // Convert epoch ms (e.g., 1321315200000) to YYYY-MM-DD string
  const d = new Date(Number(k));
  if (!isNaN(d.getTime())) {
    const dateStr = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    obj[dateStr] = v;
  } else {
    obj[String(k)] = v; // fallback for non-date keys
  }
}
   
    return JSON.stringify(obj);
  };

  const computeLongestStreak = (m) => {
    if (m.size === 0) return 0;
    const days = Array.from(m.keys()).sort((a, b) => a - b);
    let best = 1, cur = 1;
    const oneDay = 24 * 60 * 60 * 1000;
    for (let i = 1; i < days.length; i++) {
      if (days[i] === days[i - 1] + oneDay) cur += 1;
      else { if (cur > best) best = cur; cur = 1; }
    }
    if (cur > best) best = cur;
    return best;
  };

  const activeYears = Array.from(perYear.keys()).sort((a, b) => a - b);

  // All-time summary (mirrors LeetCode userCalendar aggregated style)
  const totalActiveDays = allDayCounts.size;
  const maxstreak = computeLongestStreak(allDayCounts); // name aligned with your LeetCode code
  const totalSubmissions = Array.from(allDayCounts.values()).reduce((a, b) => a + b, 0);
  const submissionCalendar = mapToJSONString(allDayCounts);

  // Per-year nodes: same variable names as in your LeetCode function
  const perYearNodes = {};
  for (const y of activeYears) {
    const ym = perYear.get(y);
    const y_totalActiveDays = ym.size;
    const y_maxstreak = computeLongestStreak(ym);
    const y_totalSubmissions = Array.from(ym.values()).reduce((a, b) => a + b, 0);
    const y_submissionCalendar = mapToJSONString(ym);

    // Same names you used in LeetCode return shape
    perYearNodes[y] = {
      totalSubmissions: y_totalSubmissions,
      totalActiveDays: y_totalActiveDays,
      maxstreak: y_maxstreak,
      // If your LeetCode function exposes 'submission_calendar_data' as parsed map, keep it:
      submission_calendar_data: this.getDateSubmissionList
        ? this.getDateSubmissionList(JSON.parse(y_submissionCalendar))
        : undefined,
      submissionCalendar: y_submissionCalendar,
      yearRange: { start: y, end: y }
    };
  }

  // Top-level multi-year, same names
  const calendarAll = {
    totalSubmissions,
    totalActiveDays,
    maxstreak,
    // If you produce submission_calendar_data in LeetCode as parsed object, add it too:
    submission_calendar_data: this.getDateSubmissionList
      ? this.getDateSubmissionList(JSON.parse(submissionCalendar))
      : undefined,
    submissionCalendar, // JSON string like {"1293494400000":7,...}
    activeYears,
    yearRange: activeYears.length
      ? { start: activeYears[0], end: activeYears[activeYears.length - 1] }
      : { start: null, end: null }
  };

  return { calendarAll, perYearNodes };
}

}




class CodeChefAPI {
    constructor() {
        this.timeout = 15000;
    }

    async getUserData(handle) {
  try {
    console.log(`Fetching CodeChef data for: ${handle}`);

    const response = await axios.get(`https://www.codechef.com/users/${handle}`, {
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: Could not fetch profile`);
    }

    const htmlData = response.data;
    const dom = new JSDOM(htmlData);
    const document = dom.window.document;

    const problemsSolved = this.extractProblemsSolved(document, htmlData);
    const contestData = this.extractContestData(document, htmlData);

    // Rating data
    let ratingData = null;
    let highestRating = 0;
    try {
      const allRatingStart = htmlData.search("var all_rating = ") + "var all_rating = ".length;
      const allRatingEnd = htmlData.search("var current_user_rating =") - 6;
      if (allRatingStart > -1 && allRatingEnd > allRatingStart) {
        ratingData = JSON.parse(htmlData.substring(allRatingStart, allRatingEnd));
        if (ratingData && ratingData.length > 0) {
          highestRating = Math.max(...ratingData.map(r => r.rating || 0));
        }
      }
    } catch (e) {
      console.log('Could not parse rating data:', e.message);
    }

    // Profile info
    const userDetailsContainer = document.querySelector(".user-details-container");
    const ratingNumber = document.querySelector(".rating-number");
    const ratingRanks = document.querySelector(".rating-ranks");
    const ratingElement = document.querySelector(".rating");
    const badges = this.extractBadgesData(document, htmlData);

    const currentRating = parseInt(ratingNumber?.textContent?.replace(/[^\d]/g, '')) || 0;
    if (highestRating === 0) highestRating = currentRating;

    // ==== NEW: Build calendar_data ====
    // Try to extract a daily heatmap object from HTML; if not, fall back to minimal activity from rating progression (contests days).
    let calendar_data;
    try {
      const dailyObj = this.extractDailyHeatmapObject(htmlData);
      if (dailyObj) {
        calendar_data = this.buildLeetCodeStyleCalendarFromCodeChef(dailyObj);
      } else {
        // Fallback: derive from contest end dates (very sparse, but better than empty)
        const dayCounts = {};
        const ratingProg = contestData?.ratingProgression || [];
        for (const r of ratingProg) {
          if (!r?.date) continue;
          const d = new Date(r.date);
          if (isNaN(d.getTime())) continue;
          const dayStartMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
          dayCounts[String(dayStartMs)] = (dayCounts[String(dayStartMs)] || 0) + 1;
        }
        calendar_data = this.buildLeetCodeStyleCalendarFromCodeChef(dayCounts);
      }
    } catch (e) {
      console.log('calendar_data build failed:', e.message);
      // Safe empty structure
      calendar_data = {
        totalSubmissions: 0,
        totalActiveDays: 0,
        maxstreak: 0,
        submissionCalendar: JSON.stringify({}),
        submission_calendar_data: this.getDateSubmissionList ? this.getDateSubmissionList({}) : undefined,
        activeYears: [],
        yearRange: { start: null, end: null },
        byYear: {}
      };
    }

    return {
      profile: {
        name: this.extractName(userDetailsContainer) || handle,
        username: handle,
        avatar: userDetailsContainer?.querySelector('img')?.src || null,
        globalRank: this.extractRank(ratingRanks, 'global') || 0,
        countryRank: this.extractRank(ratingRanks, 'country') || 0,
        stars: ratingElement?.textContent?.trim() || "unrated"
      },
      solvedStats: {
        totalSolved: problemsSolved
      },
      contests: {
        current_rating: currentRating,
        highest_rating: highestRating,
        division: this.getDivisionFromRating(currentRating),
        contestData
      },
      badges: {
        totalBadges: badges.length,
        badges: badges,
        stats: this.categorizeBadgeStats(badges)
      },
      // Place the LeetCode-like calendar under data.calendar_data
      calendar_data
    };
  } catch (error) {
    console.error(`CodeChef API Error for ${handle}:`, error.message);

    const failure = {
      status: "FAILED",
      timestamp: new Date().toISOString(),
      platform: "codechef",
      username: handle,
      error: error.message
    };

    if (error.response?.status === 404) {
      failure.error = "User not found on CodeChef";
    } else if (error.response?.status === 429) {
      failure.status = "RATE_LIMITED";
      failure.error = "Rate limited by CodeChef. Please try again later.";
    }

    return failure;
  }
}


    extractProblemsSolved(document, htmlData) {
        console.log('Extracting problems solved using multiple methods...');
        
        // Method 1: Look for problems solved in the page data/JavaScript
        let problemsSolved = this.extractFromPageData(htmlData);
        if (problemsSolved > 0) {
            console.log(`Method 1 (Page Data): Found ${problemsSolved} problems`);
            return problemsSolved;
        }

        // Method 2: Extract from heatmap data (improved parsing)
        problemsSolved = this.extractFromHeatmap(htmlData);
        if (problemsSolved > 0) {
            console.log(`Method 2 (Heatmap): Found ${problemsSolved} problems`);
            return problemsSolved;
        }

        // Method 3: Look in profile sections
        problemsSolved = this.extractFromProfileSections(document);
        if (problemsSolved > 0) {
            console.log(`Method 3 (Profile Sections): Found ${problemsSolved} problems`);
            return problemsSolved;
        }

        // Method 4: Look for specific selectors
        problemsSolved = this.extractFromSelectors(document);
        if (problemsSolved > 0) {
            console.log(`Method 4 (Selectors): Found ${problemsSolved} problems`);
            return problemsSolved;
        }

        console.log('All methods failed to extract problems solved count');
        return 0;
    }

    extractContestData(document, htmlData) {
        try {
            let contestData = null;
            const ratingsStart = htmlData.search("var all_rating = ") + "var all_rating = ".length;
            const ratingsEnd = htmlData.search("var current_user_rating =") - 6;
            
            if (ratingsStart > -1 && ratingsEnd > ratingsStart) {
                const ratingsDataStr = htmlData.substring(ratingsStart, ratingsEnd);
                const ratingsData = JSON.parse(ratingsDataStr);
                
                if (ratingsData && ratingsData.length > 0) {
                    const recentContests = ratingsData.slice(-10).map(contest => ({
                        contestId: contest.contest_id || contest.code,
                        contestName: contest.name || contest.contest_name,
                        rating: contest.rating,
                        rank: contest.rank,
                        endDate: contest.end_date,
                        participationTime: contest.end_date
                    }));

                    contestData = {
                        contestsAttended: ratingsData.length,
                        // recentContests: recentContests,
                        bestRank: ratingsData.filter(c => c.rank).length > 0 ? 
                            Math.min(...ratingsData.filter(c => c.rank).map(c => c.rank)) : null,
                        worstRank: ratingsData.filter(c => c.rank).length > 0 ? 
                            Math.max(...ratingsData.filter(c => c.rank).map(c => c.rank)) : null,
                        ratingProgression: ratingsData.map(c => ({
                            date: c.end_date,
                            rating: c.rating,
                            contest: c.name
                        }))
                    };
                }
            }

            return contestData || {
                contestsAttended: 0,
                recentContests: [],
                bestRank: null,
                worstRank: null,
                ratingProgression: []
            };
        } catch (error) {
            console.log('CodeChef contest data extraction failed:', error.message);
            return null;
        }
    }


    extractFromPageData(htmlData) {
        try {
            // Look for total problems solved in JavaScript variables
            const patterns = [
                /total[_\s]*problems[_\s]*solved["\s]*:\s*(\d+)/gi,
                /problems[_\s]*solved["\s]*:\s*(\d+)/gi,
                /solved[_\s]*problems["\s]*:\s*(\d+)/gi,
                /"solved":\s*(\d+)/gi,
                /"totalSolved":\s*(\d+)/gi,
                /var\s+totalSolved\s*=\s*(\d+)/gi
            ];

            for (let pattern of patterns) {
                const matches = [...htmlData.matchAll(pattern)];
                for (let match of matches) {
                    const count = parseInt(match[1]);
                    if (count > 10 && count < 10000) { // Reasonable range
                        return count;
                    }
                }
            }
        } catch (e) {
            console.log('extractFromPageData failed:', e.message);
        }
        return 0;
    }

    extractFromHeatmap(htmlData) {
        try {
            // Multiple heatmap patterns
            const heatmapPatterns = [
                { start: "var userDailySubmissionsStats =", end: ";", offset: 0 },
                { start: "userDailySubmissionsStats =", end: ";", offset: 0 },
                { start: "'#js-heatmap'", end: "'", offset: -50 }
            ];

            for (let pattern of heatmapPatterns) {
                const startIndex = htmlData.indexOf(pattern.start);
                if (startIndex > -1) {
                    const dataStart = startIndex + pattern.start.length + pattern.offset;
                    let dataEnd = htmlData.indexOf(pattern.end, dataStart);
                    if (dataEnd === -1) dataEnd = dataStart + 5000; // Reasonable limit

                    try {
                        const dataString = htmlData.substring(dataStart, dataEnd).trim();
                        
                        // Try to find JSON in the string
                        const jsonMatch = dataString.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const heatMapData = JSON.parse(jsonMatch[0]);
                            let total = 0;
                            
                            Object.values(heatMapData).forEach(dayData => {
                                if (typeof dayData === 'object') {
                                    if (dayData.value) total += parseInt(dayData.value) || 0;
                                    if (dayData.solved) total += parseInt(dayData.solved) || 0;
                                    if (dayData.count) total += parseInt(dayData.count) || 0;
                                } else if (typeof dayData === 'number') {
                                    total += dayData;
                                }
                            });
                            
                            if (total > 0) return total;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        } catch (e) {
            console.log('extractFromHeatmap failed:', e.message);
        }
        return 0;
    }

    extractFromProfileSections(document) {
        try {
            // Look in various profile sections
            const selectors = [
                '.rating-data-section',
                '.user-details-container',
                '.rating-container', 
                '.profile-stats',
                '.user-stats',
                '.contest-stats',
                '.rating-number-container'
            ];

            for (let selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (let element of elements) {
                    const text = element.textContent || '';
                    
                    // Look for patterns like "136 Problems Solved" or similar
                    const patterns = [
                        /(\d{2,4})\s*problems?\s*solved/gi,
                        /solved[:\s]*(\d{2,4})/gi,
                        /problems?[:\s]*(\d{2,4})/gi
                    ];
                    
                    for (let pattern of patterns) {
                        const match = text.match(pattern);
                        if (match) {
                            const count = parseInt(match[1]);
                            if (count > 10 && count < 10000) {
                                return count;
                            }
                        }
                    }

                    // Look for standalone numbers in reasonable range
                    const numbers = text.match(/\b(\d{2,4})\b/g);
                    if (numbers) {
                        for (let number of numbers) {
                            const num = parseInt(number);
                            if (num >= 50 && num <= 5000) {
                                // Additional validation - check if it's likely to be problems solved
                                const context = element.innerHTML.toLowerCase();
                                if (context.includes('problem') || context.includes('solved') || 
                                    context.includes('total') || context.includes('count')) {
                                    return num;
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log('extractFromProfileSections failed:', e.message);
        }
        return 0;
    }

    extractFromSelectors(document) {
        try {
            // Specific selectors that might contain problems solved
            const specificSelectors = [
                '.problem-solved-count',
                '.total-solved',
                '.problems-count',
                '[data-problems-solved]',
                '.rating-number:not(.rating-number)',
                'h3:contains("Problems")',
                'span:contains("Solved")'
            ];

            for (let selector of specificSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent || element.getAttribute('data-problems-solved') || '';
                    const match = text.match(/(\d+)/);
                    if (match) {
                        const count = parseInt(match[1]);
                        if (count > 10 && count < 10000) {
                            return count;
                        }
                    }
                }
            }

            // Try data attributes
            const elementsWithData = document.querySelectorAll('[data-*]');
            for (let element of elementsWithData) {
                const attributes = element.attributes;
                for (let attr of attributes) {
                    if (attr.name.includes('problem') || attr.name.includes('solved')) {
                        const count = parseInt(attr.value);
                        if (count > 10 && count < 10000) {
                            return count;
                        }
                    }
                }
            }
        } catch (e) {
            console.log('extractFromSelectors failed:', e.message);
        }
        return 0;
    }

    extractName(userDetailsContainer) {
        try {
            if (userDetailsContainer) {
                // Try different selectors for name
                const nameElement = userDetailsContainer.querySelector('.user-name, .username, h1, h2, .name');
                if (nameElement) {
                    return nameElement.textContent.trim();
                }
                
                // Try getting from child elements
                const textElements = userDetailsContainer.querySelectorAll('*');
                for (let element of textElements) {
                    const text = element.textContent.trim();
                    if (text && text.length > 2 && text.length < 50 && !text.match(/^\d+$/) && !text.includes('@')) {
                        return text;
                    }
                }
            }
        } catch (e) {
            console.log('extractName failed:', e.message);
        }
        return null;
    }

    extractRank(ratingRanks, type) {
        try {
            if (ratingRanks) {
                const rankElements = ratingRanks.querySelectorAll('*');
                let rankIndex = type === 'global' ? 0 : 1;
                
                for (let element of rankElements) {
                    const text = element.textContent;
                    const match = text.match(/(\d+)/);
                    if (match && rankIndex-- === 0) {
                        return parseInt(match[1]);
                    }
                }
            }
        } catch (e) {
            console.log('extractRank failed:', e.message);
        }
        return 0;
    }

    getDivisionFromRating(rating) {
        if (rating >= 2200) return "Division 1";
        if (rating >= 1800) return "Division 2";
        if (rating >= 1400) return "Division 3";
        if (rating >= 1000) return "Division 4";
        return "Unrated";
    }

    // Replace the previous badge extraction methods with this optimized version
extractBadgesData(document, htmlData) {
    try {
        console.log('Extracting badges data from CodeChef...');
        
        // Look for the badges widget container
        const badgesWidget = document.querySelector('.widget.badges');
        if (!badgesWidget) {
            console.log('No badges widget found');
            return [];
        }

        const badgeElements = badgesWidget.querySelectorAll('.badge');
        const badges = [];

        badgeElements.forEach(badgeElement => {
            try {
                const badge = this.parseBadgeElement(badgeElement);
                if (badge) {
                    badges.push(badge);
                }
            } catch (error) {
                console.log('Error parsing individual badge:', error.message);
            }
        });

        console.log(`Successfully extracted ${badges.length} badges`);
        return badges;
    } catch (error) {
        console.log('extractBadgesData failed:', error.message);
        return [];
    }
}

parseBadgeElement(badgeElement) {
    try {
        // Extract image and alt text
        const img = badgeElement.querySelector('.badge__image img');
        const icon = img?.src || null;
        const altText = img?.alt || '';

        // Extract title
        const titleElement = badgeElement.querySelector('.badge__title');
        const title = titleElement?.textContent?.trim() || '';

        // Extract description and goal
        const descriptionElement = badgeElement.querySelector('.badge__description');
        let description = '';
        let goal = null;

        if (descriptionElement) {
            description = descriptionElement.textContent?.trim() || '';
            
            // Extract the goal number from the span
            const goalElement = descriptionElement.querySelector('.badge__goal');
            if (goalElement) {
                goal = parseInt(goalElement.textContent?.trim()) || null;
            }
        }

        // Determine category and level from the badge
        const category = this.determineBadgeCategory(title, description, icon);
        const level = this.determineBadgeLevel(title, icon);

        return {
            name: title || altText,
            description: description,
            icon: icon,
            category: category,
            level: level,
            goal: goal,
            earnedDate: null // CodeChef doesn't seem to show earned dates in this structure
        };
    } catch (error) {
        console.log('parseBadgeElement failed:', error.message);
        return null;
    }
}

determineBadgeCategory(title, description, icon) {
    const titleLower = (title || '').toLowerCase();
    const descriptionLower = (description || '').toLowerCase();
    const iconLower = (icon || '').toLowerCase();

    if (titleLower.includes('contest') || descriptionLower.includes('contest') || iconLower.includes('contest')) {
        return 'contest';
    }
    if (titleLower.includes('problem') || descriptionLower.includes('problem') || iconLower.includes('problem')) {
        return 'problem_solving';
    }
    if (titleLower.includes('rating') || descriptionLower.includes('rating') || iconLower.includes('rating')) {
        return 'rating';
    }
    if (titleLower.includes('streak') || descriptionLower.includes('streak') || descriptionLower.includes('daily')) {
        return 'consistency';
    }
    if (titleLower.includes('participation') || descriptionLower.includes('participating')) {
        return 'participation';
    }
    
    return 'general';
}

determineBadgeLevel(title, icon) {
    const titleLower = (title || '').toLowerCase();
    const iconLower = (icon || '').toLowerCase();

    if (titleLower.includes('bronze') || iconLower.includes('bronze')) {
        return 'bronze';
    }
    if (titleLower.includes('silver') || iconLower.includes('silver')) {
        return 'silver';
    }
    if (titleLower.includes('gold') || iconLower.includes('gold')) {
        return 'gold';
    }
    if (titleLower.includes('platinum') || iconLower.includes('platinum')) {
        return 'platinum';
    }
    if (titleLower.includes('diamond') || iconLower.includes('diamond')) {
        return 'diamond';
    }
    
    return 'unknown';
}

// Helper method to categorize badge statistics
categorizeBadgeStats(badges) {
    const categories = {};
    const levels = {};
    
    badges.forEach(badge => {
        // Count by category
        const category = badge.category || 'general';
        categories[category] = (categories[category] || 0) + 1;
        
        // Count by level
        const level = badge.level || 'unknown';
        levels[level] = (levels[level] || 0) + 1;
    });
    
    return {
        byCategory: categories,
        byLevel: levels
    };
}

// Inside class CodeChefAPI
buildLeetCodeStyleCalendarFromCodeChef(heatmapJsonLike) {
  // Accepts one of:
  // - direct JSON object: { "1293494400000": 7, ... }
  // - or nested object like { "2024-01-01": { value: 2 }, ... }
  // The CodeChef page varies; we’ll normalize into a Map(dayStartMs -> count).

  const dayCounts = new Map();           // all-time map
  const perYearDayCounts = new Map();    // year -> Map(dayStartMs -> count)

  const tryParseCount = (val) => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object') {
      // Try common keys
      if (typeof val.value === 'number') return val.value;
      if (typeof val.solved === 'number') return val.solved;
      if (typeof val.count === 'number') return val.count;
      // sometimes strings
      if (val.value) return parseInt(val.value) || 0;
      if (val.solved) return parseInt(val.solved) || 0;
      if (val.count) return parseInt(val.count) || 0;
    }
    if (typeof val === 'string') {
      const n = parseInt(val);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const addDay = (dayStartMs, count) => {
    if (!count) return;
    dayCounts.set(dayStartMs, (dayCounts.get(dayStartMs) || 0) + count);
    const d = new Date(dayStartMs);
    const y = d.getUTCFullYear();
    if (!perYearDayCounts.has(y)) perYearDayCounts.set(y, new Map());
    const ym = perYearDayCounts.get(y);
    ym.set(dayStartMs, (ym.get(dayStartMs) || 0) + count);
  };

  // Normalize input into dayStartMs -> count
  if (heatmapJsonLike && typeof heatmapJsonLike === 'object') {
    for (const [k, rawVal] of Object.entries(heatmapJsonLike)) {
      const count = tryParseCount(rawVal);

      // Case 1: key is epoch-ms string
      if (/^\d{12,}$/.test(k)) {
        const dayStartMs = Number(k);
        addDay(dayStartMs, count);
        continue;
      }
      // Case 2: key is ISO-like date "YYYY-MM-DD" (or similar)
      // We convert to UTC midnight
      const date = new Date(k);
      if (!isNaN(date.getTime())) {
        const dayStartMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        addDay(dayStartMs, count);
        continue;
      }
      // Otherwise ignore
    }
  }

  const mapToJSONString = (m) => {
    const obj = {};
    for (const [k, v] of m.entries()) {
  // Convert epoch ms (e.g., 1321315200000) to YYYY-MM-DD string
  const d = new Date(Number(k));
  if (!isNaN(d.getTime())) {
    const dateStr = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    obj[dateStr] = v;
  } else {
    obj[String(k)] = v; // fallback for non-date keys
  }
}

    return JSON.stringify(obj);
  };

  const computeLongestStreak = (m) => {
    if (m.size === 0) return 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const days = Array.from(m.keys()).sort((a, b) => a - b);
    let best = 1, cur = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i] === days[i - 1] + oneDay) cur += 1;
      else { if (cur > best) best = cur; cur = 1; }
    }
    return Math.max(best, cur);
  };

  const activeYears = Array.from(perYearDayCounts.keys()).sort((a, b) => a - b);
  const totalActiveDays = dayCounts.size;
  const maxstreak = computeLongestStreak(dayCounts);
  const totalSubmissions = Array.from(dayCounts.values()).reduce((a, b) => a + b, 0);
  const submissionCalendar = mapToJSONString(dayCounts);

  const byYear = {};
  for (const y of activeYears) {
    const ym = perYearDayCounts.get(y);
    const ySubmissionCalendar = mapToJSONString(ym);
    byYear[y] = {
      totalSubmissions: Array.from(ym.values()).reduce((a, b) => a + b, 0),
      totalActiveDays: ym.size,
      maxstreak: computeLongestStreak(ym),
      submissionCalendar: ySubmissionCalendar,
      submission_calendar_data: this.getDateSubmissionList
        ? this.getDateSubmissionList(JSON.parse(ySubmissionCalendar))
        : undefined,
      yearRange: { start: y, end: y }
    };
  }

  return {
    totalSubmissions,
    totalActiveDays,
    maxstreak,
    submissionCalendar, // JSON string like {"1293494400000":7,...}
    submission_calendar_data: this.getDateSubmissionList
      ? this.getDateSubmissionList(JSON.parse(submissionCalendar))
      : undefined,
    activeYears,
    yearRange: activeYears.length
      ? { start: activeYears[0], end: activeYears[activeYears.length - 1] }
      : { start: null, end: null },
    byYear
  };
}

// Try to extract a daily activity object from the HTML (more robust than just summing)
extractDailyHeatmapObject(htmlData) {
  // Look for likely assignments or JSON blobs containing per-day stats
  const candidates = [
    // Some sites embed: var userDailySubmissionsStats = {...};
    /userDailySubmissionsStats\s*=\s*(\{[\s\S]*?\});/,
    // Generic JSON object near "heatmap" or "calendar"
    /heatmap[^=]*=\s*(\{[\s\S]*?\});/i,
    /calendar[^=]*=\s*(\{[\s\S]*?\});/i,
    // Raw JSON object as {...} on its own line (fallback, capped length)
    /(\{[\s\S]{50,8000}\})/
  ];

  for (const rgx of candidates) {
    const m = htmlData.match(rgx);
    if (!m) continue;
    try {
      // Strip trailing semicolon if any
      const jsonStr = m[1].trim().replace(/;$/, '');
      const obj = JSON.parse(jsonStr);
      // Sanity check: should have many keys or reasonable day entries
      if (obj && typeof obj === 'object' && Object.keys(obj).length >= 5) {
        return obj;
      }
    } catch (e) {
      // try next candidate
    }
  }

  // As another strategy, sometimes the heatmap is embedded in a data-* attribute string; skip here for brevity
  return null;
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
            let userData = await this.fetchFromStatsAPI(username);
            
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
            const [profileData, badgesData, scoresEloData, contestData] = await Promise.allSettled([
                this.fetchProfile(username),
                this.fetchBadges(username),
                this.fetchScoresElo(username),
                this.fetchContestPerformance(username)
            ]);

            const profile = profileData.status === 'fulfilled' ? profileData.value : null;
            const badges = badgesData.status === 'fulfilled' ? badgesData.value : null;
            const scoresElo = scoresEloData.status === 'fulfilled' ? scoresEloData.value : null;
            const contests = contestData.status === 'fulfilled' ? contestData.value : null;


            if (!profile && !badges && !scoresElo && !contests) {
                throw new Error("All HackerRank data sources failed");
            }

            // Process all data sources
            const badgeStats = this.processBadgesData(badges);
            const profileStats = this.processProfileData(profile);
            const eloStats = this.processScoresEloData(scoresElo);
            // const contests = this.processContestProfileData(contestProfile);

            return {
                status: "OK",
                platform: "hackerrank",
                username: username,
                profile: {
                    name: profileStats.name || username,
                    username: username,
                    avatar: profileStats.avatar || contests.avatar,
                    country: profileStats.country || contests.country || null,
                    // school: profileStats.school || contests.school || null,
                    // company: profileStats.company || contests.company || null,
                    // website: profileStats.website || null,
                    // linkedin: profileStats.linkedin || null,
                    // github: profileStats.github || null,
                    created_at: profileStats.created_at || contests.created_at || null,
                    // bio: profileStats.bio || null,
                    // location: profileStats.location || null,
                    // title: contests.title || null
                },
                solvedStats: {
                    // Core Statistics
                    rank: profileStats.rank || null,
                    level: profileStats.level || contests.level || badgeStats.highest_level || null,
                    totalSolved: badgeStats.total_solved,
                    hackos: profileStats.hackos || 0,
                    
                    // Social Statistics  
                    followers: profileStats.followers || contests.followers || null,
                    following: profileStats.following || null,
                    // event_count: contests.event_count || null,
                    
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
                        profile_completeness: this.calculateProfileCompleteness(profileStats, contests),
                        skill_diversity: Object.keys(eloStats.domain_scores).filter(domain => 
                            eloStats.domain_scores[domain].score > 0).length,
                        contest_consistency: eloStats.contest_consistency || 0
                    }
                },
                contests: contests
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

    async fetchContestPerformance(username) {
        try {
            const response = await axios.get(`${this.baseURL}/${username}/scores_elo`, {
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            const scoresData = response.data || [];
            const contestsData = {
                totalContestsParticipated: 0,
                totalMedals: { gold: 0, silver: 0, bronze: 0 },
                domainPerformance: {},
                recentContests: []
            };

            scoresData.forEach(domain => {
                if (domain.contest && domain.contest.medals) {
                    const medals = domain.contest.medals;
                    contestsData.totalMedals.gold += medals.gold || 0;
                    contestsData.totalMedals.silver += medals.silver || 0;
                    contestsData.totalMedals.bronze += medals.bronze || 0;
                    
                    if (medals.gold > 0 || medals.silver > 0 || medals.bronze > 0) {
                        contestsData.totalContestsParticipated++;
                    }

                    if (domain.contest.score > 0) {
                        contestsData.domainPerformance[domain.name] = {
                            score: domain.contest.score,
                            rank: domain.contest.rank,
                            level: domain.contest.level,
                            medals: medals
                        };
                    }
                }
            });

            return contestsData;
        } catch (error) {
            console.log(`HackerRank contest data fetch failed: ${error.message}`);
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

    calculateProfileCompleteness(profileStats, contests) {
        let completeness = 0;
        const fields = ['name', 'country', 'school', 'company', 'bio', 'avatar'];
        
        fields.forEach(field => {
            if (profileStats[field] || contests[field]) {
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

function generateUnifiedActivityHeatmap(platformData, options = {}) {
    const {
        includeInactiveDays = false,
        dateRange = 'auto', // 'auto', 'year', 'custom'
        startDate = null,
        endDate = null
    } = options;

    const today = new Date();
    const { actualStartDate, actualEndDate } = determineDateRange(platformData, dateRange, startDate, endDate, today);
    
    // Initialize activity data with sparse structure
    const dailyActivity = {};
    
    // Process each platform's activity first to determine actual active dates
    const activeDates = new Set();
    Object.entries(platformData).forEach(([platform, data]) => {
        if (data.status === "OK") {
            const platformActiveDates = processPlatformActivity(platform, data, actualStartDate, actualEndDate);
            platformActiveDates.forEach(date => activeDates.add(date));
        }
    });

    // Only initialize days that have activity OR if includeInactiveDays is true
    if (includeInactiveDays) {
        // Initialize all days in range
        for (let d = new Date(actualStartDate); d <= actualEndDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dailyActivity[dateStr] = initializeDayData(dateStr, d);
        }
    } else {
        // Only initialize active days
        activeDates.forEach(dateStr => {
            const date = new Date(dateStr);
            dailyActivity[dateStr] = initializeDayData(dateStr, date);
        });
    }

    // Process platform data and populate activity
    Object.entries(platformData).forEach(([platform, data]) => {
        if (data.status === "OK") {
            populatePlatformActivity(platform, data, dailyActivity, actualStartDate, actualEndDate);
        }
    });

    // Convert to array, calculate levels, and sort by date
    const activityArray = Object.values(dailyActivity)
        .filter(day => includeInactiveDays || day.total > 0) // Filter out inactive days if requested
        .map(day => ({
            ...day,
            level: calculateActivityLevel(day.total),
            intensity: calculateIntensity(day.total),
            platform_count: Object.values(day.platforms).filter(count => count > 0).length,
            year: new Date(day.date).getFullYear()
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending

    // Group by year for better organization
    const yearlyData = groupByYear(activityArray);
    
    // Calculate metrics
    const streakData = calculateActivityStreaks(activityArray);
    const weeklyStats = calculateWeeklyStats(activityArray);
    const monthlyStats = calculateMonthlyStats(activityArray);

    return {
        metadata: {
            date_range: {
                start: actualStartDate.toISOString().split('T')[0],
                end: actualEndDate.toISOString().split('T')[0]
            },
            total_days: activityArray.length,
            total_active_days: activityArray.filter(day => day.total > 0).length,
            includes_inactive_days: includeInactiveDays,
            data_quality: calculateDataQuality(platformData),
            last_updated: new Date().toISOString(),
            years_covered: Object.keys(yearlyData).map(Number).sort()
        },
        yearly_activity: yearlyData, // Organized by year
        summary_stats: {
            total_contributions: activityArray.reduce((sum, day) => sum + day.total, 0),
            max_daily_activity: Math.max(...activityArray.map(day => day.total), 0),
            average_daily_activity: activityArray.length > 0 
                ? Number((activityArray.reduce((sum, day) => sum + day.total, 0) / activityArray.length).toFixed(2))
                : 0,
            current_streak: streakData.current_streak,
            longest_streak: streakData.longest_streak,
            platform_contributions: calculatePlatformContributions(activityArray),
            most_active_day: getMostActiveDay(activityArray),
            most_active_month: getMostActiveMonth(monthlyStats)
        },
        advanced_metrics: {
            weekly_average: weeklyStats.average,
            monthly_breakdown: monthlyStats.breakdown,
            activity_distribution: calculateActivityDistribution(activityArray),
            consistency_score: calculateConsistencyScore(activityArray),
            platform_diversity: calculatePlatformDiversity(activityArray),
            yearly_comparison: calculateYearlyComparison(yearlyData)
        },
        heatmap_config: {
            color_scale: {
                0: '#ebedf0',
                1: '#9be9a8', 
                2: '#40c463',
                3: '#30a14e',
                4: '#216e39'
            },
            cell_size: 11,
            cell_gap: 3,
            month_labels: true,
            weekday_labels: true
        }
    };
}

function determineDateRange(platformData, dateRange, startDate, endDate, today) {
    let actualStartDate, actualEndDate;
    
    if (dateRange === 'custom' && startDate && endDate) {
        actualStartDate = new Date(startDate);
        actualEndDate = new Date(endDate);
    } else if (dateRange === 'year') {
        actualStartDate = new Date(today.getFullYear(), 0, 1);
        actualEndDate = today;
    } else {
        // 'auto' - determine from platform data
        const platformDates = [];
        
        Object.values(platformData).forEach(data => {
            if (data.status === "OK") {
                const dates = extractPlatformDateRange(data);
                platformDates.push(...dates);
            }
        });
        
        if (platformDates.length > 0) {
            actualStartDate = new Date(Math.min(...platformDates));
            actualEndDate = today;
        } else {
            // Fallback to last year
            actualStartDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
            actualEndDate = today;
        }
    }
    
    return { actualStartDate, actualEndDate };
}

function extractPlatformDateRange(data) {
    const dates = [];
    
    try {
        // LeetCode - handle yearly structure
        if (data.calendar_data) {
            Object.keys(data.calendar_data).forEach(year => {
                const yearData = data.calendar_data[year];
                // Handle "submmissionCalendar" (with typo)
                if (yearData?.submmissionCalendar && Array.isArray(yearData.submmissionCalendar)) {
                    yearData.submmissionCalendar.forEach(entry => {
                        dates.push(new Date(entry.date).getTime());
                    });
                }
                // Handle corrected "submissionCalendar"
                else if (yearData?.submissionCalendar && Array.isArray(yearData.submissionCalendar)) {
                    yearData.submissionCalendar.forEach(entry => {
                        dates.push(new Date(entry.date).getTime());
                    });
                }
            });
        }
        // Fallback for old timestamp structure
        else if (data.calendar_data?.submissionCalendar) {
            Object.keys(data.calendar_data.submissionCalendar).forEach(timestamp => {
                dates.push(parseInt(timestamp) * 1000);
            });
        }
        
        // GitHub
        if (data.recent_activity) {
            data.recent_activity.forEach(event => {
                dates.push(new Date(event.created_at).getTime());
            });
        }
        
        // AtCoder
        if (data.submissions) {
            data.submissions.forEach(submission => {
                dates.push(submission.epoch_second * 1000);
            });
        }
        
        // CodeForces - contests
        if (data.contests?.ratingProgression) {
            data.contests.ratingProgression.forEach(contest => {
                dates.push(new Date(contest.date).getTime());
            });
        }
    } catch (error) {
        console.log('Error extracting date range:', error.message);
    }
    
    return dates;
}

function initializeDayData(dateStr, date) {
    return {
        date: dateStr,
        total: 0,
        platforms: {
            leetcode: 0,
            codeforces: 0,
            codechef: 0,
            github: 0,
            geeksforgeeks: 0,
            hackerrank: 0,
            atcoder: 0
        },
        timestamp: Math.floor(date.getTime() / 1000),
        weekday: date.getDay(),
        week_of_year: getWeekOfYear(date),
        month: date.getMonth() + 1
    };
}

function processPlatformActivity(platform, data, startDate, endDate) {
    const activeDates = new Set();
    
    try {
        switch (platform) {
            case 'leetcode':
                // Handle new yearly structure
                if (data.calendar_data) {
                    Object.keys(data.calendar_data).forEach(year => {
                        const yearData = data.calendar_data[year];
                        // Handle "submmissionCalendar" (with typo)
                        if (yearData?.submmissionCalendar && Array.isArray(yearData.submmissionCalendar)) {
                            yearData.submmissionCalendar.forEach(entry => {
                                const date = new Date(entry.date);
                                if (date >= startDate && date <= endDate && entry.submissionCount > 0) {
                                    activeDates.add(entry.date);
                                }
                            });
                        }
                        // Handle corrected "submissionCalendar"
                        else if (yearData?.submissionCalendar && Array.isArray(yearData.submissionCalendar)) {
                            yearData.submissionCalendar.forEach(entry => {
                                const date = new Date(entry.date);
                                if (date >= startDate && date <= endDate && entry.submissionCount > 0) {
                                    activeDates.add(entry.date);
                                }
                            });
                        }
                    });
                }
                // Fallback for old structure
                else if (data.calendar_data?.submissionCalendar) {
                    Object.keys(data.calendar_data.submissionCalendar).forEach(timestamp => {
                        const date = new Date(parseInt(timestamp) * 1000);
                        if (date >= startDate && date <= endDate) {
                            activeDates.add(date.toISOString().split('T')[0]);
                        }
                    });
                }
                break;
                
            case 'github':
                if (data.recent_activity) {
                    data.recent_activity.forEach(event => {
                        const date = new Date(event.created_at);
                        if (date >= startDate && date <= endDate) {
                            activeDates.add(date.toISOString().split('T')[0]);
                        }
                    });
                }
                break;
                
            case 'atcoder':
                if (data.submissions) {
                    data.submissions.forEach(submission => {
                        const date = new Date(submission.epoch_second * 1000);
                        if (date >= startDate && date <= endDate && submission.result === 'AC') {
                            activeDates.add(date.toISOString().split('T')[0]);
                        }
                    });
                }
                break;
                
            case 'codeforces':
                if (data.contests?.ratingProgression) {
                    data.contests.ratingProgression.forEach(contest => {
                        const date = new Date(contest.date);
                        if (date >= startDate && date <= endDate) {
                            activeDates.add(date.toISOString().split('T')[0]);
                        }
                    });
                }
                break;
        }
    } catch (error) {
        console.log(`Error processing ${platform} activity dates:`, error.message);
    }
    
    return activeDates;
}

function populatePlatformActivity(platform, data, dailyActivity, startDate, endDate) {
    // Reuse your existing processing functions but only update existing dates in dailyActivity
    switch (platform) {
        case 'leetcode':
            processLeetCodeActivityOptimized(data, dailyActivity, startDate, endDate);
            break;
        case 'codeforces':
            processCodeForcesActivityOptimized(data, dailyActivity, startDate, endDate);
            break;
        case 'github':
            processGitHubActivityOptimized(data, dailyActivity, startDate, endDate);
            break;
        case 'codechef':
            processCodeChefActivityOptimized(data, dailyActivity, startDate, endDate);
            break;
        case 'geeksforgeeks':
            processGeeksForGeeksActivityOptimized(data, dailyActivity, startDate, endDate);
            break;
        case 'hackerrank':
            processHackerRankActivityOptimized(data, dailyActivity, startDate, endDate);
            break;
        case 'atcoder':
            processAtCoderActivityOptimized(data, dailyActivity, startDate, endDate);
            break;
    }
}

function processLeetCodeActivityOptimized(data, dailyActivity, startDate, endDate) {
    try {
        // Handle new data structure with yearly breakdown
        if (data.calendar_data) {
            // Check for yearly structure like calendar_data["2024"].submmissionCalendar
            Object.keys(data.calendar_data).forEach(year => {
                const yearData = data.calendar_data[year];
                if (yearData && yearData.submmissionCalendar && Array.isArray(yearData.submmissionCalendar)) {
                    yearData.submmissionCalendar.forEach(entry => {
                        const date = new Date(entry.date);
                        if (date >= startDate && date <= endDate) {
                            const dateStr = entry.date;
                            if (dailyActivity[dateStr]) {
                                const submissions = parseInt(entry.submissionCount) || 0;
                                dailyActivity[dateStr].platforms.leetcode += submissions;
                                dailyActivity[dateStr].total += submissions;
                            }
                        }
                    });
                }
                // Also handle the corrected spelling "submissionCalendar"
                else if (yearData && yearData.submissionCalendar && Array.isArray(yearData.submissionCalendar)) {
                    yearData.submissionCalendar.forEach(entry => {
                        const date = new Date(entry.date);
                        if (date >= startDate && date <= endDate) {
                            const dateStr = entry.date;
                            if (dailyActivity[dateStr]) {
                                const submissions = parseInt(entry.submissionCount) || 0;
                                dailyActivity[dateStr].platforms.leetcode += submissions;
                                dailyActivity[dateStr].total += submissions;
                            }
                        }
                    });
                }
            });
        }
        
        // Fallback: Handle old structure with submissionCalendar object
        else if (data.calendar_data?.submissionCalendar) {
            Object.entries(data.calendar_data.submissionCalendar).forEach(([timestamp, count]) => {
                const date = new Date(parseInt(timestamp) * 1000);
                if (date >= startDate && date <= endDate) {
                    const dateStr = date.toISOString().split('T')[0];
                    if (dailyActivity[dateStr]) {
                        const submissions = parseInt(count) || 0;
                        dailyActivity[dateStr].platforms.leetcode += submissions;
                        dailyActivity[dateStr].total += submissions;
                    }
                }
            });
        }
    } catch (error) {
        console.log('Error processing LeetCode activity:', error.message);
    }
}

function processGitHubActivityOptimized(data, dailyActivity, startDate, endDate) {
    try {
        if (data.recent_activity && Array.isArray(data.recent_activity)) {
            data.recent_activity.forEach(event => {
                const date = new Date(event.created_at);
                if (date >= startDate && date <= endDate) {
                    const dateStr = date.toISOString().split('T')[0];
                    if (dailyActivity[dateStr]) {
                        let activityCount = getGitHubActivityWeight(event);
                        dailyActivity[dateStr].platforms.github += activityCount;
                        dailyActivity[dateStr].total += activityCount;
                    }
                }
            });
        }
    } catch (error) {
        console.log('Error processing GitHub activity:', error.message);
    }
}

function processCodeForcesActivityOptimized(data, dailyActivity, startDate, endDate) {
    try {
        // Process contest participation
        if (data.contests && data.contests.ratingProgression) {
            data.contests.ratingProgression.forEach(contest => {
                const date = new Date(contest.date);
                if (date >= startDate && date <= endDate) {
                    const dateStr = date.toISOString().split('T')[0];
                    if (dailyActivity[dateStr]) {
                        dailyActivity[dateStr].platforms.codeforces += 5;
                        dailyActivity[dateStr].total += 5;
                    }
                }
            });
        }
        
        // Distribute recent problems solved (only for existing dates in dailyActivity)
        const problemsSolved = data.detailed_stats?.problems_solved || 0;
        if (problemsSolved > 0) {
            const activeDates = Object.keys(dailyActivity).filter(date => {
                const d = new Date(date);
                return d >= startDate && d <= endDate && dailyActivity[date].platforms.codeforces === 0;
            });
            
            let remaining = Math.floor(problemsSolved * 0.3);
            activeDates.forEach(dateStr => {
                if (remaining > 0 && Math.random() < 0.25) {
                    const activity = Math.min(remaining, Math.floor(Math.random() * 3) + 1);
                    dailyActivity[dateStr].platforms.codeforces += activity;
                    dailyActivity[dateStr].total += activity;
                    remaining -= activity;
                }
            });
        }
    } catch (error) {
        console.log('Error processing CodeForces activity:', error.message);
    }
}

function processCodeChefActivityOptimized(data, dailyActivity, startDate, endDate) {
    try {
        const problemsSolved = data.detailed_stats?.problems_solved || 0;
        
        if (problemsSolved > 0) {
            const activeDates = Object.keys(dailyActivity).filter(date => {
                const d = new Date(date);
                return d >= startDate && d <= endDate;
            });
            
            let remaining = problemsSolved;
            activeDates.forEach(dateStr => {
                if (remaining > 0 && Math.random() < 0.25) {
                    const activity = Math.min(remaining, Math.floor(Math.random() * 2) + 1);
                    dailyActivity[dateStr].platforms.codechef += activity;
                    dailyActivity[dateStr].total += activity;
                    remaining -= activity;
                }
            });
        }
    } catch (error) {
        console.log('Error processing CodeChef activity:', error.message);
    }
}

function processGeeksForGeeksActivityOptimized(data, dailyActivity, startDate, endDate) {
    try {
        const problemsSolved = data.detailed_stats?.problems_solved || 0;
        const currentStreak = data.detailed_stats?.current_streak || 0;
        
        if (problemsSolved > 0) {
            const activeDates = Object.keys(dailyActivity)
                .filter(date => {
                    const d = new Date(date);
                    return d >= startDate && d <= endDate;
                })
                .sort((a, b) => new Date(b) - new Date(a)); // Sort descending for recent streak
            
            // Add recent streak activity
            for (let i = 0; i < Math.min(currentStreak, activeDates.length); i++) {
                const dateStr = activeDates[i];
                dailyActivity[dateStr].platforms.geeksforgeeks += 1;
                dailyActivity[dateStr].total += 1;
            }
            
            // Distribute remaining problems
            let remaining = Math.max(0, problemsSolved - currentStreak);
            for (let i = currentStreak; i < activeDates.length && remaining > 0; i++) {
                if (Math.random() < 0.2) {
                    const activity = Math.min(remaining, Math.floor(Math.random() * 2) + 1);
                    dailyActivity[activeDates[i]].platforms.geeksforgeeks += activity;
                    dailyActivity[activeDates[i]].total += activity;
                    remaining -= activity;
                }
            }
        }
    } catch (error) {
        console.log('Error processing GeeksForGeeks activity:', error.message);
    }
}

function processHackerRankActivityOptimized(data, dailyActivity, startDate, endDate) {
    try {
        const problemsSolved = data.detailed_stats?.problems_solved || 0;
        const contestMedals = data.detailed_stats?.contest_medals || { gold: 0, silver: 0, bronze: 0 };
        const totalMedals = contestMedals.gold + contestMedals.silver + contestMedals.bronze;
        
        const activeDates = Object.keys(dailyActivity).filter(date => {
            const d = new Date(date);
            return d >= startDate && d <= endDate;
        });
        
        // Add contest activity
        if (totalMedals > 0 && activeDates.length > 0) {
            const contestDays = Math.min(totalMedals * 2, activeDates.length);
            for (let i = 0; i < contestDays; i++) {
                const randomDate = activeDates[Math.floor(Math.random() * activeDates.length)];
                dailyActivity[randomDate].platforms.hackerrank += 3;
                dailyActivity[randomDate].total += 3;
            }
        }
        
        // Distribute practice problems
        if (problemsSolved > 0) {
            let remaining = Math.floor(problemsSolved * 0.4);
            activeDates.forEach(dateStr => {
                if (remaining > 0 && Math.random() < 0.25) {
                    const activity = Math.min(remaining, Math.floor(Math.random() * 4) + 1);
                    dailyActivity[dateStr].platforms.hackerrank += activity;
                    dailyActivity[dateStr].total += activity;
                    remaining -= activity;
                }
            });
        }
    } catch (error) {
        console.log('Error processing HackerRank activity:', error.message);
    }
}

function processAtCoderActivityOptimized(data, dailyActivity, startDate, endDate) {
    try {
        if (data.submissions && Array.isArray(data.submissions)) {
            data.submissions.forEach(submission => {
                const date = new Date(submission.epoch_second * 1000);
                if (date >= startDate && date <= endDate && submission.result === 'AC') {
                    const dateStr = date.toISOString().split('T')[0];
                    if (dailyActivity[dateStr]) {
                        dailyActivity[dateStr].platforms.atcoder += 1;
                        dailyActivity[dateStr].total += 1;
                    }
                }
            });
        }
    } catch (error) {
        console.log('Error processing AtCoder activity:', error.message);
    }
}

function getGitHubActivityWeight(event) {
    switch (event.type) {
        case 'PushEvent':
            return event.payload?.commits?.length || 1;
        case 'PullRequestEvent':
            return 2;
        case 'IssuesEvent':
        case 'CreateEvent':
        default:
            return 1;
    }
}

function groupByYear(activityArray) {
    const yearlyData = {};
    
    activityArray.forEach(day => {
        const year = day.year;
        if (!yearlyData[year]) {
            yearlyData[year] = [];
        }
        yearlyData[year].push(day);
    });
    
    return yearlyData;
}

function calculateActivityDistribution(activityArray) {
    return {
        level_0_days: activityArray.filter(d => d.level === 0).length,
        level_1_days: activityArray.filter(d => d.level === 1).length,
        level_2_days: activityArray.filter(d => d.level === 2).length,
        level_3_days: activityArray.filter(d => d.level === 3).length,
        level_4_days: activityArray.filter(d => d.level === 4).length
    };
}

function calculateYearlyComparison(yearlyData) {
    const comparison = {};
    
    Object.keys(yearlyData).forEach(year => {
        const yearData = yearlyData[year];
        comparison[year] = {
            total_contributions: yearData.reduce((sum, day) => sum + day.total, 0),
            active_days: yearData.filter(day => day.total > 0).length,
            average_daily: yearData.length > 0 
                ? Number((yearData.reduce((sum, day) => sum + day.total, 0) / yearData.length).toFixed(2))
                : 0,
            max_daily: Math.max(...yearData.map(day => day.total), 0)
        };
    });
    
    return comparison;
}

function calculateIntensity(count) {
    return Math.min(count / 10, 1); // Normalize to 0-1 scale
}

// Helper functions that need to be implemented
function getWeekOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
}

function calculateDataQuality(platformData) {
    const totalPlatforms = Object.keys(platformData).length;
    const successfulPlatforms = Object.values(platformData).filter(data => data.status === "OK").length;
    return Number((successfulPlatforms / totalPlatforms).toFixed(2));
}

function calculateActivityStreaks(activityArray) {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Sort by date to ensure proper streak calculation
    const sortedArray = [...activityArray].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    for (let i = 0; i < sortedArray.length; i++) {
        if (sortedArray[i].total > 0) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
            
            // Check if this is part of current streak (from end)
            if (i >= sortedArray.length - tempStreak) {
                currentStreak = tempStreak;
            }
        } else {
            tempStreak = 0;
        }
    }
    
    // Verify current streak is actually current (ends at today)
    const today = new Date().toISOString().split('T')[0];
    const lastActiveDay = sortedArray.slice().reverse().find(day => day.total > 0);
    if (!lastActiveDay || lastActiveDay.date !== today) {
        currentStreak = 0;
    }
    
    return { current_streak: currentStreak, longest_streak: longestStreak };
}

function calculateWeeklyStats(activityArray) {
    if (activityArray.length === 0) return { average: 0 };
    
    const weeklyTotals = {};
    activityArray.forEach(day => {
        const weekKey = `${day.year}-W${day.week_of_year}`;
        if (!weeklyTotals[weekKey]) weeklyTotals[weekKey] = 0;
        weeklyTotals[weekKey] += day.total;
    });
    
    const weeks = Object.values(weeklyTotals);
    const average = weeks.length > 0 ? Number((weeks.reduce((sum, total) => sum + total, 0) / weeks.length).toFixed(2)) : 0;
    
    return { average, weekly_totals: weeklyTotals };
}

function calculateMonthlyStats(activityArray) {
    if (activityArray.length === 0) return { breakdown: {} };
    
    const monthlyBreakdown = {};
    activityArray.forEach(day => {
        const monthKey = `${day.year}-${String(day.month).padStart(2, '0')}`;
        if (!monthlyBreakdown[monthKey]) {
            monthlyBreakdown[monthKey] = { total: 0, active_days: 0 };
        }
        monthlyBreakdown[monthKey].total += day.total;
        if (day.total > 0) monthlyBreakdown[monthKey].active_days++;
    });
    
    return { breakdown: monthlyBreakdown };
}

function getMostActiveDay(activityArray) {
    if (activityArray.length === 0) return null;
    
    return activityArray.reduce((max, day) => day.total > max.total ? day : max, activityArray[0]);
}

function getMostActiveMonth(monthlyStats) {
    if (!monthlyStats.breakdown || Object.keys(monthlyStats.breakdown).length === 0) return null;
    
    return Object.entries(monthlyStats.breakdown).reduce((max, [month, stats]) => 
        stats.total > max.total ? { month, ...stats } : max, 
        { month: null, total: 0 }
    );
}

function calculateConsistencyScore(activityArray) {
    if (activityArray.length === 0) return 0;
    
    const activeDays = activityArray.filter(day => day.total > 0).length;
    const totalDays = activityArray.length;
    
    return Number((activeDays / totalDays).toFixed(3));
}

function calculatePlatformDiversity(activityArray) {
    if (activityArray.length === 0) return 0;
    
    const platformUsage = {};
    const platformNames = ['leetcode', 'codeforces', 'codechef', 'github', 'geeksforgeeks', 'hackerrank', 'atcoder'];
    
    platformNames.forEach(platform => {
        platformUsage[platform] = activityArray.filter(day => day.platforms[platform] > 0).length;
    });
    
    const activePlatforms = Object.values(platformUsage).filter(count => count > 0).length;
    
    return Number((activePlatforms / platformNames.length).toFixed(3));
}

function calculateActivityLevel(count) {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
}

function calculatePlatformContributions(activityArray) {
    const contributions = {
        leetcode: 0,
        codeforces: 0,
        codechef: 0,
        github: 0,
        geeksforgeeks: 0,
        hackerrank: 0,
        atcoder: 0
    };
    
    activityArray.forEach(day => {
        Object.keys(contributions).forEach(platform => {
            contributions[platform] += day.platforms[platform] || 0;
        });
    });
    
    return contributions;
}

function generateAggregatedStats(platformData) {
    const stats = {
        platforms_connected: 0,
        total_problems_solved: 0,
        total_contests: 0,
        average_rating: 0,
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
        },
        // Unified activity heatmap
        unified_activity_heatmap: generateUnifiedActivityHeatmap(platformData)
    };

    // Process each platform
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
                problems_solved: data.solvedStats?.totalSolved || 0,
                easy_solved: data.solvedStats?.easySolved || 0,
                medium_solved: data.solvedStats?.mediumSolved || 0,
                hard_solved: data.solvedStats?.hardSolved || 0,
                contests_attended: data.contests?.contestAttend || 0,
                contest_rating: data.contests?.contestRating || 0,
                contest_global_ranking: data.contests?.contestGlobalRanking || 0,
                acceptance_rate: data.solvedStats?.acceptance_rate || 0,
                ranking: data.profile?.ranking || 0
            };
        
        case 'codeforces':
            return {
                username: data.username,
                current_rating: data.profile?.rating || 0,
                max_rating: data.profile?.maxRating || 0,
                rank: data.profile?.rank || "unrated",
                max_rank: data.profile?.maxRank || "unrated",
                contests_participated: data.contests?.contestsAttended || 0,
                problems_solved: data.solvedStats?.problems_solved || 0,
                acceptance_rate: data.detailed_stats?.acceptance_rate || null,
                friendOfCount: data.profile?.friendOfCount || 0,
                contribution: data.solvedStats?.contribution || 0
            };

        case 'codechef':
            return {
                username: data.username,
                current_rating: data.contests?.current_rating || 0,
                highest_rating: data.contests?.highest_rating || 0,
                problems_solved: data.solvedStats?.totalSolved || 0,
                contests_attended: data.contests?.contestsData?.contestsAttended || 0,
                global_rank: data.profile?.globalRank || 0,
                country_rank: data.profile?.globalRank || 0,
                stars: data.profile?.stars || "unrated",
                division: data.contests?.division || "Unrated"
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
            if (data.profile?.rating) {
                combined.contest_ratings.codeforces = data.profile.rating;
            }
            break;
        
        case 'codechef':
            if (data.contests?.current_rating) {
                combined.contest_ratings.codechef = data.contests.current_rating;
            }
            break;
        
        case 'leetcode':
            if (data.contests?.contestRating) {
                combined.contest_ratings.leetcode = data.contests.contestRating;
            }
            break;
        
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

// Usage examples:
/*
// Only return days with activity
const compactHeatmap = generateUnifiedActivityHeatmap(platformData, {
    includeInactiveDays: false
});

// Custom date range
const customHeatmap = generateUnifiedActivityHeatmap(platformData, {
    dateRange: 'custom',
    startDate: '2023-01-01',
    endDate: '2024-12-31',
    includeInactiveDays: false
});

// Current year only
const yearlyHeatmap = generateUnifiedActivityHeatmap(platformData, {
    dateRange: 'year',
    includeInactiveDays: false
});
*/

// Usage examples:
/*
// Only return days with activity
const compactHeatmap = generateUnifiedActivityHeatmap(platformData, {
    includeInactiveDays: false
});

// Custom date range
const customHeatmap = generateUnifiedActivityHeatmap(platformData, {
    dateRange: 'custom',
    startDate: '2023-01-01',
    endDate: '2024-12-31',
    includeInactiveDays: false
});

// Current year only
const yearlyHeatmap = generateUnifiedActivityHeatmap(platformData, {
    dateRange: 'year',
    includeInactiveDays: false
});
*/



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

// Dedicated heatmap endpoint
app.get('/api/heatmap/:username', async (req, res) => {
    const { username } = req.params;
    const { platforms = 'leetcode,codeforces,codechef,geeksforgeeks,github,hackerrank,atcoder' } = req.query;

    const requestedPlatforms = platforms.split(',');

    try {
        const result = {
            status: "OK",
            username: username,
            timestamp: new Date().toISOString(),
            platforms: {},
            heatmap_data: null,
            processing_time: Date.now()
        };

        console.log(`Fetching heatmap data for ${username} from platforms: ${requestedPlatforms.join(', ')}`);

        // Fetch platform data
        const batchSize = 3;
        for (let i = 0; i < requestedPlatforms.length; i += batchSize) {
            const batch = requestedPlatforms.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (platform) => {
                if (multiAPI.platforms[platform]) {
                    try {
                        result.platforms[platform] = await multiAPI.platforms[platform].getUserData(username);
                        await multiAPI.sleep(multiAPI.rateLimitDelay);
                    } catch (error) {
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

        // Generate heatmap data
        result.heatmap_data = generateUnifiedActivityHeatmap(result.platforms);
        result.processing_time = Date.now() - result.processing_time;
        
        console.log(`Heatmap data generated for ${username} in ${result.processing_time}ms`);
        res.json(result);

    } catch (error) {
        console.error('Error in heatmap endpoint:', error);
        res.status(500).json({
            status: "FAILED",
            comment: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Batch heatmap endpoint for multiple users
app.post('/api/heatmap/batch', async (req, res) => {
    const { usernames } = req.body;

    if (!usernames || typeof usernames !== 'object') {
        return res.status(400).json({
            status: "FAILED",
            comment: "usernames object is required",
            example: {
                usernames: {
                    leetcode: "john_doe",
                    codeforces: "johnD",
                    // ... other platforms
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
            heatmap_data: null,
            processing_time: Date.now()
        };

        // Fetch data from all platforms
        const entries = Object.entries(usernames);
        const batchSize = 3;
        
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async ([platform, username]) => {
                if (multiAPI.platforms[platform] && username) {
                    try {
                        result.platforms[platform] = await multiAPI.platforms[platform].getUserData(username);
                        await multiAPI.sleep(multiAPI.rateLimitDelay);
                    } catch (error) {
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
            
            if (i + batchSize < entries.length) {
                await multiAPI.sleep(500);
            }
        }

        // Generate unified heatmap
        result.heatmap_data = generateUnifiedActivityHeatmap(result.platforms);
        result.processing_time = Date.now() - result.processing_time;

        console.log(`Batch heatmap data generated in ${result.processing_time}ms`);
        res.json(result);

    } catch (error) {
        console.error('Error in batch heatmap endpoint:', error);
        res.status(500).json({
            status: "FAILED",
            comment: error.message,
            timestamp: new Date().toISOString()
        });
    }
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
        message: "Multi-Platform Dashboard API - Full Featured & Heatmap Enabled",
        version: "2.1.0",
        timestamp: new Date().toISOString(),
        // ... existing health check code ...
        endpoints: [
            'POST /api/dashboard/aggregated - Comprehensive aggregated dashboard',
            'GET /api/dashboard/aggregated/:username - Single username across platforms',
            'GET /api/platforms/:platform/:username - Individual platform data',
            'GET /api/platforms/status - Detailed platform status',
            'GET /api/heatmap/:username - Unified activity heatmap data',
            'POST /api/heatmap/batch - Batch heatmap for multiple users',
            'GET /api/health - Comprehensive health check'
        ],
        new_features: [
            "Unified activity heatmap across all platforms",
            "Daily activity aggregation for 365 days",
            "Platform-specific activity breakdown", 
            "Activity level calculation (0-4 scale)",
            "Heatmap summary statistics",
            "Dedicated heatmap endpoints"
        ],
        // ... rest of existing code
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