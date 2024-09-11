import { Hono } from "hono";
import { userRouter } from "./routes/user.routes";
import { blogRouter } from "./routes/blog.routes";
import { cors } from "hono/cors";
const app = new Hono();
app.use("/api/*", cors());
app.route("/api/v1/blog", blogRouter);
app.route("/api/v1/user", userRouter);

export default app;
