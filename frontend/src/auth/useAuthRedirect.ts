import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { UserProfile } from "../api";

export function useAuthRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return useCallback(
    (profile: UserProfile) => {
      const next = searchParams.get("next");
      if (next) {
        navigate(next);
      } else if (profile.admin) {
        navigate("/admin");
      } else {
        navigate("/practice");
      }
    },
    [navigate, searchParams]
  );
}
