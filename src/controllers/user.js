import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { User } from '../models/user.js'
import { Subscription } from '../models/subscription.js'
import { uplodadOnCloudinary } from '../utils/cloudinary.js'
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const existinguser = await User.findById(userId)
        const accessToken = existinguser.generateAccessToken()
        const refreshToken = existinguser.generateRefreshToken()

        existinguser.refreshToken = refreshToken
        await existinguser.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, 'Something went wrong at refresh and access token')
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { fullname, username, email, password } = req.body
    console.log(email, password, username, fullname)

    if (!fullname || !username || !email || !password) throw new ApiError(400, "All fields are required")

    const existedUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existedUser) throw new ApiError(409, "User already exists")

    const avatarLocalPath = req.files?.avatar[0]?.path
    if (!avatarLocalPath) throw new ApiError(400, "Please upload avatar")

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) coverImageLocalPath = req.files.coverImage[0].path

    const avatar = await uplodadOnCloudinary(avatarLocalPath)
    const coverImage = await uplodadOnCloudinary(coverImageLocalPath)

    //console.log(avatar, coverImage)

    if (!avatar) throw new ApiError(400, "Please upload avatar")

    const user = await User.create({
        fullname,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) throw new ApiError(500, "Something went wrong while registering a user")

    return res.status(201).json(new ApiResponse(200, createdUser, "User registed succesfully"))

})

const loginUser = asyncHandler(async (req, res) => {

    const { email, username, password } = req.body
    if (!username && !email) throw new ApiError(400, "Please provide username or email")

    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (!existingUser) throw new ApiError(404, "User does not exist")

    const isPasswordValid = await existingUser.isPasswordCorrect(password)
    if (!isPasswordValid) throw new ApiError(401, "Wrong password")

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(existingUser._id)

    const loggedInUser = await User.findById(existingUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
        )

})

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {

    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request")

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
        if (!user) throw new ApiError(401, "Invalid refresh token")

        if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh Token is expired or used")

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) throw new ApiError(400, "Password is invalid")

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "User fetched successfully"))
})

// const getUserChannelProfile = asyncHandler(async (req, res) => {

//     const { username } = req.params
//     if (!username?.trim()) {
//         throw new ApiError(400, "Username is missing")
//     }

//     const channel = await User.aggregate([
//         {
//             $match: {
//                 username: username.toLowerCase()

//             }
//         },
//         {
//             $lookup: {
//                 from: "subscriptions",
//                 localField: "_id",
//                 foreignField: "channel",
//                 as: "subscribers"
//             }
//         },
//         {
//             $lookup: {
//                 from: "subscriptions",
//                 localField: "_id",
//                 foreignField: "subscriber",
//                 as: "subscribedTo"
//             }
//         },
//         {
//             $addFields: {
//                 subscribersCount: { $size: "$subscribers" },
//                 subscribedToCount: { $size: "$subscribedTo" },
//                 isSubscribed: {
//                     $cond: {
//                         if: {
//                             $in: [
//                                 new mongoose.Types.ObjectId(req.user?._id),
//                                 "$subscribers.subscriber"
//                             ]
//                         },
//                         then: true,
//                         else: false
//                     }
//                 }
//             }
//         },
//         {
//             $project: {
//                 fullname: 1,
//                 username: 1,
//                 subscribersCount: 1,
//                 subscribedToCount: 1,
//                 isSubscribed: 1,
//                 avatar: 1,
//                 coverImage: 1,
//                 email: 1
//             }
//         }
//     ])

//     console.log(username)

//     if (!channel?.length) {
//         throw new ApiError(404, "Channel does not exist")
//     }

//     return res.status(200).json(
//         new ApiResponse(200, channel[0], "User channel fetched successfully")
//     )
// })


// const getWatchHistory = asyncHandler(async (req, res) => {
//     const user = await User.aggregate([
//         {
//             $match: {
//                 _id: new mongoose.Types.ObjectId(req.user._id)
//             }
//         },
//         {
//             $lookup: {
//                 from: "videos",
//                 localField: "watchHistory",
//                 foreignField: "_id",
//                 as: "watchHistory",
//                 pipeline: [
//                     {
//                         $lookup: {
//                             from: "users",
//                             localField: "owner",
//                             foreignField: "_id",
//                             as: "owner",
//                             pipeline: [
//                                 {
//                                     $project: {
//                                         fullName: 1,
//                                         username: 1,
//                                         avatar: 1
//                                     }
//                                 }
//                             ]
//                         }
//                     },
//                     {
//                         $addFields: {
//                             owner: {
//                                 $first: "$owner"
//                             }
//                         }
//                     }
//                 ]
//             }
//         }
//     ])

//     return res
//         .status(200)
//         .json(
//             new ApiResponse(
//                 200,
//                 user[0].watchHistory,
//                 "Watch history fetched successfully"
//             )
//         )
// })

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params;

    if (!username?.trim()) throw new ApiError(400, "Username is missing");

    const channel = await User.findOne({
        username: username.toLowerCase()
    }).select("-password -refreshToken");

    if (!channel) throw new ApiError(404, "Channel does not exist");

    const subscribersCount = await Subscription.countDocuments({
        channel: channel._id
    });

    const subscribedToCount = await Subscription.countDocuments({
        subscriber: channel._id
    });

    let isSubscribed = false;

    if (req.user?._id) {
        const subscriptionExists = await Subscription.exists({
            channel: channel._id,
            subscriber: req.user._id
        });

        isSubscribed = !!subscriptionExists;
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                ...channel.toObject(),
                subscribersCount,
                subscribedToCount,
                isSubscribed
            },
            "User channel fetched successfully"
        )
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.findById(req.user._id)
        .populate({
            path: "watchHistory",
            populate: {
                path: "owner",
                select: "username avatar"
            }
        })
        .select("watchHistory")

    if (!user) throw new ApiError(404, "User not found")

    return res.status(200).json(
        new ApiResponse(
            200,
            user.watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory }

