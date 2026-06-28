import fs from "fs";
import path from "path";
import cloudinary from "../config/cloudinary";

export async function uploadFile(
  file: Express.Multer.File,
  folder: string
) {
  if (process.env.NODE_ENV !== "production") {
    return {
      path: `/uploads/${folder}/${file.filename}`,
    };
  }

  const result = await cloudinary.uploader.upload(file.path, {
    folder: `uploads/${folder}`,
    resource_type: "auto",
    use_filename: true,
    unique_filename: false,
    overwrite: true,
  });

  fs.unlinkSync(file.path);

  return {
    path: `/uploads/${folder}/${path.basename(result.public_id)}.${result.format}`,
  };
}