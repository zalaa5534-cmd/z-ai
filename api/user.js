export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { user } = req.body || {};

    if (!user || !user.email) {
      return res.status(400).json({
        error: "User information is required."
      });
    }

    /*
      الاسم الرسمي الذي سيظهر داخل Z AI
      بدل الاسم الطويل القادم من Google.
    */

    const displayName = "ZIAD Alaa Zakii";

    const userData = {
      id: user.id || null,

      email: user.email,

      name: displayName,

      picture: user.picture || "",

      emailVerified:
        user.emailVerified === true
    };

    /*
      ملاحظة:
      التخزين الدائم للمستخدم سيتم ربطه مع
      قاعدة البيانات عندما نكمل إعداد التخزين.
    */

    return res.status(200).json({
      success: true,

      user: userData
    });

  } catch (error) {
    console.error(
      "User API error:",
      error
    );

    return res.status(500).json({
      error:
        "حدث خطأ أثناء تحميل بيانات المستخدم."
    });
  }
}
