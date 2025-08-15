// @ts-check
import { registerStorybooksRouter } from "@azure-utils/storybooks";

const SECRET = process.env["SECRET"];

registerStorybooksRouter({
  checkPermissions: async (permissions, _context, request) => {
    if (!SECRET) {
      return true;
    }

    const authSecret = request.headers.get("Authorization");
    const isValidSecret = authSecret === SECRET;

    const actions = permissions.map((p) => p.action);
    if (actions.includes("create") || actions.includes("delete")) {
      return isValidSecret;
    }

    return true;
  },
});
