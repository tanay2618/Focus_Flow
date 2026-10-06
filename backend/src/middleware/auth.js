import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';
import { UserModel, toPublicUser } from '../models/user.model.js';

export const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

/** Verifies the Bearer token, attaches the user to req.user, or responds 401. */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return next(new AppError(401, 'Authentication required. Send an "Authorization: Bearer <token>" header.'));
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Your session has expired. Please sign in again.' : 'Invalid authentication token.';
    return next(new AppError(401, message));
  }

  const user = UserModel.findById(Number(payload.sub));
  if (!user) return next(new AppError(401, 'This account no longer exists.'));

  req.user = toPublicUser(user);
  next();
}
