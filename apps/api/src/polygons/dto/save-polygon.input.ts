import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class SavePolygonInput {
    @Field()
    @IsString()
    @IsNotEmpty()
    name!: string;

    /** GeoJSON Geometry (e.g. Polygon from Mapbox Draw) */
    @Field(() => GraphQLJSON)
    @IsObject()
    geometry!: Record<string, unknown>;

    @Field({ nullable: true })
    @IsOptional()
    @IsUUID()
    folderId?: string;

    /**
     * Optional WMS snapshot (BD Forêt + admin layers) from the client at polygon centroid.
     */
    @Field(() => GraphQLJSON, { nullable: true })
    @IsOptional()
    locationContext?: Record<string, unknown>;
}
