async function analyzeScreenshotWithGemini(imageBase64, mimeType, strategy) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        throw new Error("Gemini API key is missing. Please add it to js/config.js.");
    }

    const prompt = getPromptByStrategy(strategy);

    const cleanBase64 = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: prompt
                    },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: cleanBase64
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.2,
            topK: 32,
            topP: 0.9,
            maxOutputTokens: 4096
        }
    };

    const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    const outputText =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("\n")
            .trim() || "No response text returned by Gemini.";

    return {
        raw: data,
        text: outputText
    };
}
