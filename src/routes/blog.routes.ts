import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { decode, sign, verify } from "hono/jwt";
import { blogValidationSchema } from "../zod-validations/blog.zod";
import { ZodError } from "zod";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
    RESEND_KEY: string;
  };
  Variables: {
    userId: string;
  };
}>();
blogRouter.use("/*", async (c, next) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const authHeader = c.req.header("Cookie");
    const authToken = authHeader?.split("=")[1];
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
blogRouter.post("/create", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const body = await c.req.json();
    const validatedBody = blogValidationSchema.parse(body);
    const userId = c.get("userId");
    const post = await prisma.post.create({
      data: {
        title: validatedBody.title,
        content: validatedBody.content,
        published: validatedBody.published,
        authorId: userId,
      },
    });
    if (post) {
      return c.json({ message: "Blog created Successfully" });
    } else {
      c.status(401);
      return c.json({
        message: "Sorry something went wrong while creating the blog",
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      c.status(400);
      return c.json({
        error: error.errors[0]?.message || "Invalid input",
      });
    } else {
      c.status(500);
      return c.json({
        message: "Sorry something went wrong while creating the blog",
      });
    }
  }
});
blogRouter.put("/update/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blogId = c.req.param("id");
  const body = await c.req.json();
  const updatedBolg = await prisma.post.update({
    where: {
      id: blogId,
    },
    data: body,
  });
  return c.json({ data: updatedBolg });
});
blogRouter.get("/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const blogId = c.req.param("id");
    const foundBlog = await prisma.post.findUnique({
      where: {
        id: blogId,
      },
      select: {
        title: true,
        createdAt: true,
        content: true,
        id: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });
    return c.json(foundBlog);
  } catch (error) {
    c.status(411);
    return c.json({
      message: "something went wrong while getting hte blog post",
    });
  }
});
blogRouter.get("/get/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c?.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const foundBlogs = await prisma.post.findMany({
      select: {
        createdAt: true,
        content: true,
        title: true,
        id: true,
        author: {
          select: {
            name: true,
          },
        },
      },
    });

    return c.json({ data: foundBlogs });
  } catch (error) {
    c.status(411);
    return c.json({
      message: "something went wrong while getting hte blog post",
    });
  }
});
