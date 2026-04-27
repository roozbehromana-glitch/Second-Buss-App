async function generateScenarioVisual(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      message: 'Gemini image preview is not configured. Add GEMINI_API_KEY to your .env file.'
    };
  }

  const prompt = `Create an academic-style transport diagram for scenario: ${JSON.stringify(payload).slice(0, 1500)}`;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  return {
    configured: true,
    message: data?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text || 'Image generated.',
    imageBase64: part?.inlineData?.data || null,
    mimeType: part?.inlineData?.mimeType || 'image/png'
  };
}

module.exports = { generateScenarioVisual };
