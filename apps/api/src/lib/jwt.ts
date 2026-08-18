import jwt from "jsonwebtoken";
import type { JwtPayload } from "@help/shared-types";
import { env } from "./env";

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
