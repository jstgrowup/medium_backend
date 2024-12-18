import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign, verify } from "hono/jwt";
import { ZodError } from "zod";
import bcrypt from "bcryptjs";
import {
  userProfilePicValidationSchema,
  userSigninValidationSchema,
  userSignupValidationSchema,
} from "../zod-validations/user.zod";
import { sendEmail } from "../services/email.service";
export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
    SALT: string;
    SERVER_ENV: string;
    RESEND_KEY: string;
    DEV_FRONTEND_URL: string;
    DEV_BACKEND_URL: string;
    PROD_FRONTEND_URL: string;
    PROD_BACKEND_URL: string;
  };
}>();
userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const body = await c.req.json();
    const validatedBody = userSignupValidationSchema.parse(body);
    const foundUser = await prisma.user.findUnique({
      where: {
        email: validatedBody.email,
        emailVerified: true,
      },
    });
    if (foundUser) {
      return c.json({
        error: "Account already exists please signin",
      });
    }
    const salt = bcrypt.genSaltSync(Number(c?.env.SALT));
    const hashedPassword = bcrypt.hashSync(validatedBody.password, salt);
    const newUser = await prisma.user.create({
      data: {
        email: validatedBody.email,
        password: hashedPassword,
        name: validatedBody.name,
      },
    });
    if (!newUser) {
      c.status(403);
      return c.json({
        error: "Something went wrong while creating your account",
      });
    }
    const token = await sign(
      { id: newUser.id, exp: Math.floor(Date.now() / 1000) + 30 * 60 },
      c?.env.JWT_SECRET
    );
    const frontendUrl =
      c?.env.SERVER_ENV === "dev"
        ? c?.env.DEV_FRONTEND_URL
        : c?.env.PROD_FRONTEND_URL;

    const magicLink = `${frontendUrl}/api/verify-email?token=${token}`;
    await sendEmail({
      to: newUser.email,
      subject: "Email verification",
      htmlContent: `
      <p>Congrats on sending your <strong>first email</strong>!</p>
      <p>
        Please click the link below to verify your email:
      </p>
      <a href="${magicLink}" target="_blank">Verify Email</a>
    `,
      from: "onboarding@resend.dev",
      resendKey: c?.env.RESEND_KEY,
    });
    return c.json({
      message: "Sign up successfull please check your email to verify",
    });
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
    if (!user?.emailVerified) {
      c.status(403);
      return c.json({
        error: "This email is not verified please verify your email",
      });
    }
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
    const token = await sign(
      { id: user.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 },
      c?.env.JWT_SECRET
    );
    return c.json({ message: "Sign in successfull", token });
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
userRouter.get("/me", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const authHeader = String(c.req.header("authorization"));
    const authToken = authHeader?.split(" ")[1];
    const decodedToken = await verify(authToken, c.env.JWT_SECRET);
    if (!decodedToken) {
      c.status(403);
      return c.json({ message: "Unauthorized user" });
    }
    const userId = String(decodedToken.id);

    const foundUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePic: true,
        role: true,
        about: true,
      },
    });

    if (!foundUser) {
      c.status(401);
      return c.json({ message: "Unauthorized user" });
    }
    return c.json({ data: foundUser });
  } catch (error) {
    c.status(400);
    return c.json({ message: "Unauthorised" });
  }
});
userRouter.get("/profile/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const authHeader = String(c.req.header("authorization"));
    const authToken = authHeader?.split(" ")[1];
    const decodedToken = await verify(authToken, c.env.JWT_SECRET);
    if (!decodedToken) {
      c.status(403);
      return c.json({ message: "Unauthorized user" });
    }
    const profileId = c.req.param("id");
    const foundUser = await prisma.user.findUnique({
      where: {
        id: profileId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profilePic: true,
        role: true,
        about: true,
      },
    });

    if (!foundUser) {
      c.status(401);
      return c.json({ message: "Unauthorized user" });
    }
    return c.json({ data: foundUser });
  } catch (error) {
    c.status(400);
    return c.json({ message: "Unauthorised" });
  }
});
userRouter.post("/update/profile-picture", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const authHeader = String(c.req.header("authorization"));
    const authToken = authHeader?.split(" ")[1];
    const body = await c.req.json();
    const validatedBody = userProfilePicValidationSchema.parse(body);
    const decodedToken = await verify(authToken, c.env.JWT_SECRET);
    if (!decodedToken) {
      c.status(403);
      return c.json({ message: "Unauthorized user" });
    }
    const userId = String(decodedToken.id);
    const updatedUserWithProfilePic = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        profilePic: validatedBody.imageUrl,
      },
    });

    if (!updatedUserWithProfilePic) {
      c.status(401);
      return c.json({ message: "Something went wrong" });
    }
    return c.json({ message: "Profile picture updated successfully" });
  } catch (error) {
    c.status(400);
    return c.json({ message: "Unauthorised" });
  }
});
userRouter.post("/update/profile", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const authHeader = String(c.req.header("authorization"));
    const authToken = authHeader?.split(" ")[1];
    const body = await c.req.json();
    const decodedToken = await verify(authToken, c.env.JWT_SECRET);
    if (!decodedToken) {
      c.status(403);
      return c.json({ message: "Unauthorized user" });
    }
    const userId = String(decodedToken.id);
    const updatedUserWithProfilePic = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...body,
      },
    });

    if (!updatedUserWithProfilePic) {
      c.status(401);
      return c.json({ message: "Something went wrong" });
    }
    return c.json({ message: "Profile  Updated Successfully" });
  } catch (error) {
    c.status(400);
    return c.json({ message: "Unauthorised" });
  }
});
userRouter.get("/verify-email", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const url = new URL(c.req.url);
    const authToken = url.searchParams.get("token") as string;
    const decodedToken = await verify(authToken, c.env.JWT_SECRET);
    const userId: string = decodedToken.id as string;
    const updatedVerifiedEmail = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
      },
    });
    if (!updatedVerifiedEmail) {
      c.status(403);
      return c.json({ message: "Unauthorized user" });
    }
    return c.json({ message: "Email verified Successfully" });
  } catch (error) {
    c.status(400);
    return c.json({ message: "Unauthorised" });
  }
});
