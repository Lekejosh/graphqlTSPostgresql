import { ApolloServer } from "apollo-server-express";
import express from "express";
import { schema } from "./schema";
import typeomConfig from "./typeorm.config";
import { Context } from "./types/Context";
import { auth } from "./middlewares/auth";
import cookieParser from "cookie-parser";
import helmet from "helmet";

const boot = async (): Promise<void> => {
  const conn = await typeomConfig.initialize();

  const app = express();
  app.use(cookieParser());
  app.use(helmet());

  const server = new ApolloServer({
    schema,
    context: ({ req, res }): Context => {
      const token = req?.headers?.authorization
        ? auth(req.headers.authorization)
        : null;
      return { conn, userId: token?.userId, res, req };
    },
  });

  await server.start();

  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀::> Listening on port ${PORT}`);
  });
};

boot();
