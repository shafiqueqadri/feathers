import Debug from 'debug';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { Application as FeathersApplication, Service } from '@feathersjs/feathers';
import { routing } from '@feathersjs/transport-commons';

const debug = Debug('@feathersjs/koa');

export type Application<T = any> = Koa & FeathersApplication<T>;
export type FeathersKoaContext<T = any> = Koa.Context & {
  app: Application<T>;
};

export { rest } from './rest';
export { Koa, bodyParser };

export function koa (feathersApp: FeathersApplication): Application<any> {
  const app = new Koa();

  if (!feathersApp) {
    return app as Application<any>;
  }

  if (typeof feathersApp.setup !== 'function') {
    throw new Error('@feathersjs/koa requires a valid Feathers application instance');
  }

  const { listen: koaListen, use: koaUse } = app;

  Object.assign(app, {
    use (location: string|Koa.Middleware, service: Service<any>) {
      if (typeof location === 'string') {
        return feathersApp.use(location, service);
      }

      return koaUse.call(this, location);
    },

    listen (port?: number, ...args: any[]) {
      const server = koaListen.call(this, port, ...args);

      this.setup(server);
      debug('Feathers application listening');

      return server;
    }
  } as Application);

  // Copy all non-existing properties (including non-enumerables)
  // that don't already exist on the Koa app
  Object.getOwnPropertyNames(feathersApp).forEach(prop => {
    const feathersProp = Object.getOwnPropertyDescriptor(feathersApp, prop);
    const koaProp = Object.getOwnPropertyDescriptor(app, prop);

    if (koaProp === undefined && feathersProp !== undefined) {
      Object.defineProperty(app, prop, feathersProp);
    }
  });

  const feathersKoa = app as Application;

  feathersKoa.configure(routing());
  feathersKoa.use((ctx, next) => {
    ctx.feathers = { provider: 'rest' };

    return next();
  });

  return feathersKoa;
}