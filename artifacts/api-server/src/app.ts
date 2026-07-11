import express, { type Express } from "express";
import cors from "cors";
import helmetImport from "helmet";
import pinoHttpImport from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { rateLimit } from "./middleware/rateLimit";

// Vercel's strict TS runner treats these as namespaces rather than callable functions 
// because it overrides or ignores our esModuleInterop flags. 
// We cast them here to ensure the build never fails on these call signatures again.
const helmet = helmetImport as any;
const pinoHttp = pinoHttpImport as any;

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

app.use(cors({ 
  origin: (origin, callback) => callback(null, origin || true), 
  credentials: true 
}));
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
