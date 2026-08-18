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

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured in Vercel."
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
7. إذا كانت المعلومة غير مؤكدة أو حديثة جدًا، استخدم أدوات البحث المتاحة إذا كانت متاحة، أو وضّح أنك غير متأكد.
8. لا توافق المستخدم لمجرد أنه قال معلومة.
9. صحح المعلومات الخاطئة بأدب.
10. تعامل مع التاريخ الحالي على أنه تاريخ النظام الحالي، ولا تخترع تاريخًا قديمًا.
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
      BUILD INPUT
      =====================================================
    */

    const input = [];

    input.push({
      role: "developer",
      content: [
        {
          type: "input_text",
          text: systemInstructions
        }
      ]
    });

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
            ? "assistant"
            : "user";

        input.push({
          role,
          content: [
            {
              type: "input_text",
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

    const currentContent = [];

    if (message && message.trim()) {
      currentContent.push({
        type: "input_text",
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
          IMAGE
        */

        if (mime.startsWith("image/")) {
          currentContent.push({
            type: "input_image",
            image_url: file.data,
            detail: "auto"
          });

          currentContent.push({
            type: "input_text",
            text: `الصورة المرفقة اسمها: ${filename}`
          });

          continue;
        }

        /*
          OTHER FILES
        */

        currentContent.push({
          type: "input_file",
          filename,
          file_data: file.data
        });
      }
    }

    input.push({
      role: "user",
      content: currentContent
    });

    /*
      =====================================================
      OPENAI REQUEST
      =====================================================
    */

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: "gpt-5.6",
          input,

          /*
            Web search helps with current information.
          */

          tools: [
            {
              type: "web_search"
            }
          ]
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "OpenAI API error:",
        data
      );

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenAI API request failed."
      });
    }

    const reply =
      data?.output_text;

    if (!reply) {
      return res.status(500).json({
        error:
          "OpenAI returned an empty response."
      });
    }

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
