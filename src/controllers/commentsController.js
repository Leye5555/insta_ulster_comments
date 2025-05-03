// controllers/comments.js

const Comment = require("../models/comment.js"); // Your Mongoose Comment model
const { v4: uuidv4 } = require("uuid");
const { default: axios } = require("axios");

const API_URL = process.env.API_URL_USER || "http://localhost:8000";

// Helper to fetch user data
const getUser = async ({ id, token }) => {
  if (!token) throw new Error("No token");
  const user = await axios.get(`${API_URL}/v1/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return user.data;
};

// Get all comments for a post
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId, commentID: null }).sort({
      createdAt: -1,
    });
    // Populate user info for each comment
    const mappedComments = await Promise.all(
      comments.map(async (comment) => {
        const user = await getUser({ id: comment.userId, token: req.token });
        // Populate replies recursively
        const replies = await getReplies(comment._id, req.token);
        return { ...comment.toJSON(), user, replies };
      })
    );
    res.status(200).json({ comments: mappedComments });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Helper to get replies recursively
const getReplies = async (parentCommentId, token) => {
  const replies = await Comment.find({ commentID: parentCommentId }).sort({
    createdAt: 1,
  });
  return Promise.all(
    replies.map(async (reply) => {
      const user = await getUser({ id: reply.userId, token });
      const nestedReplies = await getReplies(reply._id, token);
      return { ...reply.toJSON(), user, replies: nestedReplies };
    })
  );
};

// Create a new comment
exports.createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, commentID } = req.body; // commentID is parent comment for replies
    if (!text) return res.status(400).json({ error: "Text is required" });

    const user = await getUser({ id: req.user.userId, token: req.token });

    const comment = new Comment({
      userId: req.user.userId,
      postId,
      username: user.username,
      avatarUrl: user.avatarUrl,
      userProfile: user.profileUrl,
      text,
      replies: [],
      commentID: commentID || null,
      createdAt: new Date().toISOString(),
    });

    await comment.save();
    res.status(201).json({ ...comment.toJSON() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update a comment
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, userId: req.user.userId },
      { text },
      { new: true }
    );
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    res.status(200).json({ ...comment.toJSON() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a comment (and its replies)
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      userId: req.user.userId,
    });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    // Optionally, delete all nested replies
    await deleteReplies(commentId);
    res.status(200).json({ ...comment.toJSON() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Helper to delete replies recursively
const deleteReplies = async (parentCommentId) => {
  const replies = await Comment.find({ commentID: parentCommentId });
  for (const reply of replies) {
    await deleteReplies(reply._id);
    await reply.remove();
  }
};
