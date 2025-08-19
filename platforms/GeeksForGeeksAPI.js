import axios from 'axios';
import { JSDOM } from 'jsdom';

class GeeksForGeeksAPI {
    constructor() {
        this.timeout = 15000;
        this.baseUrl = 'https://auth.geeksforgeeks.org/user';
    }

    async getUserData(handle) {
        try {
            console.log(`Fetching GeeksforGeeks data for: ${handle}`);
            
            const response = await axios.get(`${this.baseUrl}/${handle}`, {
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
                    'Upgrade-Insecure-Requests': '1',
                    'Referer': 'https://www.geeksforgeeks.org/'
                }
            });

            if (response.status === 200) {
                const htmlData = response.data;
                const dom = new JSDOM(htmlData);
                const document = dom.window.document;

                // Extract profile information
                const profile = this.extractProfile(document, htmlData);
                
                // Extract problems solved
                const problemsSolved = this.extractProblemsSolved(document, htmlData);
                
                // Extract contest data and rating progression
                const contestData = this.extractContestData(document, htmlData);
                
                // Extract badges
                const badges = this.extractBadges(document, htmlData);
                
                // Extract practice stats
                const practiceStats = this.extractPracticeStats(document, htmlData);

                return {
                    status: "OK",
                    platform: "geeksforgeeks",
                    username: handle,
                    profile: profile,
                    solvedStats: {
                        totalSolved: problemsSolved,
                        practiceStats: practiceStats
                    },
                    contests: contestData,
                    badges: badges,
                    lastUpdated: new Date().toISOString()
                };
            } else {
                throw new Error(`HTTP ${response.status}: Could not fetch profile`);
            }
        } catch (error) {
            console.error(`GeeksforGeeks API Error for ${handle}:`, error.message);
            
            if (error.response?.status === 404) {
                return {
                    status: "FAILED",
                    platform: "geeksforgeeks",
                    username: handle,
                    error: "User not found on GeeksforGeeks"
                };
            } else if (error.response?.status === 429) {
                return {
                    status: "RATE_LIMITED",
                    platform: "geeksforgeeks",
                    username: handle,
                    error: "Rate limited by GeeksforGeeks. Please try again later."
                };
            } else {
                return {
                    status: "FAILED",
                    platform: "geeksforgeeks",
                    username: handle,
                    error: error.message
                };
            }
        }
    }

    extractProfile(document, htmlData) {
        try {
            const profile = {};
            
            // Extract username/name
            const nameElement = document.querySelector('.profile_name') || 
                               document.querySelector('h1.userName') ||
                               document.querySelector('.user-name');
            profile.name = nameElement?.textContent?.trim() || null;

            // Extract avatar
            const avatarElement = document.querySelector('.profile_pic img') ||
                                 document.querySelector('.userPicSection img') ||
                                 document.querySelector('img[alt*="profile"]');
            profile.avatar = avatarElement?.src || null;

            // Extract location/institute
            const locationElement = document.querySelector('.basic_details .location') ||
                                   document.querySelector('.institute_name') ||
                                   document.querySelector('.user-location');
            profile.location = locationElement?.textContent?.trim() || null;

            // Extract global rank
            const rankElement = document.querySelector('.rank_details .global_rank') ||
                               document.querySelector('.global-rank') ||
                               document.querySelector('[class*="rank"]');
            profile.globalRank = rankElement ? parseInt(rankElement.textContent.replace(/\D/g, '')) || 0 : 0;

            // Extract language preferences
            const languageElements = document.querySelectorAll('.languageStats li, .language-item');
            const languages = [];
            languageElements.forEach(el => {
                const lang = el.textContent?.trim();
                if (lang) languages.push(lang);
            });
            profile.preferredLanguages = languages;

            return profile;
        } catch (error) {
            console.log('Profile extraction failed:', error.message);
            return {};
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

        // Method 2: Extract from profile sections
        problemsSolved = this.extractFromProfileSections(document);
        if (problemsSolved > 0) {
            console.log(`Method 2 (Profile Sections): Found ${problemsSolved} problems`);
            return problemsSolved;
        }

        // Method 3: Look for specific selectors
        problemsSolved = this.extractFromSelectors(document);
        if (problemsSolved > 0) {
            console.log(`Method 3 (Selectors): Found ${problemsSolved} problems`);
            return problemsSolved;
        }

        // Method 4: Extract from stats cards
        problemsSolved = this.extractFromStatsCards(document);
        if (problemsSolved > 0) {
            console.log(`Method 4 (Stats Cards): Found ${problemsSolved} problems`);
            return problemsSolved;
        }

        console.log('All methods failed to extract problems solved count');
        return 0;
    }

    extractFromPageData(htmlData) {
        try {
            // Look for total problems solved in JavaScript variables
            const patterns = [
                /totalSolved["\s]*:\s*(\d+)/gi,
                /problems[_\s]*solved["\s]*:\s*(\d+)/gi,
                /solved[_\s]*problems["\s]*:\s*(\d+)/gi,
                /"problemsSolved":\s*(\d+)/gi,
                /var\s+totalSolved\s*=\s*(\d+)/gi,
                /solvedCount["\s]*:\s*(\d+)/gi
            ];

            for (let pattern of patterns) {
                const matches = [...htmlData.matchAll(pattern)];
                for (let match of matches) {
                    const count = parseInt(match[1]);
                    if (count > 0 && count < 10000) { // Reasonable range
                        return count;
                    }
                }
            }
        } catch (e) {
            console.log('extractFromPageData failed:', e.message);
        }
        return 0;
    }

    extractFromProfileSections(document) {
        try {
            // Look in various profile sections
            const selectors = [
                '.problemsSolved',
                '.solvedProblems',
                '.stats-card',
                '.profile-stats',
                '.user-stats',
                '.problem-count',
                '.solved-count'
            ];

            for (let selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (let element of elements) {
                    const text = element.textContent || '';
                    
                    // Look for patterns like "136 Problems Solved" or similar
                    const patterns = [
                        /(\d{1,4})\s*problems?\s*solved/gi,
                        /solved[:\s]*(\d{1,4})/gi,
                        /problems?[:\s]*(\d{1,4})/gi,
                        /total[:\s]*(\d{1,4})/gi
                    ];
                    
                    for (let pattern of patterns) {
                        const match = text.match(pattern);
                        if (match) {
                            const count = parseInt(match[1]);
                            if (count > 0 && count < 10000) {
                                return count;
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
                '.scoreCard_head h3',
                '.score-card .number',
                '.problemsSolved .count',
                '[data-problems-solved]',
                '.stat-value',
                '.counter'
            ];

            for (let selector of specificSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent || element.getAttribute('data-problems-solved') || '';
                    const match = text.match(/(\d+)/);
                    if (match) {
                        const count = parseInt(match[1]);
                        if (count > 0 && count < 10000) {
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

    extractFromStatsCards(document) {
        try {
            const statCards = document.querySelectorAll('.stat-card, .score-card, .achievement-card');
            
            for (let card of statCards) {
                const text = card.textContent?.toLowerCase() || '';
                if (text.includes('problem') || text.includes('solved') || text.includes('total')) {
                    const numbers = text.match(/\d+/g);
                    if (numbers) {
                        for (let number of numbers) {
                            const num = parseInt(number);
                            if (num > 10 && num < 5000) {
                                return num;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log('extractFromStatsCards failed:', e.message);
        }
        return 0;
    }

    extractContestData(document, htmlData) {
        try {
            const contestData = {
                contestsAttended: 0,
                recentContests: [],
                bestRank: null,
                worstRank: null,
                ratingProgression: [],
                currentRating: 0,
                maxRating: 0
            };

            // Look for contest data in JavaScript
            const contestDataMatch = htmlData.match(/contestData\s*=\s*(\[.*?\]);/s);
            if (contestDataMatch) {
                try {
                    const contests = JSON.parse(contestDataMatch[1]);
                    contestData.contestsAttended = contests.length;
                    contestData.recentContests = contests.slice(-10).map(c => ({
                        contestName: c.name || c.contest_name,
                        date: c.date || c.end_date,
                        rank: c.rank,
                        rating: c.rating
                    }));
                    
                    if (contests.length > 0) {
                        const ranks = contests.filter(c => c.rank).map(c => c.rank);
                        if (ranks.length > 0) {
                            contestData.bestRank = Math.min(...ranks);
                            contestData.worstRank = Math.max(...ranks);
                        }
                        
                        const ratings = contests.filter(c => c.rating).map(c => c.rating);
                        if (ratings.length > 0) {
                            contestData.currentRating = ratings[ratings.length - 1];
                            contestData.maxRating = Math.max(...ratings);
                        }
                        
                        contestData.ratingProgression = contests.map(c => ({
                            date: c.date || c.end_date,
                            rating: c.rating,
                            contest: c.name || c.contest_name
                        }));
                    }
                } catch (e) {
                    console.log('Failed to parse contest data:', e.message);
                }
            }

            // Extract from HTML tables if no JS data found
            if (contestData.contestsAttended === 0) {
                const contestRows = document.querySelectorAll('table.contest-table tbody tr, .contest-item');
                contestData.contestsAttended = contestRows.length;
                
                contestRows.forEach((row, index) => {
                    if (index < 10) { // Last 10 contests
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 3) {
                            contestData.recentContests.push({
                                contestName: cells[0]?.textContent?.trim(),
                                date: cells[1]?.textContent?.trim(),
                                rank: parseInt(cells[2]?.textContent?.replace(/\D/g, '')) || null,
                                rating: parseInt(cells[3]?.textContent?.replace(/\D/g, '')) || null
                            });
                        }
                    }
                });
            }

            return contestData;
        } catch (error) {
            console.log('Contest data extraction failed:', error.message);
            return {
                contestsAttended: 0,
                recentContests: [],
                bestRank: null,
                worstRank: null,
                ratingProgression: [],
                currentRating: 0,
                maxRating: 0
            };
        }
    }

    extractBadges(document, htmlData) {
        try {
            const badges = [];
            
            // Look for badges in various sections
            const badgeSelectors = [
                '.badge-item',
                '.achievement-badge',
                '.user-badge',
                '.badge-card',
                '.achievement-item'
            ];

            for (let selector of badgeSelectors) {
                const badgeElements = document.querySelectorAll(selector);
                badgeElements.forEach(badge => {
                    const name = badge.querySelector('.badge-name, .achievement-name, .title')?.textContent?.trim();
                    const date = badge.querySelector('.badge-date, .achievement-date, .date')?.textContent?.trim();
                    const description = badge.querySelector('.badge-description, .description')?.textContent?.trim();
                    
                    if (name) {
                        badges.push({
                            name: name,
                            date: date || null,
                            description: description || null
                        });
                    }
                });
            }

            // Look for badges in JavaScript data
            const badgeDataMatch = htmlData.match(/badges\s*[=:]\s*(\[.*?\])/s);
            if (badgeDataMatch && badges.length === 0) {
                try {
                    const badgeData = JSON.parse(badgeDataMatch[1]);
                    badgeData.forEach(badge => {
                        badges.push({
                            name: badge.name || badge.title,
                            date: badge.date || badge.earned_date,
                            description: badge.description
                        });
                    });
                } catch (e) {
                    console.log('Failed to parse badge data:', e.message);
                }
            }

            return badges;
        } catch (error) {
            console.log('Badge extraction failed:', error.message);
            return [];
        }
    }

    extractPracticeStats(document, htmlData) {
        try {
            const practiceStats = {
                easy: 0,
                medium: 0,
                hard: 0,
                totalArticles: 0,
                contributions: 0
            };

            // Look for difficulty-wise problem counts
            const difficultyElements = document.querySelectorAll('.difficulty-stats .stat, .problem-difficulty');
            difficultyElements.forEach(el => {
                const text = el.textContent?.toLowerCase() || '';
                const count = parseInt(text.match(/\d+/)?.[0]) || 0;
                
                if (text.includes('easy')) practiceStats.easy = count;
                else if (text.includes('medium')) practiceStats.medium = count;
                else if (text.includes('hard')) practiceStats.hard = count;
            });

            // Look for articles and contributions
            const articleElement = document.querySelector('.articles-count, .total-articles');
            if (articleElement) {
                practiceStats.totalArticles = parseInt(articleElement.textContent.replace(/\D/g, '')) || 0;
            }

            const contributionElement = document.querySelector('.contributions-count, .total-contributions');
            if (contributionElement) {
                practiceStats.contributions = parseInt(contributionElement.textContent.replace(/\D/g, '')) || 0;
            }

            return practiceStats;
        } catch (error) {
            console.log('Practice stats extraction failed:', error.message);
            return {};
        }
    }
}

export default GeeksforGeeksAPI;
