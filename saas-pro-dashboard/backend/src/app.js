import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import kpiRoutes from "./routes/kpi.routes.js";
import chartsRoutes from "./routes/charts.routes.js";
import forecastRoutes from "./routes/forecast.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import alertsRoutes from "./routes/alerts.routes.js";
import preferencesRoutes from "./routes/preferences.routes.js";
import exportRoutes from "./routes/export.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import { config } from "./config.js";
import { errorHandler } from "./errors.js";
import { globalRateLimit } from "./middleware/rate-limit.js";
import { auditHttp } from "./middleware/audit.js";

export const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(globalRateLimit);
app.use(auditHttp());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/kpi", kpiRoutes);
app.use("/api/charts", chartsRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/audit", auditRoutes);

app.use(errorHandler);

