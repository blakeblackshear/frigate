import axios from "axios";

/**
 * Verifies a user's password without creating a session.
 * This is used for password change verification.
 *
 * @param username - The username to verify
 * @param password - The password to verify
 * @returns true if credentials are valid, false otherwise
 */
export async function verifyPassword(
  username: string,
  password: string,
): Promise<boolean> {
  try {
    const response = await axios.post("auth/verify", {
      user: username,
      password,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}
