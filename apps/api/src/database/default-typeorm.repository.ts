import { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

// Composition over inheritance: domain repositories expose intent-named methods and never leak TypeORM's full Repository API.
export abstract class DefaultTypeOrmRepository<Entity extends ObjectLiteral> {
  protected constructor(
    private readonly dataSource: DataSource,
    private readonly target: EntityTarget<Entity>,
  ) {}

  // Passing the transaction's manager keeps a repository call inside the service-owned transaction.
  protected repository(manager?: EntityManager): Repository<Entity> {
    return (manager ?? this.dataSource.manager).getRepository(this.target);
  }
}
