import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate, login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  // If this is the login path, use login() instead of authenticate()
  if (url.pathname === "/auth/login") {
    return login(request);
  }
  
  await authenticate.admin(request);
  return json({});
};
