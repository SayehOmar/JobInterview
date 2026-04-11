import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '@forest/database';
import { PolygonsService } from './polygons.service';
import { SavePolygonInput } from './dto/save-polygon.input';
import {
    CreatePolygonFolderInput,
    RenamePolygonFolderInput,
    UpdatePolygonInput,
} from './dto/polygon-folder.input';
import { ReorderRootLibraryInput } from './dto/reorder.input';
import { UserPolygonModel } from './models/polygon.model';
import { PolygonFolderModel } from './models/polygon-folder.model';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver()
export class PolygonsResolver {
    constructor(private readonly polygonsService: PolygonsService) {}

    @Query(() => [UserPolygonModel])
    @UseGuards(GqlAuthGuard)
    async myPolygons(@CurrentUser() user: User): Promise<UserPolygonModel[]> {
        return this.polygonsService.myPolygons(user.id);
    }

    @Query(() => [PolygonFolderModel])
    @UseGuards(GqlAuthGuard)
    async myPolygonFolders(@CurrentUser() user: User): Promise<PolygonFolderModel[]> {
        return this.polygonsService.myPolygonFolders(user.id);
    }

    @Mutation(() => UserPolygonModel)
    @UseGuards(GqlAuthGuard)
    async savePolygon(
        @CurrentUser() user: User,
        @Args('input') input: SavePolygonInput,
    ): Promise<UserPolygonModel> {
        return this.polygonsService.savePolygon(user.id, input);
    }

    @Mutation(() => PolygonFolderModel)
    @UseGuards(GqlAuthGuard)
    async createPolygonFolder(
        @CurrentUser() user: User,
        @Args('input') input: CreatePolygonFolderInput,
    ): Promise<PolygonFolderModel> {
        return this.polygonsService.createPolygonFolder(user.id, input.name);
    }

    @Mutation(() => PolygonFolderModel)
    @UseGuards(GqlAuthGuard)
    async renamePolygonFolder(
        @CurrentUser() user: User,
        @Args('input') input: RenamePolygonFolderInput,
    ): Promise<PolygonFolderModel> {
        return this.polygonsService.renamePolygonFolder(user.id, input.folderId, input.name);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async deletePolygonFolder(
        @CurrentUser() user: User,
        @Args('folderId', { type: () => ID }) folderId: string,
    ): Promise<boolean> {
        return this.polygonsService.deletePolygonFolder(user.id, folderId);
    }

    @Mutation(() => UserPolygonModel)
    @UseGuards(GqlAuthGuard)
    async updatePolygon(
        @CurrentUser() user: User,
        @Args('input') input: UpdatePolygonInput,
    ): Promise<UserPolygonModel> {
        return this.polygonsService.updatePolygon(user.id, input.polygonId, input.name);
    }

    @Mutation(() => UserPolygonModel)
    @UseGuards(GqlAuthGuard)
    async movePolygonToFolder(
        @CurrentUser() user: User,
        @Args('polygonId', { type: () => ID }) polygonId: string,
        @Args('folderId', { type: () => ID, nullable: true }) folderId: string | null,
    ): Promise<UserPolygonModel> {
        return this.polygonsService.movePolygonToFolder(user.id, polygonId, folderId ?? null);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async reorderRootLibrary(
        @CurrentUser() user: User,
        @Args('input') input: ReorderRootLibraryInput,
    ): Promise<boolean> {
        return this.polygonsService.reorderRootLibrary(user.id, input.items);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async reorderPolygonsInFolder(
        @CurrentUser() user: User,
        @Args('folderId', { type: () => ID }) folderId: string,
        @Args('polygonIds', { type: () => [ID] }) polygonIds: string[],
    ): Promise<boolean> {
        return this.polygonsService.reorderPolygonsInFolder(user.id, folderId, polygonIds);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async deletePolygon(
        @CurrentUser() user: User,
        @Args('polygonId', { type: () => ID }) polygonId: string,
    ): Promise<boolean> {
        return this.polygonsService.deletePolygon(user.id, polygonId);
    }

    @Mutation(() => UserPolygonModel)
    @UseGuards(GqlAuthGuard)
    async reanalyzePolygon(
        @CurrentUser() user: User,
        @Args('polygonId', { type: () => ID }) polygonId: string,
    ): Promise<UserPolygonModel> {
        return this.polygonsService.reanalyzePolygon(user.id, polygonId);
    }
}
