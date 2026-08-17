export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const userMessage = message.trim();

    // تعريف Z AI بشكل ثابت وحرفي
    const identityMessage =
      "أنا Z AI، مساعد ذكاء اصطناعي تم تطويره بواسطة زياد علاء السيد ذكي. أستخدم نماذج ذكاء اصطناعي متقدمة لمساعدتك في الإجابة عن أسئلتك وتنفيذ مهامك.";

    // لو المستخدم بيسأل عن هوية Z AI
    const normalizedMessage = userMessage
      .toLowerCase()
      .replace(/[؟?!.,،]/g, "")
      .trim();

    const identityQuestions = [
      "من أنت",
      "مين انت",
      "مين أنت",
      "من انت",
      "من هو z ai",
      "من هو z ai",
      "ايه z ai",
      "ما هو z ai",
      "ما هو z ai",
      "عرف نفسك",
      "عرفني بنفسك",
      "من انت z ai",
      "مين z ai"
    ];

    if (identityQuestions.includes(normalizedMessage)) {
      return res.status(200).json({
        reply: identityMessage
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in Vercel."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    `أنت Z AI، مساعد ذكاء اصطناعي مفيد وودود.

هوية Z AI الرسمية:
${identityMessage}

إذا سألك المستخدم عن هويتك أو من أنت، يجب أن يكون تعريفك مطابقًا للنص الرسمي أعلاه حرفيًا.

في الأسئلة الأخرى، أجب بشكل طبيعي ومفيد باللغة التي يستخدمها المستخدم.

رسالة المستخدم:
${userMessage}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return res.status(500).json({
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({
      reply
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "حدث خطأ في الاتصال بالذكاء الاصطناعي."
    });
  }
}
