import { Injectable } from '@nestjs/common';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class IngestService {
  constructor(private usage: UsageService) {}

  /** Mock importer: generates N days of daily spend for common AWS services */
  async importAwsCurMock(orgId: string, days = 14, end?: string) {
    const endDate = end ? new Date(end + 'T00:00:00Z') : new Date();
    const startTs = endDate.getTime() - (days - 1) * 24 * 3600_000;
    for (let t = startTs; t <= endDate.getTime(); t += 24 * 3600_000) {
      const day = new Date(t).toISOString().slice(0, 10);
      await this.usage.insertMockDaily(orgId, day);
    }
    return { ok: true, days };
  }
}
