import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('forest_plots')
/*@Index(['code_region'])
@Index(['code_departement'])
@Index(['code_commune'])*/
export class ForestPlot {
    @PrimaryColumn()
    id!: string;

    @Column({ name: 'code_region', nullable: true })
    codeRegion!: string;

    @Column({ name: 'code_departement', nullable: true })
    codeDepartement!: string;

    @Column({ name: 'code_commune', nullable: true })
    codeCommune!: string;

    @Column({ name: 'lieu_dit', nullable: true })
    lieuDit?: string;

    @Column('geometry', {
        spatialFeatureType: 'MultiPolygon',
        srid: 4326,
        name: 'geom'  // explicitly match
    })
    geom!: any;

    @Column('varchar', {
        array: true,
        nullable: true,
        name: 'essences'  // explicitly match
    })
    essences?: string[];

    @Column('double precision', {
        nullable: true,
        name: 'surface_hectares'  // explicitly match
    })
    surfaceHectares?: number;

    @Column({
        nullable: true,
        name: 'type_foret'  // explicitly match
    })
    typeForet?: string;
}