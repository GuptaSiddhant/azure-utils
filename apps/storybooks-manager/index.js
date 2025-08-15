import { registerStorybooksRouter } from "@azure-utils/storybooks";

const addRoute = registerStorybooksRouter({});

addRoute("auth", {
  handler: async (request) => {
    const principalHeader = request.headers.get("x-ms-client-principal");
    if (!principalHeader) {
      return {
        body: `Unauthorized access. Please provide a valid principal header.`,
        status: 401,
      };
    }

    // Decode and parse the claims
    const decoded = Buffer.from(principalHeader, "base64").toString("utf8");
    /**
     * @type {{
     * claims: { typ: string, val: string }[],
     * auth_typ: string,
     * name_typ: string,
     * role_typ: string,
     * }}
     */
    const clientPrincipal = JSON.parse(decoded);
    const claims = clientPrincipal?.claims || [];

    const azpToken = claims.find((c) => c.typ === "azp")?.val;
    if (azpToken) {
      return {
        status: 200,
        jsonBody: { type: "application", clientId: azpToken },
      };
    }

    const name = claims.find((c) => c.typ === "name")?.val;
    const email = claims.find((c) => c.typ === clientPrincipal.name_typ)?.val;
    const roles = claims
      .filter((c) => c.typ === clientPrincipal.role_typ || c.typ === "roles") // role_typ tells the claim type for roles
      .map((c) => c.val);

    return { status: 200, jsonBody: { type: "user", name, email, roles } };
  },
});
