async function analyzeScreenshotWithGemini(imageBase64, mimeType, strategy) {
    const apiKey = getStoredGeminiApiKey();

    if (!apiKey) {
        throw new Error("Gemini API key is missing. Please enter your API key on the upload page.");
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

    const response = await fetch(buildGeminiApiUrl(apiKey), {
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
