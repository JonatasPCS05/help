import { randomUUID } from "crypto";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { autenticar } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { env } from "../lib/env";

export const uploadsRouter = Router();
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      cb(new ApiHttpError(422, "arquivo_invalido", "Envie uma imagem (JPEG, PNG ou WebP)"));
      return;
    }
    cb(null, true);
  },
});

uploadsRouter.post("/", autenticar, upload.single("arquivo"), (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiHttpError(422, "arquivo_obrigatorio", "Nenhum arquivo enviado");
    }
    res.status(201).json({ url: `${env.API_PUBLIC_URL}/uploads/${req.file.filename}` });
  } catch (error) {
    next(error);
  }
});
