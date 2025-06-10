#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from 'express';

import { createToolDefinitions } from "./tools.js";
import { setupRequestHandlers } from "./requestHandler.js";

async function runServer() {
  const server = new Server(
    {
      name: "executeautomation/playwright-mcp-server",
      version: "1.0.5",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // Create tool definitions
  const TOOLS = createToolDefinitions();

  // Setup request handlers
  setupRequestHandlers(server, TOOLS);

  // Graceful shutdown logic
  function shutdown() {
    console.log('Shutdown signal received');
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', shutdown);
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  // Create transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const app = express();
  let sseTransport: SSEServerTransport | null = null;

  // const proxy = new Server(
  //   {
  //     name: "executeautomation/playwright-mcp-server",
  //     version: "1.0.5",
  //   },
  //   {
  //     capabilities: {
  //       resources: {},
  //       tools: {},
  //     },
  //   }
  // );
  // setupRequestHandlers(proxy, TOOLS);
  // Object.assign(proxy, ['_onrequest', '_onnotification', '_onresponse', '_onerror'].reduce((acc, cb) => {
  //   acc[cb] = server[cb].bind(server);
  //   return acc;
  // }, {}));
  app.get("/sse", (req, res) => {
    sseTransport = new SSEServerTransport("/messages", res);
    // proxy.connect(sseTransport);
    server.connect(sseTransport);
  });
  
  app.post("/messages", (req, res) => {
    if (sseTransport) {
      sseTransport.handlePostMessage(req, res);
    }
  });
  
  app.listen(5131);
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});