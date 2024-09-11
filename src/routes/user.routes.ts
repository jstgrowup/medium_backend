import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";
import {
  userSigninValidationSchema,
  userSignupValidationSchema,
} from "../zod-validations/user.zod";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
    SALT: string;
  };
}>();
userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const body = await c.req.json();
    const validatedBody = userSignupValidationSchema.parse(body);
    const salt = bcrypt.genSaltSync(Number(c?.env.SALT));
    const hashedPassword = bcrypt.hashSync(validatedBody.password, salt);
    const newUser = await prisma.user.create({
      data: {
        name: validatedBody.name,
        email: validatedBody.email,
        password: hashedPassword,
      },
    });
    if (!newUser) {
      c.status(403);
      return c.json({
        error: "Something went wrong while creating your account",
      });
    }
    const token = await sign({ id: newUser.id }, c?.env.JWT_SECRET);
    return c.json({ token: token, message: "Signup Successfull" });
  } catch (error) {
    if (error instanceof ZodError) {
      c.status(400);
      return c.json({ errors: error.errors });
    } else {
      c.status(500);
      return c.json({ message: "Something went wrong during signup" });
    }
  }
});
userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const body = await c.req.json();
    const validatedBody = userSigninValidationSchema.parse(body);
    const user = await prisma.user.findUnique({
      where: { email: validatedBody.email },
    });
    if (!user) {
      c.status(403);
      return c.json({
        error: "Sorry this account with this email doesnt exsits",
      });
    }
    const isPasswordValid = bcrypt.compareSync(
      validatedBody.password,
      user.password
    );
    if (!isPasswordValid) {
      c.status(403);
      return c.json({
        error: "Wrong password please try again",
      });
    }
    const token = await sign({ id: user.id }, c?.env.JWT_SECRET);
    return c.json({ token: token, message: "Sign in successfull" });
  } catch (error) {
    if (error instanceof ZodError) {
      c.status(400);
      return c.json({ errors: error.errors });
    } else {
      c.status(500);
      return c.json({ message: "Something went wrong during signin" });
    }
  }
});
userRouter.post("/me", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const body = await c.req.json();
    const validatedBody = userSigninValidationSchema.parse(body);
    const user = await prisma.user.findUnique({
      where: { email: validatedBody.email, password: validatedBody.password },
    });
    if (!user) {
      c.status(403);
      return c.json({ error: "user not found" });
    }
    const token = await sign({ id: user.id }, c?.env.JWT_SECRET);
    return c.json(token);
  } catch (error) {
    if (error instanceof ZodError) {
      c.status(400);
      return c.json({ errors: error.errors });
    } else {
      c.status(500);
      return c.json({ message: "Something went wrong during signin" });
    }
  }
});
