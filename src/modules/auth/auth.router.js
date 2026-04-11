import { Router } from "express";
import { googleLogin, logout, getMe } from "./auth.controller.js";
import { authenticate }              from "../../middleware/authenticate.js";
import { validate }                  from "../../middleware/validate.js";
import { authLimiter }               from "../../middleware/rateLimiter.js";
import { googleAuthSchema }          from "./auth.schema.js";

const router = Router();

// FIX: authLimiter + validate were imported but not applied — restored
router.post("/google", authLimiter, validate(googleAuthSchema), googleLogin);
router.post("/logout", logout);
router.get("/me",      authenticate, getMe);

export default router;
