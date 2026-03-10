import type {
  DeepLinkRoute,
  DeepLinkHandler,
  Unsubscribe,
} from '../types/mobile.types.js';

const APP_SCHEME = 'foodbot';
const APP_HOST = 'app.foodbot.com';

interface RoutePattern {
  pattern: RegExp;
  paramNames: string[];
}

const ROUTE_PATTERNS: RoutePattern[] = [
  {
    pattern: /^\/order\/([^/]+)$/,
    paramNames: ['id'],
  },
  {
    pattern: /^\/restaurant\/([^/]+)$/,
    paramNames: ['id'],
  },
  {
    pattern: /^\/diet-plan\/([^/]+)$/,
    paramNames: ['id'],
  },
  {
    pattern: /^\/party-plan\/([^/]+)$/,
    paramNames: ['id'],
  },
];

export class DeepLinkService {
  private readonly handlers: Set<DeepLinkHandler> = new Set();

  onDeepLink(handler: DeepLinkHandler): Unsubscribe {
    this.handlers.add(handler);
    return (): void => {
      this.handlers.delete(handler);
    };
  }

  parseDeepLink(url: string): DeepLinkRoute {
    const path = this.extractPath(url);

    for (const route of ROUTE_PATTERNS) {
      const match = path.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        for (let i = 0; i < route.paramNames.length; i++) {
          const paramName = route.paramNames[i];
          const paramValue = match[i + 1];
          if (paramName !== undefined && paramValue !== undefined) {
            params[paramName] = paramValue;
          }
        }
        return { path, params };
      }
    }

    return { path, params: {} };
  }

  buildDeepLink(
    route: string,
    params: Record<string, string>
  ): string {
    let resolvedPath = route;
    for (const [key, value] of Object.entries(params)) {
      resolvedPath = resolvedPath.replace(`:${key}`, value);
    }

    return `${APP_SCHEME}://${APP_HOST}${resolvedPath}`;
  }

  simulateDeepLink(url: string): void {
    const route = this.parseDeepLink(url);
    for (const handler of this.handlers) {
      handler(route);
    }
  }

  getHandlerCount(): number {
    return this.handlers.size;
  }

  private extractPath(url: string): string {
    if (url.startsWith(`${APP_SCHEME}://`)) {
      const withoutScheme = url.slice(`${APP_SCHEME}://`.length);
      const hostEnd = withoutScheme.indexOf('/');
      if (hostEnd === -1) {
        return '/';
      }
      return withoutScheme.slice(hostEnd);
    }

    if (url.startsWith('https://') || url.startsWith('http://')) {
      const withoutScheme = url.replace(/^https?:\/\//, '');
      const hostEnd = withoutScheme.indexOf('/');
      if (hostEnd === -1) {
        return '/';
      }
      return withoutScheme.slice(hostEnd);
    }

    if (url.startsWith('/')) {
      return url;
    }

    return `/${url}`;
  }
}
