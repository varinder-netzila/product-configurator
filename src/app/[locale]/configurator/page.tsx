// app/[locale]/configurator/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ConfiguratorClient from "./configurator-client";

export default async function ConfiguratorPage() {
  const cookieStore = await cookies();
  const loggedOut = cookieStore.get("mc_logged_out")?.value === "1";
  const session = cookieStore.get("mc_session")?.value;

  if (loggedOut || !session) {
    redirect("https://www.marvins.eu/account/login?return_url=/apps/sso-pro?locale=nl");
  }

  return <ConfiguratorClient />;
}