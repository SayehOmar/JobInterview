import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('polygon_folders')
export class PolygonFolder {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    userId!: string;

    @Column({ length: 255 })
    name!: string;

    /** Order among root-level items (folders + root polygons), interleaved */
    @Column('double precision', { default: 0 })
    rootOrder!: number;

    @CreateDateColumn()
    createdAt!: Date;
}
