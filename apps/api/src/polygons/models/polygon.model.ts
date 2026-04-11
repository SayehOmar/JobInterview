import { ObjectType, Field, Float, ID, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { GeoJSONScalar } from '../../geospatial/dto/geospatial.types';

@ObjectType()
export class SpeciesDistributionModel {
    @Field()
    species!: string;

    @Field(() => Float)
    areaHectares!: number;

    @Field(() => Float)
    percentage!: number;
}

@ObjectType()
export class PolygonAnalysisResultsModel {
    @Field(() => Int, { nullable: true })
    plotCount?: number;

    @Field(() => Float, { nullable: true })
    totalForestArea?: number;

    @Field(() => Float, { nullable: true })
    coveragePercentage?: number;

    @Field(() => [String], { nullable: true })
    forestTypes?: string[];

    @Field(() => [SpeciesDistributionModel], { nullable: true })
    speciesDistribution?: SpeciesDistributionModel[];
}

@ObjectType()
export class UserPolygonModel {
    @Field(() => ID)
    id!: string;

    /** Parent folder, if any (null = at root list). */
    @Field(() => ID, { nullable: true })
    folderId?: string | null;

    @Field(() => Float)
    rootOrder!: number;

    @Field(() => Float, { nullable: true })
    folderOrder?: number | null;

    @Field()
    name!: string;

    @Field(() => Float)
    areaHectares!: number;

    @Field()
    status!: string;

    @Field()
    createdAt!: Date;

    @Field(() => GeoJSONScalar)
    geometry!: unknown;

    @Field(() => PolygonAnalysisResultsModel, { nullable: true })
    analysisResults?: PolygonAnalysisResultsModel | null;

    /** WMS snapshot at save (forest BD Forêt + admin layers). */
    @Field(() => GraphQLJSON, { nullable: true })
    locationContext?: Record<string, unknown> | null;
}
