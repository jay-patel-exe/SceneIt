import { isValidObjectId } from "mongoose"
import { Like } from "../models/like.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video")

    const alreadyLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if (alreadyLiked) {
        await Like.findByIdAndDelete(alreadyLiked._id)
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }))
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }))

})

const toggleCommentLike = asyncHandler(async (req, res) => {

    const { commentId } = req.params

    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment")

    const alreadyLiked = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if (alreadyLiked) {
        await Like.findByIdAndDelete(alreadyLiked._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }))
    }

    await Like.create({
        comment : commentId,
        likedBy : req.user?._id
    })

    return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: true }))

})

const getLikedVideos = asyncHandler(async (req,res) => {
    
    const likedVideos = await Like.find({ likedBy : req.user?._id})
        .populate({
            path : "video",
            populate : {path : "owner", select : "username avatar"}
        })

    const likedVideosFiltered = likedVideos.filter(like => like.video);
    
    const response = likedVideosFiltered.map(like => ({
        _id: like.video._id,
        title: like.video.title,
        description: like.video.description,
        thumbnailFile: like.video.thumbnailFile,
        videoFile: like.video.videoFile,
        views: like.video.views,
        duration: like.video.duration,
        isPublished: like.video.isPublished,
        createdAt: like.video.createdAt,
        owner: {
            _id: like.video.owner._id,
            username: like.video.owner.username,
            avatar: like.video.owner.avatar
        }
    }));

    return res
        .status(200)
        .json(new ApiResponse(200, response, "All liked videos are fetched"))

})

export { toggleVideoLike, toggleCommentLike, getLikedVideos }