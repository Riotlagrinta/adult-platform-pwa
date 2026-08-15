import jwt from 'jsonwebtoken';

type TokenPayload = {
  sub: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
};

const secret = process.env.JWT_SECRET ?? 'dev_secret_change_me';

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, secret) as TokenPayload;
}
