import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { getDatabaseConfig } from '../config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('DataSource options are required');
        }
        const dataSource = new DataSource(options);
        await dataSource.initialize();

        // Disable foreign key constraints for SQLite in test mode
        if (options.type === 'sqlite' && process.env.NODE_ENV === 'test') {
          await dataSource.query('PRAGMA foreign_keys = OFF');
        }

        return dataSource;
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
