import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { AppError } from '../utils/AppError.js';
import { validateSignup, validateSignin } from '../utils/validators.js';
import { UserModel, toPublicUser } from '../models/user.model.js';
import { signToken } from '../middleware/auth.js';

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', config.bcryptRounds);

const session = (userRow) => ({ token: signToken(userRow.id), user: toPublicUser(userRow) });

export async function signup(req, res) {
  const { name, email, password } = validateSignup(req.body);

  if (UserModel.findByEmail(email)) {
    throw new AppError(409, 'An account with this email already exists', { email: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const user = UserModel.create({ name, email, passwordHash });
  res.status(201).json(session(user));
}

export async function signin(req, res) {
  const { email, password } = validateSignin(req.body);

  const user = UserModel.findByEmail(email);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'Invalid email or password');

  res.json(session(user));
}

export function me(req, res) {
  res.json({ user: req.user });
}
