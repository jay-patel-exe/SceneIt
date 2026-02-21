import { Router } from "express";
import { createPlaylist, updatePlaylist, deletePlaylist, addVideoToPlaylist, removeVideoFromPlaylist, getUserPlaylists, getPlaylistById } from "../controllers/playlist.js";
import { verifyJwt } from "../middlewares/auth.js"

const router = Router()

router.route("/create").post(verifyJwt, createPlaylist)
router.route("/update/:playlistId").post(verifyJwt, updatePlaylist)
router.route("/delete/:playlistId").post(verifyJwt, deletePlaylist)
router.route("/add/:playlistId/:videoId").post(verifyJwt, addVideoToPlaylist)
router.route("/delete/:playlistId/:videoId").post(verifyJwt, removeVideoFromPlaylist)
router.route("/get/:userId").get(verifyJwt, getUserPlaylists)
router.route("/get/p/:playlistId").get(verifyJwt, getPlaylistById)

export default router