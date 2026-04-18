import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GeospatialModule } from './geospatial/geospatial.module';
import { PolygonsModule } from './polygons/polygons.module';
import { User, ForestPlot, UserPolygon, PolygonFolder } from '@forest/database';
import { Request, Response } from 'express';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
        const syncExplicit =
          configService.get<string>('DATABASE_SYNCHRONIZE') === 'true';
        const synchronize =
          syncExplicit || nodeEnv === 'development';
        return {
          type: 'postgres' as const,
          host: configService.get<string>('DATABASE_HOST') ?? 'localhost',
          port: parseInt(configService.get<string>('DATABASE_PORT') ?? '5432', 10),
          username: configService.get<string>('DATABASE_USERNAME') ?? 'postgres',
          password: configService.get<string>('DATABASE_PASSWORD') ?? '',
          database: configService.get<string>('DATABASE_NAME') ?? 'forest_bd_viewer',
          entities: [User, ForestPlot, UserPolygon, PolygonFolder],
          synchronize,
          logging: nodeEnv === 'development',
        };
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      introspection: true,
      context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
    }),
    AuthModule,
    UsersModule,
    GeospatialModule,
    PolygonsModule,
  ],
})
export class AppModule {}