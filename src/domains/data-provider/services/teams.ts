import type { ENDPOINT_STANDINGS } from "@/domains/data-provider/providers/sofascore_v2/schemas/endpoints";
import { BaseScraper } from "../providers/playwright/base-scraper";
import { Profiling } from "@/services/profiling";
import { DB_InsertTeam, T_Team } from '@/domains/team/schema';
import db from '@/services/database';
import { sql } from 'drizzle-orm';
import { sleep } from "@/utils";

export class TeamsService {
    private scraper: BaseScraper;
    private readonly cloudFrontDomain: string;

    constructor(scraper: BaseScraper) {
        this.scraper = scraper;
        this.cloudFrontDomain = process.env.AWS_CLOUDFRONT_URL || '';
    }

    private getCloudFrontUrl(s3Key: string): string {
        return `https://${this.cloudFrontDomain}/${s3Key}`;
    }

    private getTeamLogoUrl(teamId: string | number): string {
        return `https://api.sofascore.app/api/v1/team/${teamId}/image`;
    }

    private async enhanceTeamWithLogo(team: { id: string | number; name: string; shortName: string; nameCode: string }) {
        try {
            const logoUrl = this.getTeamLogoUrl(team.id);
            const s3Key = await this.scraper.uploadAsset({
                logoUrl,
                filename: `team-${team.id}`
            });

            return {
                name: team.name,
                externalId: String(team.id),
                shortName: team.nameCode,
                badge: this.getCloudFrontUrl(s3Key),
                provider: 'sofa'
            } satisfies DB_InsertTeam;
        } catch (error) {
            Profiling.error(`[TeamsService] Failed to enhance team ${team.name} with logo:`, error);
            throw error;
        }
    }

    public async mapTournamentTeams(standingsResponse: ENDPOINT_STANDINGS) {
        const groups = standingsResponse.standings.map((group) => {
            const groupTeams = group.rows.map((row) => {
                const team = row.team;
                return {
                    id: team.id,
                    name: team.name,
                    shortName: team.shortName,
                    slug: team.slug,
                    nameCode: team.nameCode,
                }
            })
            return {
                groupId: group.id,
                groupName: group.name,
                teams: groupTeams
            }
        })

        return groups.flatMap((group) => group.teams);
    }

    public async getTeams(baseUrl: string) {
        try {
            const url = `${baseUrl}/standings/total`;
            await this.scraper.goto(url);
            const rawContent = await this.scraper.getPageContent();
            
            const teams = await this.mapTournamentTeams(rawContent);
            
            return teams;
        } catch (error) {
            console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT TEAMS]', error);
            throw error;
        }
    }

    public async createOnDatabase(teams: DB_InsertTeam[]) {
        console.log(`[LOG] - [START] - CREATING TEAMS ON DATABASE`);
    
        const createdTeams = await db
          .insert(T_Team)
          .values(teams)
          .onConflictDoNothing()
          .returning();
    
        console.log(`[LOG] - [START] - CREATED TEAMS ${createdTeams.length} ON DATABASE`);
    
        return createdTeams;
    }

    public async upsertOnDatabase(teams: DB_InsertTeam[]) {
        console.log('[LOG] - [START] - UPSERTING TEAMS ON DATABASE');
    
        await db.transaction(async tx => {
          for (const team of teams) {
            await tx
              .insert(T_Team)
              .values(team)
              .onConflictDoUpdate({
                target: [T_Team.externalId, T_Team.provider],
                set: {
                  ...team,
                },
              });
    
            // console.log('[LOG] - [SofascoreTeams] - UPSERTING TEAM: ', team);
          }
        });
        console.log('[LOG] - [SUCCESS] - UPSERTING TEAMS ON DATABASE');
    }

    public async init(baseUrl: string) {
        const teams = await this.getTeams(baseUrl);
        const enhancedTeams: DB_InsertTeam[] = [];

        // Process teams sequentially
        for (const team of teams) {
            try {
                console.log(`[LOG] - [START] - ENHANCING TEAM ${team.name}`);
                const enhancedTeam = await this.enhanceTeamWithLogo(team);
                enhancedTeams.push(enhancedTeam);
                console.log(`[LOG] - [SUCCESS] - ENHANCED TEAM ${team.name}`);
                await sleep(1000);
            } catch (error) {
                console.error(`Failed to enhance team ${team.name}:`, error);
                // Continue with next team even if one fails
                continue;
            }
        }

        const query = await this.createOnDatabase(enhancedTeams);
        return query;
    }
}
