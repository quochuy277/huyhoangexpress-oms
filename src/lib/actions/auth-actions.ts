"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError, CredentialsSignin } from "next-auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/orders",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Rate-limit surfaces as a CredentialsSignin subclass with code="RateLimit".
      // Separate its message so users know to wait, not to re-type credentials.
      if (
        error instanceof CredentialsSignin &&
        (error as CredentialsSignin & { code?: string }).code === "RateLimit"
      ) {
        return {
          error: "Quá nhiều lần đăng nhập sai. Vui lòng đợi vài phút rồi thử lại.",
        };
      }

      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email hoặc mật khẩu không đúng" };
        default:
          return { error: "Đã xảy ra lỗi. Vui lòng thử lại" };
      }
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
