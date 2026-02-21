import { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.js"

const createPlaylist = asyncHandler(async (req, res) => {

    const { name, description } = req.body
    if (!name || !description) throw new ApiError(400, "All fields are required")

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if (!playlist) throw new ApiError(500, "Failed to create playlist")

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist is created"))
})

const updatePlaylist = asyncHandler(async (req, res) => {

    const { name, description } = req.body
    const { playlistId } = req.params

    if (!name || !description) throw new ApiError(400, "Provide all fields")
    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Playlist is not valid")

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: { name, description }
        },
        { returnDocument: "after" }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist has been updated successfully"))

})

const deletePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params
    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlist")

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) throw new ApiError(500, "Cant delete playlist")

    if (playlist.owner.toString() !== req.user?._id.toString()) throw new ApiError(400, "only owner can delete the playlist")

    await Playlist.findByIdAndDelete(playlistId)

    return res
        .status(200)
        .json(new ApiResponse(200, "Playlist deleted successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) throw new ApiError(400, "Invalid PlaylistId or videoId")

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if (playlist.owner?.toString() !== req.user?._id.toString())
        throw new ApiError(400, "only owner can add video to thier playlist");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos: videoId }
        },
        { returnDocument: "after" }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video is added to playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) throw new ApiError(400, "Invalid request")

    const playlist = await Playlist.findById(playlistId)
    const video = await Video.findById(videoId)

    if (!playlist || !video) throw new ApiError(500, 'Failed to delete video')

    if (playlist.owner?.toString() !== req.user?._id.toString()) throw new ApiError(404, "only owner can remove video from thier playlist");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId }
        },
        { returnDocument: "after" }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Video is deleted from playlist"))

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid userId");

    const playlists = await Playlist.find({ owner: userId })
        .populate({
            path: "videos",
            select: "thumbnailFile"
        })

    if (playlists.length === 0) throw new ApiError(404, "No playlists found");

    const formattedPlaylists = playlists.map((playlist) => {
        const totalVideos = playlist.videos.length;
        const thumbnail = playlist.videos[0]?.thumbnailFile || null

        return {
            _id: playlist._id,
            name: playlist.name,
            description: playlist.description,
            thumbnail,
            totalVideos,
            updatedAt: playlist.updatedAt,
        };
    });

    return res.status(200).json(
        new ApiResponse(200, formattedPlaylists, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {

    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) throw new ApiError(400, "Invalid playlistId");

    const playlist = await Playlist.findById(playlistId)
        .populate({
            path: "owner",
            select: "username avatar"
        })
        .populate({
            path: "videos",
            select: "videoFile thumbnailFile title duration views owner",
            populate: {
                path: "owner",
                select: "username avatar"
            }
        });

    if (!playlist) throw new ApiError(404, "Playlist not found");

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});


export { createPlaylist, updatePlaylist, deletePlaylist, addVideoToPlaylist, removeVideoFromPlaylist, getUserPlaylists, getPlaylistById }