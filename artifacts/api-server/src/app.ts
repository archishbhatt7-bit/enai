import express, { type Express } from "express";
import cors from "cors";
// @ts-ignore - Vercel TS runner has issues with esModuleInterop for helmet
import helmet from "helmet";
// @ts-ignore - Vercel TS runner has issues with esModuleInterop for pino-http
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { rateLimit } from "./middleware/rateLimit";

const app: Express = express();

app.use(helmet());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const defaultOrigin = process.env.NODE_ENV === "production" ? false : "http://localhost:5173";
app.use(cors({ origin: process.env.FRONTEND_URL || defaultOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — stricter limits on sensitive endpoints
app.use("/api/auth", rateLimit({ windowMs: 60_000, max: 10, message: "Too many auth attempts, please try again later" }));
app.use("/api/admin/login", rateLimit({ windowMs: 60_000, max: 5, message: "Too many login attempts, please try again later" }));
// General rate limit: 100 requests per minute per IP
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

app.use("/api", router);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.log.error(err, "Unhandled error");
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
