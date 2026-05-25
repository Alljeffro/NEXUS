import axios from "axios";

const GRAPH = "https://graph.facebook.com/v19.0";

export async function getPageToken(pageId, userToken) {
  const res = await axios.get(`${GRAPH}/me/accounts`, {
    params: { access_token: userToken },
  });
  const page = (res.data.data ?? []).find((p) => p.id === pageId);
  return page?.access_token ?? null;
}

export async function publishPost(pageId, pageToken, message) {
  const res = await axios.post(`${GRAPH}/${pageId}/feed`, {
    message,
    access_token: pageToken,
  });
  return res.data.id; // "pageId_postId"
}

export async function getRecentComments(postId, pageToken, since) {
  const res = await axios.get(`${GRAPH}/${postId}/comments`, {
    params: {
      access_token: pageToken,
      fields: "id,message,from,created_time",
      since,
      limit: 50,
    },
  });
  return res.data.data ?? [];
}

export async function replyToComment(commentId, pageToken, message) {
  await axios.post(`${GRAPH}/${commentId}/comments`, {
    message,
    access_token: pageToken,
  });
}

export async function deleteComment(commentId, pageToken) {
  await axios.delete(`${GRAPH}/${commentId}`, {
    params: { access_token: pageToken },
  });
}

export async function getRecentPagePosts(pageId, pageToken, limit = 10) {
  const res = await axios.get(`${GRAPH}/${pageId}/feed`, {
    params: {
      access_token: pageToken,
      fields: "id,message,created_time",
      limit,
    },
  });
  return res.data.data ?? [];
}
