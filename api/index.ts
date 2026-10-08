import server from "../dist/server.cjs";

const app = (server as any).default || (server as any).app || server;

export default app;
