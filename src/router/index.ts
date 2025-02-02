import { Express, Router } from 'express';
import { readdirSync } from 'fs';
import { join } from 'path';
import { resolveAlias } from '@/utils/resolveAlias';


class ApplicationRouter {
    private static instance: ApplicationRouter;
    private app: Express | null = null;

    private constructor() {}

    public static getInstance(): ApplicationRouter {
        if (!ApplicationRouter.instance) {
            ApplicationRouter.instance = new ApplicationRouter();
        }
        return ApplicationRouter.instance;
    }

    public async init(app: Express): Promise<void> {
        this.app = app;

        const domainsPath = join(__dirname, '../domains');        
        const domains = readdirSync(domainsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const domain of domains) {
            try {
                const resolvedPath = resolveAlias(`@/domains/${domain}/routes`);
                const routes = await import(resolvedPath);
                if (routes && routes.default) {
                    this.app.use(`/api/v2/${domain}`, routes.default);
                } else {
                    console.warn(`No routes exported for domain: ${domain}`);
                }
            } catch (error) {
                console.error(`Could not load routes for domain: ${domain}`, error);
            }
        }
    }

    public register(path: string, router: Router): void {
        if (!this.app) {
            throw new Error('ApplicationRouter must be initialized with an Express app first');
        }
        this.app.use(`/${path}`, router);
    }
}

export default ApplicationRouter.getInstance();