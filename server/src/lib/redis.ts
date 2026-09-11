import {Redis} from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL,{
    maxRetriesPerRequest: 3,
    retryStrategy(times){
        const delay = Math.min(times*100,2000);
        return delay;
    }

})

redis.on('connect',()=>{
    console.log('Connected to Redis Successfully!')
})

redis.on('error',(err)=>{
    console.error('Redis connection error: ',err);
})