import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
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
followRouter.post("/follow", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const body = await c.req.json();
    const { followingId } = body;
    const followerId = c.get("userId");
    const existingFollow = await prisma.follower.findFirst({
      where: { followerId, followingId },
    });
    if (existingFollow) {
      await prisma.follower.delete({
        where: { id: existingFollow.id },
      });
      return c.json({ message: "Unfollowed successfully" });
    }
    await prisma.follower.create({
      data: { followerId, followingId },
    });
    return c.json({ message: "Followed successfully" });
  } catch (error) {
    c.status(411);
    return c.json({
      message: "something went wrong while getting hte blog post",
    });
  }
});
followRouter.get("/followers/details", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const userId = c.get("userId");
    const [followerCount, followingCount, postCount] = await Promise.all([
      prisma.follower.count({
        where: { followingId: userId },
      }),

      prisma.follower.count({
        where: { followerId: userId },
      }),
      prisma.post.count({
        where: { authorId: userId },
      }),
    ]);
    return c.json({
      followerCount,
      followingCount,
      postCount,
    });
  } catch (error) {
    c.status(411);
    return c.json({
      message: "something went wrong while getting hte blog post",
    });
  }
});
