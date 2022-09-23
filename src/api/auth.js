import { AUTH_TOKEN } from "./urls";
import { get, create } from "./http-methods";
import { AUTHENTICATE } from "./urls";
import * as dotenv from "dotenv";
dotenv.config();

export const getAuthToken = async () => {
  return await get(`${AUTH_TOKEN}?api_key=${process.env.API_KEY}`);
};

export const authenticate = async (token) => {
  return await create(`${AUTHENTICATE}?api_key=${process.env.API_KEY}`, {
    request_token: token,
  });
};

export const getSessionId = async () => {
  const requestToken = await getAuthToken();
  if (requestToken?.data?.success) {
    const authenticateUser = await authenticate(
      requestToken.data.request_token
    );
    if (authenticateUser?.data?.success) {
      return {
        success: true,
        sessionId: authenticateUser.data.guest_session_id,
      };
    }
  }
  return {
    success: false,
  };
};
