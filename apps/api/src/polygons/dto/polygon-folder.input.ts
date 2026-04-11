import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class CreatePolygonFolderInput {
    @Field()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name!: string;
}

@InputType()
export class RenamePolygonFolderInput {
    @Field()
    @IsUUID()
    folderId!: string;

    @Field()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name!: string;
}

@InputType()
export class UpdatePolygonInput {
    @Field()
    @IsUUID()
    polygonId!: string;

    @Field()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name!: string;
}
