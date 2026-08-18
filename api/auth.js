export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { idToken } = req.body || {};

    if (!idToken) {
      return res.status(400).json({
        error: "Google ID token is required."
      });
    }

    // التحقق من Google ID Token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );

    const data = await response.json();

    if (!response.ok || data.error_description) {
      return res.status(401).json({
        error: "Invalid Google authentication token."
      });
    }

    // التأكد أن التوكن صادر لتطبيقنا
    const googleClientId =
      process.env.GOOGLE_CLIENT_ID;

    if (
      googleClientId &&
      data.aud !== googleClientId
    ) {
      return res.status(401).json({
        error: "Google account verification failed."
      });
    }

    const user = {
      id: data.sub,
      email: data.email,
      name: data.name || "",
      firstName: data.given_name || "",
      lastName: data.family_name || "",
      picture: data.picture || "",
      emailVerified: data.email_verified === "true"
    };

    if (!user.email) {
      return res.status(401).json({
        error: "Google account email was not found."
      });
    }

    return res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error("Auth error:", error);

    return res.status(500).json({
      error: "حدث خطأ أثناء تسجيل الدخول."
    });
  }
}
