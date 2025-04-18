import { Router } from 'express';
import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET || 'secret';

router.post('/register', async (req, res) => {
  const { email, password, name, identity } = req.body;

  try {
    const userExist = await prisma.users.findUnique({ where: { email } });
    if (userExist) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        name,
        identity,
      },
    });

    const token = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: '24h',
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
    return;
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user!.password);
    if (!isValidPassword) {
      res.status(400).json({ error: 'Invalid password' });
      return;
    }

    const token = jwt.sign({ userId: user!.id }, jwtSecret, {
      expiresIn: '24h',
    });

    await prisma.users.update({
      where: { id: user!.id },
      data: { lastLogin: new Date() },
    });

    res.status(200).json({ token });
    return;
  } catch (error) {
    console.log('Erro during login: ', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
