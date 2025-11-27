import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  if (url.searchParams.get("shop")) {
    // If there's a shop param, trigger login flow
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  
  return redirect("/app");
};

