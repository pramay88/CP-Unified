const { BaseAPI } = require('./platforms');
const cheerio = require('cheerio');

// CodeForces API - Optimized
class CodeForcesAPI extends BaseAPI {
    constructor() {
        super('codeforces');
        this.baseURL = 'https://codeforces.com/api';
    }

    async fetchUserData(username) {
        try {
            const [userInfo, ratings, submissions] = await Promise.allSettled([
                this.safeRequest(`${this.baseURL}/user.info?handles=${username}`),
                this.safeRequest(`${this.baseURL}/user.rating?handle=${username}`),
                this.safeRequest(`${this.baseURL}/user.status?handle=${username}&from=1&count=5000`)
            ]);

            const userData = userInfo.status === 'fulfilled' ? userInfo.value.data?.result?.[0] : null;
            const ratingsData = ratings.status === 'fulfilled' ? ratings.value.data?.result : [];
            const submissionsData = submissions.status === 'fulfilled' ? submissions.value.data?.result : [];

            if (!userData) {
                return this.createErrorResponse(username, "User not found");
            }

            const detailedStats = this.calculateDetailedStats(userData, ratingsData, submissionsData);

            return this.createSuccessResponse(username, {
                profile: userData,
                contests: this.processContestData(ratingsData),
                detailed_stats: detailedStats
            });

        } catch (error) {
            console.error(`CodeForces API Error for ${username}:`, error.message);
            return this.createErrorResponse(username, error);
        }
    }

    calculateDetailedStats(userData, ratingsData, submissionsData) {
        const acceptedProblems = new Set();
        const languageStats = {};
        const verdictStats = {};
        const difficultyDistribution = {};
        const yearlySubmissions = {};

        if (submissionsData) {
            submissionsData.forEach(submission => {
                const year = new Date(submission.creationTimeSeconds * 1000).getFullYear();
                yearlySubmissions[year] = (yearlySubmissions[year] || 0) + 1;
                
                languageStats[submission.programmingLanguage] = 
                    (languageStats[submission.programmingLanguage] || 0) + 1;
                
                verdictStats[submission.verdict] = 
                    (verdictStats[submission.verdict] || 0) + 1;

                if (submission.verdict === 'OK') {
                    acceptedProblems.add(`${submission.problem.contestId}-${submission.problem.index}`);
                    
                    const rating = submission.problem.rating;
                    if (rating) {
                        const bucket = Math.floor(rating / 100) * 100;
                        difficultyDistribution[bucket] = 
                            (difficultyDistribution[bucket] || 0) + 1;
                    }
                }
            });
        }

        return {
            current_rating: userData.rating || 0,
            max_rating: userData.maxRating || 0,
            rank: userData.rank || 'Unrated',
            max_rank: userData.maxRank || 'Unrated',
            contribution: userData.contribution || 0,
            problems_solved: acceptedProblems.size,
            contests_participated: ratingsData ? ratingsData.length : 0,
            language_stats: languageStats,
            verdict_stats: verdictStats,
            difficulty_distribution: difficultyDistribution,
            yearly_submissions: yearlySubmissions
        };
    }

    processContestData(ratingsData) {
        if (!ratingsData || ratingsData.length === 0) {
            return {
                contestsAttended: 0,
                recentContests: [],
                bestRank: null,
                worstRank: null,
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
    }
}

// CodeChef API - Optimized with Cheerio
class CodeChefAPI extends BaseAPI {
    constructor() {
        super('codechef');
    }

    async fetchUserData(username) {
        try {
            const response = await this.safeRequest(`https://www.codechef.com/users/${username}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.data) {
                return this.createErrorResponse(username, "User not found");
            }

            const $ = this.parseHTML(response.data);
            
            // Extract data using cheerio (much faster than JSDOM)
            const problemsSolved = this.extractProblemsSolved($, response.data);
            const rating = this.extractNumber($('.rating-number').first().text());
            const stars = $('.rating').first().text().trim() || "unrated";
            const globalRank = this.extractNumber($('.rating-ranks .inline-list li:first').text());
            const countryRank = this.extractNumber($('.rating-ranks .inline-list li:last').text());
            
            // Extract contest data
            const contestData = this.extractContestData(response.data);
            const badges = this.extractBadges($);

            return this.createSuccessResponse(username, {
                profile: {
                    name: this.extractName($) || username,
                    username: username,
                    avatar: $('.user-details-container img').first().attr('src') || null,
                    globalRank: globalRank,
                    countryRank: countryRank,
                    stars: stars
                },
                solvedStats: {
                    totalSolved: problemsSolved
                },
                contests: {
                    current_rating: rating,
                    highest_rating: Math.max(rating, this.extractHighestRating(response.data)),
                    division: this.getDivisionFromRating(rating),
                    contestData: contestData
                },
                badges: {
                    totalBadges: badges.length,
                    badges: badges
                },
                detailed_stats: {
                    problems_solved: problemsSolved,
                    current_rating: rating,
                    global_rank: globalRank,
                    country_rank: countryRank,
                    stars: stars
                }
            });

        } catch (error) {
            console.error(`CodeChef API Error for ${username}:`, error.message);
            
            if (error.response?.status === 404) {
                return this.createErrorResponse(username, "User not found on CodeChef");
            }
            if (error.response?.status === 429) {
                return this.createErrorResponse(username, "Rate limited by CodeChef", "RATE_LIMITED");
            }
            
            return this.createErrorResponse(username, error);
        }
    }

    extractProblemsSolved($, htmlData) {
        // Method 1: Look for problems solved in JavaScript variables
        const jsPatterns = [
            /problems[_\s]*solved["\s]*:\s*(\d+)/gi,
            /"solved":\s*(\d+)/gi,
            /var\s+totalSolved\s*=\s*(\d+)/gi
        ];

        for (const pattern of jsPatterns) {
            const matches = [...htmlData.matchAll(pattern)];
            for (const match of matches) {
                const count = parseInt(match[1]);
                if (count > 0 && count < 10000) {
                    return count;
                }
            }
        }

        // Method 2: Extract from DOM elements
        const selectors = [
            '.rating-data-section',
            '.user-details-container',
            '.profile-stats'
        ];

        for (const selector of selectors) {
            const elements = $(selector);
            elements.each((i, element) => {
                const text = $(element).text();
                const patterns = [
                    /(\d{1,4})\s*problems?\s*solved/gi,
                    /solved[:\s]*(\d{1,4})/gi
                ];
                
                for (const pattern of patterns) {
                    const match = text.match(pattern);
                    if (match) {
                        const count = parseInt(match[1]);
                        if (count > 0 && count < 10000) {
                            return count;
                        }
                    }
                }
            });
        }

        return 0;
    }

    extractName($) {
        const nameSelectors = [
            '.user-name',
            '.username', 
            'h1',
            'h2'
        ];

        for (const selector of nameSelectors) {
            const nameElement = $(selector).first();
            if (nameElement.length) {
                const text = nameElement.text().trim();
                if (text && text.length > 2 && text.length < 50 && !text.match(/^\d+$/)) {
                    return text;
                }
            }
        }
        
        return null;
    }

    extractContestData(htmlData) {
        try {
            const ratingsStart = htmlData.search("var all_rating = ") + "var all_rating = ".length;
            const ratingsEnd = htmlData.search("var current_user_rating =") - 6;
            
            if (ratingsStart > -1 && ratingsEnd > ratingsStart) {
                const ratingsDataStr = htmlData.substring(ratingsStart, ratingsEnd);
                const ratingsData = JSON.parse(ratingsDataStr);
                
                if (ratingsData && ratingsData.length > 0) {
                    return {
                        contestsAttended: ratingsData.length,
                        recentContests: ratingsData.slice(-5),
                        ratingProgression: ratingsData.map(c => ({
                            date: c.end_date,
                            rating: c.rating,
                            contest: c.name
                        }))
                    };
                }
            }
        } catch (error) {
            console.warn('Contest data extraction failed:', error.message);
        }
        
        return {
            contestsAttended: 0,
            recentContests: [],
            ratingProgression: []
        };
    }

    extractBadges($) {
        const badges = [];
        $('.badge').each((i, element) => {
            const title = $(element).find('.badge__title').text().trim();
            const description = $(element).find('.badge__description').text().trim();
            const icon = $(element).find('.badge__image img').attr('src');
            
            if (title) {
                badges.push({
                    name: title,
                    description: description,
                    icon: icon,
                    category: this.categorizeBadge(title, description)
                });
            }
        });
        
        return badges;
    }

    extractHighestRating(htmlData) {
        try {
            const ratingMatch = htmlData.match(/highest[_\s]*rating["\s]*:\s*(\d+)/gi);
            if (ratingMatch) {
                return parseInt(ratingMatch[1]) || 0;
            }
        } catch (error) {
            // Ignore extraction errors
        }
        return 0;
    }

    categorizeBadge(title, description) {
        const titleLower = (title || '').toLowerCase();
        const descLower = (description || '').toLowerCase();
        
        if (titleLower.includes('contest') || descLower.includes('contest')) return 'contest';
        if (titleLower.includes('problem') || descLower.includes('problem')) return 'problem_solving';
        if (titleLower.includes('streak') || descLower.includes('daily')) return 'consistency';
        return 'general';
    }

    getDivisionFromRating(rating) {
        if (rating >= 2200) return "Division 1";
        if (rating >= 1800) return "Division 2";
        if (rating >= 1400) return "Division 3";
        if (rating >= 1000) return "Division 4";
        return "Unrated";
    }
}

// GitHub API - Optimized
class GitHubAPI extends BaseAPI {
    constructor() {
        super('github');
        this.baseURL = 'https://api.github.com';
    }

    async fetchUserData(username) {
        try {
            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };

            if (process.env.GITHUB_TOKEN) {
                headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
            }

            const [profile, repos, events] = await Promise.allSettled([
                this.safeRequest(`${this.baseURL}/users/${username}`, { headers }),
                this.safeRequest(`${this.baseURL}/users/${username}/repos?sort=updated&per_page=20`, { headers }),
                this.safeRequest(`${this.baseURL}/users/${username}/events/public?per_page=30`, { headers })
            ]);

            const profileData = profile.status === 'fulfilled' ? profile.value.data : null;
            const reposData = repos.status === 'fulfilled' ? repos.value.data : [];
            const eventsData = events.status === 'fulfilled' ? events.value.data : [];

            if (!profileData) {
                return this.createErrorResponse(username, "User not found");
            }

            const detailedStats = this.calculateDetailedStats(profileData, reposData, eventsData);

            return this.createSuccessResponse(username, {
                profile: profileData,
                repositories: reposData,
                recent_activity: eventsData,
                detailed_stats: detailedStats
            });

        } catch (error) {
            console.error(`GitHub API Error for ${username}:`, error.message);
            return this.createErrorResponse(username, error);
        }
    }

    calculateDetailedStats(profile, repos, events) {
        const languageStats = {};
        const activityStats = {
            recent_pushes: 0,
            recent_prs: 0,
            recent_issues: 0
        };

        // Language statistics from repositories
        if (repos) {
            repos.forEach(repo => {
                if (repo.language) {
                    languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
                }
            });
        }

        // Activity statistics
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
            followers: profile.followers || 0,
            following: profile.following || 0,
            public_gists: profile.public_gists || 0,
            account_created: profile.created_at,
            last_updated: profile.updated_at,
            bio: profile.bio,
            location: profile.location,
            company: profile.company,
            blog: profile.blog,
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

// GeeksforGeeks API - Optimized
class GeeksForGeeksAPI extends BaseAPI {
    constructor() {
        super('geeksforgeeks');
        this.apis = [
            'https://gfg-api.vercel.app',
            'https://geeks-for-geeks-stats-api.vercel.app',
            'https://geeksforgeeks-api-fzaa.onrender.com'
        ];
    }

    async fetchUserData(username) {
        try {
            // Try multiple APIs in parallel
            const promises = this.apis.map(async (apiUrl, index) => {
                try {
                    let url = `${apiUrl}/${username}`;
                    if (index === 1) { // stats API has different format
                        url = `${apiUrl}/?raw=y&userName=${username}`;
                    }
                    
                    const response = await this.safeRequest(url);
                    return { data: response.data, source: `api_${index + 1}` };
                } catch (error) {
                    return null;
                }
            });

            const results = await Promise.allSettled(promises);
            
            // Find first successful result
            let userData = null;
            let source = 'unknown';
            
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    userData = result.value.data;
                    source = result.value.source;
                    break;
                }
            }

            if (!userData) {
                return this.createErrorResponse(username, "No data found from any GFG API");
            }

            // Normalize data structure
            const normalizedData = this.normalizeGFGData(userData);

            return this.createSuccessResponse(username, {
                data: normalizedData,
                source: source,
                detailed_stats: {
                    problems_solved: normalizedData.problems_solved || 0,
                    overall_score: normalizedData.overall_score || 0,
                    monthly_score: normalizedData.monthly_score || 0,
                    current_streak: normalizedData.current_streak || 0,
                    max_streak: normalizedData.max_streak || 0,
                    school_solved: normalizedData.School || 0,
                    basic_solved: normalizedData.Basic || 0,
                    easy_solved: normalizedData.Easy || 0,
                    medium_solved: normalizedData.Medium || 0,
                    hard_solved: normalizedData.Hard || 0
                }
            });

        } catch (error) {
            console.error(`GeeksForGeeks API Error for ${username}:`, error.message);
            return this.createErrorResponse(username, error);
        }
    }

    normalizeGFGData(data) {
        // Handle different API response formats
        return {
            problems_solved: data.problems_solved || data.totalProblemsSolved || 0,
            overall_score: data.overall_score || data.overallScore || 0,
            monthly_score: data.monthly_score || data.monthlyScore || 0,
            current_streak: data.current_streak || data.currentStreak || 0,
            max_streak: data.max_streak || data.maxStreak || 0,
            School: parseInt(data.School) || 0,
            Basic: parseInt(data.Basic) || 0,
            Easy: parseInt(data.Easy) || 0,
            Medium: parseInt(data.Medium) || 0,
            Hard: parseInt(data.Hard) || 0
        };
    }
}

module.exports = {
    CodeForcesAPI,
    CodeChefAPI,
    GitHubAPI,
    GeeksForGeeksAPI
};