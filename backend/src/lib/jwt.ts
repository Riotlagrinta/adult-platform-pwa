import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

type TokenPayload = {
  sub: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
};

// Un secret codé en dur serait visible par quiconque lit ce fichier public et permettrait
// de forger des tokens (y compris ADMIN). Si JWT_SECRET n'est pas défini, on génère un
// secret aléatoire par process (les sessions existantes seront invalidées au redémarrage,
// mais aucun secret prévisible n'est jamais utilisé).
const secret = process.env.JWT_SECRET ?? (() => {
  console.warn('[jwt] JWT_SECRET manquant : un secret aléatoire a été généré pour ce process. Définissez JWT_SECRET en production.');
  return crypto.randomBytes(48).toString('hex');
})();

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, secret) as TokenPayload;
}
