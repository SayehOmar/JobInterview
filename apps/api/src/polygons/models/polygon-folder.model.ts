import { ObjectType, Field, Float, ID } from '@nestjs/graphql';

@ObjectType()
export class PolygonFolderModel {
    @Field(() => ID)
    id!: string;

    @Field()
    name!: string;

    @Field(() => Float)
    rootOrder!: number;

    @Field()
    createdAt!: Date;
}
