import { Router } from "express";
import {getAllVideos, publishVideo, getVideoById, deleteVideo, togglePublishStatus} from "../controllers/video.js"
import { upload } from "../middlewares/multer.js"
import { verifyJwt } from "../middlewares/auth.js";

const router = Router()

router.route("/").get(getAllVideos)
router.route("/publish").post(verifyJwt,upload.fields([
    {
        name : "videoFile",
        maxCount : 1
    },
    {
        name : "thumbnailFile",
        maxCount : 1
    }
]), publishVideo)
router.route("/:videoId").get(verifyJwt, getVideoById)
router.route("/delete/:videoId").post(verifyJwt, deleteVideo)
router.route("/toggle/:videoId").post(verifyJwt, togglePublishStatus)



export default router