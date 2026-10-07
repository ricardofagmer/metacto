import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';

// Injected so time and ids stay replaceable at the I/O boundary instead of being constructed inside services.
@Injectable()
export class Clock {
  nowIso(): string {
    return new Date().toISOString();
  }

  nowEpochMs(): number {
    return Date.now();
  }
}

@Injectable()
export class IdFactory {
  newId(): string {
    return randomUUID();
  }
}
