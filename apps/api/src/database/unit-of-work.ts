import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

export type TransactionScope = EntityManager;

// Services own transaction boundaries through this provider; repositories only accept the scope they are given.
@Injectable()
export class UnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  run<Result>(work: (scope: TransactionScope) => Promise<Result>): Promise<Result> {
    return this.dataSource.transaction(work);
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      // Health reports the database as down instead of failing the probe; the caller logs nothing sensitive here.
      return false;
    }
  }
}
