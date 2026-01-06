import { supabase } from '$lib/supabase';
import { json } from '@sveltejs/kit';
import { GEMINI_API_KEY } from '$env/static/private'; // ვკითხულობთ .env-დან

export const POST = async ({ request }) => {
    try {
        const data = await request.formData();
        const userPrompt = data.get('prompt') || "";

        if (!GEMINI_API_KEY) {
            throw new Error("API_KEY არ არის მითითებული .env ფაილში");
        }

        // 1. ხელმისაწვდომი მოდელების ძებნა
        const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const listRes = await fetch(listModelsUrl);
        const listData = await listRes.json();

        if (listData.error) throw new Error(listData.error.message);

        const availableModels = listData.models.map(m => m.name);

        // ვირჩევთ flash მოდელს
        const selectedModel = availableModels.find(m => m.includes('gemini-1.5-flash')) ||
            availableModels.find(m => m.includes('flash')) ||
            availableModels[0];

        // 2. Embedding-ის შექმნა
        const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
        const embedRes = await fetch(EMBED_URL, {
            method: 'POST',
            body: JSON.stringify({ content: { parts: [{ text: userPrompt }] } })
        });
        const embedData = await embedRes.json();

        if (embedData.error) throw new Error(embedData.error.message);
        const queryVector = embedData.embedding.values;

        // 3. Supabase ძიება (RAG)
        const { data: matchedDocs, error: searchError } = await supabase
            .schema('api')
            .rpc('match_legal_docs', {
                query_embedding: queryVector,
                match_threshold: 0.3,
                match_count: 5
            });

        if (searchError) throw searchError;

        if (!matchedDocs || matchedDocs.length === 0) {
            return json({ text: "ბაზაში ამ საკითხზე ოფიციალური კანონი არ მოიძებნა." });
        }

        // 4. პასუხის გენერაცია კონტექსტზე დაყრდნობით
        const contextText = matchedDocs.map(doc => doc.content).join("\n---\n");
        const CHAT_URL = `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`;

        const chatRes = await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `შენ ხარ გერმანული ბიუროკრატიის ექსპერტი. უპასუხე ქართულად.
                        გამოიყენე მხოლოდ ეს კონტექსტი: ${contextText}
                        კითხვა: ${userPrompt}`
                    }]
                }]
            })
        });

        const chatResult = await chatRes.json();
        if (chatResult.error) throw new Error(chatResult.error.message);

        return json({ text: chatResult.candidates[0].content.parts[0].text });

    } catch (error) {
        console.error("DEBUG:", error.message);
        return json({ text: `შეცდომა: ${error.message}` }, { status: 500 });
    }
};