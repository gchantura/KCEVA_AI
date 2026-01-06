import { GoogleGenerativeAI } from "@google/generative-ai";
import { VITE_GEMINI_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';

export const POST = async ({ request }) => {
    try {
        const apiKey = VITE_GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);

        // 1. დიაგნოსტიკა: ვნახოთ რა მოდელებზე გაქვს წვდომა
        // შენიშვნა: ზოგიერთ გასაღებზე listModels შეზღუდულია, ამიტომ პირდაპირ ვცადოთ სათითაოდ

        const data = await request.formData();
        const userPrompt = data.get('prompt') || "გამარჯობა";
        const image = data.get('image');

        // მოდელების პრიორიტეტული სია
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`მცდელობა მოდელით: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                const SYSTEM_PROMPT = "შენ ხარ გერმანული ბიუროკრატიის ექსპერტი. უპასუხე ქართულად.";
                let payload = [];

                if (image && image instanceof File && image.size > 0) {
                    const arrayBuffer = await image.arrayBuffer();
                    payload = [
                        { text: SYSTEM_PROMPT + "\n\n" + userPrompt },
                        { inlineData: { data: Buffer.from(arrayBuffer).toString("base64"), mimeType: image.type } }
                    ];
                } else {
                    payload = [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }];
                }

                const result = await model.generateContent({ contents: [{ role: "user", parts: payload }] });
                const response = await result.response;

                // თუ აქამდე მოაღწია, ნიშნავს რომ მუშაობს!
                return json({
                    text: response.text(),
                    activeModel: modelName
                });

            } catch (err) {
                console.error(`${modelName} ვერ გაეშვა:`, err.message);
                lastError = err;
                continue; // გადადის შემდეგ მოდელზე
            }
        }

        // თუ ვერცერთმა მოდელმა ვერ იმუშავა
        throw new Error("ვერცერთი მოდელი ვერ მოიძებნა. შეამოწმეთ API გასაღების უფლებები Google AI Studio-ში.");

    } catch (error) {
        console.error("საბოლოო შეცდომა:", error);
        return json({ text: `შეცდომა: ${error.message}` }, { status: 500 });
    }
};