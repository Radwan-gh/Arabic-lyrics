import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GOOGLE_SIGNUP_COOKIE, verifyGoogleSignupToken } from "@/lib/jwt";
import { CompleteSignupForm } from "@/components/CompleteSignupForm";

export default async function CompleteSignupPage() {
  const store = await cookies();
  const signup = await verifyGoogleSignupToken(store.get(GOOGLE_SIGNUP_COOKIE)?.value);
  if (!signup) redirect("/login?error=signup_expired");

  return <CompleteSignupForm email={signup.email} />;
}
