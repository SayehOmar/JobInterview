import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
export type AnalysisStatus = 'pending' | 'completed' | 'failed';

@Entity('user_polygons')
export class UserPolygon {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /** Must be `uuid` in DB — same as `users.id` and `polygon_folders.user_id` (avoids `varchar = uuid` in combined queries). */
    @Column('uuid')
    userId!: string;

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({ name: 'user_id' })
    user?: User;

    @Column()
    name!: string;

    /** Optional folder for organizing saved polygons in the UI */
    @Column('uuid', { nullable: true, name: 'folder_id' })
    folderId?: string | null;

    /** Order in root list when folderId is null (interleaved with folders) */
    @Column('double precision', { default: 0, name: 'root_order' })
    rootOrder!: number;

    /** Order inside a folder when folderId is set */
    @Column('double precision', { nullable: true, name: 'folder_order' })
    folderOrder?: number | null;

    @Column('geometry', { spatialFeatureType: 'MultiPolygon', srid: 4326 })
    geometry!: any;

    @Column('double precision')
    areaHectares!: number;

    @Column('jsonb', { nullable: true })
    analysisResults?: {
        plotCount?: number;
        speciesDistribution?: Array<{
            species: string;
            areaHectares: number;
            percentage: number;
        }>;
        forestTypes?: string[];
        totalForestArea?: number;
    } | null;

    /**
     * Snapshot of WMS GetFeatureInfo at save (BD Forêt `forest` layer + region/dept/commune),
     * sampled at the drawn polygon centroid. Same shape as client `SavedLocationContext`.
     */
    @Column('jsonb', { nullable: true, name: 'location_context' })
    locationContext?: Record<string, unknown> | null;

    @Column({
        type: 'enum',
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    })
    status!: AnalysisStatus;

    @CreateDateColumn()
    createdAt!: Date;
}