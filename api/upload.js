export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    /*
      ملاحظة:
      رفع الملفات الحقيقي يحتاج Storage خارجي.
      هنا نستخدم Vercel Blob.
    */

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      return res.status(500).json({
        error:
          "BLOB_READ_WRITE_TOKEN is not configured in Vercel."
      });
    }

    const contentType =
      req.headers["content-type"] || "";

    if (!contentType.includes("application/json")) {
      return res.status(400).json({
        error:
          "This endpoint expects JSON containing a file."
      });
    }

    const { fileName, fileType, fileData } =
      req.body || {};

    if (!fileName || !fileData) {
      return res.status(400).json({
        error:
          "fileName and fileData are required."
      });
    }

    /*
      حماية بسيطة لاسم الملف
    */

    const safeName =
      String(fileName)
        .replace(/[^\w.\-()\u0600-\u06FF ]/g, "_")
        .replace(/\s+/g, "_")
        .slice(0, 150);

    /*
      تحويل Base64 إلى بيانات الملف
    */

    let base64 = String(fileData);

    if (base64.includes(",")) {
      base64 =
        base64.split(",")[1];
    }

    const buffer =
      Buffer.from(base64, "base64");

    if (!buffer.length) {
      return res.status(400).json({
        error: "Invalid file data."
      });
    }

    /*
      حد أقصى 20MB
    */

    const MAX_SIZE =
      20 * 1024 * 1024;

    if (buffer.length > MAX_SIZE) {
      return res.status(413).json({
        error:
          "File is too large. Maximum size is 20MB."
      });
    }

    /*
      استخدام Vercel Blob REST API
    */

    const blobResponse =
      await fetch(
        `https://blob.vercel-storage.com/${encodeURIComponent(
          `z-ai/${Date.now()}-${safeName}`
        )}`,
        {
          method: "PUT",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              fileType ||
              "application/octet-stream",

            "x-content-type":
              fileType ||
              "application/octet-stream",

            "x-add-random-suffix":
              "1"
          },

          body: buffer
        }
      );

    const blobData =
      await blobResponse.json();

    if (!blobResponse.ok) {
      console.error(
        "Vercel Blob error:",
        blobData
      );

      return res.status(
        blobResponse.status
      ).json({
        error:
          blobData?.message ||
          blobData?.error ||
          "File upload failed."
      });
    }

    return res.status(200).json({
      success: true,

      file: {
        name: fileName,
        type:
          fileType ||
          "application/octet-stream",

        url:
          blobData?.url || null,

        size:
          buffer.length
      }
    });

  } catch (error) {
    console.error(
      "Upload error:",
      error
    );

    return res.status(500).json({
      error:
        "حدث خطأ أثناء رفع الملف."
    });
  }
}
