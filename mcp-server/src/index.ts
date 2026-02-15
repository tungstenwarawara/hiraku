import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerUtmTools } from "./tools/utm.js";
import { registerMetricsTools } from "./tools/metrics.js";
import { registerReporterTools } from "./tools/reporter.js";

const server = new McpServer({
  name: "contentpilot",
  version: "0.1.0",
});

// Register all tools
registerUtmTools(server);
registerMetricsTools(server);
registerReporterTools(server);

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
