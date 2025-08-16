export default class CodeChefAPI {
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

            if (response.status === 200) {
                const htmlData = response.data;
                const dom = new JSDOM(htmlData);
                const document = dom.window.document;

                // Extract problems solved using multiple methods
                const problemsSolved = this.extractProblemsSolved(document, htmlData);

                const contestData = this.extractContestData(document, htmlData);

                // Extract rating data
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

                // Extract profile information
                const userDetailsContainer = document.querySelector(".user-details-container");
                const ratingNumber = document.querySelector(".rating-number");
                const ratingRanks = document.querySelector(".rating-ranks");
                const userCountryFlag = document.querySelector(".user-country-flag");
                const userCountryName = document.querySelector(".user-country-name");
                const ratingElement = document.querySelector(".rating");

                const currentRating = parseInt(ratingNumber?.textContent?.replace(/[^\d]/g, '')) || 0;
                if (highestRating === 0) {
                    highestRating = currentRating;
                }

                return {
                    status: "OK",
                    platform: "codechef",
                    username: handle,
                    profile: {
                        name: this.extractName(userDetailsContainer) || handle,
                        // countryFlag: userCountryFlag?.src || null,
                        // countryName: userCountryName?.textContent?.trim() || null,
                        username: handle,
                        avatar: userDetailsContainer?.querySelector('img')?.src || null,
                        global_rank: this.extractRank(ratingRanks, 'global') || 0,
                        country_rank: this.extractRank(ratingRanks, 'country') || 0,
                        stars: ratingElement?.textContent?.trim() || "unrated",

                    },
                    solvedStats: {
                        current_rating: currentRating,
                        highest_rating: highestRating,
                        problems_solved: problemsSolved,
                        contests_attended: ratingData ? ratingData.length : 0,
                        division: this.getDivisionFromRating(currentRating)
                    },
                    contests: contestData
                };
            } else {
                throw new Error(`HTTP ${response.status}: Could not fetch profile`);
            }
        } catch (error) {
            console.error(`CodeChef API Error for ${handle}:`, error.message);
            
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
                        recentContests: recentContests,
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
}
