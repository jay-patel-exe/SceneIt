import { isValidObjectId } from "mongoose"
import { Subscription } from "../models/subscription.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {

    const { channelId } = req.params
    if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channelId")

    const isSubscribed = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user?._id
    })

    if (isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed?._id)

        return res
            .status(200)
            .json(new ApiResponse(200, { isSubscribed: false }))
    }

    Subscription.create({
        channel: channelId,
        subscriber: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, { isSubscribed: true }))

})

const getSubscribedChannels = asyncHandler(async (req, res) => {

    const {subscriberId} = req.params
    if(!isValidObjectId(subscriberId)) throw new ApiError(400, "No valid id")

    const subscribedChannels = await Subscription.find({subscriber : subscriberId })
    .populate("channel" , "username avatar")

    return res
        .status(200)
        .json(new ApiResponse(200, subscribedChannels, "Fetched subscribed channels successfully"))

})

const getSubscribers = asyncHandler(async (req,res) => {
    
    const {channelId} = req.params
    if(!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channelId")

    const subscribers = await Subscription.find({channel : channelId})
    .populate("subscriber", "username avatar")

    return res
        .status(200)
        .json(new ApiResponse(200, subscribers, "Fetched subscribers successfully"))

})

export { toggleSubscription, getSubscribedChannels, getSubscribers }