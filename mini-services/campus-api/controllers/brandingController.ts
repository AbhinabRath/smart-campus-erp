import { Request, Response } from 'express';
import { Readable } from 'stream';
import prisma from '../config/database';
import cloudinary from '../config/cloudinary';

export async function getBranding(
  req: Request,
  res: Response
) {
  const branding =
    await prisma.brandingSettings.findFirst();

  res.json({
    success: true,
    data: branding
  });
}

export async function uploadBackground(
  req: Request,
  res: Response
) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }
  const result: any = await new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: "uploads/branding",
      resource_type: "auto",
    },
    (error, uploadResult) => {
      if (error) return reject(error);
      resolve(uploadResult);
    }
  );

  Readable.from(req.file!.buffer).pipe(stream);
});

  let branding =
    await prisma.brandingSettings.findFirst();

  if (!branding) {
    branding =
      await prisma.brandingSettings.create({
        data: {
          loginBackground:
            result.secure_url
        }
      });
  } else {
    branding =
      await prisma.brandingSettings.update({
        where: {
          id: branding.id
        },
        data: {
          loginBackground:
            result.secure_url
        }
      });
  }

  res.json({
    success: true,
    data: branding
  });
}