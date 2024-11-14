import { Hono } from "hono";
import { userRouter } from "./routes/user.routes";
import { blogRouter } from "./routes/blog.routes";
import { cors } from "hono/cors";
const app = new Hono<{
  Bindings: {
    FRONTEND_URL: string;
  };
}>();

app.use(
  "/api/*",
  cors({
    origin: [
      "https://969d-2405-201-a808-581a-b516-afda-acb2-8b6b.ngrok-free.app",
      "http://localhost:3000",
      "https://medium-frontend-psi.vercel.app",
    ],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "Set-Cookie"],
  })
);
app.route("/api/v1/blog", blogRouter);
app.route("/api/v1/user", userRouter);

export default app;
