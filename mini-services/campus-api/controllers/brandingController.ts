import { Request, Response } from 'express';
import prisma from '../config/database';

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