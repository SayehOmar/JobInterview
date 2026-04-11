import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolygonFolder, UserPolygon } from '@forest/database';
import { PolygonsService } from './polygons.service';
import { PolygonsResolver } from './polygons.resolver';

@Module({
    imports: [TypeOrmModule.forFeature([UserPolygon, PolygonFolder])],
    providers: [PolygonsService, PolygonsResolver],
    exports: [PolygonsService],
})
export class PolygonsModule {}
