import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";

import { registerTikTokTools } from "./tools.js";

function createServer(env) {
  const server = new McpServer({
    name: "tiktok-mcp",
    version: "1.0.0"
  });

  registerTikTokTools(server, env);

  return server;
}

export default {
  async fetch(request, env, ctx) {

    // Protect the endpoint with a bearer secret.
    // Replace with proper OAuth before public production use.
    const auth = request.headers.get("Authorization");

    if (
      !env.MCP_ACCESS_KEY ||
      auth !== `Bearer ${env.MCP_ACCESS_KEY}`
    ) {
      return new Response("Unauthorized", {
        status: 401
      });
    }

    const handler = createMcpHandler(
      () => createServer(env)
    );

    return handler(request, env, ctx);
  }
};
