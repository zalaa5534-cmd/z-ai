export default async function handler(req, res) {
  try {
    const redisUrl =
      process.env.UPSTASH_REDIS_REST_URL;

    const redisToken =
      process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      return res.status(500).json({
        error:
          "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not configured."
      });
    }

    const { email, chatId, messages, title } =
      req.method === "GET"
        ? req.query || {}
        : req.body || {};

    if (!email) {
      return res.status(400).json({
        error: "User email is required."
      });
    }

    /*
      كل مستخدم له مساحة خاصة بالمحادثات.
    */
    const userKey =
      `zai:user:${encodeURIComponent(email)}`;

    async function redis(command) {
      const response = await fetch(redisUrl, {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${redisToken}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(command)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
          "Redis request failed."
        );
      }

      return data.result;
    }

    /*
      =========================
      GET
      جلب كل المحادثات
      =========================
    */

    if (req.method === "GET") {
      const history =
        await redis([
          "GET",
          userKey
        ]);

      let chats = [];

      if (history) {
        try {
          chats = JSON.parse(history);
        } catch {
          chats = [];
        }
      }

      return res.status(200).json({
        success: true,
        chats
      });
    }

    /*
      =========================
      DELETE
      حذف محادثة
      =========================
    */

    if (req.method === "DELETE") {
      if (!chatId) {
        return res.status(400).json({
          error: "chatId is required."
        });
      }

      const history =
        await redis([
          "GET",
          userKey
        ]);

      let chats = [];

      if (history) {
        try {
          chats = JSON.parse(history);
        } catch {
          chats = [];
        }
      }

      chats =
        chats.filter(
          chat => chat.id !== chatId
        );

      await redis([
        "SET",
        userKey,
        JSON.stringify(chats)
      ]);

      return res.status(200).json({
        success: true,
        chats
      });
    }

    /*
      =========================
      POST
      حفظ / تحديث محادثة
      =========================
    */

    if (req.method === "POST") {
      if (!chatId) {
        return res.status(400).json({
          error: "chatId is required."
        });
      }

      if (!Array.isArray(messages)) {
        return res.status(400).json({
          error: "messages must be an array."
        });
      }

      const history =
        await redis([
          "GET",
          userKey
        ]);

      let chats = [];

      if (history) {
        try {
          chats = JSON.parse(history);
        } catch {
          chats = [];
        }
      }

      /*
        البحث عن المحادثة الموجودة
      */

      const existingIndex =
        chats.findIndex(
          chat => chat.id === chatId
        );

      /*
        إنشاء عنوان تلقائي
        من أول رسالة للمستخدم
      */

      let generatedTitle =
        title?.trim() || "";

      if (!generatedTitle) {
        const firstUserMessage =
          messages.find(
            message =>
              message?.role === "user" &&
              typeof message?.content === "string" &&
              message.content.trim()
          );

        if (firstUserMessage) {
          generatedTitle =
            firstUserMessage.content
              .trim()
              .replace(/\s+/g, " ")
              .slice(0, 45);

          if (
            firstUserMessage.content.trim()
              .length > 45
          ) {
            generatedTitle += "...";
          }
        }
      }

      if (!generatedTitle) {
        generatedTitle =
          "محادثة جديدة";
      }

      const chat = {
        id: chatId,

        title: generatedTitle,

        messages,

        updatedAt:
          new Date().toISOString(),

        createdAt:
          existingIndex >= 0
            ? chats[existingIndex].createdAt
            : new Date().toISOString()
      };

      /*
        تحديث المحادثة
        أو إضافتها لأول مرة
      */

      if (existingIndex >= 0) {
        chats[existingIndex] = chat;
      } else {
        chats.unshift(chat);
      }

      /*
        الاحتفاظ بآخر 100 محادثة فقط
      */

      chats =
        chats.slice(0, 100);

      await redis([
        "SET",
        userKey,
        JSON.stringify(chats)
      ]);

      return res.status(200).json({
        success: true,
        chat
      });
    }

    return res.status(405).json({
      error: "Method not allowed."
    });

  } catch (error) {
    console.error(
      "History API error:",
      error
    );

    return res.status(500).json({
      error:
        "حدث خطأ أثناء حفظ أو تحميل المحادثات."
    });
  }
}
