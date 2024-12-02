import { Hono } from "hono";
import { userRouter } from "./routes/user.routes";
import { blogRouter } from "./routes/blog.routes";
import { cors } from "hono/cors";
import { followRouter } from "./routes/follow.route";
const app = new Hono<{
  Bindings: {
    FRONTEND_URL: string;
  };
}>();

app.use(
  "/api/*",
  cors({
    origin: [
      "https://ddef-2405-201-a808-581a-c932-5f70-ca75-45db.ngrok-free.app",
      "http://localhost:3000",
      "https://medium-frontend-psi.vercel.app",
    ],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "Set-Cookie"],
  })
);
app.route("/api/v1/blog", blogRouter);
app.route("/api/v1/user", userRouter);
app.route("/api/v1/follow", followRouter);

export default app;
