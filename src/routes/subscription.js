import { Router } from "express";
import {verifyJwt} from "../middlewares/auth.js"
import { getSubscribedChannels, getSubscribers, toggleSubscription } from "../controllers/subscription.js";

const router = Router()

router.route("/toggle/:channelId").post(verifyJwt, toggleSubscription)
router.route("/subscribed-channels/:subscriberId").get(verifyJwt, getSubscribedChannels)
router.route("/get-subscribers/:channelId").get(verifyJwt, getSubscribers)


export default router