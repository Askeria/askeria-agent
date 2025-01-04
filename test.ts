import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { MessageResponse } from './src/types/interfaces';

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;


const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

async function test() {

    const msg = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        messages: [{ role: 'user', content: 'Hello, how are you?' }],
    }) as MessageResponse;

    console.log(msg.content[0]?.text);
}

test().catch(console.error);