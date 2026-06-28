const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME!;

function getCloudinaryUrl(path: string): string {
  if (!path.startsWith("/uploads/")) return path;

  const file = path.replace(/^\/uploads\//, "");

  const ext = file.split(".").pop()?.toLowerCase() || "";

  const imageExt = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
    "avif"
  ];

  const type = imageExt.includes(ext)
    ? "image/upload"
    : "raw/upload";

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/${type}/uploads/${file}`;
}

function walk(obj: any): any {
  if (Array.isArray(obj))
    return obj.map(walk);

  if (obj && typeof obj === "object") {
    for (const key in obj) {
      obj[key] = walk(obj[key]);
    }
    return obj;
  }

  if (
    typeof obj === "string" &&
    obj.startsWith("/uploads/")
  ) {
    return getCloudinaryUrl(obj);
  }

  return obj;
}

export default function fileUrlMiddleware(
  req: any,
  res: any,
  next: any
) {
  const oldJson = res.json;

  res.json = function (body: any) {
    body = walk(body);
    return oldJson.call(this, body);
  };

  next();
}