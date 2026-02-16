
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    try {
        // There isn't a direct listModels method on the client instance in some versions, 
        // but let's try to just run a simple prompt on 'gemini-1.5-flash' to verify connectivity.
        console.log("Testing gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("Flash Response:", result.response.text());

        console.log("Testing gemini-1.5-pro...");
        const modelPro = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const resultPro = await modelPro.generateContent("Hello");
        console.log("Pro Response:", resultPro.response.text());

    } catch (e) {
        console.error("Error:", e.message);
    }
}

listModels();
