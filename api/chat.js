export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      message,
      history = [],
      attachments = []
    } = req.body || {};

    if (
      (!message || !message.trim()) &&
      (!attachments || attachments.length === 0)
    ) {
      return res.status(400).json({
        error: "Message or attachment is required."
      });
    }

    /*
      =====================================================
      GEMINI API KEY
      =====================================================
    */

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in Vercel."
      });
    }

    /*
      =====================================================
      Z AI SYSTEM INSTRUCTIONS
      =====================================================
    */

    const systemInstructions = `
أنت Z AI، مساعد ذكاء اصطناعي مفيد وذكي وودود.

المطور:
ZIAD Alaa Zakii

قواعد مهمة جدًا:

1. لا تبدأ كل إجابة بتعريف نفسك.
2. لا تكتب تعريف Z AI إلا إذا سأل المستخدم عن هويتك أو من طورك.
3. إذا سأل المستخدم عن هويتك، استخدم هذا النص حرفيًا:

"أنا Z AI، مساعد ذكاء اصطناعي تم تطويره بواسطة ZIAD Alaa Zakii. أستخدم نماذج ذكاء اصطناعي متقدمة لمساعدتك في الإجابة عن أسئلتك وتنفيذ مهامك."

4. لا تكتب اسم المطور بالعربية.
5. اسم المطور الصحيح دائمًا:
ZIAD Alaa Zakii

6. لا تخمن المعلومات.
7. إذا كانت المعلومة غير مؤكدة أو حديثة جدًا، استخدم البحث على الويب إذا كان متاحًا.
8. لا توافق المستخدم لمجرد أنه قال معلومة.
9. صحح المعلومات الخاطئة بأدب.
10. تعامل مع التاريخ الحالي على أنه تاريخ النظام الحالي.
11. أجب باللغة التي يستخدمها المستخدم.
12. إذا كان السؤال يحتاج شرحًا، اجعله منظمًا بعناوين ونقاط.
13. إذا كتبت كودًا، استخدم Markdown code blocks وحدد لغة الكود.
14. لا تضع إجاباتك داخل إطار أو Bubble.
15. لا تضف مقدمة غير ضرورية.
16. لا تقل "بالطبع" أو "بالتأكيد" في بداية كل إجابة بشكل متكرر.
17. إذا أرسل المستخدم صورة، حللها.
18. إذا أرسل المستخدم ملفًا، حاول فهم محتواه والإجابة بناءً عليه.
19. إذا طلب المستخدم إنشاء صورة، أخبر التطبيق أن الطلب يحتاج image generation.
20. كن طبيعيًا في الحوار ولا تكرر نفس الجمل.

أنت تعمل داخل تطبيق اسمه Z AI.
`;

    /*
      =====================================================
      BUILD GEMINI CONTENTS
      =====================================================
    */

    const contents = [];

    /*
      =====================================================
      PREVIOUS CHAT HISTORY
      =====================================================
    */

    if (Array.isArray(history)) {
      for (const item of history.slice(-30)) {
        if (!item || !item.role || !item.content) {
          continue;
        }

        const role =
          item.role === "assistant"
            ? "model"
            : "user";

        contents.push({
          role,
          parts: [
            {
              text: String(item.content)
            }
          ]
        });
      }
    }

    /*
      =====================================================
      CURRENT USER MESSAGE
      =====================================================
    */

    const currentParts = [];

    if (message && message.trim()) {
      currentParts.push({
        text: message.trim()
      });
    }

    /*
      =====================================================
      IMAGES / FILES
      =====================================================
    */

    if (Array.isArray(attachments)) {
      for (const file of attachments.slice(0, 5)) {
        if (!file || !file.data) {
          continue;
        }

        const mime =
          file.type ||
          "application/octet-stream";

        const filename =
          file.name ||
          "uploaded-file";

        /*
          -------------------------------------------------
          Convert data URL to pure base64
          -------------------------------------------------
        */

        let base64Data = String(file.data);

        if (base64Data.includes(",")) {
          base64Data =
            base64Data.split(",")[1];
        }

        /*
          -------------------------------------------------
          IMAGE / FILE
          -------------------------------------------------
        */

        currentParts.push({
          inline_data: {
            mime_type: mime,
            data: base64Data
          }
        });

        currentParts.push({
          text: `الملف المرفق اسمه: ${filename}`
        });
      }
    }

    /*
      إضافة رسالة المستخدم الحالية
    */

    contents.push({
      role: "user",
      parts: currentParts
    });

    /*
      =====================================================
      GEMINI REQUEST
      =====================================================
    */

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },

        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemInstructions
              }
            ]
          },

          contents,

          /*
            Google Search
            يسمح لـ Gemini بالبحث عن المعلومات
            الحديثة عند الحاجة.
          */

          tools: [
            {
              google_search: {}
            }
          ]
        })
      }
    );

    const data =
      await response.json();

    /*
      =====================================================
      GEMINI ERROR
      =====================================================
    */

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        data
      );

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    /*
      =====================================================
      GET RESPONSE TEXT
      =====================================================
    */

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.filter(part => part.text)
        ?.map(part => part.text)
        ?.join("") || "";

    if (!reply.trim()) {
      return res.status(500).json({
        error:
          "Gemini returned an empty response."
      });
    }

    /*
      =====================================================
      SUCCESS
      =====================================================
    */

    return res.status(200).json({
      reply
    });

  } catch (error) {

    console.error(
      "Z AI server error:",
      error
    );

    return res.status(500).json({
      error:
        "حدث خطأ في الاتصال بالذكاء الاصطناعي."
    });
  }
}
