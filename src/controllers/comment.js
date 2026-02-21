import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.js";
import { Like } from "../models/like.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video");

    const { page = 1, limit = 10 } = req.query;

    const comments = await Comment.find({ video: videoId })
        .populate("owner", "username avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const commentsWithLikes = await Promise.all(
        comments.map(async (comment) => {
            const totalLikes = await Like.countDocuments({ comment: comment._id });
            const isLiked = await Like.exists({ comment: comment._id, likedBy: req.user._id });

            return {
                _id: comment._id,
                text: comment.content,
                createdAt: comment.createdAt,
                owner: comment.owner,
                totalLikes,
                isLiked: !!isLiked,
            };
        })
    );

    return res
        .status(200)
        .json(new ApiResponse(200, commentsWithLikes, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video")

    const { content } = req.body
    if (!content) throw new ApiError(404, "Content is required")

    const video = await Video.findById(videoId)

    const comment = await Comment.create({
        content,
        owner: req.user?._id,
        video: videoId
    })

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment is created"))

})

const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params
    const { content } = req.body

    if (!commentId) throw new ApiError(400, "Invalid comment")
    if (!content) throw new ApiError(404, "Field is empty")

    const comment = await Comment.findById(commentId)

    if (comment?.owner.toString() !== req.user?._id.toString()) throw new ApiError(400, "only comment owner can edit their comment")

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        { returnDocument: "after" }
    )

    if (!updatedComment) throw new ApiError(500, "Failed to edit comment please try again");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedComment, "Comment edited successfully"));
})

const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment");

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    if (comment.owner.toString() !== req.user._id.toString()) throw new ApiError(403, "Only comment owner can delete this comment");

    await Comment.findByIdAndDelete(commentId);
    await Like.deleteMany({ comment: commentId });

    return res
        .status(200)
        .json(new ApiResponse(200, { commentId }, "Comment deleted successfully"))
});

export { getVideoComments, addComment, updateComment, deleteComment };