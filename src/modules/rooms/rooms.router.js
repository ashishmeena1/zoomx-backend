import { Router } from "express";
import { listRooms, createRoomHandler, getRoomHandler, closeRoomHandler } from "./rooms.controller.js";
import { authenticate }                                                    from "../../middleware/authenticate.js";
import { validate, validateParams }                                        from "../../middleware/validate.js";
import { createRoomLimiter }                                               from "../../middleware/rateLimiter.js";
import { createRoomSchema, roomCodeSchema }                                from "./rooms.schema.js";

const router = Router();

router.use(authenticate);
    
router.get("/",      listRooms);
router.post("/",     createRoomLimiter, validate(createRoomSchema), createRoomHandler);
router.get("/:code", validateParams(roomCodeSchema), getRoomHandler);
router.delete("/:code", validateParams(roomCodeSchema), closeRoomHandler);

export default router;
