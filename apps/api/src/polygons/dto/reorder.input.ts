import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { IsArray, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum SavedLibraryRootKind {
    FOLDER = 'FOLDER',
    POLYGON = 'POLYGON',
}

registerEnumType(SavedLibraryRootKind, { name: 'SavedLibraryRootKind' });

@InputType()
export class ReorderRootItemInput {
    @Field(() => SavedLibraryRootKind)
    @IsEnum(SavedLibraryRootKind)
    kind!: SavedLibraryRootKind;

    @Field()
    @IsUUID()
    id!: string;
}

@InputType()
export class ReorderRootLibraryInput {
    @Field(() => [ReorderRootItemInput])
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReorderRootItemInput)
    items!: ReorderRootItemInput[];
}
