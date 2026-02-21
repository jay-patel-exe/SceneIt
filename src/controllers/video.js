import { User } from "../models/user.js";
import { Like } from "../models/likes.js";
import { Video } from "../models/video.js";
import { Comment } from "../models/comments.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uplodadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const filter = { isPublished: true };

    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }

    if (userId) filter.owner = userId;

    let sortOptions = { createdAt: -1 };
    if (sortBy && sortType) {
        sortOptions = { [sortBy]: sortType === "asc" ? 1 : -1 };
    }

    const videos = await Video.find(filter)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("owner", "username avatar");

    const totalVideos = await Video.countDocuments(filter);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                videos,
                totalVideos,
                currentPage: Number(page),
                totalPages: Math.ceil(totalVideos / limit),
            },
            "Videos fetched successfully"
        )
    );
});

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thumbnailFileLocalPath = req.files?.thumbnailFile[0].path;

    if (!title || !description || !videoFileLocalPath || !thumbnailFileLocalPath) {
        throw new ApiError(400, "Provide all fields");
    }

    const videoFile = await uplodadOnCloudinary(videoFileLocalPath);
    const thumbnailFile = await uplodadOnCloudinary(thumbnailFileLocalPath);

    let video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: videoFile.url,
        thumbnailFile: thumbnailFile?.url,
        owner: req.user?._id,
        isPublished: true,
    });

    video = await video.populate("owner", "username");

    return res
        .status(200)
        .json(new ApiResponse(200, video, "File uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    const video = await Video.findById(videoId).populate("owner", "username avatar");
    if (!video) throw new ApiError(400, "Video is not found");

    const likes = await Like.find({ video: videoId }).populate("likedBy", "username avatar");
    const totalLikes = likes.length;

    const comments = await Comment.find({ video: videoId })
        .populate("owner", "username avatar")
        .sort({ createdAt: -1 });

    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    await User.findByIdAndUpdate(userId, { $addToSet: { watchHistory: videoId } });

    return res.status(200).json(
        new ApiResponse(200, {
            ...video,
            totalLikes,
            comments,
        }, "Video details fetched successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);

    if (!video) throw new ApiError(404, "Video not found");
    if (video.owner.toString() !== req.user?._id.toString())
        throw new ApiError(403, "You are not allowed to delete this video");

    await Video.findByIdAndDelete(video._id);
    await deleteOnCloudinary(video.videoFile.public_id);
    await deleteOnCloudinary(video.thumbnailFile.public_id, "video");

    await Like.deleteMany({ video: videoId });
    await Comment.deleteMany({ video: videoId });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");
    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You can't toggle publish status as you are not the owner");
    }

    await Video.findByIdAndUpdate(
        videoId,
        { $set: { isPublished: !video.isPublished } },
        { returnDocument: "after" }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            { isPublished: !video.isPublished },
            "Video publish toggled successfully"
        )
    );
});

export { getAllVideos, publishVideo, getVideoById, deleteVideo, togglePublishStatus };