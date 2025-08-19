const cheerio = require('cheerio');
const cache = require('../lib/cache');
const http = require('../lib/http');

class BaseAPI {
    constructor(platformName) {
        this.platform = platformName;
        this.timeout = 8000;
        this.defaultTTL = 7200; // 2 hours
    }

    async getUserData(username) {
        if (!username || typeof username !== 'string') {
            throw new Error('Valid username is required');
        }

        const cacheKey = `${this.platform}:${username.toLowerCase()}`;
        
        return cache.cached(cacheKey, this.defaultTTL, async () => {
            return await this.fetchUserData(username);
        });
    }

    async fetchUserData(username) {
        throw new Error('fetchUserData must be implemented by subclass');
    }

    createSuccessResponse(username, data) {
        return {
            status: "OK",
            platform: this.platform,
            username: username,
            timestamp: new Date().toISOString(),
            ...data
        };
    }

    createErrorResponse(username, error, status = "FAILED") {
        return {
            status: status,
            platform: this.platform,
            username: username,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        };
    }

    parseHTML(html) {
        return cheerio.load(html);
    }

    extractNumber(text, defaultValue = 0) {
        if (!text) return defaultValue;
        const match = String(text).match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : defaultValue;
    }

    async safeRequest(url, options = {}, fallback = null) {
        try {
            const response = await http.get(url, {
                timeout: this.timeout,
                ...options
            }, fallback);
            
            return response;
        } catch (error) {
            if (fallback) {
                return { data: fallback, fromFallback: true, error: error.message };
            }
            throw error;
        }
    }
}

// LeetCode API with cheerio optimization
class LeetCodeAPI extends BaseAPI {
    constructor() {
        super('leetcode');
        this.alfaURL = process.env.LEETCODE_API_URL || 'https://alfa-leetcode-api.onrender.com';
        this.localAPI = process.env.LOCAL_LEETCODE_API || 'http://localhost:8000';
        this.graphqlURL = 'https://leetcode.com/graphql';
    }

    async fetchUserData(username) {
        try {
            const [profile, solved, calendar, contests, languages, skills, badges, daily] = 
                await Promise.allSettled([
                    this.fetchProfile(username),
                    this.fetchSolvedStats(username),
                    this.fetchCalendarData(username),
                    this.fetchContestData(username),
                    this.fetchLanguageStats(username),
                    this.fetchSkillStats(username),
                    this.fetchBadges(username),
                    this.fetchDailyProblem()
                ]);

            const profileData = profile.status === 'fulfilled' ? profile.value : {};
            const solvedData = solved.status === 'fulfilled' ? solved.value : {};
            const calendarData = calendar.status === 'fulfilled' ? calendar.value : {};
            const contestData = contests.status === 'fulfilled' ? contests.value : {};
            const languageData = languages.status === 'fulfilled' ? languages.value : {};
            const skillData = skills.status === 'fulfilled' ? skills.value : [];
            const badgeData = badges.status === 'fulfilled' ? badges.value : [];
            const dailyData = daily.status === 'fulfilled' ? daily.value : null;

            return this.createSuccessResponse(username, {
                profile: {
                    name: profileData?.name || username,
                    avatar: profileData?.avatar || null,
                    ranking: profileData?.ranking || null,
                    reputation: profileData?.reputation || null
                },
                solvedStats: solvedData,
                contests: contestData,
                calendar_data: calendarData,
                skills: skillData,
                badges: badgeData,
                languageStats: languageData,
                dailyProblem: dailyData,
                detailed_stats: {
                    total_solved: solvedData?.totalSolved || 0,
                    easy_solved: solvedData?.easySolved || 0,
                    medium_solved: solvedData?.mediumSolved || 0,
                    hard_solved: solvedData?.hardSolved || 0,
                    acceptance_rate: solvedData?.acceptance_rate || 0,
                    ranking: profileData?.ranking || 0
                }
            });

        } catch (error) {
            console.error(`LeetCode API Error for ${username}:`, error.message);
            return this.createErrorResponse(username, error);
        }
    }

    async fetchProfile(username) {
        try {
            const response = await this.safeRequest(`${this.alfaURL}/${username}`);
            return response.data;
        } catch (error) {
            console.warn(`LeetCode profile fetch failed: ${error.message}`);
            return {};
        }
    }

    async fetchSolvedStats(username) {
        try {
            const response = await this.safeRequest(`${this.alfaURL}/${username}/solved`);
            const data = response.data;
            
            const totalSubmissions = data.totalSubmissionNum?.[0]?.submissions || 0;
            const acceptedSubmissions = data.acSubmissionNum?.[0]?.submissions || 0;

            return {
                totalSolved: data.solvedProblem || 0,
                easySolved: data.easySolved || 0,
                mediumSolved: data.mediumSolved || 0,
                hardSolved: data.hardSolved || 0,
                totalSubmissionsCount: totalSubmissions,
                acceptance_rate: totalSubmissions > 0 
                    ? Math.round((acceptedSubmissions / totalSubmissions) * 100 * 100) / 100 
                    : 0,
                totalSubmissions: data.totalSubmissionNum || []
            };
        } catch (error) {
            console.warn(`LeetCode solved stats fetch failed: ${error.message}`);
            return {};
        }
    }

    async fetchCalendarData(username, year = new Date().getFullYear()) {
        try {
            const response = await this.safeRequest(
                `${this.localAPI}/userProfileCalendar?username=${username}&year=${year}`
            );
            
            const calendarData = response.data?.data?.matchedUser?.userCalendar;
            if (!calendarData) return {};

            return {
                [year]: {
                    totalSubmissions: this.getTotalSubmissionsCount(calendarData.submissionCalendar || {}),
                    totalActiveDays: calendarData.totalActiveDays || 0,
                    maxStreak: calendarData.streak || 0,
                    submissionCalendar: this.getDateSubmissionList(calendarData.submissionCalendar || {}),
                    dataSource: 'api',
                    lastUpdated: new Date().toISOString()
                }
            };
        } catch (error) {
            console.warn(`LeetCode calendar fetch failed: ${error.message}`);
            return this.getFallbackCalendarData();
        }
    }

    async fetchContestData(username) {
        try {
            const response = await this.safeRequest(`${this.alfaURL}/${username}/contest`);
            return response.data;
        } catch (error) {
            console.warn(`LeetCode contest data fetch failed: ${error.message}`);
            return {};
        }
    }

    async fetchLanguageStats(username) {
        try {
            const response = await this.safeRequest(`${this.alfaURL}/languageStats?username=${username}`);
            return response.data?.matchedUser || {};
        } catch (error) {
            console.warn(`LeetCode language stats fetch failed: ${error.message}`);
            return {};
        }
    }

    async fetchSkillStats(username) {
        try {
            const response = await this.safeRequest(`${this.alfaURL}/skillStats/${username}`);
            return response.data?.data?.matchedUser?.tagProblemCounts || [];
        } catch (error) {
            console.warn(`LeetCode skill stats fetch failed: ${error.message}`);
            return [];
        }
    }

    async fetchBadges(username) {
        try {
            const response = await this.safeRequest(`${this.alfaURL}/${username}/badges`);
            return response.data || [];
        } catch (error) {
            console.warn(`LeetCode badges fetch failed: ${error.message}`);
            return [];
        }
    }

    async fetchDailyProblem() {
        try {
            const response = await this.safeRequest(`${this.alfaURL}/daily`);
            return response.data;
        } catch (error) {
            console.warn(`LeetCode daily problem fetch failed: ${error.message}`);
            return null;
        }
    }

    getTotalSubmissionsCount(submissionCalendar) {
        if (!submissionCalendar) return 0;

        let calendarObj = submissionCalendar;
        if (typeof submissionCalendar === "string") {
            try {
                calendarObj = JSON.parse(submissionCalendar);
            } catch (err) {
                return 0;
            }
        }

        if (typeof calendarObj !== "object" || calendarObj === null) return 0;

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

        let calendarObj = submissionCalendar;
        if (typeof submissionCalendar === "string") {
            try {
                calendarObj = JSON.parse(submissionCalendar);
            } catch (err) {
                return [];
            }
        }

        if (typeof calendarObj !== "object" || calendarObj === null) return [];

        return Object.entries(calendarObj)
            .map(([timestamp, count]) => ({
                date: new Date(parseInt(timestamp, 10) * 1000).toISOString().split("T")[0],
                submissionCount: parseInt(count, 10)
            }))
            .filter(item => item.submissionCount > 0)
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    getFallbackCalendarData() {
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        return {
            [today.getFullYear()]: {
                totalSubmissions: 0,
                totalActiveDays: 0,
                maxStreak: 0,
                submissionCalendar: [],
                dataSource: 'fallback',
                lastUpdated: new Date().toISOString()
            }
        };
    }
}

module.exports = {
    BaseAPI,
    LeetCodeAPI
};