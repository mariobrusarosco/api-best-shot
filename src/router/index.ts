import { Express, Router } from 'express';
import { readdirSync } from 'fs';
import { join } from 'path';
import { resolveAlias } from '@/utils/resolveAlias';
import Profiling from '@/services/profiling';

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

        const domainsWithRoutes = [];
        const domainsPath = join(__dirname, '../domains');        
        const domains = readdirSync(domainsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const domain of domains) {
            try {
                const resolvedPath = resolveAlias(`@/domains/${domain}/routes`);
                await import(resolvedPath);
            } catch (error) {
                domainsWithRoutes.push(domain);
            }
        }

        if (domainsWithRoutes.length > 0) {
            Profiling.log({msg: `Could not load routes for domains: ${domainsWithRoutes.join(', ')}`, color: 'FgRed'});
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