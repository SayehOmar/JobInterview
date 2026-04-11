import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { UserPolygon, PolygonFolder } from '@forest/database';
import { SavePolygonInput } from './dto/save-polygon.input';
import { UserPolygonModel } from './models/polygon.model';
import { PolygonFolderModel } from './models/polygon-folder.model';
import { SavedLibraryRootKind } from './dto/reorder.input';

function emptyAnalysis() {
    return {
        plotCount: 0,
        totalForestArea: 0,
        coveragePercentage: 0,
        forestTypes: [] as string[],
        speciesDistribution: [] as { species: string; areaHectares: number; percentage: number }[],
    };
}

function mapRowToModel(row: Record<string, unknown>): UserPolygonModel {
    return {
        id: String(row.id),
        folderId: row.folderId != null ? String(row.folderId) : null,
        rootOrder: Number(row.rootOrder ?? 0),
        folderOrder: row.folderOrder != null ? Number(row.folderOrder) : null,
        name: String(row.name),
        areaHectares: Number(row.areaHectares),
        status: String(row.status),
        createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt)),
        geometry: row.geometry,
        analysisResults: (row.analysisResults as UserPolygonModel['analysisResults']) ?? null,
        locationContext: (row.locationContext as UserPolygonModel['locationContext']) ?? null,
    };
}

@Injectable()
export class PolygonsService {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        @InjectRepository(PolygonFolder)
        private readonly folderRepo: Repository<PolygonFolder>,
    ) {}

    private polyMeta() {
        const m = this.dataSource.getMetadata(UserPolygon);
        const q = (prop: string) => {
            const c = m.columns.find((col) => col.propertyName === prop);
            if (!c) throw new Error(`Unknown UserPolygon column: ${prop}`);
            return `"${c.databaseName}"`;
        };
        return { table: `"${m.tableName}"`, q };
    }

    private folderMeta() {
        const m = this.dataSource.getMetadata(PolygonFolder);
        const q = (prop: string) => {
            const c = m.columns.find((col) => col.propertyName === prop);
            if (!c) throw new Error(`Unknown PolygonFolder column: ${prop}`);
            return `"${c.databaseName}"`;
        };
        return { table: `"${m.tableName}"`, q };
    }

    private async nextRootSlot(userId: string): Promise<number> {
        const { table: pt, q: pq } = this.polyMeta();
        const { table: ft, q: fq } = this.folderMeta();
        const rows = await this.dataSource.query<{ m: string }[]>(
            `
      SELECT GREATEST(
        COALESCE((SELECT MAX(${fq('rootOrder')}) FROM ${ft} WHERE ${fq('userId')} = $1), -1),
        COALESCE((SELECT MAX(${pq('rootOrder')}) FROM ${pt} WHERE ${pq('userId')} = $1 AND ${pq('folderId')} IS NULL), -1)
      ) + 1 AS m
      `,
            [userId],
        );
        return parseInt(rows[0]?.m ?? '0', 10);
    }

    private async nextFolderSlot(userId: string, folderId: string): Promise<number> {
        const { table, q } = this.polyMeta();
        const rows = await this.dataSource.query<{ m: string }[]>(
            `SELECT COALESCE(MAX(${q('folderOrder')}), -1) + 1 AS m FROM ${table} WHERE ${q('userId')} = $1 AND ${q('folderId')} = $2`,
            [userId, folderId],
        );
        return parseInt(rows[0]?.m ?? '0', 10);
    }

    private async assertFolderOwned(userId: string, folderId: string): Promise<PolygonFolder> {
        const folder = await this.folderRepo.findOne({ where: { id: folderId, userId } });
        if (!folder) {
            throw new NotFoundException('Folder not found');
        }
        return folder;
    }

    async myPolygonFolders(userId: string): Promise<PolygonFolderModel[]> {
        const rows = await this.folderRepo.find({
            where: { userId },
            order: { rootOrder: 'ASC', createdAt: 'ASC' },
        });
        return rows.map((f) => ({
            id: f.id,
            name: f.name,
            rootOrder: f.rootOrder,
            createdAt: f.createdAt,
        }));
    }

    async createPolygonFolder(userId: string, name: string): Promise<PolygonFolderModel> {
        const trimmed = name.trim();
        if (!trimmed) {
            throw new BadRequestException('Folder name is required');
        }
        const rootOrder = await this.nextRootSlot(userId);
        const f = this.folderRepo.create({ userId, name: trimmed, rootOrder });
        const saved = await this.folderRepo.save(f);
        return {
            id: saved.id,
            name: saved.name,
            rootOrder: saved.rootOrder,
            createdAt: saved.createdAt,
        };
    }

    async renamePolygonFolder(userId: string, folderId: string, name: string): Promise<PolygonFolderModel> {
        const folder = await this.assertFolderOwned(userId, folderId);
        const trimmed = name.trim();
        if (!trimmed) {
            throw new BadRequestException('Folder name is required');
        }
        folder.name = trimmed;
        const saved = await this.folderRepo.save(folder);
        return {
            id: saved.id,
            name: saved.name,
            rootOrder: saved.rootOrder,
            createdAt: saved.createdAt,
        };
    }

    async deletePolygonFolder(userId: string, folderId: string): Promise<boolean> {
        await this.assertFolderOwned(userId, folderId);
        const { table, q } = this.polyMeta();
        const orphans = await this.dataSource.query<{ id: string }[]>(
            `SELECT ${q('id')} AS id FROM ${table} WHERE ${q('folderId')} = $1 AND ${q('userId')} = $2`,
            [folderId, userId],
        );
        let slot = await this.nextRootSlot(userId);
        for (const o of orphans) {
            await this.dataSource.query(
                `UPDATE ${table} SET ${q('folderId')} = NULL, ${q('folderOrder')} = NULL, ${q('rootOrder')} = $1 WHERE ${q('id')} = $2 AND ${q('userId')} = $3`,
                [slot++, o.id, userId],
            );
        }
        const res = await this.folderRepo.delete({ id: folderId, userId });
        return (res.affected ?? 0) > 0;
    }

    async savePolygon(userId: string, input: SavePolygonInput): Promise<UserPolygonModel> {
        const g = input.geometry as { type?: string; coordinates?: unknown };
        if (!g?.type || !g?.coordinates) {
            throw new BadRequestException('Invalid GeoJSON geometry');
        }

        let folderId: string | null = null;
        if (input.folderId) {
            await this.assertFolderOwned(userId, input.folderId);
            folderId = input.folderId;
        }

        const geometryJson = JSON.stringify(input.geometry);

        const areaRows = await this.dataSource.query<{ ha: string }[]>(
            `SELECT ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($1::text), 4326)::geography) / 10000.0 AS ha`,
            [geometryJson],
        );
        const areaHectares = parseFloat(areaRows[0]?.ha ?? '0');
        if (!Number.isFinite(areaHectares) || areaHectares <= 0) {
            throw new BadRequestException('Could not compute polygon area (invalid geometry?)');
        }

        const id = randomUUID();
        const analysisResults = emptyAnalysis();
        const locationContextJson =
            input.locationContext != null && typeof input.locationContext === 'object'
                ? JSON.stringify(input.locationContext)
                : null;

        let rootOrder = 0;
        let folderOrder: number | null = null;
        if (folderId) {
            folderOrder = await this.nextFolderSlot(userId, folderId);
        } else {
            rootOrder = await this.nextRootSlot(userId);
        }

        const { table, q } = this.polyMeta();
        await this.dataSource.query(
            `
      INSERT INTO ${table} (${q('id')}, ${q('userId')}, ${q('folderId')}, ${q('name')}, ${q('geometry')}, ${q('areaHectares')}, ${q('status')}, ${q('analysisResults')}, ${q('rootOrder')}, ${q('folderOrder')}, ${q('locationContext')}, ${q('createdAt')})
      VALUES (
        $1,
        $2,
        $3,
        $4,
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5::text), 4326)),
        $6,
        $7,
        $8::jsonb,
        $9,
        $10,
        $11::jsonb,
        NOW()
      )
      `,
            [
                id,
                userId,
                folderId,
                input.name.trim(),
                geometryJson,
                areaHectares,
                'completed',
                JSON.stringify(analysisResults),
                rootOrder,
                folderOrder,
                locationContextJson,
            ],
        );

        return this.findPolygonById(userId, id);
    }

    async myPolygons(userId: string): Promise<UserPolygonModel[]> {
        const { table, q } = this.polyMeta();
        const rows = await this.dataSource.query<Record<string, unknown>[]>(
            `
      SELECT
        ${q('id')} AS id,
        ${q('folderId')} AS "folderId",
        ${q('rootOrder')} AS "rootOrder",
        ${q('folderOrder')} AS "folderOrder",
        ${q('name')} AS name,
        ${q('areaHectares')} AS "areaHectares",
        ${q('status')} AS status,
        ${q('createdAt')} AS "createdAt",
        ST_AsGeoJSON(${q('geometry')})::json AS geometry,
        ${q('analysisResults')} AS "analysisResults",
        ${q('locationContext')} AS "locationContext"
      FROM ${table}
      WHERE ${q('userId')} = $1
      ORDER BY ${q('createdAt')} DESC
      `,
            [userId],
        );
        return rows.map(mapRowToModel);
    }

    async updatePolygon(userId: string, polygonId: string, name: string): Promise<UserPolygonModel> {
        await this.findPolygonById(userId, polygonId);
        const trimmed = name.trim();
        if (!trimmed) {
            throw new BadRequestException('Name is required');
        }
        const { table, q } = this.polyMeta();
        await this.dataSource.query(
            `UPDATE ${table} SET ${q('name')} = $1 WHERE ${q('id')} = $2 AND ${q('userId')} = $3`,
            [trimmed, polygonId, userId],
        );
        return this.findPolygonById(userId, polygonId);
    }

    async movePolygonToFolder(
        userId: string,
        polygonId: string,
        folderId: string | null,
    ): Promise<UserPolygonModel> {
        await this.findPolygonById(userId, polygonId);
        if (folderId) {
            await this.assertFolderOwned(userId, folderId);
        }
        const { table, q } = this.polyMeta();
        if (folderId) {
            const fo = await this.nextFolderSlot(userId, folderId);
            await this.dataSource.query(
                `UPDATE ${table} SET ${q('folderId')} = $1, ${q('folderOrder')} = $2, ${q('rootOrder')} = 0 WHERE ${q('id')} = $3 AND ${q('userId')} = $4`,
                [folderId, fo, polygonId, userId],
            );
        } else {
            const ro = await this.nextRootSlot(userId);
            await this.dataSource.query(
                `UPDATE ${table} SET ${q('folderId')} = NULL, ${q('folderOrder')} = NULL, ${q('rootOrder')} = $1 WHERE ${q('id')} = $2 AND ${q('userId')} = $3`,
                [ro, polygonId, userId],
            );
        }
        return this.findPolygonById(userId, polygonId);
    }

    async reorderRootLibrary(
        userId: string,
        items: { kind: SavedLibraryRootKind; id: string }[],
    ): Promise<boolean> {
        const { table: pt, q: pq } = this.polyMeta();
        const { table: ft, q: fq } = this.folderMeta();
        const uid = pq('userId');
        for (let i = 0; i < items.length; i++) {
            const slot = i;
            if (items[i].kind === SavedLibraryRootKind.FOLDER) {
                const r = await this.dataSource.query(
                    `UPDATE ${ft} SET ${fq('rootOrder')} = $1 WHERE ${fq('id')} = $2 AND ${uid} = $3 RETURNING ${fq('id')}`,
                    [slot, items[i].id, userId],
                );
                if (!r.length) {
                    throw new BadRequestException(`Folder not found: ${items[i].id}`);
                }
            } else {
                const r = await this.dataSource.query(
                    `UPDATE ${pt} SET ${pq('rootOrder')} = $1, ${pq('folderId')} = NULL, ${pq('folderOrder')} = NULL WHERE ${pq('id')} = $2 AND ${uid} = $3 AND ${pq('folderId')} IS NULL RETURNING ${pq('id')}`,
                    [slot, items[i].id, userId],
                );
                if (!r.length) {
                    throw new BadRequestException(`Root polygon not found: ${items[i].id}`);
                }
            }
        }
        return true;
    }

    async reorderPolygonsInFolder(
        userId: string,
        folderId: string,
        orderedPolygonIds: string[],
    ): Promise<boolean> {
        await this.assertFolderOwned(userId, folderId);
        const { table, q } = this.polyMeta();
        for (let i = 0; i < orderedPolygonIds.length; i++) {
            await this.dataSource.query(
                `UPDATE ${table} SET ${q('folderOrder')} = $1 WHERE ${q('id')} = $2 AND ${q('userId')} = $3 AND ${q('folderId')} = $4`,
                [i, orderedPolygonIds[i], userId, folderId],
            );
        }
        return true;
    }

    async deletePolygon(userId: string, polygonId: string): Promise<boolean> {
        const { table, q } = this.polyMeta();
        const result = await this.dataSource.query<{ id: string }[]>(
            `DELETE FROM ${table} WHERE ${q('id')} = $1 AND ${q('userId')} = $2 RETURNING ${q('id')}`,
            [polygonId, userId],
        );
        return result.length > 0;
    }

    async reanalyzePolygon(userId: string, polygonId: string): Promise<UserPolygonModel> {
        await this.findPolygonById(userId, polygonId);
        const analysisResults = emptyAnalysis();
        const { table, q } = this.polyMeta();
        await this.dataSource.query(
            `UPDATE ${table} SET ${q('analysisResults')} = $1::jsonb WHERE ${q('id')} = $2 AND ${q('userId')} = $3`,
            [JSON.stringify(analysisResults), polygonId, userId],
        );
        return this.findPolygonById(userId, polygonId);
    }

    private async findPolygonById(userId: string, polygonId: string): Promise<UserPolygonModel> {
        const { table, q } = this.polyMeta();
        const rows = await this.dataSource.query<Record<string, unknown>[]>(
            `
      SELECT
        ${q('id')} AS id,
        ${q('folderId')} AS "folderId",
        ${q('rootOrder')} AS "rootOrder",
        ${q('folderOrder')} AS "folderOrder",
        ${q('name')} AS name,
        ${q('areaHectares')} AS "areaHectares",
        ${q('status')} AS status,
        ${q('createdAt')} AS "createdAt",
        ST_AsGeoJSON(${q('geometry')})::json AS geometry,
        ${q('analysisResults')} AS "analysisResults",
        ${q('locationContext')} AS "locationContext"
      FROM ${table}
      WHERE ${q('id')} = $1 AND ${q('userId')} = $2
      `,
            [polygonId, userId],
        );
        if (!rows.length) {
            throw new NotFoundException('Polygon not found');
        }
        return mapRowToModel(rows[0]);
    }
}
