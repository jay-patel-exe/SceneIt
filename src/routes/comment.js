import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.js";
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.js";

const router = Router()

router.route("/video/:videoId").get(verifyJwt,getVideoComments)
router.route("/:videoId/add").post(verifyJwt, addComment)
router.route("/:commentId/update").post(verifyJwt, updateComment)
router.route("/:commentId/delete").post(verifyJwt, deleteComment)


export default router