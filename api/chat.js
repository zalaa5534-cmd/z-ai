export default async function handler(req, res) {

  // السماح بطلبات POST فقط
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  try {

    // التأكد من وجود مفتاح Gemini
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in Vercel."
      });
    }

    // قراءة الرسالة القادمة من الموقع
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    // طلب Gemini
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
      encodeURIComponent(apiKey),
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  "أنت Z AI، مساعد ذكاء اصطناعي ودود وذكي. " +
                  "أجب باللغة التي يستخدمها المستخدم. " +
                  "إذا تحدث معك بالعربية فتحدث معه بالعربية. " +
                  "كن واضحًا ومفيدًا ومختصرًا عندما يكون ذلك مناسبًا."
              }
            ]
          },

          contents: [
            {
              role: "user",
              parts: [
                {
                  text: message
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // لو Gemini رجع خطأ
    if (!response.ok) {

      console.error("Gemini API Error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    // استخراج النص من رد Gemini
    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!reply) {

      return res.status(500).json({
        error: "Gemini returned an empty response."
      });
    }

    // إرسال الرد للموقع
    return res.status(200).json({
      reply
    });

  } catch (error) {

    console.error("Server Error:", error);

    return res.status(500).json({
      error: "Server error: " + error.message
    });
  }
}
