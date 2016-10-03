import * as fs from "fs";
import * as path from "path";
import * as gaze from "gaze";
import * as sift from "sift";
import * as cors from "cors";
import { Logger } from "@tandem/common/logger";
import * as express from "express";
import { IOService } from "@tandem/common/services";
import * as compression from "compression";
import { IApplication } from "@tandem/common/application";
import { DSUpsertAction, LoadAction, ReadFileAction } from "@tandem/common/actions";
import { loggable, inject } from "@tandem/common/decorators";
import * as createSocketIOServer from "socket.io";
import { BaseApplicationService } from "@tandem/common/services";
import { sync as getPackagePath } from "package-path";
import { DEPENDENCIES_NS, Dependencies } from "@tandem/common/dependencies";
import { ApplicationServiceDependency } from "@tandem/common/dependencies";

import { Response } from "mesh";

@loggable()
export default class FrontEndService extends BaseApplicationService<IApplication> {

  private _server: express.Express;
  private _ioService:IOService<IApplication>;
  private _port:number;
  private _socket:any;
  public config:any;
  public logger:Logger;
  private _bundles:Array<any>;

  @inject(DEPENDENCIES_NS)
  readonly dependencies: Dependencies;

  didInject() {
    this.app.bus.register(this._ioService = IOService.create<IApplication>(this.dependencies));
    this._port = this.app.config.port;
  }

  async [LoadAction.LOAD]() {
    await this._loadHttpServer();
    await this._loadStaticRoutes();
    await this._loadSocketServer();
  }

  async _loadHttpServer() {
    this.logger.info(`listening on port ${this._port}`);
    this._server = express();
    this._socket = this._server.listen(this._port);
  }

  async _loadStaticRoutes() {

    this._server.use(cors());
    this._server.use(compression());

    this._server.get("/asset/:uri", async (req, res, next) => {

      const uri = decodeURIComponent(req.params.uri);
      const { content } = await ReadFileAction.execute(uri, this.bus);


      // need to sandbox this in project directory
      res.send(content);
    });

    var entryPath = this.app.config.frontEndEntry;
    console.log(entryPath);

    var scriptName = path.basename(entryPath);

    // this should be part of the config
    const entryDirectory = path.dirname(entryPath);
    this._server.use(express.static(entryDirectory));

    if (this.app.config.publicDirectory) {
      this._server.use(express.static(this.app.config.publicDirectory));
    }

    const staticFileNames = fs.readdirSync(entryDirectory);

    this._server.use((req, res) => {
      res.send(this.getIndexHtmlContent(staticFileNames));
    });
  }

  getIndexHtmlContent(staticFileNames) {
    const host = `http://localhost:${this._port}`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body {
              width: 100%;
              height: 100%;
            }
          </style>
          <script type="text/javascript">
            var config = {
              backend: {
                port: ${this._port}
              }
            };
          </script>
        </head>
        <body>
          <div id="app"></div>
          ${
            staticFileNames.sort((a, b) => /css$/.test(a) ? -1 : 1).map((basename) => {
              if (/css$/.test(basename)) {
                return `<link rel="stylesheet" type="text/css" href="${basename}">`;
              } else if (/js$/.test(basename)) {
                return `<script src="${basename}"></script>`;
              }
            }).filter((str) => !!str).join("\n")
          }
        </body>
      </html>
    `;
  }

  async _loadSocketServer() {
    const io = createSocketIOServer() as any;
    io.set("origins", "*domain.com*:*");
    io.on("connection", this._ioService.addConnection);
    io.listen(this._socket);
  }
}

export const frontEndServiceDependency = new ApplicationServiceDependency("front-end", FrontEndService);
