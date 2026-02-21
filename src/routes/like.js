import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.js";
import { getLikedVideos, toggleCommentLike, toggleVideoLike } from "../controllers/like.js";

const router = Router()

router.route("/toggle-video/:videoId").post(verifyJwt, toggleVideoLike)
router.route("/toggle-comment/:commentId").post(verifyJwt, toggleCommentLike)
router.route("/videos").get(verifyJwt, getLikedVideos)


export default router