import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { isGoogleAuthEnabled } from "@/lib/google-oauth";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm googleEnabled={isGoogleAuthEnabled()} />
    </Suspense>
  );
}
