const Redis = require('ioredis');
const { LRUCache } = require('lru-cache');

class CacheManager {
    constructor() {
        // Redis client with fallback
        this.redis = null;
        this.initRedis();
        
        // In-memory LRU cache
        this.memory = new LRUCache({
            max: 10000,           // max 10k items
            ttl: 300000,          // 5 minutes
            allowStale: true,     // serve stale data if needed
            updateAgeOnGet: true,
            fetchMethod: async (key) => {
                return await this.getFromRedis(key);
            }
        });
        
        this.stats = {
            hits: 0,
            misses: 0,
            redis_hits: 0,
            redis_misses: 0,
            errors: 0
        };
    }

    async initRedis() {
        try {
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                retryDelayOnFailover: 100,
                enableOfflineQueue: false,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                connectTimeout: 5000,
                commandTimeout: 5000,
            });

            this.redis.on('error', (err) => {
                console.warn('Redis connection error:', err.message);
                this.stats.errors++;
            });

            this.redis.on('connect', () => {
                console.log('✅ Redis connected successfully');
            });

        } catch (error) {
            console.warn('Redis initialization failed, using memory-only cache:', error.message);
            this.redis = null;
        }
    }

    async getFromRedis(key) {
        if (!this.redis) return null;
        
        try {
            const data = await this.redis.get(key);
            if (data) {
                this.stats.redis_hits++;
                return JSON.parse(data);
            }
            this.stats.redis_misses++;
            return null;
        } catch (error) {
            console.warn('Redis get error:', error.message);
            this.stats.errors++;
            return null;
        }
    }

    async setToRedis(key, data, ttl = 7200) {
        if (!this.redis) return;
        
        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
        } catch (error) {
            console.warn('Redis set error:', error.message);
            this.stats.errors++;
        }
    }

    async cached(key, ttl = 7200, fetcher) {
        const startTime = Date.now();
        
        try {
            // 1. Check memory cache first
            let data = this.memory.get(key);
            if (data) {
                this.stats.hits++;
                return {
                    ...data,
                    cache_info: {
                        hit: true,
                        source: 'memory',
                        fetch_time: Date.now() - startTime
                    }
                };
            }

            // 2. Check Redis cache
            data = await this.getFromRedis(key);
            if (data) {
                this.memory.set(key, data);
                this.stats.hits++;
                return {
                    ...data,
                    cache_info: {
                        hit: true,
                        source: 'redis',
                        fetch_time: Date.now() - startTime
                    }
                };
            }

            // 3. Fetch fresh data
            this.stats.misses++;
            const fresh = await fetcher();
            
            // Store in both caches
            this.memory.set(key, fresh);
            await this.setToRedis(key, fresh, ttl);
            
            return {
                ...fresh,
                cache_info: {
                    hit: false,
                    source: 'fresh',
                    fetch_time: Date.now() - startTime
                }
            };

        } catch (error) {
            this.stats.errors++;
            console.error('Cache operation failed:', error.message);
            
            // Try to return stale data if available
            const stale = this.memory.get(key, { allowStale: true });
            if (stale) {
                return {
                    ...stale,
                    cache_info: {
                        hit: true,
                        source: 'stale',
                        fetch_time: Date.now() - startTime,
                        error: error.message
                    }
                };
            }
            
            throw error;
        }
    }

    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hit_rate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
            memory_size: this.memory.size,
            memory_max: this.memory.max,
            redis_connected: this.redis ? this.redis.status === 'ready' : false
        };
    }

    async clear(pattern = '*') {
        this.memory.clear();
        if (this.redis) {
            try {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            } catch (error) {
                console.warn('Redis clear error:', error.message);
            }
        }
    }

    async disconnect() {
        if (this.redis) {
            await this.redis.disconnect();
        }
    }
}

module.exports = new CacheManager();