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
      "https://e778-2405-201-a808-581a-398f-6d72-9053-9602.ngrok-free.app",
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
