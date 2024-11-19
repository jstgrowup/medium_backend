import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { decode, sign, verify } from "hono/jwt";
import { blogValidationSchema } from "../zod-validations/blog.zod";
import { ZodError } from "zod";

export const followRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
    RESEND_KEY: string;
  };
  Variables: {
    userId: string;
  };
}>();
followRouter.use("/*", async (c, next) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const authHeader = c.req.header("authorization");
    const authToken = authHeader?.split(" ")[1];
    const decodedToken = await verify(authToken ?? "", c.env.JWT_SECRET);
    if (!decodedToken) {
      c.status(403);
      return c.json({ message: "Unauthorized user" });
    }
    const userId = String(decodedToken.id);
    const foundUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!foundUser) {
      c.status(401);
      return c.json({ message: "Unauthorized user" });
    }
    c.set("userId", foundUser.id);
    await next();
  } catch (error) {
    c.status(403);
    return c.json({ message: "Unauthorized user" });
  }
});

followRouter.get("/recommendations", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const currentUserId = c.get("userId");
    const followingIds = await prisma.follower.findMany({
      where: {
        followerId: currentUserId,
      },
      select: {
        followingId: true,
      },
    });
    const excludedIds = followingIds.map((f) => f.followingId);
    excludedIds.push(currentUserId);
    const foundRecommendations = await prisma.user.findMany({
      where: {
        id: {
          notIn: excludedIds.length > 0 ? excludedIds : [currentUserId],
        },
      },
      select: {
        id: true,
        name: true,
      },
      take: 10,
    });

    return c.json({ data: foundRecommendations });
  } catch (error) {
    c.status(411);
    return c.json({
      message: "something went wrong while getting hte blog post",
    });
  }
});
