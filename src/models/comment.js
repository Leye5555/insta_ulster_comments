// models/comments.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommentsSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    postId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      required: false,
      default: "",
    },
    userProfile: {
      type: String,
      required: false,
      default: "",
    },
    text: {
      type: String,
      required: true,
    },
    // commentID is the parent comment's _id for replies. Null for top-level comments.
    commentID: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    // Array of reply comment IDs (not populated by default, but handy for some queries)
    replies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Optional: Pre-remove hook to delete nested replies if you want cascade delete
CommentsSchema.pre("remove", async function (next) {
  await this.model("Comment").deleteMany({ commentID: this._id });
  next();
});

module.exports = mongoose.model("Comment", CommentsSchema);
