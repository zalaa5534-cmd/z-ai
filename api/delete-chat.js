export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

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

    const { email, chatId } =
      req.body || {};

    if (!email || !chatId) {
      return res.status(400).json({
        error:
          "email and chatId are required."
      });
    }

    const userKey =
      `zai:user:${encodeURIComponent(email)}`;

    async function redis(command) {
      const response = await fetch(
        redisUrl,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${redisToken}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify(command)
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
          "Redis request failed."
        );
      }

      return data.result;
    }

    const stored =
      await redis([
        "GET",
        userKey
      ]);

    let chats = [];

    if (stored) {
      try {
        chats = JSON.parse(stored);
      } catch {
        chats = [];
      }
    }

    const originalLength =
      chats.length;

    chats =
      chats.filter(
        chat => chat.id !== chatId
      );

    if (
      chats.length === originalLength
    ) {
      return res.status(404).json({
        error:
          "Chat not found."
      });
    }

    await redis([
      "SET",
      userKey,
      JSON.stringify(chats)
    ]);

    return res.status(200).json({
      success: true,
      deletedChatId: chatId,
      chats
    });

  } catch (error) {
    console.error(
      "Delete chat error:",
      error
    );

    return res.status(500).json({
      error:
        "حدث خطأ أثناء حذف المحادثة."
    });
  }
}
