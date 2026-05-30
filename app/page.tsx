import { redirect } from "next/navigation";
import { getUser, getUserRole } from "@/utils/auth";

export default async function HomePage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const role = await getUserRole(user.id);

  if (role === "coach") {
    redirect("/dashboard/coach");
  }

  redirect("/dashboard/client");
}
