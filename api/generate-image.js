export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { prompt, size = "1024x1024" } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Image prompt is required."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured in Vercel."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: prompt.trim(),
          size
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI image error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenAI image generation failed."
      });
    }

    const image =
      data?.data?.[0];

    if (!image) {
      return res.status(500).json({
        error: "OpenAI returned no image."
      });
    }

    return res.status(200).json({
      success: true,

      image: {
        url: image.url || null,
        b64_json: image.b64_json || null
      }
    });

  } catch (error) {
    console.error(
      "Generate image error:",
      error
    );

    return res.status(500).json({
      error:
        "حدث خطأ أثناء إنشاء الصورة."
    });
  }
}
